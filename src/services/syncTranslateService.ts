import * as vscode from 'vscode';
import { LocaleFileUtils } from '../utils/localeFileUtils';
import { TranslationService } from './translationService';
import { IntlKeyExtractor } from '../utils/intlKeyExtractor';
import { TranslationLock } from '../utils/translationLock';

/**
 * 基于默认语言（中文）基准的一键同步翻译服务
 */
export class SyncTranslateService {
  private static syncInProgress = false;

  public static isSyncing(): boolean {
    return this.syncInProgress;
  }
  private static isInvalidValue(val: unknown): boolean {
    if (val === null || val === undefined) return true;
    const s = String(val).trim();
    if (!s) return true;
    // 仅由引号组成（包括中英文引号）视为无效
    if (/^["'“”‘’「」『』]+$/.test(s)) return true;
    return false;
  }
  /**
   * 以默认语言文件为基准（如 zh-CN.json），将缺失的键批量翻译到其它语言文件
   */
  public static async syncFromDefaultBaseline(): Promise<void> {
    const folders = vscode.workspace.workspaceFolders;
    if (!folders || folders.length === 0) {
      vscode.window.showWarningMessage('未检测到工作区，请在有项目的工作区内执行命令');
      return;
    }

    // 当前仅针对第一个工作区执行（常见场景）
    const workspaceRoot = folders[0].uri.fsPath;

    const config = vscode.workspace.getConfiguration('ut-auto-translate');
    const languages = config.get<string[]>('languages', ['zh-CN', 'en-US', 'es-ES', 'fr-FR', 'zh-TW']);
    const defaultLanguage = config.get<string>('defaultLanguage', 'zh-CN');

    if (!languages.includes(defaultLanguage)) {
      vscode.window.showErrorMessage(`默认语言 ${defaultLanguage} 不在配置的语言列表中`);
      return;
    }

    const baselinePath = LocaleFileUtils.getLocaleFilePath(workspaceRoot, defaultLanguage);
    const baseline = LocaleFileUtils.readLocaleFile(baselinePath);

    const baselineKeys = Object.keys(baseline).filter((k) => !IntlKeyExtractor.shouldIgnoreKey(k));
    if (baselineKeys.length === 0) {
      vscode.window.showInformationMessage(`默认语言文件(${defaultLanguage})暂无可同步的键`);
      return;
    }

    try {
      await TranslationLock.runExclusive(async () => {
        SyncTranslateService.syncInProgress = true;
        try {
          await vscode.window.withProgress(
          {
            location: vscode.ProgressLocation.Window,
            title: 'UT: 正在一键同步翻译...',
            cancellable: false,
          },
          async (progress) => {
            // 预计算每个目标语言的缺失键与总任务量
            const missingMap = new Map<string, string[]>();
            let totalMissing = 0;
            for (const lang of languages) {
              if (lang === defaultLanguage) continue;
              const targetPath = LocaleFileUtils.getLocaleFilePath(workspaceRoot, lang);
              const targetContent = LocaleFileUtils.readLocaleFile(targetPath);
              const missingKeys = baselineKeys.filter((k) => {
                if (!Object.prototype.hasOwnProperty.call(targetContent, k)) return true;
                return SyncTranslateService.isInvalidValue((targetContent as any)[k]);
              });
              if (missingKeys.length > 0) {
                missingMap.set(lang, missingKeys);
                totalMissing += missingKeys.length;
              }
            }

            if (totalMissing === 0) {
              vscode.window.showInformationMessage('一键同步翻译完成：无需更新');
              return;
            }

            let processed = 0; // 用于进度百分比
            let writtenTotal = 0; // 实际写入（补齐/覆盖无效）总数
            let lastPercent = 0;
            progress.report({ message: `0%`, increment: 0 });

            for (const lang of languages) {
              if (lang === defaultLanguage) continue;
              const missingKeys = missingMap.get(lang) || [];
              if (missingKeys.length === 0) continue;

              const targetPath = LocaleFileUtils.getLocaleFilePath(workspaceRoot, lang);
              const targetContent = LocaleFileUtils.readLocaleFile(targetPath);
              const valuesToTranslate = missingKeys.map((k) => baseline[k] ?? k);

              const translated = await TranslationService.translateKeyValues(
                missingKeys,
                valuesToTranslate,
                defaultLanguage,
                lang,
                (delta) => {
                  processed += delta;
                  const percent = Math.min(100, Math.floor((processed / totalMissing) * 100));
                  const inc = Math.max(0, percent - lastPercent);
                  lastPercent = percent;
                  progress.report({ message: `${percent}%`, increment: inc });
                }
              );

              const updated = LocaleFileUtils.mergeLocaleContent(targetContent, translated);
              LocaleFileUtils.writeLocaleFile(targetPath, updated);
              writtenTotal += missingKeys.length;
            }

            // 完成提示以实际写入数量为准
            vscode.window.showInformationMessage(`一键同步翻译完成：共新增 ${writtenTotal} 个键`);
          }
        );
        } finally {
          SyncTranslateService.syncInProgress = false;
        }
      });
    } catch (error) {
      console.error('一键同步翻译过程出错', error);
      throw error;
    }
  }
}
