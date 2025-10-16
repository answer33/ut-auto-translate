import * as vscode from "vscode";
import axios from "axios";
import { simpleToTradition } from "chinese-simple2traditional";

/**
 * 翻译服务
 * 用于调用大语言模型API进行翻译
 */
import { TranslateCacheUtils } from "../utils/translateCacheUtils";

export class TranslationService {
  // siliconflow API 默认密钥
  private static readonly DEFAULT_API_KEY =
    "sk-tgbpspouqmoibkaennrnsehiojvesacsdwgidyvgiailupya";
  // siliconflow API 端点
  private static readonly API_ENDPOINT =
    "https://api.siliconflow.cn/v1/chat/completions";
  // 使用的模型
  private static readonly MODEL = "Qwen/Qwen2-7B-Instruct";

  /**
   * 获取API密钥
   * @returns API密钥
   */
  private static getApiKey(): string {
    const config = vscode.workspace.getConfiguration("ut-auto-translate");
    const apiKey = config.get<string>("apiKey", "");

    // 如果用户未设置密钥，使用默认密钥
    return apiKey || this.DEFAULT_API_KEY;
  }

  /**
   * 获取工作区根目录（用于缓存路径等）
   */
  private static getWorkspaceRoot(): string | null {
    const folders = vscode.workspace.workspaceFolders;
    if (!folders || folders.length === 0) return null;
    return folders[0].uri.fsPath;
  }

  /**
   * 使用siliconflow API翻译文本
   * @param text 要翻译的文本
   * @param sourceLanguage 源语言
   * @param targetLanguage 目标语言
   * @returns 翻译后的文本
   */
  public static async translateWithSiliconflow(
    text: string,
    sourceLanguage: string,
    targetLanguage: string
  ): Promise<string> {
    try {
      const apiKey = this.getApiKey();
      
      // 提取文本中的变量占位符，如 {slot0}, {{name}} 等
      const placeholders: string[] = [];
      const placeholderRegex = /\{+[^}]+\}+/g;
      let match;
      while ((match = placeholderRegex.exec(text)) !== null) {
        placeholders.push(match[0]);
      }

      const response = await axios.post(
        this.API_ENDPOINT,
        {
          model: this.MODEL,
          messages: [
            {
              role: "system",
              content: `你是一个专业的翻译助手。请将以下文本从${sourceLanguage}翻译成${targetLanguage}，只返回翻译结果本身，不要添加任何解释、编号或引号。保持专业、自然的翻译风格。

严格要求：
1) 不要在翻译两端包裹任何引号（不要 '、"、“” 等）；
2) 不要输出空字符串；若无法翻译，请原样输出；
3) 如果输入是按行编号的列表（如 1. xxx\n2. yyy），请逐行翻译并保持行数一致，每行只包含译文本身（不包含行号和多余字符）；
4) 文本中可能包含如 {slot0}, {name}, {{x}} 等变量占位符，这些占位符必须保持原样不变，不要翻译它们。`,
            },
            {
              role: "user",
              content: text,
            },
          ],
          temperature: 0.3,
          max_tokens: 1000,
        },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
        }
      );

      let translatedText =
        response.data.choices[0]?.message?.content?.trim() || text;

      // 验证所有占位符是否都在翻译结果中
      for (const placeholder of placeholders) {
        if (!translatedText.includes(placeholder)) {
          console.warn(`翻译结果中缺少占位符 ${placeholder}，尝试修复...`);
          // 如果缺少占位符，尝试再次翻译或使用原文
          return text; // 如果占位符丢失，返回原文以保证安全
        }
      }

      return translatedText;
    } catch (error: any) {
      console.error("Siliconflow翻译失败", error);
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(
          `Siliconflow翻译失败: ${error.response.status} ${error.response.statusText}`
        );
      } else {
        throw new Error(`Siliconflow翻译失败: ${error}`);
      }
    }
  }

  /**
   * 使用 chinese-simple2traditional 库进行简繁转换
   */
  private static async convertToTraditional(text: string): Promise<string> {
    try {
      return simpleToTradition(text);
    } catch (error) {
      console.error("简繁转换失败:", error);
      return text;
    }
  }

  /**
   * 规范化/清洗翻译结果：去除包裹引号、空白；若为空则回退原文
   */
  private static sanitizeTranslatedText(original: string, text: string): string {
    let s = (text ?? "").trim();
    if (!s) return "";

    const pairs: Array<[string, string]> = [["\"", "\""]];
    let changed = true;
    while (changed && s.length >= 2) {
      changed = false;
      for (const [l, r] of pairs) {
        if (s.startsWith(l) && s.endsWith(r)) {
          s = s.slice(l.length, s.length - r.length).trim();
          changed = true;
        }
      }
    }

    // 若清洗后仅剩引号/为空，则视为无效
    if (!s || /^["'“”‘’「」『』]+$/.test(s)) {
      return "";
    }
    return s;
  }

  /**
   * 翻译多语言键值对
   * @param keys 要翻译的键数组
   * @param values 对应的值数组（源语言）
   * @param sourceLanguage 源语言
   * @param targetLanguage 目标语言
   * @param onProgress 进度回调函数
   * @returns 翻译后的键值对对象
   */
  public static async translateKeyValues(
    keys: string[],
    values: string[],
    sourceLanguage: string,
    targetLanguage: string,
    onProgress?: (deltaProcessed: number) => void
  ): Promise<Record<string, string>> {
    if (keys.length !== values.length) {
      throw new Error("键和值的数量不匹配");
    }

    const result: Record<string, string> = {};
    const workspaceRoot = this.getWorkspaceRoot();

    // 如果目标语言是zh-TW且源语言是zh-CN，使用简繁转换（最快路径）
    if (targetLanguage === "zh-TW" && sourceLanguage === "zh-CN") {
      for (let i = 0; i < keys.length; i++) {
        result[keys[i]] = await this.convertToTraditional(values[i]);
      }
      return result;
    }

    const config = vscode.workspace.getConfiguration("ut-auto-translate");
    const batchCharLimit = config.get<number>("batchCharLimit", 1800);

    // 1) 先用本地缓存命中，减少请求量
    const pendingKeys: string[] = [];
    const pendingValues: string[] = [];
    let cacheHits = 0;
    for (let i = 0; i < keys.length; i++) {
      const k = keys[i];
      const v = values[i];
      const cached = workspaceRoot
        ? TranslateCacheUtils.get(workspaceRoot, sourceLanguage, targetLanguage, v)
        : undefined;
      if (cached !== undefined) {
        result[k] = cached;
        cacheHits++;
      } else {
        pendingKeys.push(k);
        pendingValues.push(v);
      }
    }

    if (pendingKeys.length === 0) {
      if (onProgress && cacheHits > 0) onProgress(cacheHits);
      return result;
    }

    if (onProgress && cacheHits > 0) onProgress(cacheHits);

    // 2) 动态按字符数进行分批，降低 API 调用次数
    const batches: { keys: string[]; values: string[] }[] = [];
    let curKeys: string[] = [];
    let curValues: string[] = [];
    let curChars = 0;

    for (let i = 0; i < pendingValues.length; i++) {
      const line = `${curValues.length + 1}. ${pendingValues[i]}`;
      const added = line.length + (curValues.length > 0 ? 1 : 0); // \n 开销
      if (curValues.length > 0 && curChars + added > batchCharLimit) {
        batches.push({ keys: curKeys, values: curValues });
        curKeys = [];
        curValues = [];
        curChars = 0;
      }
      curKeys.push(pendingKeys[i]);
      curValues.push(pendingValues[i]);
      curChars += added;
    }
    if (curValues.length > 0) {
      batches.push({ keys: curKeys, values: curValues });
    }

    // 3) 批量请求翻译；逐行占位符校验；失败回退单条
    const placeholderRegex = /\{+[^}]+\}+/g;
    for (const b of batches) {
      const batchText = b.values.map((v, idx) => `${idx + 1}. ${v}`).join("\n");
      try {
        const translatedText = await this.translateWithSiliconflow(
          batchText,
          sourceLanguage,
          targetLanguage
        );

        const translatedLines = translatedText.split("\n");
        const exactEcho = translatedText.trim() === batchText.trim();

        if (exactEcho) {
          // 视为批量失败，逐条尝试
          throw new Error("批量翻译回显原文，降级为单条翻译");
        }

        for (let j = 0; j < b.keys.length; j++) {
          const original = b.values[j];
          const line = translatedLines[j] ?? '';
          const cleaned = this.sanitizeTranslatedText(original, line.replace(/^\d+\.\s*/, "").trim());
          const candidate = cleaned || original; // 空则回退
          const placeholders = original.match(placeholderRegex) ?? [];
          const ok = placeholders.every(p => candidate.includes(p));
          const finalText = ok ? candidate : original;
          result[b.keys[j]] = finalText;
          if (workspaceRoot) {
            TranslateCacheUtils.set(workspaceRoot, sourceLanguage, targetLanguage, original, finalText);
          }
        }
        if (onProgress) onProgress(b.keys.length);
      } catch (error) {
        console.error(`批量翻译失败: ${b.keys.join(", ")}`, error);
        for (let j = 0; j < b.keys.length; j++) {
          try {
            const single = await this.translateWithSiliconflow(
              b.values[j],
              sourceLanguage,
              targetLanguage
            );
            const cleaned = this.sanitizeTranslatedText(b.values[j], single);
            const candidate = cleaned || b.values[j];
            const placeholders = b.values[j].match(placeholderRegex) ?? [];
            const ok = placeholders.every(p => candidate.includes(p));
            const finalText = ok ? candidate : b.values[j];
            result[b.keys[j]] = finalText;
            if (workspaceRoot) {
              TranslateCacheUtils.set(workspaceRoot, sourceLanguage, targetLanguage, b.values[j], finalText);
            }
          } catch (innerError) {
            console.error(`单个翻译失败: ${b.keys[j]}`, innerError);
            result[b.keys[j]] = b.values[j];
          }
        }
        if (onProgress) onProgress(b.keys.length);
      }
    }

    // 刷新缓存落盘，避免频繁写入带来的状态栏抖动
    try {
      const { TranslateCacheUtils } = await import('../utils/translateCacheUtils');
      TranslateCacheUtils.flush(workspaceRoot);
    } catch {}

    return result;
  }
}
