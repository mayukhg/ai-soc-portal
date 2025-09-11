/**
 * LangGraph Workflow Test
 * Simple test to verify the LangGraph implementation works correctly
 */

import { SOCWorkflow } from './soc-workflow';
import { SOCState } from './types';

// Mock data for testing
const mockAlerts = [
  {
    id: 'alert_1',
    timestamp: new Date(),
    severity: 'high' as const,
    source: 'SIEM',
    type: 'malware',
    description: 'Suspicious PowerShell activity detected',
    status: 'new' as const,
    tags: ['malware', 'powershell'],
    metadata: { source_ip: '192.168.1.100', destination_ip: '10.0.0.1' }
  },
  {
    id: 'alert_2',
    timestamp: new Date(),
    severity: 'medium' as const,
    source: 'EDR',
    type: 'lateral_movement',
    description: 'Unusual network connections detected',
    status: 'new' as const,
    tags: ['lateral_movement', 'network'],
    metadata: { source_ip: '192.168.1.100', destination_ip: '192.168.1.200' }
  }
];

const mockThreatIntelligence = [
  {
    id: 'ti_1',
    indicator: '192.168.1.100',
    type: 'ip' as const,
    threat_level: 'high' as const,
    confidence: 0.85,
    source: 'ThreatFeed',
    first_seen: new Date(),
    last_seen: new Date(),
    tags: ['malware', 'c2'],
    description: 'Known malware C2 server'
  }
];

const mockEntities = [
  {
    id: 'entity_1',
    type: 'host' as const,
    name: 'WORKSTATION-01',
    attributes: { os: 'Windows 10', ip: '192.168.1.100' },
    risk_score: 75,
    last_seen: new Date(),
    tags: ['workstation', 'high_risk']
  }
];

const mockIncidents = [
  {
    id: 'incident_1',
    title: 'Malware Infection Detected',
    description: 'Suspicious PowerShell activity and network connections',
    severity: 'high' as const,
    status: 'open' as const,
    created_at: new Date(),
    updated_at: new Date(),
    assigned_to: 'analyst_1',
    tags: ['malware', 'investigation'],
    related_alerts: ['alert_1', 'alert_2'],
    timeline: []
  }
];

export async function testLangGraphWorkflow() {
  console.log('🧪 Starting LangGraph Workflow Test...');
  
  try {
    // Create workflow instance
    const workflow = new SOCWorkflow();
    
    // Create initial state
    const initialState: SOCState = {
      // Input data
      alerts: mockAlerts,
      threat_intelligence: mockThreatIntelligence,
      entities: mockEntities,
      incidents: mockIncidents,
      
      // Workflow control
      current_phase: 'context_analysis',
      request_type: 'threat_analysis',
      user_id: 'test_user',
      session_id: `test_session_${Date.now()}`,
      
      // Initialize other required fields
      context_analysis: {},
      phase_durations: {},
      confidence_scores: {},
      reasoning_chains: {},
      validation_results: {},
      errors: [],
      warnings: [],
      human_input_required: false,
      start_time: new Date(),
    };

    console.log('📊 Initial State:', {
      alerts: initialState.alerts.length,
      threat_intelligence: initialState.threat_intelligence.length,
      entities: initialState.entities.length,
      incidents: initialState.incidents.length,
      request_type: initialState.request_type,
    });

    // Execute workflow
    console.log('🚀 Executing workflow...');
    const result = await workflow.executeWorkflow(initialState);
    
    console.log('✅ Workflow completed!');
    console.log('📈 Results:', {
      current_phase: result.current_phase,
      total_duration: result.total_duration,
      errors: result.errors?.length || 0,
      warnings: result.warnings?.length || 0,
      confidence_scores: result.confidence_scores,
    });

    // Display analysis results
    if (result.threat_analysis) {
      console.log('🔍 Threat Analysis:', {
        threats_identified: result.threat_analysis.threats_identified.length,
        threat_level: result.threat_analysis.threat_level,
        confidence: result.threat_analysis.confidence,
      });
    }

    if (result.risk_assessment) {
      console.log('📊 Risk Assessment:', {
        overall_risk_score: result.risk_assessment.overall_risk_score,
        risk_factors: result.risk_assessment.risk_factors.length,
        confidence: result.risk_assessment.confidence,
      });
    }

    if (result.recommendations) {
      console.log('💡 Recommendations:', result.recommendations.length);
      result.recommendations.forEach((rec, index) => {
        console.log(`  ${index + 1}. ${rec.description} (${rec.priority})`);
      });
    }

    if (result.playbook_suggestions) {
      console.log('📋 Playbook Suggestions:', result.playbook_suggestions.length);
      result.playbook_suggestions.forEach((playbook, index) => {
        console.log(`  ${index + 1}. ${playbook.name} (${playbook.confidence})`);
      });
    }

    // Display execution metrics
    if (result.phase_durations) {
      console.log('⏱️ Phase Durations:', result.phase_durations);
    }

    console.log('🎉 Test completed successfully!');
    return result;

  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  }
}

// Export for use in other modules
export { mockAlerts, mockThreatIntelligence, mockEntities, mockIncidents };
