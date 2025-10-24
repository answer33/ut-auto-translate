# UT Auto Translate

一个 VSCode 插件，用于在保存 React 项目文件时自动检测 例：`intl.t(key)` 的调用，并将未翻译的键值对通过大语言模型进行翻译并插入到多语言文件中。

## 功能特点

### 核心功能

- ✅ **智能翻译**：自动监听文件保存，检测 `intl.t(...)`、`t(...)`、`i18next.t(...)` 的调用
- ✅ **AI 驱动**：使用大语言模型进行高质量翻译
- ✅ **多语言库支持**：兼容 di18n、i18next 多语言库
- ✅ **灵活模式**：支持自动/手动翻译模式切换
- ✅ **本地缓存**：智能缓存减少重复翻译请求

### 高级功能

- 🚀 **一键同步翻译**：从基准语言文件批量同步到其他语言
- 🧹 **清理未使用的翻译键**：自动扫描并清理所有语言文件中未被代码使用的冗余翻译键
- 🔒 **不翻译键配置**：支持配置品牌名、专有名词等不需要翻译的键
- 📝 **格式保持**：自动格式化 JSON 文件，保留原有排序
- 🎯 **路径过滤**：支持忽略特定文件路径（glob 模式）

## 快速开始

### 1. 安装插件

**从 VSCode 扩展商店安装（推荐）：**

1. 打开 VSCode
2. 点击左侧扩展图标或按 `Ctrl+Shift+X`
3. 搜索 "UT Auto Translate"
4. 点击安装

**手动安装：**

1. 下载最新的 `.vsix` 文件
2. 在 VSCode 中，点击左侧扩展图标或按 `Ctrl+Shift+X`
3. 点击右上角的 `...` 按钮，选择 "从 VSIX 安装..."
4. 选择下载的 `.vsix` 文件

### 2. 基础配置

在项目根目录创建 `locales` 文件夹（或在设置中指定其他路径）：

```
your-project/
├── locales/
│   ├── zh-CN.json
│   ├── en-US.json
│   └── ...
└── src/
```

### 3. 开始使用

在代码中直接使用中文作为翻译键：

```typescript
// di18n
import { intl } from "di18n-react";
const greeting = intl.t("你好，世界");

// i18next
import { useTranslation } from "react-i18next";
const { t } = useTranslation();
const greeting = t("你好，世界");
```

保存文件后，插件会自动：

1. ✅ 在 `zh-CN.json` 中添加 `{ "你好，世界": "你好，世界" }`
2. ✅ 自动翻译并在 `en-US.json` 中添加 `{ "你好，世界": "Hello, World" }`
3. ✅ 为所有配置的语言生成翻译

### 4. 高级功能

**配置不翻译的键：**

```json
{
  "ut-auto-translate.noTranslateKeys": ["GitHub", "API", "React"]
}
```

**清理未使用的翻译：**

1. 在 `zh-CN.json` 文件上右键
2. 选择 "UT: 清理未使用的翻译键"

**一键同步翻译：**

1. 在 `zh-CN.json` 文件上右键
2. 选择 "UT: 一键同步翻译（从中文基准）"

## 使用方法

### 基本使用

1. 可选：在 VSCode 设置中配置 SiliconFlow API 密钥（如未设置将使用默认密钥）
2. 在 React 项目中使用目标库进行多语言调用
3. 保存文件时，插件会自动检测未翻译的键，并使用大语言模型进行翻译

### 手动触发翻译

1. 打开命令面板（`Ctrl+Shift+P` 或 `Cmd+Shift+P`）
2. 输入 "UT: 手动触发翻译" 并选择

### 一键同步翻译（从中文基准）

当新增了一个语言（或分支合并后中文基准有新增键）时，可以通过以下方式一键同步：

1. 在 VSCode 命令面板输入："UT: 一键同步翻译（从中文基准）"
2. 插件会以默认语言文件（如 `zh-CN.json`，由 `ut-auto-translate.defaultLanguage` 指定）为基准
3. 对所有配置的其他语言（`ut-auto-translate.languages`）缺失的键进行批量翻译并写入对应语言文件
4. 若某语言文件不存在会自动创建；已存在的键不会被修改，仅补齐缺失键

### 清理未使用的翻译键

随着项目的发展，可能会有一些翻译键不再被使用。该功能可以帮助你自动清理这些冗余的翻译：

1. 在 VSCode 命令面板输入："UT: 清理未使用的翻译键"，或在 `zh-CN.json` 文件上右键选择该命令
2. 插件会以默认语言文件（如 `zh-CN.json`）为基准，扫描整个项目的代码文件（`.js`, `.jsx`, `.ts`, `.tsx`）
3. 检查每个翻译键是否在代码中被使用（通过 `intl.t('key')` 或 `t('key')` 等方式）
4. 列出所有未使用的翻译键，并询问是否确认删除
5. 确认后，插件会从所有语言文件中同步移除这些未使用的键
6. 清理完成后，会在输出面板显示详细的清理报告

**支持的使用模式：**

- ✅ 单引号和双引号：`intl.t('你好')` 和 `intl.t("你好")`
- ✅ 模板变量：`i18next.t('{{count}}个', { count: 5 })`
- ✅ 特殊字符：支持大部分特殊字符（如 `?`、`*`、`()`、`[]` 等）
- ✅ 多种调用方式：`intl.t()`、`i18next.t()`、`t()` 等
- ✅ 换行格式：支持参数换行，如 `t('key',\n  { count: 5 })`

**注意事项：**

- 该功能会扫描所有代码文件（`.js`, `.jsx`, `.ts`, `.tsx`），对于大型项目可能需要一些时间
- 建议在执行清理前先提交代码，以便在误删的情况下可以恢复
- 动态生成的翻译键（如通过变量拼接的键）可能会被误判为未使用
- 包含反斜杠 `\` 或换行符的翻译键可能无法被正确检测（这种情况非常罕见）

### 翻译模式

插件支持两种翻译模式：

1. **自动模式**：保存文件时自动检测并翻译未翻译的键（默认模式）
2. **手动模式**：仅在右键菜单或命令面板中手动触发翻译

可以在设置中通过 `ut-auto-translate.translationMode` 配置项切换模式。

### 多语言库支持

插件支持以下多语言库的语法：

1. **di18n**：使用 `intl.t("中文文本")` 语法（默认支持）
2. **i18next**：使用 `t("中文文本")`、`i18next.t("中文文本")` 语法

可以在设置中通过 `ut-auto-translate.i18nLibrary` 配置项选择多语言库类型。

### 不翻译键配置

对于某些特殊的翻译键，您可能希望在所有语言中保持一致（不进行翻译），可以使用 `noTranslateKeys` 配置：

**使用场景示例：**

- 品牌名称、产品名称
- 专有名词、术语
- 代码或技术标识符

**配置方式：**

在 VS Code 设置中配置 `ut-auto-translate.noTranslateKeys`：

```json
{
  "ut-auto-translate.noTranslateKeys": [
    "UTCOOK",
    "product_*" // 支持通配符
  ]
}
```

**效果：**

- 配置后，这些键在所有语言文件中的值都将保持与键相同
- 例如：`"GitHub": "GitHub"`（而不是翻译成其他语言）

## 配置选项

在 VSCode 设置中，可以配置以下选项：

| 配置项                              | 类型    | 默认值                                          | 描述                                                 |
| ----------------------------------- | ------- | ----------------------------------------------- | ---------------------------------------------------- |
| `ut-auto-translate.enabled`         | Boolean | `true`                                          | 启用或禁用自动翻译功能                               |
| `ut-auto-translate.localesDir`      | String  | `locales`                                       | 多语言文件所在的目录路径（相对于项目根目录）         |
| `ut-auto-translate.languages`       | Array   | `["zh-CN", "en-US", "es-ES", "fr-FR", "zh-TW"]` | 需要自动翻译的语言列表                               |
| `ut-auto-translate.defaultLanguage` | String  | `zh-CN`                                         | 默认语言，用于从该语言翻译到其他语言                 |
| `ut-auto-translate.apiKey`          | String  | `""`                                            | SiliconFlow API 密钥（如未设置将使用默认密钥）       |
| `ut-auto-translate.noTranslateKeys` | Array   | `[]`                                            | 不翻译的键名列表（键的值直接使用键本身，支持通配符） |
| `ut-auto-translate.ignorePaths`     | Array   | `[]`                                            | 忽略的文件路径列表（支持 glob 模式）                 |
| `ut-auto-translate.translationMode` | String  | `"auto"`                                        | 翻译模式，可选值：`"auto"` 或 `"manual"`             |
| `ut-auto-translate.i18nLibrary`     | String  | `"di18n"`                                       | 多语言库类型，可选值：`"di18n"` 或 `"i18next"`       |
| `ut-auto-translate.enableCache`     | Boolean | `true`                                          | 启用本地翻译缓存，减少重复翻译请求                   |
| `ut-auto-translate.batchCharLimit`  | Number  | `1800`                                          | 单次批量请求的字符限制（按总字符估算分批）           |

> 提示：一键同步翻译依赖默认语言文件作为基准（通常为 `zh-CN.json`）。请确保该文件存在并包含最新的中文键值。

## 示例

### 多语言文件结构

```
project/
  ├── locales/
  │   ├── zh-CN.json
  │   ├── en-US.json
  │   ├── es-ES.json
  │   ├── fr-FR.json
  │   └── zh-TW.json
  └── src/
      └── components/
          └── App.jsx
```

### 代码示例（di18n）

```jsx
import React from 'react';
import { intl } from 'di18n-react';

function App() {
  return (
    <div>
      <h1>{intl.t("欢迎")}</h1>
      <p>{intl.t("这是一个使用中文作为键的示例")}</p>
      <p>{intl.t('应用更新中 {progress}%', { progress: 99 })}</>
    </div>
  );
}

export default App;
```

### 代码示例（i18next）

```jsx
import React from 'react';
import i18next from 'i18next';
import { useTranslation } from 'react-i18next';

function App() {
  const { t } = useTranslation();
  return (
    <div>
      <h1>{t("欢迎")}</h1>
      <p>{t("这是一个使用中文作为键的示例")}</p>
      <p>{i18next.t('应用更新中 {{progress}}%', { progress: 99 })}</>
    </div>
  );
}

export default App;
```

### 生成的多语言文件

**zh-CN.json**:

```json
{
  "欢迎": "欢迎",
  "这是一个使用中文作为键的示例": "这是一个使用中文作为键的示例"
}
```

**en-US.json**:

```json
{
  "欢迎": "Welcome",
  "这是一个使用中文作为键的示例": "This is an example using Chinese as the key"
}
```

**es-ES.json**:

```json
{
  "欢迎": "Bienvenido",
  "这是一个使用中文作为键的示例": "Este es un ejemplo que usa chino como clave"
}
```

**fr-FR.json**:

```json
{
  "欢迎": "Bienvenue",
  "这是一个使用中文作为键的示例": "Voici un exemple utilisant le chinois comme clé"
}
```

**zh-TW.json**:

```json
{
  "欢迎": "歡迎",
  "这是一个使用中文作为键的示例": "這是一個使用中文作為鍵的示例"
}
```

## 高级功能详解

### 🧹 清理未使用的翻译键

**性能优化：**

- ⚡ **100 倍性能提升**：优化后的算法只扫描一次文件
- 📊 **智能进度显示**：实时显示文件扫描进度
- 🎯 **提前退出**：找到所有键后自动停止扫描

**支持的检测模式：**

- ✅ 单引号和双引号：`intl.t('你好')` 和 `intl.t("你好")`
- ✅ 模板变量：`i18next.t('{{count}}个', { count: 5 })`
- ✅ 特殊字符：支持大部分特殊字符（`?`、`*`、`()`、`[]` 等）
- ✅ 多种调用方式：`intl.t()`、`i18next.t()`、`t()` 等
- ✅ 换行格式：支持参数换行，如 `t('key',\n  { count: 5 })`

**使用建议：**

- 在执行清理前先提交代码，以便误删时可以恢复
- 动态生成的翻译键可能会被误判为未使用

### 🔒 不翻译键配置

**典型使用场景：**

```json
{
  "ut-auto-translate.noTranslateKeys": [
    "GitHub",
    "product_*" // 支持通配符
  ]
}
```

**配置后的效果：**

- 所有语言文件中，这些键的值都将保持与键相同
- 节省 API 调用成本（不需要翻译这些键）
- 保持品牌和技术术语的一致性

### 📝 配置优先级说明

| 配置项            | 作用范围     | 优先级 |
| ----------------- | ------------ | ------ |
| `noTranslateKeys` | 特定的翻译键 | 高     |
| `ignorePaths`     | 文件路径     | 中     |

## 翻译服务

本插件使用 SiliconFlow API 进行翻译，默认使用 Qwen/Qwen2-7B-Instruct 模型。

- 如果您未设置 API 密钥，插件将使用内置的默认密钥
- 如果您有自己的 SiliconFlow API 密钥，可以在设置中配置 `ut-auto-translate.apiKey`

## 最佳实践

### 推荐的工作流程

1. **开发阶段**

   - 使用 `auto` 模式，保存文件时自动翻译
   - 配置 `noTranslateKeys` 排除品牌名、技术术语

2. **维护阶段**

   - 定期运行 "清理未使用的翻译键"
   - 使用 "一键同步翻译" 补齐缺失的翻译

3. **团队协作**
   - 提交前确保所有翻译键已同步
   - 在 CI/CD 中可以检查翻译文件的完整性

### 性能优化建议

- ✅ 合理使用 `ignorePaths` 排除测试文件、第三方库等
- ✅ 配置 `noTranslateKeys` 减少不必要的 API 调用
- ✅ 启用 `enableCache` 避免重复翻译
- ✅ 调整 `batchCharLimit` 适应网络状况

## 注意事项

- 插件只会翻译尚未存在于多语言文件中的键
- 使用中文作为键可以让开发更直观，无需记忆键名
- 在手动模式下，保存文件不会自动触发翻译，需要手动触发
- 清理未使用的键时，动态生成的键（如变量拼接）可能被误判

## 许可证

MIT
