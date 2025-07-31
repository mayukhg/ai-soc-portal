import { PublicClientApplication, AuthenticationResult, AccountInfo } from '@azure/msal-browser';
import { supabase } from '@/integrations/supabase/client';

export interface AzureADConfig {
  clientId: string;
  tenantId: string;
  redirectUri: string;
  scopes: string[];
}

export interface UserRole {
  role: 'analyst_tier1' | 'analyst_tier2' | 'analyst_tier3' | 'manager' | 'admin';
  permissions: string[];
  groups: string[];
}

export interface BreakGlassAccess {
  id: string;
  userId: string;
  requestedBy: string;
  approvedBy?: string;
  reason: string;
  requestedAt: Date;
  approvedAt?: Date;
  expiresAt: Date;
  isActive: boolean;
}

export class AzureADService {
  private msalInstance: PublicClientApplication;
  private config: AzureADConfig;

  constructor(config: AzureADConfig) {
    this.config = config;
    this.msalInstance = new PublicClientApplication({
      auth: {
        clientId: config.clientId,
        authority: `https://login.microsoftonline.com/${config.tenantId}`,
        redirectUri: config.redirectUri,
      },
      cache: {
        cacheLocation: 'localStorage',
        storeAuthStateInCookie: false,
      },
    });
  }

  // Initialize MSAL
  async initialize(): Promise<void> {
    await this.msalInstance.initialize();
  }

  // Sign in with Azure AD
  async signIn(): Promise<AuthenticationResult> {
    try {
      const result = await this.msalInstance.loginPopup({
        scopes: this.config.scopes,
      });
      
      // Sync user profile with Azure AD data
      await this.syncUserProfile(result);
      
      return result;
    } catch (error) {
      console.error('Azure AD sign in failed:', error);
      throw error;
    }
  }

  // Sign out
  async signOut(): Promise<void> {
    try {
      await this.msalInstance.logoutPopup();
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Azure AD sign out failed:', error);
      throw error;
    }
  }

  // Get current account
  getCurrentAccount(): AccountInfo | null {
    const accounts = this.msalInstance.getAllAccounts();
    return accounts.length > 0 ? accounts[0] : null;
  }

  // Get access token
  async getAccessToken(): Promise<string | null> {
    try {
      const account = this.getCurrentAccount();
      if (!account) return null;

      const result = await this.msalInstance.acquireTokenSilent({
        scopes: this.config.scopes,
        account,
      });

      return result.accessToken;
    } catch (error) {
      console.error('Failed to get access token:', error);
      return null;
    }
  }

  // Sync user profile with Azure AD data
  private async syncUserProfile(authResult: AuthenticationResult): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get user groups from Azure AD
      const groups = await this.getUserGroups(authResult.accessToken);
      
      // Map groups to roles
      const role = this.mapGroupsToRole(groups);
      
      // Update user profile
      const { error } = await supabase
        .from('profiles')
        .upsert({
          user_id: user.id,
          azure_ad_id: authResult.account?.localAccountId,
          azure_ad_groups: groups,
          role: role.role,
          last_sync_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id'
        });

      if (error) {
        console.error('Failed to sync user profile:', error);
      }
    } catch (error) {
      console.error('Failed to sync user profile:', error);
    }
  }

  // Get user groups from Azure AD
  private async getUserGroups(accessToken: string): Promise<string[]> {
    try {
      const response = await fetch('https://graph.microsoft.com/v1.0/me/memberOf', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to get user groups: ${response.statusText}`);
      }

      const data = await response.json();
      return data.value
        .filter((group: any) => group['@odata.type'] === '#microsoft.graph.group')
        .map((group: any) => group.id);
    } catch (error) {
      console.error('Failed to get user groups:', error);
      return [];
    }
  }

  // Map Azure AD groups to internal roles
  private mapGroupsToRole(groups: string[]): UserRole {
    const groupRoleMap: Record<string, UserRole> = {
      [process.env.AZURE_AD_GROUP_SOC_ANALYST_TIER1 || '']: {
        role: 'analyst_tier1',
        permissions: ['view_alerts', 'update_alerts', 'view_incidents', 'view_threat_intel'],
        groups: groups,
      },
      [process.env.AZURE_AD_GROUP_SOC_ANALYST_TIER2 || '']: {
        role: 'analyst_tier2',
        permissions: ['view_alerts', 'update_alerts', 'view_incidents', 'create_incidents', 'update_incidents', 'view_threat_intel', 'manage_threat_intel'],
        groups: groups,
      },
      [process.env.AZURE_AD_GROUP_SOC_ANALYST_TIER3 || '']: {
        role: 'analyst_tier3',
        permissions: ['view_alerts', 'update_alerts', 'delete_alerts', 'view_incidents', 'create_incidents', 'update_incidents', 'delete_incidents', 'view_threat_intel', 'manage_threat_intel', 'generate_reports'],
        groups: groups,
      },
      [process.env.AZURE_AD_GROUP_SOC_MANAGER || '']: {
        role: 'manager',
        permissions: ['view_alerts', 'view_incidents', 'view_threat_intel', 'generate_reports'],
        groups: groups,
      },
      [process.env.AZURE_AD_GROUP_SOC_ADMIN || '']: {
        role: 'admin',
        permissions: ['*'], // All permissions
        groups: groups,
      },
    };

    // Check for break glass access
    if (groups.includes(process.env.AZURE_AD_GROUP_SOC_BREAKGLASS || '')) {
      return {
        role: 'admin',
        permissions: ['*'],
        groups: groups,
      };
    }

    // Find matching role based on groups
    for (const groupId of groups) {
      if (groupRoleMap[groupId]) {
        return groupRoleMap[groupId];
      }
    }

    // Default to tier 1 analyst
    return {
      role: 'analyst_tier1',
      permissions: ['view_alerts', 'update_alerts', 'view_incidents', 'view_threat_intel'],
      groups: groups,
    };
  }

  // Check if user has break glass access
  async hasBreakGlassAccess(userId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('break_glass_access')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .gte('expires_at', new Date().toISOString())
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Failed to check break glass access:', error);
        return false;
      }

      return !!data;
    } catch (error) {
      console.error('Failed to check break glass access:', error);
      return false;
    }
  }

  // Request break glass access
  async requestBreakGlassAccess(reason: string, durationHours: number = 4): Promise<BreakGlassAccess> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + durationHours);

      const { data, error } = await supabase
        .from('break_glass_access')
        .insert({
          user_id: user.id,
          requested_by: user.id,
          reason,
          expires_at: expiresAt.toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Failed to request break glass access:', error);
      throw error;
    }
  }

  // Approve break glass access (admin only)
  async approveBreakGlassAccess(requestId: string, approvedBy: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('break_glass_access')
        .update({
          approved_by: approvedBy,
          approved_at: new Date().toISOString(),
        })
        .eq('id', requestId);

      if (error) throw error;
    } catch (error) {
      console.error('Failed to approve break glass access:', error);
      throw error;
    }
  }

  // Get pending break glass requests (admin only)
  async getPendingBreakGlassRequests(): Promise<BreakGlassAccess[]> {
    try {
      const { data, error } = await supabase
        .from('break_glass_access')
        .select('*')
        .is('approved_by', null)
        .eq('is_active', true)
        .order('requested_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Failed to get pending break glass requests:', error);
      return [];
    }
  }
}

// Create singleton instance
export const azureADService = new AzureADService({
  clientId: process.env.AZURE_AD_CLIENT_ID || '',
  tenantId: process.env.AZURE_AD_TENANT_ID || '',
  redirectUri: process.env.AZURE_AD_REDIRECT_URI || '',
  scopes: ['User.Read', 'GroupMember.Read.All', 'Directory.Read.All'],
}); 