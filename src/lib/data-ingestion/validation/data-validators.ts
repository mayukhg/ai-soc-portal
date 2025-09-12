/**
 * Data Validators
 * Comprehensive validation pipeline for security data from multiple sources
 */

import { Logger } from '../utils/logger';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  validatedData: any[];
  rejectedCount: number;
  acceptedCount: number;
}

export interface ValidationRule {
  name: string;
  description: string;
  validate: (data: any, source: string) => ValidationResult;
  severity: 'error' | 'warning';
}

export interface DataSchema {
  requiredFields: string[];
  optionalFields: string[];
  fieldTypes: Record<string, string>;
  fieldConstraints: Record<string, any>;
  customValidators: ValidationRule[];
}

export class DataValidators {
  private logger: Logger;
  private schemas: Map<string, DataSchema>;

  constructor() {
    this.logger = new Logger('DataValidators');
    this.schemas = new Map();
    this.initializeSchemas();
  }

  private initializeSchemas(): void {
    // SIEM Schema
    this.schemas.set('siem', {
      requiredFields: ['id', 'timestamp', 'source', 'severity', 'description'],
      optionalFields: ['title', 'category', 'hostname', 'username', 'process_name', 'file_path', 'network_connections'],
      fieldTypes: {
        id: 'string',
        timestamp: 'date',
        source: 'string',
        severity: 'string',
        description: 'string',
        title: 'string',
        category: 'string',
        hostname: 'string',
        username: 'string',
        process_name: 'string',
        file_path: 'string',
        network_connections: 'array',
      },
      fieldConstraints: {
        severity: ['low', 'medium', 'high', 'critical'],
        source: ['splunk', 'qradar', 'elastic', 'arcsight'],
        timestamp: { min: new Date('2020-01-01'), max: new Date() },
      },
      customValidators: [
        this.createTimestampValidator(),
        this.createSeverityValidator(),
        this.createSourceValidator(),
        this.createDescriptionValidator(),
      ],
    });

    // SOAR Schema
    this.schemas.set('soar', {
      requiredFields: ['id', 'title', 'description', 'severity', 'status', 'created_at'],
      optionalFields: ['updated_at', 'assigned_to', 'tags', 'playbooks', 'resolution_notes'],
      fieldTypes: {
        id: 'string',
        title: 'string',
        description: 'string',
        severity: 'string',
        status: 'string',
        created_at: 'date',
        updated_at: 'date',
        assigned_to: 'string',
        tags: 'array',
        playbooks: 'array',
        resolution_notes: 'string',
      },
      fieldConstraints: {
        severity: ['low', 'medium', 'high', 'critical'],
        status: ['new', 'in_progress', 'resolved', 'closed'],
      },
      customValidators: [
        this.createTimestampValidator(),
        this.createSeverityValidator(),
        this.createStatusValidator(),
        this.createTitleValidator(),
      ],
    });

    // EDR Schema
    this.schemas.set('edr', {
      requiredFields: ['id', 'timestamp', 'severity', 'status', 'threat_name', 'hostname'],
      optionalFields: ['threat_type', 'description', 'username', 'process_name', 'file_path', 'network_connections'],
      fieldTypes: {
        id: 'string',
        timestamp: 'date',
        severity: 'string',
        status: 'string',
        threat_name: 'string',
        threat_type: 'string',
        description: 'string',
        hostname: 'string',
        username: 'string',
        process_name: 'string',
        file_path: 'string',
        network_connections: 'array',
      },
      fieldConstraints: {
        severity: ['low', 'medium', 'high', 'critical'],
        status: ['new', 'investigating', 'resolved', 'false_positive'],
        threat_type: ['malware', 'phishing', 'ransomware', 'apt', 'insider_threat', 'unknown'],
      },
      customValidators: [
        this.createTimestampValidator(),
        this.createSeverityValidator(),
        this.createStatusValidator(),
        this.createThreatNameValidator(),
        this.createHostnameValidator(),
      ],
    });

    // Threat Intelligence Schema
    this.schemas.set('threat_intelligence', {
      requiredFields: ['indicator_value', 'indicator_type', 'threat_type', 'confidence_score', 'source'],
      optionalFields: ['country_code', 'latitude', 'longitude', 'first_seen', 'last_seen', 'tags'],
      fieldTypes: {
        indicator_value: 'string',
        indicator_type: 'string',
        threat_type: 'string',
        confidence_score: 'number',
        source: 'string',
        country_code: 'string',
        latitude: 'number',
        longitude: 'number',
        first_seen: 'date',
        last_seen: 'date',
        tags: 'array',
      },
      fieldConstraints: {
        indicator_type: ['ip', 'domain', 'url', 'hash', 'email', 'file'],
        threat_type: ['malware', 'phishing', 'botnet', 'c2', 'exploit', 'unknown'],
        confidence_score: { min: 0, max: 100 },
        country_code: { pattern: /^[A-Z]{2}$/ },
        latitude: { min: -90, max: 90 },
        longitude: { min: -180, max: 180 },
      },
      customValidators: [
        this.createIndicatorValidator(),
        this.createConfidenceScoreValidator(),
        this.createGeoLocationValidator(),
      ],
    });
  }

  async validateSourceData(data: any[], source: string): Promise<ValidationResult> {
    try {
      this.logger.info(`Validating ${data.length} records from ${source} source`);

      const schema = this.schemas.get(source);
      if (!schema) {
        throw new Error(`No schema found for source: ${source}`);
      }

      const result: ValidationResult = {
        isValid: true,
        errors: [],
        warnings: [],
        validatedData: [],
        rejectedCount: 0,
        acceptedCount: 0,
      };

      for (const record of data) {
        const recordValidation = await this.validateRecord(record, schema, source);
        
        if (recordValidation.isValid) {
          result.validatedData.push(record);
          result.acceptedCount++;
        } else {
          result.rejectedCount++;
          result.errors.push(...recordValidation.errors);
        }
        
        result.warnings.push(...recordValidation.warnings);
      }

      result.isValid = result.errors.length === 0;
      
      this.logger.info(`Validation completed for ${source}`, {
        total: data.length,
        accepted: result.acceptedCount,
        rejected: result.rejectedCount,
        errors: result.errors.length,
        warnings: result.warnings.length,
      });

      return result;

    } catch (error) {
      this.logger.error(`Validation failed for ${source}`, { error });
      throw error;
    }
  }

  private async validateRecord(record: any, schema: DataSchema, source: string): Promise<ValidationResult> {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      validatedData: [record],
      rejectedCount: 0,
      acceptedCount: 1,
    };

    // Check required fields
    for (const field of schema.requiredFields) {
      if (!this.hasField(record, field)) {
        result.errors.push(`Missing required field: ${field}`);
        result.isValid = false;
      }
    }

    // Validate field types
    for (const [field, expectedType] of Object.entries(schema.fieldTypes)) {
      if (this.hasField(record, field)) {
        const actualType = this.getFieldType(record[field]);
        if (actualType !== expectedType) {
          result.errors.push(`Field ${field} has wrong type. Expected: ${expectedType}, Got: ${actualType}`);
          result.isValid = false;
        }
      }
    }

    // Validate field constraints
    for (const [field, constraint] of Object.entries(schema.fieldConstraints)) {
      if (this.hasField(record, field)) {
        const fieldValue = record[field];
        const constraintResult = this.validateConstraint(field, fieldValue, constraint);
        if (!constraintResult.isValid) {
          if (constraintResult.severity === 'error') {
            result.errors.push(constraintResult.message);
            result.isValid = false;
          } else {
            result.warnings.push(constraintResult.message);
          }
        }
      }
    }

    // Run custom validators
    for (const validator of schema.customValidators) {
      const validatorResult = validator.validate(record, source);
      if (!validatorResult.isValid) {
        if (validator.severity === 'error') {
          result.errors.push(...validatorResult.errors);
          result.isValid = false;
        } else {
          result.warnings.push(...validatorResult.warnings);
        }
      }
    }

    return result;
  }

  private hasField(record: any, field: string): boolean {
    return record.hasOwnProperty(field) && record[field] !== null && record[field] !== undefined;
  }

  private getFieldType(value: any): string {
    if (value === null || value === undefined) return 'null';
    if (Array.isArray(value)) return 'array';
    if (value instanceof Date) return 'date';
    if (typeof value === 'object') return 'object';
    return typeof value;
  }

  private validateConstraint(field: string, value: any, constraint: any): { isValid: boolean; message: string; severity: 'error' | 'warning' } {
    // Array constraint (enum values)
    if (Array.isArray(constraint)) {
      if (!constraint.includes(value)) {
        return {
          isValid: false,
          message: `Field ${field} value '${value}' is not in allowed values: ${constraint.join(', ')}`,
          severity: 'error',
        };
      }
    }

    // Object constraint (range, pattern, etc.)
    if (typeof constraint === 'object') {
      // Min/Max constraint
      if (constraint.min !== undefined && value < constraint.min) {
        return {
          isValid: false,
          message: `Field ${field} value ${value} is below minimum ${constraint.min}`,
          severity: 'error',
        };
      }
      if (constraint.max !== undefined && value > constraint.max) {
        return {
          isValid: false,
          message: `Field ${field} value ${value} is above maximum ${constraint.max}`,
          severity: 'error',
        };
      }

      // Pattern constraint
      if (constraint.pattern && !constraint.pattern.test(value)) {
        return {
          isValid: false,
          message: `Field ${field} value '${value}' does not match required pattern`,
          severity: 'error',
        };
      }
    }

    return { isValid: true, message: '', severity: 'error' };
  }

  // Custom Validators
  private createTimestampValidator(): ValidationRule {
    return {
      name: 'timestamp_validator',
      description: 'Validates timestamp fields are within reasonable range',
      severity: 'error',
      validate: (record: any, source: string) => {
        const result: ValidationResult = {
          isValid: true,
          errors: [],
          warnings: [],
          validatedData: [record],
          rejectedCount: 0,
          acceptedCount: 1,
        };

        const timestampFields = ['timestamp', 'created_at', 'updated_at', 'first_seen', 'last_seen'];
        
        for (const field of timestampFields) {
          if (this.hasField(record, field)) {
            const timestamp = new Date(record[field]);
            const now = new Date();
            const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
            const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);

            if (isNaN(timestamp.getTime())) {
              result.errors.push(`Field ${field} contains invalid timestamp: ${record[field]}`);
              result.isValid = false;
            } else if (timestamp < oneYearAgo) {
              result.warnings.push(`Field ${field} timestamp is more than 1 year old: ${timestamp.toISOString()}`);
            } else if (timestamp > oneHourFromNow) {
              result.warnings.push(`Field ${field} timestamp is in the future: ${timestamp.toISOString()}`);
            }
          }
        }

        return result;
      },
    };
  }

  private createSeverityValidator(): ValidationRule {
    return {
      name: 'severity_validator',
      description: 'Validates severity field has proper format and mapping',
      severity: 'error',
      validate: (record: any, source: string) => {
        const result: ValidationResult = {
          isValid: true,
          errors: [],
          warnings: [],
          validatedData: [record],
          rejectedCount: 0,
          acceptedCount: 1,
        };

        if (this.hasField(record, 'severity')) {
          const severity = record.severity?.toString().toLowerCase();
          const validSeverities = ['low', 'medium', 'high', 'critical'];
          
          if (!validSeverities.includes(severity)) {
            result.errors.push(`Invalid severity value: ${record.severity}. Must be one of: ${validSeverities.join(', ')}`);
            result.isValid = false;
          }
        }

        return result;
      },
    };
  }

  private createSourceValidator(): ValidationRule {
    return {
      name: 'source_validator',
      description: 'Validates source field matches expected source type',
      severity: 'warning',
      validate: (record: any, source: string) => {
        const result: ValidationResult = {
          isValid: true,
          errors: [],
          warnings: [],
          validatedData: [record],
          rejectedCount: 0,
          acceptedCount: 1,
        };

        if (this.hasField(record, 'source')) {
          const recordSource = record.source?.toString().toLowerCase();
          if (recordSource !== source.toLowerCase()) {
            result.warnings.push(`Source field '${record.source}' does not match expected source '${source}'`);
          }
        }

        return result;
      },
    };
  }

  private createDescriptionValidator(): ValidationRule {
    return {
      name: 'description_validator',
      description: 'Validates description field has meaningful content',
      severity: 'warning',
      validate: (record: any, source: string) => {
        const result: ValidationResult = {
          isValid: true,
          errors: [],
          warnings: [],
          validatedData: [record],
          rejectedCount: 0,
          acceptedCount: 1,
        };

        if (this.hasField(record, 'description')) {
          const description = record.description?.toString().trim();
          if (!description || description.length < 10) {
            result.warnings.push(`Description field is too short or empty: '${description}'`);
          }
        }

        return result;
      },
    };
  }

  private createStatusValidator(): ValidationRule {
    return {
      name: 'status_validator',
      description: 'Validates status field has proper format',
      severity: 'error',
      validate: (record: any, source: string) => {
        const result: ValidationResult = {
          isValid: true,
          errors: [],
          warnings: [],
          validatedData: [record],
          rejectedCount: 0,
          acceptedCount: 1,
        };

        if (this.hasField(record, 'status')) {
          const status = record.status?.toString().toLowerCase();
          const validStatuses = ['new', 'in_progress', 'resolved', 'closed', 'investigating', 'false_positive'];
          
          if (!validStatuses.includes(status)) {
            result.errors.push(`Invalid status value: ${record.status}. Must be one of: ${validStatuses.join(', ')}`);
            result.isValid = false;
          }
        }

        return result;
      },
    };
  }

  private createTitleValidator(): ValidationRule {
    return {
      name: 'title_validator',
      description: 'Validates title field has meaningful content',
      severity: 'warning',
      validate: (record: any, source: string) => {
        const result: ValidationResult = {
          isValid: true,
          errors: [],
          warnings: [],
          validatedData: [record],
          rejectedCount: 0,
          acceptedCount: 1,
        };

        if (this.hasField(record, 'title')) {
          const title = record.title?.toString().trim();
          if (!title || title.length < 5) {
            result.warnings.push(`Title field is too short or empty: '${title}'`);
          }
        }

        return result;
      },
    };
  }

  private createThreatNameValidator(): ValidationRule {
    return {
      name: 'threat_name_validator',
      description: 'Validates threat name field has meaningful content',
      severity: 'error',
      validate: (record: any, source: string) => {
        const result: ValidationResult = {
          isValid: true,
          errors: [],
          warnings: [],
          validatedData: [record],
          rejectedCount: 0,
          acceptedCount: 1,
        };

        if (this.hasField(record, 'threat_name')) {
          const threatName = record.threat_name?.toString().trim();
          if (!threatName || threatName.length < 3) {
            result.errors.push(`Threat name field is too short or empty: '${threatName}'`);
            result.isValid = false;
          }
        }

        return result;
      },
    };
  }

  private createHostnameValidator(): ValidationRule {
    return {
      name: 'hostname_validator',
      description: 'Validates hostname field has proper format',
      severity: 'warning',
      validate: (record: any, source: string) => {
        const result: ValidationResult = {
          isValid: true,
          errors: [],
          warnings: [],
          validatedData: [record],
          rejectedCount: 0,
          acceptedCount: 1,
        };

        if (this.hasField(record, 'hostname')) {
          const hostname = record.hostname?.toString().trim();
          if (!hostname || hostname === 'Unknown Host') {
            result.warnings.push(`Hostname field is empty or unknown: '${hostname}'`);
          }
        }

        return result;
      },
    };
  }

  private createIndicatorValidator(): ValidationRule {
    return {
      name: 'indicator_validator',
      description: 'Validates threat intelligence indicators have proper format',
      severity: 'error',
      validate: (record: any, source: string) => {
        const result: ValidationResult = {
          isValid: true,
          errors: [],
          warnings: [],
          validatedData: [record],
          rejectedCount: 0,
          acceptedCount: 1,
        };

        if (this.hasField(record, 'indicator_value') && this.hasField(record, 'indicator_type')) {
          const value = record.indicator_value?.toString().trim();
          const type = record.indicator_type?.toString().toLowerCase();

          if (!value || value.length < 3) {
            result.errors.push(`Indicator value is too short or empty: '${value}'`);
            result.isValid = false;
          }

          // Validate indicator format based on type
          switch (type) {
            case 'ip':
              if (!this.isValidIP(value)) {
                result.errors.push(`Invalid IP address format: '${value}'`);
                result.isValid = false;
              }
              break;
            case 'domain':
              if (!this.isValidDomain(value)) {
                result.errors.push(`Invalid domain format: '${value}'`);
                result.isValid = false;
              }
              break;
            case 'url':
              if (!this.isValidURL(value)) {
                result.errors.push(`Invalid URL format: '${value}'`);
                result.isValid = false;
              }
              break;
            case 'hash':
              if (!this.isValidHash(value)) {
                result.errors.push(`Invalid hash format: '${value}'`);
                result.isValid = false;
              }
              break;
            case 'email':
              if (!this.isValidEmail(value)) {
                result.errors.push(`Invalid email format: '${value}'`);
                result.isValid = false;
              }
              break;
          }
        }

        return result;
      },
    };
  }

  private createConfidenceScoreValidator(): ValidationRule {
    return {
      name: 'confidence_score_validator',
      description: 'Validates confidence score is within valid range',
      severity: 'error',
      validate: (record: any, source: string) => {
        const result: ValidationResult = {
          isValid: true,
          errors: [],
          warnings: [],
          validatedData: [record],
          rejectedCount: 0,
          acceptedCount: 1,
        };

        if (this.hasField(record, 'confidence_score')) {
          const score = parseInt(record.confidence_score?.toString() || '0');
          if (isNaN(score) || score < 0 || score > 100) {
            result.errors.push(`Invalid confidence score: ${record.confidence_score}. Must be between 0 and 100`);
            result.isValid = false;
          }
        }

        return result;
      },
    };
  }

  private createGeoLocationValidator(): ValidationRule {
    return {
      name: 'geo_location_validator',
      description: 'Validates geographic location data',
      severity: 'warning',
      validate: (record: any, source: string) => {
        const result: ValidationResult = {
          isValid: true,
          errors: [],
          warnings: [],
          validatedData: [record],
          rejectedCount: 0,
          acceptedCount: 1,
        };

        if (this.hasField(record, 'latitude') && this.hasField(record, 'longitude')) {
          const lat = parseFloat(record.latitude?.toString() || '0');
          const lon = parseFloat(record.longitude?.toString() || '0');

          if (isNaN(lat) || lat < -90 || lat > 90) {
            result.warnings.push(`Invalid latitude: ${record.latitude}. Must be between -90 and 90`);
          }
          if (isNaN(lon) || lon < -180 || lon > 180) {
            result.warnings.push(`Invalid longitude: ${record.longitude}. Must be between -180 and 180`);
          }
        }

        return result;
      },
    };
  }

  // Utility methods for format validation
  private isValidIP(ip: string): boolean {
    const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    return ipRegex.test(ip);
  }

  private isValidDomain(domain: string): boolean {
    const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    return domainRegex.test(domain);
  }

  private isValidURL(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  private isValidHash(hash: string): boolean {
    const md5Regex = /^[a-fA-F0-9]{32}$/;
    const sha1Regex = /^[a-fA-F0-9]{40}$/;
    const sha256Regex = /^[a-fA-F0-9]{64}$/;
    return md5Regex.test(hash) || sha1Regex.test(hash) || sha256Regex.test(hash);
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // Schema management methods
  addSchema(source: string, schema: DataSchema): void {
    this.schemas.set(source, schema);
    this.logger.info(`Added schema for source: ${source}`);
  }

  getSchema(source: string): DataSchema | undefined {
    return this.schemas.get(source);
  }

  removeSchema(source: string): boolean {
    return this.schemas.delete(source);
  }

  listSchemas(): string[] {
    return Array.from(this.schemas.keys());
  }
}
