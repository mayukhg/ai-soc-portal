-- Synthetic SOC dataset. Reloading replaces operational rows and keeps the
-- demo analyst account. Assistant replies in this file are prior session
-- history only. New questions still go to OpenRouter.

DELETE FROM public.comments;
DELETE FROM public.ai_interactions;
DELETE FROM public.reports;
DELETE FROM public.alerts;
DELETE FROM public.incidents;
DELETE FROM public.threat_intelligence;
DELETE FROM public.kpi_metrics;
DELETE FROM public.profiles WHERE user_id <> '00000000-0000-4000-8000-000000000001';
DELETE FROM public.users WHERE id <> '00000000-0000-4000-8000-000000000001';

INSERT INTO public.users (id, email, password_hash, raw_user_meta_data)
VALUES
  (
    '00000000-0000-4000-8000-000000000002',
    'jordan.lee@soc.local',
    'synthetic-no-login',
    '{"full_name":"Jordan Lee","username":"jlee"}'::jsonb
  ),
  (
    '00000000-0000-4000-8000-000000000003',
    'priya.shah@soc.local',
    'synthetic-no-login',
    '{"full_name":"Priya Shah","username":"pshah"}'::jsonb
  ),
  (
    '00000000-0000-4000-8000-000000000004',
    'morgan.chen@soc.local',
    'synthetic-no-login',
    '{"full_name":"Morgan Chen","username":"mchen"}'::jsonb
  );

INSERT INTO public.profiles (user_id, username, full_name, role, department)
VALUES
  ('00000000-0000-4000-8000-000000000002', 'jlee', 'Jordan Lee', 'analyst_tier1', 'security'),
  ('00000000-0000-4000-8000-000000000003', 'pshah', 'Priya Shah', 'analyst_tier3', 'security'),
  ('00000000-0000-4000-8000-000000000004', 'mchen', 'Morgan Chen', 'management', 'security');

INSERT INTO public.incidents (
  id, title, description, severity, status, assignee, alert_count, tags, created_at, updated_at
)
VALUES
  (
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
    'Suspicious PowerShell Execution Detected',
    'Encoded PowerShell on WS-FINANCE-03 opened an outbound connection. The script has not been tied to a second host.',
    'high',
    'investigating',
    'Alex Rivera',
    0,
    ARRAY['powershell', 'malware', 'encoded-command'],
    now() - interval '2 hours',
    now() - interval '20 minutes'
  ),
  (
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2',
    'Data Exfiltration Attempt',
    'WS-FINANCE-02 sent 2.4 GB to an external host during off hours. The transfer is still open and is separate from the Ledger Fox beacon.',
    'critical',
    'open',
    'Priya Shah',
    0,
    ARRAY['data-exfiltration', 'finance', 'off-hours'],
    now() - interval '5 hours',
    now() - interval '40 minutes'
  ),
  (
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3',
    'Payroll phishing against employee mailboxes',
    'A lookalike payroll portal was reported by two employees. It is not the Ledger Fox invoice.',
    'high',
    'investigating',
    'Jordan Lee',
    0,
    ARRAY['phishing', 'payroll', 'credential-theft'],
    now() - interval '8 hours',
    now() - interval '1 hour'
  ),
  (
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4',
    'Volumetric DDoS against the web cluster',
    'Sustained traffic from 45.142.214.48 saturated WEB-CLUSTER. Rate limits held and the incident is resolved.',
    'critical',
    'resolved',
    'Morgan Chen',
    0,
    ARRAY['ddos', 'botnet', 'availability'],
    now() - interval '1 day',
    now() - interval '30 minutes'
  ),
  (
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa5',
    'Ledger Fox intrusion across finance hosts',
    'Finance users received a Ledger Fox invoice, then WS-FINANCE-01 started beaconing to 185.220.101.182. The campaign spans mail, network, and endpoint records.',
    'critical',
    'investigating',
    'Priya Shah',
    0,
    ARRAY['ledger-fox', 'campaign', 'beacon', 'phishing'],
    now() - interval '50 minutes',
    now() - interval '10 minutes'
  ),
  (
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa6',
    'USB storage policy violation',
    'A removable drive was mounted on WS-HR-12 outside the allowed device list. No malware finding is attached.',
    'low',
    'open',
    NULL,
    0,
    ARRAY['usb', 'policy', 'endpoint'],
    now() - interval '3 hours',
    now() - interval '3 hours'
  ),
  (
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa7',
    'Signed installer marked as a false positive',
    'The nightly software catalog installer matched a malware heuristic. Hash review closed the case as a false positive.',
    'medium',
    'closed',
    'Jordan Lee',
    0,
    ARRAY['false-positive', 'installer', 'endpoint'],
    now() - interval '2 days',
    now() - interval '6 hours'
  ),
  (
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa8',
    'Administrator brute force against the domain controller',
    'Repeated failures for the administrator account came from 203.0.113.42. The account is not locked.',
    'medium',
    'investigating',
    'Jordan Lee',
    0,
    ARRAY['brute-force', 'authentication', 'domain-controller'],
    now() - interval '90 minutes',
    now() - interval '35 minutes'
  );

INSERT INTO public.alerts (
  id, title, description, severity, status, source, alert_type,
  source_ip, destination_ip, affected_systems, indicators, assigned_to, incident_id,
  created_at, updated_at, resolved_at, metadata
)
VALUES
  (
    '11111111-1111-4111-8111-111111111111',
    'Suspicious Network Traffic Detected',
    'Multiple connections from 192.168.1.100 on WS-FINANCE-01 to 185.220.101.182. The sessions started after the Ledger Fox invoice mail was acknowledged.',
    'high',
    'investigating',
    'Network IDS',
    'Network Anomaly',
    '192.168.1.100',
    '185.220.101.182',
    ARRAY['WS-FINANCE-01', 'WS-FINANCE-02'],
    ARRAY['185.220.101.182', 'ledger-fox'],
    '00000000-0000-4000-8000-000000000001',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa5',
    now() - interval '25 minutes',
    now() - interval '10 minutes',
    NULL,
    '{"campaign":"ledger-fox","mitre":"T1071"}'::jsonb
  ),
  (
    '22222222-2222-4222-8222-222222222222',
    'Malware Detection on Endpoint',
    'Trojan.Win32.Agent was detected and quarantined on WS-USER-045. The file hash matches the endpoint malware indicator.',
    'critical',
    'resolved',
    'EDR System',
    'Malware Detection',
    NULL,
    NULL,
    ARRAY['WS-USER-045'],
    ARRAY['trojan-signature', 'file-hash-match'],
    '00000000-0000-4000-8000-000000000002',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa7',
    now() - interval '3 hours',
    now() - interval '1 hour',
    now() - interval '1 hour',
    '{"disposition":"quarantined"}'::jsonb
  ),
  (
    '33333333-3333-4333-8333-333333333333',
    'Failed Login Attempts',
    'Multiple failed login attempts for the administrator account from 203.0.113.42 against DC-PRIMARY.',
    'medium',
    'acknowledged',
    'Domain Controller',
    'Authentication Anomaly',
    '203.0.113.42',
    NULL,
    ARRAY['DC-PRIMARY'],
    ARRAY['brute-force-pattern', 'admin-account'],
    '00000000-0000-4000-8000-000000000001',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa8',
    now() - interval '90 minutes',
    now() - interval '50 minutes',
    NULL,
    '{"account":"administrator"}'::jsonb
  ),
  (
    '44444444-4444-4444-8444-444444444444',
    'Phishing Email Campaign',
    'A suspicious email with a malicious attachment from billing@pay-ledger.example reached finance mailboxes on MAIL-SERVER-01. The message asked users to review a Ledger Fox invoice.',
    'high',
    'acknowledged',
    'Email Security',
    'Phishing',
    NULL,
    NULL,
    ARRAY['MAIL-SERVER-01'],
    ARRAY['pay-ledger.example', 'malicious-attachment'],
    '00000000-0000-4000-8000-000000000002',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa5',
    now() - interval '45 minutes',
    now() - interval '30 minutes',
    NULL,
    '{"campaign":"ledger-fox","mitre":"T1566"}'::jsonb
  ),
  (
    '55555555-5555-4555-8555-555555555555',
    'DDoS Attack Detected',
    'Volumetric DDoS from 45.142.214.48 targeting WEB-CLUSTER. Traffic has subsided and the alert is resolved.',
    'critical',
    'resolved',
    'WAF',
    'DDoS',
    '45.142.214.48',
    NULL,
    ARRAY['WEB-CLUSTER'],
    ARRAY['high-traffic-volume', '45.142.214.48'],
    '00000000-0000-4000-8000-000000000004',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4',
    now() - interval '1 day',
    now() - interval '30 minutes',
    now() - interval '30 minutes',
    '{"peak_gbps":4.2}'::jsonb
  ),
  (
    'a1111111-1111-4111-8111-111111111112',
    'Finance workstation beacon to Ledger Fox',
    'WS-FINANCE-01 beacons every five minutes to 185.220.101.182 after a user opened the Ledger Fox invoice. The same host appears in the network alert.',
    'critical',
    'open',
    'EDR System',
    'Beacon',
    '192.168.1.100',
    '185.220.101.182',
    ARRAY['WS-FINANCE-01'],
    ARRAY['185.220.101.182', 'ledger-fox', 'five-minute-beacon'],
    '00000000-0000-4000-8000-000000000003',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa5',
    now() - interval '15 minutes',
    now() - interval '8 minutes',
    NULL,
    '{"campaign":"ledger-fox","interval":"5m"}'::jsonb
  ),
  (
    'a2222222-2222-4222-8222-222222222223',
    'Encoded PowerShell on finance workstation',
    'PowerShell ran with an encoded command on WS-FINANCE-03 and opened an outbound connection. No second address is confirmed.',
    'high',
    'investigating',
    'EDR System',
    'PowerShell',
    '192.168.1.130',
    NULL,
    ARRAY['WS-FINANCE-03'],
    ARRAY['encoded-command', 'powershell'],
    '00000000-0000-4000-8000-000000000001',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
    now() - interval '2 hours',
    now() - interval '20 minutes',
    NULL,
    '{"mitre":"T1059.001"}'::jsonb
  ),
  (
    'a3333333-3333-4333-8333-333333333334',
    'Large outbound transfer from finance',
    'WS-FINANCE-02 sent 2.4 GB to an external host during off hours. The transfer is still open and is separate from the Ledger Fox beacon.',
    'critical',
    'open',
    'Network IDS',
    'Data Exfiltration',
    '192.168.1.101',
    '198.51.100.77',
    ARRAY['WS-FINANCE-02'],
    ARRAY['2.4gb-transfer', 'off-hours'],
    '00000000-0000-4000-8000-000000000003',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2',
    now() - interval '5 hours',
    now() - interval '40 minutes',
    NULL,
    '{"bytes":2576980377}'::jsonb
  ),
  (
    'a4444444-4444-4444-8444-444444444445',
    'USB storage policy violation',
    'A removable drive was mounted on WS-HR-12 outside the allowed device list.',
    'low',
    'open',
    'Endpoint DLP',
    'Policy Violation',
    NULL,
    NULL,
    ARRAY['WS-HR-12'],
    ARRAY['removable-media'],
    NULL,
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa6',
    now() - interval '3 hours',
    now() - interval '3 hours',
    NULL,
    '{"device":"removable"}'::jsonb
  ),
  (
    'a5555555-5555-4555-8555-555555555556',
    'Scanner flagged a signed installer',
    'The nightly software catalog installer matched a malware heuristic and was marked a false positive after hash review.',
    'medium',
    'false_positive',
    'EDR System',
    'Malware Detection',
    NULL,
    NULL,
    ARRAY['WS-BUILD-02'],
    ARRAY['signed-installer'],
    '00000000-0000-4000-8000-000000000002',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa7',
    now() - interval '2 days',
    now() - interval '6 hours',
    NULL,
    '{"publisher":"internal-catalog"}'::jsonb
  ),
  (
    'a6666666-6666-4666-8666-666666666667',
    'VPN sign-in from an unusual country',
    'A user VPN session started from an unusual country and is waiting for the account owner to confirm travel.',
    'medium',
    'open',
    'VPN Gateway',
    'Authentication Anomaly',
    '49.36.50.10',
    NULL,
    ARRAY['VPN-GATEWAY'],
    ARRAY['unusual-country'],
    NULL,
    NULL,
    now() - interval '70 minutes',
    now() - interval '70 minutes',
    NULL,
    '{"awaiting":"user-confirmation"}'::jsonb
  ),
  (
    'a7777777-7777-4777-8777-777777777778',
    'Payroll phishing mail',
    'A lookalike payroll portal link was reported by two employees. It is not the Ledger Fox invoice.',
    'high',
    'investigating',
    'Email Security',
    'Phishing',
    NULL,
    NULL,
    ARRAY['MAIL-SERVER-01'],
    ARRAY['payroll-secure.example'],
    '00000000-0000-4000-8000-000000000002',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3',
    now() - interval '8 hours',
    now() - interval '1 hour',
    NULL,
    '{"reports":2}'::jsonb
  );

UPDATE public.incidents AS incident
SET alert_count = (
  SELECT count(*) FROM public.alerts AS alert WHERE alert.incident_id = incident.id
);

INSERT INTO public.comments (
  id, incident_id, alert_id, user_id, content, comment_type, is_internal, created_at
)
VALUES
  (
    'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee1',
    NULL,
    '11111111-1111-4111-8111-111111111111',
    '00000000-0000-4000-8000-000000000001',
    'Outbound sessions from WS-FINANCE-01 to 185.220.101.182 line up with the Ledger Fox invoice. Holding the host for containment review.',
    'note',
    true,
    now() - interval '20 minutes'
  ),
  (
    'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee2',
    NULL,
    '11111111-1111-4111-8111-111111111111',
    '00000000-0000-4000-8000-000000000002',
    'Did the user open the attachment, or only the invoice link?',
    'question',
    true,
    now() - interval '18 minutes'
  ),
  (
    'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee3',
    NULL,
    '11111111-1111-4111-8111-111111111111',
    '00000000-0000-4000-8000-000000000003',
    'Escalating to Tier 3. The beacon and this network alert share 185.220.101.182 and WS-FINANCE-01.',
    'escalation',
    true,
    now() - interval '12 minutes'
  ),
  (
    'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee4',
    NULL,
    '11111111-1111-4111-8111-111111111111',
    '00000000-0000-4000-8000-000000000004',
    'Containment is approved for WS-FINANCE-01 once the beacon check finishes.',
    'resolution',
    true,
    now() - interval '6 minutes'
  ),
  (
    'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee5',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa5',
    NULL,
    '00000000-0000-4000-8000-000000000003',
    'Treat the invoice mail, the network sessions, and the five-minute beacon as one Ledger Fox campaign.',
    'note',
    true,
    now() - interval '14 minutes'
  ),
  (
    'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee6',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa5',
    NULL,
    '00000000-0000-4000-8000-000000000001',
    'Escalating the finance segment. WS-FINANCE-02 also has an open transfer that should stay a separate incident.',
    'escalation',
    true,
    now() - interval '9 minutes'
  ),
  (
    'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee7',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa5',
    NULL,
    '00000000-0000-4000-8000-000000000002',
    'Please confirm whether any finance mailbox forwarded the Ledger Fox invoice outside the company.',
    'question',
    false,
    now() - interval '7 minutes'
  ),
  (
    'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee8',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
    NULL,
    '00000000-0000-4000-8000-000000000001',
    'The encoded PowerShell on WS-FINANCE-03 has one outbound connection and no confirmed second host.',
    'note',
    true,
    now() - interval '25 minutes'
  ),
  (
    'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee9',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4',
    NULL,
    '00000000-0000-4000-8000-000000000004',
    'Web cluster rate limits held. The DDoS from 45.142.214.48 is resolved.',
    'resolution',
    true,
    now() - interval '30 minutes'
  );

INSERT INTO public.threat_intelligence (
  id, indicator_value, indicator_type, threat_type, confidence_score,
  country_code, latitude, longitude, source, tags, first_seen, last_seen,
  is_active, metadata
)
VALUES
  (
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1',
    'Ledger Fox',
    'domain',
    'Intrusion set',
    96,
    'RU',
    55.7558,
    37.6176,
    'ThreatFeed Alpha',
    ARRAY['ledger-fox', 'intrusion-set'],
    now() - interval '4 days',
    now() - interval '10 minutes',
    true,
    $json${"include_in_graph":true,"graph_type":"threat_actor","links":[{"to":"185.220.101.182","label":"controls"},{"to":"pay-ledger.example","label":"uses"}]}$json$::jsonb
  ),
  (
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2',
    '185.220.101.182',
    'ip',
    'Malware C2',
    95,
    'RU',
    55.7558,
    37.6176,
    'ThreatFeed Alpha',
    ARRAY['ledger-fox', 'c2', 'malware'],
    now() - interval '2 days',
    now() - interval '8 minutes',
    true,
    $json${"include_in_graph":true,"graph_type":"ip","links":[{"to":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","label":"delivers"}]}$json$::jsonb
  ),
  (
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb3',
    'pay-ledger.example',
    'domain',
    'Phishing',
    87,
    'CN',
    39.9042,
    116.4074,
    'Intel Source Beta',
    ARRAY['ledger-fox', 'phishing'],
    now() - interval '4 days',
    now() - interval '30 minutes',
    true,
    $json${"include_in_graph":true,"graph_type":"domain","links":[{"to":"https://pay-ledger.example/invoice","label":"hosts"}]}$json$::jsonb
  ),
  (
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb4',
    'https://pay-ledger.example/invoice',
    'url',
    'Phishing',
    82,
    'CN',
    31.2304,
    121.4737,
    'Intel Source Beta',
    ARRAY['ledger-fox', 'phishing'],
    now() - interval '1 day',
    now() - interval '30 minutes',
    true,
    $json${"include_in_graph":true,"graph_type":"domain","links":[{"to":"billing@pay-ledger.example","label":"sent-by"}]}$json$::jsonb
  ),
  (
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb5',
    'billing@pay-ledger.example',
    'email',
    'Phishing',
    76,
    'CN',
    31.2304,
    121.4737,
    'Email Security',
    ARRAY['ledger-fox', 'phishing'],
    now() - interval '1 day',
    now() - interval '40 minutes',
    true,
    $json${"include_in_graph":true,"graph_type":"threat_actor","links":[]}$json$::jsonb
  ),
  (
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb6',
    'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    'hash',
    'Trojan',
    91,
    'US',
    37.7749,
    -122.4194,
    'EDR System',
    ARRAY['ledger-fox', 'trojan'],
    now() - interval '6 days',
    now() - interval '2 hours',
    true,
    $json${"include_in_graph":true,"graph_type":"malware","links":[{"to":"invoice.iso","label":"drops"},{"to":"CVE-2024-21887","label":"exploits"}]}$json$::jsonb
  ),
  (
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb7',
    'invoice.iso',
    'file',
    'Malware Distribution',
    70,
    'US',
    38.9072,
    -77.0369,
    'Email Security',
    ARRAY['ledger-fox', 'attachment'],
    now() - interval '1 day',
    now() - interval '40 minutes',
    true,
    $json${"include_in_graph":true,"graph_type":"malware","links":[]}$json$::jsonb
  ),
  (
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb8',
    'CVE-2024-21887',
    'file',
    'Vulnerability',
    55,
    'US',
    38.9072,
    -77.0369,
    'Intel Source Gamma',
    ARRAY['vulnerability', 'edge-device'],
    now() - interval '12 days',
    now() - interval '3 days',
    true,
    $json${"include_in_graph":true,"graph_type":"vulnerability","links":[]}$json$::jsonb
  ),
  (
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb9',
    '45.142.214.48',
    'ip',
    'DDoS Attack',
    92,
    'NL',
    52.3676,
    4.9041,
    'ThreatFeed Alpha',
    ARRAY['ddos', 'botnet'],
    now() - interval '1 day',
    now() - interval '30 minutes',
    true,
    $json${"include_in_graph":true,"graph_type":"ip","links":[]}$json$::jsonb
  ),
  (
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb10',
    'botnet.example',
    'domain',
    'DDoS Attack',
    88,
    'NL',
    52.3676,
    4.9041,
    'ThreatFeed Alpha',
    ARRAY['ddos', 'botnet'],
    now() - interval '3 days',
    now() - interval '1 hour',
    true,
    $json${"include_in_graph":true,"graph_type":"domain","links":[{"to":"45.142.214.48","label":"directs"}]}$json$::jsonb
  ),
  (
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb11',
    '203.0.113.42',
    'ip',
    'Brute Force',
    85,
    'KR',
    37.5665,
    126.9780,
    'ThreatFeed Alpha',
    ARRAY['brute-force', 'authentication'],
    now() - interval '12 hours',
    now() - interval '50 minutes',
    true,
    '{"include_in_graph":false}'::jsonb
  ),
  (
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb12',
    'payroll-secure.example',
    'domain',
    'Credential Theft',
    64,
    'DE',
    52.5200,
    13.4050,
    'Intel Source Beta',
    ARRAY['phishing', 'payroll'],
    now() - interval '9 hours',
    now() - interval '1 hour',
    true,
    '{"include_in_graph":false}'::jsonb
  ),
  (
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb13',
    '198.51.100.23',
    'ip',
    'Scanning',
    42,
    'BR',
    -23.5505,
    -46.6333,
    'Network IDS',
    ARRAY['scan', 'recon'],
    now() - interval '6 hours',
    now() - interval '2 hours',
    true,
    '{"include_in_graph":false}'::jsonb
  ),
  (
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb14',
    '49.36.50.10',
    'ip',
    'Unusual VPN source',
    38,
    'IN',
    19.0760,
    72.8777,
    'VPN Gateway',
    ARRAY['vpn', 'unusual-country'],
    now() - interval '70 minutes',
    now() - interval '70 minutes',
    true,
    '{"include_in_graph":false}'::jsonb
  ),
  (
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb15',
    'old-sinkhole.example',
    'domain',
    'Sinkhole',
    30,
    'US',
    37.7749,
    -122.4194,
    'Intel Source Gamma',
    ARRAY['sinkhole', 'retired'],
    now() - interval '40 days',
    now() - interval '20 days',
    false,
    '{"include_in_graph":false}'::jsonb
  );

INSERT INTO public.kpi_metrics (
  id, metric_name, metric_category, current_value, previous_value, target_value,
  unit, trend, period_start, period_end
)
VALUES
  ('cccccccc-cccc-4ccc-8ccc-ccccccccccc1', 'Total Alerts', 'alerts', 0, 9, 20, 'count', 'up', now() - interval '7 days', now()),
  ('cccccccc-cccc-4ccc-8ccc-ccccccccccc2', 'Critical Alerts', 'alerts', 0, 3, 1, 'count', 'down', now() - interval '7 days', now()),
  ('cccccccc-cccc-4ccc-8ccc-ccccccccccc3', 'Active Threat Indicators', 'threats', 0, 11, 10, 'count', 'up', now() - interval '7 days', now()),
  ('cccccccc-cccc-4ccc-8ccc-ccccccccccc4', 'Open Incidents', 'incidents', 0, 2, 3, 'count', 'stable', now() - interval '7 days', now()),
  ('cccccccc-cccc-4ccc-8ccc-ccccccccccc5', 'Mean Time to Detect', 'response_time', 18.5, 22.0, 15, 'minutes', 'down', now() - interval '7 days', now()),
  ('cccccccc-cccc-4ccc-8ccc-ccccccccccc6', 'Mean Time to Respond', 'response_time', 2.4, 3.1, 2.0, 'hours', 'down', now() - interval '7 days', now()),
  ('cccccccc-cccc-4ccc-8ccc-ccccccccccc7', 'Resolution Rate', 'resolution', 0, 12.5, 80, 'percentage', 'up', now() - interval '7 days', now()),
  ('cccccccc-cccc-4ccc-8ccc-ccccccccccc8', 'False Positive Rate', 'performance', 0, 11.0, 5, 'percentage', 'down', now() - interval '7 days', now());

UPDATE public.kpi_metrics
SET current_value = (SELECT count(*) FROM public.alerts),
    trend = CASE
      WHEN (SELECT count(*) FROM public.alerts) > previous_value THEN 'up'
      WHEN (SELECT count(*) FROM public.alerts) < previous_value THEN 'down'
      ELSE 'stable'
    END
WHERE metric_name = 'Total Alerts';

UPDATE public.kpi_metrics
SET current_value = (
      SELECT count(*) FROM public.alerts
      WHERE severity = 'critical' AND status NOT IN ('resolved', 'false_positive')
    ),
    trend = CASE
      WHEN (
        SELECT count(*) FROM public.alerts
        WHERE severity = 'critical' AND status NOT IN ('resolved', 'false_positive')
      ) > previous_value THEN 'up'
      WHEN (
        SELECT count(*) FROM public.alerts
        WHERE severity = 'critical' AND status NOT IN ('resolved', 'false_positive')
      ) < previous_value THEN 'down'
      ELSE 'stable'
    END
WHERE metric_name = 'Critical Alerts';

UPDATE public.kpi_metrics
SET current_value = (SELECT count(*) FROM public.threat_intelligence WHERE is_active),
    trend = CASE
      WHEN (SELECT count(*) FROM public.threat_intelligence WHERE is_active) > previous_value THEN 'up'
      WHEN (SELECT count(*) FROM public.threat_intelligence WHERE is_active) < previous_value THEN 'down'
      ELSE 'stable'
    END
WHERE metric_name = 'Active Threat Indicators';

UPDATE public.kpi_metrics
SET current_value = (SELECT count(*) FROM public.incidents WHERE status = 'open'),
    trend = CASE
      WHEN (SELECT count(*) FROM public.incidents WHERE status = 'open') > previous_value THEN 'up'
      WHEN (SELECT count(*) FROM public.incidents WHERE status = 'open') < previous_value THEN 'down'
      ELSE 'stable'
    END
WHERE metric_name = 'Open Incidents';

UPDATE public.kpi_metrics
SET current_value = (
      SELECT round(
        100.0 * count(*) FILTER (WHERE status = 'resolved') / NULLIF(count(*), 0),
        1
      )
      FROM public.alerts
    )
WHERE metric_name = 'Resolution Rate';

UPDATE public.kpi_metrics
SET current_value = (
      SELECT round(
        100.0 * count(*) FILTER (WHERE status = 'false_positive') / NULLIF(count(*), 0),
        1
      )
      FROM public.alerts
    )
WHERE metric_name = 'False Positive Rate';

INSERT INTO public.reports (
  id, title, report_type, template_id, content, generated_by, generated_for,
  status, scheduled_for, is_recurring, recurrence_pattern, created_at, updated_at
)
VALUES
  (
    'dddddddd-dddd-4ddd-8ddd-ddddddddddd1',
    'Incident Analysis Report',
    'incident_summary',
    'tier3-incident-analysis',
    $json${"kind":"template","description":"Technical analysis of open and investigating incidents for Tier 3 analysts.","role":"tier3","sections":["Incident Timeline","IOCs","Attack Vectors","Mitigation Steps","Lessons Learned"],"frequency":"Weekly"}$json$::jsonb,
    '00000000-0000-4000-8000-000000000001',
    ARRAY['analyst_tier3'],
    'completed',
    NULL,
    false,
    NULL,
    now() - interval '2 days',
    now() - interval '6 hours'
  ),
  (
    'dddddddd-dddd-4ddd-8ddd-ddddddddddd2',
    'Threat Intelligence Summary',
    'threat_analysis',
    'tier3-threat-intel',
    $json${"kind":"template","description":"Active indicators, origins, and the Ledger Fox correlation for Tier 3 analysts.","role":"tier3","sections":["New Threats","TTPs Analysis","Vulnerability Assessment","Recommendations"],"frequency":"Daily"}$json$::jsonb,
    '00000000-0000-4000-8000-000000000001',
    ARRAY['analyst_tier3'],
    'completed',
    NULL,
    false,
    NULL,
    now() - interval '1 day',
    now() - interval '3 hours'
  ),
  (
    'dddddddd-dddd-4ddd-8ddd-ddddddddddd3',
    'Executive Security Summary',
    'executive_summary',
    'mgmt-executive-summary',
    $json${"kind":"template","description":"Security posture, open risk, and the incidents that need a management decision.","role":"management","sections":["Security Metrics","Risk Assessment","Budget Impact","Strategic Recommendations"],"frequency":"Monthly"}$json$::jsonb,
    '00000000-0000-4000-8000-000000000001',
    ARRAY['management'],
    'completed',
    NULL,
    false,
    NULL,
    now() - interval '10 days',
    now() - interval '1 day'
  ),
  (
    'dddddddd-dddd-4ddd-8ddd-ddddddddddd4',
    'SOC Performance Dashboard',
    'performance_metrics',
    'mgmt-kpi-dashboard',
    $json${"kind":"template","description":"Detection, response, resolution, and false-positive rates for management review.","role":"management","sections":["MTTD/MTTR Trends","Team Performance","False Positive Rates","Escalation Analysis"],"frequency":"Weekly"}$json$::jsonb,
    '00000000-0000-4000-8000-000000000001',
    ARRAY['management'],
    'draft',
    NULL,
    false,
    NULL,
    now() - interval '4 days',
    now() - interval '4 days'
  ),
  (
    'dddddddd-dddd-4ddd-8ddd-ddddddddddd5',
    'Executive Security Summary',
    'executive_summary',
    'mgmt-executive-summary',
    $json${"kind":"schedule","template":"Executive Security Summary","frequency":"Monthly"}$json$::jsonb,
    '00000000-0000-4000-8000-000000000001',
    ARRAY['ciso@soc.local', 'security-leads@soc.local'],
    'completed',
    now() + interval '14 days',
    true,
    'monthly',
    now() - interval '16 days',
    now() - interval '1 day'
  ),
  (
    'dddddddd-dddd-4ddd-8ddd-ddddddddddd6',
    'SOC Performance Dashboard',
    'performance_metrics',
    'mgmt-kpi-dashboard',
    $json${"kind":"schedule","template":"SOC Performance Dashboard","frequency":"Weekly"}$json$::jsonb,
    '00000000-0000-4000-8000-000000000001',
    ARRAY['soc-manager@soc.local'],
    'draft',
    now() + interval '3 days',
    true,
    'weekly',
    now() - interval '4 days',
    now() - interval '4 days'
  );

INSERT INTO public.ai_interactions (
  id, user_id, session_id, message_type, content, context_type, context_id, metadata, created_at
)
VALUES
  (
    'ffffffff-ffff-4fff-8fff-fffffffffff1',
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-0000000000ab',
    'user',
    'Which finance alerts are still open?',
    'general',
    NULL,
    '{"source":"synthetic-history"}'::jsonb,
    now() - interval '2 hours'
  ),
  (
    'ffffffff-ffff-4fff-8fff-fffffffffff2',
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-0000000000ab',
    'assistant',
    'From the alert store: the Ledger Fox beacon on WS-FINANCE-01 and the 2.4 GB transfer from WS-FINANCE-02 are open. The PowerShell alert on WS-FINANCE-03 is still under investigation.',
    'general',
    NULL,
    '{"source":"synthetic-history"}'::jsonb,
    now() - interval '2 hours' + interval '5 seconds'
  ),
  (
    'ffffffff-ffff-4fff-8fff-fffffffffff3',
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-0000000000ab',
    'user',
    'Summarize the phishing alert.',
    'alert',
    '44444444-4444-4444-8444-444444444444',
    '{"source":"synthetic-history"}'::jsonb,
    now() - interval '90 minutes'
  ),
  (
    'ffffffff-ffff-4fff-8fff-fffffffffff4',
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-0000000000ab',
    'assistant',
    'Email Security acknowledged a high phishing alert. billing@pay-ledger.example sent a Ledger Fox invoice with a malicious attachment to MAIL-SERVER-01.',
    'alert',
    '44444444-4444-4444-8444-444444444444',
    '{"source":"synthetic-history"}'::jsonb,
    now() - interval '90 minutes' + interval '5 seconds'
  ),
  (
    'ffffffff-ffff-4fff-8fff-fffffffffff5',
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-0000000000ab',
    'user',
    'What does the PowerShell incident cover?',
    'incident',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
    '{"source":"synthetic-history"}'::jsonb,
    now() - interval '40 minutes'
  ),
  (
    'ffffffff-ffff-4fff-8fff-fffffffffff6',
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-0000000000ab',
    'assistant',
    'The PowerShell incident is a high, investigating case assigned to Alex Rivera. Encoded PowerShell on WS-FINANCE-03 opened one outbound connection. No second host is confirmed.',
    'incident',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
    '{"source":"synthetic-history"}'::jsonb,
    now() - interval '40 minutes' + interval '5 seconds'
  ),
  (
    'ffffffff-ffff-4fff-8fff-fffffffffff7',
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-0000000000ab',
    'user',
    'Which indicator is tied to the Ledger Fox campaign?',
    'threat_hunting',
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2',
    '{"source":"synthetic-history"}'::jsonb,
    now() - interval '15 minutes'
  ),
  (
    'ffffffff-ffff-4fff-8fff-fffffffffff8',
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-0000000000ab',
    'assistant',
    'Ledger Fox is linked to 185.220.101.182, pay-ledger.example, the invoice URL, billing@pay-ledger.example, and the invoice file hash. The DDoS address 45.142.214.48 is a separate indicator.',
    'threat_hunting',
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2',
    '{"source":"synthetic-history"}'::jsonb,
    now() - interval '15 minutes' + interval '5 seconds'
  );
