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
    <div class="sample-sheet__scene"><div><p>Koko wanted to try something new. His paws felt wobbly, so he took one slow breath.</p><p lang="zh-Hant">可可想嘗試新事物。他有點擔心，所以慢慢吸了一口氣。</p></div><img src="/images/chars/koko.webp" alt="Koko taking a brave first step" width="1380" height="752"></div>
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
    <div class="sample-sheet__scene"><div><p>رأت نور صديقا جديدا. ابتسم زيد وقال: لنبدأ بكلمة لطيفة وبسيطة.</p><p>رفعا أيديهما وقالا معا:</p><strong class="sample-phrase-zh" lang="zh-Hans">你好 · nǐ hǎo</strong></div><img src="/images/chars/arabic_nour_zayd_together.webp" alt="نور وزيد يحييان صديقا جديدا" width="1380" height="752"></div>
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
      <div class="sample-word-card"><strong class="sample-phrase-zh" lang="zh-Hans">你好</strong><small>nǐ hǎo</small><span>مرحبا</span></div>
      <div class="sample-word-card"><strong class="sample-phrase-zh" lang="zh-Hans">谢谢</strong><small>xiè xie</small><span>شكرا</span></div>
      <div class="sample-word-card"><strong class="sample-phrase-zh" lang="zh-Hans">再见</strong><small>zài jiàn</small><span>إلى اللقاء</span></div>
    </div>
    <div class="sample-read-aloud">اختاروا كلمة واحدة وكرروها ثلاث مرات: بهدوء، بصوت مرح، ثم همسا.</div>
    <div class="sample-write-line">كلمتي المفضلة: _________________________________</div>
    <div class="sample-parent-box"><strong>دقيقة لغوية</strong>اربطوا كل كلمة بموقف حقيقي اليوم: تحية عند الباب، شكر بعد المساعدة، ووداع قبل النوم.</div>
  </article>
  <article class="sample-sheet sample-sheet--noor" data-sample-sheet="3" data-page-label="نور · ٣ / ٣">
    ${sheetBrand("أشيروا وطابقوا")}
    <p class="sample-sheet__eyebrow">لعبة عائلية في 3 دقائق</p><h3>أي كلمة تناسب الموقف؟</h3>
    <p>صلوا كل موقف بالكلمة المناسبة. يمكن للطفل أن يشير فقط أو يقول الكلمة بصوت عال.</p>
    <div class="sample-match-grid"><div class="sample-match-item">أقابل صديقا</div><div class="sample-match-item" lang="zh-Hans" dir="ltr">你好 · nǐ hǎo</div><div class="sample-match-item">يساعدني شخص</div><div class="sample-match-item" lang="zh-Hans" dir="ltr">谢谢 · xiè xie</div><div class="sample-match-item">أغادر المكان</div><div class="sample-match-item" lang="zh-Hans" dir="ltr">再见 · zài jiàn</div></div>
    <div class="sample-draw-box">ارسموا موقفا تستخدمون فيه إحدى الكلمات<br><span dir="ltr">你好 · 谢谢 · 再见</span></div>
    <div class="sample-parent-box"><strong>جربوها اليوم</strong>اختاروا كلمة واحدة فقط لاستخدامها في موقف حقيقي. امدحوا المحاولة، لا الدقة.</div>
  </article>`;
}

export function sampleActivityCopy(productKey) {
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
