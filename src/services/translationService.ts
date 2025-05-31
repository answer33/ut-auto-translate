import * as vscode from "vscode";
import axios from "axios";
import { simpleToTradition } from "chinese-simple2traditional";

/**
 * 翻译服务
 * 用于调用大语言模型API进行翻译
 */
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

      // 提取文本中的变量占位符，如 {slot0}, {name} 等
      const placeholders: string[] = [];
      const placeholderRegex = /\{([^}]+)\}/g;
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
              content: `你是一个专业的翻译助手。请将以下文本从${sourceLanguage}翻译成${targetLanguage}，只返回翻译结果，不要添加任何解释或额外内容。保持专业、自然的翻译风格。

重要：文本中可能包含如 {slot0}, {name}, {{x}} 等变量占位符，这些占位符必须保持原样不变，不要翻译它们。例如，"{{x}}开始时间必须大于等于{slot0}" 翻译成英文时应该是 "{{x}} Start time must be greater than or equal to {slot0}"，保留 {{x}} {slot0} 不变。`,
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
   * 翻译多语言键值对
   * @param keys 要翻译的键数组
   * @param values 对应的值数组（源语言）
   * @param sourceLanguage 源语言
   * @param targetLanguage 目标语言
   * @returns 翻译后的键值对对象
   */
  public static async translateKeyValues(
    keys: string[],
    values: string[],
    sourceLanguage: string,
    targetLanguage: string
  ): Promise<Record<string, string>> {
    if (keys.length !== values.length) {
      throw new Error("键和值的数量不匹配");
    }

    const result: Record<string, string> = {};

    // 如果目标语言是zh-TW且源语言是zh-CN，使用简繁转换
    if (targetLanguage === "zh-TW" && sourceLanguage === "zh-CN") {
      for (let i = 0; i < keys.length; i++) {
        result[keys[i]] = await this.convertToTraditional(values[i]);
      }
      return result;
    }

    // 批量翻译以提高效率
    const batchSize = 10;
    for (let i = 0; i < keys.length; i += batchSize) {
      const batchKeys = keys.slice(i, i + batchSize);
      const batchValues = values.slice(i, i + batchSize);

      // 构建批量翻译的文本
      const batchText = batchValues
        .map((value, index) => `${index + 1}. ${value}`)
        .join("\n");

      try {
        // 翻译整批文本
        const translatedText = await this.translateWithSiliconflow(
          batchText,
          sourceLanguage,
          targetLanguage
        );

        // 解析翻译结果
        const translatedLines = translatedText.split("\n");
        for (
          let j = 0;
          j < batchKeys.length && j < translatedLines.length;
          j++
        ) {
          // 移除行号前缀（如"1. "）
          const translatedValue = translatedLines[j]
            .replace(/^\d+\.\s*/, "")
            .trim();
          result[batchKeys[j]] = translatedValue;
        }
      } catch (error) {
        console.error(`批量翻译失败: ${batchKeys.join(", ")}`, error);
        // 如果批量翻译失败，尝试逐个翻译
        for (let j = 0; j < batchKeys.length; j++) {
          try {
            const translatedValue = await this.translateWithSiliconflow(
              batchValues[j],
              sourceLanguage,
              targetLanguage
            );
            result[batchKeys[j]] = translatedValue;
          } catch (innerError) {
            console.error(`单个翻译失败: ${batchKeys[j]}`, innerError);
            // 如果翻译失败，使用原始值
            result[batchKeys[j]] = batchValues[j];
          }
        }
      }

      // 添加延迟以避免API限制
      if (i + batchSize < keys.length) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    return result;
  }
}
