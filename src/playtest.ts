import { locale, switchLocale, type Locale } from './i18n'
import './playtest.css'

const base = import.meta.env.BASE_URL
const game = base
const lab = `${base}lab3d.html`
const asset = (name: string) => `${base}playtest-assets/${name}.png`
const prompt = `Open this browser game:

https://samzebrado.github.io/DeeSewSew/

Your task is to create a small but recognizable embroidery artwork.

Challenge:
- Use only the normal visible user interface.
- Do not modify page JavaScript, DOM, localStorage, saved artwork JSON, or source code.
- You may inspect both FRONT and BACK while working.
- Try to make BOTH sides look intentional and visually pleasing.
- You may undo, cut thread, change colors, rotate the hoop, and use any normal controls available in the game.
- Decide what to embroider yourself.
- Stop when you believe the piece is finished.

At the end, report:
1. what you tried to make;
2. your strategy;
3. what was hardest;
4. whether you think both FRONT and BACK succeeded.`

const copy: Record<Locale, Record<string, string>> = {
  zh: {
    page: '玩法说明 · 公开试玩', change: 'English', eyebrow: '一张小小的玩法卡', tagline: '浏览器里的小小数字刺绣工作室',
    intro: '移动针尖，落下一针，慢慢把想法绣在布上。正面和背面都值得看看。', start: '开始刺绣', look: '先看看怎么玩',
    cover: '真实游戏画面：绣盘上的刺绣作品', what: '你可以做什么', free: '自由刺绣始终是默认方式。',
    features: '换色、剪线、撤销重做；观察正反面的真实线迹；导出 PNG 图片与可继续编辑的 JSON。鼠标与触屏都可以操作。',
    pressure: '实验性选项：笔压仅改变正在移动的松线预览，默认关闭；尚未验证真实触控笔手感。',
    privacy: '无需账号。作品只保存在本机浏览器，不会自动上传或云同步；请导出可编辑 JSON 作为备份。',
    lab: '3D 实验室 · 实验性功能', labnote: '独立的桌面优先球面实验，线铺在表面；不是穿布刺绣。',
    how: '第一针怎么绣', step1: '移动鼠标或触摸布面，定位针尖；点击或松开触摸来落针。',
    step2: '继续落针；想开始独立的一根线时，使用“剪线”。', step3: '转动绣盘看看另一面，完成后导出图片或可编辑 JSON。',
    shortcut: '小提示：电脑上按住 Shift 拖动、触屏用双指拖动可旋转。Ctrl + 点击并松开也可剪线。',
    sides: '正面与背面', sidesAlt: '真实游戏画面：同一作品的正面和背面',
    guides: '想先跟着图案试试？', guideList: '可选引导：小花、郁金香与爱心、小叶片、双樱桃。你也可以从空白布面直接开始。',
    guidesAlt: '真实游戏画面：可选的刺绣图案引导',
    playtest: '公开试玩', playtestLead: '这是一次公开试玩。你不需要会刺绣。玩几分钟后，欢迎在看到这页的社区帖子下留言：',
    q1: '第一次打开，你能不能不看说明就开始绣？', q2: '哪一步最让你困惑？', q3: '鼠标或触屏操作有没有明显别扭的地方？',
    q4: '你会想继续完成一个小作品吗？', q5: '如果只能加一个功能，你最想要什么？',
    challenge: 'AI 刺绣大挑战', challengeEnglish: 'DeeSewSew AI Embroidery Challenge',
    challengeLead: '把游戏交给能操作浏览器的 AI，看看它能否自己绣出可辨认的作品，并让正面和背面都显得经过用心设计。人类也欢迎参加。',
    fun: '没有奖金，也没有正式排名。只是一次好玩的社区实验。',
    rules: '纯界面挑战 · GUI-only', allowed: '可以看页面，点击、拖动、旋转、换色、撤销重做、剪线、检查正反面，并使用正常可见的游戏控件。',
    forbidden: '不能修改 JavaScript、DOM 或源代码，不能直接改 localStorage、注入作品 JSON 或调用内部函数。作品须通过普通可见的用户操作完成。这是社区诚信规则，无自动裁判。',
    goal: '让 AI 自己决定绣什么。尽量让 FRONT 和 BACK 两面都自然、好看。',
    submit: '可选分享格式', submitIntro: '愿意分享时，贴出 AI/Agent、模型、提示词、想绣的东西、正面与背面截图，以及最有趣的失误即可。可编辑作品 JSON 可附上，但不要求；不需要视频。',
    format: 'AI / Agent:\nModel:\nPrompt:\nWhat it tried to make:\n\nFRONT:\n[screenshot]\n\nBACK:\n[screenshot]\n\nWhat went wrong / funniest mistake:',
    promptTitle: '给 AI 的标准提示词（英文）', copyPrompt: '复制提示词', copied: '已复制', copyFallback: '无法自动复制，请选中文本手动复制。',
    labAlt: '真实游戏画面：实验性 3D 实验室', back: '现在就去刺绣', foot: '一针一线，慢慢来。'
  },
  en: {
    page: 'Guide · Public Playtest', change: '中文', eyebrow: 'A little instruction card', tagline: 'A tiny embroidery studio in your browser.',
    intro: 'Move the needle, make a puncture, and stitch an idea onto the fabric at your own pace. Both sides are worth a look.', start: 'Start stitching', look: 'See how it works',
    cover: 'Real game screenshot: embroidery on the hoop', what: 'What can I do?', free: 'Free embroidery is always the default.',
    features: 'Change colors, cut thread, undo and redo; inspect the real front and back thread structure; export PNG images and editable JSON. Mouse and touch both work.',
    pressure: 'Experimental option: pen pressure changes only the moving loose-thread preview. It is off by default; physical stylus feel is untested.',
    privacy: 'No account needed. Artwork stays in this browser, with no automatic upload or cloud sync. Export editable JSON for a backup.',
    lab: '3D Lab · Experimental', labnote: 'A separate desktop-first sphere study with surface-laid thread, not through-fabric embroidery.',
    how: 'Your first stitches', step1: 'Move the mouse or touch the fabric to position the needle; click or release touch to puncture.',
    step2: 'Keep stitching. Use “Cut thread” when you want to begin a separate run.', step3: 'Rotate the hoop to inspect the other side. Export an image or editable JSON when finished.',
    shortcut: 'Tip: Shift + drag on desktop or drag with two fingers on touch to rotate. Ctrl + click and release can also cut thread.',
    sides: 'Front and back', sidesAlt: 'Real game screenshot: the front and back of one piece',
    guides: 'Want a little guidance?', guideList: 'Optional guides: flower, tulip and heart, little leaf, and two cherries. Or start directly on blank fabric.',
    guidesAlt: 'Real game screenshot: optional embroidery pattern guides',
    playtest: 'Public playtest', playtestLead: 'This is a public playtest. You do not need embroidery experience. After a few minutes, feel free to comment on the community post where you found this page:',
    q1: 'Could you start stitching without reading instructions?', q2: 'Which step confused you most?', q3: 'Did anything feel awkward with a mouse or touchscreen?',
    q4: 'Would you want to finish a small piece?', q5: 'If you could add one feature, what would it be?',
    challenge: 'AI Embroidery Challenge', challengeEnglish: '叠绣绣 AI 刺绣大挑战',
    challengeLead: 'Give the game to a browser-capable AI. Can it make a recognizable piece and care for both FRONT and BACK? Humans are welcome too.',
    fun: 'No prizes and no official leaderboard. Just a playful community experiment.',
    rules: 'GUI-only challenge · 纯界面挑战', allowed: 'The AI may look at the page, click, drag, rotate, change colors, undo and redo, cut thread, inspect FRONT and BACK, and use normal visible controls.',
    forbidden: 'It must not modify JavaScript, the DOM, or source code; change localStorage directly; inject saved artwork JSON; or call internal functions. Make the piece through ordinary visible interaction. These are community honor rules, with no automated judging.',
    goal: 'Let the AI decide what to embroider. Try to make BOTH FRONT and BACK intentional and pleasing.',
    submit: 'Optional sharing format', submitIntro: 'If you share, include the AI/Agent, model, prompt, intended piece, FRONT and BACK screenshots, and a funny mistake. Editable artwork JSON is welcome but optional. No video required.',
    format: 'AI / Agent:\nModel:\nPrompt:\nWhat it tried to make:\n\nFRONT:\n[screenshot]\n\nBACK:\n[screenshot]\n\nWhat went wrong / funniest mistake:',
    promptTitle: 'Standard prompt for your AI', copyPrompt: 'Copy prompt', copied: 'Copied', copyFallback: 'Clipboard unavailable. Select the text and copy it manually.',
    labAlt: 'Real game screenshot: Experimental 3D Lab', back: 'Go stitch something', foot: 'One stitch at a time.'
  }
}

const app = document.querySelector<HTMLDivElement>('#app')!
function render(): void {
  const c = copy[locale]
  document.documentElement.lang = locale === 'zh' ? 'zh-CN' : 'en'
  document.title = `${c.page} · 叠绣绣 DeeSewSew`
  app.innerHTML = `
    <div class="page-shell">
      <header class="topbar"><a class="wordmark" href="${game}">✳ <span>叠绣绣</span> DeeSewSew</a><button id="language" class="locale-toggle" type="button" aria-label="${c.change}">${c.change}</button></header>
      <main>
        <section class="hero" aria-labelledby="hero-title">
          <div class="hero-copy"><p class="eyebrow">${c.eyebrow}</p><h1 id="hero-title">叠绣绣<br><span>DeeSewSew</span></h1><p class="tagline">${c.tagline}</p><div class="hero-actions"><a id="start-stitching" class="button primary" href="${game}">${c.start} <span aria-hidden="true">↗</span></a><a class="quiet-link" href="#how">${c.look} ↓</a></div><p>${c.intro}</p></div>
          <figure class="hero-image"><img src="${asset('01-cover')}" alt="${c.cover}" width="1440" height="1320"><figcaption>01 / DeeSewSew</figcaption></figure>
        </section>
        <section class="intro-grid" aria-labelledby="what"><div><p class="section-number">01 / STUDIO</p><h2 id="what">${c.what}</h2><p class="lead">${c.free}</p><p>${c.features}</p><p class="small-note">${c.pressure}</p><p class="small-note">${c.privacy}</p></div><figure class="image-card"><img src="${asset('02-front-back')}" alt="${c.sidesAlt}" loading="lazy" width="1440" height="1080"><figcaption>${c.sides}</figcaption></figure></section>
        <section class="manual" id="how" aria-labelledby="how-title"><p class="section-number">02 / FIELD NOTES</p><h2 id="how-title">${c.how}</h2><ol><li>${c.step1}</li><li>${c.step2}</li><li>${c.step3}</li></ol><p class="tip">✦ ${c.shortcut}</p></section>
        <section class="intro-grid guides" aria-labelledby="guides-title"><figure class="image-card"><img src="${asset('03-pattern-guides')}" alt="${c.guidesAlt}" loading="lazy" width="1440" height="1080"><figcaption>✿ ✿ ✿</figcaption></figure><div><p class="section-number">03 / LITTLE PATTERNS</p><h2 id="guides-title">${c.guides}</h2><p>${c.guideList}</p><a class="text-link" href="${game}">${c.start} ↗</a></div></section>
        <section class="lab-callout" aria-labelledby="lab-title"><div><p class="section-number">SIDE ROOM</p><h2 id="lab-title">${c.lab}</h2><p>${c.labnote}</p><a class="text-link" href="${lab}">${c.lab} ↗</a></div><img src="${asset('04-lab-experimental')}" alt="${c.labAlt}" loading="lazy" width="1440" height="1080"></section>
        <section class="playtest" aria-labelledby="playtest-title"><p class="section-number">04 / OPEN INVITATION</p><h2 id="playtest-title">${c.playtest}</h2><p>${c.playtestLead}</p><ol id="playtest-questions"><li>${c.q1}</li><li>${c.q2}</li><li>${c.q3}</li><li>${c.q4}</li><li>${c.q5}</li></ol></section>
        <section id="ai-challenge" class="challenge" aria-labelledby="challenge-title"><p class="section-number">05 / COMMUNITY EXPERIMENT</p><h2 id="challenge-title">${c.challenge}</h2><p class="subtitle">${c.challengeEnglish}</p><p class="lead">${c.challengeLead}</p><p class="fun">${c.fun}</p><div class="challenge-grid"><div><h3>${c.rules}</h3><p>${c.allowed}</p><p>${c.forbidden}</p><p><strong>${c.goal}</strong></p></div><div><h3>${c.submit}</h3><p>${c.submitIntro}</p><pre class="submission">${c.format}</pre></div></div><details class="prompt"><summary>${c.promptTitle}</summary><div class="prompt-content"><button id="copy-prompt" type="button">${c.copyPrompt}</button><p id="copy-status" role="status" aria-live="polite"></p><textarea id="ai-prompt" readonly aria-label="${c.promptTitle}"></textarea></div></details></section>
      </main><footer><span>✳ ${c.foot}</span><a href="${game}">${c.back} ↗</a></footer>
    </div>`
  document.querySelector<HTMLButtonElement>('#language')!.addEventListener('click', () => { switchLocale(); render() })
  document.querySelector<HTMLTextAreaElement>('#ai-prompt')!.value = prompt
  document.querySelector<HTMLButtonElement>('#copy-prompt')!.addEventListener('click', async () => {
    const status = document.querySelector<HTMLElement>('#copy-status')!
    try { await navigator.clipboard.writeText(prompt); status.textContent = c.copied }
    catch { const field = document.querySelector<HTMLTextAreaElement>('#ai-prompt')!; field.focus(); field.select(); status.textContent = c.copyFallback }
  })
}
render()
if ('serviceWorker' in navigator && import.meta.env.PROD) window.addEventListener('load', () => {
  void navigator.serviceWorker.register(`${base}sw.js`, { scope: base }).catch(() => { /* Online page remains usable. */ })
})
