import { mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { EDITORIAL_UPDATED, GUIDES, GUIDE_SLUGS } from "./fursay-editorial-content.mjs";
import { EDITORIAL_DEPTH, EDITORIAL_FINAL_NOTES, EDITORIAL_LOCALE_EXTENSIONS, EDITORIAL_SOURCE_LIBRARY, EDITORIAL_SUPPLEMENTS } from "./fursay-editorial-depth.mjs";

const ORIGIN = "https://fursay.com";
const ADSENSE_ACCOUNT = "ca-pub-4093856660317740";
const PUBLISHER_ID = "pub-4093856660317740";
const CSS = "/css/editorial-20260802-v2.css";
const BRAND_CSS = "/css/brand-storybook-20260717-v1.css";
const SHARED_JS = "/js/site-shared-20260615-sharekit1.js";

const LOCALES = {
  en: { lang: "en", dir: "ltr", prefix: "", label: "EN", guides: "Parent guides", about: "About", products: "Products", home: "Home", method: "Editorial method", contact: "Contact & corrections", terms: "Terms", privacy: "Privacy", support: "Support" },
  zh: { lang: "zh-TW", dir: "ltr", prefix: "/zh", label: "中文", guides: "家長指南", about: "關於", products: "產品", home: "首頁", method: "編輯方法", contact: "聯絡與修正", terms: "使用條款", privacy: "隱私", support: "支援" },
  ar: { lang: "ar", dir: "rtl", prefix: "/ar", label: "عربي", guides: "دليل الوالدين", about: "من نحن", products: "المنتجات", home: "الرئيسية", method: "منهج التحرير", contact: "التواصل والتصحيح", terms: "الشروط", privacy: "الخصوصية", support: "الدعم" },
};

const COPY = {
  en: {
    team: "Fursay Family Learning Editorial Team", updated: "Updated", published: "Published", contents: "In this guide",
    intro: "This guide is written for an adult parent or caregiver. It offers a small family practice, not a promise of fluency, a developmental assessment, or medical advice.",
    headings: ["Start with the family moment", "Choose a useful goal", "Use a small repeatable routine", "See the idea in practice", "Notice without testing", "Move from the page into family life", "When this guide is not enough", "Sources and editorial notes"],
    methodLead: "Fursay guides begin with a concrete family problem, narrow it to one action, and name the limits before recommending a story or printable.",
    repeat: [
      "Shared reading works best as a conversation. The adult can pause, point, answer their own question, or use the family's strongest language. A child's gesture, gaze, movement, or decision to listen is still participation.",
      "Keep the invitation small enough that it can end calmly. More material is not automatically more useful. A familiar phrase used in a real family moment often has more meaning than a long list repeated for a worksheet.",
      "Use observation to adjust the routine, not to rank the child. If attention leaves, close the activity. If interest returns later, begin again with the familiar part instead of presenting missed work as a failure.",
      "Adults do not need to hide uncertainty. Checking audio, choosing an easier word, or returning to the home language models responsible learning. The relationship remains the stable part while language exposure grows gradually.",
      "The examples below are options, not a schedule. Families can shorten, skip, translate, or replace them with play. The useful question is whether the next step feels understandable and manageable for both people.",
      "Do not use a story response to diagnose ability, personality, or progress. If a family has concerns about hearing, speech, communication, or development, a qualified local professional can consider the child's full context.",
      "Before beginning, the adult can decide what a calm ending will look like and tell the child. Afterward, note one thing that made connection easier and one thing to simplify next time. This brief reflection belongs to the adult; the child does not need a score, correction sheet, or report. Repeating a manageable routine on another day is optional, and choosing rest is also a responsible family decision.",
      "A guide can offer structure without knowing the family's schedule, languages, culture, access needs, or previous experiences. Parents should keep what supports connection and set aside what does not. Changing the order, using fewer words, or staying with a favorite picture is adaptation, not incorrect use.",
    ],
    sourceNote: "We link to official or original sources to explain the principle behind the family practice. A source does not endorse Fursay or guarantee that one routine will suit every child.",
    correction: "See something unclear or incorrect? Send the page URL and the sentence to our correction route.",
    related: "Try the related story world", sample: "Open the free printable sample",
  },
  zh: {
    team: "Fursay 家庭學習編輯團隊", updated: "內容更新", published: "發布日期", contents: "本篇內容",
    intro: "本指南寫給成年父母或照顧者，提供一個能在家庭裡嘗試的小方法；它不保證流利度，不是兒童發展評估，也不是醫療建議。",
    headings: ["先看真實家庭時刻", "選一個有用而有限的目標", "建立可重複的小流程", "把方法放進具體情境", "觀察，但不要考試", "讓故事走進家庭生活", "哪些情況不適用", "資料來源與編輯說明"],
    methodLead: "Fursay 指南先從具體家庭困難出發，把問題縮成一個可以採取的動作，再於推薦故事或學習單前說清楚限制。",
    repeat: [
      "親子共讀的核心是對話，不是單向輸入。成人可以停下來、指圖、自己回答問題，或使用家庭最熟悉的語言；孩子用眼神、動作、姿勢或安靜聆聽回應，也同樣算參與。",
      "邀請必須小到能平靜結束。材料更多不代表更有用；一個短句若能在真實家庭時刻再次出現，常比為了完成學習單而重複長串詞語更有意義。",
      "觀察是為了調整流程，不是替孩子排名。注意力離開時就收起活動；興趣之後回來，再從熟悉部分開始，不把之前沒做完的內容描述成失敗或欠下的功課。",
      "成人不必掩飾不確定。重新聽音檔、選更容易的詞、回到家庭主要語言，都是負責任的學習示範。親子關係保持穩定，語言接觸則慢慢增加。",
      "文中的例子是選項，不是必須遵守的進度表。家庭可以縮短、略過、翻譯，或改成遊戲；真正有用的判斷是，下一步對孩子與成人是否都清楚而做得到。",
      "不要用一個故事反應診斷能力、個性或進度。若家庭擔心聽力、語言、溝通或發展，所在地合格專業人員才能結合孩子的完整情境提供個別意見。",
      "開始前，成人可以先決定平靜的結尾會是什麼樣子，並清楚告訴孩子。結束後只要自己記下一件讓連結更容易的事，以及下次可以再簡化的一件事。這段反思屬於成人，不需要替孩子製作分數、錯誤表或報告。另一天是否重複，由家庭當天的精神與興趣決定；選擇休息也同樣是負責任的安排。",
      "指南只能提供結構，無法事先知道每個家庭的作息、語言、文化、無障礙需要與過往經驗。父母可以保留真正支持連結的部分，把不適合的做法放下。改變順序、減少詞語，或只停在孩子喜歡的一張圖，都是合理調整，不是使用錯誤。",
    ],
    sourceNote: "我們連結官方或原始資料，用來說明家庭方法背後的原則；資料來源不代表替 Fursay 背書，也不保證同一流程適合每個孩子。",
    correction: "發現內容不清楚或可能有誤？請把頁面網址與原句寄到內容修正入口。",
    related: "前往相關故事世界", sample: "開啟免費可列印樣本",
  },
  ar: {
    team: "فريق Fursay لتحرير التعلم العائلي", updated: "تحديث المحتوى", published: "تاريخ النشر", contents: "في هذا الدليل",
    intro: "هذا الدليل مكتوب لوالد بالغ أو مقدم رعاية. يقدم ممارسة عائلية صغيرة، ولا يعد بالطلاقة ولا يمثل تقييمًا لنمو الطفل أو نصيحة طبية.",
    headings: ["ابدأوا من لحظة عائلية حقيقية", "اختاروا هدفًا مفيدًا ومحدودًا", "استخدموا روتينًا صغيرًا قابلًا للتكرار", "شاهدوا الفكرة في موقف عملي", "لاحظوا من دون اختبار", "انقلوا القصة إلى حياة الأسرة", "متى لا يكفي هذا الدليل", "المصادر وملاحظات التحرير"],
    methodLead: "تبدأ أدلة Fursay بمشكلة عائلية ملموسة، ثم تصغرها إلى فعل واحد، وتذكر الحدود قبل اقتراح قصة أو ورقة قابلة للطباعة.",
    repeat: [
      "تنجح القراءة المشتركة عندما تكون حوارًا. يمكن للبالغ أن يتوقف أو يشير أو يجيب عن سؤاله أو يستخدم أقوى لغة في البيت. وتظل نظرة الطفل أو حركته أو اختياره الاستماع شكلًا صحيحًا من المشاركة.",
      "اجعلوا الدعوة صغيرة بحيث تنتهي بهدوء. كثرة المواد لا تعني فائدة أكبر. عبارة مألوفة تستعمل في موقف عائلي حقيقي قد تكون أعمق معنى من قائمة طويلة تكرر لإكمال ورقة.",
      "استعملوا الملاحظة لتعديل الروتين لا لترتيب الطفل. عندما ينتقل الانتباه أغلقوا النشاط. وإذا عاد الاهتمام لاحقًا ابدأوا بالجزء المألوف بدل وصف ما فات بأنه فشل.",
      "لا يحتاج البالغ إلى إخفاء عدم اليقين. مراجعة الصوت أو اختيار كلمة أسهل أو العودة إلى لغة البيت نموذج تعلم مسؤول. تبقى العلاقة ثابتة بينما ينمو التعرض للغة تدريجيًا.",
      "الأمثلة خيارات وليست جدولًا إلزاميًا. يمكن للأسرة تقصيرها أو تجاوزها أو ترجمتها أو استبدالها باللعب. السؤال المفيد هو هل تبدو الخطوة التالية مفهومة وقابلة للتنفيذ للطرفين.",
      "لا تستخدموا استجابة القصة لتشخيص القدرة أو الشخصية أو التقدم. عند القلق بشأن السمع أو الكلام أو التواصل أو النمو يستطيع مختص محلي مؤهل النظر في السياق الكامل للطفل.",
      "قبل البدء يستطيع البالغ أن يحدد شكل النهاية الهادئة ويخبر الطفل بها. بعد الانتهاء يكفي أن يلاحظ البالغ شيئًا جعل التواصل أسهل وشيئًا يمكن تبسيطه في المرة المقبلة. هذا التأمل للبالغ ولا يحتاج الطفل إلى درجة أو ورقة أخطاء أو تقرير. تكرار الروتين في يوم آخر اختياري، كما أن اختيار الراحة قرار عائلي مسؤول عندما يكون اليوم مزدحمًا أو متعبًا.",
      "يقدم الدليل بنية عامة لكنه لا يعرف جدول كل أسرة أو لغاتها أو ثقافتها أو حاجات الوصول أو خبراتها السابقة. احتفظوا بما يدعم التواصل واتركوا ما لا يناسبكم. تغيير الترتيب أو تقليل الكلمات أو البقاء مع صورة مفضلة يعد تكييفًا مسؤولًا وليس استعمالًا خاطئًا. ليس مطلوبًا أن تبدو الجلسة مثل المثال المكتوب، لأن القيمة تأتي من وضوح الخطوة وهدوء العلاقة لا من مطابقة قالب واحد.",
    ],
    sourceNote: "نربط بمصادر رسمية أو أصلية لشرح المبدأ وراء الممارسة. لا يعني المصدر تأييد Fursay ولا يضمن أن الروتين يناسب كل طفل.",
    correction: "هل وجدتم جملة غير واضحة أو غير صحيحة؟ أرسلوا رابط الصفحة والجملة إلى مسار التصحيح.",
    related: "افتحوا عالم القصة المرتبط", sample: "افتحوا العينة المجانية القابلة للطباعة",
  },
};

const TRUST = {
  about: {
    en: ["About Fursay", "Parent-led bilingual story moments", [
      ["Why Fursay exists", "Fursay began with a family need: quieter bilingual stories that an adult and young child could share without a noisy reward loop. Koko supports gentle English exposure for Mandarin-speaking families. Nour and Zayd support small Chinese moments for Arabic-speaking families."],
      ["Who the site is for", "The website, email list, guides, and printables are directed to adult parents and caregivers. Children may enjoy a story with an adult, but Fursay does not provide child accounts or ask children to submit personal information."],
      ["What we make", "We publish story entry points, parent discussion prompts, episode guides, and complete free printable samples. Current public product pages are family use guides for those samples, with an optional adult email route for future story-pack updates."],
      ["Our responsibility", "We separate family suggestions from claims about education, health, or development. Editorial pages show a team byline, update date, sources, limitations, and a correction route. Affiliate links are optional, labeled, and do not change the price a family pays."],
    ]],
    zh: ["關於 Fursay", "由父母帶領的雙語故事時刻", [["為什麼開始", "Fursay 源自一個家庭需求：我們想要更安靜的雙語故事，讓成人與幼兒可以一起看，不依靠吵鬧的獎勵循環。Koko 為華語家庭提供輕量英文接觸；努爾與 Zayd 為阿語家庭提供簡短中文時刻。"], ["網站寫給誰", "網站、電子郵件名單、指南與可列印內容都以成年父母和照顧者為對象。孩子可以和成人一起享受故事，但 Fursay 不提供兒童帳戶，也不要求兒童提交個人資料。"], ["我們製作什麼", "我們發布故事入口、家長提問、單集指南與完整免費可列印樣本。目前公開產品頁是這些樣本的家庭使用指南；想知道未來故事包消息時，成年家長可自行選擇電子郵件更新。"], ["內容責任", "我們把家庭建議與教育、健康或發展宣稱分開。編輯頁顯示團隊署名、更新日期、資料來源、限制與修正入口；聯盟連結是選擇性資源，清楚標示且不改變家庭支付價格。"]]],
    ar: ["حول Fursay", "لحظات قصة ثنائية اللغة يقودها الوالدان", [["لماذا بدأنا", "بدأت Fursay من حاجة عائلية إلى قصص ثنائية اللغة أكثر هدوءًا يشاركها بالغ وطفل من دون دورة مكافآت صاخبة. تدعم Koko تعرضًا لطيفًا للإنجليزية، وتدعم نور وZayd لحظات صينية صغيرة للعائلات العربية."], ["لمن هذا الموقع", "الموقع والقائمة البريدية والأدلة والمواد القابلة للطباعة موجهة إلى الوالدين ومقدمي الرعاية البالغين. يمكن للطفل الاستمتاع بالقصة مع بالغ، لكن Fursay لا توفر حسابات للأطفال ولا تطلب منهم بيانات شخصية."], ["ماذا نصنع", "ننشر مداخل للقصص وأسئلة للوالدين وأدلة حلقات وعينات مجانية كاملة قابلة للطباعة. صفحات المنتجات العامة أدلة أسرية لهذه العينات، ويمكن للبالغ اختيار تحديثات البريد للحزم المقبلة إن أراد."], ["مسؤوليتنا", "نفصل اقتراحات الأسرة عن الادعاءات التعليمية أو الصحية أو النمائية. تعرض الصفحات التحريرية اسم الفريق والتاريخ والمصادر والحدود ومسار التصحيح. روابط العمولة اختيارية وواضحة ولا تغير السعر."]]],
  },
  "editorial-method": {
    en: ["Fursay editorial method", "How we choose, write, review, and correct parent-facing content", [["Choose a real question", "Every guide starts with one situation a parent may encounter during story time. We avoid manufacturing a broad promise and define one practical outcome that can be tried without buying anything."], ["Use accountable sources", "We prefer official public-health, education, language, or original research sources. Each long guide explains why a source is relevant. Sources inform a principle; they do not prove a Fursay activity will produce a result."], ["Write for the adult", "Instructions address a parent or caregiver, keep the home language available, and accept nonverbal participation. We do not ask a child to create an account or submit a name, age, school, photo, or contact detail."], ["Review claims and limits", "Before release we check titles, examples, sources, commercial links, accessibility, translations, and structured data. We remove guaranteed outcomes and add a limitation whenever a reader might mistake family guidance for assessment or treatment."], ["Corrections and revisions", "Each guide has a visible update date and unique revision note. Readers can report a sentence through Contact. Material corrections update the visible note, Article schema, sitemap lastmod, and AdSense stability window."]]],
    zh: ["Fursay 編輯方法", "如何選題、撰寫、審閱與修正家長內容", [["從真實問題開始", "每篇指南從家長在故事時間可能遇到的一個情境開始。我們不製造寬泛承諾，而是定義一個不必購買任何東西也能嘗試的實際目標。"], ["使用可追溯來源", "優先採用官方公共健康、教育、語言資料或原始研究。每篇長指南說明來源與主題的關係；來源支持原則，不代表證明 Fursay 活動一定產生成果。"], ["內容寫給成人", "指示以父母或照顧者為對象，允許使用家庭主要語言，也接受非口語參與。我們不要求孩子建立帳戶或提交姓名、年齡、學校、照片或聯絡資料。"], ["審查宣稱與限制", "發布前檢查標題、例子、來源、商業連結、無障礙、翻譯與結構化資料；移除保證成果，並在家庭建議可能被誤認為評估或治療時補上限制。"], ["修正與版本", "每篇指南顯示更新日期與獨立修訂說明。讀者可從聯絡頁回報原句；重大修正同步更新可見說明、Article schema、sitemap lastmod 與 AdSense 穩定窗口。"]]],
    ar: ["منهج تحرير Fursay", "كيف نختار ونكتب ونراجع ونصحح المحتوى الموجه للوالدين", [["اختيار سؤال حقيقي", "يبدأ كل دليل بموقف قد يواجهه الوالد أثناء القصة. لا نصنع وعدًا واسعًا، بل نحدد نتيجة عملية واحدة يمكن تجربتها من دون شراء."], ["مصادر قابلة للمساءلة", "نفضل المصادر الرسمية في الصحة والتعليم واللغة أو البحث الأصلي. يشرح كل دليل صلة المصدر. يدعم المصدر مبدأ ولا يثبت أن نشاط Fursay سيحقق نتيجة."], ["الكتابة للبالغ", "تخاطب التعليمات والدًا أو مقدم رعاية، وتبقي لغة البيت متاحة، وتقبل المشاركة غير اللفظية. لا نطلب من الطفل حسابًا أو اسمًا أو عمرًا أو مدرسة أو صورة أو وسيلة اتصال."], ["مراجعة الادعاءات والحدود", "نراجع العناوين والأمثلة والمصادر والروابط التجارية وإتاحة الوصول والترجمات والبيانات المنظمة. نحذف النتائج المضمونة ونضيف حدًا عندما يمكن الخلط بين الإرشاد والتقييم أو العلاج."], ["التصحيح والمراجعة", "لكل دليل تاريخ تحديث وملاحظة مراجعة مستقلة. يمكن الإبلاغ عن جملة عبر صفحة التواصل. يحدث التصحيح المهم الملاحظة وArticle schema وsitemap وفترة استقرار AdSense."]]],
  },
  contact: {
    en: ["Contact and corrections", "Tell us exactly what needs attention", [["General contact", "Email contact@fursay.com and include the page URL, language, and whether your question concerns Koko or Nour."], ["Report a content correction", "Quote the sentence, explain what appears wrong or unclear, and include an accountable source when available. We review the public claim rather than requesting private family information."], ["Privacy requests", "An adult subscriber can ask about access, deletion, or unsubscribing. Do not send a child's name, age, school, health information, password, payment data, or private story."], ["Technical support", "For a broken PDF or page, include the URL, browser, device type, and what happened. Screenshots should exclude email addresses and other personal information."], ["Response boundary", "Fursay cannot provide emergency, medical, developmental, legal, or individualized educational advice. Contact an appropriate local service or qualified professional for urgent or personal concerns."]]],
    zh: ["聯絡與內容修正", "請清楚告訴我們哪個公開內容需要處理", [["一般聯絡", "寄信至 contact@fursay.com，附上頁面網址、語言，以及問題屬於 Koko 或努爾。"], ["回報內容修正", "引用原句、說明可能錯誤或不清楚之處，有可追溯資料時一併提供。我們審查公開宣稱，不要求家庭提供私人情節。"], ["隱私請求", "成年訂閱者可以詢問存取、刪除或取消訂閱。請勿寄送孩子姓名、年齡、學校、健康資料、密碼、付款資料或私人故事。"], ["技術支援", "PDF 或頁面無法使用時，提供網址、瀏覽器、裝置類型與發生情況；螢幕截圖應先排除電子郵件與其他個資。"], ["回覆界線", "Fursay 不能提供緊急、醫療、發展、法律或個別教育建議。急迫或個人疑慮應聯絡所在地適當服務或合格專業人員。"]]],
    ar: ["التواصل وتصحيح المحتوى", "أخبرونا بدقة ما الذي يحتاج إلى المراجعة", [["تواصل عام", "راسلوا contact@fursay.com مع رابط الصفحة واللغة وهل السؤال عن Koko أو نور."], ["الإبلاغ عن تصحيح", "انقلوا الجملة واشرحوا الخطأ أو الغموض وأضيفوا مصدرًا مسؤولًا إن توفر. نراجع الادعاء العام ولا نطلب قصة عائلية خاصة."], ["طلبات الخصوصية", "يمكن للمشترك البالغ طلب الوصول أو الحذف أو إلغاء الاشتراك. لا ترسلوا اسم طفل أو عمره أو مدرسته أو معلومات صحية أو كلمة مرور أو بيانات دفع."], ["دعم تقني", "عند تعطل PDF أو صفحة أرسلوا الرابط والمتصفح ونوع الجهاز وما حدث. يجب إزالة البريد وأي بيانات شخصية من الصور."], ["حدود الرد", "لا تقدم Fursay مساعدة طارئة أو طبية أو نمائية أو قانونية أو تعليمية فردية. تواصلوا مع خدمة محلية مناسبة أو مختص مؤهل للمخاوف العاجلة أو الشخصية."]]],
  },
  terms: {
    en: ["Fursay terms of use", "Boundaries for free stories, downloads, subscriptions, and links", [["Free content", "Stories, guides, and current samples are offered for personal family use. Do not resell, remove attribution from, or redistribute printable files as a competing product."], ["No paid order today", "Fursay currently displays no public price, checkout, or payment link. Product pages describe presale preparation and interest only. An email signup or download does not create an order."], ["Email subscriptions", "An adult submits the email form voluntarily and can unsubscribe in every message. Do not submit a child's email address or personal information."], ["Affiliate links", "Some book links are sponsored affiliate links and may earn Fursay a commission without changing the listed retailer price. Retailer availability, pricing, shipping, and policies are controlled by the retailer."], ["No guarantee", "Content is general parent-facing information. It does not guarantee language learning, replace school instruction, or provide medical, developmental, legal, or professional advice."], ["Changes", "We may update content, routes, and these terms. Material editorial changes receive a visible revision date. Paid terms, refunds, and checkout rules require separate review before any paid release."]]],
    zh: ["Fursay 使用條款", "免費故事、下載、訂閱與外部連結的使用界線", [["免費內容", "故事、指南與目前樣本提供家庭個人使用。請勿轉售、移除出處，或把可列印檔案重新散布成競爭產品。"], ["目前沒有付費訂單", "Fursay 目前不顯示公開價格、結帳或付款連結。產品頁只描述預售準備與興趣；電子郵件訂閱或下載不會建立訂單。"], ["電子郵件訂閱", "成年使用者自願提交表單，每封信都能取消訂閱。請勿提交孩子的電子郵件或個人資料。"], ["聯盟連結", "部分書籍連結為 sponsored 聯盟連結，Fursay 可能取得佣金而不改變零售商標示價格；供貨、價格、運送與政策由零售商控制。"], ["不保證成果", "內容是一般家長資訊，不保證語言學習成果，不取代學校教學，也不提供醫療、發展、法律或專業建議。"], ["變更", "我們可能更新內容、路徑與條款；重大編輯變更會顯示修訂日期。任何付費發布前，價格、退款與結帳規則需另行審核。"]]],
    ar: ["شروط استخدام Fursay", "حدود القصص المجانية والتنزيل والاشتراك والروابط", [["محتوى مجاني", "تقدم القصص والأدلة والعينات الحالية للاستخدام العائلي الشخصي. لا تعيدوا بيع الملفات أو إزالة النسبة أو توزيعها كمنتج منافس."], ["لا طلب مدفوع اليوم", "لا تعرض Fursay سعرًا عامًا أو دفعًا أو رابط دفع. تصف صفحات المنتجات الاستعداد والاهتمام فقط. لا ينشئ الاشتراك أو التنزيل طلبًا."], ["اشتراك البريد", "يرسل بالغ النموذج باختياره ويمكنه إلغاء الاشتراك في كل رسالة. لا ترسلوا بريد طفل أو بياناته الشخصية."], ["روابط العمولة", "بعض روابط الكتب روابط sponsored وقد تكسب Fursay عمولة من دون تغيير سعر المتجر. يتحكم المتجر في التوفر والسعر والشحن والسياسات."], ["لا ضمان", "المحتوى معلومات عامة للوالدين. لا يضمن تعلم اللغة ولا يحل محل المدرسة ولا يقدم نصيحة طبية أو نمائية أو قانونية أو مهنية."], ["التغييرات", "قد نحدث المحتوى والمسارات والشروط، وتحمل التغييرات المهمة تاريخ مراجعة ظاهرًا. تحتاج الأسعار والاسترداد والدفع إلى مراجعة مستقلة قبل أي إصدار مدفوع."]]],
  },
  privacy: {
    en: ["Fursay privacy", "Minimum data for a parent-directed family story site", [["Adult-directed service", "Fursay's site, forms, guides, and printables are directed to adult parents and caregivers. We do not provide child accounts and do not ask a child for a name, age, school, photo, address, or contact detail."], ["Anonymous interaction signals", "We record page path, language, product ID, source, placement, interest stage, and event time. Analytics events exclude names, email addresses, phone numbers, addresses, payment data, and MailerLite identifiers."], ["Email subscriptions", "Only when an adult submits the free story-pack form do we send the email address and selected pack to our newsletter provider. Every message includes an unsubscribe option. The public form does not request child details."], ["Affiliate links", "A click on a disclosed affiliate link may be counted as an anonymous outbound event. The external retailer applies its own privacy policy after the visitor leaves Fursay."], ["Advertising status", "Fursay publishes an AdSense account connection and ads.txt authorization record for site review, but advertising runtime is not enabled. If ads are approved later, this notice and required consent controls must be reviewed before activation."], ["Requests", "An adult subscriber may ask about access or deletion by emailing contact@fursay.com. Do not include child information, passwords, or payment data in the request."]]],
    zh: ["Fursay 隱私說明", "家長導向親子故事網站的最少資料原則", [["成人導向服務", "Fursay 的網站、表單、指南與可列印內容以成年父母和照顧者為對象。我們不提供兒童帳戶，也不向孩子索取姓名、年齡、學校、照片、地址或聯絡資料。"], ["匿名互動訊號", "記錄頁面路徑、語言、產品代號、來源、placement、interest stage 與事件時間。分析事件排除姓名、電子郵件、電話、地址、付款資料與 MailerLite 識別碼。"], ["電子郵件訂閱", "只有成年使用者主動送出免費故事包表單時，電子郵件與所選故事包才會傳給電子報服務商；每封信都有取消入口，公開表單不要求孩子資料。"], ["聯盟連結", "點擊已揭露的聯盟連結可能被計為匿名外連事件。訪客離開 Fursay 後，外部零售商適用自己的隱私政策。"], ["廣告狀態", "Fursay 為網站審核發布 AdSense account connection 與 ads.txt 授權紀錄，但沒有啟用廣告 runtime。若日後核准，啟用前必須重新審查本說明與必要同意控制。"], ["資料請求", "成年訂閱者可寄信至 contact@fursay.com 詢問存取或刪除。請勿在請求中附上孩子資料、密碼或付款資訊。"]]],
    ar: ["خصوصية Fursay", "الحد الأدنى من البيانات لموقع قصص عائلية موجه للوالدين", [["خدمة موجهة للبالغ", "الموقع والنماذج والأدلة والمواد موجهة للوالدين ومقدمي الرعاية البالغين. لا نوفر حسابات للأطفال ولا نطلب اسم طفل أو عمره أو مدرسته أو صورته أو عنوانه أو وسيلة اتصال."], ["إشارات تفاعل مجهولة", "نسجل مسار الصفحة واللغة ومعرف المنتج والمصدر وplacement وinterest stage ووقت الحدث. تستبعد التحليلات الأسماء والبريد والهاتف والعنوان والدفع ومعرفات MailerLite."], ["اشتراك البريد", "لا نرسل البريد والحزمة إلى مزود النشرة إلا عندما يرسل بالغ النموذج باختياره. تتضمن كل رسالة إلغاء الاشتراك، ولا يطلب النموذج العام تفاصيل طفل."], ["روابط العمولة", "قد يحسب النقر على رابط عمولة معلن كحدث خروج مجهول. تطبق سياسة المتجر الخارجي بعد مغادرة Fursay."], ["حالة الإعلانات", "تنشر Fursay اتصال حساب AdSense وسجل ads.txt للمراجعة، لكن تشغيل الإعلانات غير مفعل. إذا تمت الموافقة يجب مراجعة الإشعار وضوابط الموافقة قبل التفعيل."], ["الطلبات", "يمكن للمشترك البالغ طلب الوصول أو الحذف عبر contact@fursay.com. لا ترسلوا معلومات طفل أو كلمات مرور أو بيانات دفع."]]],
  },
  support: {
    en: ["Fursay support", "Help with story pages, free samples, and subscriptions", [["What to include", "Send the page URL, language, Koko or Nour pack, device, browser, and a short description to contact@fursay.com. Do not send passwords, payment data, or child information."], ["Printable problems", "If a PDF opens but prints incorrectly, mention paper size and whether scaling was set to fit. The current samples use US Letter pages. A screenshot may help after personal information is removed."], ["Subscription help", "An adult subscriber can use the unsubscribe link in any email. For another request, write from the subscribed address and do not include private information about a child."], ["No paid order support yet", "The site has no purchase button, public price, or payment link. There are no paid Fursay orders to refund. Pricing, refunds, payment provider, and checkout tracking remain review-required."], ["Content questions", "Use the correction route for a public sentence that appears wrong or unclear. Fursay cannot provide emergency, medical, developmental, legal, or individualized educational advice."]]],
    zh: ["Fursay 支援", "故事頁、免費樣本與訂閱協助", [["請提供的資訊", "寄信至 contact@fursay.com，提供頁面網址、語言、Koko 或努爾故事包、裝置、瀏覽器與簡短情況。請勿傳送密碼、付款資料或孩子資訊。"], ["列印問題", "PDF 能開啟但列印異常時，請說明紙張尺寸與是否使用符合頁面縮放。目前樣本使用 US Letter；截圖可在移除個資後提供。"], ["訂閱協助", "成年訂閱者可使用每封信的取消入口；其他請求請從訂閱信箱寄出，且不要附上孩子私人資訊。"], ["目前沒有付費訂單支援", "網站沒有購買按鈕、公開價格或付款連結，因此沒有可退款的付費 Fursay 訂單。價格、退款、付款提供商與結帳追蹤仍需審核。"], ["內容問題", "公開句子可能有誤或不清楚時，請使用內容修正入口。Fursay 不能提供緊急、醫療、發展、法律或個別教育建議。"]]],
    ar: ["دعم Fursay", "مساعدة في صفحات القصص والعينات والاشتراك", [["المعلومات المطلوبة", "أرسلوا رابط الصفحة واللغة وحزمة Koko أو نور والجهاز والمتصفح ووصفًا قصيرًا إلى contact@fursay.com. لا ترسلوا كلمات مرور أو دفعًا أو معلومات طفل."], ["مشكلات الطباعة", "إذا فتح PDF ولم يطبع جيدًا فاذكروا حجم الورق وإعداد الملاءمة. تستخدم العينات الحالية US Letter. يمكن إرسال صورة بعد إزالة البيانات الشخصية."], ["مساعدة الاشتراك", "يمكن للمشترك البالغ استخدام رابط الإلغاء في أي رسالة. للطلبات الأخرى اكتبوا من العنوان المشترك ولا تضيفوا معلومات خاصة بطفل."], ["لا دعم لطلبات مدفوعة بعد", "لا يوجد زر شراء أو سعر عام أو رابط دفع، لذلك لا توجد طلبات Fursay مدفوعة للاسترداد. يبقى السعر والاسترداد ومزود الدفع والتتبع قيد المراجعة."], ["أسئلة المحتوى", "استخدموا مسار التصحيح لجملة عامة تبدو خاطئة أو غامضة. لا تقدم Fursay نصيحة طارئة أو طبية أو نمائية أو قانونية أو تعليمية فردية."]]],
  },
};

function esc(value) { return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;"); }
function route(locale, suffix) { return `${LOCALES[locale].prefix}${suffix}` || "/"; }
function write(siteDir, routePath, content) {
  const relative = routePath === "/" ? "index.html" : `${routePath.replace(/^\//, "")}.html`;
  mkdirSync(dirname(resolve(siteDir, relative)), { recursive: true });
  writeFileSync(resolve(siteDir, relative), `${content}\n`);
}
function alternateLinks(suffix) {
  return `<link rel="alternate" hreflang="en" href="${ORIGIN}${suffix}"><link rel="alternate" hreflang="zh-TW" href="${ORIGIN}/zh${suffix}"><link rel="alternate" hreflang="ar" href="${ORIGIN}/ar${suffix}"><link rel="alternate" hreflang="x-default" href="${ORIGIN}${suffix}">`;
}
function nav(locale, suffix) {
  const l = LOCALES[locale];
  return `<nav class="brand-nav" aria-label="${l.label}"><div class="brand-shell brand-nav__inner"><a class="brand-nav__logo" href="${route(locale, "/")}">Fursay</a><div class="brand-nav__links"><a href="${route(locale, "/")}">${l.home}</a><a href="${route(locale, "/guides")}">${l.guides}</a><a href="${route(locale, "/products")}">${l.products}</a><a href="${route(locale, "/about")}">${l.about}</a><a href="${route(locale, "/editorial-method")}">${l.method}</a></div><div class="brand-language" aria-label="Language"><a href="${suffix}">EN</a><a href="/zh${suffix}">中文</a><a href="/ar${suffix}">عربي</a></div></div></nav>`;
}
function footer(locale) {
  const l = LOCALES[locale];
  return `<footer class="brand-footer"><div class="brand-shell brand-footer__inner"><strong>Fursay · Parent-led bilingual story moments</strong><div class="brand-footer__links"><a href="${route(locale, "/about")}">${l.about}</a><a href="${route(locale, "/editorial-method")}">${l.method}</a><a href="${route(locale, "/contact")}">${l.contact}</a><a href="${route(locale, "/privacy")}">${l.privacy}</a><a href="${route(locale, "/terms")}">${l.terms}</a><a href="${route(locale, "/support")}">${l.support}</a></div></div></footer>`;
}
function baseHead(locale, suffix, title, description, type = "website") {
  const l = LOCALES[locale]; const canonical = `${ORIGIN}${route(locale, suffix)}`;
  return `<!doctype html><html lang="${l.lang}"${l.dir === "rtl" ? ' dir="rtl"' : ""}><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)} | Fursay</title><meta name="description" content="${esc(description)}"><meta name="google-adsense-account" content="${ADSENSE_ACCOUNT}"><link rel="canonical" href="${canonical}">${alternateLinks(suffix)}<link rel="icon" href="/favicon.svg"><meta name="theme-color" content="#2d6a4f"><meta property="og:type" content="${type}"><meta property="og:site_name" content="Fursay"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(description)}"><meta property="og:url" content="${canonical}"><meta property="og:image" content="${ORIGIN}/og-image.png"><meta name="twitter:card" content="summary_large_image"><link rel="preconnect" href="https://fonts.googleapis.com"><link href="https://fonts.googleapis.com/css2?family=Baloo+2:wght@600;700;800&family=Nunito:wght@400;600;700;800;900&family=Cairo:wght@400;600;700;800&display=swap" rel="stylesheet"><link rel="stylesheet" href="/css/picture-world-tools-20260613-products1.css"><link rel="stylesheet" href="${BRAND_CSS}"><link rel="stylesheet" href="${CSS}"></head>`;
}
function head(locale, suffix, title, description, type = "website") {
  const lang = LOCALES[locale].lang;
  const ogLocale = { en: "en_US", "zh-TW": "zh_TW", ar: "ar_SA" }[lang];
  const alternates = ["en_US", "zh_TW", "ar_SA"].filter((value) => value !== ogLocale);
  const image = `${ORIGIN}/og-image.png`;
  const social = `<meta property="og:image:alt" content="${esc(title)} — Fursay"><meta property="og:locale" content="${ogLocale}">${alternates.map((value) => `<meta property="og:locale:alternate" content="${value}">`).join("")}<meta name="twitter:title" content="${esc(title)}"><meta name="twitter:description" content="${esc(description)}"><meta name="twitter:image" content="${image}"><meta name="twitter:image:alt" content="${esc(title)} — Fursay">`;
  return baseHead(locale, suffix, title, description, type).replace("</head>", `${social}</head>`);
}
function articleBody(locale, guide) {
  const d = guide.details[locale];
  const depth = EDITORIAL_DEPTH[guide.slug];
  if (!depth) throw new Error(`Missing editorial depth for ${guide.slug}`);
  const details = [d.scene, d.goal, d.routine, d.example, d.observe, d.bridge, d.limit];
  const notes = depth.notes[locale];
  const supplements = EDITORIAL_SUPPLEMENTS[guide.slug]?.[locale] || [];
  const localeExtension = EDITORIAL_LOCALE_EXTENSIONS[guide.slug]?.[locale];
  const finalNote = EDITORIAL_FINAL_NOTES[guide.slug]?.[locale];
  return depth.headings[locale].map((heading, index) => {
    const paragraphs = [details[index]];
    if (notes[index]) paragraphs.push(notes[index]);
    if (index === 3 && finalNote) paragraphs.push(finalNote);
    if (index === 4 && localeExtension) paragraphs.push(localeExtension);
    if (index === 5 && supplements[0]) paragraphs.push(supplements[0]);
    if (index === 6 && supplements[1]) paragraphs.push(supplements[1]);
    return `<section id="section-${index + 1}" data-guide-section><h2>${esc(heading)}</h2>${paragraphs.map((paragraph) => `<p data-guide-original>${esc(paragraph)}</p>`).join("")}</section>`;
  }).join("");
}
function guidePage(locale, guide) {
  const l = LOCALES[locale], c = COPY[locale], suffix = `/guides/${guide.slug}`, title = guide.title[locale], description = guide.description[locale];
  const depth = EDITORIAL_DEPTH[guide.slug];
  const guideRoute = route(locale, suffix); const story = route(locale, guide.world === "koko" ? "/koko" : "/arabic"); const product = route(locale, guide.world === "koko" ? "/products/koko-printable" : "/products/noor-worksheet");
  const organization = { "@type": "Organization", "@id": `${ORIGIN}/#organization`, name: "Fursay", url: ORIGIN, email: "contact@fursay.com", contactPoint: { "@type": "ContactPoint", contactType: "customer support", email: "contact@fursay.com", availableLanguage: ["English", "Traditional Chinese", "Arabic"] } };
  const schemas = { "@context": "https://schema.org", "@graph": [{ "@type": "Article", headline: title, description, datePublished: EDITORIAL_UPDATED, dateModified: EDITORIAL_UPDATED, inLanguage: l.lang, mainEntityOfPage: { "@id": `${ORIGIN}${guideRoute}` }, author: { "@type": "Organization", name: c.team, url: `${ORIGIN}${route(locale, "/about")}` }, publisher: { "@id": `${ORIGIN}/#organization` }, image: `${ORIGIN}/og-image.png` }, organization, { "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: l.home, item: `${ORIGIN}${route(locale, "/")}` }, { "@type": "ListItem", position: 2, name: l.guides, item: `${ORIGIN}${route(locale, "/guides")}` }, { "@type": "ListItem", position: 3, name: title, item: `${ORIGIN}${guideRoute}` }] }] };
  const sourceHeading = locale === "zh" ? "資料來源與文章專屬說明" : locale === "ar" ? "المصادر وصلتها بهذا الدليل" : "Sources and guide-specific relevance";
  const relatedHeading = locale === "zh" ? "相關家長指南" : locale === "ar" ? "أدلة تحريرية مرتبطة" : "Related parent guides";
  const todayHeading = locale === "zh" ? "今天可以怎麼做" : locale === "ar" ? "ما الذي يمكن فعله اليوم" : "What you can do today";
  const sources = depth.sources.map(([key, relevance]) => { const [name, url] = EDITORIAL_SOURCE_LIBRARY[key]; return `<li><a href="${esc(url)}" rel="noopener" target="_blank">${esc(name)}</a><p data-source-relevance>${esc(relevance[locale])}</p></li>`; }).join("");
  const editorialLinks = depth.links.map((slug) => { const related = GUIDES.find((item) => item.slug === slug); return `<a href="${route(locale, `/guides/${slug}`)}">${esc(related.title[locale])}</a>`; }).join("");
  return `${head(locale, suffix, title, description, "article")}<body class="brand-surface editorial-page">${nav(locale, suffix)}<main class="editorial-shell"><article><header class="editorial-hero"><p class="brand-kicker">${guide.world === "koko" ? "Koko · English story practice" : "Nour · Chinese story practice"}</p><h1>${esc(title)}</h1><p class="editorial-lede">${esc(description)}</p><div class="editorial-today"><h2>${esc(todayHeading)}</h2><p>${esc(depth.today[locale])}</p></div><p class="editorial-byline" data-guide-editorial-byline data-editorial-standard><strong>${esc(c.team)}</strong> · ${c.published}: <time datetime="${EDITORIAL_UPDATED}">${EDITORIAL_UPDATED}</time> · ${c.updated}: <time datetime="${EDITORIAL_UPDATED}">${EDITORIAL_UPDATED}</time></p><p class="editorial-boundary" data-editorial-standard>${esc(c.intro)}</p></header><nav class="editorial-toc" aria-label="${esc(c.contents)}"><strong>${esc(c.contents)}</strong><ol>${depth.headings[locale].map((item, i) => `<li><a href="#section-${i + 1}">${esc(item)}</a></li>`).join("")}</ol></nav><div class="editorial-body">${articleBody(locale, guide)}<section data-guide-sources><h2>${esc(sourceHeading)}</h2><p data-editorial-standard>${esc(c.sourceNote)}</p><ul class="source-list">${sources}</ul><p data-guide-revision><strong>${c.updated}:</strong> ${esc(guide.details[locale].revision)}</p><p data-editorial-standard><a href="${route(locale, "/editorial-method")}">${esc(l.method)}</a> · <a href="${route(locale, "/contact")}#corrections">${esc(c.correction)}</a></p></section><section class="editorial-related" data-editorial-links><h2>${esc(relatedHeading)}</h2>${editorialLinks}</section><aside class="editorial-next"><a class="brand-btn" href="${story}">${esc(c.related)}</a><a class="brand-btn brand-btn--secondary" href="${product}">${esc(c.sample)}</a></aside></div></article></main>${footer(locale)}<script type="application/ld+json">${JSON.stringify(schemas)}</script><script src="${SHARED_JS}"></script></body></html>`;
}
function guidesHub(locale) {
  const l = LOCALES[locale];
  const title = locale === "zh" ? "家長雙語共讀指南" : locale === "ar" ? "أدلة القراءة الثنائية للوالدين" : "Parent guides for bilingual story time";
  const description = locale === "zh" ? "八個可在家嘗試的英文與中文故事方法，附上具體例子、限制、資料來源與修正紀錄。" : locale === "ar" ? "ثمانية أدلة عملية لقصص الإنجليزية والصينية مع أمثلة وحدود ومصادر وسجل مراجعة." : "Eight practical guides for English and Chinese story moments, with examples, limits, sources, and revision notes.";
  const groups = ["koko", "noor"].map((world) => `<section class="guide-group"><h2>${world === "koko" ? "Koko · English story practice" : "Nour · Chinese story practice"}</h2><div class="guide-grid">${GUIDES.filter((g) => g.world === world).map((g) => `<article class="guide-card"><p class="brand-kicker">${world === "koko" ? "English" : "Chinese + Arabic"}</p><h3><a href="${route(locale, `/guides/${g.slug}`)}">${esc(g.title[locale])}</a></h3><p>${esc(g.description[locale])}</p><p><strong>${COPY[locale].team}</strong> · ${EDITORIAL_UPDATED}</p></article>`).join("")}</div></section>`).join("");
  const schema = { "@context": "https://schema.org", "@type": "CollectionPage", name: title, description, url: `${ORIGIN}${route(locale, "/guides")}`, inLanguage: l.lang, hasPart: GUIDES.map((g) => ({ "@type": "Article", name: g.title[locale], url: `${ORIGIN}${route(locale, `/guides/${g.slug}`)}` })) };
  return `${head(locale, "/guides", title, description)}<body class="brand-surface editorial-page">${nav(locale, "/guides")}<main class="editorial-shell"><header class="editorial-hero"><p class="brand-kicker">Fursay editorial library</p><h1>${esc(title)}</h1><p class="editorial-lede">${esc(description)}</p><p>${esc(COPY[locale].intro)}</p></header>${groups}</main>${footer(locale)}<script type="application/ld+json">${JSON.stringify(schema)}</script><script src="${SHARED_JS}"></script></body></html>`;
}
function trustPage(locale, kind) {
  const l = LOCALES[locale], [title, rawDescription, sections] = TRUST[kind][locale], suffix = `/${kind}`;
  const description = locale === "zh" && kind === "privacy" ? "說明家長導向親子故事網站採用的最少資料原則與成人提交界線" : locale === "zh" && kind === "support" ? "提供故事頁、免費樣本、列印與成人電子郵件訂閱的使用協助" : rawDescription;
  const organization = { "@type": "Organization", "@id": `${ORIGIN}/#organization`, name: "Fursay", url: ORIGIN, email: "contact@fursay.com", contactPoint: { "@type": "ContactPoint", contactType: "customer support", email: "contact@fursay.com", availableLanguage: ["English", "Traditional Chinese", "Arabic"] } };
  const schema = { "@context": "https://schema.org", "@graph": [{ "@type": "WebPage", name: title, description, url: `${ORIGIN}${route(locale, suffix)}`, inLanguage: l.lang, datePublished: EDITORIAL_UPDATED, dateModified: EDITORIAL_UPDATED, author: { "@id": `${ORIGIN}/#organization` }, publisher: { "@id": `${ORIGIN}/#organization` } }, organization] };
  const subjects = locale === "zh" ? ["Fursay 一般聯絡", "Fursay 內容修正", "Fursay 隱私請求", "Fursay 技術問題"] : locale === "ar" ? ["تواصل عام مع Fursay", "تصحيح محتوى Fursay", "طلب خصوصية Fursay", "مشكلة تقنية في Fursay"] : ["Fursay general contact", "Fursay content correction", "Fursay privacy request", "Fursay technical issue"];
  const renderedSections = sections.map(([h, p], i) => { const mail = kind === "contact" && i < 4 ? ` <a class="editorial-mail" href="mailto:contact@fursay.com?subject=${encodeURIComponent(subjects[i])}">contact@fursay.com</a>` : ""; return `<section${kind === "contact" && i === 1 ? ' id="corrections"' : ""}><h2>${esc(h)}</h2><p>${esc(p)}${mail}</p></section>`; }).join("");
  return `${head(locale, suffix, title, description)}<body class="brand-surface editorial-page policy-brand-page">${nav(locale, suffix)}<main class="editorial-shell"><article class="policy-card editorial-trust"><header><p class="brand-kicker">Fursay trust & accountability</p><h1>${esc(title)}</h1><p class="editorial-lede">${esc(description)}</p><p class="editorial-byline"><strong>Fursay</strong> · ${COPY[locale].updated}: <time datetime="${EDITORIAL_UPDATED}">${EDITORIAL_UPDATED}</time></p></header>${renderedSections}</article></main>${footer(locale)}<script type="application/ld+json">${JSON.stringify(schema)}</script><script src="${SHARED_JS}"></script></body></html>`;
}
function patchExistingIndexable(siteDir) {
  const sitemap = readFileSync(resolve(siteDir, "sitemap.xml"), "utf8");
  const paths = [...sitemap.matchAll(/<loc>https:\/\/fursay\.com([^<]*)<\/loc>/g)].map((m) => m[1] || "/");
  for (const path of paths) {
    const file = resolve(siteDir, path === "/" ? "index.html" : path.endsWith("/") ? `${path.replace(/^\//, "")}index.html` : `${path.replace(/^\//, "")}.html`);
    let html = readFileSync(file, "utf8");
    html = html.replace(/<link rel="stylesheet" href="\/css\/editorial-[^"]+">/g, (tag) => tag.includes(CSS) ? tag : "");
    html = html.replace(/rel="noopener sponsored"/g, 'rel="sponsored noopener"');
    html = html.replace(/<section class="booklist-sec"([\s\S]*?)<\/section>/g, (section) => {
      const cards = [...section.matchAll(/\s*<div class="book-card reveal">[\s\S]*?<\/div>\s*<\/div>/g)].map((match) => match[0]);
      return cards.slice(2).reduce((trimmed, card) => trimmed.replace(card, ""), section);
    });
    if (!html.includes('name="google-adsense-account"')) html = html.replace(/<meta name="description"[^>]*>/i, (tag) => `${tag}<meta name="google-adsense-account" content="${ADSENSE_ACCOUNT}">`);
    if (!html.includes(`href="${CSS}"`)) html = html.replace(/<\/head>/i, `<link rel="stylesheet" href="${CSS}"></head>`);
    html = html.replace(/<div class="stat-num">1000\+<\/div><div class="stat-label">(?:Stories|故事|集)<\/div>/g, '<div class="stat-num">Growing</div><div class="stat-label">story library</div>');
    html = html.replace(/<div class="stat-num">100\+<\/div><div class="stat-label">(?:Stories|故事|集)<\/div>/g, '<div class="stat-num">Growing</div><div class="stat-label">story library</div>');
    html = html.replace(/觀看全部 1000\+ 集/g, "觀看故事頻道");
    if (!html.includes("editorial-page") && !html.includes("data-editorial-nav")) {
      const locale = path.startsWith("/zh/") || path === "/zh/" ? "zh" : path.startsWith("/ar/") || path === "/ar/" ? "ar" : "en";
      const links = `<div class="editorial-utility-links" data-editorial-nav><a href="${route(locale, "/guides")}">${LOCALES[locale].guides}</a><a href="${route(locale, "/about")}">${LOCALES[locale].about}</a><a href="${route(locale, "/editorial-method")}">${LOCALES[locale].method}</a></div>`;
      html = html.replace(/<\/nav>/i, `${links}</nav>`);
    }
    if (/class="booklist-note\b/.test(html) && !html.includes("data-booklist-editorial-note")) {
      const locale = path.startsWith("/zh/") || path === "/zh/" ? "zh" : path.startsWith("/ar/") || path === "/ar/" ? "ar" : "en";
      const note = locale === "zh" ? "書單只延伸本頁的核心故事主題，不是完成活動的必要步驟。我們保留兩本和角色情境最直接相關的書，讓家長先看內容說明，再自行判斷語言、文化、紙本形式與家庭預算是否合適。零售商決定供貨與版本；孩子不需要購買或讀完任何一本，仍可使用故事與免費樣本。" : locale === "ar" ? "تمتد القائمة من موضوع القصة الأساسي وليست خطوة لازمة لإكمال النشاط. نحتفظ بكتابين مرتبطين مباشرة بالمشهد كي يقرأ الوالد الوصف ويقرر ملاءمة اللغة والثقافة والصيغة والميزانية. يتحكم المتجر في التوفر والنسخ، ويمكن للأسرة استعمال القصة والعينة المجانية من دون شراء أو إكمال أي كتاب." : "The booklist extends the page's core story theme; it is not required to complete an activity. We keep two books with the clearest connection to the scene so an adult can read the description and decide whether the language, culture, format, and family budget fit. Retailers control availability and editions, and families can use the story and free sample without buying or finishing either book.";
      html = html.replace(/<p class="booklist-note([^"]*)">/, `<p class="booklist-editorial-note" data-booklist-editorial-note>${esc(note)}</p><p class="booklist-note$1">`);
    }
    writeFileSync(file, html);
  }
  const linksFile = resolve(siteDir, "links.html");
  let linksHtml = readFileSync(linksFile, "utf8");
  if (!/name=["']robots["']/i.test(linksHtml)) linksHtml = linksHtml.replace(/<meta name="description"[^>]*>/i, (tag) => `${tag}<meta name="robots" content="noindex,follow">`);
  writeFileSync(linksFile, linksHtml);
}
function patchLlms(siteDir) {
  const file = resolve(siteDir, "llms.txt");
  let text = readFileSync(file, "utf8");
  text = text.replace(/Current expected Books\.com\.tw affiliate links: \d+/, "Current expected Books.com.tw affiliate links: 10");
  text = text.replace(/Current expected Amazon affiliate links: \d+/, "Current expected Amazon affiliate links: 20");
  const start = "Editorial library:";
  const end = "Creator and sharing references:";
  const lines = [start, ...Object.values(LOCALES).flatMap((locale) => [
    `${ORIGIN}${locale.prefix}/guides`,
    `${ORIGIN}${locale.prefix}/about`,
    `${ORIGIN}${locale.prefix}/editorial-method`,
    `${ORIGIN}${locale.prefix}/contact`,
    `${ORIGIN}${locale.prefix}/terms`,
    ...GUIDE_SLUGS.map((slug) => `${ORIGIN}${locale.prefix}/guides/${slug}`),
  ]), ""];
  const block = `${lines.join("\n")}\n`;
  const pattern = new RegExp(`${start}[\\s\\S]*?(?=${end})`);
  text = pattern.test(text) ? text.replace(pattern, block) : text.replace(end, `${block}${end}`);
  writeFileSync(file, text);
}
function patchSiteStructure(siteDir) {
  const file = resolve(siteDir, "data/site-structure.json");
  const data = JSON.parse(readFileSync(file, "utf8"));
  data.sharedAssets ||= {};
  data.sharedAssets.css ||= [];
  data.sharedAssets.css = data.sharedAssets.css.filter((asset) => !/^\/css\/editorial-/.test(asset) || asset === CSS);
  if (!data.sharedAssets.css.includes(CSS)) data.sharedAssets.css.push(CSS);
  const retained = (data.pages || []).filter((page) => page.type !== "editorialGuide" && page.type !== "editorialTrust" && page.key !== "guides");
  const localizedRoutes = (suffix) => ({ en: suffix, "zh-TW": `/zh${suffix}`, ar: `/ar${suffix}` });
  const editorial = [
    { key: "guides", route: "/guides", type: "editorialHub", localizedRoutes: localizedRoutes("/guides") },
    ...GUIDES.map((guide) => ({ key: `guide-${guide.slug}`, route: `/guides/${guide.slug}`, type: "editorialGuide", localizedRoutes: localizedRoutes(`/guides/${guide.slug}`) })),
    ...["about", "editorial-method", "contact", "terms"].map((name) => ({ key: name, route: `/${name}`, type: "editorialTrust", localizedRoutes: localizedRoutes(`/${name}`) })),
  ];
  data.pages = [...retained, ...editorial];
  writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);
}
function writeCss(siteDir) {
  const css = `.editorial-shell{width:min(1120px,calc(100% - 32px));margin:0 auto;padding:48px 0 72px}.editorial-hero{max-width:820px;margin:0 auto 32px}.editorial-hero h1{font:800 clamp(2.25rem,5vw,4.5rem)/1.03 "Baloo 2","Cairo",sans-serif;color:#173f35}.editorial-lede{font-size:1.18rem;line-height:1.75;color:#365b52}.editorial-today{margin:24px 0;padding:20px 22px;border-radius:24px;background:#eef8f2;border:1px solid #cfe4d6}.editorial-today h2{margin:0 0 8px;font:800 1.35rem/1.2 "Baloo 2","Cairo",sans-serif;color:#215b4a}.editorial-today p{margin:0;line-height:1.7}.editorial-byline,.editorial-boundary{padding:14px 18px;border-radius:18px;background:#fff8e8;border:1px solid #eadbb8;line-height:1.6}.editorial-toc{max-width:820px;margin:0 auto 32px;padding:22px 26px;border-radius:24px;background:#eef8f2}.editorial-toc ol{columns:2;gap:36px}.editorial-toc li{margin:.55rem 0}.editorial-body{max-width:820px;margin:0 auto}.editorial-body section{scroll-margin-top:24px;margin:0 0 34px}.editorial-body h2,.guide-group h2,.editorial-trust h2{font:800 clamp(1.55rem,3vw,2.2rem)/1.15 "Baloo 2","Cairo",sans-serif;color:#215b4a}.editorial-body p,.editorial-trust p{font-size:1.05rem;line-height:1.85;color:#294940}.source-list li{margin:0 0 18px}.source-list p{font-size:.96rem}.editorial-related{display:flex;gap:12px;flex-wrap:wrap;padding:22px;border-radius:22px;background:#f4faf6}.editorial-related h2{flex-basis:100%;margin:0}.editorial-related a,.editorial-mail{font-weight:800;color:#1f624e;text-underline-offset:3px}.editorial-next{display:flex;gap:12px;flex-wrap:wrap;margin-top:36px}.guide-group{margin:54px 0}.guide-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:22px}.guide-card{padding:26px;border-radius:26px;background:#fff;border:1px solid #d9e9df;box-shadow:0 12px 30px rgba(31,85,68,.08)}.guide-card h3{font:800 1.45rem/1.2 "Baloo 2","Cairo",sans-serif}.guide-card p{line-height:1.7}.editorial-trust{max-width:820px;margin:0 auto}.editorial-utility-links{display:flex;gap:12px;align-items:center;justify-content:center;padding:8px 16px;background:#eef8f2;font-weight:800}.editorial-utility-links a{color:#245948;text-decoration:none}body.picture-world .editorial-utility-links{position:absolute;top:calc(100% + 8px);right:0;width:max-content;max-width:100%;border:1px solid #d9e9df;border-radius:16px;box-shadow:0 8px 22px rgba(31,85,68,.1)}html[dir="rtl"] body.picture-world .editorial-utility-links{right:auto;left:0}@media(max-width:760px){.editorial-shell{padding-top:28px}.editorial-toc ol{columns:1}.guide-grid{grid-template-columns:1fr}.editorial-utility-links{flex-wrap:wrap;font-size:.9rem}.brand-nav__links{overflow-x:auto}.editorial-body p{font-size:1rem}}@media(prefers-reduced-motion:reduce){.editorial-page *{scroll-behavior:auto!important;animation:none!important;transition:none!important}}`;
  const mobileEditorialNav = `@media(max-width:900px){.editorial-page .brand-nav__inner{flex-wrap:wrap;padding-block:8px}.editorial-page .brand-nav__links{display:flex;width:100%;order:3;margin:0;flex-wrap:wrap;justify-content:center;gap:4px}.editorial-page .brand-nav__links a{flex:0 1 auto;min-height:44px;padding-inline:10px}.editorial-page .editorial-shell{padding-top:32px}}`;
  writeFileSync(resolve(siteDir, CSS.replace(/^\//, "")), `${css}${mobileEditorialNav}\n`);
}

export function writeEditorialBundle(siteDir) {
  for (const locale of Object.keys(LOCALES)) {
    write(siteDir, route(locale, "/guides"), guidesHub(locale));
    for (const guide of GUIDES) write(siteDir, route(locale, `/guides/${guide.slug}`), guidePage(locale, guide));
    for (const kind of ["about", "editorial-method", "contact", "terms", "privacy", "support"]) write(siteDir, route(locale, `/${kind}`), trustPage(locale, kind));
  }
  writeCss(siteDir);
  writeFileSync(resolve(siteDir, "ads.txt"), `google.com, ${PUBLISHER_ID}, DIRECT, f08c47fec0942fa0\n`);
  const distinctSources = new Set(Object.values(EDITORIAL_DEPTH).flatMap((guide) => guide.sources.map(([key]) => key))).size;
  writeFileSync(resolve(siteDir, "adsense-readiness.json"), `${JSON.stringify({ schemaVersion: 1, status: "not_ready", contentTemplateRisk: "passed", distinctEditorialSources: distinctSources, minimumDistinctEditorialSources: 16, commercialIndexingPolicy: "maintained", operatorDisclosureMode: "brand", readyToSubmit: false, publisherId: PUBLISHER_ID, lovetypesPrerequisite: "ready", adRuntimeEnabled: false, reviewSubmitted: false, minimumStableDays: 14, maximumEvidenceAgeDays: 3, lastMaterialChange: EDITORIAL_UPDATED, externalGates: { lovetypesReady: false, adsTxtAuthorized: false, gscSitemapAccepted: false, importantPagesRecrawled: false, editorialPagesWithImpressions: { value: 0, minimum: 5, confirmed: false }, unexpectedUrlsLeavingIndex: false, productionAuditGreen: false, stableWindowComplete: false, reviewActionAvailable: false } }, null, 2)}\n`);
  patchLlms(siteDir);
  patchSiteStructure(siteDir);
  patchExistingIndexable(siteDir);
}

export function editorialSitemapEntries(sitemapUrl) {
  const localized = (suffix) => ({ en: `${ORIGIN}${suffix}`, "zh-TW": `${ORIGIN}/zh${suffix}`, ar: `${ORIGIN}/ar${suffix}`, "x-default": `${ORIGIN}${suffix}` });
  const paths = ["/guides", ...GUIDE_SLUGS.map((slug) => `/guides/${slug}`), "/about", "/editorial-method", "/contact", "/terms"];
  return paths.flatMap((path) => {
    const alts = localized(path); const priority = path === "/guides" ? "0.8" : path.startsWith("/guides/") ? "0.7" : "0.4";
    return [sitemapUrl(`${ORIGIN}${path}`, alts, priority), sitemapUrl(`${ORIGIN}/zh${path}`, alts, priority), sitemapUrl(`${ORIGIN}/ar${path}`, alts, priority)];
  });
}
