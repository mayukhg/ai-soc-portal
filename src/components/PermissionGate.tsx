import React from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface PermissionGateProps {
  children: React.ReactNode;
  permissions: string | string[];
  fallback?: React.ReactNode;
  requireAll?: boolean;
}

export function PermissionGate({ 
  children, 
  permissions, 
  fallback = null, 
  requireAll = false 
}: PermissionGateProps) {
  const { hasPermission, userRole } = useAuth();

  // If no user role, don't render anything
  if (!userRole) {
    return fallback;
  }

  // Convert single permission to array
  const permissionArray = Array.isArray(permissions) ? permissions : [permissions];

  // Check permissions
  let hasAccess = false;
  
  if (requireAll) {
    // User must have ALL permissions
    hasAccess = permissionArray.every(permission => hasPermission(permission));
  } else {
    // User must have ANY permission
    hasAccess = permissionArray.some(permission => hasPermission(permission));
  }

  // Render children if user has access, otherwise render fallback
  return hasAccess ? <>{children}</> : <>{fallback}</>;
}

// Convenience components for common permission checks
export function ViewAlertsGate({ children, fallback }: { children: React.ReactNode; fallback?: React.ReactNode }) {
  return (
    <PermissionGate permissions="view_alerts" fallback={fallback}>
      {children}
    </PermissionGate>
  );
}

export function UpdateAlertsGate({ children, fallback }: { children: React.ReactNode; fallback?: React.ReactNode }) {
  return (
    <PermissionGate permissions="update_alerts" fallback={fallback}>
      {children}
    </PermissionGate>
  );
}

export function DeleteAlertsGate({ children, fallback }: { children: React.ReactNode; fallback?: React.ReactNode }) {
  return (
    <PermissionGate permissions="delete_alerts" fallback={fallback}>
      {children}
    </PermissionGate>
  );
}

export function ViewIncidentsGate({ children, fallback }: { children: React.ReactNode; fallback?: React.ReactNode }) {
  return (
    <PermissionGate permissions="view_incidents" fallback={fallback}>
      {children}
    </PermissionGate>
  );
}

export function CreateIncidentsGate({ children, fallback }: { children: React.ReactNode; fallback?: React.ReactNode }) {
  return (
    <PermissionGate permissions="create_incidents" fallback={fallback}>
      {children}
    </PermissionGate>
  );
}

export function UpdateIncidentsGate({ children, fallback }: { children: React.ReactNode; fallback?: React.ReactNode }) {
  return (
    <PermissionGate permissions="update_incidents" fallback={fallback}>
      {children}
    </PermissionGate>
  );
}

export function DeleteIncidentsGate({ children, fallback }: { children: React.ReactNode; fallback?: React.ReactNode }) {
  return (
    <PermissionGate permissions="delete_incidents" fallback={fallback}>
      {children}
    </PermissionGate>
  );
}

export function ViewThreatIntelGate({ children, fallback }: { children: React.ReactNode; fallback?: React.ReactNode }) {
  return (
    <PermissionGate permissions="view_threat_intel" fallback={fallback}>
      {children}
    </PermissionGate>
  );
}

export function ManageThreatIntelGate({ children, fallback }: { children: React.ReactNode; fallback?: React.ReactNode }) {
  return (
    <PermissionGate permissions="manage_threat_intel" fallback={fallback}>
      {children}
    </PermissionGate>
  );
}

export function GenerateReportsGate({ children, fallback }: { children: React.ReactNode; fallback?: React.ReactNode }) {
  return (
    <PermissionGate permissions="generate_reports" fallback={fallback}>
      {children}
    </PermissionGate>
  );
}

export function AdminGate({ children, fallback }: { children: React.ReactNode; fallback?: React.ReactNode }) {
  return (
    <PermissionGate permissions="*" fallback={fallback}>
      {children}
    </PermissionGate>
  );
}

// Role-based gates
export function Tier1Gate({ children, fallback }: { children: React.ReactNode; fallback?: React.ReactNode }) {
  const { userRole } = useAuth();
  const hasAccess = userRole?.role === 'analyst_tier1' || 
                   userRole?.role === 'analyst_tier2' || 
                   userRole?.role === 'analyst_tier3' || 
                   userRole?.role === 'admin';
  
  return hasAccess ? <>{children}</> : <>{fallback}</>;
}

export function Tier2Gate({ children, fallback }: { children: React.ReactNode; fallback?: React.ReactNode }) {
  const { userRole } = useAuth();
  const hasAccess = userRole?.role === 'analyst_tier2' || 
                   userRole?.role === 'analyst_tier3' || 
                   userRole?.role === 'admin';
  
  return hasAccess ? <>{children}</> : <>{fallback}</>;
}

export function Tier3Gate({ children, fallback }: { children: React.ReactNode; fallback?: React.ReactNode }) {
  const { userRole } = useAuth();
  const hasAccess = userRole?.role === 'analyst_tier3' || userRole?.role === 'admin';
  
  return hasAccess ? <>{children}</> : <>{fallback}</>;
}

export function ManagerGate({ children, fallback }: { children: React.ReactNode; fallback?: React.ReactNode }) {
  const { userRole } = useAuth();
  const hasAccess = userRole?.role === 'manager' || userRole?.role === 'admin';
  
  return hasAccess ? <>{children}</> : <>{fallback}</>;
}

export function AdminOnlyGate({ children, fallback }: { children: React.ReactNode; fallback?: React.ReactNode }) {
  const { userRole } = useAuth();
  const hasAccess = userRole?.role === 'admin';
  
  return hasAccess ? <>{children}</> : <>{fallback}</>;
} 