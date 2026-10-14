import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { currentDevice, identifyUser, resetHotjarUser } from '@/lib/hotjar';
import { consumeSessionDuration, identify, markSignedIn, reset, track } from '@/lib/tracking';

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
    const tierMatch = role.match(/tier_?(\d+)/i);
    const org = typeof userProfile?.organization === 'string' ? userProfile.organization : undefined;
    identify(user.id, { email: user.email, role, org });
    identifyUser(user.id, {
      user_role: role,
      account_tier: tierMatch ? `tier${tierMatch[1]}` : 'tier2',
      device: currentDevice(),
      synthetic: true,
    });
    const method = sessionStorage.getItem('mp_pending_sign_in');
    if (method && userProfile?.role) {
      track('user_signed_in', { method, role: userProfile.role });
      sessionStorage.removeItem('mp_pending_sign_in');
    }
  }, [user, userProfile]);

  const signOut = async () => {
    track('user_signed_out', { session_duration_seconds: consumeSessionDuration() });
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