-- =============================================================================
-- SOC-AI Nexus Admin User Setup Script
-- =============================================================================
-- This script creates an admin user for the SOC-AI Nexus dashboard
-- Run this script in your Supabase SQL editor or database client
--
-- Admin Credentials:
-- Email: mayukh@gmail.com
-- Password: ajpap@29
-- Role: admin
-- =============================================================================

-- Create the admin user in auth.users table
-- Note: This requires admin access to the auth schema
INSERT INTO auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  recovery_sent_at,
  last_sign_in_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) VALUES (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'mayukh@gmail.com',
  crypt('ajpap@29', gen_salt('bf')),
  now(),
  null,
  now(),
  '{"provider": "email", "providers": ["email"]}',
  '{"username": "mayukh_admin", "full_name": "Mayukh Ghosh"}',
  now(),
  now(),
  '',
  '',
  '',
  ''
);

-- Create the admin profile
INSERT INTO public.profiles (
  user_id,
  username,
  full_name,
  role,
  department,
  created_at,
  updated_at
) VALUES (
  (SELECT id FROM auth.users WHERE email = 'mayukh@gmail.com'),
  'mayukh_admin',
  'Mayukh Ghosh',
  'admin',
  'security',
  now(),
  now()
);

-- Create sample alerts for testing
INSERT INTO public.alerts (
  title,
  description,
  severity,
  status,
  source,
  alert_type,
  source_ip,
  destination_ip,
  affected_systems,
  indicators,
  created_at,
  updated_at,
  metadata
) VALUES 
(
  'Suspicious PowerShell Activity Detected',
  'Multiple PowerShell commands executed with suspicious parameters including base64 encoding and network requests',
  'high',
  'open',
  'EDR System',
  'malware_behavior',
  '192.168.1.100',
  '10.0.0.50',
  ARRAY['workstation-001', 'server-002'],
  ARRAY['powershell.exe', 'base64', 'invoke-expression'],
  now(),
  now(),
  '{"confidence": 0.85, "threat_type": "malware", "ioc_count": 3}'
),
(
  'Failed Login Attempts from Unknown IP',
  'Multiple failed login attempts detected from IP address 203.0.113.42 targeting multiple user accounts',
  'medium',
  'open',
  'Authentication System',
  'brute_force',
  '203.0.113.42',
  '192.168.1.10',
  ARRAY['auth-server-01'],
  ARRAY['203.0.113.42', 'failed_login', 'brute_force'],
  now(),
  now(),
  '{"attempt_count": 15, "time_window": "5m", "blocked": true}'
),
(
  'Data Exfiltration Attempt Detected',
  'Large volume of data being transferred to external IP address during off-hours',
  'critical',
  'investigating',
  'DLP System',
  'data_exfiltration',
  '192.168.1.50',
  '198.51.100.25',
  ARRAY['file-server-01', 'database-02'],
  ARRAY['198.51.100.25', 'large_transfer', 'off_hours'],
  now(),
  now(),
  '{"data_size": "2.5GB", "file_types": ["pdf", "xlsx", "docx"], "time": "02:30"}'
);

-- Create sample incidents
INSERT INTO public.incidents (
  title,
  description,
  severity,
  status,
  incident_type,
  source,
  affected_systems,
  assigned_to,
  created_at,
  updated_at,
  metadata
) VALUES 
(
  'Malware Infection in Development Environment',
  'Suspicious executable detected on development workstation with network communication to known C2 servers',
  'high',
  'investigating',
  'malware',
  'EDR Alert',
  ARRAY['dev-workstation-03', 'dev-server-01'],
  (SELECT user_id FROM public.profiles WHERE username = 'mayukh_admin'),
  now(),
  now(),
  '{"malware_family": "trojan", "c2_servers": ["malicious-domain.com"], "quarantined": true}'
),
(
  'Phishing Campaign Targeting Employees',
  'Multiple employees received suspicious emails with malicious attachments',
  'medium',
  'open',
  'phishing',
  'Email Security',
  ARRAY['email-server-01'],
  (SELECT user_id FROM public.profiles WHERE username = 'mayukh_admin'),
  now(),
  now(),
  '{"email_count": 25, "affected_users": 8, "blocked": true}'
);

-- Create sample threat intelligence
INSERT INTO public.threat_intelligence (
  indicator_value,
  indicator_type,
  threat_type,
  confidence_score,
  country_code,
  source,
  first_seen,
  last_seen,
  is_active,
  tags,
  metadata
) VALUES 
(
  '203.0.113.42',
  'ip',
  'malicious_ip',
  95,
  'CN',
  'Threat Intelligence Feed',
  now() - interval '7 days',
  now(),
  true,
  ARRAY['botnet', 'c2', 'malware'],
  '{"asn": "AS4134", "organization": "Chinanet", "reputation": "malicious"}'
),
(
  'malicious-domain.com',
  'domain',
  'c2_domain',
  90,
  'RU',
  'DNS Analysis',
  now() - interval '3 days',
  now(),
  true,
  ARRAY['c2', 'trojan', 'apt'],
  '{"registrar": "RU-CENTER", "creation_date": "2024-01-15", "reputation": "malicious"}'
);

-- Create sample KPI metrics
INSERT INTO public.kpi_metrics (
  metric_name,
  metric_category,
  current_value,
  previous_value,
  target_value,
  unit,
  trend,
  period_start,
  period_end,
  calculated_at,
  metadata
) VALUES 
(
  'Mean Time to Detection (MTTD)',
  'response_time',
  15.5,
  18.2,
  10.0,
  'minutes',
  'down',
  now() - interval '24 hours',
  now(),
  now(),
  '{"improvement": "15%", "target_met": false}'
),
(
  'Mean Time to Response (MTTR)',
  'response_time',
  45.2,
  52.8,
  30.0,
  'minutes',
  'down',
  now() - interval '24 hours',
  now(),
  now(),
  '{"improvement": "14%", "target_met": false}'
),
(
  'False Positive Rate',
  'alerts',
  12.5,
  15.3,
  10.0,
  'percentage',
  'down',
  now() - interval '24 hours',
  now(),
  now(),
  '{"improvement": "18%", "target_met": false}'
),
(
  'Critical Alerts Resolved',
  'resolution',
  8,
  6,
  10,
  'count',
  'up',
  now() - interval '24 hours',
  now(),
  now(),
  '{"completion_rate": "80%", "target_met": false}'
);

-- Verify the admin user was created successfully
SELECT 
  u.email,
  p.username,
  p.role,
  p.full_name,
  p.department
FROM auth.users u
JOIN public.profiles p ON u.id = p.user_id
WHERE u.email = 'mayukh@gmail.com';

-- Display summary
SELECT 
  'Admin User Created Successfully!' as status,
  'mayukh@gmail.com' as email,
  'admin' as role,
  'Mayukh Ghosh' as full_name;
