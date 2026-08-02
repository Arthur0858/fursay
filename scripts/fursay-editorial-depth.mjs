const localized = (en, zh, ar) => ({ en, zh, ar });

export const EDITORIAL_SOURCE_LIBRARY = {
  aapLiteracy: ["American Academy of Pediatrics: Literacy Promotion", "https://www.aap.org/en/patient-care/early-childhood/early-childhood-health-and-development/literacy-promotion/"],
  harvardServeReturn: ["Harvard Center on the Developing Child: Serve and Return", "https://developingchild.harvard.edu/science/key-concepts/serve-and-return/"],
  iesSharedReading: ["U.S. What Works Clearinghouse: Shared Book Reading", "https://ies.ed.gov/ncee/wwc/Docs/ReferenceResources/TO4_summary_rec_7.pdf"],
  headStartHomeLanguage: ["Head Start: Home Language Support", "https://headstart.gov/culture-language/article/home-language-support"],
  headStartDll: ["Head Start: Strategies for Dual Language Learners", "https://headstart.gov/publication/dual-language-learners-considerations-strategies-home-visitors"],
  naeycDiversity: ["NAEYC: Embracing Linguistic Diversity", "https://www.naeyc.org/resources/pubs/tyc/summer2024/embracing-linguistic-diversity"],
  ashaMultilingual: ["ASHA: Learning More Than One Language", "https://www.asha.org/public/speech/development/learning-more-than-one-language/"],
  unescoMultilingual: ["UNESCO: Languages in Education", "https://www.unesco.org/en/languages-education/need-know"],
  healthyFeelings: ["HealthyChildren.org: Helping Little People Manage Big Feelings", "https://www.healthychildren.org/English/family-life/family-dynamics/Pages/helping-little-people-manage-big-feelings.aspx"],
  healthyCommunication: ["HealthyChildren.org: Communication Skills Start at Home", "https://www.healthychildren.org/English/family-life/family-dynamics/communication-discipline/Pages/Components-of-Good-Communication.aspx"],
  iesDialogic: ["U.S. What Works Clearinghouse: Dialogic Reading", "https://ies.ed.gov/ncee/wwc/Intervention/271"],
  iesVocabulary: ["U.S. IES: Emergent Literacy and Vocabulary", "https://ies.ed.gov/sites/default/files/migrated/rel/regions/southeast/pdf/REL_2021045_module3_participant.pdf"],
  harvardExecutive: ["Harvard Center on the Developing Child: Executive Function Activities", "https://developingchild.harvard.edu/wp-content/uploads/2024/10/Executive-Function-Activities-for-7-to-12-year-olds.pdf"],
  headStartStories: ["Head Start: Partnering with Multilingual Families", "https://headstart.gov/publication/partnering-families-children-who-are-dual-language-learners"],
  headStartLanguageInfo: ["Head Start: Gathering Family Language Information", "https://headstart.gov/publication/gathering-using-language-information-families-share"],
  mandarinTonePloS: ["PLOS ONE: Phonetic Complexity and Mandarin Tone Production", "https://pubmed.ncbi.nlm.nih.gov/28806417/"],
  mandarinToneCambridge: ["Journal of Child Language: Acquisition of Mandarin Tones", "https://doi.org/10.1017/S0305000920000239"],
  mandarinToneWords: ["Macquarie University: Lexical Tones and Word Learning", "https://researchers.mq.edu.au/en/publications/lexical-tones-and-word-learning-in-mandarin-speaking-children-at-/"],
  headStartDisability: ["Head Start: Dual Language Learners and Suspected Delays", "https://headstart.gov/publication/dual-language-learners-disabilities-or-suspected-delays"],
  healthyFamilyCommunication: ["HealthyChildren.org: Improving Family Communications", "https://www.healthychildren.org/English/family-life/family-dynamics/communication-discipline/pages/Improving-Family-Communications.aspx"],
};

export const EDITORIAL_DEPTH = {
  "english-storytime-without-fluent-english": {
    headings: localized(
      ["Name the worry before opening the book", "Prepare one reliable phrase", "Let the home language carry meaning", "Read a Koko scene without performing", "Use audio as a reference, not a judge", "Choose an offline echo", "Stop before confidence turns into strain"],
      ["先說出大人的擔心", "只準備一句可靠短句", "讓中文承擔完整理解", "不表演流利也能讀 Koko", "把音檔當參考而非裁判", "安排一個離線回聲", "在信心變成壓力前停止"],
      ["سموا قلق البالغ قبل فتح القصة", "جهزوا عبارة واحدة موثوقة", "دعوا العربية تحمل المعنى", "اقرؤوا مشهد Koko بلا استعراض", "استخدموا الصوت كمرجع لا كحكم", "اختاروا صدى خارج الشاشة", "توقفوا قبل أن تتحول الثقة إلى ضغط"]
    ),
    today: localized(
      "Preview one Koko page, choose one English phrase, and prepare one question in the language your family uses most. Read for five calm minutes or less.",
      "先看一頁 Koko、圈一句自己懂的英文，再準備一個能用中文回答的問題；共讀五分鐘以內，平靜結束即可。",
      "راجعوا صفحة واحدة من Koko، واختاروا عبارة إنجليزية واحدة، وجهزوا سؤالًا بالعربية. اقرأوا خمس دقائق هادئة أو أقل."
    ),
    notes: localized([
      "A useful preview is practical rather than academic. Check who is speaking, listen to the selected line, and decide which picture detail can support the meaning. If a word remains uncertain, replace it with an easier phrase instead of searching through the whole story. This preparation protects the shared moment: the adult knows where to begin, the child can follow the picture, and neither person has to wait while a phone dictionary interrupts the scene.",
      "Mandarin or Arabic can do the explanatory work while English supplies a small sound pattern. After saying try again, a parent might ask in the home language why Koko wants another attempt, what her face shows, or who could help. That is not cheating. It separates understanding from pronunciation and gives the unfamiliar phrase a clear place inside a conversation the family can already sustain.",
      "When listening back, compare only one feature: perhaps the beginning sound, the rhythm, or where the speaker pauses. Avoid replaying until adult and child sound identical to the recording. Accents reflect language histories, and one story cannot certify pronunciation. A responsible ending might be, We heard it, we tried it once, and now we know where to find it again. The next meeting with the phrase can happen another day."
    ], [
      "有用的預習不是先上完一堂英文課，而是弄清楚誰在說話、聽一次選中的句子，再找一個能幫助理解的圖像細節。如果仍有一個詞不確定，可以換成更容易的短句，不必為了查完整頁面讓孩子在旁邊等待。這樣做保護的是共讀節奏：大人知道從哪裡開始，孩子能跟著畫面走，手機字典也不會在最需要互動時切斷注意力。",
      "英文可以只負責提供一個新的聲音模式，中文則負責承載完整的原因、情緒與對話。說完 try again 後，家長可以用中文問 Koko 為什麼想再試一次、她的表情透露什麼、誰可能提供幫助。這不是偷懶，也不是把英文時間變成中文課；它把理解和發音拆開，讓陌生短句進入家庭本來就有能力維持的談話。",
      "重新聽音檔時，一次只比較一件事，例如開頭的音、整句節奏或說話者停頓的位置。不要反覆播放到大人與孩子必須和錄音完全相同；口音反映每個人的語言經驗，一則故事也不能證明發音能力。負責任的結尾可以是：我們聽過、試過一次，也知道下次去哪裡找。另一天再次相遇，比今晚追求完美更能保留信心。"
    ], [
      "المراجعة المفيدة عملية وليست درسًا مسبقًا. اعرفوا من يتكلم، واستمعوا إلى العبارة المختارة، وحددوا تفصيلًا في الصورة يساعد على فهمها. إذا بقيت كلمة غامضة فاستبدلوها بعبارة أسهل بدل البحث في الصفحة كلها أمام الطفل. هكذا يعرف البالغ نقطة البداية، ويتبع الطفل الصورة، ولا يقطع قاموس الهاتف اللحظة المشتركة كلما ظهرت كلمة جديدة.",
      "يمكن للعربية أن تحمل السبب والمشاعر والحوار، بينما تقدم الإنجليزية نمطًا صوتيًا صغيرًا. بعد قول try again يستطيع الوالد أن يسأل بالعربية لماذا تحاول Koko مرة أخرى، وماذا يظهر وجهها، ومن قد يساعدها. هذا ليس تحايلاً؛ إنه يفصل الفهم عن النطق ويضع العبارة الجديدة داخل محادثة تستطيع الأسرة متابعتها بثقة.",
      "عند العودة إلى التسجيل قارنوا عنصرًا واحدًا فقط: بداية الصوت أو إيقاع الجملة أو موضع التوقف. لا تعيدوا المقطع حتى يتطابق صوت الجميع مع التسجيل. اللكنة جزء من تاريخ اللغة، وقصة واحدة لا تقيس النطق. يمكن أن تكون النهاية المسؤولة: سمعنا العبارة وجربناها مرة ونعرف أين نجدها لاحقًا. اللقاء التالي قد يحدث في يوم آخر."
    ]),
    sources: [
      ["headStartDll", localized("Supports using the adult's strongest language and small amounts of English; it does not prescribe a Fursay routine.", "支持成人使用最熟悉語言並少量加入英文；不代表規定 Fursay 流程。", "يدعم استخدام أقوى لغة لدى البالغ مع قدر صغير من الإنجليزية، ولا يصف روتين Fursay.")],
      ["ashaMultilingual", localized("Clarifies that multilingual exposure is not itself a disorder; it cannot assess an individual child.", "說明多語接觸本身不是障礙；不能用來評估個別孩子。", "يوضح أن التعرض لعدة لغات ليس اضطرابًا بحد ذاته، ولا يقيم طفلًا بعينه.")],
      ["harvardServeReturn", localized("Explains responsive back-and-forth interaction; it does not test English pronunciation.", "說明回應式來回互動的重要性；不評量英文發音。", "يشرح التفاعل المتبادل المستجيب، ولا يختبر النطق الإنجليزي.")],
    ],
    links: ["repetition-without-pressure", "feelings-words-through-stories"],
  },
  "feelings-words-through-stories": {
    headings: localized(
      ["Read the face before naming it", "Join one word to one situation", "Offer two choices without labeling", "Follow Koko across the bridge", "Accept pointing and silence", "Carry the word into play", "Know when a story is not enough"],
      ["先讀表情，再說情緒詞", "把一個詞接到一個情境", "提供兩個選項而不貼標籤", "跟著 Koko 過橋", "接受指圖與安靜", "把情緒詞帶進遊戲", "知道故事何時不夠"],
      ["اقرؤوا الوجه قبل تسمية الشعور", "اربطوا كلمة واحدة بموقف واحد", "قدموا خيارين من دون تصنيف", "اتبعوا Koko عند الجسر", "اقبلوا الإشارة والصمت", "انقلوا الكلمة إلى اللعب", "اعرفوا متى لا تكفي القصة"]
    ),
    today: localized("Pause at one face in the Koko story. Name one visible feeling, describe the clue, and ask what might help the character next.", "停在 Koko 的一個表情，只說一個看得見的情緒、指出線索，再問接下來什麼可能幫助角色。", "توقفوا عند وجه واحد في قصة Koko. سموا شعورًا ظاهرًا، واشرحوا الدليل، واسألوا ما الذي قد يساعد الشخصية."),
    notes: localized([
      "Begin with evidence that both people can see. Koko's lowered ears, tight paws, or distance from the bridge can invite the sentence Koko looks worried. The wording stays tentative because a picture cannot reveal everything inside a character, and a child's choice of another word may be reasonable. Describing the clue before naming the emotion also shows that feeling words are interpretations connected to moments, not permanent labels attached to people.",
      "A two-choice prompt reduces the language load without forcing agreement. Ask whether the character looks calm or worried, then accept a point, a color, a gesture, or a third idea. If the child says angry, the adult can ask what in the picture suggested anger. The purpose is to compare meanings and notice context; it is not to reward the answer printed in an adult's notes.",
      "Move the word away from the child before using it personally. Toys can wait at a pretend bridge, choose help, or show a brave posture. Later, an adult may model I feel worried because this is new, while avoiding You are worried as a verdict. Persistent distress, sudden changes, or safety concerns need attentive adult support beyond a vocabulary activity; the story can open a conversation but cannot explain a child's mental health."
    ], [
      "先從兩個人都看得到的證據開始。Koko 的耳朵垂下、爪子縮緊，或站得離橋很遠，都可以支持「Koko 看起來有點 worried」這句話。保留「看起來」很重要，因為一張圖不可能揭露角色全部感受，孩子選了另一個合理詞也不必立刻糾正。先描述線索再命名情緒，也示範情緒詞是對當下情境的理解，不是貼在人身上的永久標籤。",
      "只給兩個選項可以降低語言負擔，但不能把孩子鎖進標準答案。家長可以問角色比較像 calm 還是 worried，並接受指圖、選顏色、做動作或提出第三個想法。如果孩子回答 angry，可以追問是哪個畫面讓他這樣想。這段對話的目的在比較詞義與情境，不是證明孩子答對成人事先寫好的答案。",
      "在把詞用到孩子身上前，先讓玩具或角色承擔它。玩偶可以站在紙橋前等待、選擇求助，或做出準備前進的姿勢；之後成人再示範「因為這是新的，我有點擔心」，而不是直接判定「你就是在擔心」。持續強烈的困擾、突然改變或安全疑慮，需要超越詞語活動的成人支持；故事能開啟談話，不能解釋孩子的心理狀態。"
    ], [
      "ابدأوا بدليل يراه الطرفان. أذنا Koko المنخفضتان أو كفاها المشدودتان أو بعدها عن الجسر تسمح بقول: تبدو Koko قلقة. تبقى العبارة احتمالية لأن الصورة لا تكشف كل ما في الشخصية، وقد يختار الطفل كلمة أخرى معقولة. وصف العلامة قبل الشعور يبين أن كلمات المشاعر تفسير للحظة وليست صفة دائمة لشخص.",
      "يقلل سؤال بخيارين عبء اللغة من دون فرض الموافقة. اسألوا هل تبدو الشخصية calm أم worried، واقبلوا الإشارة أو اللون أو الحركة أو فكرة ثالثة. إذا قال الطفل angry فاسألوه عن التفصيل الذي أوحى له بذلك. الهدف مقارنة المعاني والسياق، لا مكافأة الإجابة الموجودة في ملاحظات البالغ.",
      "انقلوا الكلمة أولًا إلى لعبة أو شخصية بدل وضعها مباشرة على الطفل. تستطيع الدمى الوقوف أمام جسر متخيل وطلب المساعدة أو إظهار وضعية شجاعة. لاحقًا يمكن للبالغ أن يقول أنا قلق لأن هذا جديد، من دون إصدار حكم أنت قلق. الضيق المستمر أو التغير المفاجئ أو مخاوف السلامة تحتاج دعمًا يتجاوز نشاط المفردات؛ القصة تفتح الحوار ولا تفسر الصحة النفسية."
    ]),
    sources: [
      ["healthyFeelings", localized("Offers parent-facing emotion-coaching context; it is not a diagnostic tool.", "提供家長情緒陪伴背景；不是診斷工具。", "يقدم سياقًا لتوجيه المشاعر ولا يعمل أداة تشخيص.")],
      ["healthyCommunication", localized("Supports naming feelings alongside verbal and nonverbal cues; it does not assign labels to a child.", "支持把情緒詞連到口語與非口語線索；不替孩子貼標籤。", "يدعم ربط كلمات المشاعر بالإشارات اللفظية وغير اللفظية ولا يصنف الطفل.")],
      ["harvardServeReturn", localized("Supports responsive turns and accepting the child's signal; it does not prove vocabulary growth from one story.", "支持回應孩子訊號與來回互動；不證明一則故事能提升詞彙。", "يدعم تبادل الاستجابة وقبول إشارة الطفل ولا يثبت نمو المفردات من قصة واحدة.")],
    ],
    links: ["english-storytime-without-fluent-english", "repetition-without-pressure"],
  },
  "repetition-without-pressure": {
    headings: localized(
      ["Why the same story can feel useful", "Keep the plot stable", "Change only one invitation", "Pause without withholding", "Watch for new participation", "Give tomorrow a simple choice", "Separate repetition from compulsion"],
      ["同一故事為什麼仍有用", "讓情節保持穩定", "一次只換一個邀請", "停頓但不扣住故事", "留意新的參與方式", "替明天留一個簡單選擇", "分清熟悉感與困擾"],
      ["لماذا تبقى القصة نفسها مفيدة", "أبقوا الأحداث ثابتة", "غيروا دعوة واحدة فقط", "توقفوا من دون حجب القصة", "لاحظوا مشاركة جديدة", "اتركوا خيارًا بسيطًا للغد", "ميزوا الألفة عن السلوك المقلق"]
    ),
    today: localized("Replay the familiar story with no quiz. Add one pause or gesture, then let the story continue whether or not the child responds.", "今天重看熟悉故事但不考題，只增加一次停頓或一個動作；孩子有沒有回答，故事都繼續。", "أعيدوا القصة المألوفة بلا اختبار. أضيفوا توقفًا أو حركة واحدة ثم تابعوا سواء استجاب الطفل أم لا."),
    notes: localized([
      "Repetition changes what attention has to carry. Once the child knows who crosses the bridge and what happens at the end, less effort goes into tracking the plot. That spare attention may move toward a sound, facial expression, joke, or turn of phrase. Adults do not need to manufacture novelty at every viewing. The useful question is whether familiarity is helping the child approach the story with ease, not whether the family has reached a prescribed number of new words.",
      "A pause is an invitation only when the outcome is safe. Stop before hello, friend, look toward the child, and continue after a natural beat. Do not freeze the video, repeat the prompt, or refuse to proceed until speech appears. On another evening the change might be a wave, a toy prop, or no change at all. Spreading variation across days protects the story from becoming a drill disguised as play.",
      "Use a tiny record for adult planning rather than child scoring. Note that the child anticipated the bridge, copied a movement, noticed a background animal, or preferred to watch quietly. Those observations can guide the next invitation without becoming evidence of achievement. If repeated viewing causes intense distress when interrupted, crowds out daily needs, or worries the family, a printable choice card is not individualized support and the broader pattern deserves careful attention."
    ], [
      "重複會改變注意力需要承擔的工作。孩子已經知道誰會過橋、結尾發生什麼，就不必把全部力氣用來追情節；空出的注意力可能轉向一個聲音、表情、笑點或之前沒聽清楚的短句。成人不需要每次觀看都製造新花樣。真正值得問的是，熟悉感是否讓孩子更自在地靠近故事，而不是家庭今天累積了幾個新單字。",
      "停頓只有在結果安全時才算邀請。在 hello, friend 前停一下、看向孩子，再經過自然的一拍繼續播放；不要凍結畫面、重問提示，或把故事扣住直到孩子開口。另一天可以換成揮手、放一個玩具道具，也可以完全不加變化。把變化分散在不同日子，能避免遊戲外表下面其實藏著操練。",
      "若要記錄，請把它當成成人規劃，不是孩子成績。可以寫下孩子預測了過橋、模仿一個動作、發現背景小動物，或今天只想安靜看；這些資訊能幫助下次選擇邀請，不能當學習成果證明。若中斷重看會造成強烈困擾、排擠日常需要，或讓家庭擔心，一張選擇卡不能取代個別支持，應更完整地看待整體情況。"
    ], [
      "يغير التكرار العبء الواقع على الانتباه. عندما يعرف الطفل من يعبر الجسر وكيف تنتهي القصة، يقل الجهد المطلوب لمتابعة الأحداث، وقد ينتقل الانتباه إلى صوت أو وجه أو مزحة أو عبارة لم يسمعها من قبل. لا يحتاج البالغ إلى اختراع جديد في كل مشاهدة. السؤال المفيد هو هل تمنح الألفة سهولة وفضولًا، لا كم كلمة جديدة جمعتها الأسرة.",
      "يكون التوقف دعوة فقط عندما تكون النتيجة آمنة. توقفوا قبل hello, friend وانظروا إلى الطفل ثم تابعوا بعد لحظة طبيعية. لا تجمدوا الفيديو ولا تكرروا الطلب ولا تمنعوا استمرار القصة حتى يظهر الكلام. في مساء آخر قد تكون الإضافة تلويحًا أو لعبة، وقد لا تتغير الجلسة إطلاقًا. توزيع التنويع على الأيام يحمي القصة من التحول إلى تدريب متنكر.",
      "اكتبوا ملاحظة صغيرة لتخطيط البالغ لا لتقييم الطفل: توقع الجسر، قلد حركة، لاحظ حيوانًا في الخلفية، أو اختار المشاهدة الصامتة. تساعد هذه الملاحظات في اختيار الدعوة التالية لكنها ليست إثبات إنجاز. إذا سبب قطع المشاهدة ضيقًا شديدًا أو زاحم احتياجات الحياة أو أقلق الأسرة، فلا تكفي بطاقة اختيار ويحتاج النمط الأوسع إلى انتباه مناسب."
    ]),
    sources: [
      ["iesDialogic", localized("Describes interactive rereading and adult prompts; it does not require a child to answer on cue.", "說明互動重讀與成人提示；不要求孩子依指令回答。", "يصف إعادة القراءة التفاعلية ولا يفرض إجابة عند الطلب.")],
      ["iesVocabulary", localized("Explains repeated exposure in dialogic reading; it does not set a home viewing quota.", "說明對話式閱讀中的重複接觸；不設定家庭觀看次數。", "يشرح التعرض المتكرر ولا يحدد حصة مشاهدة منزلية.")],
      ["harvardExecutive", localized("Provides background on predictable routines and practice; it does not assess repetitive behavior.", "提供可預測流程與練習的背景；不評估重複行為。", "يقدم خلفية عن الروتين المتوقع ولا يقيم السلوك التكراري.")],
    ],
    links: ["english-storytime-without-fluent-english", "from-video-to-five-minute-printable"],
  },
  "from-video-to-five-minute-printable": {
    headings: localized(
      ["Choose one scene worth carrying offline", "End the video before opening paper", "Set out only two materials", "Translate the scene into a mark or movement", "Protect unfinished work", "Offer a non-paper route", "Keep five minutes as a ceiling"],
      ["只選一個值得離線延伸的場景", "先結束影片再拿紙", "桌上只放兩種材料", "把場景變成筆跡或動作", "保護沒有完成的作品", "提供非紙本路徑", "把五分鐘當上限"],
      ["اختاروا مشهدًا واحدًا يستحق الانتقال", "أنهوا الفيديو قبل فتح الورقة", "ضعوا مادتين فقط", "حولوا المشهد إلى علامة أو حركة", "احموا العمل غير المكتمل", "قدموا طريقًا بلا ورق", "اجعلوا خمس دقائق حدًا أعلى"]
    ),
    today: localized("After one story scene, close the screen. Offer one page and two tools, choose one tiny action, and stop at five minutes even if boxes remain empty.", "看完一個故事場景就關螢幕，只拿一頁紙和兩種工具、做一個小動作；即使格子沒填完，五分鐘也停止。", "بعد مشهد واحد أغلقوا الشاشة. قدموا صفحة وأداتين وفعلًا صغيرًا، وتوقفوا بعد خمس دقائق ولو بقيت خانات فارغة."),
    notes: localized([
      "The transition works better when the child can tell that the screen portion is complete. Name the final image, close the player, and move to a prepared surface instead of leaving the clip running behind the paper. Select one visual element such as Koko's bridge, a face, or a path. A whole episode contains too many possible tasks; one chosen detail gives the printable a reason to exist beyond proving that screen time was educational.",
      "Limit the setup before inviting participation. One sheet and two crayons can support circling, connecting, coloring, or making a single mark. Scissors, glue, stickers, and a stack of pages may look generous but can turn a short transition into adult-managed logistics. Say what the stopping point will be, then let the child decide whether to add one line, act out the scene, or simply describe what belongs on the page.",
      "An unfinished sheet is not a failed activity. Write the date only if the family wants a memory, store the page only if the child asks to return, and recycle it without ceremony when it has served its purpose. For children who avoid paper, build the bridge with blocks, trace the path in the air, or move a toy between two cushions. The offline connection is the goal; pencil control, neatness, and completion are not hidden requirements."
    ], [
      "轉換比較順利的前提，是孩子能清楚知道影片部分已經完成。說出最後一個畫面、關掉播放器，再移到事先準備好的桌面，不要讓片段在紙張後方繼續播放。只選一個視覺元素，例如 Koko 的橋、一張表情或一條路徑；整集故事能延伸的東西太多，一個明確細節才能讓學習單有自己的用途，而不是用來證明剛才的螢幕時間很有教育性。",
      "邀請孩子前先限制材料。一張紙和兩支蠟筆已經足以圈選、連線、上色或留下一個記號；剪刀、膠水、貼紙和整疊頁面看似豐富，卻可能讓短轉換變成成人忙著管理工具。先說清楚何時停止，再讓孩子選擇畫一條線、演出場景，或只說說紙上可以出現什麼。",
      "沒有完成的紙張不是失敗活動。家庭真的想留作記憶才寫日期，孩子主動想再回來才收好；任務已經完成用途時，直接回收也不必製造遺憾。若孩子排斥紙筆，可以用積木搭橋、在空中畫路徑，或讓玩具在兩個靠墊間移動。真正目標是把故事接到離線生活，握筆、整齊與填完從來不是隱藏條件。"
    ], [
      "ينجح الانتقال عندما يعرف الطفل أن جزء الشاشة انتهى. سموا الصورة الأخيرة وأغلقوا المشغل وانتقلوا إلى سطح جاهز بدل ترك الفيديو يعمل خلف الورقة. اختاروا عنصرًا بصريًا واحدًا مثل جسر Koko أو وجه أو طريق. تحتوي الحلقة على مهام محتملة كثيرة؛ تفصيل واحد يمنح الورقة سببًا واضحًا غير إثبات أن وقت الشاشة كان تعليميًا.",
      "قللوا المواد قبل الدعوة. صفحة وقلمان يكفيان للدائرة أو الوصل أو اللون أو علامة واحدة. قد تبدو المقصات والغراء والملصقات وكومة الصفحات سخية، لكنها تحول الانتقال القصير إلى إدارة يقوم بها البالغ. اذكروا نقطة التوقف، ثم دعوا الطفل يختار خطًا واحدًا أو تمثيل المشهد أو وصف ما يمكن وضعه على الصفحة.",
      "الورقة غير المكتملة ليست نشاطًا فاشلًا. اكتبوا التاريخ فقط إن أرادت الأسرة ذكرى، واحتفظوا بها إذا طلب الطفل العودة، وأعيدوا تدويرها بهدوء بعد أن تؤدي غرضها. لمن لا يحب الورق يمكن بناء الجسر بالمكعبات أو رسم المسار في الهواء أو تحريك لعبة بين وسادتين. الصلة خارج الشاشة هي الهدف، وليست دقة القلم أو النظافة أو الإكمال شروطًا خفية."
    ]),
    sources: [
      ["aapLiteracy", localized("Supports shared literacy activity around books; it does not require worksheets or completion.", "支持圍繞故事的共同讀寫活動；不要求學習單或完成度。", "يدعم نشاط القراءة المشترك ولا يفرض ورقة أو إكمالًا.")],
      ["iesSharedReading", localized("Supports active engagement with a shared book; it does not validate every screen-to-paper transition.", "支持與共同文本主動互動；不證明所有影音轉紙本流程。", "يدعم المشاركة مع الكتاب ولا يثبت كل انتقال من الشاشة إلى الورق.")],
      ["naeycDiversity", localized("Offers examples of drawing and dramatic play as language extensions; it does not rank one format over another.", "提供畫圖與戲劇遊戲作為語言延伸；不替形式排名。", "يقدم الرسم واللعب الدرامي كامتداد لغوي ولا يرتب صيغة فوق أخرى.")],
    ],
    links: ["repetition-without-pressure", "three-minute-chinese-routine"],
  },
  "chinese-storytime-for-arabic-speaking-families": {
    headings: localized(
      ["Choose a Chinese phrase the family can own", "Use Arabic to secure the plot", "Let the picture carry meaning", "Give each voice a different job", "Build a bridge beyond translation", "Invite relatives without turning them into teachers", "Stop before confusion becomes pressure"],
      ["先選一句全家用得上的中文", "用阿語穩住故事理解", "讓圖像先承擔意思", "替不同語言安排不同工作", "從翻譯走向真實使用", "邀請家人參與但不當老師", "在困惑變成壓力前停止"],
      ["اختاروا عبارة صينية تملكها الأسرة", "ثبتوا معنى القصة بالعربية", "دعوا الصورة تحمل المعنى", "أعطوا كل لغة وظيفة مختلفة", "ابنوا جسرًا يتجاوز الترجمة", "أشركوا الأقارب من دون دور المعلم", "توقفوا قبل أن يتحول الغموض إلى ضغط"]
    ),
    today: localized("Watch one Nour scene in Chinese, retell the plot briefly in Arabic, then reuse one Chinese phrase while moving a toy through the same action.", "看一個努爾中文場景，先用阿語簡短確認情節，再讓玩具重演動作並重用一句中文。", "شاهدوا مشهدًا واحدًا لنور بالصينية، لخصوا الحدث بالعربية، ثم أعيدوا عبارة صينية واحدة أثناء تحريك لعبة في الفعل نفسه."),
    notes: localized([
      "An Arabic-speaking adult does not need to conceal Arabic in order to make Chinese story time legitimate. Before opening the video, name the setting and the likely action in the language that lets the family think together. During the scene, keep one Chinese expression intact, such as come here or look. Afterward, the adult can retell only the turning point in Arabic. This division protects comprehension while leaving a small, memorable place for the new language.",
      "Images and objects reduce the amount of translation a short session needs. If Nour puts a cup on the table, copy the movement with a toy cup and repeat the Chinese phrase at the exact moment of placement. Avoid translating every subtitle line or asking the child to repeat it. A phrase connected to a visible action can return naturally at dinner or during play; a line explained word by word may disappear as soon as the explanation ends.",
      "A grandparent or older sibling can join as a story partner without becoming a pronunciation examiner. Give that person a simple role: hold the prop, choose which picture comes next, or repeat the familiar Arabic summary. If family members disagree about a Chinese sound, replay the official audio once and move on. Stop when either person is only guessing, correcting, or defending a language. The guide supports shared exposure, not a judgment of home-language use or bilingual development."
    ], [
      "阿語家庭不需要把阿語藏起來，中文故事時間才算有效。打開影片前，可以先用全家最能共同思考的語言說明場景與可能發生的動作；播放時只保留一句完整中文，例如「過來」或「你看」；結束後再用阿語簡短重述轉折。這種分工讓孩子不必在不理解情節與接觸新語言之間二選一，也替中文留下一個小而清楚的位置。",
      "圖像與實物能減少短時間內需要的翻譯量。若努爾把杯子放上桌，就拿玩具杯重做一次，在放下的那一刻說同一句中文；不必翻譯每一行字幕，也不要要求跟讀。與可見動作綁在一起的短句，之後可能自然出現在吃飯或遊戲時；逐字說明的句子，常在解釋結束後就失去使用情境。",
      "祖父母或手足可以成為故事夥伴，不必變成發音考官。可以請他拿道具、選下一張圖，或重述熟悉的阿語摘要。家人若對中文聲音有不同意見，只重播一次原始音檔就繼續，不把聚會變成誰比較正確的辯論。當大人和孩子只剩猜測、糾正或保護自己語言時就停止；本指南提供共同接觸方法，不評斷家庭語言或雙語發展。"
    ], [
      "لا تحتاج الأسرة العربية إلى إخفاء العربية كي تكون القصة الصينية جادة. قبل تشغيل الفيديو اذكروا المكان والفعل المتوقع باللغة التي تسمح للأسرة أن تفكر معًا. أثناء المشهد احتفظوا بعبارة صينية واحدة كاملة مثل تعال أو انظر، وبعده لخصوا نقطة التحول بالعربية فقط. هذا التقسيم يحمي فهم القصة ويترك للغة الجديدة مساحة صغيرة يمكن تذكرها.",
      "تقلل الصور والأشياء الحاجة إلى ترجمة كل سطر. إذا وضعت نور كوبًا على الطاولة فكرروا الحركة بكوب لعبة، وقولوا العبارة الصينية في لحظة الوضع نفسها. لا تطلبوا ترديد كل جملة. العبارة المرتبطة بفعل مرئي قد تعود طبيعيًا وقت الطعام أو اللعب، أما الجملة التي شرحت كلمة كلمة فقد تختفي بانتهاء الشرح.",
      "يمكن للجد أو الأخ الأكبر أن يشارك شريكًا في القصة لا ممتحن نطق. أعطوه دورًا بسيطًا: حمل الأداة أو اختيار الصورة التالية أو إعادة الملخص العربي. عند الاختلاف على صوت صيني أعيدوا التسجيل الأصلي مرة ثم تابعوا. توقفوا إذا أصبحت الجلسة تخمينًا وتصحيحًا ودفاعًا عن اللغة. الدليل للتعرض المشترك لا للحكم على العربية المنزلية أو نمو الثنائية اللغوية."
    ]),
    sources: [
      ["headStartHomeLanguage", localized("Supports maintaining the home language while adding another language; it does not prescribe a Chinese curriculum.", "支持保留家庭語言並加入另一種語言；不規定中文課程。", "يدعم الحفاظ على لغة البيت مع إضافة لغة أخرى ولا يقرر منهجًا صينيًا.")],
      ["headStartStories", localized("Offers multilingual family story practices; it does not measure gains from one bilingual viewing.", "提供多語家庭故事做法；不衡量一次雙語觀看的成果。", "يقدم ممارسات قصص متعددة اللغات ولا يقيس نتيجة مشاهدة واحدة.")],
      ["unescoMultilingual", localized("Provides policy context for multilingual education; it does not evaluate an individual child or Fursay.", "提供多語教育政策背景；不評估個別兒童或 Fursay。", "يقدم سياقًا لسياسة التعليم متعدد اللغات ولا يقيم طفلًا أو Fursay.")],
    ],
    links: ["pinyin-and-tones-for-parents", "three-chinese-words-a-day"],
  },
  "pinyin-and-tones-for-parents": {
    headings: localized(
      ["Treat pinyin as a listening map", "Hear the syllable before reading the letters", "Change one tone at a time", "Use a hand path without policing it", "Check audio instead of guessing louder", "Keep recognition separate from performance", "Know what a home routine cannot assess"],
      ["把拼音當成聆聽地圖", "先聽音節再看字母", "一次只改一個聲調", "用手勢畫路徑但不糾察", "查音檔，不用更大聲猜", "把辨認與表演分開", "知道家庭練習不能評估什麼"],
      ["عاملوا البينيين كخريطة سمعية", "اسمعوا المقطع قبل قراءة الحروف", "غيروا نغمة واحدة كل مرة", "ارسموا المسار باليد بلا مراقبة", "راجعوا الصوت بدل التخمين الأعلى", "افصلوا التمييز عن الأداء", "اعرفوا ما لا يقيسه التدريب المنزلي"]
    ),
    today: localized("Play one recorded syllable, copy its pitch path with a finger, and use the whole word in a short scene. Stop before asking for a perfect imitation.", "播放一個錄製音節，用手指跟著音高走向，再把完整詞放進一個短情境；不要追求完美模仿。", "شغلوا مقطعًا مسجلًا، وتتبعوا مسار النغمة بإصبع، ثم ضعوا الكلمة كاملة في مشهد قصير. توقفوا قبل طلب تقليد مثالي."),
    notes: localized([
      "Pinyin letters are familiar to many adults, but their values are not identical to English or Arabic transliteration habits. Begin with audio from the story and let the printed syllable identify what to replay. For ma, listen to the whole syllable before naming the initial, final, and tone mark. This order keeps pinyin attached to sound rather than turning it into a spelling code the adult must decode from prior alphabet knowledge.",
      "A hand movement can make pitch direction visible: level for the first tone, rising for the second, dipping for the third in careful citation speech, and falling for the fourth. The movement is a reminder, not a performance score. Natural speech changes the exact shape, and third-tone patterns are especially affected by surrounding tones. Use one contrast in one familiar word, then return to meaning before the session becomes a sequence of isolated noises.",
      "When uncertain, replay a trusted recording at normal speed and then slightly slower if the source allows it. Repeating an adult guess more loudly does not make it more accurate. A child may recognize a contrast without producing it on request, or may use a word successfully in one phrase and not another. A home story routine cannot diagnose speech or hearing, certify pronunciation, or replace instruction from a qualified Mandarin teacher when the family wants systematic feedback."
    ], [
      "拼音字母看似熟悉，但它們的聲音不等於英文拼讀習慣，也不等於任何羅馬字直覺。先播放故事原音，再讓印出的音節告訴家長要重聽哪一段。以 ma 為例，先聽完整音節，再看聲母、韻母與聲調符號；這個順序能讓拼音依附在聲音上，而不是變成家長必須靠既有外語規則破解的拼字密碼。",
      "手勢可以把音高走向變得可見：第一聲大致平、第二聲往上、第三聲在單獨慢讀時有轉折、第四聲往下。手勢只是提醒，不是表演分數；自然語流會改變實際曲線，第三聲也特別容易受前後聲調影響。每次只比較一組熟悉詞，聽完就回到角色與意思，不讓短故事變成一串脫離情境的聲音測驗。",
      "不確定時，重播可信音檔的正常速度；來源允許才稍微放慢。把成人猜測說得更大聲，不會讓它更準。孩子可能聽得出差異卻不願當場模仿，也可能只在某個短句中自然使用。家庭故事流程不能診斷語音或聽力、不能認證發音；若家庭需要有系統的回饋，應尋找合格華語教師或所在地專業支持。"
    ], [
      "تبدو حروف البينيين مألوفة، لكن قيمها لا تطابق عادات قراءة الإنجليزية أو كتابة العربية بالحروف اللاتينية. ابدأوا بصوت القصة واجعلوا المقطع المكتوب علامة لما يعاد. في ma اسمعوا المقطع كاملًا قبل تقسيمه إلى بداية ونهاية وعلامة نغمة. هكذا يبقى البينيين مرتبطًا بالصوت ولا يتحول إلى شفرة تهجئة يحلها البالغ بقواعد لغة أخرى.",
      "تجعل حركة اليد مسار النغمة مرئيًا: مستوٍ للأولى، صاعد للثانية، منعطف للثالثة في النطق البطيء، وهابط للرابعة. الحركة تذكير وليست درجة. يتغير الشكل في الكلام الطبيعي وتتأثر النغمة الثالثة بما حولها. قارنوا كلمة مألوفة واحدة ثم عودوا إلى المعنى قبل أن تصبح القصة أصواتًا معزولة.",
      "عند الشك أعيدوا تسجيلًا موثوقًا بالسرعة الطبيعية، ثم أبطئوه قليلًا إن سمح المصدر. رفع صوت التخمين لا يصححه. قد يميز الطفل الفرق من دون إنتاجه عند الطلب. لا يشخص الروتين المنزلي السمع أو الكلام، ولا يمنح شهادة نطق، ولا يستبدل مدرس الماندرين المؤهل عندما تريد الأسرة ملاحظات منظمة."
    ]),
    sources: [
      ["mandarinTonePloS", localized("Reports research on Mandarin tone learning; laboratory findings do not predict one family's progress.", "報告華語聲調學習研究；實驗結果不能預測單一家庭進度。", "يعرض بحثًا عن تعلم نغمات الماندرين ولا يتنبأ بتقدم أسرة بعينها.")],
      ["mandarinToneCambridge", localized("Explains tone perception and training evidence; it does not certify a pronunciation method.", "說明聲調感知與訓練證據；不認證特定發音方法。", "يشرح دليل إدراك النغمة وتدريبها ولا يعتمد طريقة نطق.")],
      ["mandarinToneWords", localized("Provides original evidence about tone and word learning; it does not define a home mastery target.", "提供聲調與詞彙學習原始證據；不設定家庭精熟目標。", "يقدم دليلًا أصليًا عن النغمة وتعلم الكلمات ولا يحدد هدف إتقان منزلي.")],
    ],
    links: ["chinese-storytime-for-arabic-speaking-families", "three-chinese-words-a-day"],
  },
  "three-chinese-words-a-day": {
    headings: localized(
      ["Choose words from one family moment", "Give every word a visible job", "Use the words before displaying them", "Let Arabic carry the explanation", "Return at three different times", "Replace a word when life changes", "Do not turn three into a quota"],
      ["從同一個家庭時刻選詞", "讓每個詞都有看得見的工作", "先使用，再展示字卡", "讓阿語承擔解釋", "在三個不同時刻自然回來", "生活改變時就換詞", "不要把三個變成配額"],
      ["اختاروا الكلمات من لحظة عائلية واحدة", "أعطوا كل كلمة وظيفة مرئية", "استخدموا الكلمات قبل عرضها", "دعوا العربية تحمل الشرح", "عودوا إليها في ثلاثة أوقات", "بدلوا الكلمة عندما تتغير الحياة", "لا تحولوا العدد ثلاثة إلى حصة"]
    ),
    today: localized("Pick three words from getting ready—shoe, open, go. Use each once during the real routine and leave the cards aside unless the child asks.", "從出門準備選三個詞：鞋、開、走；在真實流程各用一次，孩子沒有要求就不必拿字卡。", "اختاروا ثلاث كلمات من الاستعداد للخروج: حذاء، افتح، اذهب. استعملوا كل واحدة مرة في الروتين الحقيقي واتركوا البطاقات ما لم يطلبها الطفل."),
    notes: localized([
      "Three words are manageable only when they belong together. Choose a person, object, and action from one recurring moment rather than three unrelated nouns. At the door, shoe, open, and go can appear in order while hands are already busy with the real task. The family does not need a separate lesson to create meaning. If the routine changes, replace the set instead of keeping an old list merely to preserve a streak.",
      "Arabic can explain the plan and resolve confusion while Chinese marks the small action. Say in Arabic that it is time to leave, point to the shoe, use the Chinese word once, and continue dressing. A picture card may help an adult remember, but it should not block access to the object or delay the family until the child names it. Words become useful through participation in life, not through a required display of recall.",
      "Return to a word at breakfast, play, or the next day's doorway only when the meaning still fits. A child may respond by bringing the shoe, opening a box, or moving toward the door; speech is not the only evidence that the message was understood. Drop the target when it causes conflict or loses relevance. Three is a design limit for the adult, not a daily minimum, vocabulary score, or promise of cumulative fluency."
    ], [
      "三個詞只有彼此屬於同一情境時才真的輕量。可以從反覆出現的家庭時刻選一個人、一個物件和一個動作，不要湊三個無關名詞。出門時，「鞋、開、走」會依序出現在大家原本就在做的事情裡，不必再搭一堂課才能產生意思。日常流程改變就換掉這組詞，不需要為維持連續紀錄而保留已經用不到的清單。",
      "阿語可以說明計畫、處理困惑，中文只標記眼前的小動作。家長先用阿語說準備出門，指向鞋子、說一次中文，再繼續穿戴。圖卡可以幫成人記得，但不能擋住實物，也不能讓全家停在門口等孩子命名。詞語透過參與生活變得有用，不是透過被要求展示記憶才算學會。",
      "早餐、遊戲或隔天門口若還有合適情境，再讓詞回來。孩子拿來鞋子、打開盒子或往門口移動，都可能表示訊息已經有意義，口說不是唯一回應。當目標引發衝突或失去用途，就把它放下。「三個」是成人的設計上限，不是每日最低量、詞彙分數，也不保證累積成流利度。"
    ], [
      "تكون الكلمات الثلاث خفيفة عندما تنتمي إلى لحظة واحدة. اختاروا شخصًا وشيئًا وفعلًا من روتين متكرر بدل ثلاثة أسماء منفصلة. عند الباب تظهر كلمات حذاء وافتح واذهب بالترتيب بينما تنشغل اليدان بالمهمة الحقيقية. لا تحتاج الأسرة إلى درس منفصل لصنع المعنى، وإذا تغير الروتين فبدلوا المجموعة بدل حماية سلسلة قديمة.",
      "تستطيع العربية شرح الخطة وحل الغموض بينما تشير الصينية إلى الفعل الصغير. قولوا بالعربية إن وقت الخروج حان، وأشيروا إلى الحذاء، واستعملوا الكلمة الصينية مرة، ثم تابعوا اللبس. قد تذكر البطاقة البالغ لكنها لا تمنع الوصول إلى الشيء ولا توقف الأسرة حتى يسميه الطفل. تصبح الكلمة نافعة بالمشاركة في الحياة لا بعرض إلزامي للذاكرة.",
      "عودوا إلى الكلمة وقت الإفطار أو اللعب أو عند الباب في الغد فقط إذا بقي المعنى مناسبًا. قد يجلب الطفل الحذاء أو يفتح صندوقًا أو يتحرك نحو الباب؛ الكلام ليس الدليل الوحيد على الفهم. اتركوا الهدف إذا سبب صراعًا أو فقد فائدته. العدد ثلاثة حد تصميم للبالغ لا حصة يومية ولا درجة مفردات ولا وعدًا بالطلاقة."
    ]),
    sources: [
      ["iesVocabulary", localized("Supports repeated, meaningful encounters with words; it does not endorse a fixed three-word quota.", "支持有意義的重複詞彙接觸；不支持固定三詞配額。", "يدعم اللقاءات المتكررة ذات المعنى ولا يقر حصة ثابتة من ثلاث كلمات.")],
      ["headStartLanguageInfo", localized("Frames language learning within family interaction; it does not predict a child's vocabulary count.", "把語言學習放在家庭互動中；不預測孩子詞彙量。", "يضع تعلم اللغة في تفاعل الأسرة ولا يتنبأ بعدد مفردات الطفل.")],
      ["naeycDiversity", localized("Supports culturally and linguistically responsive practice; it does not require replacing Arabic.", "支持文化與語言回應式做法；不要求取代阿語。", "يدعم الممارسة المستجيبة ثقافيًا ولغويًا ولا يطلب استبدال العربية.")],
    ],
    links: ["chinese-storytime-for-arabic-speaking-families", "three-minute-chinese-routine"],
  },
  "three-minute-chinese-routine": {
    headings: localized(
      ["Attach three minutes to a stable cue", "Use one opening every time", "Give the middle one real action", "Close with a choice the child controls", "Prepare a shorter version", "Let missed days stay missed", "Change the routine when the family needs more"],
      ["把三分鐘接在穩定提示後", "每次使用同一個開場", "中段只做一個真實動作", "用孩子能控制的選擇結束", "事先準備更短版本", "錯過的日子不用補", "家庭需要時就更改流程"],
      ["اربطوا الدقائق الثلاث بإشارة ثابتة", "استخدموا الافتتاح نفسه", "اجعلوا الوسط فعلًا حقيقيًا واحدًا", "اختموا بخيار يملكه الطفل", "جهزوا نسخة أقصر", "دعوا الأيام الفائتة تمر", "غيروا الروتين عندما تحتاج الأسرة"]
    ),
    today: localized("After one stable cue, greet Nour, perform one Chinese action with a toy, then let the child choose goodbye or one replay. End either way.", "在一個固定提示後，先向努爾打招呼、用玩具做一個中文動作，再讓孩子選擇說再見或重播一次；兩種都結束。", "بعد إشارة ثابتة حَيّوا نور، ونفذوا فعلًا صينيًا واحدًا بلعبة، ثم دعوا الطفل يختار الوداع أو إعادة واحدة. انتهوا في الحالتين."),
    notes: localized([
      "A routine is easier to find when it follows something that already happens: putting cups in the sink, opening the curtains, or sitting beside the bed. The cue should be stable, but the clock does not need to be exact. Begin with the same greeting so the adult does not spend the first minute inventing instructions. On a difficult day, greeting Nour and saying goodbye can be the whole routine without creating work owed for tomorrow.",
      "Use the middle minute for one action that changes the scene. Move a toy up, put a cup down, open a paper door, or help Zayd find an object while saying one Chinese phrase. The adult may explain the game in Arabic before it starts. Avoid fitting flashcards, pronunciation correction, a worksheet, and a quiz into the same interval. The short duration protects attention only if the content is also narrow.",
      "End with a choice whose outcomes are both honest: goodbye now or replay once. If the adult cannot allow replay, offer two real endings such as wave or put the toy away. A timer can remind the adult, but it should not alarm or shame the child. Families may skip days, change the cue, or stop using the routine. Three minutes is an organizing idea, not treatment, a developmental prescription, or evidence that daily attendance produces fluency."
    ], [
      "流程接在原本就會發生的事情後面，比單靠時鐘更容易找到，例如把杯子放進水槽、拉開窗簾，或坐到床邊。提示要穩定，時間不必精確；每次用同一句招呼開場，成人就不用把第一分鐘花在臨時發明指令。很累的日子裡，只向努爾打招呼再說再見，也可以是完整流程，不會因此欠下明天要補的內容。",
      "中間一分鐘只放一個會改變場景的動作：把玩具往上移、杯子放下、打開紙門，或幫 Zayd 找物件，同時說一句中文。開始前可以用阿語說明遊戲；不要把圖卡、發音糾正、學習單和測驗全部塞進同一段。時間短只有在內容也窄的時候才能保護注意力，否則三分鐘仍可能讓全家匆忙。",
      "結尾給兩個都能實現的選擇：現在說再見，或只重播一次。若大人無法允許重播，就改成揮手或把玩具收好兩種真實結尾。計時器可以提醒成人，不應驚嚇或羞辱孩子。家庭可以漏掉一天、換提示，甚至停止使用；三分鐘只是整理生活的方法，不是治療、發展處方，也不證明每天出席會帶來流利度。"
    ], [
      "يسهل العثور على الروتين عندما يأتي بعد حدث قائم: وضع الأكواب في الحوض أو فتح الستارة أو الجلوس قرب السرير. ينبغي أن تكون الإشارة ثابتة لكن الساعة لا تحتاج دقة. ابدأوا بالتحية نفسها كي لا يقضي البالغ الدقيقة الأولى في اختراع التعليمات. في يوم صعب قد تكون تحية نور ثم الوداع روتينًا كاملًا بلا عمل مؤجل للغد.",
      "اجعلوا الدقيقة الوسطى فعلًا واحدًا يغير المشهد: ارفعوا لعبة أو ضعوا كوبًا أو افتحوا بابًا ورقيًا أو ساعدوا Zayd في العثور على شيء مع عبارة صينية واحدة. يمكن شرح اللعبة بالعربية قبل البدء. لا تجمعوا بطاقات وتصحيح نطق وورقة واختبارًا في الوقت نفسه. قصر الزمن يحمي الانتباه فقط عندما يكون المحتوى ضيقًا أيضًا.",
      "اختموا بخيارين حقيقيين: الوداع الآن أو إعادة واحدة. إذا لم تكن الإعادة ممكنة فاعرضوا التلويح أو وضع اللعبة بعيدًا. قد يذكر المؤقت البالغ لكنه لا يخيف الطفل ولا يحرجه. يمكن للأسرة تفويت الأيام أو تغيير الإشارة أو ترك الروتين. ثلاث دقائق فكرة تنظيمية لا علاج ولا وصفة نمو ولا دليلًا على أن الحضور اليومي يصنع الطلاقة."
    ]),
    sources: [
      ["headStartDll", localized("Supports responsive routines for children learning more than one language; it does not prescribe three minutes.", "支持多語兒童的回應式流程；不規定三分鐘。", "يدعم الروتين المستجيب لمتعلمي أكثر من لغة ولا يفرض ثلاث دقائق.")],
      ["harvardExecutive", localized("Provides background on predictable routines and adult scaffolding; it does not prove language outcomes.", "提供可預測流程與成人支持背景；不證明語言成果。", "يقدم خلفية عن الروتين المتوقع ودعم البالغ ولا يثبت نتائج لغوية.")],
      ["aapLiteracy", localized("Supports shared parent-child literacy moments; it does not set a daily duration or attendance target.", "支持親子共同讀寫時刻；不設定每日時長或出席目標。", "يدعم لحظات القراءة المشتركة ولا يحدد مدة يومية أو هدف حضور.")],
    ],
    links: ["three-chinese-words-a-day", "from-video-to-five-minute-printable"],
  },
};

export const EDITORIAL_SUPPLEMENTS = {
  "english-storytime-without-fluent-english": localized([
    "Try two versions of the same evening rather than adding more material. On the first pass, the adult narrates the picture in Mandarin and keeps only Koko's short English line. On the second, the adult points silently when that line arrives and lets the recording carry it. If the child turns away, keep the story moving instead of asking for proof that the phrase was heard. The comparison helps the adult discover whether explanation, audio, or the image is doing useful work without making the child responsible for evaluating the lesson.",
    "Confidence can also mean choosing not to pronounce a word yet. Save the page URL, write the selected phrase on a small adult note, and return after checking it privately. If shared reading repeatedly causes the adult embarrassment or the child conflict, use a wordless picture walk in the home language and seek language instruction separately. A family story should remain a place for connection; it does not need to carry every adult learning goal at once."
  ], [
    "可以比較同一晚的兩種讀法，而不是繼續加材料。第一次由成人用中文描述畫面，只保留 Koko 的一句短英文；第二次走到那句時，成人只指圖，讓原始錄音負責聲音。如果孩子轉開視線，故事仍照常繼續，不要求證明他有聽見。這種比較是在幫成人判斷，到底是中文解釋、錄音或畫面真正支撐了互動，不是把評估教學成敗的責任交給孩子。家長也可以先選一張有明確動作的圖，例如跨橋、等待或向朋友揮手，再選與動作同時出現的短句；這比挑一個抽象但看似厲害的詞更容易在生活裡重用。",
    "有信心也可能代表今天先不念某個詞。可以保留頁面網址，把想確認的句子寫在成人自己的小紙條，等孩子不在等待時再查。若共讀反覆讓成人感到羞愧、孩子因糾正發生衝突，就先用家庭主要語言做無文字看圖，把成人的語言學習另外安排。另一天可以只聽開頭、替角色配一個動作，或讓孩子選要不要繼續；這些替代方式都不欠原本的英文流程。家庭故事應該保留連結功能，不必同時背負成人發音、孩子詞彙量與每日進度三種目標。"
  ], [
    "جربوا نسختين من المساء نفسه بدل إضافة مواد. في الأولى يصف البالغ الصورة بالعربية ويحتفظ بسطر إنجليزي قصير لـKoko. في الثانية يشير عند وصول السطر ويترك التسجيل يحمله. إذا ابتعد الطفل تستمر القصة ولا يطلب البالغ دليلًا على أن العبارة سمعت. تساعد المقارنة البالغ على معرفة هل الشرح أو الصوت أو الصورة هو الجزء النافع، من دون جعل الطفل مسؤولًا عن تقييم الدرس. اختاروا صورة بفعل واضح مثل عبور الجسر أو الانتظار أو التلويح، ثم عبارة تحدث في اللحظة نفسها؛ هذا أسهل للاستعمال لاحقًا من كلمة مجردة اختيرت لأنها تبدو متقدمة.",
    "قد تعني الثقة أن البالغ يختار عدم نطق كلمة اليوم. احفظوا رابط الصفحة واكتبوا العبارة في ملاحظة للبالغ وراجعوها بعيدًا عن وقت انتظار الطفل. إذا سببت القراءة خجلًا متكررًا للبالغ أو نزاعًا بسبب التصحيح، امشوا في الصور بلا نص وبالعربية، واجعلوا تعلم البالغ منفصلًا. في يوم آخر يمكن سماع البداية فقط أو إضافة حركة للشخصية أو ترك الطفل يختار الاستمرار. لا تدين الأسرة للروتين بنسخة كاملة. ينبغي أن تبقى القصة مكانًا للصلة، ولا تحمل في وقت واحد نطق البالغ وعدد كلمات الطفل وسجل الحضور اليومي."
  ]),
  "feelings-words-through-stories": localized([
    "Use a contrast scene when one picture is ambiguous. Put Koko before and after the bridge side by side and ask what changed in her face, paws, and distance from a friend. The adult can model worried before and relieved after while leaving room for cautious, tired, or proud. If the child prefers colors, shapes, or a toy's posture, use that route first and attach a feeling word only after the shared observation is clear.",
    "Some moments should not become vocabulary practice. When the child is already upset, meet the immediate need for safety, space, food, rest, or comfort rather than pointing to a chart. Return to the fictional character only after calm has returned, if the child wants to. A story can expand the family's language for talking about feelings, but it cannot reveal why a child feels something, settle a disagreement, or replace sustained listening."
  ], [
    "一張圖很模糊時，可以改用前後對照，而不是要求孩子猜成人心中的詞。把 Koko 過橋前與過橋後的畫面放在一起，問耳朵、爪子、站的位置和朋友距離有什麼改變；成人可以示範前面 worried、後面 relieved，同時保留 cautious、tired 或 proud 等其他合理理解。孩子若比較習慣用顏色、形狀或玩具姿勢表達，就先沿著那條路走，等兩個人都看見同一線索後再接上情緒詞。也可以讓兩個玩偶選不同幫助：一個需要朋友陪、一個想先坐著；詞語的用途是讓選擇更清楚，不是把所有人推向同一反應。",
    "有些時刻不適合變成詞彙練習。孩子正在強烈難過時，先處理安全、空間、飢餓、疲累或安慰等眼前需要，不要拿出圖卡要求指認。平靜恢復後，而且孩子願意時，才回到虛構角色。若孩子不想談自己，成人可以只說角色可能需要什麼，不追問個人經驗。故事能增加家庭談感受的詞，不能揭露孩子為什麼有某種情緒、不能替爭執判定誰對，也不能取代長時間傾聽。出現持續、劇烈或影響安全的困擾時，應以完整生活情境尋找合適支持，而不是增加更多情緒標籤。"
  ], [
    "عندما تكون صورة واحدة غامضة استخدموا مشهدين للمقارنة. ضعوا Koko قبل الجسر وبعده واسألوا ما الذي تغير في الوجه والكفين والمسافة من الصديق. يستطيع البالغ أن يقدم worried قبل العبور وrelieved بعده، مع قبول cautious أو tired أو proud. إذا فضل الطفل لونًا أو شكلًا أو وضعية لعبة فابدأوا من هذا الطريق، ثم صلوا كلمة الشعور بالملاحظة المشتركة. يمكن لدميتين اختيار مساعدتين مختلفتين؛ واحدة تريد صديقًا والأخرى تريد الجلوس. وظيفة الكلمة توضيح الاختيار لا دفع الجميع إلى استجابة واحدة.",
    "لا ينبغي أن تتحول بعض اللحظات إلى تدريب مفردات. عندما يكون الطفل منزعجًا بالفعل، عالجوا الحاجة المباشرة إلى الأمان أو المساحة أو الطعام أو الراحة أو العناق بدل إخراج بطاقة. عودوا إلى الشخصية الخيالية بعد الهدوء فقط إن أراد الطفل. إذا لم يرد الكلام عن نفسه يمكن للبالغ البقاء مع ما قد تحتاجه الشخصية. توسع القصة لغة الأسرة للمشاعر لكنها لا تكشف سبب شعور الطفل ولا تحكم في خلاف ولا تستبدل الاستماع الطويل. عند ضيق مستمر أو شديد أو متعلق بالسلامة يلزم النظر إلى الحياة الكاملة وطلب دعم مناسب، لا إضافة مزيد من التسميات."
  ]),
  "repetition-without-pressure": localized([
    "Plan a three-day variation that leaves the plot untouched. Day one is an ordinary replay. Day two adds one gesture at the bridge. Day three offers a choice between the original version and the gesture version. Do not announce a learning target or count responses. If the child chooses the unchanged story every time, that preference is usable information: familiarity may be the part making shared attention possible.",
    "Adults should also notice what repetition is doing to them. Irritation, rushing, or automatic correction can signal that the session needs a break even when the child still requests it. Offer the recording for quiet listening, invite another adult, or choose a non-story routine. If stopping produces distress that is intense, prolonged, or disruptive across settings, the issue is broader than a reading technique and deserves context-sensitive support."
  ], [
    "可以安排三天的小變化，但不要動到情節。第一天照原版重看；第二天只在過橋時加一個手勢；第三天讓孩子在原版與手勢版之間選擇。全程不用宣布學習目標，也不計算回應次數。孩子若每次都選完全沒改的版本，這仍是有用資訊：可能正是熟悉感讓共同注意變得可能，而不是他拒絕進步。若孩子主動先做手勢，成人可以跟隨一次，卻不必立刻把它升級成下一關。選擇的目的在保留控制感，不是包裝好的測驗。",
    "成人也要觀察重複對自己造成什麼影響。煩躁、催促或自動糾正，可能表示即使孩子仍想重看，這一輪也需要休息；可以只播放音訊讓孩子安靜聽、邀請另一位成人陪伴，或改成完全不同的日常活動。若今天不方便重播，就直接說明可提供的選項，不以假選擇拖延。當停止重複會在不同情境造成強烈、長時間或影響生活的困擾，問題已超過共讀技巧，需要結合完整背景尋找支持。一篇指南不能替家庭決定這是偏好、調節需要或其他情況。"
  ], [
    "خططوا لتنويع يمتد ثلاثة أيام من دون تغيير الأحداث. اليوم الأول إعادة عادية، والثاني يضيف حركة عند الجسر، والثالث يعرض النسخة الأصلية أو نسخة الحركة. لا تعلنوا هدفًا ولا تعدوا الاستجابات. إذا اختار الطفل القصة بلا تغيير كل مرة فهذه معلومة مفيدة: قد تكون الألفة هي التي تجعل الانتباه المشترك ممكنًا، وليست علامة على رفض التقدم. وإذا بدأ الطفل الحركة بنفسه يستطيع البالغ اتباعها مرة من دون تحويلها فورًا إلى مستوى جديد. الاختيار يحفظ السيطرة ولا يخفي اختبارًا.",
    "ينبغي للبالغ أن يلاحظ أثر التكرار عليه أيضًا. الضيق أو الاستعجال أو التصحيح الآلي قد يعني أن الجلسة تحتاج استراحة حتى إن طلب الطفل الإعادة. يمكن تشغيل الصوت بهدوء أو دعوة بالغ آخر أو اختيار روتين لا يتضمن قصة. إذا لم تكن الإعادة ممكنة قولوا الخيارات الحقيقية ولا تقدموا اختيارًا زائفًا. عندما يسبب التوقف ضيقًا شديدًا وطويلًا يؤثر في الحياة عبر مواقف مختلفة، يصبح الأمر أوسع من تقنية قراءة ويحتاج دعمًا يراعي السياق. لا يستطيع دليل واحد تحديد إن كان ذلك تفضيلًا أو حاجة تنظيمية أو شيئًا آخر."
  ]),
  "from-video-to-five-minute-printable": localized([
    "Prepare the paper before the story but keep it out of sight. This lets the adult make a clean transition without turning the viewing into a promise of a craft. Choose a single prompt tied to the scene: draw where Koko could wait, circle what Nour needs, or connect two characters. Read the prompt aloud once, then make the first mark yourself if modeling would lower uncertainty.",
    "A five-minute ceiling includes setup and cleanup. If the printer jams, the crayons are missing, or the child wants to keep narrating instead, abandon the sheet and protect the conversation. Families without a printer can fold scrap paper, use a reusable board, or arrange household objects. The useful evidence is whether the offline moment felt clear and voluntary, not whether an attractive page was completed or saved."
  ], [
    "紙張可以在故事前先準備好，但暫時不要放在孩子眼前，這樣成人能順利轉換，又不會把看故事變成「等一下必須做美勞」的承諾。提示只選一個，而且直接連到場景，例如畫出 Koko 可以等待的位置、圈出努爾需要的東西，或把兩個角色連起來。提示朗讀一次即可；若示範能降低不確定，成人先畫第一筆，但不要把示範變成孩子必須照抄的標準答案。想口述而不畫、用玩具擺出路徑，或只幫成人選顏色，都可以是完整參與。",
    "五分鐘上限要包含拿材料與收拾。印表機卡紙、找不到蠟筆，或孩子想繼續講角色，都可以直接放棄紙張、保留對話，不用為了完成設計好的流程而重開設備。沒有印表機的家庭可以折廢紙、用可擦寫板，或排列家中物件；視覺或動作需要不同的孩子，也可以用較大圖形、手指指向或口頭選擇。真正值得記住的是離線時刻是否清楚、自願而能平靜結束，不是漂亮頁面有沒有填滿、拍照或保存。若紙本持續引發挫折，就回到故事本身並尋找更合適的參與形式。"
  ], [
    "جهزوا الورقة قبل القصة لكن أبقوها خارج النظر. يتيح ذلك انتقالًا واضحًا من دون جعل المشاهدة وعدًا بعمل فني لاحق. اختاروا طلبًا واحدًا مرتبطًا بالمشهد: ارسموا مكان انتظار Koko أو ضعوا دائرة حول ما تحتاجه نور أو صلوا شخصيتين. اقرأوا الطلب مرة، ويمكن للبالغ وضع العلامة الأولى إذا خفف النموذج الغموض، لكن لا تجعلوها إجابة يجب نسخها. السرد بدل الرسم أو ترتيب اللعب أو اختيار اللون للبالغ مشاركة كاملة.",
    "يشمل سقف الدقائق الخمس تجهيز المواد وتنظيفها. إذا تعطلت الطابعة أو اختفت الأقلام أو أراد الطفل متابعة الحكاية، اتركوا الورقة واحموا المحادثة. تستطيع الأسرة بلا طابعة طي ورق مستعمل أو استعمال لوح يمسح أو ترتيب أشياء المنزل. يمكن تكبير الصور أو الإشارة أو الاختيار الشفهي عندما تختلف حاجات الحركة أو الرؤية. الدليل المفيد هو هل كانت اللحظة خارج الشاشة واضحة وطوعية وانتهت بهدوء، لا هل اكتملت صفحة جميلة أو صورت أو حفظت. إذا سببت الأوراق إحباطًا متكررًا عودوا إلى القصة وابحثوا عن شكل مشاركة أنسب."
  ]),
  "chinese-storytime-for-arabic-speaking-families": localized([
    "Build a small family phrase map after the story. Write the Chinese phrase, its pinyin, and the Arabic situation where it will be useful—not a word-for-word translation. One phrase might belong beside the front door, another during snack preparation. Ask which adult is comfortable using it and which recording everyone can revisit. This makes responsibility visible and prevents the child from becoming the household translator or pronunciation model.",
    "When a cultural reference is unfamiliar, explain the event in Arabic before comparing it with family experience. Avoid presenting either language as the modern, correct, or educational one. If the story conflicts with family values or creates confusion that a short explanation cannot resolve, choose another scene. Multilingual story time should add a route for connection while respecting the languages and knowledge already present at home."
  ], [
    "故事後可以做一張小型家庭短句地圖：寫下中文、拼音，以及它會在什麼阿語生活情境派上用場，而不是只寫逐字翻譯。例如一句放在玄關，一句放在準備點心時；再決定哪位成人願意使用、大家不確定時回到哪個錄音。責任因此留在成人身上，不會讓孩子變成全家的翻譯員或發音示範者。若家中只有一人願意說中文，也可以由其他人負責拿圖、演動作或用阿語接續故事，讓參與不等於必須發出同一種聲音。",
    "遇到陌生文化情節時，先用阿語說清楚事件，再和家庭經驗比較；不要把任何一種語言描述成比較現代、正確或有教育價值。可以問「我們家遇到這件事會怎麼做」，並接受故事角色與家庭做法不同。若場景和家庭價值衝突，或短短解釋仍無法解除困惑，就選另一段，不需要為了完成中文接觸而勉強。家庭也可把今天的詞留給成人，孩子只享受情節。多語故事時間應增加一條連結路徑，同時尊重家中本來就存在的語言、知識與關係；它不能被用來測量家庭是否足夠雙語。"
  ], [
    "اصنعوا بعد القصة خريطة صغيرة للعبارة: اكتبوا الصينية والبينيين والموقف العربي الذي تستعمل فيه، لا ترجمة كلمة بكلمة فقط. قد توضع عبارة قرب الباب وأخرى وقت إعداد الوجبة. حددوا أي بالغ مرتاح لاستعمالها وأي تسجيل يرجع إليه الجميع. هكذا تبقى المسؤولية على البالغ ولا يصبح الطفل مترجم البيت أو نموذج النطق. إذا كان شخص واحد فقط يريد قول الصينية، يستطيع الآخر حمل الصورة أو تمثيل الفعل أو متابعة الحكاية بالعربية؛ المشاركة لا تعني إنتاج الصوت نفسه.",
    "عندما يكون المرجع الثقافي غريبًا، اشرحوا الحدث بالعربية ثم قارنوه بخبرة الأسرة. لا تقدموا لغة على أنها الحديثة أو الصحيحة أو التعليمية. اسألوا كيف تتصرف أسرتنا واقبلوا اختلافها عن الشخصية. إذا تعارض المشهد مع قيم البيت أو بقي مربكًا بعد شرح قصير فاختاروا غيره، ولا تجبروا الأسرة لإكمال تعرض صيني. يمكن أن يحتفظ البالغ بالكلمة ويستمتع الطفل بالحبكة فقط. ينبغي للقصة المتعددة اللغات أن تضيف طريقًا للصلة مع احترام اللغة والمعرفة والعلاقات الموجودة، ولا تقيس إن كانت الأسرة ثنائية اللغة بما يكفي."
  ]),
  "pinyin-and-tones-for-parents": localized([
    "Make a listening card for the adult, not a test card for the child. Put one character, pinyin syllable, tone mark, audio link, and a drawing of the meaning on it. Before story time, the adult listens twice and decides which feature to notice. During the story the card can stay face down; turn it over only if someone wants to compare the recording with the printed mark.",
    "Tone practice should return quickly to a whole message. After contrasting two pitch paths, use the intended word in a request, greeting, or toy scene so context helps disambiguate it. If everyone is laughing at a mix-up, keep the humor kind and do not imitate an accent as a joke. Stop when throats tighten, voices get louder, or meaning disappears. Accuracy can be pursued later in adult study without making the family story an examination."
  ], [
    "可以做一張給成人聆聽用的卡，不是給孩子考試的卡。卡上只放一個漢字、一個拼音音節、聲調符號、可靠音檔入口和代表意思的小圖。故事前成人聽兩次，先決定今天只注意音高方向、開頭音或節奏其中一項；故事中卡片保持蓋住，只有有人真的想比較錄音與符號時才翻開。若印刷字太小或拼音讓大人更緊張，完全可以只保留圖與音檔，因為工具應降低負擔，不是增加一層必須精通的術語。",
    "比較完兩條音高路徑，要盡快回到完整訊息。把目標詞放進請求、招呼或玩具情境，讓上下文一起協助理解，不要連續念十次脫離意思的音節。因聲調混淆而發笑時，幽默要對著情境，不模仿某人的口音取笑；喉嚨緊、聲音越來越大，或所有人只剩判斷對錯時就停止。成人可以另找時間做系統學習，不必把家庭故事變成考場。孩子沒有當場模仿，也不能推論他沒聽見；相反地，一次漂亮模仿也不能證明已經精熟。這些界線能讓拼音保持參考工具的位置。"
  ], [
    "اصنعوا بطاقة استماع للبالغ لا بطاقة اختبار للطفل. ضعوا حرفًا صينيًا واحدًا ومقطع بينيين وعلامة نغمة ورابط صوت ورسم المعنى. قبل القصة يستمع البالغ مرتين ويقرر هل يلاحظ اتجاه النغمة أو البداية أو الإيقاع. أثناء القصة تبقى البطاقة مقلوبة، وتفتح فقط إذا أراد أحد مقارنة التسجيل بالعلامة. إذا كان الخط صغيرًا أو زاد البينيين توتر البالغ، احتفظوا بالصورة والصوت فقط؛ الأداة لتقليل العبء وليست مصطلحات إضافية يجب إتقانها.",
    "بعد مقارنة مسارين عودوا سريعًا إلى رسالة كاملة. ضعوا الكلمة في طلب أو تحية أو مشهد لعبة كي يساعد السياق على التمييز، ولا تكرروا مقطعًا منفصلًا عشر مرات. إذا ضحك الجميع من التباس فليكن الضحك لطيفًا مع الموقف، لا تقليدًا ساخرًا للكنة. توقفوا عندما يضيق الحلق أو يرتفع الصوت أو يختفي المعنى. يمكن للبالغ متابعة الدقة في دراسة منفصلة من دون تحويل القصة إلى امتحان. عدم تقليد الطفل فورًا لا يعني أنه لم يسمع، وتقليد جميل مرة لا يثبت الإتقان. تبقي هذه الحدود البينيين في مكانه كمرجع."
  ]),
  "three-chinese-words-a-day": localized([
    "Create a use test before keeping a word. Can someone point to it, perform it, or need it during the chosen routine? If not, move it to a future story list. For a snack moment, cup, pour, and more may form a workable set; panda, moon, and beautiful do not become useful merely because the cards are attractive. The adult chooses for relevance, not difficulty or novelty.",
    "At the end of the week, retire words instead of administering a review. Keep one that appears spontaneously in family life, replace one that caused confusion, and release one that no longer fits the routine. A word may return months later without being lost. If a child uses Arabic, a gesture, or the object itself, respond to the meaning first. The routine is successful when communication remains possible, not when Chinese is the only accepted response."
  ], [
    "留下某個詞前，先做用途檢查：在選定流程裡，有人能指到它、做出它，或真的需要用它嗎？不能就先放進未來故事清單。準備點心時，「杯、倒、還要」可能形成可用組合；「熊貓、月亮、漂亮」不會因字卡好看就自動適合當下。成人依真實用途選詞，不依難度、稀有度或是否能拍出整齊照片。若三個詞中只有一個在今天自然出現，就只用那一個，不另造問題把其他兩個硬塞進去。",
    "一週結束時，把詞退休，不舉行複習考試。可以保留一個已自然出現在家庭生活的詞、替換一個造成混淆的詞，也讓一個不再符合流程的詞離開；幾個月後重新出現不代表之前白學。孩子用阿語、動作或直接拿物件回應時，先回應意思，再視情況補一次中文，不把中文設成唯一可接受答案。若家人開始競逐誰記得比較多、孩子避開原本喜歡的日常，或短句妨礙安全指示，就立刻回到最清楚的家庭語言。流程成功的標準是溝通仍然可能，不是中文占滿每一次回應。"
  ], [
    "اختبروا فائدة الكلمة قبل الاحتفاظ بها: هل يستطيع شخص الإشارة إليها أو فعلها أو يحتاجها في الروتين المختار؟ إن لم يكن فانقلوها إلى قصة مستقبلية. وقت الوجبة قد تشكل كوب وصب ومزيد مجموعة صالحة؛ أما باندا وقمر وجميل فلا تصبح نافعة لأن البطاقات جذابة. يختار البالغ حسب الاستعمال لا الصعوبة أو الجدة. إذا ظهرت كلمة واحدة طبيعيًا اليوم فاستخدموها وحدها، ولا تصنعوا سؤالًا لإجبار الكلمتين الأخريين.",
    "في نهاية الأسبوع اعتزلوا الكلمات بدل إجراء مراجعة. احتفظوا بواحدة ظهرت تلقائيًا، وبدلوا واحدة أربكت، واتركوا واحدة لم تعد تناسب الروتين. قد تعود بعد أشهر من دون أن تكون ضاعت. إذا استعمل الطفل العربية أو حركة أو الشيء نفسه فاستجيبوا للمعنى أولًا، ثم أضيفوا الصينية إن ناسب. إذا بدأ أفراد الأسرة منافسة في التذكر، أو تجنب الطفل روتينًا كان يحبه، أو أعاقت العبارة تعليمات السلامة، فعودوا إلى أوضح لغة في البيت. ينجح الروتين عندما يبقى التواصل ممكنًا، لا عندما تكون الصينية الرد الوحيد المقبول."
  ]),
  "three-minute-chinese-routine": localized([
    "Design three versions before the week begins: a three-minute version, a one-minute version, and a ten-second version. All use the same greeting and goodbye, while the middle shrinks from a toy action to one gesture to nothing. The adult can choose after seeing the family's energy rather than cancelling in frustration. A shorter version is not a penalty or a sign that the child failed to concentrate.",
    "Check the routine's location as well as its language. A doorway may be too rushed, a table may invite extra materials, and bedtime may make a lively action unhelpful. Move it when the context fights the goal. If Chinese exposure is becoming a recurring family conflict, pause the routine and discuss adult expectations outside the child's hearing. A tiny schedule cannot solve disagreement about education, caregiving roles, or language priorities."
  ], [
    "一週開始前先設計三種版本：三分鐘版、一分鐘版和十秒版。三種都用同一句招呼與再見，中間則從玩具動作縮成一個手勢，最後可以完全沒有活動。成人看見全家當天精神後再選，不必先承諾完整版、做不到時才挫折取消。縮短不是懲罰，也不表示孩子專注失敗；它只是讓流程適應現實。如果孩子主動延伸，成人仍可在說好的結尾停下，把「下次再玩」當成可靠界線，而不是因興奮不斷加碼。",
    "除了語言，也要檢查流程放在哪裡。玄關可能太匆忙，桌面容易引出過多材料，睡前則不適合讓身體過度興奮；情境和目標互相衝突時就換位置。可以把招呼移到洗手後、車程前或玩具收好時，選一個成人本來就能停下來的節點。若中文接觸反覆成為家庭爭執，先暫停流程，在孩子聽不到的地方討論成人期待與分工。一張三分鐘時間表不能解決教育觀、照顧責任或家庭語言優先順序的分歧，也不應讓孩子承擔調和大人的工作。"
  ], [
    "صمموا قبل الأسبوع ثلاث نسخ: ثلاث دقائق ودقيقة وعشر ثوان. تستعمل كلها التحية والوداع نفسيهما، بينما يصغر الوسط من فعل لعبة إلى حركة ثم لا شيء. يختار البالغ بعد رؤية طاقة الأسرة بدل وعد نسخة كاملة ثم إلغائها بغضب. النسخة الأقصر ليست عقوبة ولا دليلًا على فشل التركيز. وإذا أراد الطفل الاستمرار يستطيع البالغ إنهاء ما اتفق عليه وقول نعود لاحقًا، بدل زيادة النشاط بلا حد.",
    "راجعوا مكان الروتين إلى جانب لغته. قد يكون الباب مستعجلًا، والطاولة تجلب مواد زائدة، ووقت النوم لا يناسب حركة نشطة. انقلوه عندما يقاوم السياق الهدف، مثل بعد غسل اليدين أو قبل ركوب السيارة أو بعد ترتيب اللعب، إلى لحظة يستطيع البالغ التوقف فيها. إذا صار التعرض للصينية خلافًا عائليًا متكررًا فأوقفوا الروتين وناقشوا توقعات البالغين بعيدًا عن سمع الطفل. لا يحل جدول صغير خلافًا عن التعليم أو أدوار الرعاية أو أولوية اللغات، ولا ينبغي للطفل أن يصلح خلاف الكبار."
  ]),
};

export const EDITORIAL_LOCALE_EXTENSIONS = {
  "english-storytime-without-fluent-english": localized("", "若想知道方法是否適合，不要用孩子記住幾個詞來判斷。家長可以在結束後問自己三件事：我有沒有因為不確定而中斷畫面太久？中文問題是否讓孩子願意多看一眼或多說一件事？下次能否少準備一項？答案只用來調整成人工作。若錄音速度太快，可以先截取一句的時間點，不下載來路不明的發音檔；若字幕與聽到的內容不同，保留網址並從內容修正入口回報。家庭也可輪流由不同成人帶領，但不比較誰的英文比較像母語者。穩定、誠實且願意查證，比假裝全都會更能保護共同閱讀。", "لقياس ملاءمة الطريقة لا تعدوا الكلمات التي حفظها الطفل. بعد النهاية يسأل البالغ نفسه: هل أوقفت الصورة طويلًا بسبب شكي؟ هل سمح السؤال العربي بملاحظة أو فكرة إضافية؟ هل أستطيع حذف خطوة في المرة المقبلة؟ تستعمل الإجابات لتعديل عمل البالغ فقط. إذا كان التسجيل سريعًا سجلوا موضع العبارة بدل تنزيل صوت مجهول، وإذا خالفت الترجمة ما تسمعونه احفظوا الرابط وأبلغوا مسار التصحيح. يمكن أن يتناوب البالغون من دون مقارنة من يبدو أقرب إلى متحدث أصلي. الثبات والصدق والاستعداد للتحقق يحميان القراءة أكثر من ادعاء معرفة كل شيء."),
  "feelings-words-through-stories": localized("", "同一個角色在不同頁面也可能有不同情緒，這是很好的限制示範。家長可以說「剛才我以為她擔心，現在看到她往朋友靠近，我想改成期待」，讓孩子看見成人會依新線索修正，而不是守住第一個答案。若家庭使用的情緒詞和書上分類不同，先記錄家庭原本說法，再找最接近的英文詞，不要求一對一完全相等。畫一條從角色到可能幫助的線、替玩偶安排一個安靜角落，或只描述身體線索，都比要求孩子公開談自己的脆弱更安全。內容若觸及家庭重大事件，可以跳頁並由成人決定是否另找適當時間談。", "قد يتغير شعور الشخصية بين صفحتين، وهذا يوضح حدود التفسير. يستطيع البالغ القول: ظننت أنها قلقة، لكن قربها من صديقها يجعلني أفكر في الترقب. يرى الطفل أن البالغ يعدل رأيه مع الدليل ولا يحمي الإجابة الأولى. إذا اختلفت كلمات الأسرة عن تصنيف الكتاب، احتفظوا بالتعبير العربي ثم ابحثوا عن أقرب كلمة إنجليزية من دون افتراض تطابق كامل. وصل الشخصية بمساعدة ممكنة أو إعداد زاوية هادئة للدمية أو وصف علامة جسدية أكثر أمانًا من مطالبة الطفل بكشف تجربة حساسة. إذا لمس المشهد حدثًا عائليًا كبيرًا يمكن تجاوز الصفحة، ويقرر البالغ إن كان الحديث يحتاج وقتًا آخر ودعمًا أنسب."),
  "repetition-without-pressure": localized("", "可以把重複選擇做成簡單的成人紀錄：日期、孩子選的版本、結束是否平靜，三欄就夠了，不記對錯或詞數。連續幾次都需要成人延長、談判或突然關閉時，先調整環境，例如在播放前說清楚可看幾次、關閉自動播放、準備下一個可預期活動。這些做法不是控制孩子，而是避免平台機制替家庭決定節奏。若大人承諾一次重播，就做到一次再結束；不能提供時便不要承諾。可信的界線比臨時增加獎勵更容易讓熟悉故事保持安全。", "يمكن تسجيل التكرار للبالغ بثلاث خانات فقط: التاريخ والنسخة المختارة وهل انتهت بهدوء، من دون صواب أو عدد كلمات. إذا احتاجت الجلسات المتتالية إلى تمديد أو تفاوض أو إغلاق مفاجئ فعدلوا البيئة: اذكروا عدد مرات المشاهدة قبل البدء، وأوقفوا التشغيل التلقائي، وجهزوا نشاطًا متوقعًا بعده. لا تهدف هذه الخطوات إلى السيطرة على الطفل بل إلى منع المنصة من تحديد إيقاع الأسرة. إذا وعد البالغ بإعادة واحدة فعليه تنفيذها ثم الإنهاء، وإذا لم يستطع فلا يعد بها. الحدود الموثوقة تحافظ على أمان القصة المألوفة أكثر من مكافآت تضاف في اللحظة الأخيرة."),
  "from-video-to-five-minute-printable": localized("", "列印前先看頁面是否真的需要顏色、剪裁或雙面輸出。黑白印表機可用符號、線條或口頭選擇代替顏色；A4 紙可選符合頁面縮放，避免內容被裁切。剪刀與膠水若不符合孩子目前的安全需要，就由成人預先處理或完全略過。完成後可以問「哪個部分讓故事更容易想起來」，而不是「你學到什麼」；孩子不回答也沒關係。樣本若顯示錯誤、字太小或說明不清，可把頁碼、裝置與列印設定寄到技術入口，但不要附上孩子照片或作品中的姓名。", "قبل الطباعة افحصوا هل تحتاج الصفحة فعلًا إلى لون أو قص أو طباعة على الوجهين. تستطيع الطابعة السوداء استعمال رموز أو خطوط أو اختيار شفهي بدل اللون، ويمكن لورق A4 استعمال إعداد الملاءمة حتى لا تقص الحواف. إذا لم تناسب المقصات أو الغراء حاجات السلامة الحالية، يجهز البالغ الجزء مسبقًا أو يتجاوزه. بعد النشاط اسألوا أي جزء ساعد على تذكر القصة بدل ماذا تعلمت، وعدم الإجابة مقبول. إذا ظهر خطأ أو خط صغير أو تعليمات غامضة أرسلوا رقم الصفحة والجهاز وإعداد الطباعة إلى الدعم، من دون صورة الطفل أو اسم مكتوب على العمل."),
  "chinese-storytime-for-arabic-speaking-families": localized("", "若同一頁同時有漢字、拼音、英文與阿文，不需要每層都讀。家長可以先遮住不使用的部分，只保留畫面與一條中文線索，避免視覺資訊彼此競爭。阿語摘要應說出角色目的與因果，不只是把中文詞換成阿語詞；這樣孩子即使沒有跟讀，也能參與預測和選擇。家庭若有不同阿語方言，可以用最自然的家庭說法，不必為了配合書面阿語改變親密對話。之後若想比較書面詞與家庭詞，把它當成人補充，不要求孩子在故事中切換多個版本。", "إذا اجتمعت الحروف الصينية والبينيين والإنجليزية والعربية في صفحة فلا يجب قراءة كل طبقة. غطوا ما لا تستعملونه واتركوا الصورة وإشارة صينية واحدة حتى لا تتنافس المعلومات البصرية. ينبغي للملخص العربي أن يذكر هدف الشخصية والسبب والنتيجة، لا أن يستبدل كل كلمة صينية بكلمة عربية؛ هكذا يشارك الطفل في التوقع والاختيار حتى من دون ترديد. إذا استعملت الأسرة لهجة عربية مختلفة فلتستخدم كلامها الطبيعي، ولا تغير الحديث الحميم ليتطابق مع العربية الرسمية. يمكن للبالغ مقارنة التعبيرين لاحقًا كمعلومة إضافية، من دون مطالبة الطفل بالتبديل بين نسخ كثيرة أثناء القصة."),
  "pinyin-and-tones-for-parents": localized("", "家長可以把四個聲調畫在同一張成人參考紙上，但每次故事只圈今天用到的一個，不逐項講解名稱。聽辨若很困難，先比較差異大的組合，再回到原句；不要把音量、速度和聲調同時改變，否則無法知道哪個線索有幫助。拼音也不是漢字的替代品：在家庭只想聽與說的階段，可以暫時不要求認字；想學字時再另設清楚目的。若來源沒有真人或可信錄音，只靠機器聲音時應標示限制，並避免用它評判家庭成員。", "يمكن رسم النغمات الأربع في ورقة مرجع للبالغ، لكن في كل قصة ضعوا دائرة حول المستعمل فقط ولا تشرحوا الأسماء كلها. إذا صعب التمييز ابدأوا بزوج مختلف بوضوح ثم عودوا إلى الجملة. لا تغيروا النغمة والسرعة وعلو الصوت معًا، وإلا لن تعرفوا أي دليل ساعد. البينيين ليس بديلًا عن الحرف الصيني؛ في مرحلة تركز على السماع والكلام يمكن ترك التعرف على الحروف، ثم وضع هدف منفصل له لاحقًا. إذا لم يوفر المصدر تسجيلًا بشريًا أو موثوقًا وكان الصوت آليًا فقط فاذكروا هذا الحد، ولا تستخدموه للحكم على أفراد الأسرة."),
  "three-chinese-words-a-day": localized("", "詞組可以跟著照顧者輪班而改變。早上負責出門的人選玄關詞，晚上負責洗澡的人選浴室詞，不要求所有成人維持同一套；只要每個人知道自己會在哪個動作使用即可。可把中文寫在成人看得到、孩子不必操作的位置，避免家中貼滿標籤後失去注意價值。涉及燙、停、危險等安全訊息時，先用孩子最能立即理解的語言，再補中文，不做等待反應的練習。語言接觸永遠不能延遲照顧與安全行動。", "يمكن أن تتغير المجموعة مع مناوبة مقدم الرعاية. يختار مسؤول الخروج كلمات الباب، ويختار مسؤول الحمام كلمات المساء، ولا يجب على كل بالغ حفظ القائمة نفسها؛ يكفي أن يعرف كل شخص أين يستعمل كلمته. ضعوا الصينية في مكان يراه البالغ ولا يحتاج الطفل إلى تشغيله، حتى لا يمتلئ البيت بملصقات تفقد قيمتها. في رسائل السلامة مثل ساخن أو توقف أو خطر استعملوا أولًا اللغة التي يفهمها الطفل فورًا، ثم أضيفوا الصينية إن أمكن، ولا تنتظروا استجابة تدريبية. التعرض اللغوي لا يؤخر الرعاية أو فعل السلامة أبدًا."),
  "three-minute-chinese-routine": localized("", "若要觀察流程是否可持續，可以連續一週只記成人是否記得開始、是否能在承諾時間內結束，以及哪個提示最自然；不要記孩子表現。若總是忘記，表示提示位置不對，不代表家庭缺乏意志力。把流程移到另一個既有事件，或降成十秒招呼。旅行、生病、訪客或作息改變期間可整段暫停，不需要回補。重新開始時從最短版本進入，讓熟悉感慢慢回來。能在生活改變時安全消失的流程，才是真正由家庭控制的流程。", "لاختبار الاستمرار سجلوا أسبوعًا ما إذا تذكر البالغ البداية، وهل انتهى في الوقت الموعود، وأي إشارة كانت طبيعية، من دون تسجيل أداء الطفل. إذا نسي الجميع كثيرًا فمكان الإشارة غير مناسب، وليس ذلك نقص إرادة. انقلوا الروتين إلى حدث قائم آخر أو صغروه إلى تحية من عشر ثوان. أثناء السفر أو المرض أو الضيوف أو تغير الجدول يمكن إيقافه كاملًا بلا تعويض. عند العودة ابدأوا بأقصر نسخة ودعوا الألفة ترجع تدريجيًا. الروتين الذي يستطيع الاختفاء بأمان عند تغير الحياة هو الروتين الذي تملكه الأسرة فعلًا."),
};

export const EDITORIAL_FINAL_NOTES = {
  "english-storytime-without-fluent-english": localized("", "可行的下一步是成人先自己試讀一次，標記真正卡住的位置，再把故事縮到一頁。若一頁仍太多，只看圖、聽一句並用中文聊角色，也已完成今天的共讀。", "قبل اللقاء التالي يجرب البالغ الصفحة وحده ويحدد موضع التعثر الحقيقي، ثم يصغر القصة إلى صفحة واحدة. إذا بقيت الصفحة كثيرة، تكفي صورة وعبارة واحدة وحديث عربي عن الشخصية. لا حاجة إلى إخفاء هذه الخطة عن الطفل أو تسميتها درسًا. يستطيع الطفل اختيار الصورة، ويستطيع البالغ إنهاء القراءة عند أول علامة تعب. النجاح هنا هو بقاء الباب مفتوحًا للقاء آخر، لا إتمام النص."),
  "feelings-words-through-stories": localized("", "最後可以讓角色自己選擇：靠近朋友、先休息或請求幫忙。每個選項都說明一種需要，沒有最勇敢的標準答案；家庭只要一起看見線索並尊重選擇即可。", "يمكن إنهاء المشهد بثلاثة خيارات للشخصية: الاقتراب من الصديق أو الراحة أو طلب المساعدة. يوضح كل خيار حاجة مختلفة ولا توجد إجابة هي الأشجع دائمًا. تستطيع الأسرة رسم نهاية أو تمثيلها أو ترك القصة مفتوحة. إذا غير الطفل رأيه فهذا جزء من التفكير لا خطأ. ركزوا على العلامة التي دعمت الاختيار وعلى نوع المساعدة الممكنة، ثم أغلقوا النشاط من دون سؤال أخير عن مشاعر الطفل نفسه."),
  "repetition-without-pressure": localized("", "重看前把結束方式說清楚，例如片尾出現就揮手收起。可預測的結尾若仍不適合，就停止使用該版本；家庭不需要用更多次重複證明方法終究會成功。", "قبل الإعادة اذكروا النهاية بوضوح، مثل التلويح عند ظهور الصورة الأخيرة ثم إغلاق المشغل. إذا لم تناسب النهاية المتوقعة الأسرة بعد محاولات هادئة، اتركوا هذه النسخة بدل زيادة مرات المشاهدة لإثبات أنها ستنجح. يمكن الاحتفاظ بالقصة في كتاب أو تسجيل صوتي أو لعبة. تغيير الوسيط لا يخون اهتمام الطفل، وقد يفصل الحبكة المحبوبة عن آلية تشغيل تجعل الانتقال صعبًا."),
  "from-video-to-five-minute-printable": localized("", "需要保存作品時先問孩子，並只寫家庭真正需要的日期或故事名；不必公開分享。紙本完成後立即收工具、回到原本生活，能讓五分鐘界線比口頭提醒更可信。", "إذا أرادت الأسرة حفظ العمل فاسألوا الطفل، واكتبوا التاريخ أو اسم القصة فقط عند الحاجة، ولا يلزم نشره. بعد النهاية أعيدوا الأدوات فورًا وعودوا إلى الحياة العادية حتى يصبح حد الدقائق مرئيًا لا مجرد كلام. إذا طلب الطفل ورقة جديدة يستطيع البالغ عرضها في يوم آخر، أو تحويل الطلب إلى رسم حر لا يحمل تعليمات. الفرق الواضح بين نشاط موجّه ورسم مفتوح يحمي اختيار الطفل ويمنع تكدس مهام جديدة."),
  "chinese-storytime-for-arabic-speaking-families": localized("", "若親友對語言選擇有意見，成人先在故事外協調，不讓孩子當場辯護阿語或中文。共讀中只需要清楚知道誰負責講情節、誰播放中文，以及孩子可用任何方式參與。", "إذا اختلف الأقارب على اختيار اللغة فليتفق البالغون خارج وقت القصة، ولا يطلبوا من الطفل الدفاع عن العربية أو الصينية. أثناء القراءة يكفي أن يعرف الجميع من يحكي الحدث ومن يشغل العبارة وأن الطفل يستطيع المشاركة بأي لغة أو حركة. إذا تحول التعليق إلى مقارنة بين الأطفال أو الأسر، أوقفوا النقاش وعودوا إلى الشخصية. حماية العلاقة العائلية أهم من استغلال كل دقيقة للتعرض اللغوي."),
  "pinyin-and-tones-for-parents": localized("", "拼音卡使用後就收起，讓故事結尾回到角色與意思。若家長想保留錄音，可只錄自己的練習並妥善儲存，不需要錄孩子來比較前後差異。", "بعد استعمال بطاقة البينيين أعيدوها جانبًا حتى تنتهي القصة مع الشخصية والمعنى. إذا أراد البالغ تسجيل التدريب فليسجل صوته هو ويحفظه بأمان، ولا يحتاج إلى تسجيل الطفل للمقارنة بين الأيام. راجعوا تسجيل البالغ لاحقًا مع المصدر، واختروا ملاحظة واحدة فقط. إذا لم يعرف البالغ سبب الفرق فليضع سؤالًا لمدرس مؤهل بدل اختراع قاعدة ونقلها إلى الطفل. اكتبوا تاريخ المراجعة واسم التسجيل الموثوق حتى لا تختلط النسخ في الزيارة التالية."),
  "three-chinese-words-a-day": localized("", "真正使用過的詞不必天天出現。當家庭情境沒有它，就讓它休息；刻意製造需求會讓照顧流程服務清單，而不是讓詞語服務家庭。", "لا يجب أن تظهر الكلمة النافعة كل يوم. عندما لا يحتاجها الموقف اتركوها ترتاح؛ اختراع حاجة يجعل الرعاية تخدم القائمة بدل أن تخدم الكلمة الأسرة. يستطيع البالغ تدوين أين ظهرت طبيعيًا ثم اختيار المجموعة التالية من واقع الأسبوع. إذا لم تظهر أي كلمة فهذا دليل لتغيير المجموعة أو ترك المشروع فترة، وليس سببًا لزيادة الاختبار أو إلزام الطفل بتسمية بطاقات."),
  "three-minute-chinese-routine": localized("", "流程結束後不接續獎勵或測驗，能讓三分鐘保持本來大小。孩子想繼續玩時，可把玩具留給自由遊戲，但不必繼續提示中文或記錄表現。", "لا تتبعوا الدقائق الثلاث بمكافأة أو اختبار، حتى يبقى الروتين بحجمه الحقيقي. إذا أراد الطفل متابعة اللعب يمكن ترك اللعبة للعب الحر من دون استمرار التلقين أو تسجيل الأداء. وإذا أراد التوقف قبل الوداع فاحترموا ذلك وأنهوا بهدوء. وجود بداية ونهاية متوقعتين لخدمة الأسرة، وليس لإلزام الطفل بالبقاء حتى آخر ثانية. يمكن تعليق بطاقة صغيرة للبالغ تذكره بالخيارين، ثم إزالتها إذا صارت جزءًا مزعجًا من المكان. راجعوا الروتين كل أسبوعين واسألوا هل ما زال يخدم لحظة هادئة فعلًا."),
};
