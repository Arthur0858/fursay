import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { sampleActivityCopy } from "./fursay-sample-activities.mjs";

const ORIGIN = "https://fursay.com";
const BRAND_CSS = "/css/brand-storybook-20260717-v1.css";
const SAMPLE_ACTIVITY_CSS = "/css/sample-activity-20260718-v1.css";
const TOOLS_CSS = "/css/picture-world-tools-20260613-products1.css";
const SHARED_JS = "/js/site-shared-20260615-sharekit1.js";
const ADSENSE_ACCOUNT = "ca-pub-4093856660317740";

const LOCALES = {
  en: {
    lang: "en", dir: "ltr", prefix: "", home: "/", products: "/products", privacy: "/privacy", support: "/support",
    label: "EN", story: "Story worlds", productsLabel: "Products", supportLabel: "Support", privacyLabel: "Privacy",
    trust: ["Free sample first", "Adult-guided and print-ready", "Anonymous interaction signals only"],
  },
  zh: {
    lang: "zh-TW", dir: "ltr", prefix: "/zh", home: "/zh/", products: "/zh/products", privacy: "/zh/privacy", support: "/zh/support",
    label: "中文", story: "故事世界", productsLabel: "產品", supportLabel: "支援", privacyLabel: "隱私",
    trust: ["先看免費樣本", "由成人陪伴並可直接列印", "只記錄匿名互動訊號"],
  },
  ar: {
    lang: "ar", dir: "rtl", prefix: "/ar", home: "/ar/", products: "/ar/products", privacy: "/ar/privacy", support: "/ar/support",
    label: "عربي", story: "عوالم القصص", productsLabel: "المنتجات", supportLabel: "الدعم", privacyLabel: "الخصوصية",
    trust: ["العينة المجانية أولا", "جاهزة للطباعة مع بالغ", "إشارات تفاعل مجهولة فقط"],
  },
};

const PRODUCTS = {
  koko: {
    key: "koko", id: "koko-printable-pack", slug: "koko-printable", sample: "/product-samples/koko-printable",
    download: "/download/koko-printable-sample?source_id=koko_product_validation_pdf_sample&creator=fursay&placement=presale_page_pdf_download",
    image: "/images/chars/koko.webp", og: "/og-koko.png", story: "/koko", campaign: "koko_story_funnel",
  },
  noor: {
    key: "noor", id: "noor-worksheet-pack", slug: "noor-worksheet", sample: "/product-samples/noor-worksheet",
    download: "/download/noor-worksheet-sample?source_id=noor_product_validation_pdf_sample&creator=fursay&placement=presale_page_pdf_download",
    image: "/images/chars/arabic_nour_zayd_together.webp", og: "/og-noor.png", story: "/arabic", campaign: "noor_story_funnel",
  },
};

const COPY = {
  en: {
    hub: {
      title: "Choose a story pack to try at home",
      description: "Two complete, calm printable samples for busy families, with clear parent guidance and optional story-pack updates.",
      kicker: "Fursay printable story worlds", lede: "Choose Koko for English feelings practice or Nour for a tiny Chinese ritual with Arabic parent prompts.",
      heading: "Which story world fits your family?", sub: "Each path gives you a free, print-ready activity you can use today, plus an optional way to hear about future story packs.",
      how: "Three gentle steps", steps: [["Choose", "Pick the language goal that feels useful today."], ["Preview", "Open or download the free sample."], ["Continue", "Join the interest list only if your family wants more."]],
      faq: [["What can I use today?", "Both story worlds include a complete free PDF sample with parent guidance."], ["What happens after I download?", "Nothing automatic. You may print the sample or choose to join the free story-pack list."], ["Do I have to join the list?", "No. The PDF remains available without email signup, and the list is optional."]],
    },
    product: {
      koko: { name: "Koko printable story pack", kicker: "English feelings through story", hero: "A calm printable companion for Koko's forest", lede: "For families who want one small English feelings activity after a story—not a full lesson plan.", audience: "Best for ages 2–8 with a parent or caregiver, especially Mandarin-speaking families trying gentle English practice.", includes: ["A short Koko story prompt", "English emotion-word practice", "Parent-child drawing and conversation space"], preview: "The free sample is ready to print and gives you the complete three-minute rhythm before you join any list." },
      noor: { name: "Nour 3-minute worksheet pack", kicker: "Chinese with Arabic parent prompts", hero: "A tiny Chinese practice ritual with Nour and Zayd", lede: "For Arabic-speaking families who want three Chinese words, Pinyin, and one parent-guided activity before attention fades.", audience: "Best for ages 2–8 with an Arabic-speaking parent or caregiver who wants a small, repeatable Chinese routine.", includes: ["A short Nour and Zayd story moment", "Three Chinese words with Pinyin", "Arabic parent guidance and one three-minute activity"], preview: "The free sample shows the whole three-minute rhythm: read, point, and say together." },
      sectionSample: "See the sample before deciding", sectionIncludes: "What the free resource includes", sectionUse: "Use it in three steps", steps: [["Watch", "Start with one free story moment."], ["Print", "Choose one page and three words."], ["Talk", "Finish with one question or drawing together."]],
      sampleCta: "Download the free PDF sample", interestCta: "Get optional story-pack updates", trustHeading: "Made for a calm family trial", trustText: "Use the complete sample without signup. If you want future story-pack news, an adult can choose the optional email list.",
      faq: [["Can I use the PDF right away?", "Yes. Download it, print one page, and follow the parent prompt."], ["What does the update list do?", "It records your pack preference and opens the existing free story-pack signup."], ["Can I unsubscribe?", "Yes. Every email includes an unsubscribe option."], ["Where can I ask for help?", "Use the Support page or email contact@fursay.com."]],
    },
    sample: { title: "Free printable sample", kicker: "Print-ready family activity", heading: "Try the three-minute story rhythm", body: "Download one free PDF, try it with your child, and decide whether this story world fits your family.", download: "Download the free PDF", interest: "Tell us you want more", note: "No checkout is available. Anonymous download and interest events help us understand which packs families find useful." },
  },
  zh: {
    hub: {
      title: "選一份故事包，在家免費試用", description: "為忙碌家庭準備的兩份完整可列印故事樣本，包含清楚家長提示與選擇性故事包更新。", kicker: "Fursay 可列印故事世界", lede: "選 Koko 練習英文情緒詞，或選努爾，用阿語家長提示建立 3 分鐘中文練習。", heading: "哪一個故事世界適合你家？", sub: "每條路徑都有今天即可使用的免費列印活動；想知道未來故事包消息時，再自行選擇更新名單。", how: "溫柔的三個步驟", steps: [["選擇", "先選今天最需要的語言目標。"], ["試用", "打開或下載免費樣本。"], ["繼續", "真的想要更多時，再加入更新名單。"]], faq: [["今天可以使用什麼？", "兩個故事世界都有完整免費 PDF 樣本與家長提示。"], ["下載後會發生什麼？", "不會自動訂閱。你可以直接列印，也可以自行選擇加入免費故事包名單。"], ["一定要加入名單嗎？", "不用。PDF 不要求電子郵件，更新名單完全由成人自行選擇。"]],
    },
    product: {
      koko: { name: "Koko 可列印故事包", kicker: "用故事練習英文情緒詞", hero: "陪 Koko 走進森林的溫柔可列印活動", lede: "給想在故事後多做一個英文情緒小活動的家庭，不需要準備完整教案。", audience: "適合 2–8 歲親子共讀，特別是想用輕量方式練英文的華語家庭。", includes: ["Koko 故事提示頁", "英文情緒詞練習", "親子畫畫與對話空間"], preview: "免費樣本已可列印，先完整試過 3 分鐘流程，再決定是否加入名單。" },
      noor: { name: "努爾 3 分鐘學習單", kicker: "中文拼音加上阿語家長提示", hero: "和努爾、Zayd 建立 3 分鐘中文小習慣", lede: "給阿語家庭的三個中文詞、拼音與一個親子活動，在孩子注意力消失前完成。", audience: "適合 2–8 歲、由阿語家長陪伴，想建立簡短可重複中文練習的家庭。", includes: ["努爾與 Zayd 的短篇故事情境", "中文詞語與拼音練習", "阿語家長提示與一個 3 分鐘親子小活動"], preview: "免費樣本會帶你走完整個 3 分鐘流程：一起讀、指、說。" },
      sectionSample: "先看樣本，再決定", sectionIncludes: "免費資源包含什麼", sectionUse: "家庭可以怎麼用", steps: [["看故事", "先看一個免費故事片段。"], ["印一頁", "只選一頁和三個詞。"], ["聊一下", "用一個問題或一張畫收尾。"]], sampleCta: "下載免費 PDF 樣本", interestCta: "取得選擇性故事包更新", trustHeading: "為家庭安靜試用而製作", trustText: "不用訂閱即可使用完整樣本；想知道未來故事包消息時，再由成年家長選擇電子郵件更新。", faq: [["PDF 可以立即使用嗎？", "可以，下載後只印一頁，跟著家長提示即可。"], ["更新名單會做什麼？", "它記錄你偏好的故事包，並開啟既有免費故事包訂閱表單。"], ["之後可以取消嗎？", "可以，每封電子郵件都有取消訂閱入口。"], ["如何取得支援？", "請使用支援頁或寄信至 contact@fursay.com。"]],
    },
    sample: { title: "免費可列印樣本", kicker: "適合家庭的列印活動", heading: "先試一次 3 分鐘故事流程", body: "下載一份免費 PDF，和孩子一起試用，再決定這個故事世界是否適合你家。", download: "下載免費 PDF", interest: "告訴我們你想看更多", note: "目前沒有結帳。匿名下載與興趣事件只用來了解家庭覺得哪些內容有用。" },
  },
  ar: {
    hub: {
      title: "اختاروا حزمة قصص لتجربتها في البيت", description: "عينتان كاملتان وهادئتان للطباعة مع إرشاد واضح للوالدين وتحديثات اختيارية للقصص.", kicker: "عوالم Fursay القصصية القابلة للطباعة", lede: "اختاروا Koko لمشاعر الإنجليزية أو نور لروتين صيني قصير مع توجيهات عربية للوالدين.", heading: "أي عالم قصصي يناسب عائلتكم؟", sub: "يقدم كل مسار نشاطًا مجانيًا جاهزًا للاستعمال اليوم، مع خيار مستقل لسماع أخبار الحزم المقبلة.", how: "ثلاث خطوات لطيفة", steps: [["اختاروا", "حددوا هدف اللغة المفيد اليوم."], ["جرّبوا", "افتحوا العينة المجانية أو حمّلوها."], ["تابعوا", "اختاروا التحديثات فقط إذا أردتم المزيد."]], faq: [["ماذا يمكن استعماله اليوم؟", "يتضمن العالمان عينة PDF كاملة وإرشادًا للوالدين."], ["ماذا يحدث بعد التنزيل؟", "لا اشتراك تلقائيا. يمكنكم طباعة العينة أو اختيار القائمة المجانية."], ["هل القائمة مطلوبة؟", "لا. يبقى PDF متاحًا بلا بريد، والتحديثات اختيار مستقل للبالغ."]],
    },
    product: {
      koko: { name: "حزمة Koko القابلة للطباعة", kicker: "مشاعر الإنجليزية من خلال القصة", hero: "رفيق هادئ قابل للطباعة لغابة Koko", lede: "للعائلات التي تريد نشاطا صغيرا لمشاعر الإنجليزية بعد القصة، وليس خطة درس كاملة.", audience: "للأعمار 2–8 مع أحد الوالدين، خصوصا للعائلات التي تجرب الإنجليزية بهدوء.", includes: ["صفحة قصة قصيرة مع Koko", "تدريب كلمات المشاعر بالإنجليزية", "مساحة للرسم والحوار العائلي"], preview: "العينة المجانية جاهزة للطباعة وتعرض الإيقاع الكامل قبل الانضمام إلى أي قائمة." },
      noor: { name: "أوراق نور في 3 دقائق", kicker: "الصينية مع توجيهات عربية للوالدين", hero: "روتين صيني صغير مع نور وزيد", lede: "ثلاث كلمات صينية مع Pinyin ونشاط عائلي في 3 دقائق قبل أن ينتهي التركيز.", audience: "للأعمار 2–8 مع والد يتحدث العربية ويريد روتينا صينيا قصيرا قابلا للتكرار.", includes: ["لحظة قصة قصيرة مع نور وزيد", "ثلاث كلمات صينية مع Pinyin", "توجيهات عربية للوالدين ونشاط عائلي في 3 دقائق"], preview: "تعرض العينة المجانية الإيقاع الكامل: اقرأوا وأشيروا وقولوا معا." },
      sectionSample: "شاهدوا العينة قبل القرار", sectionIncludes: "ماذا يتضمن المورد المجاني", sectionUse: "كيف تستخدمها العائلة؟", steps: [["شاهدوا", "ابدأوا بلحظة قصة مجانية."], ["اطبعوا", "اختاروا صفحة وثلاث كلمات."], ["تحدثوا", "اختموا بسؤال أو رسمة معا."]], sampleCta: "تحميل عينة PDF المجانية", interestCta: "تحديثات قصص اختيارية", trustHeading: "مصممة لتجربة عائلية هادئة", trustText: "استعملوا العينة الكاملة بلا اشتراك. يمكن للبالغ اختيار قائمة البريد إذا أراد أخبار الحزم المقبلة.", faq: [["هل يمكن استعمال PDF فورًا؟", "نعم، حملوه واطبعوا صفحة واحدة واتبعوا توجيه الوالدين."], ["ماذا تفعل قائمة التحديث؟", "تسجل اختيار الحزمة وتفتح نموذج الحزمة المجانية أولا."], ["هل يمكنني الإلغاء لاحقا؟", "نعم، تتضمن كل رسالة خيار إلغاء الاشتراك."], ["أين أطلب المساعدة؟", "استخدموا صفحة الدعم أو contact@fursay.com."]],
    },
    sample: { title: "عينة مجانية قابلة للطباعة", kicker: "نشاط عائلي جاهز للطباعة", heading: "جرّبوا إيقاع القصة في 3 دقائق", body: "حمّلوا ملف PDF مجانيا وجرّبوه مع الطفل ثم قرروا إن كان عالم القصة يناسب عائلتكم.", download: "تحميل ملف PDF المجاني", interest: "أخبرونا أنكم تريدون المزيد", note: "لا يوجد دفع. تساعدنا أحداث التنزيل والاهتمام المجهولة على فهم الحزم المفيدة للعائلات." },
  },
};

const PRODUCT_GUIDES = {
  koko: {
    en: [
      ["What the sample page is for", "The Koko PDF turns one forest story moment into a short feelings conversation. The picture, emotion word, and drawing space belong to the same scene, so an adult does not need to invent a separate lesson. Begin by naming what is visible, let the child point or listen, and use the blank area only if making a mark helps the conversation continue."],
      ["Print for the family you have", "The sample uses US Letter pages. Choose Fit to page for A4 paper, print one-sided, and use grayscale if color is unavailable. Check the preview before printing so an image is not cut at the edge. One page is enough for a session. Families without a printer can open the page on an adult-controlled screen and copy the prompt onto scrap paper."],
      ["A three-minute Koko routine", "Watch the linked story moment, close the player, and place one printed page on the table. Ask one question about Koko's face or choice, then accept speech, pointing, a gesture, or quiet attention. Add one line or color only when the child wants to. End after three calm minutes or sooner and return the crayons, even when part of the page is blank."],
      ["Alternatives to drawing", "A child can move a toy across a pretend bridge, choose between two feeling cards, copy Koko's posture, or tell the scene in the family's strongest language. These are not fallback versions that need to be upgraded later. They preserve the same goal—sharing a story clue and a feeling word—without making pencil control, English speech, or completion a hidden requirement."],
      ["Limits and help", "This resource is general parent-facing story support. It cannot assess language, emotions, hearing, speech, or development, and it does not promise an English outcome. Stop when the activity causes distress or adult-child conflict. For a broken file or unclear instruction, use Support and include the page URL, device, browser, and print setting without sending a child's name, photo, or private information."],
    ],
    zh: [
      ["這份樣本用來做什麼", "Koko PDF 把森林故事的一個時刻變成短短的情緒對話。圖像、英文情緒詞與畫畫空間都來自同一場景，家長不必另外發明一堂課。先說出兩個人都看得到的線索，接受孩子指圖、做動作或安靜聽；只有留下記號真的能延續談話時，才使用空白區。"],
      ["依你家的設備列印", "樣本採 US Letter 尺寸。使用 A4 時選擇符合頁面、單面列印；沒有彩色墨水也可用灰階。列印前先看預覽，確認圖像沒有被邊緣裁掉，一次只印一頁。沒有印表機的家庭，可以在成人控制的螢幕看頁面，再把一個提示抄到廢紙或可擦寫板，不必重建整份版面。"],
      ["三分鐘 Koko 流程", "先看連結的故事時刻、關閉播放器，再把一張紙放到桌上。只問一個關於 Koko 表情或選擇的問題，接受口說、指向、姿勢或安靜注意。孩子願意時才加一條線或一個顏色；三分鐘或更早就平靜收筆，即使頁面仍有空白。完成度不是評分，也不用隔天補完。"],
      ["不畫畫也能使用", "孩子可以讓玩具走過假想橋、在兩張情緒卡中選一張、模仿 Koko 姿勢，或用家庭最熟悉的語言重述。這些不是之後必須升級的替代版，而是保留同一個核心：一起看故事線索並使用一個情緒詞。握筆、說英文與填滿頁面都不是隱藏條件。"],
      ["限制與支援", "這是一般家長陪讀資源，不能評估語言、情緒、聽力、口語或發展，也不保證英文成果。活動造成困擾或親子衝突就停止。檔案損壞、字太小或說明不清楚時，從支援頁提供網址、裝置、瀏覽器與列印設定；不要寄送孩子姓名、照片或私人資訊。"],
    ],
    ar: [
      ["غرض صفحة العينة", "تحول ورقة Koko لحظة واحدة من قصة الغابة إلى حوار قصير عن المشاعر. تنتمي الصورة والكلمة ومساحة الرسم إلى المشهد نفسه، فلا يحتاج البالغ إلى اختراع درس منفصل. ابدأوا بعلامة يراها الطرفان، واقبلوا الإشارة أو الحركة أو الاستماع، ولا تستعملوا المساحة الفارغة إلا إذا ساعدت العلامة على استمرار الحديث."],
      ["الطباعة حسب أدوات الأسرة", "تستخدم العينة حجم US Letter. اختاروا Fit to page مع A4 واطبعوا على وجه واحد، واستعملوا الرمادي عند غياب اللون. راجعوا المعاينة حتى لا تقص الصورة، وصفحة واحدة تكفي. من لا يملك طابعة يستطيع فتح الصفحة على جهاز يديره بالغ ونسخ الطلب على ورق مستعمل أو لوح قابل للمسح."],
      ["روتين Koko في ثلاث دقائق", "شاهدوا لحظة القصة وأغلقوا المشغل ثم ضعوا صفحة واحدة. اسألوا سؤالًا عن وجه Koko أو اختيارها، واقبلوا الكلام أو الإشارة أو الحركة أو الانتباه الصامت. أضيفوا خطًا أو لونًا إذا أراد الطفل فقط. توقفوا بعد ثلاث دقائق هادئة أو قبلها وأعيدوا الأدوات، ولو بقيت الصفحة فارغة جزئيًا."],
      ["بدائل عن الرسم", "يستطيع الطفل تحريك لعبة فوق جسر متخيل أو الاختيار بين بطاقتي شعور أو تقليد وضعية Koko أو حكي المشهد بأقوى لغة في البيت. ليست هذه نسخًا ناقصة يجب تطويرها، بل تحافظ على الهدف نفسه: مشاركة دليل من القصة وكلمة شعور، من دون جعل القلم أو الكلام الإنجليزي أو الإكمال شرطًا مخفيًا."],
      ["الحدود والمساعدة", "هذا مورد عام للوالدين ولا يقيم اللغة أو المشاعر أو السمع أو الكلام أو النمو، ولا يعد بنتيجة إنجليزية. توقفوا عند الضيق أو النزاع. للملف المعطل أو التعليمات الغامضة استخدموا الدعم وأرسلوا الرابط والجهاز والمتصفح وإعداد الطباعة، من دون اسم الطفل أو صورته أو معلوماته الخاصة."],
    ],
  },
  noor: {
    en: [
      ["How the Nour sample is organized", "The Nour and Zayd PDF groups one tiny scene, three Chinese words, pinyin, and an Arabic parent prompt. The elements are meant to be used together, not as four separate assignments. Read the Arabic guidance first, play the Chinese audio when available, and choose one visible action. The sample is complete when the family has shared that action once."],
      ["Print settings and preparation", "The file uses US Letter pages; select Fit to page for A4 and print one-sided. Preview the pinyin and Arabic text at normal size before using ink. Print only the page for today's scene. Put away extra cards and tools so the table holds the page, one toy, and one pencil or crayon. A small setup helps the adult keep the promised ending."],
      ["A three-minute Chinese routine", "Greet Nour, point to the first picture, and let Arabic explain what is happening. Play or say one Chinese phrase while moving the toy, then repeat it only if the moment still feels playful. The child may answer in Arabic, Chinese, a gesture, or action. Offer goodbye or one replay as two real endings and finish with whichever option the child chooses."],
      ["If pinyin or paper is difficult", "The adult can ignore pinyin and use the trusted audio, cover unused text, enlarge the page, or trace the action in the air. A child can place objects instead of drawing or say the story in Arabic while the adult supplies the Chinese phrase. Do not turn pronunciation uncertainty into repeated correction. The home language keeps comprehension secure while Chinese remains a small addition."],
      ["Limits and support", "The sample is a parent-guided language-exposure activity, not a Mandarin course, fluency promise, speech assessment, or developmental tool. Stop if the routine delays care, safety instructions, rest, or a calm relationship. Support can help with PDF access, page layout, and unclear public wording. Include the URL and technical details, but do not send a child's identity, school, health information, or recording."],
    ],
    zh: [
      ["努爾樣本怎麼安排", "努爾與 Zayd PDF 把一個小場景、三個中文詞、拼音和阿語家長提示放在一起使用，不是四份分開作業。家長先讀阿語說明，有可靠中文音檔時再播放，最後只選一個看得到的動作。家庭一起完成一次動作，樣本今天的工作就已完成。"],
      ["列印設定與準備", "檔案採 US Letter，A4 紙請選符合頁面並單面列印。用墨前先以正常大小確認拼音與阿文清楚，只印今天場景需要的一頁。多餘字卡與工具先收起，桌上保留一張紙、一個玩具和一支筆；材料越少，成人越容易守住事先說好的結尾。"],
      ["三分鐘中文流程", "先向努爾打招呼、指第一張圖，讓阿語完整說明發生什麼。移動玩具時播放或說一句中文，氣氛仍輕鬆才再用一次。孩子可以用阿語、中文、手勢或動作回應。結尾提供「說再見」或「只重播一次」兩個都能實現的選項，依孩子選擇結束。"],
      ["拼音或紙本太困難時", "成人可以暫時不看拼音、改用可信音檔，遮住不用的文字、放大頁面，或在空中做動作。孩子可以排列物件而不畫圖，也可用阿語說故事、由成人補一句中文。不確定發音時不要反覆糾正；家庭主要語言負責穩住理解，中文只需要是小小增加。"],
      ["限制與支援", "樣本是由家長帶領的語言接觸活動，不是華語課程、流利度承諾、口語評估或發展工具。若流程延誤照顧、安全指示、休息或平靜關係就停止。支援可協助 PDF、版面與公開說明問題；請提供網址與技術資訊，不要寄送孩子身分、學校、健康資料或錄音。"],
    ],
    ar: [
      ["تنظيم عينة نور", "تجمع ورقة نور وزيد مشهدًا صغيرًا وثلاث كلمات صينية وبينيين وتوجيهًا عربيًا للوالد. تستعمل العناصر معًا وليست أربع واجبات. اقرأوا العربية أولًا، وشغلوا الصوت الصيني الموثوق، واختاروا فعلًا مرئيًا واحدًا. تكتمل العينة عندما تشارك الأسرة ذلك الفعل مرة واحدة."],
      ["إعداد الطباعة", "يستعمل الملف US Letter؛ اختاروا الملاءمة مع A4 واطبعوا على وجه واحد. راجعوا البينيين والعربية بالحجم الطبيعي قبل استهلاك الحبر، واطبعوا صفحة اليوم فقط. أبعدوا البطاقات والأدوات الزائدة واتركوا صفحة ولعبة وقلمًا. يساعد الإعداد الصغير البالغ على حفظ النهاية الموعودة."],
      ["روتين صيني من ثلاث دقائق", "حَيّوا نور وأشيروا إلى الصورة الأولى، ودعوا العربية تشرح الحدث. شغلوا أو قولوا عبارة صينية أثناء تحريك اللعبة، وكرروها فقط إن بقيت اللحظة مرحة. يستطيع الطفل الرد بالعربية أو الصينية أو حركة. اعرضوا الوداع أو إعادة واحدة كنهايتين حقيقيتين، وأنهوا حسب اختياره."],
      ["إذا صعب البينيين أو الورق", "يمكن للبالغ تجاهل البينيين واستعمال الصوت الموثوق، أو تغطية النص غير المستعمل، أو تكبير الصفحة، أو رسم الفعل في الهواء. يرتب الطفل أشياء بدل الرسم أو يحكي بالعربية بينما يقدم البالغ العبارة الصينية. لا تحولوا الشك في النطق إلى تصحيح متكرر؛ تحمي لغة البيت الفهم وتبقى الصينية إضافة صغيرة."],
      ["الحدود والدعم", "العينة نشاط تعرض لغوي يقوده الوالد، وليست دورة ماندرين أو وعد طلاقة أو تقييم كلام أو نمو. توقفوا إذا أخرت الرعاية أو تعليمات السلامة أو الراحة أو العلاقة الهادئة. يساعد الدعم في PDF والتخطيط والعبارة العامة الغامضة. أرسلوا الرابط والتفاصيل التقنية من دون هوية الطفل أو مدرسته أو صحته أو تسجيله."],
    ],
  },
};

function icon(name) { return `<svg class="brand-icon" aria-hidden="true"><use href="/images/brand-icons.svg#${name}"></use></svg>`; }
function productRoute(locale, product) { return `${LOCALES[locale].prefix}/products/${product.slug}`; }
function localeStory(locale, product) { return `${LOCALES[locale].prefix}${product.story}` || product.story; }
function alternates(pathSuffix) {
  return `<link rel="alternate" hreflang="en" href="${ORIGIN}${pathSuffix}"><link rel="alternate" hreflang="zh-TW" href="${ORIGIN}/zh${pathSuffix}"><link rel="alternate" hreflang="ar" href="${ORIGIN}/ar${pathSuffix}"><link rel="alternate" hreflang="x-default" href="${ORIGIN}${pathSuffix}">`;
}
function head({ locale, path, title, description, og, noindex = false, pathSuffix = path, extraCss = [] }) {
  const l = LOCALES[locale];
  const image = `${ORIGIN}${og || "/og-image.png"}`;
  return `<!doctype html><html lang="${l.lang}"${l.dir === "rtl" ? ' dir="rtl"' : ""}><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title><meta name="description" content="${description}">${noindex ? '<meta name="robots" content="noindex,follow">' : `<meta name="google-adsense-account" content="${ADSENSE_ACCOUNT}">`}<link rel="canonical" href="${ORIGIN}${path}">${noindex ? "" : alternates(pathSuffix)}<link rel="icon" href="/favicon.svg"><meta name="theme-color" content="#2d6a4f">${noindex ? "" : `<meta property="og:type" content="website"><meta property="og:site_name" content="Fursay"><meta property="og:title" content="${title}"><meta property="og:description" content="${description}"><meta property="og:url" content="${ORIGIN}${path}"><meta property="og:image" content="${image}"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta property="og:image:alt" content="Fursay watercolor storybook"><meta property="og:locale" content="${locale === "zh" ? "zh_TW" : locale === "ar" ? "ar_SA" : "en_US"}"><meta property="og:locale:alternate" content="${locale === "en" ? "zh_TW" : "en_US"}"><meta property="og:locale:alternate" content="${locale === "ar" ? "zh_TW" : "ar_SA"}"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${title}"><meta name="twitter:description" content="${description}"><meta name="twitter:image" content="${image}"><meta name="twitter:image:alt" content="Fursay watercolor storybook">`}<link rel="preconnect" href="https://fonts.googleapis.com"><link href="https://fonts.googleapis.com/css2?family=Baloo+2:wght@600;700;800&family=Nunito:wght@400;600;700;800;900&family=Cairo:wght@400;600;700;800&display=swap" rel="stylesheet"><link rel="stylesheet" href="${TOOLS_CSS}"><link rel="stylesheet" href="${BRAND_CSS}">${extraCss.map((href) => `<link rel="stylesheet" href="${href}">`).join("")}</head>`;
}
function nav(locale, current = "", suffix = "/products") {
  const l = LOCALES[locale];
  const guides = `${l.prefix}/guides`;
  const about = `${l.prefix}/about`;
  return `<nav class="brand-nav" aria-label="${l.label}"><div class="brand-shell brand-nav__inner"><a class="brand-nav__logo" href="${l.home}">${icon("paw")}<span>Fursay</span></a><div class="brand-nav__links"><a href="${l.home}#channels">${icon("story")}${l.story}</a><a href="${guides}"${current === "guides" ? ' aria-current="page"' : ""}>${locale === "zh" ? "家長指南" : locale === "ar" ? "دليل الوالدين" : "Parent guides"}</a><a href="${l.products}"${current === "products" ? ' aria-current="page"' : ""}>${icon("sample")}${l.productsLabel}</a><a href="${about}"${current === "about" ? ' aria-current="page"' : ""}>${locale === "zh" ? "關於" : locale === "ar" ? "من نحن" : "About"}</a></div><div class="brand-language" aria-label="Language"><a href="${suffix}">EN</a><a href="/zh${suffix}">中文</a><a href="/ar${suffix}">عربي</a></div></div></nav>`;
}
function footer(locale) {
  const l = LOCALES[locale];
  return `<footer class="brand-footer"><div class="brand-shell brand-footer__inner"><strong>Fursay · ${icon("story")} Stories for small family moments</strong><div class="brand-footer__links"><a href="${l.prefix}/about">${locale === "zh" ? "關於" : locale === "ar" ? "من نحن" : "About"}</a><a href="${l.prefix}/editorial-method">${locale === "zh" ? "編輯方法" : locale === "ar" ? "منهج التحرير" : "Editorial method"}</a><a href="${l.prefix}/contact">${locale === "zh" ? "聯絡與修正" : locale === "ar" ? "التواصل والتصحيح" : "Contact & corrections"}</a><a href="${l.privacy}">${l.privacyLabel}</a><a href="${l.prefix}/terms">${locale === "zh" ? "使用條款" : locale === "ar" ? "الشروط" : "Terms"}</a></div></div></footer>`;
}
function trust(locale) { return `<div class="trust-strip">${LOCALES[locale].trust.map((item, i) => `<div class="trust-strip__item">${icon(i === 0 ? "sample" : i === 1 ? "trust" : "privacy")}<span>${item}</span></div>`).join("")}</div>`; }
function faq(items) { return `<div class="brand-faq">${items.map(([q, a]) => `<details><summary>${q}</summary><p>${a}</p></details>`).join("")}</div>`; }
function schema(data) { return `<script type="application/ld+json">${JSON.stringify(data)}</script>`; }
function modal(locale) {
  const isZh = locale === "zh"; const isAr = locale === "ar";
  return `<div class="modal-overlay" id="subscribeModal"><div class="modal-box"><button class="modal-close" data-close-subscribe aria-label="Close">&times;</button><div class="modal-title">${isZh ? "加入免費故事包名單" : isAr ? "انضموا إلى قائمة حزمة القصص المجانية" : "Join the free story-pack list"}</div><p class="modal-sub">${isZh ? "由成年父母或照顧者提交。選 Koko、努爾或兩者；目前不收費。" : isAr ? "يقدمه والد أو مقدم رعاية بالغ. اختاروا Koko أو نور أو كليهما. لا دفع اليوم." : "For submission by an adult parent or caregiver. Choose Koko, Nour, or both. No payment today."}</p><form id="subscribeForm"><div class="modal-field"><label for="modalEmail">Email *</label><input type="email" id="modalEmail" required autocomplete="email"></div><div class="modal-field"><label>${isZh ? "我有興趣" : isAr ? "أنا مهتم بـ" : "I'm interested in"}</label><div class="modal-checks"><label class="modal-check"><input type="checkbox" name="groups" value="koko"><span class="check-dot"></span>Koko</label><label class="modal-check"><input type="checkbox" name="groups" value="noor"><span class="check-dot"></span>${isZh ? "努爾" : isAr ? "نور" : "Nour"}</label></div></div><button type="submit" class="modal-submit" id="modalSubmitBtn">${isZh ? "寄給我免費故事包" : isAr ? "أرسلوا الحزمة المجانية" : "Send me the free story pack"}</button></form><p class="modal-note" id="sub-msg">${isZh ? "不需要孩子的姓名、年齡或學校；可隨時取消訂閱。" : isAr ? "لا نحتاج اسم الطفل أو عمره أو مدرسته. يمكن إلغاء الاشتراك في أي وقت." : "We do not need a child's name, age, or school. Unsubscribe anytime."}</p></div></div>`;
}
function writeRoute(siteDir, route, html) {
  const file = route === "/" ? "index.html" : `${route.replace(/^\//, "")}.html`;
  mkdirSync(resolve(siteDir, file, ".."), { recursive: true });
  writeFileSync(resolve(siteDir, file), `${html}\n`);
}
function hubPage(locale) {
  const l = LOCALES[locale]; const c = COPY[locale].hub;
  const path = l.products;
  const cards = Object.values(PRODUCTS).map((product) => {
    const pc = COPY[locale].product[product.key];
    return `<article class="product-choice product-choice--${product.key}" data-product-card="${product.id}"><div class="product-choice__art"><picture><source srcset="${product.image.replace(/\.webp$/, ".avif")}" type="image/avif"><img src="${product.image}" alt="${pc.name}" width="1380" height="752"></picture></div><div class="product-choice__body"><p class="brand-kicker">${pc.kicker}</p><h2>${pc.name}</h2><p>${pc.lede}</p><ul>${pc.includes.map((item) => `<li>${item}</li>`).join("")}</ul><a class="brand-btn" href="${productRoute(locale, product)}" data-product-info-link="${product.key}" data-interest-stage="presale_page_view" data-signup-source="products_${product.key}_presale">${icon("sample")}${locale === "zh" ? "查看免費樣本" : locale === "ar" ? "شاهدوا العينة المجانية" : "View the free sample"}</a></div></article>`;
  }).join("");
  const graph = { "@context": "https://schema.org", "@graph": [{ "@type": "WebPage", name: c.title, url: `${ORIGIN}${path}`, inLanguage: l.lang }, { "@type": "ItemList", itemListElement: Object.values(PRODUCTS).map((p, i) => ({ "@type": "ListItem", position: i + 1, url: `${ORIGIN}${productRoute(locale, p)}`, name: COPY[locale].product[p.key].name })) }, { "@type": "FAQPage", mainEntity: c.faq.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })) }] };
  return `${head({ locale, path, pathSuffix: "/products", title: `${c.title} | Fursay`, description: c.description })}<body class="brand-surface products-brand-page">${nav(locale, "products", "/products")}<main><section class="brand-hero"><div class="brand-shell brand-hero__grid"><div><p class="brand-kicker">${icon("story")}${c.kicker}</p><h1>${c.title}</h1><p class="brand-hero__lede">${c.lede}</p><a class="brand-btn" href="#choose">${icon("story")}${locale === "zh" ? "選故事世界" : locale === "ar" ? "اختاروا عالم القصة" : "Choose a story"}</a></div><div class="brand-hero__art"><img src="/images/chars/koko.webp" alt="Fursay story characters" width="1380" height="752"></div></div></section><section class="brand-section brand-section--soft" id="choose"><div class="brand-shell">${trust(locale)}<div class="brand-section-head"><h2>${c.heading}</h2><p>${c.sub}</p></div><div class="product-choice-grid">${cards}</div></div></section><section class="brand-section"><div class="brand-shell"><div class="brand-section-head"><h2>${c.how}</h2></div><div class="brand-grid-3">${c.steps.map(([h, p], i) => `<article class="brand-info-card"><span class="brand-info-card__number">${i + 1}</span><h3>${h}</h3><p>${p}</p></article>`).join("")}</div></div></section><section class="brand-section brand-section--soft"><div class="brand-shell"><div class="brand-section-head"><h2>${icon("faq")} FAQ</h2></div>${faq(c.faq)}</div></section></main>${footer(locale)}${schema(graph)}<script src="${SHARED_JS}"></script></body></html>`;
}
function productPage(locale, product) {
  const l = LOCALES[locale]; const c = COPY[locale].product; const p = c[product.key]; const path = productRoute(locale, product);
  const samplePath = `${product.sample}?source_id=${product.key}_presale_sample_preview&creator=fursay&placement=presale_page_preview`;
  const qas = c.faq;
  const guideHeading = locale === "zh" ? "免費樣本家庭使用指南" : locale === "ar" ? "دليل الأسرة لاستعمال العينة المجانية" : "Family guide to the free sample";
  const usageGuide = `<section class="brand-section product-use-guide" data-product-use-guide><div class="brand-shell"><div class="brand-section-head"><h2>${guideHeading}</h2></div><div class="brand-grid-3">${PRODUCT_GUIDES[product.key][locale].map(([heading, body]) => `<article class="brand-info-card product-use-guide__item"><h3>${heading}</h3><p>${body}</p></article>`).join("")}</div></div></section>`;
  const graph = { "@context": "https://schema.org", "@graph": [{ "@type": "WebPage", name: p.name, url: `${ORIGIN}${path}`, inLanguage: l.lang }, { "@type": "Product", name: p.name, description: p.lede, image: `${ORIGIN}${product.image}`, url: `${ORIGIN}${path}`, brand: { "@type": "Brand", name: "Fursay" }, audience: { "@type": "PeopleAudience", suggestedMinAge: 2, suggestedMaxAge: 8 }, potentialAction: { "@type": "DownloadAction", target: `${ORIGIN}${product.download}` } }, { "@type": "FAQPage", mainEntity: qas.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })) }] };
  return `${head({ locale, path, pathSuffix: `/products/${product.slug}`, title: `${p.name} | Fursay`, description: p.lede, og: product.og })}<body class="brand-surface presale-brand-page" data-page-pack="${product.key}">${nav(locale, "products", `/products/${product.slug}`)}<main><section class="brand-hero brand-hero--${product.key}"><div class="brand-shell brand-hero__grid"><div><p class="brand-kicker">${icon("story")}${p.kicker}</p><h1>${p.hero}</h1><p class="brand-hero__lede">${p.lede}</p><div class="brand-actions"><a class="brand-btn" href="${product.download}" download data-product-sample-download="${product.key}" data-interest-stage="presale_pdf_download" data-signup-source="${product.key}_presale_pdf">${icon("sample")}${c.sampleCta}</a><button class="brand-btn brand-btn--secondary" type="button" data-product-interest="${product.key}" data-interest-stage="presale_interest" data-signup-source="${product.key}_presale_interest">${c.interestCta}</button></div></div><div class="brand-hero__art"><picture><source srcset="${product.image.replace(/\.webp$/, ".avif")}" type="image/avif"><img src="${product.image}" alt="${p.name}" width="1380" height="752"></picture></div></div></section><section class="brand-section brand-section--soft"><div class="brand-shell">${trust(locale)}<div class="sample-preview"><div class="sample-preview__paper"><img src="${product.image}" alt="${p.name} sample preview" width="1380" height="752"></div><div class="sample-preview__copy"><p class="brand-kicker">${icon("sample")}${c.sectionSample}</p><h2>${c.sectionSample}</h2><p>${p.preview}</p><p><strong>${p.audience}</strong></p><div class="brand-actions"><a class="brand-btn" href="${product.download}" download data-product-sample-download="${product.key}" data-interest-stage="presale_sample_section_download" data-signup-source="${product.key}_presale_sample_section">${c.sampleCta}</a><a class="brand-btn brand-btn--secondary" href="${samplePath}" data-product-sample-preview="${product.key}" data-product-info-link="${product.key}" data-interest-stage="sample_preview" data-signup-source="${product.key}_presale_browser_preview">${locale === "zh" ? "先在瀏覽器預覽" : locale === "ar" ? "معاينة في المتصفح" : "Preview in browser"}</a></div></div></div></div></section><section class="brand-section"><div class="brand-shell"><div class="brand-section-head"><h2>${c.sectionIncludes}</h2></div><div class="brand-grid-3">${p.includes.map((item, i) => `<article class="brand-info-card"><span class="brand-info-card__number">${i + 1}</span><h3>${item}</h3></article>`).join("")}</div></div></section><section class="brand-section brand-section--soft"><div class="brand-shell"><div class="brand-section-head"><h2>${c.sectionUse}</h2></div><div class="brand-grid-3">${c.steps.map(([h, body], i) => `<article class="brand-info-card"><span class="brand-info-card__number">${i + 1}</span><h3>${h}</h3><p>${body}</p></article>`).join("")}</div></div></section>${usageGuide}<section class="brand-section"><div class="brand-shell"><div class="brand-section-head"><h2>${icon("trust")}${c.trustHeading}</h2><p>${c.trustText}</p></div>${faq(qas)}<div class="brand-actions brand-actions--centered"><a class="brand-btn brand-btn--secondary" href="${l.support}">${icon("support")}${l.supportLabel}</a></div></div></section></main>${footer(locale)}${modal(locale)}${schema(graph)}<script src="${SHARED_JS}"></script></body></html>`;
}
function samplePage(locale, product) {
  const c = COPY[locale].sample; const p = COPY[locale].product[product.key]; const path = product.sample;
  const activity = sampleActivityCopy(product.key);
  return `${head({ locale, path, title: activity.title, description: activity.description, og: product.og, noindex: true, extraCss: [SAMPLE_ACTIVITY_CSS] })}<body class="brand-surface sample-brand-page" data-page-pack="${product.key}">${nav(locale, "products", `/products/${product.slug}`)}<main><section class="brand-hero brand-hero--${product.key}"><div class="brand-shell brand-hero__grid"><div><p class="brand-kicker">${icon("sample")}${activity.kicker}</p><h1>${activity.heading}</h1><p class="brand-hero__lede">${activity.lede}</p><div class="brand-actions"><a class="brand-btn" href="${product.download.replace("presale_page_pdf_download", "sample_preview_pdf_download")}" download data-product-sample-download="${product.key}" data-interest-stage="sample_pdf_download" data-signup-source="${product.key}_sample_pdf">${c.download}</a><button class="brand-btn brand-btn--secondary" type="button" data-product-interest="${product.key}" data-interest-stage="sample_interest" data-signup-source="${product.key}_sample_interest">${c.interest}</button></div></div><div class="brand-hero__art"><img src="${product.image}" alt="${p.name}" width="1380" height="752"></div></div></section><section class="brand-section brand-section--soft sample-summary-section"><div class="brand-shell">${trust(locale)}<div class="brand-section-head"><h2>${activity.summaryHeading}</h2><p>${activity.summary}</p></div><div class="brand-grid-3">${activity.steps.map((item, i) => `<article class="brand-info-card"><span class="brand-info-card__number">${i + 1}</span><h3>${item}</h3></article>`).join("")}</div></div></section><section class="sample-activity-preview" aria-labelledby="sample-preview-title"><div class="brand-shell"><div class="brand-section-head"><p class="brand-kicker">${activity.previewKicker}</p><h2 id="sample-preview-title">${activity.previewHeading}</h2><p>${activity.previewBody}</p></div><div class="sample-sheet-grid">${activity.sheets}</div></div></section></main>${footer(locale)}${modal(locale)}<script src="${SHARED_JS}"></script></body></html>`;
}
function policyPage(locale, type) {
  const l = LOCALES[locale]; const isPrivacy = type === "privacy"; const path = l[type]; const suffix = `/${type}`;
  const text = locale === "zh" ? (isPrivacy ? {
    title: "Fursay 隱私說明", description: "Fursay 如何使用匿名互動訊號與你主動提供的訂閱電子郵件。", intro: "我們只收集維持網站與故事包所需的最少資料。", sections: [["匿名互動訊號", "我們會記錄頁面路徑、語言、產品代號、來源、placement、interest stage 與事件時間等匿名互動訊號，用來了解內容是否有幫助。分析事件不包含姓名、電話、住址、付款資料或電子郵件。"], ["電子郵件訂閱", "只有在你主動送出免費故事包表單時，電子郵件與所選故事包才會傳給電子報服務商。每封信都有取消訂閱入口。"], ["不出售個資", "Fursay 不出售個人資料，也不使用廣告追蹤像素建立跨站個人檔案。"], ["聯絡我們", "若要詢問、存取或刪除訂閱資料，請寄信至 contact@fursay.com。"]] } : {
    title: "Fursay 支援", description: "Fursay 免費樣本、故事包與預售準備的支援入口。", intro: "需要協助時，請直接告訴我們你使用的語言、頁面與故事包。", sections: [["聯絡方式", "請寄信至 contact@fursay.com，附上頁面網址與 Koko 或努爾故事包名稱。請勿寄送密碼或付款資料。"], ["目前沒有付費訂單", "checkoutEnabled=false；目前網站沒有購買按鈕、公開價格或付款連結，因此沒有可退款的 Fursay 訂單。"], ["預售審核", "價格、退款、付款提供商與 checkout tracking 仍是 review-required 資料。在營運與法務審核完成前不會公開。"], ["樣本問題", "若 PDF 無法開啟或列印，請附上裝置與瀏覽器版本，我們會協助確認。"]] }) : locale === "ar" ? (isPrivacy ? {
    title: "خصوصية Fursay", description: "كيف تستخدم Fursay إشارات التفاعل المجهولة والبريد الذي ترسله باختيارك.", intro: "نجمع الحد الأدنى اللازم لتشغيل الموقع وحزم القصص.", sections: [["إشارات مجهولة", "نسجل مسار الصفحة واللغة ومعرف المنتج والمصدر وplacement وinterest stage ووقت الحدث لفهم فائدة المحتوى. لا تتضمن التحليلات الاسم أو الهاتف أو العنوان أو بيانات الدفع أو البريد الإلكتروني."], ["اشتراك البريد", "لا نرسل البريد إلى مزود النشرة إلا عندما ترسل نموذج الحزمة المجانية باختيارك. تتضمن كل رسالة إلغاء الاشتراك."], ["لا نبيع البيانات", "لا تبيع Fursay البيانات الشخصية ولا تستخدم بكسلات إعلانية لبناء ملف شخصي عبر المواقع."], ["تواصلوا معنا", "لطلب الوصول أو الحذف، راسلوا contact@fursay.com."]] } : {
    title: "دعم Fursay", description: "الدعم لعينات Fursay المجانية وحزم القصص وتجهيز البيع المسبق.", intro: "اذكروا اللغة والصفحة والحزمة عند طلب المساعدة.", sections: [["التواصل", "راسلوا contact@fursay.com مع رابط الصفحة واسم حزمة Koko أو نور. لا ترسلوا كلمات المرور أو بيانات الدفع."], ["لا طلبات مدفوعة حاليا", "checkoutEnabled=false؛ لا يوجد زر شراء أو سعر معلن أو رابط دفع، لذلك لا توجد طلبات Fursay قابلة للاسترداد حاليا."], ["مراجعة البيع المسبق", "السعر والاسترداد ومزود الدفع وcheckout tracking ما زالت review-required ولن تنشر قبل المراجعة التشغيلية والقانونية."], ["مشاكل العينة", "إذا لم يفتح PDF أو لم يطبع، أرسلوا نوع الجهاز والمتصفح للمساعدة."]] }) : (isPrivacy ? {
    title: "Fursay Privacy", description: "How Fursay uses anonymous interaction signals and email you submit by choice.", intro: "We collect the minimum information needed to run the site and story packs.", sections: [["Anonymous interaction signals", "We record page path, language, product ID, source, placement, interest stage, and event time to understand whether content is useful. Analytics events do not include names, phone numbers, addresses, payment data, or email addresses."], ["Email subscriptions", "Only when you submit the free story-pack form do we send your email and chosen pack to our newsletter provider. Every email includes an unsubscribe option."], ["We do not sell personal data", "Fursay does not sell personal data or use advertising pixels to build a cross-site personal profile."], ["Contact", "To ask about, access, or delete subscription data, email contact@fursay.com."]] } : {
    title: "Fursay Support", description: "Support for Fursay free samples, story packs, and presale preparation.", intro: "Tell us the language, page, and story pack when you need help.", sections: [["Contact", "Email contact@fursay.com with the page URL and Koko or Nour pack name. Do not send passwords or payment information."], ["No paid orders today", "checkoutEnabled=false. The site has no purchase button, public price, or payment link, so there are no paid Fursay orders to refund today."], ["Presale review", "Price, refund, payment provider, and checkout tracking remain review-required. They will not be published before operational and legal review."], ["Sample problems", "If a PDF does not open or print, include your device and browser version so we can help."]] });
  const graph = { "@context": "https://schema.org", "@type": "WebPage", name: text.title, description: text.description, url: `${ORIGIN}${path}`, inLanguage: l.lang, dateModified: "2026-07-17" };
  return `${head({ locale, path, pathSuffix: suffix, title: `${text.title} | Fursay`, description: text.description })}<body class="brand-surface policy-brand-page">${nav(locale, type, suffix)}<main class="policy-wrap"><article class="policy-card"><span class="policy-updated">2026-07-17</span><h1>${icon(isPrivacy ? "privacy" : "support")}${text.title}</h1><p class="brand-hero__lede">${text.intro}</p>${text.sections.map(([h, p]) => `<section><h2>${h}</h2><p>${p}</p></section>`).join("")}<p><a href="${isPrivacy ? l.support : l.privacy}">${isPrivacy ? l.supportLabel : l.privacyLabel}</a></p></article></main>${footer(locale)}${schema(graph)}<script src="${SHARED_JS}"></script></body></html>`;
}

export function writeBrandProductsBundle(siteDir) {
  JSON.parse(readFileSync(resolve(siteDir, "products.json"), "utf8"));
  for (const locale of Object.keys(LOCALES)) {
    writeRoute(siteDir, LOCALES[locale].products, hubPage(locale));
    for (const product of Object.values(PRODUCTS)) writeRoute(siteDir, productRoute(locale, product), productPage(locale, product));
    writeRoute(siteDir, LOCALES[locale].privacy, policyPage(locale, "privacy"));
    writeRoute(siteDir, LOCALES[locale].support, policyPage(locale, "support"));
  }
  writeRoute(siteDir, PRODUCTS.koko.sample, samplePage("en", PRODUCTS.koko));
  writeRoute(siteDir, PRODUCTS.noor.sample, samplePage("ar", PRODUCTS.noor));
}
