import { TFile } from 'obsidian';

export class PerformanceUtils {
  /**
   * Batch process items with concurrency limit
   */
  static async batchProcess<T, R>(
    items: T[],
    processor: (item: T) => Promise<R>,
    options: {
      batchSize?: number;
      concurrency?: number;
      onProgress?: (processed: number, total: number) => void;
    } = {}
  ): Promise<R[]> {
    const { batchSize = 10, concurrency = 3, onProgress } = options;
    const results: R[] = [];
    let processed = 0;

    // Process in batches
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);

      // Process batch with concurrency limit
      const batchPromises = [];
      for (let j = 0; j < batch.length; j += concurrency) {
        const concurrent = batch.slice(j, j + concurrency);
        const promises = concurrent.map((item) => processor(item));
        batchPromises.push(...(await Promise.all(promises)));
      }

      results.push(...batchPromises);
      processed += batch.length;

      if (onProgress) {
        onProgress(processed, items.length);
      }

      // Small delay between batches to prevent overwhelming the API
      if (i + batchSize < items.length) {
        await this.delay(100);
      }
    }

    return results;
  }

  /**
   * Debounce function calls
   */
  static debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number
  ): (...args: Parameters<T>) => void {
    let timeout: number | null = null;

    return (...args: Parameters<T>) => {
      if (timeout !== null) {
        clearTimeout(timeout);
      }

      timeout = window.setTimeout(() => {
        func(...args);
        timeout = null;
      }, wait);
    };
  }

  /**
   * Throttle function calls
   */
  static throttle<T extends (...args: any[]) => any>(
    func: T,
    limit: number
  ): (...args: Parameters<T>) => void {
    let inThrottle = false;

    return (...args: Parameters<T>) => {
      if (!inThrottle) {
        func(...args);
        inThrottle = true;
        setTimeout(() => {
          inThrottle = false;
        }, limit);
      }
    };
  }

  /**
   * Cache with TTL
   */
  static createCache<K, V>(ttl: number = 5 * 60 * 1000) {
    const cache = new Map<K, { value: V; expiry: number }>();

    return {
      get(key: K): V | undefined {
        const item = cache.get(key);
        if (!item) return undefined;

        if (Date.now() > item.expiry) {
          cache.delete(key);
          return undefined;
        }

        return item.value;
      },

      set(key: K, value: V): void {
        cache.set(key, {
          value,
          expiry: Date.now() + ttl,
        });
      },

      clear(): void {
        cache.clear();
      },

      size(): number {
        // Clean expired entries
        const now = Date.now();
        for (const [key, item] of cache.entries()) {
          if (now > item.expiry) {
            cache.delete(key);
          }
        }
        return cache.size;
      },
    };
  }

  /**
   * Measure execution time
   */
  static async measureTime<T>(
    operation: () => Promise<T>,
    label: string
  ): Promise<{ result: T; duration: number }> {
    const start = performance.now();
    const result = await operation();
    const duration = performance.now() - start;

    console.log(`${label} took ${duration.toFixed(2)}ms`);
    return { result, duration };
  }

  /**
   * Chunk large content for processing
   */
  static chunkContent(content: string, maxChunkSize: number = 50000): string[] {
    if (content.length <= maxChunkSize) {
      return [content];
    }

    const chunks: string[] = [];
    let currentChunk = '';
    const lines = content.split('\n');

    for (const line of lines) {
      if (currentChunk.length + line.length + 1 > maxChunkSize) {
        chunks.push(currentChunk);
        currentChunk = line;
      } else {
        currentChunk += (currentChunk ? '\n' : '') + line;
      }
    }

    if (currentChunk) {
      chunks.push(currentChunk);
    }

    return chunks;
  }

  /**
   * Simple delay utility
   */
  static delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Memory-efficient file processing
   */
  static async *readFileInChunks(
    file: TFile,
    vault: any,
    chunkSize: number = 1024 * 1024 // 1MB chunks
  ): AsyncGenerator<string> {
    const content = await vault.read(file);
    const chunks = this.chunkContent(content, chunkSize);

    for (const chunk of chunks) {
      yield chunk;
    }
  }

  /**
   * Retry with exponential backoff
   */
  static async retry<T>(
    operation: () => Promise<T>,
    options: {
      maxRetries?: number;
      initialDelay?: number;
      maxDelay?: number;
      backoffFactor?: number;
    } = {}
  ): Promise<T> {
    const { maxRetries = 3, initialDelay = 1000, maxDelay = 30000, backoffFactor = 2 } = options;

    let lastError: Error;
    let delay = initialDelay;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;

        if (attempt === maxRetries) {
          throw lastError;
        }

        console.warn(`Retry attempt ${attempt + 1} failed:`, error);
        await this.delay(delay);

        delay = Math.min(delay * backoffFactor, maxDelay);
      }
    }

    throw lastError!;
  }

  /**
   * Queue for sequential processing
   */
  static createQueue<T>() {
    const queue: Array<() => Promise<T>> = [];
    let processing = false;

    const process = async () => {
      if (processing || queue.length === 0) return;

      processing = true;

      while (queue.length > 0) {
        const task = queue.shift()!;
        try {
          await task();
        } catch (error) {
          console.error('Queue task error:', error);
        }
      }

      processing = false;
    };

    return {
      add(task: () => Promise<T>): void {
        queue.push(task);
        process();
      },

      size(): number {
        return queue.length;
      },

      clear(): void {
        queue.length = 0;
      },
    };
  }

  /**
   * Optimize sync by comparing checksums
   */
  static async calculateChecksum(content: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(content);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }
}
