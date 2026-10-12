INSERT INTO public.incidents (id, title, description, severity, status, assignee, alert_count, tags, created_at, updated_at)
VALUES
  (
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
    'Suspicious PowerShell Execution Detected',
    'Multiple PowerShell scripts executed from unusual locations with encoded commands and outbound connections.',
    'high',
    'investigating',
    'Alex Rivera',
    3,
    ARRAY['powershell', 'malware', 'lateral-movement'],
    now() - interval '2 hours',
    now() - interval '20 minutes'
  ),
  (
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2',
    'Data Exfiltration Attempt',
    'Large data transfers to an external address during off-hours from the finance segment.',
    'critical',
    'open',
    'Alex Rivera',
    5,
    ARRAY['data-exfiltration', 'network-anomaly', 'traffic-analysis'],
    now() - interval '5 hours',
    now() - interval '40 minutes'
  ),
  (
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3',
    'Phishing campaign against finance mailboxes',
    'Credential-harvesting mail with a lookalike domain reached several finance users.',
    'high',
    'investigating',
    'Alex Rivera',
    2,
    ARRAY['phishing', 'credential-theft'],
    now() - interval '8 hours',
    now() - interval '1 hour'
  ),
  (
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4',
    'Volumetric DDoS against the web cluster',
    'Sustained traffic from a known botnet address saturated the public web tier.',
    'critical',
    'open',
    'Alex Rivera',
    4,
    ARRAY['ddos', 'botnet', 'availability'],
    now() - interval '30 minutes',
    now() - interval '10 minutes'
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.alerts (
  id, title, description, severity, status, source, alert_type,
  source_ip, affected_systems, indicators, created_at, updated_at
)
VALUES
  (
    '11111111-1111-4111-8111-111111111111',
    'Suspicious Network Traffic Detected',
    'Multiple connections to known malicious IP addresses detected from the internal network',
    'high',
    'investigating',
    'Network IDS',
    'Network Anomaly',
    '192.168.1.100',
    ARRAY['WS-FINANCE-01', 'WS-FINANCE-02'],
    ARRAY['185.220.101.182', 'multiple-connections'],
    now() - interval '25 minutes',
    now() - interval '10 minutes'
  ),
  (
    '22222222-2222-4222-8222-222222222222',
    'Malware Detection on Endpoint',
    'Trojan.Win32.Agent detected and quarantined on a user workstation',
    'critical',
    'resolved',
    'EDR System',
    'Malware Detection',
    NULL,
    ARRAY['WS-USER-045'],
    ARRAY['trojan-signature', 'file-hash-match'],
    now() - interval '3 hours',
    now() - interval '1 hour'
  ),
  (
    '33333333-3333-4333-8333-333333333333',
    'Failed Login Attempts',
    'Multiple failed login attempts detected for an administrator account',
    'medium',
    'acknowledged',
    'Domain Controller',
    'Authentication Anomaly',
    '203.0.113.42',
    ARRAY['DC-PRIMARY'],
    ARRAY['brute-force-pattern', 'admin-account'],
    now() - interval '90 minutes',
    now() - interval '50 minutes'
  ),
  (
    '44444444-4444-4444-8444-444444444444',
    'Phishing Email Campaign',
    'Suspicious email with a malicious attachment detected',
    'high',
    'open',
    'Email Security',
    'Phishing',
    NULL,
    ARRAY['MAIL-SERVER-01'],
    ARRAY['malicious-attachment', 'suspicious-sender'],
    now() - interval '45 minutes',
    now() - interval '45 minutes'
  ),
  (
    '55555555-5555-4555-8555-555555555555',
    'DDoS Attack Detected',
    'Volumetric DDoS attack targeting web services',
    'critical',
    'investigating',
    'WAF',
    'DDoS',
    '45.142.214.48',
    ARRAY['WEB-CLUSTER'],
    ARRAY['high-traffic-volume', 'multiple-sources'],
    now() - interval '15 minutes',
    now() - interval '5 minutes'
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.threat_intelligence (
  id, indicator_value, indicator_type, threat_type, confidence_score,
  country_code, latitude, longitude, source, tags, first_seen, last_seen
)
VALUES
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1', '185.220.101.182', 'ip', 'Malware C2', 95, 'RU', 55.7558, 37.6176, 'ThreatFeed Alpha', ARRAY['botnet', 'c2', 'malware'], now() - interval '2 days', now() - interval '1 hour'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2', 'malicious-domain.com', 'domain', 'Phishing', 87, 'CN', 39.9042, 116.4074, 'Intel Source Beta', ARRAY['phishing', 'credential-theft'], now() - interval '4 days', now() - interval '3 hours'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb3', '45.142.214.48', 'ip', 'DDoS Attack', 92, 'NL', 52.3676, 4.9041, 'ThreatFeed Alpha', ARRAY['ddos', 'botnet'], now() - interval '1 day', now() - interval '20 minutes'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb4', 'suspicious-site.net', 'domain', 'Malware Distribution', 78, 'US', 37.7749, -122.4194, 'Intel Source Gamma', ARRAY['malware', 'exploit-kit'], now() - interval '6 days', now() - interval '8 hours'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb5', '203.0.113.42', 'ip', 'Brute Force', 85, 'KR', 37.5665, 126.9780, 'ThreatFeed Alpha', ARRAY['brute-force', 'ssh-attack'], now() - interval '12 hours', now() - interval '90 minutes')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.kpi_metrics (
  id, metric_name, metric_category, current_value, previous_value, target_value,
  unit, trend, period_start, period_end
)
VALUES
  ('cccccccc-cccc-4ccc-8ccc-ccccccccccc1', 'Total Alerts', 'alerts', 5, 4, 10, 'count', 'up', now() - interval '24 hours', now()),
  ('cccccccc-cccc-4ccc-8ccc-ccccccccccc2', 'Critical Alerts', 'alerts', 2, 1, 1, 'count', 'up', now() - interval '24 hours', now()),
  ('cccccccc-cccc-4ccc-8ccc-ccccccccccc3', 'Mean Time to Detection', 'response_time', 4.2, 5.1, 4.0, 'minutes', 'down', now() - interval '24 hours', now()),
  ('cccccccc-cccc-4ccc-8ccc-ccccccccccc4', 'Mean Time to Response', 'response_time', 12.5, 15.2, 10.0, 'minutes', 'down', now() - interval '24 hours', now()),
  ('cccccccc-cccc-4ccc-8ccc-ccccccccccc5', 'Incident Resolution Rate', 'resolution', 94.5, 91.2, 95.0, 'percentage', 'up', now() - interval '24 hours', now()),
  ('cccccccc-cccc-4ccc-8ccc-ccccccccccc6', 'False Positive Rate', 'performance', 3.2, 4.1, 3.0, 'percentage', 'down', now() - interval '24 hours', now()),
  ('cccccccc-cccc-4ccc-8ccc-ccccccccccc7', 'Threat Intelligence Feeds', 'threats', 3, 3, 4, 'count', 'stable', now() - interval '24 hours', now()),
  ('cccccccc-cccc-4ccc-8ccc-ccccccccccc8', 'Active Threat Indicators', 'threats', 5, 4, 8, 'count', 'up', now() - interval '24 hours', now())
ON CONFLICT (id) DO NOTHING;

UPDATE public.alerts SET incident_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'
WHERE id = '22222222-2222-4222-8222-222222222222';
UPDATE public.alerts SET incident_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2'
WHERE id = '11111111-1111-4111-8111-111111111111';
UPDATE public.alerts SET incident_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3'
WHERE id = '44444444-4444-4444-8444-444444444444';
UPDATE public.alerts SET incident_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4'
WHERE id = '55555555-5555-4555-8555-555555555555';

UPDATE public.incidents AS incident
SET alert_count = (
  SELECT count(*) FROM public.alerts AS alert WHERE alert.incident_id = incident.id
);
