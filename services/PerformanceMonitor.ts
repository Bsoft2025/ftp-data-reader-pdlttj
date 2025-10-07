
import { logger } from './Logger';
import { getEnvironment } from '@/config/environment';

interface PerformanceMetric {
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  metadata?: Record<string, any>;
}

interface MemoryInfo {
  usedJSHeapSize?: number;
  totalJSHeapSize?: number;
  jsHeapSizeLimit?: number;
}

class PerformanceMonitorService {
  private static instance: PerformanceMonitorService;
  private metrics: Map<string, PerformanceMetric> = new Map();
  private isEnabled: boolean;

  public static getInstance(): PerformanceMonitorService {
    if (!PerformanceMonitorService.instance) {
      PerformanceMonitorService.instance = new PerformanceMonitorService();
    }
    return PerformanceMonitorService.instance;
  }

  constructor() {
    this.isEnabled = getEnvironment().isDevelopment || getEnvironment().isProduction;
    this.setupPerformanceObserver();
  }

  private setupPerformanceObserver(): void {
    if (typeof window !== 'undefined' && 'PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry) => {
            if (entry.entryType === 'navigation') {
              logger.info('Navigation Performance', {
                name: entry.name,
                duration: entry.duration,
                loadEventEnd: (entry as PerformanceNavigationTiming).loadEventEnd,
                domContentLoadedEventEnd: (entry as PerformanceNavigationTiming).domContentLoadedEventEnd,
              }, 'PerformanceMonitor');
            } else if (entry.entryType === 'resource') {
              // Log slow resources (> 1 second)
              if (entry.duration > 1000) {
                logger.warn('Slow Resource Load', {
                  name: entry.name,
                  duration: entry.duration,
                  size: (entry as PerformanceResourceTiming).transferSize,
                }, 'PerformanceMonitor');
              }
            }
          });
        });

        observer.observe({ entryTypes: ['navigation', 'resource'] });
      } catch (error) {
        logger.warn('Failed to setup PerformanceObserver', { error }, 'PerformanceMonitor');
      }
    }
  }

  startTiming(name: string, metadata?: Record<string, any>): void {
    if (!this.isEnabled) return;

    const metric: PerformanceMetric = {
      name,
      startTime: Date.now(),
      metadata,
    };

    this.metrics.set(name, metric);
    logger.debug('Performance timing started', { name, metadata }, 'PerformanceMonitor');
  }

  endTiming(name: string, additionalMetadata?: Record<string, any>): number | null {
    if (!this.isEnabled) return null;

    const metric = this.metrics.get(name);
    if (!metric) {
      logger.warn('Performance timing not found', { name }, 'PerformanceMonitor');
      return null;
    }

    const endTime = Date.now();
    const duration = endTime - metric.startTime;

    metric.endTime = endTime;
    metric.duration = duration;

    const finalMetadata = {
      ...metric.metadata,
      ...additionalMetadata,
      duration,
    };

    logger.info('Performance timing completed', {
      name,
      duration,
      ...finalMetadata,
    }, 'PerformanceMonitor');

    // Log warning for slow operations
    if (duration > 5000) { // 5 seconds
      logger.warn('Slow operation detected', {
        name,
        duration,
        ...finalMetadata,
      }, 'PerformanceMonitor');
    }

    this.metrics.delete(name);
    return duration;
  }

  measureAsync<T>(name: string, operation: () => Promise<T>, metadata?: Record<string, any>): Promise<T> {
    return new Promise(async (resolve, reject) => {
      this.startTiming(name, metadata);
      
      try {
        const result = await operation();
        this.endTiming(name, { success: true });
        resolve(result);
      } catch (error) {
        this.endTiming(name, { 
          success: false, 
          error: error instanceof Error ? error.message : String(error) 
        });
        reject(error);
      }
    });
  }

  measureSync<T>(name: string, operation: () => T, metadata?: Record<string, any>): T {
    this.startTiming(name, metadata);
    
    try {
      const result = operation();
      this.endTiming(name, { success: true });
      return result;
    } catch (error) {
      this.endTiming(name, { 
        success: false, 
        error: error instanceof Error ? error.message : String(error) 
      });
      throw error;
    }
  }

  getMemoryInfo(): MemoryInfo {
    if (typeof window !== 'undefined' && 'performance' in window && 'memory' in performance) {
      const memory = (performance as any).memory;
      return {
        usedJSHeapSize: memory.usedJSHeapSize,
        totalJSHeapSize: memory.totalJSHeapSize,
        jsHeapSizeLimit: memory.jsHeapSizeLimit,
      };
    }
    return {};
  }

  logMemoryUsage(context: string): void {
    if (!this.isEnabled) return;

    const memoryInfo = this.getMemoryInfo();
    if (Object.keys(memoryInfo).length > 0) {
      logger.info('Memory Usage', {
        context,
        ...memoryInfo,
        usedMB: memoryInfo.usedJSHeapSize ? Math.round(memoryInfo.usedJSHeapSize / 1024 / 1024) : undefined,
        totalMB: memoryInfo.totalJSHeapSize ? Math.round(memoryInfo.totalJSHeapSize / 1024 / 1024) : undefined,
      }, 'PerformanceMonitor');
    }
  }

  getActiveTimings(): string[] {
    return Array.from(this.metrics.keys());
  }

  clearMetrics(): void {
    this.metrics.clear();
    logger.debug('Performance metrics cleared', {}, 'PerformanceMonitor');
  }

  // Bundle size and startup performance
  logStartupMetrics(): void {
    if (typeof window !== 'undefined' && 'performance' in window) {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      
      if (navigation) {
        logger.info('App Startup Metrics', {
          domContentLoaded: navigation.domContentLoadedEventEnd - navigation.navigationStart,
          loadComplete: navigation.loadEventEnd - navigation.navigationStart,
          firstPaint: this.getFirstPaintTime(),
          firstContentfulPaint: this.getFirstContentfulPaintTime(),
        }, 'PerformanceMonitor');
      }
    }
  }

  private getFirstPaintTime(): number | null {
    if (typeof window !== 'undefined' && 'performance' in window) {
      const paintEntries = performance.getEntriesByType('paint');
      const firstPaint = paintEntries.find(entry => entry.name === 'first-paint');
      return firstPaint ? firstPaint.startTime : null;
    }
    return null;
  }

  private getFirstContentfulPaintTime(): number | null {
    if (typeof window !== 'undefined' && 'performance' in window) {
      const paintEntries = performance.getEntriesByType('paint');
      const firstContentfulPaint = paintEntries.find(entry => entry.name === 'first-contentful-paint');
      return firstContentfulPaint ? firstContentfulPaint.startTime : null;
    }
    return null;
  }
}

export const performanceMonitor = PerformanceMonitorService.getInstance();

// Convenience functions
export const startTiming = (name: string, metadata?: Record<string, any>) => 
  performanceMonitor.startTiming(name, metadata);

export const endTiming = (name: string, additionalMetadata?: Record<string, any>) => 
  performanceMonitor.endTiming(name, additionalMetadata);

export const measureAsync = <T>(name: string, operation: () => Promise<T>, metadata?: Record<string, any>) => 
  performanceMonitor.measureAsync(name, operation, metadata);

export const measureSync = <T>(name: string, operation: () => T, metadata?: Record<string, any>) => 
  performanceMonitor.measureSync(name, operation, metadata);
