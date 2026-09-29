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
- Try to make BOTH sides look decent.
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
    page: '玩法说明 · 公开试玩', change: 'English', tagline: '浏览器里的小小数字刺绣工作室',
    intro: '打开就能绣。随便扎几针，翻到背面看看留下的线。', start: '开始刺绣', look: '先看看怎么玩',
    cover: '绣盘上的刺绣作品', what: '能怎么玩', free: '默认从空白开始，也可以跟着小图案绣。',
    features: '换色、剪线、撤销重做，翻面看走线，导出 PNG 或可继续编辑的 JSON。鼠标和触屏都能用。',
    pressure: '实验性笔压默认关闭，只影响手里那截松线。实体笔我还没认真测过。',
    privacy: '不用注册。作品存在当前浏览器里；想留着，记得导出 JSON。',
    lab: '3D 实验室 · 实验性功能', labnote: '球面上放线的小实验，桌面端更合适。能做几根独立彩线，转着看，也能暂时拿掉支撑球。',
    how: '怎么开始', step1: '把针移到布上，点击一下；触屏在松手时落针。',
    step2: '继续落针会连成线。想断开重新起一根，用“剪线”。', step3: '转一下绣绷看背面；满意了就导出图片或 JSON。',
    shortcut: 'Shift + 拖动旋转；触屏用双指拖动。Ctrl + 点击并松开也可以剪线。',
    sides: '正面与背面', sidesAlt: '真实游戏画面：同一作品的正面和背面',
    guides: '不想从空白开始？', guideList: '跟着小花、郁金香 / 爱心、叶子、樱桃绣。也可以什么都不选，自己来。',
    guidesAlt: '真实游戏画面：可选的刺绣图案引导',
    playtest: '公开试玩', playtestLead: '如果愿意玩几分钟，我最想知道：',
    q1: '第一次打开，不看说明能不能开始绣？', q2: '哪一步最让你困惑？', q3: '鼠标或触屏哪里觉得别扭？',
    q4: '你会想把一个小作品做完吗？', q5: '如果只能加一个功能，你最想要什么？',
    challenge: 'AI 刺绣大挑战', challengeEnglish: 'DeeSewSew AI Embroidery Challenge',
    challengeLead: '有能操作浏览器的 AI？把网页丢给它，让它自己研究怎么绣。人当然也能参加。',
    fun: '没奖品，也不做排行榜。',
    rules: '只准用正常界面 · GUI-only', allowed: '看页面、点击、拖动、旋转、换色、撤销重做、剪线，翻面检查，都可以。',
    forbidden: '别直接改 JavaScript、DOM、localStorage、作品 JSON 或源码，也别调用内部函数。按正常用户那样玩，大家自觉就行。',
    goal: '让 AI 自己决定绣什么。看看 FRONT 和 BACK 两面能不能都收拾得像样。',
    submit: '想分享的话', submitIntro: '贴一下 AI / Agent、模型、Prompt 和正反面截图。中途有什么离谱操作，也可以记一句。', optional: 'JSON 可选，不用录视频。',
    format: 'AI / Agent:\nModel:\nPrompt:\nWhat it tried to make:\n\nFRONT:\n[screenshot]\n\nBACK:\n[screenshot]\n\nWhat went wrong / funniest mistake:',
    promptTitle: '给 AI 的标准提示词（英文）', copyPrompt: '复制提示词', copied: '已复制', copyFallback: '无法自动复制，请选中文本手动复制。',
    labAlt: '实验性 3D 实验室', back: '开始刺绣', foot: '慢慢绣。'
  },
  en: {
    page: 'Guide · Public Playtest', change: '中文', tagline: 'A tiny embroidery studio in your browser.',
    intro: 'Make a few stitches. Flip the hoop to see the thread they left behind.', start: 'Start stitching', look: 'See how it works',
    cover: 'Embroidery on the hoop', what: 'What can I do?', free: 'Start with blank fabric or follow a pattern.',
    features: 'Change colors, cut thread, undo, redo and check the back. Export PNG or editable JSON. Mouse and touch both work.',
    pressure: 'Experimental pen pressure is off by default. It affects only the loose thread. Physical stylus feel is untested.',
    privacy: 'No account. Work stays in this browser; export JSON to keep a backup.',
    lab: '3D Lab · Experimental', labnote: 'Place separate colored threads on a sphere, turn it around or hide the support. Best on desktop.',
    how: 'Getting started', step1: 'Move the needle onto the fabric and click. On touchscreens, release to stitch.',
    step2: 'Keep stitching to make a line. Use “Cut thread” to start a separate one.', step3: 'Turn the hoop to check the back. Save an image or JSON when done.',
    shortcut: 'Rotate: Shift + drag, or two-finger drag. Cut: Ctrl + click and release.',
    sides: 'Front and back', sidesAlt: 'Real game screenshot: the front and back of one piece',
    guides: 'Want a pattern?', guideList: 'Try a flower, tulip / heart, leaf or cherries. Leave the guides off to stitch freely.',
    guidesAlt: 'Real game screenshot: optional embroidery pattern guides',
    playtest: 'Public playtest', playtestLead: 'After a few minutes, I’d like to know:',
    q1: 'Could you start stitching without reading instructions?', q2: 'Which step confused you most?', q3: 'Did anything feel awkward with a mouse or touchscreen?',
    q4: 'Would you want to finish a small piece?', q5: 'If you could add one feature, what would it be?',
    challenge: 'AI Embroidery Challenge', challengeEnglish: '叠绣绣 AI 刺绣大挑战',
    challengeLead: 'Give the page to an AI that can use a browser. Let it figure out the game. Humans can try too.',
    fun: 'No prizes and no leaderboard.',
    rules: 'Use the normal controls · GUI-only', allowed: 'Look, click, drag, rotate, change colors, undo, redo, cut thread and check both sides.',
    forbidden: 'Don’t edit JavaScript, DOM, localStorage, artwork JSON or source code, or call internal functions. Play through the controls; we’ll take your word for it.',
    goal: 'Let the AI choose what to stitch. See whether FRONT and BACK both come out looking decent.',
    submit: 'Want to share?', submitIntro: 'Post the agent, model, prompt and both sides. Add a mishap if you like.', optional: 'JSON is optional. No video required.',
    format: 'AI / Agent:\nModel:\nPrompt:\nWhat it tried to make:\n\nFRONT:\n[screenshot]\n\nBACK:\n[screenshot]\n\nWhat went wrong / funniest mistake:',
    promptTitle: 'Standard prompt for your AI', copyPrompt: 'Copy prompt', copied: 'Copied', copyFallback: 'Clipboard unavailable. Select the text and copy it manually.',
    labAlt: 'Experimental 3D Lab', back: 'Start stitching', foot: 'Take your time.'
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
          <div class="hero-copy"><h1 id="hero-title">叠绣绣<br><span>DeeSewSew</span></h1><p class="tagline">${c.tagline}</p><div class="hero-actions"><a id="start-stitching" class="button primary" href="${game}">${c.start} <span aria-hidden="true">↗</span></a><a class="quiet-link" href="#how">${c.look} ↓</a></div><p>${c.intro}</p></div>
          <figure class="hero-image"><img src="${asset('01-cover')}" alt="${c.cover}" width="1440" height="1320"><figcaption>01 / DeeSewSew</figcaption></figure>
        </section>
        <section class="intro-grid" aria-labelledby="what"><div><p class="section-number">01 / PLAY</p><h2 id="what">${c.what}</h2><p class="lead">${c.free}</p><p>${c.features}</p><p class="small-note">${c.pressure}</p><p class="small-note">${c.privacy}</p></div><figure class="image-card"><img src="${asset('02-front-back')}" alt="${c.sidesAlt}" loading="lazy" width="1440" height="1080"><figcaption>${c.sides}</figcaption></figure></section>
        <section class="manual" id="how" aria-labelledby="how-title"><p class="section-number">02 / START</p><h2 id="how-title">${c.how}</h2><ol><li>${c.step1}</li><li>${c.step2}</li><li>${c.step3}</li></ol><p class="tip">✦ ${c.shortcut}</p></section>
        <section class="intro-grid guides" aria-labelledby="guides-title"><figure class="image-card"><img src="${asset('03-pattern-guides')}" alt="${c.guidesAlt}" loading="lazy" width="1440" height="1080"><figcaption>✿ ✿ ✿</figcaption></figure><div><p class="section-number">03 / PATTERNS</p><h2 id="guides-title">${c.guides}</h2><p>${c.guideList}</p><a class="text-link" href="${game}">${c.start} ↗</a></div></section>
        <section class="lab-callout" aria-labelledby="lab-title"><div><p class="section-number">3D LAB</p><h2 id="lab-title">${c.lab}</h2><p>${c.labnote}</p><a class="text-link" href="${lab}">${c.lab} ↗</a></div><img src="${asset('04-lab-experimental')}" alt="${c.labAlt}" loading="lazy" width="1440" height="1080"></section>
        <section class="playtest" aria-labelledby="playtest-title"><p class="section-number">04 / PLAYTEST</p><h2 id="playtest-title">${c.playtest}</h2><p>${c.playtestLead}</p><ol id="playtest-questions"><li>${c.q1}</li><li>${c.q2}</li><li>${c.q3}</li><li>${c.q4}</li><li>${c.q5}</li></ol></section>
        <section id="ai-challenge" class="challenge" aria-labelledby="challenge-title"><p class="section-number">05 / AI CHALLENGE</p><h2 id="challenge-title">${c.challenge}</h2><p class="subtitle">${c.challengeEnglish}</p><p class="lead">${c.challengeLead}</p><p class="fun">${c.fun}</p><div class="challenge-grid"><div><h3>${c.rules}</h3><p>${c.allowed}</p><p>${c.forbidden}</p><p><strong>${c.goal}</strong></p><details class="prompt"><summary>${c.promptTitle}</summary><div class="prompt-content"><button id="copy-prompt" type="button">${c.copyPrompt}</button><p id="copy-status" role="status" aria-live="polite"></p><textarea id="ai-prompt" readonly aria-label="${c.promptTitle}"></textarea></div></details></div><div><h3>${c.submit}</h3><p>${c.submitIntro}</p><p>${c.optional}</p><pre class="submission">${c.format}</pre></div></div></section>
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
