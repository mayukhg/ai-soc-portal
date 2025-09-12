/**
 * Deduplication Engine
 * Cross-source deduplication logic for security data
 */

import { Logger } from '../utils/logger';

export interface DeduplicationResult {
  uniqueRecords: any[];
  duplicateGroups: DuplicateGroup[];
  duplicateCount: number;
  uniqueCount: number;
  totalCount: number;
  processingTime: number;
}

export interface DuplicateGroup {
  id: string;
  records: any[];
  similarityScore: number;
  primaryRecord: any;
  duplicateRecords: any[];
  deduplicationReason: string;
}

export interface DeduplicationConfig {
  similarityThreshold: number;
  timeWindowMinutes: number;
  fieldWeights: Record<string, number>;
  enableFuzzyMatching: boolean;
  enableSemanticMatching: boolean;
  maxGroupSize: number;
}

export interface SimilarityMetrics {
  exactMatch: number;
  fuzzyMatch: number;
  semanticMatch: number;
  temporalMatch: number;
  overallScore: number;
}

export class DeduplicationEngine {
  private logger: Logger;
  private config: DeduplicationConfig;
  private similarityCache: Map<string, SimilarityMetrics>;

  constructor(config?: Partial<DeduplicationConfig>) {
    this.logger = new Logger('DeduplicationEngine');
    this.config = {
      similarityThreshold: 0.8,
      timeWindowMinutes: 60,
      fieldWeights: {
        id: 1.0,
        title: 0.9,
        description: 0.8,
        hostname: 0.7,
        username: 0.6,
        process_name: 0.7,
        file_path: 0.8,
        source_ip: 0.6,
        destination_ip: 0.6,
        timestamp: 0.5,
      },
      enableFuzzyMatching: true,
      enableSemanticMatching: true,
      maxGroupSize: 100,
    };
    this.similarityCache = new Map();
    
    if (config) {
      this.config = { ...this.config, ...config };
    }
  }

  async deduplicate(data: any[], source: string): Promise<DeduplicationResult> {
    const startTime = Date.now();
    
    try {
      this.logger.info(`Starting deduplication for ${data.length} records from ${source}`);

      // Step 1: Group records by time windows
      const timeGroups = this.groupByTimeWindow(data);
      
      // Step 2: Find duplicates within each time group
      const duplicateGroups: DuplicateGroup[] = [];
      const processedRecords = new Set<string>();
      
      for (const timeGroup of timeGroups) {
        const groupDuplicates = await this.findDuplicatesInGroup(timeGroup, source);
        duplicateGroups.push(...groupDuplicates);
        
        // Mark processed records
        groupDuplicates.forEach(group => {
          group.records.forEach(record => {
            processedRecords.add(this.getRecordId(record));
          });
        });
      }

      // Step 3: Extract unique records
      const uniqueRecords = data.filter(record => 
        !processedRecords.has(this.getRecordId(record))
      );

      // Step 4: Add primary records from duplicate groups
      duplicateGroups.forEach(group => {
        uniqueRecords.push(group.primaryRecord);
      });

      const result: DeduplicationResult = {
        uniqueRecords,
        duplicateGroups,
        duplicateCount: duplicateGroups.reduce((sum, group) => sum + group.duplicateRecords.length, 0),
        uniqueCount: uniqueRecords.length,
        totalCount: data.length,
        processingTime: Date.now() - startTime,
      };

      this.logger.info(`Deduplication completed for ${source}`, {
        total: result.totalCount,
        unique: result.uniqueCount,
        duplicates: result.duplicateCount,
        groups: result.duplicateGroups.length,
        processingTime: result.processingTime,
      });

      return result;

    } catch (error) {
      this.logger.error(`Deduplication failed for ${source}`, { error });
      throw error;
    }
  }

  private groupByTimeWindow(data: any[]): any[][] {
    const groups: Map<string, any[]> = new Map();
    
    for (const record of data) {
      const timestamp = new Date(record.timestamp || record.created_at || record.updated_at);
      const timeWindow = this.getTimeWindow(timestamp);
      
      if (!groups.has(timeWindow)) {
        groups.set(timeWindow, []);
      }
      groups.get(timeWindow)!.push(record);
    }
    
    return Array.from(groups.values());
  }

  private getTimeWindow(timestamp: Date): string {
    const windowStart = new Date(timestamp);
    windowStart.setMinutes(
      Math.floor(windowStart.getMinutes() / this.config.timeWindowMinutes) * this.config.timeWindowMinutes,
      0,
      0
    );
    return windowStart.toISOString();
  }

  private async findDuplicatesInGroup(group: any[], source: string): Promise<DuplicateGroup[]> {
    const duplicateGroups: DuplicateGroup[] = [];
    const processed = new Set<string>();
    
    for (let i = 0; i < group.length; i++) {
      const record1 = group[i];
      const record1Id = this.getRecordId(record1);
      
      if (processed.has(record1Id)) continue;
      
      const duplicateRecords: any[] = [];
      let bestSimilarity = 0;
      let primaryRecord = record1;
      
      for (let j = i + 1; j < group.length; j++) {
        const record2 = group[j];
        const record2Id = this.getRecordId(record2);
        
        if (processed.has(record2Id)) continue;
        
        const similarity = await this.calculateSimilarity(record1, record2, source);
        
        if (similarity.overallScore >= this.config.similarityThreshold) {
          duplicateRecords.push(record2);
          processed.add(record2Id);
          
          if (similarity.overallScore > bestSimilarity) {
            bestSimilarity = similarity.overallScore;
            primaryRecord = this.selectPrimaryRecord(record1, record2, similarity);
          }
        }
      }
      
      if (duplicateRecords.length > 0) {
        duplicateGroups.push({
          id: `group_${Date.now()}_${Math.random()}`,
          records: [record1, ...duplicateRecords],
          similarityScore: bestSimilarity,
          primaryRecord,
          duplicateRecords,
          deduplicationReason: this.generateDeduplicationReason(record1, duplicateRecords, bestSimilarity),
        });
        
        processed.add(record1Id);
      }
    }
    
    return duplicateGroups;
  }

  private async calculateSimilarity(record1: any, record2: any, source: string): Promise<SimilarityMetrics> {
    const cacheKey = `${this.getRecordId(record1)}_${this.getRecordId(record2)}`;
    
    if (this.similarityCache.has(cacheKey)) {
      return this.similarityCache.get(cacheKey)!;
    }
    
    const metrics: SimilarityMetrics = {
      exactMatch: 0,
      fuzzyMatch: 0,
      semanticMatch: 0,
      temporalMatch: 0,
      overallScore: 0,
    };
    
    // Exact match scoring
    metrics.exactMatch = this.calculateExactMatch(record1, record2);
    
    // Fuzzy match scoring
    if (this.config.enableFuzzyMatching) {
      metrics.fuzzyMatch = this.calculateFuzzyMatch(record1, record2);
    }
    
    // Semantic match scoring
    if (this.config.enableSemanticMatching) {
      metrics.semanticMatch = await this.calculateSemanticMatch(record1, record2);
    }
    
    // Temporal match scoring
    metrics.temporalMatch = this.calculateTemporalMatch(record1, record2);
    
    // Calculate overall score
    metrics.overallScore = this.calculateOverallScore(metrics);
    
    this.similarityCache.set(cacheKey, metrics);
    return metrics;
  }

  private calculateExactMatch(record1: any, record2: any): number {
    const fields = Object.keys(this.config.fieldWeights);
    let totalWeight = 0;
    let matchedWeight = 0;
    
    for (const field of fields) {
      const weight = this.config.fieldWeights[field];
      totalWeight += weight;
      
      if (this.hasField(record1, field) && this.hasField(record2, field)) {
        const value1 = this.normalizeValue(record1[field]);
        const value2 = this.normalizeValue(record2[field]);
        
        if (value1 === value2) {
          matchedWeight += weight;
        }
      }
    }
    
    return totalWeight > 0 ? matchedWeight / totalWeight : 0;
  }

  private calculateFuzzyMatch(record1: any, record2: any): number {
    const textFields = ['title', 'description', 'threat_name', 'process_name', 'file_path'];
    let totalWeight = 0;
    let matchedWeight = 0;
    
    for (const field of textFields) {
      const weight = this.config.fieldWeights[field] || 0;
      
      if (this.hasField(record1, field) && this.hasField(record2, field)) {
        const value1 = this.normalizeValue(record1[field]).toString();
        const value2 = this.normalizeValue(record2[field]).toString();
        
        if (value1 && value2) {
          const similarity = this.calculateStringSimilarity(value1, value2);
          totalWeight += weight;
          matchedWeight += weight * similarity;
        }
      }
    }
    
    return totalWeight > 0 ? matchedWeight / totalWeight : 0;
  }

  private async calculateSemanticMatch(record1: any, record2: any): Promise<number> {
    // This would integrate with AI/ML models for semantic similarity
    // For now, we'll use a simplified approach based on keyword overlap
    
    const text1 = this.extractTextContent(record1);
    const text2 = this.extractTextContent(record2);
    
    if (!text1 || !text2) return 0;
    
    const words1 = this.tokenize(text1);
    const words2 = this.tokenize(text2);
    
    const intersection = words1.filter(word => words2.includes(word));
    const union = [...new Set([...words1, ...words2])];
    
    return union.length > 0 ? intersection.length / union.length : 0;
  }

  private calculateTemporalMatch(record1: any, record2: any): number {
    const timestamp1 = this.getTimestamp(record1);
    const timestamp2 = this.getTimestamp(record2);
    
    if (!timestamp1 || !timestamp2) return 0;
    
    const timeDiff = Math.abs(timestamp1.getTime() - timestamp2.getTime());
    const maxDiff = this.config.timeWindowMinutes * 60 * 1000;
    
    if (timeDiff > maxDiff) return 0;
    
    return 1 - (timeDiff / maxDiff);
  }

  private calculateOverallScore(metrics: SimilarityMetrics): number {
    const weights = {
      exactMatch: 0.4,
      fuzzyMatch: 0.3,
      semanticMatch: 0.2,
      temporalMatch: 0.1,
    };
    
    return (
      metrics.exactMatch * weights.exactMatch +
      metrics.fuzzyMatch * weights.fuzzyMatch +
      metrics.semanticMatch * weights.semanticMatch +
      metrics.temporalMatch * weights.temporalMatch
    );
  }

  private calculateStringSimilarity(str1: string, str2: string): number {
    // Levenshtein distance-based similarity
    const maxLength = Math.max(str1.length, str2.length);
    if (maxLength === 0) return 1;
    
    const distance = this.levenshteinDistance(str1, str2);
    return 1 - (distance / maxLength);
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
    
    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
    
    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1,
          matrix[j - 1][i - 1] + indicator
        );
      }
    }
    
    return matrix[str2.length][str1.length];
  }

  private selectPrimaryRecord(record1: any, record2: any, similarity: SimilarityMetrics): any {
    // Select primary record based on data quality and completeness
    const score1 = this.calculateDataQuality(record1);
    const score2 = this.calculateDataQuality(record2);
    
    if (score1 > score2) return record1;
    if (score2 > score1) return record2;
    
    // If scores are equal, prefer the one with more recent timestamp
    const timestamp1 = this.getTimestamp(record1);
    const timestamp2 = this.getTimestamp(record2);
    
    if (timestamp1 && timestamp2) {
      return timestamp1 > timestamp2 ? record1 : record2;
    }
    
    return record1; // Default to first record
  }

  private calculateDataQuality(record: any): number {
    let score = 0;
    const fields = Object.keys(this.config.fieldWeights);
    
    for (const field of fields) {
      if (this.hasField(record, field)) {
        const value = record[field];
        const weight = this.config.fieldWeights[field];
        
        if (value && value.toString().trim().length > 0) {
          score += weight;
        }
      }
    }
    
    return score;
  }

  private generateDeduplicationReason(primaryRecord: any, duplicates: any[], similarity: number): string {
    const reasons = [];
    
    if (similarity >= 0.95) {
      reasons.push('near-exact match');
    } else if (similarity >= 0.8) {
      reasons.push('high similarity');
    } else {
      reasons.push('moderate similarity');
    }
    
    // Add specific field matches
    const commonFields = this.findCommonFields(primaryRecord, duplicates[0]);
    if (commonFields.length > 0) {
      reasons.push(`matching fields: ${commonFields.join(', ')}`);
    }
    
    return reasons.join('; ');
  }

  private findCommonFields(record1: any, record2: any): string[] {
    const fields = Object.keys(this.config.fieldWeights);
    const commonFields: string[] = [];
    
    for (const field of fields) {
      if (this.hasField(record1, field) && this.hasField(record2, field)) {
        const value1 = this.normalizeValue(record1[field]);
        const value2 = this.normalizeValue(record2[field]);
        
        if (value1 === value2) {
          commonFields.push(field);
        }
      }
    }
    
    return commonFields;
  }

  private getRecordId(record: any): string {
    return record.id || record.detect_id || record.incident_id || 
           `${record.source || 'unknown'}_${Date.now()}_${Math.random()}`;
  }

  private hasField(record: any, field: string): boolean {
    return record.hasOwnProperty(field) && record[field] !== null && record[field] !== undefined;
  }

  private normalizeValue(value: any): any {
    if (typeof value === 'string') {
      return value.toLowerCase().trim();
    }
    if (value instanceof Date) {
      return value.toISOString();
    }
    return value;
  }

  private getTimestamp(record: any): Date | null {
    const timestampFields = ['timestamp', 'created_at', 'updated_at', 'first_behavior'];
    
    for (const field of timestampFields) {
      if (this.hasField(record, field)) {
        const timestamp = new Date(record[field]);
        if (!isNaN(timestamp.getTime())) {
          return timestamp;
        }
      }
    }
    
    return null;
  }

  private extractTextContent(record: any): string {
    const textFields = ['title', 'description', 'threat_name', 'process_name', 'file_path'];
    const textParts: string[] = [];
    
    for (const field of textFields) {
      if (this.hasField(record, field)) {
        const value = record[field]?.toString().trim();
        if (value) {
          textParts.push(value);
        }
      }
    }
    
    return textParts.join(' ');
  }

  private tokenize(text: string): string[] {
    return text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2);
  }

  // Configuration management
  updateConfig(config: Partial<DeduplicationConfig>): void {
    this.config = { ...this.config, ...config };
    this.logger.info('Deduplication configuration updated', { config });
  }

  getConfig(): DeduplicationConfig {
    return { ...this.config };
  }

  // Cache management
  clearCache(): void {
    this.similarityCache.clear();
    this.logger.info('Deduplication cache cleared');
  }

  getCacheSize(): number {
    return this.similarityCache.size;
  }

  // Statistics
  getDeduplicationStats(): any {
    return {
      cacheSize: this.similarityCache.size,
      config: this.config,
      cacheHitRate: this.calculateCacheHitRate(),
    };
  }

  private calculateCacheHitRate(): number {
    // This would track cache hits/misses in a real implementation
    return 0.85; // Placeholder
  }
}
