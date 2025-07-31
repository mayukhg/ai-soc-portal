# Azure AD Integration Setup Guide

## 1. Azure AD App Registration

### 1.1 Create App Registration
1. Navigate to Azure Portal > Azure Active Directory > App registrations
2. Click "New registration"
3. Configure:
   - **Name**: SOC Nexus
   - **Supported account types**: Accounts in this organizational directory only
   - **Redirect URI**: Web - `https://your-domain.com/auth/callback`

### 1.2 Configure Authentication
1. Go to Authentication tab
2. Add redirect URIs:
   - `https://your-domain.com/auth/callback`
   - `http://localhost:3000/auth/callback` (for development)
3. Enable:
   - Access tokens
   - ID tokens
   - Implicit grant and hybrid flows

### 1.3 Configure API Permissions
1. Go to API permissions tab
2. Add permissions:
   - Microsoft Graph > Delegated > User.Read
   - Microsoft Graph > Delegated > GroupMember.Read.All
   - Microsoft Graph > Delegated > Directory.Read.All

### 1.4 Create Client Secret
1. Go to Certificates & secrets tab
2. Create new client secret
3. Note the secret value and expiration date

## 2. Azure AD Groups for RBAC

### 2.1 Create Security Groups
Create the following groups in Azure AD:

```
SOC-Analyst-Tier1
SOC-Analyst-Tier2  
SOC-Analyst-Tier3
SOC-Manager
SOC-Admin
SOC-BreakGlass
```

### 2.2 Group Configuration
- **SOC-Analyst-Tier1**: Basic alert handling, view-only access
- **SOC-Analyst-Tier2**: Advanced investigation, incident creation
- **SOC-Analyst-Tier3**: Full system access, threat management
- **SOC-Manager**: Management oversight, reporting access
- **SOC-Admin**: System administration, user management
- **SOC-BreakGlass**: Emergency access, full system control

## 3. Environment Variables

Add these to your environment configuration:

```env
# Azure AD Configuration
AZURE_AD_CLIENT_ID=your-client-id
AZURE_AD_CLIENT_SECRET=your-client-secret
AZURE_AD_TENANT_ID=your-tenant-id
AZURE_AD_REDIRECT_URI=https://your-domain.com/auth/callback

# Azure AD Groups (for role mapping)
AZURE_AD_GROUP_SOC_ANALYST_TIER1=group-id-1
AZURE_AD_GROUP_SOC_ANALYST_TIER2=group-id-2
AZURE_AD_GROUP_SOC_ANALYST_TIER3=group-id-3
AZURE_AD_GROUP_SOC_MANAGER=group-id-4
AZURE_AD_GROUP_SOC_ADMIN=group-id-5
AZURE_AD_GROUP_SOC_BREAKGLASS=group-id-6
```

## 4. Database Schema Updates

### 4.1 Update Profiles Table
```sql
-- Add Azure AD specific fields
ALTER TABLE public.profiles 
ADD COLUMN azure_ad_id TEXT UNIQUE,
ADD COLUMN azure_ad_groups TEXT[],
ADD COLUMN last_sync_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN break_glass_access BOOLEAN DEFAULT false,
ADD COLUMN break_glass_expires_at TIMESTAMP WITH TIME ZONE;

-- Add indexes for performance
CREATE INDEX idx_profiles_azure_ad_id ON public.profiles(azure_ad_id);
CREATE INDEX idx_profiles_azure_ad_groups ON public.profiles USING GIN(azure_ad_groups);
```

### 4.2 Create Role Mapping Table
```sql
CREATE TABLE public.role_mappings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  azure_ad_group_id TEXT NOT NULL UNIQUE,
  azure_ad_group_name TEXT NOT NULL,
  internal_role TEXT NOT NULL CHECK (internal_role IN ('analyst_tier1', 'analyst_tier2', 'analyst_tier3', 'manager', 'admin')),
  permissions JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
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
```

## 5. Break Glass Access Configuration

### 5.1 Break Glass Policy
```sql
-- Create break glass access table
CREATE TABLE public.break_glass_access (
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

-- Enable RLS
ALTER TABLE public.break_glass_access ENABLE ROW LEVEL SECURITY;

-- Users can view their own break glass requests
CREATE POLICY "Users can view their own break glass access" 
ON public.break_glass_access 
FOR SELECT 
USING (user_id = auth.uid() OR requested_by = auth.uid());

-- Only admins can approve break glass access
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
```

## 6. Next Steps

1. Configure Azure AD authentication in your application
2. Implement role synchronization logic
3. Update frontend components for Azure AD login
4. Implement break glass access workflow
5. Update RLS policies for enhanced security
6. Test all role-based access scenarios 