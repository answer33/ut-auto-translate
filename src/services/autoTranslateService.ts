import * as vscode from 'vscode';
import * as path from 'path';
import { IntlKeyExtractor } from '../utils/intlKeyExtractor';
import { LocaleFileUtils } from '../utils/localeFileUtils';
import { TranslationService } from './translationService';
import { TranslationLock } from '../utils/translationLock';

/**
 * 翻译任务接口
 */
interface TranslationTask {
  id: string;
  document: vscode.TextDocument;
  resolve: () => void;
  reject: (error: any) => void;
}

/**
 * 自动翻译服务
 * 用于监听文件保存事件并处理多语言翻译
 * 支持任务队列机制，避免并发翻译冲突
 */
export class AutoTranslateService {
  // 翻译任务队列
  private static translationQueue: TranslationTask[] = [];
  // 当前是否正在处理翻译任务
  private static isProcessing = false;
  // 待翻译的键集合，用于去重和合并
  private static pendingKeys = new Set<string>();
  // 防抖定时器
  private static debounceTimer: NodeJS.Timeout | null = null;
  // 防抖延迟时间（毫秒）
  private static readonly DEBOUNCE_DELAY = 500;

  /**
   * 获取当前等待中的自动/手动翻译任务数量（不包含正在处理中的批次）
   */
  public static getQueuedCount(): number {
    return this.translationQueue.length;
  }
  /**
   * 处理文件保存事件（入口方法）
   * @param document 保存的文档
   */
  public static async handleFileSaved(document: vscode.TextDocument): Promise<void> {
    return new Promise((resolve, reject) => {
      // 创建翻译任务
      const task: TranslationTask = {
        id: `${document.uri.fsPath}-${Date.now()}`,
        document,
        resolve,
        reject
      };

      // 将任务添加到队列
      this.translationQueue.push(task);

      // 使用防抖机制，避免频繁触发翻译
      if (this.debounceTimer) {
        clearTimeout(this.debounceTimer);
      }

      this.debounceTimer = setTimeout(() => {
        this.processTranslationQueue();
      }, this.DEBOUNCE_DELAY);
    });
  }

  /**
   * 处理翻译任务队列
   */
  private static async processTranslationQueue(): Promise<void> {
    if (this.isProcessing || this.translationQueue.length === 0) {
      return;
    }

    this.isProcessing = true;
    const currentQueue = [...this.translationQueue];
    this.translationQueue = [];
    this.pendingKeys.clear();

    // 若正在同步，提示排队中
    let queuedStatus: vscode.Disposable | undefined;
    try {
      const maybeSync = (() => {
        try {
          const { SyncTranslateService } = require('./syncTranslateService');
          return SyncTranslateService && typeof SyncTranslateService.isSyncing === 'function' && SyncTranslateService.isSyncing();
        } catch { return false; }
      })();
      if (TranslationLock.isLocked() && maybeSync) {
        queuedStatus = vscode.window.setStatusBarMessage('UT: 自动/手动翻译已排队（正在同步）');
      }

      await TranslationLock.runExclusive(async () => {
        // 收集所有待翻译的键
        const allKeysToTranslate = new Set<string>();
        const workspaceFolders = new Set<string>();

        for (const task of currentQueue) {
          try {
            const keys = await this.extractKeysFromTask(task);
            keys.forEach(key => allKeysToTranslate.add(key));

            const workspaceFolder = vscode.workspace.getWorkspaceFolder(task.document.uri);
            if (workspaceFolder) {
              workspaceFolders.add(workspaceFolder.uri.fsPath);
            }
          } catch (error) {
            console.error(`提取键失败: ${task.document.uri.fsPath}`, error);
          }
        }

        // 如果有键需要翻译，执行批量翻译
        if (allKeysToTranslate.size > 0 && workspaceFolders.size > 0) {
          // 假设所有文件都在同一个工作区（通常情况）
          const workspaceRoot = Array.from(workspaceFolders)[0];
          await this.performBatchTranslation(Array.from(allKeysToTranslate), workspaceRoot);
        }

        // 标记所有任务为完成
        currentQueue.forEach(task => task.resolve());
      });
    } catch (error) {
      console.error('批量翻译失败', error);
      // 标记所有任务为失败
      currentQueue.forEach(task => task.reject(error));
    } finally {
      if (queuedStatus) queuedStatus.dispose();
      this.isProcessing = false;
      
      // 如果在处理过程中又有新任务，继续处理
      if (this.translationQueue.length > 0) {
        setTimeout(() => this.processTranslationQueue(), 100);
      }
    }
  }

  /**
   * 从任务中提取需要翻译的键
   * @param task 翻译任务
   * @returns 需要翻译的键数组
   */
  private static async extractKeysFromTask(task: TranslationTask): Promise<string[]> {
    const document = task.document;
    
    // 检查插件是否启用
    const config = vscode.workspace.getConfiguration('ut-auto-translate');
    const enabled = config.get<boolean>('enabled', true);
    if (!enabled) {
      return [];
    }

    // 获取文件路径
    const filePath = document.uri.fsPath;

    // 检查文件是否应该被忽略
    if (IntlKeyExtractor.shouldIgnorePath(filePath)) {
      return [];
    }

    // 提取多语言键（中文字符串）
    const keys = IntlKeyExtractor.extractKeysFromDocument(document);
    if (keys.length === 0) {
      return [];
    }

    // 过滤掉应该被忽略的键
    return keys.filter(key => !IntlKeyExtractor.shouldIgnoreKey(key));
  }

  /**
    * 执行批量翻译
    * @param keysToTranslate 需要翻译的键数组
    * @param workspaceRoot 工作区根目录
    */
   private static async performBatchTranslation(keysToTranslate: string[], workspaceRoot: string): Promise<void> {
     // 获取配置
     const config = vscode.workspace.getConfiguration('ut-auto-translate');
     const languages = config.get<string[]>('languages', ['zh-CN', 'en-US', 'es-ES', 'fr-FR', 'zh-TW']);
     const defaultLanguage = config.get<string>('defaultLanguage', 'zh-CN');

     // 确保默认语言在语言列表中
     if (!languages.includes(defaultLanguage)) {
       vscode.window.showErrorMessage(`默认语言 ${defaultLanguage} 不在配置的语言列表中`);
       return;
     }

     // 获取默认语言的多语言文件路径
     const defaultLocaleFilePath = LocaleFileUtils.getLocaleFilePath(
       workspaceRoot,
       defaultLanguage
     );

     // 读取默认语言的多语言文件
     const defaultLocaleContent = LocaleFileUtils.readLocaleFile(defaultLocaleFilePath);

     // 找出需要翻译的键（在默认语言文件中不存在的键）
     const finalKeysToTranslate = keysToTranslate.filter(key => !Object.prototype.hasOwnProperty.call(defaultLocaleContent, key));
     if (finalKeysToTranslate.length === 0) {
       return;
     }

     // 显示状态栏消息
     const statusBarMessage = vscode.window.setStatusBarMessage(`正在批量翻译 ${finalKeysToTranslate.length} 个多语言键...`);

     try {
       // 为默认语言创建新的键值对（键和值相同，因为键本身就是中文）
       const newDefaultEntries: Record<string, string> = {};
       finalKeysToTranslate.forEach(key => {
         newDefaultEntries[key] = key; // 键和值相同，因为键本身就是中文
       });

       // 更新默认语言的多语言文件
       const updatedDefaultContent = LocaleFileUtils.mergeLocaleContent(
         defaultLocaleContent,
         newDefaultEntries
       );
       LocaleFileUtils.writeLocaleFile(defaultLocaleFilePath, updatedDefaultContent);

       // 为其他语言翻译并更新多语言文件
       for (const targetLanguage of languages) {
         if (targetLanguage === defaultLanguage) {
           continue;
         }

         // 获取目标语言的多语言文件路径
         const targetLocaleFilePath = LocaleFileUtils.getLocaleFilePath(
           workspaceRoot,
           targetLanguage
         );

         // 读取目标语言的多语言文件
         const targetLocaleContent = LocaleFileUtils.readLocaleFile(targetLocaleFilePath);

         // 找出需要翻译的键（在目标语言文件中不存在的键）
         const keysToTranslateForTarget = finalKeysToTranslate.filter((key) => {
           if (!Object.prototype.hasOwnProperty.call(targetLocaleContent, key)) return true;
           const v = (targetLocaleContent as any)[key];
           // 目标语言中为空或仅引号的值视为缺失，需补齐
           if (v === null || v === undefined) return true;
           const s = String(v).trim();
           return !s || /^["'“”‘’「」『』]+$/.test(s);
         });

         if (keysToTranslateForTarget.length === 0) {
           continue;
         }

         // 获取需要翻译的值（中文原文）
         const valuesToTranslate = keysToTranslateForTarget.map(key => key); // 直接使用中文键作为源文本

         // 翻译键值对
         const translatedEntries = await TranslationService.translateKeyValues(
           keysToTranslateForTarget,
           valuesToTranslate,
           defaultLanguage,
           targetLanguage
         );

         // 更新目标语言的多语言文件
         const updatedTargetContent = LocaleFileUtils.mergeLocaleContent(
           targetLocaleContent,
           translatedEntries
         );
         LocaleFileUtils.writeLocaleFile(targetLocaleFilePath, updatedTargetContent);
       }

       // 显示成功消息
       vscode.window.showInformationMessage(`已成功批量翻译 ${finalKeysToTranslate.length} 个多语言键`);
     } catch (error) {
       console.error('批量翻译失败', error);
       vscode.window.showErrorMessage(`批量翻译失败: ${error}`);
       throw error; // 重新抛出错误，让调用方处理
     } finally {
       // 清除状态栏消息
       statusBarMessage.dispose();
     }
   }
 }
