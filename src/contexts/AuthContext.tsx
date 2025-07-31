import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { azureADService, UserRole, BreakGlassAccess } from '@/services/AzureADService';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  userProfile: any;
  userRole: UserRole | null;
  hasPermission: (permission: string) => boolean;
  hasBreakGlassAccess: boolean;
  requestBreakGlassAccess: (reason: string, durationHours?: number) => Promise<BreakGlassAccess>;
  approveBreakGlassAccess: (requestId: string) => Promise<void>;
  getPendingBreakGlassRequests: () => Promise<BreakGlassAccess[]>;
  isAzureADEnabled: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  signIn: async () => {},
  signOut: async () => {},
  userProfile: null,
  userRole: null,
  hasPermission: () => false,
  hasBreakGlassAccess: false,
  requestBreakGlassAccess: async () => ({} as BreakGlassAccess),
  approveBreakGlassAccess: async () => {},
  getPendingBreakGlassRequests: async () => [],
  isAzureADEnabled: false,
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [hasBreakGlassAccess, setHasBreakGlassAccess] = useState(false);
  const [isAzureADEnabled, setIsAzureADEnabled] = useState(false);

  useEffect(() => {
    // Check if Azure AD is enabled
    const azureADEnabled = !!(process.env.AZURE_AD_CLIENT_ID && process.env.AZURE_AD_TENANT_ID);
    setIsAzureADEnabled(azureADEnabled);

    // Initialize Azure AD if enabled
    if (azureADEnabled) {
      azureADService.initialize().catch(console.error);
    }

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        // Fetch user profile when user signs in
        if (session?.user) {
          setTimeout(async () => {
            await fetchUserProfile(session.user.id);
            await checkBreakGlassAccess(session.user.id);
          }, 0);
        } else {
          setUserProfile(null);
          setUserRole(null);
          setHasBreakGlassAccess(false);
        }
        
        setLoading(false);
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        setTimeout(async () => {
          await fetchUserProfile(session.user.id);
          await checkBreakGlassAccess(session.user.id);
        }, 0);
      }
      
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching user profile:', error);
      } else {
        setUserProfile(data);
        
        // Map profile role to UserRole interface
        if (data) {
          const role: UserRole = {
            role: data.role,
            permissions: getPermissionsForRole(data.role),
            groups: data.azure_ad_groups || [],
          };
          setUserRole(role);
        }
      }
    } catch (err) {
      console.error('Error fetching user profile:', err);
    }
  };

  const checkBreakGlassAccess = async (userId: string) => {
    try {
      const hasAccess = await azureADService.hasBreakGlassAccess(userId);
      setHasBreakGlassAccess(hasAccess);
    } catch (error) {
      console.error('Error checking break glass access:', error);
      setHasBreakGlassAccess(false);
    }
  };

  const getPermissionsForRole = (role: string): string[] => {
    const rolePermissions: Record<string, string[]> = {
      analyst_tier1: ['view_alerts', 'update_alerts', 'view_incidents', 'view_threat_intel'],
      analyst_tier2: ['view_alerts', 'update_alerts', 'view_incidents', 'create_incidents', 'update_incidents', 'view_threat_intel', 'manage_threat_intel'],
      analyst_tier3: ['view_alerts', 'update_alerts', 'delete_alerts', 'view_incidents', 'create_incidents', 'update_incidents', 'delete_incidents', 'view_threat_intel', 'manage_threat_intel', 'generate_reports'],
      manager: ['view_alerts', 'view_incidents', 'view_threat_intel', 'generate_reports'],
      admin: ['*'], // All permissions
    };
    
    return rolePermissions[role] || rolePermissions.analyst_tier1;
  };

  const hasPermission = (permission: string): boolean => {
    if (!userRole) return false;
    
    // Admin has all permissions
    if (userRole.permissions.includes('*')) return true;
    
    // Check specific permission
    return userRole.permissions.includes(permission);
  };

  const signIn = async () => {
    if (isAzureADEnabled) {
      try {
        await azureADService.signIn();
      } catch (error) {
        console.error('Azure AD sign in failed:', error);
        throw error;
      }
    } else {
      // Fallback to Supabase auth
      // This would typically redirect to a login page
      console.log('Azure AD not enabled, using Supabase auth');
    }
  };

  const signOut = async () => {
    if (isAzureADEnabled) {
      await azureADService.signOut();
    } else {
      await supabase.auth.signOut();
    }
  };

  const requestBreakGlassAccess = async (reason: string, durationHours: number = 4): Promise<BreakGlassAccess> => {
    const result = await azureADService.requestBreakGlassAccess(reason, durationHours);
    await checkBreakGlassAccess(user?.id || '');
    return result;
  };

  const approveBreakGlassAccess = async (requestId: string): Promise<void> => {
    if (!user) throw new Error('User not authenticated');
    await azureADService.approveBreakGlassAccess(requestId, user.id);
  };

  const getPendingBreakGlassRequests = async (): Promise<BreakGlassAccess[]> => {
    return await azureADService.getPendingBreakGlassRequests();
  };

  const value = {
    user,
    session,
    loading,
    signIn,
    signOut,
    userProfile,
    userRole,
    hasPermission,
    hasBreakGlassAccess,
    requestBreakGlassAccess,
    approveBreakGlassAccess,
    getPendingBreakGlassRequests,
    isAzureADEnabled,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}