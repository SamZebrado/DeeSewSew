export type Locale = 'zh' | 'en'
export const LOCALE_KEY = 'deesewsew-locale-v1'
export function initialLocale(storage: Pick<Storage, 'getItem'> | null, language: () => string | undefined): Locale {
  try { const saved = storage?.getItem(LOCALE_KEY); if (saved === 'zh' || saved === 'en') return saved } catch { /* Language remains usable without storage. */ }
  try { return /^en(?:-|$)/i.test(language() ?? '') ? 'en' : 'zh' } catch { return 'zh' }
}
let storage: Storage | null = null
try { storage = localStorage } catch { /* Restricted browser. */ }
export let locale: Locale = initialLocale(storage, () => navigator.language)
/** English message IDs are readable at call sites; artwork never contains these IDs. */
export const messages: Record<string, string> = {
  'Ctrl + click the fabric to cut thread': 'Ctrl + 点击绣布可剪线',
  'Cut thread (Ctrl + click fabric)': '剪线（Ctrl + 点击绣布）',
  'Save PNG image': '保存 PNG 图片', 'Front PNG': '正面 PNG', 'Back PNG': '背面 PNG', 'Both PNG': '双面 PNG',
  'PNG download started': 'PNG 下载已发起', 'PNG export failed': 'PNG 导出失败',
  'A clean image was sent to your browser downloads. Your artwork is unchanged.': '纯净作品图片已发送至浏览器下载，作品未改变。',
  'Could not download the PNG image. Your artwork is unchanged.': '无法下载 PNG 图片，作品未改变。',
  'Appearance': '外观',
  'Lighting': '光照',
  'Soft daylight': '柔和日光',
  'Warm lamp': '暖灯',
  'Work light': '工作灯',
  'Screen lighting only; PNG images always use soft daylight.': '仅调整屏幕光照；PNG 图片始终使用柔和日光。',
  'Tulip & heart':'郁金香与爱心',
  'Tulip and heart complete':'郁金香与爱心完成了',
  'Cut thread to continue':'剪线后继续',
  'Flip to the back for the heart':'翻到背面，开始绣爱心',
  'Return to the front for the tulip':'回到正面，继续绣郁金香',
  'Start a new thread at the highlighted point':'在亮点处开始一根新线',
  'Puncture the highlighted point, then cut':'在亮点处落针，然后剪线',
  'End thread': '结束这根线',
  'Cut thread': '剪线',
  'Thread ended': '这根线已结束',
  'New thread color': '新线颜色',
  'The previous thread ended. The next puncture starts a separate thread.': '上一根线已结束，下一针会开始一根独立的新线。',
  'The next puncture starts a separate thread. Existing stitches stay unchanged.': '下一针会开始一根独立的新线，已有针迹保持不变。',
  'Operation undone': '已撤销操作',
  'Operation restored': '已恢复操作',
  'DeeSewSew': '叠绣绣',
  'DeeSewSew — Tiny browser embroidery studio': '叠绣绣 DeeSewSew — 数字刺绣工作室',
  'A tiny embroidery studio in your browser.': '浏览器里的小小数字刺绣工作室。',
  'Not saved yet': '尚未保存', 'Download recovery copy': '下载恢复副本', 'Download original stored data': '下载原始存储数据',
  'Embroidery studio': '刺绣工作室', 'Stitch controls': '刺绣工具',
  'Embroidery hoop view. Move the needle, click to puncture, use the rim or arrow keys to rotate, Home for front, and End for back.': '绣盘视图。移动针并点击落针；拖动边框或用方向键旋转，Home 回正面，End 回背面。',
  'Front fabric inside an embroidery hoop': '绣盘内的正面布料', 'Reverse side': '背面',
  'Needle: front': '针在正面', 'Needle: back': '针在背面', 'Front surface editable': '可在正面落针',
  'Move the needle; the loose thread follows. Click to puncture, then choose where it emerges.': '移动针，松线随行。点击落针，再选择出针位置。',
  'Hold Shift and drag to rotate · Drag with two fingers to rotate': '按住 Shift 拖动可旋转 · 双指拖动旋转',
  'Thread': '绣线', 'Thread color': '绣线颜色', 'Custom': '自定义', 'Choose a custom thread color': '选择自定义绣线颜色', 'Add color': '添加颜色',
  'Poppy': '茜红', 'Coral': '珊瑚', 'Marigold': '金盏黄', 'Leaf': '叶绿', 'Indigo': '靛蓝', 'Plum': '梅紫', 'Walnut': '胡桃', 'Ink': '墨色', 'Cream': '米白',
  'Stitch routing': '行针方式', 'Stitch type': '针法', 'Running': '平针', 'Back': '回针',
  'View & motion': '视角与动画', 'Auto rotate': '自动旋转', 'Slowly turn from the current angle': '从当前角度缓慢转动',
  'Stitch motion': '行针动画', 'Press, puncture, tighten, and settle': '按压、穿布、收紧、落定', 'Return front': '回到正面', 'Snap back': '转到背面',
  'Edit': '编辑', 'Undo': '撤销', 'Redo': '重做', 'Undo last puncture': '撤销上次落针', 'Redo last puncture': '重做上次落针', 'Clear fabric': '清空布料',
  'Needle ready': '针已就绪', 'Move the front-side needle, then click to puncture.': '移动正面的针，然后点击落针。',
  'Saved on this device': '已保存在本机', 'Loaded from this device': '已载入本机作品',
  'Work not saved — download a recovery copy before leaving': '作品未保存，请在离开前下载恢复副本',
  'Studio settings are temporary; device storage failed.': '本机存储失败，工作室设置仅临时有效。',
  'Tightening shortened for Reduce Motion': '减少动态效果已启用，立即收紧',
  'Rotating — puncture paused': '旋转中，暂不可落针', 'Inspect only — projection too shallow': '仅供查看，角度过于倾斜',
  'Reverse needle active': '背面的针可移动', 'Front needle active': '正面的针可移动',
  'Near edge — inspect only': '接近侧面，仅供查看', 'Stop rotation to evaluate this angle for stitching.': '停止旋转后，可查看此角度是否适合落针。',
  'This angle is too shallow for reliable puncture placement. Rotate a little farther.': '此角度过于倾斜，无法准确落针，请稍微转动绣盘。',
  'Move the needle; the loose thread follows. Click to puncture.': '移动针，松线随行；点击落针。',
  'Rotate toward either face to continue.': '转向正面或背面以继续。', 'Stop rotation': '停止旋转', 'Unavailable while Reduce Motion is on': '减少动态效果开启时不可用', 'Freeze at the current angle': '停在当前角度',
  'Inspect-only angle': '此角度仅供查看', 'Projection is too shallow for reliable puncture placement. Rotate toward either face.': '投影角度过于倾斜，无法准确落针，请转向正面或背面。',
  'Choose emergence point': '选择出针点', 'View adjusted': '视角已调整', 'View stopped': '视角已停止', 'Rotation paused': '旋转已暂停', 'Needle reset': '针已复位',
  'A little farther': '请稍微移远一点', 'Move the needle tip before puncturing again.': '再次落针前，请先移动针尖。',
  'Fabric full': '布料已满', 'This piece has reached its local segment limit. Undo or clear before adding more.': '此作品已达到线段上限，请撤销或清空后再添加。',
  'Needle emerged': '针已穿出', 'Needle behind fabric': '针在布料背后', 'Color selected': '颜色已选中', 'Custom palette full': '自定义色板已满', 'Custom color added': '自定义颜色已添加',
  'Routing changed': '行针方式已更改', '3D view rotating': '绣盘正在旋转', 'Puncture is paused while the hoop turns. Stop anywhere to evaluate the angle.': '旋转时暂不可落针，可随时停止并查看角度。',
  'Stitch motion on': '行针动画已开启', 'Stitch motion off': '行针动画已关闭', 'Punctures tighten from the loose thread you are moving.': '落针后，当前松线会逐段收紧。', 'Live thread following remains; punctures settle immediately.': '松线仍随针移动，落针后立即落定。',
  'Puncture undone': '已撤销落针', 'Puncture restored': '已恢复落针', 'Clear every puncture and thread segment from this fabric?': '清空这块布上的所有针孔和线段？', 'Fabric cleared': '布料已清空', 'Needle reset to the front surface.': '针已回到正面。',
  'front': '正面', 'back': '背面', 'Front': '正面', 'Reverse': '背面', 'editable': '可编辑', 'limited': '受限',
  'Artwork': '作品', 'Export': '导出作品', 'Import': '导入作品', 'Choose an artwork file': '选择作品文件',
  'Artwork exported': '作品已导出', 'Your current artwork was downloaded without changing it.': '当前作品已下载，原作品未改变。',
  'Import failed': '导入失败', 'Invalid or unsupported artwork file. Your current work is unchanged.': '作品文件无效或版本不受支持，当前作品未改变。',
  'Replace the current artwork? Export a copy first if you want to keep it.': '替换当前作品？若要保留，请先导出副本。',
  'Artwork imported': '作品已导入', 'The validated artwork is ready to continue.': '作品已通过校验，可以继续刺绣。',
  'Export failed': '导出失败', 'Could not download this artwork. Your work is unchanged.': '无法下载作品，当前作品未改变。',
  'Stitch a flower': '绣一朵小花', 'Exit guide': '退出引导',
  'Follow the next highlighted point. Existing stitches stay when you exit.': '跟随下一个高亮点落针，退出后已绣线段仍会保留。',
  'Finished. Take a look at the back?': '完成啦。翻到背面看看？',
  'Guide paused': '引导已退出', 'Your stitches remain on the fabric.': '已绣的线段仍保留在布料上。',
  'Next flower point': '下一个小花落针点', 'Follow the highlighted guide point before continuing.': '请先在高亮引导点落针。',
}
const templates: [string, string][] = [
  ['Custom {value}', '自定义 {value}'], ['Choose {side}-side emergence', '选择{side}出针点'],
  ['Choose where the hidden {side}-side needle will emerge. Flipping is optional.', '选择隐藏在{side}的针的出针点，无需翻面。'],
  ['The needle is on the hidden {side}. Select where it should emerge, or flip to work directly.', '针隐藏在{side}。请选择出针点，或翻面直接操作。'],
  ['{side} surface is {state} and ready to puncture.', '{side}处于{state}状态，可继续落针。'],
  ['The same needle is now visible on the {side}. Keep moving to pull the soft thread.', '同一根针已在{side}出现，继续移动可牵引松线。'],
  ['Choose where the hidden {side}-side needle should emerge; flipping is optional.', '选择隐藏在{side}的针的出针位置，无需翻面。'],
  ['{color} is ready to stitch.', '{color}已就绪。'], ['You can keep up to {count} custom thread colors on this device.', '本机最多可保留 {count} 种自定义绣线颜色。'],
  ['{color} is now in your thread palette.', '{color}已加入绣线色板。'], ['{routing} routing will shape the next surface segment.', '下一段表面绣线将使用{routing}。'],
  ['Needle restored to the {side}.', '针已恢复到{side}。'], ['Needle is on the {side}.', '针在{side}。'], ['Flower step {step} of {total}', '小花第 {step} / {total} 步'],
]
const compiled = templates.map(([source, target]) => {
  const keys: string[] = []
  const pattern = source.split(/(\{\w+\})/).map(part => /^\{/.test(part) ? (keys.push(part.slice(1, -1)), '(.+?)') : part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('')
  return { pattern: new RegExp(`^${pattern}$`), keys, target }
})
export function t(source: string, language = locale): string {
  if (language === 'en') return source
  if (messages[source]) return messages[source]!
  for (const entry of compiled) {
    const match = entry.pattern.exec(source)
    if (match) return entry.target.replace(/\{(\w+)\}/g, (_, key: string) => t(match[entry.keys.indexOf(key) + 1]!, language))
  }
  return source
}
const textBindings = new Map<Node, string>()
const attributes = new Map<Element, Map<string, string>>()
export function setText(node: Node, source: string): void { textBindings.set(node, source); node.textContent = t(source) }
export function localize(root: Element): void {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  while (walker.nextNode()) {
    const node = walker.currentNode, source = node.textContent ?? ''
    if (source.trim() && t(source.trim(), 'zh') !== source.trim()) setText(node, source.trim())
  }
  for (const element of [root, ...root.querySelectorAll('*')]) for (const key of ['aria-label', 'title']) {
    const value = element.getAttribute(key)
    if (value) { const bound = attributes.get(element) ?? new Map<string, string>(); bound.set(key, value); attributes.set(element, bound); element.setAttribute(key, t(value)) }
  }
}
export function switchLocale(): void {
  locale = locale === 'zh' ? 'en' : 'zh'
  try { storage?.setItem(LOCALE_KEY, locale) } catch { /* Session selection still works. */ }
  document.documentElement.lang = locale === 'zh' ? 'zh-CN' : 'en'
  for (const [node, source] of textBindings) { if (node.isConnected) node.textContent = t(source); else textBindings.delete(node) }
  for (const [element, bound] of attributes) { if (element.isConnected) for (const [key, source] of bound) element.setAttribute(key, t(source)); else attributes.delete(element) }
}
