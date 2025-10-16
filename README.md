# UT Auto Translate

一个VSCode插件，用于在保存React项目文件时自动检测 例：`intl.t(key)` 的调用，并将未翻译的键值对通过大语言模型进行翻译并插入到多语言文件中。

## 功能特点

- 自动监听文件保存事件
- 提取所有 `intl.t(...)`、`t(...)`、`i18next.t(...)` 的 key（key 直接使用中文字符串）
- 检查 `locales/` 目录下的语言文件是否包含这些 key
- 如果不存在，则使用大语言模型翻译并写入对应语言文件
- 格式化多语言 JSON 文件（保留原有排序）
- 支持忽略某些 key 或路径
- 支持手动触发翻译
- 支持多种多语言库（di18n、i18next）
- 支持自动/手动翻译模式切换

## 安装

### 从 VSCode 扩展商店安装

1. 打开 VSCode
2. 点击左侧扩展图标或按 `Ctrl+Shift+X`
3. 搜索 "UT Auto Translate"
4. 点击安装

### 手动安装

1. 下载最新的 `.vsix` 文件
2. 在 VSCode 中，点击左侧扩展图标或按 `Ctrl+Shift+X`
3. 点击右上角的 `...` 按钮，选择 "从 VSIX 安装..."
4. 选择下载的 `.vsix` 文件

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

## 配置选项

在 VSCode 设置中，可以配置以下选项：

| 配置项 | 类型 | 默认值 | 描述 |
| --- | --- | --- | --- |
| `ut-auto-translate.enabled` | Boolean | `true` | 启用或禁用自动翻译功能 |
| `ut-auto-translate.localesDir` | String | `locales` | 多语言文件所在的目录路径（相对于项目根目录） |
| `ut-auto-translate.languages` | Array | `["zh-CN", "en-US", "es-ES", "fr-FR", "zh-TW"]` | 需要自动翻译的语言列表 |
| `ut-auto-translate.defaultLanguage` | String | `zh-CN` | 默认语言，用于从该语言翻译到其他语言 |
| `ut-auto-translate.apiKey` | String | `""` | SiliconFlow API 密钥（如未设置将使用默认密钥） |
| `ut-auto-translate.ignoreKeys` | Array | `[]` | 忽略的键名列表（支持通配符） |
| `ut-auto-translate.ignorePaths` | Array | `[]` | 忽略的文件路径列表（支持 glob 模式） |
| `ut-auto-translate.translationMode` | String | `"auto"` | 翻译模式，可选值：`"auto"` 或 `"manual"` |
| `ut-auto-translate.i18nLibrary` | String | `"di18n"` | 多语言库类型，可选值：`"di18n"` 或 `"i18next"` |
| `ut-auto-translate.enableCache` | Boolean | `true` | 启用本地翻译缓存，减少重复翻译请求 |
| `ut-auto-translate.batchCharLimit` | Number | `1800` | 单次批量请求的字符限制（按总字符估算分批） |

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

## 翻译服务

本插件使用 SiliconFlow API 进行翻译，默认使用 Qwen/Qwen2-7B-Instruct 模型。

- 如果您未设置 API 密钥，插件将使用内置的默认密钥
- 如果您有自己的 SiliconFlow API 密钥，可以在设置中配置 `ut-auto-translate.apiKey`

## 注意事项

- 为避免 API 调用过多，建议合理配置忽略规则
- 插件只会翻译尚未存在于多语言文件中的键
- 使用中文作为键可以让开发更直观，无需记忆键名
- 在手动模式下，保存文件不会自动触发翻译，需要手动触发

## 许可证

MIT
