import { expect, test } from 'vitest'
import { initialLocale, messages, t } from './i18n'
test('locale fallback and manual override are independent of artwork storage', () => {
  for (const language of ['zh-TW', 'zh-CN', 'fr-FR', '', undefined]) expect(initialLocale(null, () => language)).toBe('zh')
  expect(initialLocale(null, () => 'en-GB')).toBe('en')
  expect(initialLocale(null, () => { throw Error() })).toBe('zh')
  expect(initialLocale({ getItem: () => 'en' }, () => 'zh-CN')).toBe('en')
  expect(initialLocale({ getItem: () => 'zh' }, () => 'en-US')).toBe('zh')
  expect(initialLocale({ getItem: () => { throw Error() } }, () => 'en-US')).toBe('en')
})
test('catalog translates dynamic semantic values without persisting translated topology', () => {
  expect(t('Choose back-side emergence', 'zh')).toBe('选择背面出针点')
  expect(t('Needle restored to the front.', 'zh')).toBe('针已恢复到正面。')
  expect(t('Flower step 2 of 41', 'zh')).toBe('小花第 2 / 41 步')
  expect(t('DeeSewSew', 'zh')).toBe('叠绣绣')
  expect(t('Poppy', 'zh')).toBe('茜红')
  for (const key of Object.keys(messages)) { expect(t(key, 'en')).toBe(key); expect(t(key, 'zh')).not.toBe(key) }
})
