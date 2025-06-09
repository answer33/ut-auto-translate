# Change Log

All notable changes to the "ut-auto-translate" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## [Unreleased]

## [0.0.2] - 2025-06-09

### Fixed
- 修复正则表达式无法识别跨行多语言调用的问题
- 优化多语言键提取器，支持函数调用中的空白字符匹配
- 现在可以正确识别如 `intl.t( '文本' )` 和跨行格式的多语言调用

### Improved
- 增强了对 di18n 和 i18next 两种多语言库的兼容性
- 提升了多语言键提取的准确性和稳定性

- Initial release