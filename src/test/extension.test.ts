import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';
import { IntlKeyExtractor } from '../utils/intlKeyExtractor';

suite('Extension Test Suite', () => {
  vscode.window.showInformationMessage('开始运行测试');

  test('IntlKeyExtractor 能够正确提取键', () => {
    const content = `
      import React from 'react';
      import { intl } from 'di18n-react';

      function App() {
        return (
          <div>
            <h1>{intl.t('welcome')}</h1>
            <p>{intl.t('description')}</p>
            <button>{intl.t('button.submit', { defaultValue: '提交' })}</button>
          </div>
        );
      }

      export default App;
    `;

    const keys = IntlKeyExtractor.extractKeysFromContent(content);
    assert.strictEqual(keys.length, 3);
    assert.strictEqual(keys.includes('welcome'), true);
    assert.strictEqual(keys.includes('description'), true);
    assert.strictEqual(keys.includes('button.submit'), true);
  });

  test('IntlKeyExtractor 能够处理重复的键', () => {
    const content = `
      import React from 'react';
      import { intl } from 'di18n-react';

      function App() {
        return (
          <div>
            <h1>{intl.t('welcome')}</h1>
            <p>{intl.t('welcome')}</p>
          </div>
        );
      }

      export default App;
    `;

    const keys = IntlKeyExtractor.extractKeysFromContent(content);
    assert.strictEqual(keys.length, 1);
    assert.strictEqual(keys[0], 'welcome');
  });

  test('IntlKeyExtractor 能够处理不同引号类型', () => {
    const content = `
      import React from 'react';
      import { intl } from 'di18n-react';

      function App() {
        return (
          <div>
            <h1>{intl.t("welcome")}</h1>
            <p>{intl.t('description')}</p>
          </div>
        );
      }

      export default App;
    `;

    const keys = IntlKeyExtractor.extractKeysFromContent(content);
    assert.strictEqual(keys.length, 2);
    assert.strictEqual(keys.includes('welcome'), true);
    assert.strictEqual(keys.includes('description'), true);
  });

  test('IntlKeyExtractor 能够处理带选项的调用', () => {
    const content = `
      import React from 'react';
      import { intl } from 'di18n-react';

      function App() {
        return (
          <div>
            <h1>{intl.t('welcome', { defaultValue: '欢迎' })}</h1>
            <p>{intl.t('count', { count: 5 })}</p>
          </div>
        );
      }

      export default App;
    `;

    const keys = IntlKeyExtractor.extractKeysFromContent(content);
    assert.strictEqual(keys.length, 2);
    assert.strictEqual(keys.includes('welcome'), true);
    assert.strictEqual(keys.includes('count'), true);
  });

  test('shouldIgnoreKey 能够正确判断是否忽略键', async () => {
    // 模拟配置
    await vscode.workspace.getConfiguration('ut-auto-translate').update('ignoreKeys', ['test*', 'ignore'], true);

    assert.strictEqual(IntlKeyExtractor.shouldIgnoreKey('test'), true);
    assert.strictEqual(IntlKeyExtractor.shouldIgnoreKey('test.key'), true);
    assert.strictEqual(IntlKeyExtractor.shouldIgnoreKey('ignore'), true);
    assert.strictEqual(IntlKeyExtractor.shouldIgnoreKey('welcome'), false);

    // 恢复配置
    await vscode.workspace.getConfiguration('ut-auto-translate').update('ignoreKeys', [], true);
  });
});
