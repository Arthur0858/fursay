import { readFileSync } from "node:fs";

const glossary = JSON.parse(readFileSync(new URL("../data/character-glossary.json", import.meta.url), "utf8"));
const paw = '<svg class="brand-icon" aria-hidden="true"><use href="/images/brand-icons.svg#paw"></use></svg>';

function sheetBrand(label) {
  return `<div class="sample-sheet__brand"><span>${paw}Fursay</span><span>${label}</span></div>`;
}

function face(kind, label) {
  if (kind === "happy") return `<svg class="sample-face" viewBox="0 0 64 64" role="img" aria-label="${label}"><circle cx="32" cy="32" r="28" fill="#fff3c9" stroke="currentColor" stroke-width="3"/><circle cx="23" cy="27" r="2.5" fill="currentColor"/><circle cx="41" cy="27" r="2.5" fill="currentColor"/><path d="M20 38c4 7 20 7 24 0" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>`;
  if (kind === "sad") return `<svg class="sample-face" viewBox="0 0 64 64" role="img" aria-label="${label}"><circle cx="32" cy="32" r="28" fill="#e8f2f7" stroke="currentColor" stroke-width="3"/><circle cx="23" cy="27" r="2.5" fill="currentColor"/><circle cx="41" cy="27" r="2.5" fill="currentColor"/><path d="M21 44c4-7 18-7 22 0" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>`;
  return `<svg class="sample-face" viewBox="0 0 64 64" role="img" aria-label="${label}"><circle cx="32" cy="32" r="28" fill="#f8e5d7" stroke="currentColor" stroke-width="3"/><path d="M19 25l8-3M45 25l-8-3" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><circle cx="23" cy="29" r="2.5" fill="currentColor"/><circle cx="41" cy="29" r="2.5" fill="currentColor"/><ellipse cx="32" cy="42" rx="7" ry="4" fill="none" stroke="currentColor" stroke-width="3"/></svg>`;
}

function kokoSheets() {
  return `<article class="sample-sheet" data-sample-sheet="1" data-page-label="Koko · 1 / 3">
    ${sheetBrand("Koko story moment")}
    <p class="sample-sheet__eyebrow">Read together · 一起讀</p><h3>Koko’s wobbly first step</h3>
    <div class="sample-sheet__scene"><div><p>Koko wanted to try something new. His paws felt wobbly, so he took one slow breath.</p><p lang="zh-Hant">${glossary.characters.koko["zh-Hant"]}想嘗試新事物。他有點擔心，所以慢慢吸了一口氣。</p></div><img src="/images/chars/koko.webp" alt="Koko taking a brave first step" width="1380" height="752"></div>
    <div class="sample-read-aloud">Say together: “I feel worried — and I can try one small step.”</div>
    <ul class="sample-prompt-list"><li><strong>1</strong><span>Point to Koko. How do you think he feels?</span></li><li><strong>2</strong><span>Show one slow breath together.</span></li><li><strong>3</strong><span>What small step could Koko try?</span></li></ul>
    <div class="sample-write-line">Koko can try: __________________________________</div>
    <div class="sample-parent-box"><strong>Parent note · 給家長</strong>There is no perfect answer. Notice the feeling first, then celebrate one small attempt.</div>
  </article>
  <article class="sample-sheet" data-sample-sheet="2" data-page-label="Koko · 2 / 3">
    ${sheetBrand("Feeling words")}
    <p class="sample-sheet__eyebrow">Circle and say · 圈一圈、說一說</p><h3>Which feeling fits?</h3>
    <p>Look at each face. Say the English word, then circle how Koko might feel.</p>
    <div class="sample-emotion-grid">
      <div class="sample-emotion-card">${face("happy", "Happy face")}<strong>Happy</strong><small lang="zh-Hant">開心</small><span class="sample-trace">H a p p y</span></div>
      <div class="sample-emotion-card">${face("sad", "Sad face")}<strong>Sad</strong><small lang="zh-Hant">難過</small><span class="sample-trace">S a d</span></div>
      <div class="sample-emotion-card">${face("worried", "Worried face")}<strong>Worried</strong><small lang="zh-Hant">擔心</small><span class="sample-trace">W o r r i e d</span></div>
    </div>
    <div class="sample-read-aloud">I feel __________________ today.</div><div class="sample-write-line">Draw a circle around your feeling.</div>
    <div class="sample-parent-box"><strong>Try this</strong>Mirror your child’s word: “You feel worried.” Pause before solving the problem.</div>
  </article>
  <article class="sample-sheet" data-sample-sheet="3" data-page-label="Koko · 3 / 3">
    ${sheetBrand("Draw and tell")}
    <p class="sample-sheet__eyebrow">Make it yours · 畫出你的故事</p><h3>My one small brave step</h3>
    <p>Draw yourself trying something new. Koko can stand beside you.</p>
    <div class="sample-draw-box">Your picture goes here<br><span lang="zh-Hant">把你的故事畫在這裡</span></div>
    <div class="sample-read-aloud">I feel __________________ because ______________________________.</div>
    <div class="sample-write-line">My small step is: __________________________________</div>
    <div class="sample-parent-box"><strong>Talk together · 一起聊聊</strong>Ask: “What would help the first step feel smaller?”<br>Try: name it, take one breath, and do only the first tiny part.</div>
  </article>`;
}

function noorSheets() {
  return `<article class="sample-sheet sample-sheet--noor" data-sample-sheet="1" data-page-label="نور · ١ / ٣">
    ${sheetBrand("لحظة مع نور وزيد")}
    <p class="sample-sheet__eyebrow">اقرؤوا معا</p><h3>تحية صغيرة لصديق جديد</h3>
    <div class="sample-sheet__scene"><div><p>رأت نور صديقا جديدا. ابتسم زيد وقال: لنبدأ بكلمة لطيفة وبسيطة.</p><p>رفعا أيديهما وقالا معا:</p><strong class="sample-phrase-zh" lang="zh-Hant">你好 · nǐ hǎo</strong></div><img src="/images/chars/arabic_nour_zayd_together.webp" alt="نور وزيد يحييان صديقا جديدا" width="1380" height="752"></div>
    <div class="sample-read-aloud">قولوا معا: 你好 (nǐ hǎo) — مرحبا!</div>
    <ul class="sample-prompt-list"><li><strong>١</strong><span>أشيروا إلى نور وزيد.</span></li><li><strong>٢</strong><span>لوّحوا بأيديكم مثلهم.</span></li><li><strong>٣</strong><span>قولوا nǐ hǎo ببطء، ثم بشكل طبيعي.</span></li></ul>
    <div class="sample-write-line">اسم صديق أود أن أحييه: __________________________</div>
    <div class="sample-parent-box"><strong>ملاحظة للوالدين</strong>لا نبحث عن نطق مثالي. ابتسامة ومحاولة قصيرة تكفيان لبناء الثقة.</div>
  </article>
  <article class="sample-sheet sample-sheet--noor" data-sample-sheet="2" data-page-label="نور · ٢ / ٣">
    ${sheetBrand("ثلاث كلمات")}
    <p class="sample-sheet__eyebrow">انظروا، اسمعوا، قولوا</p><h3>كلمات صغيرة لمواقف يومية</h3>
    <p>تتبعوا الحروف بأصبعكم، ثم قولوا الكلمة الصينية ومعناها العربي.</p>
    <div class="sample-word-grid">
      <div class="sample-word-card"><strong class="sample-phrase-zh" lang="zh-Hant">你好</strong><small>nǐ hǎo</small><span>مرحبا</span></div>
      <div class="sample-word-card"><strong class="sample-phrase-zh" lang="zh-Hant">謝謝</strong><small>xiè xie</small><span>شكرا</span></div>
      <div class="sample-word-card"><strong class="sample-phrase-zh" lang="zh-Hant">再見</strong><small>zài jiàn</small><span>إلى اللقاء</span></div>
    </div>
    <div class="sample-read-aloud">اختاروا كلمة واحدة وكرروها ثلاث مرات: بهدوء، بصوت مرح، ثم همسا.</div>
    <div class="sample-write-line">كلمتي المفضلة: _________________________________</div>
    <div class="sample-parent-box"><strong>دقيقة لغوية</strong>اربطوا كل كلمة بموقف حقيقي اليوم: تحية عند الباب، شكر بعد المساعدة، ووداع قبل النوم.</div>
  </article>
  <article class="sample-sheet sample-sheet--noor" data-sample-sheet="3" data-page-label="نور · ٣ / ٣">
    ${sheetBrand("أشيروا وطابقوا")}
    <p class="sample-sheet__eyebrow">لعبة عائلية في 3 دقائق</p><h3>أي كلمة تناسب الموقف؟</h3>
    <p>صلوا كل موقف بالكلمة المناسبة. يمكن للطفل أن يشير فقط أو يقول الكلمة بصوت عال.</p>
    <div class="sample-match-grid"><div class="sample-match-item">أقابل صديقا</div><div class="sample-match-item" lang="zh-Hant" dir="ltr">你好 · nǐ hǎo</div><div class="sample-match-item">يساعدني شخص</div><div class="sample-match-item" lang="zh-Hant" dir="ltr">謝謝 · xiè xie</div><div class="sample-match-item">أغادر المكان</div><div class="sample-match-item" lang="zh-Hant" dir="ltr">再見 · zài jiàn</div></div>
    <div class="sample-draw-box">ارسموا موقفا تستخدمون فيه إحدى الكلمات<br><span dir="ltr">你好 · 謝謝 · 再見</span></div>
    <div class="sample-parent-box"><strong>جربوها اليوم</strong>اختاروا كلمة واحدة فقط لاستخدامها في موقف حقيقي. امدحوا المحاولة، لا الدقة.</div>
  </article>`;
}

export function sampleActivityCopy(productKey, locale = "en") {
  const names = glossary.characters[productKey === "noor" ? "nour" : "koko"];
  const name = names[locale === "zh" ? "zh-Hant" : locale];
  const localized = {
    en: {
      noor: [`${name} worksheet — Free printable sample`, `Preview three free ${name} activities for Chinese practice together.`, "Three real activity pages", `Try ${name}’s three-minute worksheet`, "Preview the pages, then download the free PDF for a short story, three Chinese words, and a family game.", "One learning moment, three simple steps", `Read ${name} and Zayd’s story, say three Chinese words, then point and match together.`, ["Read together", "Say the words", "Point and match"], "What is inside", "Preview all three printable pages", "The PDF contains these activity pages only, sized for US Letter paper."],
    },
    zh: {
      koko: [`${name}可列印故事包 — 免費樣本`, `預覽並下載三頁${name}親子故事活動，一起讀故事、認識情緒並畫畫分享。`, "三頁完整活動", "試試三分鐘故事活動", "先預覽每一頁，再下載免費 PDF，一起讀故事、練習情緒詞並畫畫聊天。", "一個故事時刻，三個簡單步驟", `讀${name}的故事，說出感受，再邀請孩子畫畫和分享；可以選一頁或使用全部三頁。`, ["一起讀故事", "說出感受", "畫畫聊聊"], "樣本內容", "預覽三頁可列印活動", "下載的 PDF 只包含這些活動頁，適用 US Letter 紙張。"],
      noor: [`${name}學習單 — 免費列印樣本`, `預覽並下載三頁${name}中文親子活動，一起讀故事、練習詞語並玩配對遊戲。`, "三頁完整活動", `試試${name}的三分鐘學習單`, "先預覽每一頁，再下載免費 PDF，一起讀故事、說三個中文詞語並玩配對遊戲。", "一個學習時刻，三個簡單步驟", `一起讀${name}和${glossary.characters.zayd['zh-Hant']}的故事，說三個中文詞語，再指認配對。`, ["一起讀故事", "說出詞語", "指認配對"], "樣本內容", "預覽三頁可列印活動", "下載的 PDF 只包含這些活動頁，適用 US Letter 紙張。"],
    },
    ar: {
      koko: [`حزمة قصص ${name} القابلة للطباعة — عينة مجانية`, `شاهدوا وحمّلوا ثلاث صفحات من أنشطة ${name} العائلية.`, "ثلاث صفحات نشاط", "جربوا نشاط القصة في ثلاث دقائق", "شاهدوا الصفحات ثم حمّلوا ملف PDF المجاني لقراءة قصة وتدريب كلمات المشاعر والرسم معا.", "لحظة قصة واحدة في ثلاث خطوات", `اقرؤوا قصة ${name}، وسمّوا شعورا، ثم ادعوا الطفل للرسم والحديث. استخدموا صفحة أو الصفحات الثلاث.`, ["اقرؤوا معا", "سمّوا الشعور", "ارسموا وتحدثوا"], "محتوى العينة", "شاهدوا الصفحات الثلاث القابلة للطباعة", "يحتوي ملف PDF على صفحات النشاط فقط، بمقاس ورق US Letter."],
    },
  };
  const copy = localized[locale]?.[productKey];
  if (copy) {
    const [title, description, kicker, heading, lede, summaryHeading, summary, steps, previewKicker, previewHeading, previewBody] = copy;
    return { title, description, kicker, heading, lede, summaryHeading, summary, steps, previewKicker, previewHeading, previewBody, sheets: productKey === "noor" ? noorSheets() : kokoSheets() };
  }
  if (productKey === "noor") return {
    title: "أوراق نور في 3 دقائق — عينة مجانية قابلة للطباعة",
    description: "شاهدوا الصفحات الثلاث وحمّلوا نشاط نور المجاني لتجربة كلمات صينية بسيطة مع الطفل.",
    kicker: "ثلاث صفحات نشاط حقيقية",
    heading: "عينة ورقة نور في 3 دقائق",
    lede: "شاهدوا كل صفحة أدناه، ثم حمّلوا ملف PDF المجاني لقصة قصيرة وثلاث كلمات صينية ولعبة عائلية بسيطة.",
    summaryHeading: "لحظة تعلم واحدة في ثلاث خطوات",
    summary: "اقرؤوا لحظة نور وزيد، قولوا ثلاث كلمات صينية، ثم العبوا لعبة الإشارة والمطابقة معا.",
    steps: ["اقرؤوا معا", "قولوا الكلمات", "أشيروا وطابقوا"],
    previewKicker: "محتوى العينة",
    previewHeading: "شاهدوا الصفحات الثلاث القابلة للطباعة",
    previewBody: "يحتوي ملف PDF على صفحات النشاط هذه فقط، ومقاسها مناسب لورق US Letter.",
    sheets: noorSheets(),
  };
  return {
    title: "Koko printable story pack — Free printable sample",
    description: "Preview and download three free Koko activities for a short parent-child story moment.",
    kicker: "Three real activity pages",
    heading: "Try the three-minute story rhythm",
    lede: "Preview every page below, then download the free PDF for one small story, feeling-word practice, and a drawing conversation.",
    summaryHeading: "One story moment, three simple steps",
    summary: "Read Koko’s moment, name a feeling, then invite your child to draw and talk. Use one page or all three.",
    steps: ["Read together", "Name the feeling", "Draw and talk"],
    previewKicker: "What is inside",
    previewHeading: "Preview all three printable pages",
    previewBody: "The downloaded PDF contains these activity pages only, sized for US Letter paper.",
    sheets: kokoSheets(),
  };
}
