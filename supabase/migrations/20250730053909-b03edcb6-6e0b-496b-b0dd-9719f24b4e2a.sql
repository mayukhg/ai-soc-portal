-- Insert sample data for the SOC Dashboard

-- Insert sample threat intelligence data
INSERT INTO public.threat_intelligence (indicator_value, indicator_type, threat_type, confidence_score, country_code, latitude, longitude, source, tags) VALUES
('185.220.101.182', 'ip', 'Malware C2', 95, 'RU', 55.7558, 37.6176, 'ThreatFeed Alpha', ARRAY['botnet', 'c2', 'malware']),
('malicious-domain.com', 'domain', 'Phishing', 87, 'CN', 39.9042, 116.4074, 'Intel Source Beta', ARRAY['phishing', 'credential-theft']),
('45.142.214.48', 'ip', 'DDoS Attack', 92, 'NL', 52.3676, 4.9041, 'ThreatFeed Alpha', ARRAY['ddos', 'botnet']),
('suspicious-site.net', 'domain', 'Malware Distribution', 78, 'US', 37.7749, -122.4194, 'Intel Source Gamma', ARRAY['malware', 'exploit-kit']),
('203.0.113.42', 'ip', 'Brute Force', 85, 'KR', 37.5665, 126.9780, 'ThreatFeed Alpha', ARRAY['brute-force', 'ssh-attack']);

-- Insert sample alerts
INSERT INTO public.alerts (title, description, severity, status, source, alert_type, source_ip, affected_systems, indicators) VALUES
('Suspicious Network Traffic Detected', 'Multiple connections to known malicious IP addresses detected from internal network', 'high', 'investigating', 'Network IDS', 'Network Anomaly', '192.168.1.100', ARRAY['WS-FINANCE-01', 'WS-FINANCE-02'], ARRAY['185.220.101.182', 'multiple-connections']),
('Malware Detection on Endpoint', 'Trojan.Win32.Agent detected and quarantined on user workstation', 'critical', 'resolved', 'EDR System', 'Malware Detection', null, ARRAY['WS-USER-045'], ARRAY['trojan-signature', 'file-hash-match']),
('Failed Login Attempts', 'Multiple failed login attempts detected for administrator account', 'medium', 'acknowledged', 'Domain Controller', 'Authentication Anomaly', '203.0.113.42', ARRAY['DC-PRIMARY'], ARRAY['brute-force-pattern', 'admin-account']),
('Phishing Email Campaign', 'Suspicious email with malicious attachments detected', 'high', 'open', 'Email Security', 'Phishing', null, ARRAY['MAIL-SERVER-01'], ARRAY['malicious-attachment', 'suspicious-sender']),
('DDoS Attack Detected', 'Volumetric DDoS attack targeting web services', 'critical', 'investigating', 'WAF', 'DDoS', '45.142.214.48', ARRAY['WEB-CLUSTER'], ARRAY['high-traffic-volume', 'multiple-sources']);

-- Insert sample KPI metrics
INSERT INTO public.kpi_metrics (metric_name, metric_category, current_value, previous_value, target_value, unit, trend, period_start, period_end) VALUES
('Total Alerts', 'alerts', 127, 98, 100, 'count', 'up', NOW() - INTERVAL '24 hours', NOW()),
('Critical Alerts', 'alerts', 8, 12, 10, 'count', 'down', NOW() - INTERVAL '24 hours', NOW()),
('Mean Time to Detection', 'response_time', 4.2, 5.1, 4.0, 'minutes', 'down', NOW() - INTERVAL '24 hours', NOW()),
('Mean Time to Response', 'response_time', 12.5, 15.2, 10.0, 'minutes', 'down', NOW() - INTERVAL '24 hours', NOW()),
('Incident Resolution Rate', 'resolution', 94.5, 91.2, 95.0, 'percentage', 'up', NOW() - INTERVAL '24 hours', NOW()),
('False Positive Rate', 'performance', 3.2, 4.1, 3.0, 'percentage', 'down', NOW() - INTERVAL '24 hours', NOW()),
('Threat Intelligence Feeds', 'threats', 15, 14, 12, 'count', 'up', NOW() - INTERVAL '24 hours', NOW()),
('Active Threat Indicators', 'threats', 2847, 2651, 2500, 'count', 'up', NOW() - INTERVAL '24 hours', NOW());