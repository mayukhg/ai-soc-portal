import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Shield, Building2, Key, AlertTriangle } from 'lucide-react';

export function AuthPage() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  
  // Supabase auth state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [username, setUsername] = useState('');
  
  const navigate = useNavigate();
  const { signIn: azureSignIn, isAzureADEnabled } = useAuth();

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        
        // Redirect authenticated users to home
        if (session?.user) {
          navigate('/');
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      
      if (session?.user) {
        navigate('/');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleAzureADSignIn = async () => {
    setAuthLoading(true);
    setError(null);
    setMessage(null);

    try {
      await azureSignIn();
      setMessage('Successfully signed in with Azure AD! Redirecting...');
    } catch (err: any) {
      setError(err.message || 'Failed to sign in with Azure AD');
    } finally {
      setAuthLoading(false);
    }
  };

  const signIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setError(null);
    setMessage(null);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          setError('Invalid email or password. Please check your credentials and try again.');
        } else if (error.message.includes('Email not confirmed')) {
          setError('Please check your email and click the confirmation link before signing in.');
        } else {
          setError(error.message);
        }
      } else {
        setMessage('Successfully signed in! Redirecting...');
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setAuthLoading(false);
    }
  };

  const signUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setError(null);
    setMessage(null);

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username: username,
          },
        },
      });

      if (error) {
        setError(error.message);
      } else {
        setMessage('Please check your email for the confirmation link.');
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setAuthLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Shield className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl">SOC Nexus</CardTitle>
          <CardDescription>
            Sign in to access your Security Operations Center dashboard
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Azure AD Sign In */}
          {isAzureADEnabled && (
            <>
              <div className="space-y-2">
                <Button 
                  onClick={handleAzureADSignIn}
                  disabled={authLoading}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  <Building2 className="mr-2 h-4 w-4" />
                  {authLoading ? 'Signing in...' : 'Sign in with Azure AD'}
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  Recommended for enterprise users
                </p>
              </div>
              
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <Separator className="w-full" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">
                    Or continue with
                  </span>
                </div>
              </div>
            </>
          )}

          {/* Error/Message Display */}
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          {message && (
            <Alert>
              <AlertDescription>{message}</AlertDescription>
            </Alert>
          )}

          {/* Supabase Auth Form */}
          <form onSubmit={isSignUp ? signUp : signIn} className="space-y-4">
            {isSignUp && (
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your username"
                  required={isSignUp}
                />
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
              />
            </div>
            
            <Button 
              type="submit" 
              className="w-full" 
              disabled={authLoading}
            >
              <Key className="mr-2 h-4 w-4" />
              {authLoading ? 'Signing in...' : (isSignUp ? 'Sign Up' : 'Sign In')}
            </Button>
          </form>

          {/* Toggle Sign Up/Sign In */}
          <div className="text-center">
            <Button
              variant="link"
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-sm"
            >
              {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
            </Button>
          </div>

          {/* Authentication Method Info */}
          <div className="rounded-lg border bg-muted/50 p-3">
            <div className="flex items-center gap-2 text-sm">
              <Shield className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Authentication Method:</span>
              <Badge variant="secondary">
                {isAzureADEnabled ? 'Azure AD + Supabase' : 'Supabase Only'}
              </Badge>
            </div>
            {isAzureADEnabled && (
              <p className="text-xs text-muted-foreground mt-1">
                Azure AD provides enterprise-grade authentication with role-based access control.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}