/**
 * Action Execution Agent
 * Executes automated actions and manages playbook execution
 */

import { SOCState, ExecutionResult, ExecutionMetrics } from '../types';

export class ActionExecutionAgent {
  private executionQueue: Map<string, ExecutionResult> = new Map();

  async executeActions(state: SOCState): Promise<Partial<SOCState>> {
    try {
      console.log('⚡ Action Execution Agent: Starting action execution...');
      
      const startTime = Date.now();
      
      const executionResults: ExecutionResult[] = [];
      
      // Execute playbook actions
      if (state.playbook_suggestions && state.playbook_suggestions.length > 0) {
        const playbookResults = await this.executePlaybookActions(state);
        executionResults.push(...playbookResults);
      }
      
      // Execute automated recommendations
      if (state.recommendations && state.recommendations.length > 0) {
        const recommendationResults = await this.executeRecommendations(state);
        executionResults.push(...recommendationResults);
      }
      
      // Execute alert notifications
      if (state.alert_notifications && state.alert_notifications.length > 0) {
        const notificationResults = await this.executeNotifications(state);
        executionResults.push(...notificationResults);
      }
      
      const duration = Date.now() - startTime;
      console.log(`⚡ Action Execution Agent: Completed in ${duration}ms`);
      
      return {
        execution_results: executionResults,
        current_phase: 'learning',
        phase_durations: {
          ...state.phase_durations,
          action_execution: duration,
        },
        confidence_scores: {
          ...state.confidence_scores,
          action_execution: this.calculateExecutionConfidence(executionResults),
        },
      };
    } catch (error) {
      console.error('❌ Action Execution Agent Error:', error);
      return {
        errors: [...(state.errors || []), `Action Execution Error: ${error}`],
        current_phase: 'error',
      };
    }
  }

  private async executePlaybookActions(state: SOCState): Promise<ExecutionResult[]> {
    const results: ExecutionResult[] = [];
    
    for (const playbook of state.playbook_suggestions || []) {
      console.log(`📋 Executing playbook: ${playbook.name}`);
      
      for (const step of playbook.steps) {
        const executionId = `exec_${Date.now()}_${step.step_id}`;
        const startTime = Date.now();
        
        try {
          // Simulate step execution
          const result = await this.executeStep(step, state);
          
          const executionResult: ExecutionResult = {
            execution_id: executionId,
            action_id: step.step_id,
            status: 'completed',
            started_at: new Date(startTime),
            completed_at: new Date(),
            duration: Date.now() - startTime,
            output: result,
            metrics: {
              success_rate: 1.0,
              execution_time: Date.now() - startTime,
              resource_usage: { cpu: 0.1, memory: 0.05 },
              error_count: 0,
              retry_count: 0,
            },
          };
          
          results.push(executionResult);
          this.executionQueue.set(executionId, executionResult);
          
        } catch (error) {
          const executionResult: ExecutionResult = {
            execution_id: executionId,
            action_id: step.step_id,
            status: 'failed',
            started_at: new Date(startTime),
            completed_at: new Date(),
            duration: Date.now() - startTime,
            output: '',
            error: error instanceof Error ? error.message : 'Unknown error',
            metrics: {
              success_rate: 0.0,
              execution_time: Date.now() - startTime,
              resource_usage: { cpu: 0.0, memory: 0.0 },
              error_count: 1,
              retry_count: 0,
            },
          };
          
          results.push(executionResult);
          this.executionQueue.set(executionId, executionResult);
        }
      }
    }
    
    return results;
  }

  private async executeRecommendations(state: SOCState): Promise<ExecutionResult[]> {
    const results: ExecutionResult[] = [];
    
    for (const recommendation of state.recommendations || []) {
      if (recommendation.type === 'immediate' && recommendation.priority === 'critical') {
        console.log(`🚨 Executing critical recommendation: ${recommendation.description}`);
        
        const executionId = `exec_${Date.now()}_${recommendation.recommendation_id}`;
        const startTime = Date.now();
        
        try {
          // Simulate recommendation execution
          const result = await this.executeRecommendation(recommendation, state);
          
          const executionResult: ExecutionResult = {
            execution_id: executionId,
            action_id: recommendation.recommendation_id,
            status: 'completed',
            started_at: new Date(startTime),
            completed_at: new Date(),
            duration: Date.now() - startTime,
            output: result,
            metrics: {
              success_rate: 1.0,
              execution_time: Date.now() - startTime,
              resource_usage: { cpu: 0.05, memory: 0.02 },
              error_count: 0,
              retry_count: 0,
            },
          };
          
          results.push(executionResult);
          this.executionQueue.set(executionId, executionResult);
          
        } catch (error) {
          const executionResult: ExecutionResult = {
            execution_id: executionId,
            action_id: recommendation.recommendation_id,
            status: 'failed',
            started_at: new Date(startTime),
            completed_at: new Date(),
            duration: Date.now() - startTime,
            output: '',
            error: error instanceof Error ? error.message : 'Unknown error',
            metrics: {
              success_rate: 0.0,
              execution_time: Date.now() - startTime,
              resource_usage: { cpu: 0.0, memory: 0.0 },
              error_count: 1,
              retry_count: 0,
            },
          };
          
          results.push(executionResult);
          this.executionQueue.set(executionId, executionResult);
        }
      }
    }
    
    return results;
  }

  private async executeNotifications(state: SOCState): Promise<ExecutionResult[]> {
    const results: ExecutionResult[] = [];
    
    for (const notification of state.alert_notifications || []) {
      console.log(`📧 Sending notification: ${notification.notification_type}`);
      
      const executionId = `exec_${Date.now()}_${notification.alert_id}`;
      const startTime = Date.now();
      
      try {
        // Simulate notification sending
        const result = await this.sendNotification(notification);
        
        const executionResult: ExecutionResult = {
          execution_id: executionId,
          action_id: notification.alert_id,
          status: 'completed',
          started_at: new Date(startTime),
          completed_at: new Date(),
          duration: Date.now() - startTime,
          output: result,
          metrics: {
            success_rate: 1.0,
            execution_time: Date.now() - startTime,
            resource_usage: { cpu: 0.01, memory: 0.01 },
            error_count: 0,
            retry_count: 0,
          },
        };
        
        results.push(executionResult);
        this.executionQueue.set(executionId, executionResult);
        
      } catch (error) {
        const executionResult: ExecutionResult = {
          execution_id: executionId,
          action_id: notification.alert_id,
          status: 'failed',
          started_at: new Date(startTime),
          completed_at: new Date(),
          duration: Date.now() - startTime,
          output: '',
          error: error instanceof Error ? error.message : 'Unknown error',
          metrics: {
            success_rate: 0.0,
            execution_time: Date.now() - startTime,
            resource_usage: { cpu: 0.0, memory: 0.0 },
            error_count: 1,
            retry_count: 0,
          },
        };
        
        results.push(executionResult);
        this.executionQueue.set(executionId, executionResult);
      }
    }
    
    return results;
  }

  private async executeStep(step: any, state: SOCState): Promise<string> {
    // Simulate step execution based on step type
    switch (step.type) {
      case 'automated':
        return `Automated step executed: ${step.action}`;
      case 'semi_automated':
        return `Semi-automated step executed: ${step.action}`;
      case 'manual':
        return `Manual step queued: ${step.action}`;
      default:
        return `Step executed: ${step.action}`;
    }
  }

  private async executeRecommendation(recommendation: any, state: SOCState): Promise<string> {
    // Simulate recommendation execution
    return `Recommendation executed: ${recommendation.description}`;
  }

  private async sendNotification(notification: any): Promise<string> {
    // Simulate notification sending
    return `Notification sent via ${notification.notification_type} to ${notification.recipients.join(', ')}`;
  }

  private calculateExecutionConfidence(executionResults: ExecutionResult[]): number {
    if (executionResults.length === 0) {
      return 0.0;
    }

    const totalSuccessRate = executionResults.reduce((sum, result) => sum + result.metrics.success_rate, 0);
    return totalSuccessRate / executionResults.length;
  }

  // Helper method to determine if action execution should be performed
  static shouldExecuteActions(state: SOCState): boolean {
    const executionTypes = ['automated_response', 'playbook_execution'];
    return executionTypes.includes(state.request_type) && 
           state.current_phase === 'action_execution' &&
           (state.playbook_suggestions?.length > 0 || 
            state.recommendations?.length > 0 || 
            state.alert_notifications?.length > 0) &&
           !state.execution_results;
  }
}
