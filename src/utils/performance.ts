// Performance monitoring utilities

interface PerformanceMetrics {
  loadTime: number;
  domContentLoaded: number;
  firstContentfulPaint?: number;
  largestContentfulPaint?: number;
}

export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: PerformanceMetrics = {
    loadTime: 0,
    domContentLoaded: 0
  };

  public static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  public init() {
    // Measure basic load times
    window.addEventListener('load', () => {
      this.metrics.loadTime = performance.now();
    });

    document.addEventListener('DOMContentLoaded', () => {
      this.metrics.domContentLoaded = performance.now();
    });

    // Measure paint metrics if available
    if ('PerformanceObserver' in window) {
      try {
        const paintObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.name === 'first-contentful-paint') {
              this.metrics.firstContentfulPaint = entry.startTime;
            }
          }
        });
        paintObserver.observe({ entryTypes: ['paint'] });

        const lcpObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            this.metrics.largestContentfulPaint = entry.startTime;
          }
        });
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
      } catch (e) {
        console.warn('Performance Observer not fully supported');
      }
    }
  }

  public getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  public logMetrics() {
    if (process.env.NODE_ENV === 'development') {
      console.group('⚡ Performance Metrics');
      console.log('Load Time:', `${this.metrics.loadTime.toFixed(2)}ms`);
      console.log('DOM Content Loaded:', `${this.metrics.domContentLoaded.toFixed(2)}ms`);
      if (this.metrics.firstContentfulPaint) {
        console.log('First Contentful Paint:', `${this.metrics.firstContentfulPaint.toFixed(2)}ms`);
      }
      if (this.metrics.largestContentfulPaint) {
        console.log('Largest Contentful Paint:', `${this.metrics.largestContentfulPaint.toFixed(2)}ms`);
      }
      console.groupEnd();
    }
  }
}

// Utility to measure component render times
export function measureRenderTime<T extends any[]>(
  name: string,
  fn: (...args: T) => any
) {
  return (...args: T) => {
    const start = performance.now();
    const result = fn(...args);
    const end = performance.now();
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`🎯 ${name} render time: ${(end - start).toFixed(2)}ms`);
    }
    
    return result;
  };
}

// Debounce utility for performance optimization
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

// Throttle utility for performance optimization
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

// Initialize performance monitoring
if (typeof window !== 'undefined') {
  const monitor = PerformanceMonitor.getInstance();
  monitor.init();
  
  // Log metrics after page load
  window.addEventListener('load', () => {
    setTimeout(() => monitor.logMetrics(), 1000);
  });
}