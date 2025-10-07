
import { config, getEnvironment } from '@/config/environment';
import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  data?: any;
  source?: string;
  userId?: string;
}

class LoggerService {
  private static instance: LoggerService;
  private logQueue: LogEntry[] = [];
  private maxQueueSize = 100;
  private flushInterval: NodeJS.Timeout | null = null;

  public static getInstance(): LoggerService {
    if (!LoggerService.instance) {
      LoggerService.instance = new LoggerService();
    }
    return LoggerService.instance;
  }

  constructor() {
    this.startFlushTimer();
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
    const configLevel = config.logging.logLevel;
    return levels.indexOf(level) >= levels.indexOf(configLevel);
  }

  private createLogEntry(level: LogLevel, message: string, data?: any, source?: string): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      data,
      source,
      userId: 'anonymous', // Could be replaced with actual user ID
    };
  }

  private async writeToConsole(entry: LogEntry): Promise<void> {
    if (!config.logging.enableConsoleLogging) return;

    const logMessage = `[${entry.timestamp}] ${entry.level.toUpperCase()}: ${entry.message}`;
    const logData = entry.data ? [logMessage, entry.data] : [logMessage];

    switch (entry.level) {
      case 'debug':
        console.log('🐛', ...logData);
        break;
      case 'info':
        console.info('ℹ️', ...logData);
        break;
      case 'warn':
        console.warn('⚠️', ...logData);
        break;
      case 'error':
        console.error('🚨', ...logData);
        break;
    }
  }

  private async writeToFile(entry: LogEntry): Promise<void> {
    try {
      if (Platform.OS === 'web') return; // Skip file logging on web

      const logDir = `${FileSystem.documentDirectory}logs/`;
      const logFile = `${logDir}app-${new Date().toISOString().split('T')[0]}.log`;

      // Ensure log directory exists
      const dirInfo = await FileSystem.getInfoAsync(logDir);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(logDir, { intermediates: true });
      }

      const logLine = JSON.stringify(entry) + '\n';
      await FileSystem.writeAsStringAsync(logFile, logLine, { append: true });
    } catch (error) {
      console.error('Failed to write log to file:', error);
    }
  }

  private async sendToRemoteService(entries: LogEntry[]): Promise<void> {
    if (!config.logging.enableRemoteLogging || entries.length === 0) return;

    try {
      // In a real app, you would send logs to a service like Sentry, LogRocket, etc.
      // For now, we'll just simulate the remote logging
      console.log('📡 Sending logs to remote service:', entries.length, 'entries');
      
      // Example: Send to a hypothetical logging service
      // await fetch('https://your-logging-service.com/logs', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ logs: entries }),
      // });
    } catch (error) {
      console.error('Failed to send logs to remote service:', error);
    }
  }

  private startFlushTimer(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }

    this.flushInterval = setInterval(() => {
      this.flush();
    }, 30000); // Flush every 30 seconds
  }

  private async flush(): Promise<void> {
    if (this.logQueue.length === 0) return;

    const logsToFlush = [...this.logQueue];
    this.logQueue = [];

    try {
      await this.sendToRemoteService(logsToFlush);
    } catch (error) {
      console.error('Failed to flush logs:', error);
      // Re-add failed logs back to queue (up to max size)
      this.logQueue = [...logsToFlush.slice(-this.maxQueueSize / 2), ...this.logQueue];
    }
  }

  private async log(level: LogLevel, message: string, data?: any, source?: string): Promise<void> {
    if (!this.shouldLog(level)) return;

    const entry = this.createLogEntry(level, message, data, source);

    // Always write to console in development
    if (getEnvironment().isDevelopment || level === 'error') {
      await this.writeToConsole(entry);
    }

    // Write to file for persistent logging
    await this.writeToFile(entry);

    // Add to queue for remote logging
    this.logQueue.push(entry);

    // Prevent queue from growing too large
    if (this.logQueue.length > this.maxQueueSize) {
      this.logQueue = this.logQueue.slice(-this.maxQueueSize);
    }

    // Immediately flush critical errors
    if (level === 'error') {
      await this.flush();
    }
  }

  debug(message: string, data?: any, source?: string): void {
    this.log('debug', message, data, source);
  }

  info(message: string, data?: any, source?: string): void {
    this.log('info', message, data, source);
  }

  warn(message: string, data?: any, source?: string): void {
    this.log('warn', message, data, source);
  }

  error(message: string, data?: any, source?: string): void {
    this.log('error', message, data, source);
  }

  async getLogs(days: number = 7): Promise<LogEntry[]> {
    try {
      if (Platform.OS === 'web') return [];

      const logDir = `${FileSystem.documentDirectory}logs/`;
      const dirInfo = await FileSystem.getInfoAsync(logDir);
      
      if (!dirInfo.exists) return [];

      const files = await FileSystem.readDirectoryAsync(logDir);
      const logFiles = files.filter(file => file.endsWith('.log'));
      
      const allLogs: LogEntry[] = [];
      
      for (const file of logFiles) {
        const filePath = `${logDir}${file}`;
        const content = await FileSystem.readAsStringAsync(filePath);
        const lines = content.split('\n').filter(line => line.trim());
        
        for (const line of lines) {
          try {
            const entry = JSON.parse(line) as LogEntry;
            const entryDate = new Date(entry.timestamp);
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - days);
            
            if (entryDate >= cutoffDate) {
              allLogs.push(entry);
            }
          } catch (parseError) {
            console.warn('Failed to parse log entry:', parseError);
          }
        }
      }
      
      return allLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    } catch (error) {
      console.error('Failed to get logs:', error);
      return [];
    }
  }

  async clearLogs(): Promise<void> {
    try {
      if (Platform.OS === 'web') return;

      const logDir = `${FileSystem.documentDirectory}logs/`;
      const dirInfo = await FileSystem.getInfoAsync(logDir);
      
      if (dirInfo.exists) {
        await FileSystem.deleteAsync(logDir, { idempotent: true });
        console.log('Logs cleared successfully');
      }
    } catch (error) {
      console.error('Failed to clear logs:', error);
    }
  }

  destroy(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }
    this.flush(); // Final flush
  }
}

export const logger = LoggerService.getInstance();

// Global error handler setup
export const setupGlobalErrorHandling = () => {
  // Handle unhandled promise rejections
  if (typeof window !== 'undefined') {
    window.addEventListener('unhandledrejection', (event) => {
      logger.error('Unhandled Promise Rejection', {
        reason: event.reason,
        stack: event.reason?.stack,
      }, 'GlobalErrorHandler');
    });

    // Handle global errors
    window.addEventListener('error', (event) => {
      logger.error('Global Error', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error,
      }, 'GlobalErrorHandler');
    });
  }

  // Override console methods to capture logs
  const originalConsoleError = console.error;
  const originalConsoleWarn = console.warn;

  console.error = (...args) => {
    logger.error('Console Error', args, 'Console');
    originalConsoleError(...args);
  };

  console.warn = (...args) => {
    logger.warn('Console Warning', args, 'Console');
    originalConsoleWarn(...args);
  };
};
