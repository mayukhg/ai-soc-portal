// Advanced Threat Intelligence Service
// Inspired by Cisco Foundation AI Cookbook security patterns

export interface ThreatIndicator {
  id: string;
  type: 'ip' | 'domain' | 'hash' | 'email' | 'url' | 'file';
  value: string;
  threat_level: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  source: string;
  first_seen: string;
  last_seen: string;
  tags: string[];
  description: string;
  ioc_type: 'malware' | 'phishing' | 'botnet' | 'c2' | 'exploit' | 'suspicious';
}

export interface ThreatIntelligenceFeed {
  id: string;
  name: string;
  provider: string;
  last_updated: string;
  indicators_count: number;
  threat_level: 'low' | 'medium' | 'high' | 'critical';
  status: 'active' | 'inactive' | 'error';
}

export interface ThreatAnalysis {
  query: string;
  indicators_found: ThreatIndicator[];
  threat_score: number;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  recommendations: string[];
  analysis_timestamp: string;
  confidence: number;
}

class ThreatIntelligenceService {
  private baseUrl: string;
  private apiKey: string;

  constructor() {
    this.baseUrl = process.env.REACT_APP_THREAT_INTEL_API_URL || 'https://api.threatintel.example.com';
    this.apiKey = process.env.REACT_APP_THREAT_INTEL_API_KEY || '';
  }

  /**
   * Analyze text for threat indicators using pattern matching and AI
   */
  async analyzeText(text: string): Promise<ThreatAnalysis> {
    try {
      // In production, this would call your backend API
      // const response = await fetch(`${this.baseUrl}/analyze`, {
      //   method: 'POST',
      //   headers: {
      //     'Content-Type': 'application/json',
      //     'Authorization': `Bearer ${this.apiKey}`
      //   },
      //   body: JSON.stringify({ text })
      // });

      // Mock analysis for demonstration
      const mockAnalysis: ThreatAnalysis = {
        query: text,
        indicators_found: this.extractMockIndicators(text),
        threat_score: this.calculateThreatScore(text),
        risk_level: this.determineRiskLevel(text),
        recommendations: this.generateRecommendations(text),
        analysis_timestamp: new Date().toISOString(),
        confidence: 0.85
      };

      return mockAnalysis;
    } catch (error) {
      console.error('Threat analysis failed:', error);
      throw new Error('Failed to analyze threat indicators');
    }
  }

  /**
   * Extract threat indicators from text using regex patterns
   */
  private extractMockIndicators(text: string): ThreatIndicator[] {
    const indicators: ThreatIndicator[] = [];
    
    // IP Address patterns
    const ipPattern = /\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b/g;
    const ips = text.match(ipPattern);
    if (ips) {
      ips.forEach(ip => {
        indicators.push({
          id: `ip_${Date.now()}_${Math.random()}`,
          type: 'ip',
          value: ip,
          threat_level: this.assessIPThreatLevel(ip),
          confidence: 0.9,
          source: 'Pattern Detection',
          first_seen: new Date().toISOString(),
          last_seen: new Date().toISOString(),
          tags: ['network', 'ip_address'],
          description: `Suspicious IP address detected: ${ip}`,
          ioc_type: 'suspicious'
        });
      });
    }

    // Domain patterns
    const domainPattern = /\b(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}\b/g;
    const domains = text.match(domainPattern);
    if (domains) {
      domains.forEach(domain => {
        if (this.isSuspiciousDomain(domain)) {
          indicators.push({
            id: `domain_${Date.now()}_${Math.random()}`,
            type: 'domain',
            value: domain,
            threat_level: 'high',
            confidence: 0.8,
            source: 'Pattern Detection',
            first_seen: new Date().toISOString(),
            last_seen: new Date().toISOString(),
            tags: ['domain', 'suspicious'],
            description: `Suspicious domain detected: ${domain}`,
            ioc_type: 'phishing'
          });
        }
      });
    }

    // Hash patterns
    const hashPatterns = {
      md5: /\b[a-fA-F0-9]{32}\b/g,
      sha1: /\b[a-fA-F0-9]{40}\b/g,
      sha256: /\b[a-fA-F0-9]{64}\b/g
    };

    Object.entries(hashPatterns).forEach(([type, pattern]) => {
      const hashes = text.match(pattern);
      if (hashes) {
        hashes.forEach(hash => {
          indicators.push({
            id: `${type}_${Date.now()}_${Math.random()}`,
            type: 'hash',
            value: hash,
            threat_level: 'medium',
            confidence: 0.95,
            source: 'Pattern Detection',
            first_seen: new Date().toISOString(),
            last_seen: new Date().toISOString(),
            tags: ['hash', type],
            description: `${type.toUpperCase()} hash detected: ${hash}`,
            ioc_type: 'malware'
          });
        });
      }
    });

    return indicators;
  }

  /**
   * Calculate threat score based on indicators found
   */
  private calculateThreatScore(text: string): number {
    let score = 0;
    
    // Base score for suspicious keywords
    const suspiciousKeywords = [
      'malware', 'virus', 'trojan', 'ransomware', 'backdoor',
      'exploit', 'payload', 'shellcode', 'keylogger', 'spyware',
      'phishing', 'spear phishing', 'social engineering',
      'lateral movement', 'exfiltration', 'data breach',
      'command and control', 'c2', 'beacon', 'persistence'
    ];

    suspiciousKeywords.forEach(keyword => {
      const regex = new RegExp(keyword, 'gi');
      const matches = text.match(regex);
      if (matches) {
        score += matches.length * 10;
      }
    });

    // Add score for indicators found
    const indicators = this.extractMockIndicators(text);
    indicators.forEach(indicator => {
      switch (indicator.threat_level) {
        case 'critical': score += 50; break;
        case 'high': score += 30; break;
        case 'medium': score += 15; break;
        case 'low': score += 5; break;
      }
    });

    return Math.min(score, 100);
  }

  /**
   * Determine risk level based on threat score
   */
  private determineRiskLevel(text: string): 'low' | 'medium' | 'high' | 'critical' {
    const score = this.calculateThreatScore(text);
    
    if (score >= 80) return 'critical';
    if (score >= 60) return 'high';
    if (score >= 30) return 'medium';
    return 'low';
  }

  /**
   * Generate security recommendations based on analysis
   */
  private generateRecommendations(text: string): string[] {
    const recommendations: string[] = [];
    const indicators = this.extractMockIndicators(text);
    
    if (indicators.some(i => i.type === 'ip')) {
      recommendations.push('Block suspicious IP addresses in firewall rules');
      recommendations.push('Monitor network traffic to/from these IPs');
    }
    
    if (indicators.some(i => i.type === 'domain')) {
      recommendations.push('Add suspicious domains to DNS blacklist');
      recommendations.push('Implement web filtering for these domains');
    }
    
    if (indicators.some(i => i.type === 'hash')) {
      recommendations.push('Scan systems for files with these hashes');
      recommendations.push('Update antivirus signatures');
    }
    
    if (text.toLowerCase().includes('malware') || text.toLowerCase().includes('virus')) {
      recommendations.push('Run full system antivirus scan');
      recommendations.push('Check for persistence mechanisms');
    }
    
    if (text.toLowerCase().includes('phishing') || text.toLowerCase().includes('social engineering')) {
      recommendations.push('Conduct security awareness training');
      recommendations.push('Implement email security controls');
    }
    
    return recommendations.slice(0, 5); // Limit to top 5 recommendations
  }

  /**
   * Assess threat level of an IP address
   */
  private assessIPThreatLevel(ip: string): 'low' | 'medium' | 'high' | 'critical' {
    // Mock implementation - in production, this would check against threat intelligence feeds
    const suspiciousIPs = [
      '192.168.1.100',
      '10.0.0.50',
      '172.16.0.25'
    ];
    
    if (suspiciousIPs.includes(ip)) {
      return 'high';
    }
    
    // Check for private IP ranges
    const privateRanges = [
      /^192\.168\./,
      /^10\./,
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./
    ];
    
    if (privateRanges.some(range => range.test(ip))) {
      return 'medium';
    }
    
    return 'low';
  }

  /**
   * Check if a domain is suspicious
   */
  private isSuspiciousDomain(domain: string): boolean {
    const suspiciousPatterns = [
      /bit\.ly/i,
      /tinyurl/i,
      /goo\.gl/i,
      /t\.co/i,
      /suspicious/i,
      /malware/i,
      /phishing/i
    ];
    
    return suspiciousPatterns.some(pattern => pattern.test(domain));
  }

  /**
   * Get threat intelligence feeds status
   */
  async getFeedsStatus(): Promise<ThreatIntelligenceFeed[]> {
    // Mock data for demonstration
    return [
      {
        id: 'feed_1',
        name: 'Cisco Talos Intelligence',
        provider: 'Cisco',
        last_updated: new Date(Date.now() - 300000).toISOString(),
        indicators_count: 1250000,
        threat_level: 'high',
        status: 'active'
      },
      {
        id: 'feed_2',
        name: 'Open Threat Exchange',
        provider: 'AlienVault',
        last_updated: new Date(Date.now() - 600000).toISOString(),
        indicators_count: 890000,
        threat_level: 'medium',
        status: 'active'
      },
      {
        id: 'feed_3',
        name: 'MISP Threat Sharing',
        provider: 'MISP',
        last_updated: new Date(Date.now() - 900000).toISOString(),
        indicators_count: 450000,
        threat_level: 'high',
        status: 'active'
      }
    ];
  }
}

export const threatIntelligenceService = new ThreatIntelligenceService();
