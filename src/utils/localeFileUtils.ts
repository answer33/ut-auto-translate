import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

/**
 * 多语言文件工具类
 * 用于处理多语言文件的读取、写入和格式化
 */
export class LocaleFileUtils {
  /**
   * 获取多语言文件路径
   * @param workspaceRoot 工作区根目录
   * @param locale 语言代码
   * @returns 多语言文件的完整路径
   */
  public static getLocaleFilePath(workspaceRoot: string, locale: string): string {
    const config = vscode.workspace.getConfiguration('ut-auto-translate');
    const localesDir = config.get<string>('localesDir', 'locales');
    return path.join(workspaceRoot, localesDir, `${locale}.json`);
  }

  /**
   * 读取多语言文件内容
   * @param filePath 文件路径
   * @returns 解析后的JSON对象，如果文件不存在则返回空对象
   */
  public static readLocaleFile(filePath: string): Record<string, string> {
    try {
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(content);
      }
    } catch (error) {
      console.error(`读取多语言文件失败: ${filePath}`, error);
    }
    return {};
  }

  /**
   * 写入多语言文件
   * @param filePath 文件路径
   * @param content 要写入的内容
   * @param preserveOrder 是否保留原有排序
   */
  public static writeLocaleFile(filePath: string, content: Record<string, string>, preserveOrder = true): void {
    try {
      // 确保目录存在
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      let jsonContent: string;
      if (preserveOrder) {
        // 保留原有排序，使用格式化的JSON
        jsonContent = JSON.stringify(content, null, 2);
      } else {
        // 按键名排序
        const sortedContent = Object.keys(content)
          .sort()
          .reduce((obj: Record<string, string>, key: string) => {
            obj[key] = content[key];
            return obj;
          }, {});
        jsonContent = JSON.stringify(sortedContent, null, 2);
      }

      fs.writeFileSync(filePath, jsonContent, 'utf8');
    } catch (error) {
      console.error(`写入多语言文件失败: ${filePath}`, error);
      throw error;
    }
  }

  /**
   * 合并多语言内容
   * @param original 原始内容
   * @param newEntries 新增内容
   * @returns 合并后的内容
   */
  public static mergeLocaleContent(original: Record<string, string>, newEntries: Record<string, string>): Record<string, string> {
    return { ...original, ...newEntries };
  }

  /**
   * 检查多语言键是否存在
   * @param filePath 文件路径
   * @param key 多语言键
   * @returns 是否存在
   */
  public static hasLocaleKey(filePath: string, key: string): boolean {
    const content = this.readLocaleFile(filePath);
    return Object.prototype.hasOwnProperty.call(content, key);
  }
}