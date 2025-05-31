/**
 * chinese-simple2traditional 模块的 TypeScript 类型声明
 * 提供简体中文和繁体中文之间的转换功能
 */
declare module 'chinese-simple2traditional' {
  /**
   * 简体转繁体的转换函数
   * @param text 要转换的简体中文文本
   * @returns 转换后的繁体中文文本
   */
  export function simpleToTradition(text: string): string;

  /**
   * 繁体转简体的转换函数
   * @param text 要转换的繁体中文文本
   * @returns 转换后的简体中文文本
   */
  export function traditionToSimple(text: string): string;
}