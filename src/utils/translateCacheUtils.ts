import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { createHash } from 'crypto';

/**
 * 本地翻译缓存工具
 * 基于 (sourceLang, targetLang, text) 生成键，持久化到 locales 目录下隐藏文件
 */
export class TranslateCacheUtils {
  private static inited = false;
  private static cache: Record<string, string> = {};
  private static cachePath = '';
  private static dirtyCount = 0;
  private static flushTimer: NodeJS.Timeout | null = null;

  private static ensureInit(workspaceRoot: string) {
    if (this.inited) return;
    const config = vscode.workspace.getConfiguration('ut-auto-translate');
    const localesDir = config.get<string>('localesDir', 'locales');
    this.cachePath = path.join(workspaceRoot, localesDir, '.ut-auto-translate-cache.json');
    try {
      if (fs.existsSync(this.cachePath)) {
        const raw = fs.readFileSync(this.cachePath, 'utf8');
        this.cache = JSON.parse(raw || '{}');
      } else {
        this.cache = {};
      }
    } catch {
      this.cache = {};
    }
    this.inited = true;
  }

  private static key(source: string, target: string, text: string): string {
    const h = createHash('sha256');
    h.update(source);
    h.update('\n');
    h.update(target);
    h.update('\n');
    h.update(text);
    return h.digest('hex');
  }

  public static get(workspaceRoot: string, source: string, target: string, text: string): string | undefined {
    const config = vscode.workspace.getConfiguration('ut-auto-translate');
    const enableCache = config.get<boolean>('enableCache', true);
    if (!enableCache) return undefined;
    this.ensureInit(workspaceRoot);
    return this.cache[this.key(source, target, text)];
  }

  public static set(workspaceRoot: string, source: string, target: string, text: string, translation: string): void {
    const config = vscode.workspace.getConfiguration('ut-auto-translate');
    const enableCache = config.get<boolean>('enableCache', true);
    if (!enableCache) return;
    this.ensureInit(workspaceRoot);
    this.cache[this.key(source, target, text)] = translation;
    this.dirtyCount++;
    this.scheduleFlush();
  }

  private static scheduleFlush() {
    // 触发节流写入，减少频繁磁盘IO
    const threshold = 50; // 50次更新强制一次落盘
    const delayMs = 500;  // 或者500ms后定时落盘
    if (this.dirtyCount >= threshold) {
      this.flushInternal();
      return;
    }
    if (this.flushTimer) return;
    this.flushTimer = setTimeout(() => {
      this.flushInternal();
    }, delayMs);
  }

  private static flushInternal() {
    try {
      const dir = path.dirname(this.cachePath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(this.cachePath, JSON.stringify(this.cache, null, 2), 'utf8');
    } catch {
      // ignore disk write errors
    } finally {
      this.dirtyCount = 0;
      if (this.flushTimer) {
        clearTimeout(this.flushTimer);
        this.flushTimer = null;
      }
    }
  }

  public static flush(workspaceRoot: string | null): void {
    if (!workspaceRoot) return;
    if (this.dirtyCount > 0) {
      this.flushInternal();
    }
  }
}
