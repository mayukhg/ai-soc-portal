import { DowntimeDetails, RecoveryDetails } from './healthCheck';

/**
 * Teams message card interface for Microsoft Teams webhook
 */
export interface TeamsMessageCard {
  "@type": "MessageCard";
  "@context": "http://schema.org/extensions";
  themeColor: string;
  summary: string;
  sections: TeamsMessageSection[];
  potentialAction?: TeamsPotentialAction[];
}

/**
 * Teams message section interface
 */
export interface TeamsMessageSection {
  activityTitle: string;
  activitySubtitle: string;
  facts: TeamsMessageFact[];
}

/**
 * Teams message fact interface
 */
export interface TeamsMessageFact {
  name: string;
  value: string;
}

/**
 * Teams potential action interface
 */
export interface TeamsPotentialAction {
  "@type": "OpenUri";
  name: string;
  targets: TeamsActionTarget[];
}

/**
 * Teams action target interface
 */
export interface TeamsActionTarget {
  os: "default";
  uri: string;
}

/**
 * Teams Notification Service
 * 
 * Handles sending rich notifications to Microsoft Teams channels
 * through webhook integration. Supports various alert types including
 * downtime, recovery, maintenance, and escalation alerts.
 * 
 * @example
 * ```typescript
 * const teamsService = new TeamsNotificationService(webhookUrl);
 * await teamsService.sendDowntimeAlert('database', downtimeDetails);
 * ```
 */
export class TeamsNotificationService {
  private webhookUrl: string;
  private retryAttempts: number = 3;
  private retryDelayMs: number = 1000;

  /**
   * Constructor for TeamsNotificationService
   * 
   * @param webhookUrl - Microsoft Teams webhook URL
   */
  constructor(webhookUrl: string) {
    this.webhookUrl = webhookUrl;
  }

  /**
   * Send downtime alert to Microsoft Teams
   * 
   * Sends a rich notification card to Teams when a service goes down.
   * Includes retry logic and comprehensive error handling.
   * 
   * @param service - Name of the service that is down
   * @param details - Downtime details including duration and impact
   * @returns Promise<void>
   * @throws Error if notification fails after retry attempts
   */
  async sendDowntimeAlert(service: string, details: DowntimeDetails): Promise<void> {
    if (!this.webhookUrl) {
      console.warn('Teams webhook URL not configured');
      return;
    }

    const message: TeamsMessageCard = {
      "@type": "MessageCard",
      "@context": "http://schema.org/extensions",
      themeColor: "FF0000",
      summary: `🚨 ${service} Service Down`,
      sections: [
        {
          activityTitle: `🚨 Critical Service Alert: ${service}`,
          activitySubtitle: new Date().toISOString(),
          facts: [
            {
              name: "Service",
              value: service
            },
            {
              name: "Status",
              value: "DOWN"
            },
            {
              name: "Duration",
              value: details.duration
            },
            {
              name: "Impact",
              value: details.impact
            },
            {
              name: "Time",
              value: details.timestamp.toISOString()
            }
          ]
        }
      ],
      potentialAction: [
        {
          "@type": "OpenUri",
          name: "View Dashboard",
          targets: [
            {
              os: "default",
              uri: "https://dashboard.soc-nexus.com"
            }
          ]
        },
        {
          "@type": "OpenUri",
          name: "Check Status Page",
          targets: [
            {
              os: "default",
              uri: "https://status.soc-nexus.com"
            }
          ]
        },
        {
          "@type": "OpenUri",
          name: "View Logs",
          targets: [
            {
              os: "default",
              uri: "https://console.aws.amazon.com/cloudwatch/home"
            }
          ]
        }
      ]
    };

    await this.sendMessageWithRetry(message, `downtime alert for ${service}`);
  }

  /**
   * Send message to Teams with retry logic
   * 
   * @param message - Teams message card to send
   * @param description - Description for logging purposes
   * @returns Promise<void>
   * @throws Error if all retry attempts fail
   */
  private async sendMessageWithRetry(message: TeamsMessageCard, description: string): Promise<void> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      try {
        const response = await fetch(this.webhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(message),
          signal: AbortSignal.timeout(10000) // 10 second timeout
        });

        if (!response.ok) {
          throw new Error(`Teams notification failed: ${response.status} ${response.statusText}`);
        }

        console.log(`Teams ${description} sent successfully on attempt ${attempt}`);
        return;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        console.warn(`Teams notification attempt ${attempt} failed:`, lastError.message);

        if (attempt < this.retryAttempts) {
          // Exponential backoff
          const delay = this.retryDelayMs * Math.pow(2, attempt - 1);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    console.error(`Teams ${description} failed after ${this.retryAttempts} attempts:`, lastError);
    throw lastError || new Error('Teams notification failed');
  }

  async sendRecoveryAlert(service: string, details: RecoveryDetails): Promise<void> {
    if (!this.webhookUrl) {
      console.warn('Teams webhook URL not configured');
      return;
    }

    const message = {
      "@type": "MessageCard",
      "@context": "http://schema.org/extensions",
      "themeColor": "00FF00",
      "summary": `✅ ${service} Service Recovered`,
      "sections": [
        {
          "activityTitle": `✅ Service Recovered: ${service}`,
          "activitySubtitle": new Date().toISOString(),
          "facts": [
            {
              "name": "Service",
              "value": service
            },
            {
              "name": "Status",
              "value": "HEALTHY"
            },
            {
              "name": "Downtime Duration",
              "value": details.downtimeDuration
            },
            {
              "name": "Recovery Time",
              "value": details.recoveryTime.toISOString()
            }
          ]
        }
      ],
      "potentialAction": [
        {
          "@type": "OpenUri",
          "name": "View Dashboard",
          "targets": [
            {
              "os": "default",
              "uri": "https://dashboard.soc-nexus.com"
            }
          ]
        },
        {
          "@type": "OpenUri",
          "name": "Check Status Page",
          "targets": [
            {
              "os": "default",
              "uri": "https://status.soc-nexus.com"
            }
          ]
        }
      ]
    };

    try {
      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(message),
      });

      if (!response.ok) {
        throw new Error(`Teams notification failed: ${response.status} ${response.statusText}`);
      }

      console.log(`Teams recovery alert sent for ${service}`);
    } catch (error) {
      console.error('Failed to send Teams recovery alert:', error);
      throw error;
    }
  }

  async sendMaintenanceAlert(service: string, details: MaintenanceDetails): Promise<void> {
    if (!this.webhookUrl) {
      console.warn('Teams webhook URL not configured');
      return;
    }

    const message = {
      "@type": "MessageCard",
      "@context": "http://schema.org/extensions",
      "themeColor": "FFA500",
      "summary": `🔧 ${service} Maintenance Scheduled`,
      "sections": [
        {
          "activityTitle": `🔧 Maintenance Alert: ${service}`,
          "activitySubtitle": new Date().toISOString(),
          "facts": [
            {
              "name": "Service",
              "value": service
            },
            {
              "name": "Type",
              "value": details.type
            },
            {
              "name": "Scheduled Time",
              "value": details.scheduledTime
            },
            {
              "name": "Expected Duration",
              "value": details.expectedDuration
            },
            {
              "name": "Impact",
              "value": details.impact
            }
          ]
        }
      ],
      "potentialAction": [
        {
          "@type": "OpenUri",
          "name": "View Status Page",
          "targets": [
            {
              "os": "default",
              "uri": "https://status.soc-nexus.com"
            }
          ]
        }
      ]
    };

    try {
      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(message),
      });

      if (!response.ok) {
        throw new Error(`Teams notification failed: ${response.status} ${response.statusText}`);
      }

      console.log(`Teams maintenance alert sent for ${service}`);
    } catch (error) {
      console.error('Failed to send Teams maintenance alert:', error);
      throw error;
    }
  }

  async sendEscalationAlert(service: string, details: EscalationDetails): Promise<void> {
    if (!this.webhookUrl) {
      console.warn('Teams webhook URL not configured');
      return;
    }

    const message = {
      "@type": "MessageCard",
      "@context": "http://schema.org/extensions",
      "themeColor": "FF0000",
      "summary": `🚨 ESCALATION: ${service} Still Down`,
      "sections": [
        {
          "activityTitle": `🚨 ESCALATION ALERT: ${service}`,
          "activitySubtitle": new Date().toISOString(),
          "facts": [
            {
              "name": "Service",
              "value": service
            },
            {
              "name": "Downtime Duration",
              "value": details.downtimeDuration
            },
            {
              "name": "Escalation Level",
              "value": details.escalationLevel
            },
            {
              "name": "Assigned To",
              "value": details.assignedTo
            },
            {
              "name": "Priority",
              "value": details.priority
            }
          ]
        }
      ],
      "potentialAction": [
        {
          "@type": "OpenUri",
          "name": "View Incident",
          "targets": [
            {
              "os": "default",
              "uri": "https://dashboard.soc-nexus.com/incidents"
            }
          ]
        },
        {
          "@type": "OpenUri",
          "name": "Contact On-Call",
          "targets": [
            {
              "os": "default",
              "uri": "https://teams.microsoft.com/l/chat/0/0?users=oncall@soc-nexus.com"
            }
          ]
        }
      ]
    };

    try {
      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(message),
      });

      if (!response.ok) {
        throw new Error(`Teams notification failed: ${response.status} ${response.statusText}`);
      }

      console.log(`Teams escalation alert sent for ${service}`);
    } catch (error) {
      console.error('Failed to send Teams escalation alert:', error);
      throw error;
    }
  }
}

export interface MaintenanceDetails {
  service: string;
  type: string;
  scheduledTime: string;
  expectedDuration: string;
  impact: string;
}

export interface EscalationDetails {
  service: string;
  downtimeDuration: string;
  escalationLevel: string;
  assignedTo: string;
  priority: string;
}

// Export singleton instance
export const teamsNotificationService = new TeamsNotificationService(
  process.env.TEAMS_WEBHOOK_URL || ''
); 