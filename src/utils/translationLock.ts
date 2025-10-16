/**
 * 简单异步互斥锁，确保自动翻译与一键同步翻译不会并发写入
 */
export class TranslationLock {
  private static locked = false;
  private static queue: Array<() => void> = [];

  public static isLocked(): boolean {
    return this.locked;
  }

  public static acquire(): Promise<void> {
    return new Promise((resolve) => {
      if (!this.locked) {
        this.locked = true;
        resolve();
      } else {
        this.queue.push(resolve);
      }
    });
  }

  public static release(): void {
    const next = this.queue.shift();
    if (next) {
      next();
    } else {
      this.locked = false;
    }
  }

  public static async runExclusive<T>(fn: () => Promise<T>): Promise<T> {
    await this.acquire();
    try {
      return await fn();
    } finally {
      this.release();
    }
  }
}

