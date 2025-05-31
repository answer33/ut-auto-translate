import * as vscode from 'vscode';
import { AutoTranslateService } from './services/autoTranslateService';

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

  // 注册命令：显示插件信息
  const helloCommand = vscode.commands.registerCommand('ut-auto-translate.helloWorld', () => {
    vscode.window.showInformationMessage('UT Auto Translate: 自动生成多语言翻译文案');
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
  context.subscriptions.push(translateCommand, helloCommand, saveListener);
}

/**
 * 插件停用时调用此方法
 */
export function deactivate() {
  console.log('插件 "ut-auto-translate" 已停用!');
}
