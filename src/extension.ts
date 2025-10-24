import * as vscode from 'vscode';
import { AutoTranslateService } from './services/autoTranslateService';
import { SyncTranslateService } from './services/syncTranslateService';
import { CleanUnusedKeysService } from './services/cleanUnusedKeysService';

/**
 * 插件激活时调用此方法
 * @param context 扩展上下文
 */
export function activate(context: vscode.ExtensionContext) {
  // 输出诊断信息
  console.log('插件 "ut-auto-translate" 已激活!');

  // 注册命令：手动触发翻译
  const translateCommand = vscode.commands.registerCommand('ut-auto-translate.translate', async () => {
    const editor = vscode.window.activeTextEditor;
    if (editor) {
      await AutoTranslateService.handleFileSaved(editor.document);
      vscode.window.showInformationMessage('手动翻译已完成');
    } else {
      vscode.window.showWarningMessage('没有打开的文件');
    }
  });

  // 注册命令：一键同步翻译（以中文基准）
  const syncCommand = vscode.commands.registerCommand('ut-auto-translate.syncTranslations', async () => {
    try {
      await SyncTranslateService.syncFromDefaultBaseline();
    } catch (error) {
      console.error('一键同步翻译失败', error);
      vscode.window.showErrorMessage(`一键同步翻译失败: ${error}`);
    }
  });

  // 注册命令：清理未使用的翻译键
  const cleanUnusedCommand = vscode.commands.registerCommand('ut-auto-translate.cleanUnusedKeys', async () => {
    try {
      await CleanUnusedKeysService.cleanUnusedKeys();
    } catch (error) {
      console.error('清理未使用的翻译键失败', error);
      vscode.window.showErrorMessage(`清理未使用的翻译键失败: ${error}`);
    }
  });

  // 注册文件保存事件监听器
  const saveListener = vscode.workspace.onDidSaveTextDocument(async (document) => {
    // 检查文件类型是否为JavaScript/TypeScript/React
    const supportedLanguages = ['javascript', 'javascriptreact', 'typescript', 'typescriptreact'];
    if (supportedLanguages.includes(document.languageId)) {
      // 检查翻译模式
      const config = vscode.workspace.getConfiguration('ut-auto-translate');
      const translationMode = config.get<string>('translationMode', 'auto');
      
      // 只有在自动模式下才在保存时触发翻译
      if (translationMode === 'auto') {
        await AutoTranslateService.handleFileSaved(document);
      }
    }
  });

  // 将所有注册的事件监听器和命令添加到上下文中
  context.subscriptions.push(translateCommand, syncCommand, cleanUnusedCommand, saveListener);
}

/**
 * 插件停用时调用此方法
 */
export function deactivate() {
  console.log('插件 "ut-auto-translate" 已停用!');
}
