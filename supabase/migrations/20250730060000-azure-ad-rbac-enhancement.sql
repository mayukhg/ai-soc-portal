-- Azure AD RBAC Enhancement Migration
-- This migration adds Azure AD integration and enhanced RBAC policies

-- Add Azure AD specific fields to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS azure_ad_id TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS azure_ad_groups TEXT[],
ADD COLUMN IF NOT EXISTS last_sync_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS break_glass_access BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS break_glass_expires_at TIMESTAMP WITH TIME ZONE;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_azure_ad_id ON public.profiles(azure_ad_id);
CREATE INDEX IF NOT EXISTS idx_profiles_azure_ad_groups ON public.profiles USING GIN(azure_ad_groups);

-- Create role mappings table
CREATE TABLE IF NOT EXISTS public.role_mappings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  azure_ad_group_id TEXT NOT NULL UNIQUE,
  azure_ad_group_name TEXT NOT NULL,
  internal_role TEXT NOT NULL CHECK (internal_role IN ('analyst_tier1', 'analyst_tier2', 'analyst_tier3', 'manager', 'admin')),
  permissions JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on role mappings
ALTER TABLE public.role_mappings ENABLE ROW LEVEL SECURITY;

-- Admin only can manage role mappings
CREATE POLICY "Only admins can manage role mappings" 
ON public.role_mappings 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);

-- Create break glass access table
CREATE TABLE IF NOT EXISTS public.break_glass_access (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  requested_by UUID NOT NULL REFERENCES public.profiles(user_id),
  approved_by UUID REFERENCES public.profiles(user_id),
  reason TEXT NOT NULL,
  requested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  approved_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Enable RLS on break glass access
ALTER TABLE public.break_glass_access ENABLE ROW LEVEL SECURITY;

-- Users can view their own break glass requests
CREATE POLICY "Users can view their own break glass access" 
ON public.break_glass_access 
FOR SELECT 
USING (user_id = auth.uid() OR requested_by = auth.uid());

-- Only admins can manage break glass access
CREATE POLICY "Only admins can manage break glass access" 
ON public.break_glass_access 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);

-- Enhanced RLS policies for alerts with role-based access
DROP POLICY IF EXISTS "Users can update alerts" ON public.alerts;
CREATE POLICY "Role-based alert updates" 
ON public.alerts 
FOR UPDATE 
USING (
  -- Admin can update all alerts
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
  OR
  -- Tier 3 analysts can update all alerts
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND role = 'analyst_tier3'
  )
  OR
  -- Tier 1 and 2 can update assigned alerts or unassigned alerts
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND role IN ('analyst_tier1', 'analyst_tier2')
  ) AND (assigned_to IS NULL OR assigned_to = auth.uid())
);

-- Enhanced RLS policies for incidents
DROP POLICY IF EXISTS "Users can view all incidents" ON public.incidents;
CREATE POLICY "Role-based incident access" 
ON public.incidents 
FOR SELECT 
USING (
  -- Admin and Tier 3 can view all incidents
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'analyst_tier3')
  )
  OR
  -- Tier 1 and 2 can view incidents they're assigned to or unassigned
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND role IN ('analyst_tier1', 'analyst_tier2')
  ) AND (assigned_to IS NULL OR assigned_to = auth.uid())
  OR
  -- Managers can view all incidents
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND role = 'manager'
  )
);

-- Enhanced RLS policies for threat intelligence
DROP POLICY IF EXISTS "Users can manage threat intelligence" ON public.threat_intelligence;
CREATE POLICY "Role-based threat intelligence access" 
ON public.threat_intelligence 
FOR ALL 
USING (
  -- Admin and Tier 3 can manage all threat intelligence
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'analyst_tier3')
  )
  OR
  -- Tier 2 can manage threat intelligence
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND role = 'analyst_tier2'
  )
  OR
  -- Tier 1 and managers can only view
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND role IN ('analyst_tier1', 'manager')
  )
);

-- Enhanced RLS policies for reports
DROP POLICY IF EXISTS "Users can view reports based on role" ON public.reports;
CREATE POLICY "Role-based report access" 
ON public.reports 
FOR SELECT 
USING (
  -- Admin can view all reports
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
  OR
  -- Users can view reports they generated
  generated_by = auth.uid()
  OR
  -- Users can view reports generated for their role
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND role = ANY(generated_for)
  )
  OR
  -- Users can view reports generated for 'all'
  'all' = ANY(generated_for)
);

-- Enhanced RLS policies for KPI metrics
DROP POLICY IF EXISTS "Users can manage KPI metrics" ON public.kpi_metrics;
CREATE POLICY "Role-based KPI access" 
ON public.kpi_metrics 
FOR ALL 
USING (
  -- Admin can manage all KPIs
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
  OR
  -- Tier 3 can manage KPIs
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND role = 'analyst_tier3'
  )
  OR
  -- Others can only view
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND role IN ('analyst_tier1', 'analyst_tier2', 'manager')
  )
);

-- Function to check if user has break glass access
CREATE OR REPLACE FUNCTION public.has_break_glass_access(user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.break_glass_access
    WHERE user_id = user_uuid
    AND is_active = true
    AND expires_at > NOW()
  );
END;
$$;

-- Function to get user's effective role (including break glass)
CREATE OR REPLACE FUNCTION public.get_effective_role(user_uuid UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_role TEXT;
  has_break_glass BOOLEAN;
BEGIN
  -- Get user's base role
  SELECT role INTO user_role
  FROM public.profiles
  WHERE user_id = user_uuid;
  
  -- Check for break glass access
  SELECT has_break_glass_access(user_uuid) INTO has_break_glass;
  
  -- If user has break glass access, return admin role
  IF has_break_glass THEN
    RETURN 'admin';
  END IF;
  
  -- Otherwise return base role
  RETURN COALESCE(user_role, 'analyst_tier1');
END;
$$;

-- Function to check if user has permission
CREATE OR REPLACE FUNCTION public.has_permission(user_uuid UUID, required_permission TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_role TEXT;
  has_break_glass BOOLEAN;
BEGIN
  -- Get user's effective role
  SELECT get_effective_role(user_uuid) INTO user_role;
  
  -- Check for break glass access
  SELECT has_break_glass_access(user_uuid) INTO has_break_glass;
  
  -- If user has break glass access, they have all permissions
  IF has_break_glass THEN
    RETURN TRUE;
  END IF;
  
  -- Check permissions based on role
  CASE user_role
    WHEN 'admin' THEN
      RETURN TRUE;
    WHEN 'analyst_tier3' THEN
      RETURN required_permission IN ('view_alerts', 'update_alerts', 'delete_alerts', 'view_incidents', 'create_incidents', 'update_incidents', 'delete_incidents', 'view_threat_intel', 'manage_threat_intel', 'generate_reports');
    WHEN 'analyst_tier2' THEN
      RETURN required_permission IN ('view_alerts', 'update_alerts', 'view_incidents', 'create_incidents', 'update_incidents', 'view_threat_intel', 'manage_threat_intel');
    WHEN 'analyst_tier1' THEN
      RETURN required_permission IN ('view_alerts', 'update_alerts', 'view_incidents', 'view_threat_intel');
    WHEN 'manager' THEN
      RETURN required_permission IN ('view_alerts', 'view_incidents', 'view_threat_intel', 'generate_reports');
    ELSE
      RETURN FALSE;
  END CASE;
END;
$$;

-- Add triggers for updated_at timestamps
CREATE TRIGGER update_role_mappings_updated_at
  BEFORE UPDATE ON public.role_mappings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_break_glass_access_updated_at
  BEFORE UPDATE ON public.break_glass_access
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default role mappings
INSERT INTO public.role_mappings (azure_ad_group_id, azure_ad_group_name, internal_role, permissions) VALUES
(ENV('AZURE_AD_GROUP_SOC_ANALYST_TIER1'), 'SOC-Analyst-Tier1', 'analyst_tier1', '["view_alerts", "update_alerts", "view_incidents", "view_threat_intel"]'),
(ENV('AZURE_AD_GROUP_SOC_ANALYST_TIER2'), 'SOC-Analyst-Tier2', 'analyst_tier2', '["view_alerts", "update_alerts", "view_incidents", "create_incidents", "update_incidents", "view_threat_intel", "manage_threat_intel"]'),
(ENV('AZURE_AD_GROUP_SOC_ANALYST_TIER3'), 'SOC-Analyst-Tier3', 'analyst_tier3', '["view_alerts", "update_alerts", "delete_alerts", "view_incidents", "create_incidents", "update_incidents", "delete_incidents", "view_threat_intel", "manage_threat_intel", "generate_reports"]'),
(ENV('AZURE_AD_GROUP_SOC_MANAGER'), 'SOC-Manager', 'manager', '["view_alerts", "view_incidents", "view_threat_intel", "generate_reports"]'),
(ENV('AZURE_AD_GROUP_SOC_ADMIN'), 'SOC-Admin', 'admin', '["*"]')
ON CONFLICT (azure_ad_group_id) DO NOTHING; 