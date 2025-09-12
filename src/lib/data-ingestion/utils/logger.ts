/**
 * Logger Utility
 * Centralized logging for data ingestion pipeline
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

export interface LogEntry {
  timestamp: Date;
  level: LogLevel;
  message: string;
  context?: string;
  metadata?: Record<string, any>;
  error?: Error;
}

export class Logger {
  private context: string;
  private level: LogLevel;
  private logEntries: LogEntry[];

  constructor(context: string, level: LogLevel = LogLevel.INFO) {
    this.context = context;
    this.level = level;
    this.logEntries = [];
  }

  debug(message: string, metadata?: Record<string, any>): void {
    this.log(LogLevel.DEBUG, message, metadata);
  }

  info(message: string, metadata?: Record<string, any>): void {
    this.log(LogLevel.INFO, message, metadata);
  }

  warn(message: string, metadata?: Record<string, any>): void {
    this.log(LogLevel.WARN, message, metadata);
  }

  error(message: string, metadata?: Record<string, any>, error?: Error): void {
    this.log(LogLevel.ERROR, message, metadata, error);
  }

  private log(level: LogLevel, message: string, metadata?: Record<string, any>, error?: Error): void {
    if (level < this.level) return;

    const entry: LogEntry = {
      timestamp: new Date(),
      level,
      message,
      context: this.context,
      metadata,
      error,
    };

    this.logEntries.push(entry);

    // Output to console (in production, this would go to a proper logging system)
    const levelName = LogLevel[level];
    const timestamp = entry.timestamp.toISOString();
    const logMessage = `[${timestamp}] ${levelName} [${this.context}] ${message}`;
    
    if (metadata) {
      console.log(logMessage, metadata);
    } else {
      console.log(logMessage);
    }

    if (error) {
      console.error(error);
    }
  }

  setLevel(level: LogLevel): void {
    this.level = level;
  }

  getLogs(level?: LogLevel): LogEntry[] {
    if (level !== undefined) {
      return this.logEntries.filter(entry => entry.level >= level);
    }
    return [...this.logEntries];
  }

  clearLogs(): void {
    this.logEntries = [];
  }
}
