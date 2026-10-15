import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { currentDevice, identifyUser as identifyHotjarUser, resetHotjarUser } from '@/lib/hotjar';
import { identifyUser, mapSocRole, trackEvent } from '@/lib/mixpanel';
import { consumeSessionDuration, markSignedIn, reset } from '@/lib/tracking';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
  userProfile: any;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  signOut: async () => {},
  userProfile: null,
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

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        // Fetch user profile when user signs in
        if (session?.user) {
          setTimeout(() => {
            fetchUserProfile(session.user.id);
          }, 0);
        } else {
          setUserProfile(null);
        }
        
        setLoading(false);
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        setTimeout(() => {
          fetchUserProfile(session.user.id);
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
      }
    } catch (err) {
      console.error('Error fetching user profile:', err);
    }
  };

  useEffect(() => {
    if (!user) return;
    markSignedIn();
    const role = typeof userProfile?.role === 'string' ? userProfile.role : 'analyst_tier2';
    const socRole = mapSocRole(role);
    const tierMatch = role.match(/tier_?(\d+)/i);
    const team = typeof userProfile?.organization === 'string'
      ? userProfile.organization
      : typeof userProfile?.team === 'string'
        ? userProfile.team
        : 'blue_team';
    const name = typeof userProfile?.full_name === 'string'
      ? userProfile.full_name
      : user.user_metadata?.full_name || user.email?.split('@')[0] || 'Analyst';

    identifyUser(user.id, {
      $email: user.email,
      $name: name,
      role: socRole,
      team,
      $created: user.created_at,
      platform: 'ai_soc',
    });
    identifyHotjarUser(user.id, {
      user_role: role,
      account_tier: tierMatch ? `tier${tierMatch[1]}` : 'tier2',
      device: currentDevice(),
      synthetic: true,
    });

    const method = sessionStorage.getItem('mp_pending_sign_in');
    if (method) {
      trackEvent('analyst_logged_in', {
        method: method === 'sso' ? 'sso' : 'email',
        role: socRole,
      });
      sessionStorage.removeItem('mp_pending_sign_in');
    }
  }, [user, userProfile]);

  const signOut = async () => {
    trackEvent('analyst_logged_out', { session_duration_seconds: consumeSessionDuration() });
    reset();
    resetHotjarUser();
    await supabase.auth.signOut();
  };

  const value = {
    user,
    session,
    loading,
    signOut,
    userProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}