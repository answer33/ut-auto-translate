# Change Log

All notable changes to the "ut-auto-translate" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## [Unreleased]

## [0.0.3] - 2025-10-14

### Added
- 新增命令：`UT: 一键同步翻译（从中文基准）`（`ut-auto-translate.syncTranslations`）
  - 以默认语言文件（通常 `zh-CN.json`）为基准，补齐所有配置语言的缺失键
  - 资源管理器与编辑器右键在 `zh-CN.json` 上显示快捷入口
  - 新增激活事件：`onCommand:ut-auto-translate.syncTranslations`
- 进度展示
  - 同步过程使用窗口进度条，实时百分比更新
  - 自动/手动翻译在同步进行时显示“已排队（正在同步）”的状态栏提示
- 性能配置
  - `ut-auto-translate.enableCache`：开启本地缓存（默认开启）
  - `ut-auto-translate.batchCharLimit`：按字符数动态分批（默认 1800）

### Changed
- 并发控制：引入全局互斥锁，确保“同步/自动/手动翻译”互斥执行，避免写文件冲突
- 动态分批：由固定条数改为按字符数分批，移除固定 1 秒延迟
- 同步进度：
- 进度条标题与消息去重，消息仅显示“百分比”
- 文案与入口：在 `zh-CN.json` 右键显示“一键同步”，避免干扰其他文件

### Fixed
- 译文清洗：去除模型输出中凭空包裹的引号（' " “ ” ‘ ’ 「 」 『 』），空结果回退为原文
- 缺失识别：将空值或仅引号的旧译视为“缺失”重新翻译并覆盖
- 降噪 IO：本地缓存落盘节流（累计或定时批量写入），减少频繁写入 `.ut-auto-translate-cache.json`
- 持续保持占位符完整性校验，不合规回退原文

## [0.0.2] - 2025-06-09

### Fixed
- 修复正则表达式无法识别跨行多语言调用的问题
- 优化多语言键提取器，支持函数调用中的空白字符匹配
- 现在可以正确识别如 `intl.t( '文本' )` 和跨行格式的多语言调用

### Improved
- 增强了对 di18n 和 i18next 两种多语言库的兼容性
- 提升了多语言键提取的准确性和稳定性

- Initial release
