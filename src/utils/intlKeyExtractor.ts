import * as vscode from "vscode";

/**
 * 多语言键提取器
 * 用于从代码中提取多语言调用的键
 */
export class IntlKeyExtractor {
  // 匹配intl.t(key, option)调用的正则表达式 (di18n)
  private static readonly DI18N_PATTERN =
    /intl\.t\(\s*['"]([\s\S]*?)['"]\s*(?:,\s*([^)]*))?\)/g;

  // 匹配i18next.t(key, option)或t(key, option)调用的正则表达式 (i18next)
  private static readonly I18NEXT_PATTERN =
    /(?:^|\s|\(|\.|;|,|\{|\})(?:i18next\.t|(?<!intl\.)t)\(\s*['"]([\s\S]*?)['"]\s*(?:,\s*([^)]*))?\)/g;

  /**
   * 获取当前配置的多语言库类型
   * @returns 多语言库类型
   */
  private static getI18nLibraryType(): string {
    const config = vscode.workspace.getConfiguration("ut-auto-translate");
    return config.get<string>("i18nLibrary", "di18n");
  }

  /**
   * 从文本内容中提取所有多语言调用的键
   * @param content 文本内容
   * @returns 提取到的键数组
   */
  public static extractKeysFromContent(content: string): string[] {
    const keys: string[] = [];
    let match;
    const libraryType = this.getI18nLibraryType();

    // 根据配置选择使用的正则表达式
    const pattern =
      libraryType === "i18next" ? this.I18NEXT_PATTERN : this.DI18N_PATTERN;

    // 重置正则表达式的lastIndex
    pattern.lastIndex = 0;

    // 循环匹配所有多语言调用
    while ((match = pattern.exec(content)) !== null) {
      if (match[1]) {
        keys.push(match[1]);
      }
    }

    // 去重
    return [...new Set(keys)];
  }

  /**
   * 从文档中提取所有多语言调用的键
   * @param document 文档对象
   * @returns 提取到的键数组
   */
  public static extractKeysFromDocument(
    document: vscode.TextDocument
  ): string[] {
    const content = document.getText();
    return this.extractKeysFromContent(content);
  }

  /**
   * 检查键是否应该被忽略
   * @param key 多语言键
   * @returns 是否应该忽略
   */
  public static shouldIgnoreKey(key: string): boolean {
    const config = vscode.workspace.getConfiguration("ut-auto-translate");
    const ignoreKeys = config.get<string[]>("ignoreKeys", []);

    return ignoreKeys.some((pattern) => {
      // 支持通配符匹配
      if (pattern.includes("*")) {
        const regex = new RegExp("^" + pattern.replace(/\*/g, ".*") + "$");
        return regex.test(key);
      }
      return key === pattern;
    });
  }

  /**
   * 检查文件路径是否应该被忽略
   * @param filePath 文件路径
   * @returns 是否应该忽略
   */
  public static shouldIgnorePath(filePath: string): boolean {
    const config = vscode.workspace.getConfiguration("ut-auto-translate");
    const ignorePaths = config.get<string[]>("ignorePaths", []);

    return ignorePaths.some((pattern) => {
      // 支持glob模式匹配
      if (pattern.includes("*")) {
        const regex = new RegExp("^" + pattern.replace(/\*/g, ".*") + "$");
        return regex.test(filePath);
      }
      return filePath === pattern;
    });
  }
}
