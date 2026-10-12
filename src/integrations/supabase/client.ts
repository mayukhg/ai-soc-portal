import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './types';
import { createLocalClient } from '@/integrations/local/client';

const SUPABASE_URL = "https://jnjtnphtrvqtnqgxihmx.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpuanRucGh0cnZxdG5xZ3hpaG14Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM4NTIzOTYsImV4cCI6MjA2OTQyODM5Nn0.U-VrHCVF7J1KwW-Fdx0SZ3ck6M-Ub5f20hbBwZtMWvI";

const useLocalBackend =
  import.meta.env.VITE_USE_LOCAL_BACKEND === 'true' ||
  (import.meta.env.DEV && import.meta.env.VITE_USE_LOCAL_BACKEND !== 'false');

const remoteClient = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});

export const supabase = (
  useLocalBackend ? createLocalClient() : remoteClient
) as SupabaseClient<Database>;