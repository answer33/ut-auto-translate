import * as vscode from "vscode";
import * as fs from "fs";
import { LocaleFileUtils } from "../utils/localeFileUtils";

/**
 * 清理未使用翻译键服务
 * 用于检测并清理所有语言文件中未使用的翻译键
 */
export class CleanUnusedKeysService {
  /**
   * 扫描项目中的所有代码文件，检查翻译键的使用情况
   * @param translationKeys 需要检查的翻译键数组
   * @returns 未使用的翻译键数组
   */
  private static async findUnusedKeys(
    translationKeys: string[]
  ): Promise<string[]> {
    const config = vscode.workspace.getConfiguration("ut-auto-translate");
    const i18nLibrary = config.get<string>("i18nLibrary", "di18n");

    // 构建搜索模式（排除 node_modules 和 locales 目录）
    const searchPattern = "**/*.{js,jsx,ts,tsx}";
    const excludePattern = "**/node_modules/**";

    // 用于记录每个键是否被使用
    const keyUsageMap = new Map<string, boolean>();
    translationKeys.forEach((key) => keyUsageMap.set(key, false));

    // 显示进度条
    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: "正在检查翻译键使用情况",
        cancellable: false,
      },
      async (progress) => {
        // 步骤1: 查找所有文件（只执行一次）
        progress.report({ message: "正在查找代码文件...", increment: 10 });
        const files = await vscode.workspace.findFiles(
          searchPattern,
          excludePattern
        );

        if (files.length === 0) {
          return;
        }

        // 步骤2: 遍历所有文件，检查键的使用情况
        const totalFiles = files.length;
        let processedFiles = 0;

        for (const file of files) {
          processedFiles++;
          const fileName = file.fsPath.split("/").pop() || file.fsPath;
          progress.report({
            message: `检查文件 (${processedFiles}/${totalFiles}): ${fileName}`,
            increment: (90 / totalFiles), // 剩余90%的进度
          });

          try {
            const document = await vscode.workspace.openTextDocument(file);
            const content = document.getText();

            // 在当前文件中检查所有还未被标记为使用的键
            for (const [key, isUsed] of keyUsageMap.entries()) {
              if (!isUsed && this.checkKeyInContent(content, key, i18nLibrary)) {
                keyUsageMap.set(key, true);
              }
            }

            // 如果所有键都已被找到，可以提前退出
            const allKeysFound = Array.from(keyUsageMap.values()).every((used) => used);
            if (allKeysFound) {
              progress.report({
                message: "所有翻译键都已找到，提前完成检查",
                increment: 100,
              });
              break;
            }
          } catch (error) {
            console.error(`读取文件失败: ${file.fsPath}`, error);
          }
        }
      }
    );

    // 收集未使用的键
    const unusedKeys: string[] = [];
    for (const [key, isUsed] of keyUsageMap.entries()) {
      if (!isUsed) {
        unusedKeys.push(key);
      }
    }

    return unusedKeys;
  }

  /**
   * 在文件内容中检查键是否被使用
   * @param content 文件内容
   * @param key 翻译键
   * @param i18nLibrary 多语言库类型
   * @returns 是否被使用
   */
  private static checkKeyInContent(
    content: string,
    key: string,
    i18nLibrary: string
  ): boolean {
    // 转义特殊字符，但要保留模板变量的语法
    // 对于正则表达式特殊字符，需要转义；但对于翻译键中的模板变量（如 {{count}}），也需要正确转义
    const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    // 构建多个可能的匹配模式
    const patterns: RegExp[] = [];

    if (i18nLibrary === "i18next") {
      // i18next 支持多种调用方式：
      // 1. i18next.t('key')
      // 2. i18next.t("key")
      // 3. i18next.t('key', {...})
      // 4. t('key') - 但不包括 intl.t('key')
      // 5. t("key")
      // 6. t('key', {...})

      // 匹配规则说明：
      // - ['"] 匹配单引号或双引号（开始）
      // - ${escapedKey} 匹配转义后的键
      // - ['"] 匹配单引号或双引号（结束）
      // - \\s* 匹配可选的空格
      // - [,)] 匹配逗号（有参数）或右括号（无参数）
      // 这样可以匹配：t('key') 或 t('key', ...) 或 t('key'\n, ...)

      // 匹配 i18next.t('key') 或 i18next.t("key") 或 i18next.t('key', ...)
      patterns.push(
        new RegExp(
          `i18next\\.t\\(\\s*['"]${escapedKey}['"]\\s*[,)]`,
          "g"
        )
      );

      // 匹配 t('key') 或 t("key") 或 t('key', ...)，但不匹配 intl.t('key')
      // 使用负向后查找确保前面不是 intl.
      patterns.push(
        new RegExp(
          `(?<!intl\\.)\\bt\\(\\s*['"]${escapedKey}['"]\\s*[,)]`,
          "g"
        )
      );
    } else {
      // di18n 使用 intl.t('key') 或 intl.t("key") 或 intl.t('key', ...)
      patterns.push(
        new RegExp(
          `intl\\.t\\(\\s*['"]${escapedKey}['"]\\s*[,)]`,
          "g"
        )
      );
    }

    // 检查是否有任何一个模式匹配
    return patterns.some((pattern) => pattern.test(content));
  }

  /**
   * 从所有语言文件中移除指定的键
   * @param workspaceRoot 工作区根目录
   * @param keysToRemove 需要移除的键数组
   * @returns 实际移除的键数量
   */
  private static async removeKeysFromAllLocales(
    workspaceRoot: string,
    keysToRemove: string[]
  ): Promise<number> {
    const config = vscode.workspace.getConfiguration("ut-auto-translate");
    const languages = config.get<string[]>("languages", ["zh-CN"]);
    let totalRemoved = 0;

    for (const language of languages) {
      const localeFilePath = LocaleFileUtils.getLocaleFilePath(
        workspaceRoot,
        language
      );

      if (!fs.existsSync(localeFilePath)) {
        continue;
      }

      try {
        const localeContent = LocaleFileUtils.readLocaleFile(localeFilePath);
        let removed = 0;

        // 移除未使用的键
        for (const key of keysToRemove) {
          if (Object.prototype.hasOwnProperty.call(localeContent, key)) {
            delete localeContent[key];
            removed++;
          }
        }

        if (removed > 0) {
          // 保存更新后的文件（保留原有排序）
          LocaleFileUtils.writeLocaleFile(localeFilePath, localeContent, true);
          totalRemoved += removed;
          console.log(`已从 ${language}.json 移除 ${removed} 个未使用的键`);
        }
      } catch (error) {
        console.error(`处理语言文件失败: ${language}`, error);
      }
    }

    return totalRemoved;
  }

  /**
   * 执行清理未使用的翻译键
   * 基于默认语言文件（通常是 zh-CN.json）
   */
  public static async cleanUnusedKeys(): Promise<void> {
    try {
      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (!workspaceFolders || workspaceFolders.length === 0) {
        vscode.window.showErrorMessage("未找到工作区文件夹");
        return;
      }

      const workspaceRoot = workspaceFolders[0].uri.fsPath;
      const config = vscode.workspace.getConfiguration("ut-auto-translate");
      const defaultLanguage = config.get<string>("defaultLanguage", "zh-CN");

      // 读取基准语言文件
      const baselineFilePath = LocaleFileUtils.getLocaleFilePath(
        workspaceRoot,
        defaultLanguage
      );

      if (!fs.existsSync(baselineFilePath)) {
        vscode.window.showErrorMessage(
          `默认语言文件 ${defaultLanguage}.json 不存在`
        );
        return;
      }

      const baselineContent = LocaleFileUtils.readLocaleFile(baselineFilePath);
      const allKeys = Object.keys(baselineContent);

      if (allKeys.length === 0) {
        vscode.window.showInformationMessage(
          `默认语言文件 ${defaultLanguage}.json 中没有翻译键`
        );
        return;
      }

      // 查找未使用的键（进度条会在 findUnusedKeys 内部显示）
      const unusedKeys = await this.findUnusedKeys(allKeys);

      if (unusedKeys.length === 0) {
        vscode.window.showInformationMessage(
          "未发现未使用的翻译键，所有翻译键都在使用中！"
        );
        return;
      }

      // 询问用户是否确认删除
      const confirmation = await vscode.window.showWarningMessage(
        `发现 ${unusedKeys.length} 个未使用的翻译键，是否要从所有语言文件中删除？\n\n未使用的键示例：${unusedKeys.slice(0, 5).join(", ")}${unusedKeys.length > 5 ? "..." : ""}`,
        { modal: true },
        "确认删除",
        "取消"
      );

      if (confirmation !== "确认删除") {
        vscode.window.showInformationMessage("已取消清理操作");
        return;
      }

      // 执行删除
      const removedCount = await this.removeKeysFromAllLocales(
        workspaceRoot,
        unusedKeys
      );

      vscode.window.showInformationMessage(
        `清理完成！共从所有语言文件中移除了 ${removedCount} 个未使用的翻译键（${unusedKeys.length} 个唯一键）`
      );

      // 输出详细的清理报告到输出面板
      const outputChannel = vscode.window.createOutputChannel(
        "UT Auto Translate - 清理报告"
      );
      outputChannel.clear();
      outputChannel.appendLine("=== 翻译键清理报告 ===");
      outputChannel.appendLine(`扫描时间: ${new Date().toLocaleString()}`);
      outputChannel.appendLine(`总键数: ${allKeys.length}`);
      outputChannel.appendLine(`未使用键数: ${unusedKeys.length}`);
      outputChannel.appendLine(`已移除次数: ${removedCount}`);
      outputChannel.appendLine("\n未使用的键列表:");
      unusedKeys.forEach((key, index) => {
        outputChannel.appendLine(`  ${index + 1}. ${key}`);
      });
      outputChannel.show();
    } catch (error) {
      console.error("清理未使用的翻译键失败", error);
      vscode.window.showErrorMessage(
        `清理未使用的翻译键失败: ${error}`
      );
    }
  }
}
