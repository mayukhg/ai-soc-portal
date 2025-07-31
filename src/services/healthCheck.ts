import { supabase } from '@/integrations/supabase/client';

/**
 * Health status enumeration for service monitoring
 */
export enum HealthStatus {
  HEALTHY = 'healthy',
  DEGRADED = 'degraded',
  DOWN = 'down'
}

/**
 * Service status enumeration for status page display
 */
export enum ServiceStatus {
  OPERATIONAL = 'operational',
  DEGRADED = 'degraded',
  DOWN = 'down'
}

/**
 * Interface for health check results
 */
export interface HealthCheckResult {
  service: string;
  status: HealthStatus;
  responseTime: number;
  lastChecked: Date;
  details?: Record<string, any>;
}

/**
 * Interface for service status display
 */
export interface ServiceStatusDisplay {
  name: string;
  status: ServiceStatus;
  responseTime: number;
  uptime: number;
  lastIncident?: Date;
}

/**
 * Interface for downtime alert details
 */
export interface DowntimeDetails {
  service: string;
  duration: string;
  impact: string;
  timestamp: Date;
}

/**
 * Interface for recovery alert details
 */
export interface RecoveryDetails {
  service: string;
  downtimeDuration: string;
  recoveryTime: Date;
}

/**
 * Configuration interface for health check service
 */
export interface HealthCheckConfig {
  checkIntervalMs: number;
  timeoutMs: number;
  retryAttempts: number;
  teamsWebhookUrl?: string;
}

/**
 * Health Check Service
 * 
 * Monitors critical services and provides health status information.
 * Implements singleton pattern for consistent monitoring across the application.
 * 
 * @example
 * ```typescript
 * const healthService = HealthCheckService.getInstance();
 * await healthService.checkAllServices();
 * ```
 */
export class HealthCheckService {
  private static instance: HealthCheckService;
  private checkInterval: NodeJS.Timeout | null = null;
  private config: HealthCheckConfig;
  private isMonitoring: boolean = false;

  /**
   * Private constructor to enforce singleton pattern
   */
  private constructor() {
    this.config = {
      checkIntervalMs: 30000, // 30 seconds
      timeoutMs: 10000, // 10 seconds
      retryAttempts: 3
    };
  }

  /**
   * Get singleton instance of HealthCheckService
   * 
   * @returns HealthCheckService instance
   */
  static getInstance(): HealthCheckService {
    if (!HealthCheckService.instance) {
      HealthCheckService.instance = new HealthCheckService();
    }
    return HealthCheckService.instance;
  }

  /**
   * Check frontend application health
   * 
   * Performs a health check on the React application by making a request
   * to the health endpoint and measuring response time.
   * 
   * @returns Promise<HealthCheckResult> Health check result for frontend
   */
  async checkFrontendHealth(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      // Create abort controller for timeout handling
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.timeoutMs);

      // Check if React app is responsive
      const response = await fetch('/api/health', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      const responseTime = Date.now() - startTime;
      
      if (response.ok) {
        return {
          service: 'frontend',
          status: HealthStatus.HEALTHY,
          responseTime,
          lastChecked: new Date(),
        };
      } else {
        return {
          service: 'frontend',
          status: HealthStatus.DEGRADED,
          responseTime,
          lastChecked: new Date(),
          details: { 
            statusCode: response.status,
            statusText: response.statusText 
          },
        };
      }
    } catch (error) {
      const responseTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      return {
        service: 'frontend',
        status: HealthStatus.DOWN,
        responseTime,
        lastChecked: new Date(),
        details: { 
          error: errorMessage,
          type: error instanceof Error ? error.constructor.name : 'Unknown'
        },
      };
    }
  }

  /**
   * Check database health
   * 
   * Performs a health check on the Supabase database by executing
   * a simple query and measuring response time.
   * 
   * @returns Promise<HealthCheckResult> Health check result for database
   */
  async checkDatabaseHealth(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      // Test database connection with timeout
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Database connection timeout')), this.config.timeoutMs);
      });

      const dbCheckPromise = supabase
        .from('profiles')
        .select('count')
        .limit(1);

      const { data, error } = await Promise.race([dbCheckPromise, timeoutPromise]);
      const responseTime = Date.now() - startTime;
      
      if (error) {
        console.error('Database health check failed:', error);
        return {
          service: 'database',
          status: HealthStatus.DOWN,
          responseTime,
          lastChecked: new Date(),
          details: { 
            error: error.message,
            code: error.code,
            details: error.details
          },
        };
      }

      return {
        service: 'database',
        status: HealthStatus.HEALTHY,
        responseTime,
        lastChecked: new Date(),
        details: {
          connection: 'active',
          recordCount: data?.length || 0
        }
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown database error';
      
      console.error('Database health check exception:', error);
      return {
        service: 'database',
        status: HealthStatus.DOWN,
        responseTime,
        lastChecked: new Date(),
        details: { 
          error: errorMessage,
          type: error instanceof Error ? error.constructor.name : 'Unknown'
        },
      };
    }
  }

  // Check authentication health
  async checkAuthHealth(): Promise<HealthStatus> {
    const startTime = Date.now();
    
    try {
      // Test authentication service
      const { data: { session }, error } = await supabase.auth.getSession();
      
      const responseTime = Date.now() - startTime;
      
      if (error) {
        return {
          service: 'authentication',
          status: 'degraded',
          responseTime,
          lastChecked: new Date(),
          details: { error: error.message },
        };
      }

      return {
        service: 'authentication',
        status: 'healthy',
        responseTime,
        lastChecked: new Date(),
      };
    } catch (error) {
      return {
        service: 'authentication',
        status: 'down',
        responseTime: Date.now() - startTime,
        lastChecked: new Date(),
        details: { error: error.message },
      };
    }
  }

  // Check AI services health
  async checkAIHealth(): Promise<HealthStatus> {
    const startTime = Date.now();
    
    try {
      // Test OpenAI API (if configured)
      const openaiApiKey = process.env.OPENAI_API_KEY;
      if (!openaiApiKey) {
        return {
          service: 'ai',
          status: 'degraded',
          responseTime: Date.now() - startTime,
          lastChecked: new Date(),
          details: { error: 'OpenAI API key not configured' },
        };
      }

      // Simple test call to OpenAI
      const response = await fetch('https://api.openai.com/v1/models', {
        headers: {
          'Authorization': `Bearer ${openaiApiKey}`,
        },
      });

      const responseTime = Date.now() - startTime;
      
      if (response.ok) {
        return {
          service: 'ai',
          status: 'healthy',
          responseTime,
          lastChecked: new Date(),
        };
      } else {
        return {
          service: 'ai',
          status: 'degraded',
          responseTime,
          lastChecked: new Date(),
          details: { statusCode: response.status },
        };
      }
    } catch (error) {
      return {
        service: 'ai',
        status: 'down',
        responseTime: Date.now() - startTime,
        lastChecked: new Date(),
        details: { error: error.message },
      };
    }
  }

  // Check all services health
  async checkAllServices(): Promise<HealthStatus[]> {
    const checks = [
      this.checkFrontendHealth(),
      this.checkDatabaseHealth(),
      this.checkAuthHealth(),
      this.checkAIHealth(),
    ];

    return Promise.all(checks);
  }

  // Get overall system status
  async getOverallStatus(): Promise<'operational' | 'degraded' | 'down'> {
    const services = await this.checkAllServices();
    
    const downServices = services.filter(s => s.status === 'down');
    const degradedServices = services.filter(s => s.status === 'degraded');
    
    if (downServices.length > 0) {
      return 'down';
    } else if (degradedServices.length > 0) {
      return 'degraded';
    } else {
      return 'operational';
    }
  }

  // Start continuous monitoring
  startMonitoring(intervalMs: number = 30000): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }

    this.checkInterval = setInterval(async () => {
      try {
        const services = await this.checkAllServices();
        const overallStatus = await this.getOverallStatus();
        
        // Log health status
        console.log('Health Check:', {
          timestamp: new Date().toISOString(),
          overallStatus,
          services: services.map(s => ({
            service: s.service,
            status: s.status,
            responseTime: s.responseTime,
          })),
        });

        // Check for any down services and trigger alerts
        const downServices = services.filter(s => s.status === 'down');
        if (downServices.length > 0) {
          await this.triggerDowntimeAlert(downServices);
        }
      } catch (error) {
        console.error('Health check monitoring error:', error);
      }
    }, intervalMs);
  }

  // Stop continuous monitoring
  stopMonitoring(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  // Trigger downtime alert
  private async triggerDowntimeAlert(downServices: HealthStatus[]): Promise<void> {
    try {
      // Import Teams notification service
      const { TeamsNotificationService } = await import('./teamsNotification');
      const teamsService = new TeamsNotificationService(process.env.TEAMS_WEBHOOK_URL || '');
      
      for (const service of downServices) {
        await teamsService.sendDowntimeAlert(service.service, {
          service: service.service,
          duration: 'Just detected',
          impact: 'Service unavailable',
          timestamp: service.lastChecked,
        });
      }
    } catch (error) {
      console.error('Failed to send downtime alert:', error);
    }
  }

  // Get service status for status page
  async getServiceStatus(): Promise<ServiceStatus[]> {
    const services = await this.checkAllServices();
    
    return services.map(service => ({
      name: service.service,
      status: service.status === 'healthy' ? 'operational' : 
              service.status === 'degraded' ? 'degraded' : 'down',
      responseTime: service.responseTime,
      uptime: 99.9, // This would be calculated from historical data
      lastIncident: service.status === 'down' ? service.lastChecked : undefined,
    }));
  }
}

// Export singleton instance
export const healthCheckService = HealthCheckService.getInstance(); 