export const EDITORIAL_UPDATED = "2026-08-02";

export const GUIDE_SLUGS = [
  "english-storytime-without-fluent-english",
  "feelings-words-through-stories",
  "repetition-without-pressure",
  "from-video-to-five-minute-printable",
  "chinese-storytime-for-arabic-speaking-families",
  "pinyin-and-tones-for-parents",
  "three-chinese-words-a-day",
  "three-minute-chinese-routine",
];

const SOURCES = {
  sharedReading: [
    ["American Academy of Pediatrics: Literacy Promotion", "https://www.aap.org/en/patient-care/early-childhood/early-childhood-health-and-development/literacy-promotion/"],
    ["Harvard Center on the Developing Child: Serve and Return", "https://developingchild.harvard.edu/science/key-concepts/serve-and-return/"],
  ],
  language: [
    ["UNESCO: Multilingual education", "https://www.unesco.org/en/languages-education/need-know"],
    ["ASHA: Learning More Than One Language", "https://www.asha.org/public/speech/development/learning-more-than-one-language/"],
  ],
};

function localized(en, zh, ar) { return { en, zh, ar }; }

export const GUIDES = [
  {
    slug: GUIDE_SLUGS[0], world: "koko", sources: SOURCES.sharedReading,
    title: localized("English story time when the parent is not fluent", "爸媽英文不流利，也能陪孩子讀英文故事", "وقت قصة إنجليزية حتى لو لم يكن الوالد طليقًا"),
    description: localized("A calm, practical read-aloud routine for parents who want to share English stories without pretending to be fluent.", "給想陪孩子接觸英文、卻擔心自己不夠流利的父母：一套誠實、輕鬆、可重複的共讀方法。", "روتين عملي وهادئ للوالدين الذين يريدون مشاركة قصة إنجليزية من دون ادعاء الطلاقة."),
    details: localized({
      scene: "A parent opens a Koko story after dinner, recognizes only part of the English, and worries that one imperfect sound will teach the child something wrong. The child is actually watching the picture, the parent's face, and the rhythm of taking turns more than judging an accent.",
      goal: "The goal is shared attention, not a performance. Choose one sentence you understand, listen once if audio is available, and say it slowly. It is acceptable to tell a child, ‘I am learning this with you.’ That sentence protects trust and turns uncertainty into curiosity.",
      routine: "Preview the page alone for one minute. Mark one phrase, one picture detail, and one question in the home language. During story time, read the phrase, point to the picture, pause, and invite any response: a word, gesture, sound, or look.",
      example: "If Koko says ‘I can try again,’ the parent can point to Koko, repeat only ‘try again,’ and ask in Mandarin or Arabic, ‘What is Koko trying?’ The conversation remains meaningful even when most of it happens in the family's strongest language.",
      observe: "Notice whether the child stays near, points, anticipates a repeated phrase, or brings the story back later. Those behaviors show engagement with the routine. Do not turn them into a fluency score or compare them with another child.",
      limit: "Do not correct every sound, force repetition, or keep reading after either person becomes tense. This guide is not pronunciation therapy and cannot diagnose a language delay. Families with concerns about hearing or communication should ask a qualified local professional.",
      bridge: "Use the Koko feelings story or printable as a prompt, then close the screen. Draw one face, act out one verb, or place the chosen phrase on the refrigerator. A tiny offline echo helps the story belong to family life rather than to a device.",
      revision: "This guide was revised to separate useful parent participation from accent perfection and to add a clear stop rule for stressful practice."
    }, {
      scene: "晚餐後，家長打開 Koko 的故事，只看得懂部分英文，擔心一個不標準的音就會教錯孩子。其實孩子更在意圖畫、家長的表情與輪流互動的節奏，而不是替大人評分口音。",
      goal: "目標是一起注意同一件事，不是表演流利。先選一句自己理解的話，有音檔就聽一次，再慢慢說。直接告訴孩子「我也和你一起學」並不丟臉，反而能把不確定變成好奇與信任。",
      routine: "共讀前花一分鐘看過頁面，標出一句話、一個圖像細節與一個能用家庭主要語言回答的問題。共讀時只讀那句、指圖、停一下，接受孩子用詞語、動作、聲音或眼神回應。",
      example: "如果 Koko 說 I can try again，家長可以指著角色，只重複 try again，再用中文問「Koko 正在試什麼？」即使大部分對話使用家庭最熟悉的語言，這次共讀仍然有完整意義。",
      observe: "觀察孩子是否願意待在旁邊、主動指圖、預測重複句或之後又拿起故事。這些行為代表孩子投入這個家庭儀式，不是流利度分數，也不應拿來和其他孩子比較。",
      limit: "不要糾正每一個音、強迫跟讀，也不要在任何一方緊張後繼續。這不是發音治療，不能診斷語言發展；若擔心聽力或溝通，應諮詢所在地合格專業人員。",
      bridge: "先用 Koko 情緒故事或學習單當提示，接著關掉螢幕。畫一張表情、演一個動詞，或把選中的短句貼在冰箱上，讓故事在真實家庭生活裡留下小小回聲。",
      revision: "本次修訂把有幫助的陪伴和追求完美口音明確分開，並新增練習造成壓力時的停止原則。"
    }, {
      scene: "يفتح أحد الوالدين قصة Koko بعد العشاء ويفهم جزءًا من الإنجليزية فقط، ثم يخشى أن ينقل نطقًا غير مثالي. الطفل يراقب الصورة ووجه الوالد وإيقاع تبادل الأدوار أكثر مما يحكم على اللكنة.",
      goal: "الهدف هو الانتباه المشترك لا تقديم عرض. اختاروا جملة مفهومة، واستمعوا إليها مرة إن توفر الصوت، ثم قولوها ببطء. يمكن قول: أنا أتعلم معك. هذه الصراحة تحمي الثقة وتحول التردد إلى فضول.",
      routine: "راجعوا الصفحة دقيقة واحدة قبل القراءة. حددوا عبارة وصورة وسؤالًا يمكن طرحه باللغة الأقوى في البيت. أثناء القصة اقرأوا العبارة وأشيروا إلى الصورة وانتظروا أي استجابة، سواء كانت كلمة أو حركة أو نظرة.",
      example: "عندما تقول Koko: I can try again، يكفي تكرار try again ثم السؤال بالعربية: ماذا تحاول Koko؟ يبقى الحوار ذا معنى حتى لو جرى معظمه باللغة التي تتقنها العائلة.",
      observe: "لاحظوا هل يبقى الطفل قريبًا، أو يشير، أو يتوقع العبارة، أو يعود إلى القصة لاحقًا. هذه علامات مشاركة في الروتين وليست درجة للطلاقة، ولا ينبغي مقارنتها بطفل آخر.",
      limit: "لا تصححوا كل صوت ولا تفرضوا التكرار ولا تواصلوا بعد ظهور التوتر. هذا الدليل ليس علاجًا للنطق ولا يشخص تأخر اللغة. عند القلق بشأن السمع أو التواصل استشيروا مختصًا محليًا مؤهلًا.",
      bridge: "استخدموا قصة مشاعر Koko أو الورقة القابلة للطباعة ثم أغلقوا الشاشة. ارسموا وجهًا أو مثلوا فعلًا أو ضعوا العبارة على الثلاجة كي تصبح القصة جزءًا من الحياة العائلية.",
      revision: "نقحنا الدليل للفصل بين مشاركة الوالد المفيدة وبين طلب النطق المثالي، وأضفنا قاعدة توقف واضحة عند التوتر."
    })
  },
  {
    slug: GUIDE_SLUGS[1], world: "koko", sources: SOURCES.language,
    title: localized("Learning feelings words through stories", "用故事陪孩子認識英文情緒詞", "تعلم كلمات المشاعر من خلال القصص"),
    description: localized("Turn one story moment into a gentle conversation about feelings without testing or labeling the child.", "把一個故事情境變成溫柔的情緒對話，不考試，也不急著替孩子貼標籤。", "حوّلوا لحظة قصصية إلى حوار لطيف عن المشاعر من دون اختبار الطفل أو وضع ملصق عليه."),
    details: localized({
      scene: "Koko looks worried before crossing a bridge. Instead of asking a child to memorize happy, sad, worried, and brave all at once, the parent pauses at the face and names only what the picture makes visible.",
      goal: "A feelings word is most useful when it connects a body clue, a situation, and a possible action. ‘Worried’ can sit beside tight shoulders, a new bridge, and asking for help. The word opens conversation; it does not define who the child is.",
      routine: "Choose one contrast such as calm and worried. Point to two pictures, say each English word once, and let the child match a face, color, or gesture. End with a home-language question about what might help the character next.",
      example: "A child may point to the worried face but say nothing. The parent can answer for the character: ‘Koko is worried. Koko can hold a friend's hand.’ Silence still counts as participation when the child is watching and deciding.",
      observe: "Look for later use in play, drawing, or everyday moments. A child might bring a toy and say ‘sad,’ or copy Koko's brave posture. Record the moment mentally without demanding the same word on command.",
      limit: "Do not tell a child ‘you are the angry one’ or treat a story response as a psychological assessment. Strong, persistent distress deserves calm adult support and, when needed, advice from an appropriate professional.",
      bridge: "Print one feelings face, offer two crayons, and ask the child to choose a color for the character. Put the page away after five minutes. Returning another day is more valuable than completing every box.",
      revision: "This revision emphasizes situation-based language, removes personality labels, and clarifies that quiet observation is a valid response."
    }, {
      scene: "Koko 過橋前看起來有點擔心。家長不必一次要求孩子背下 happy、sad、worried、brave，而是停在角色的表情，只說出畫面中真正看得到的一個情緒。",
      goal: "情緒詞若能連起身體線索、發生的情境與下一個可行動作，才真正有用。worried 可以連到肩膀緊緊的、第一次過橋、想請人幫忙；這個詞用來開啟對話，不是定義孩子是什麼樣的人。",
      routine: "一次只選一組對比，例如 calm 和 worried。指兩張圖，各說一次英文詞，讓孩子用表情、顏色或動作配對。最後用家庭主要語言問：接下來什麼可能幫助角色？",
      example: "孩子可能只指著擔心的臉，什麼也沒說。家長可以替角色說：「Koko is worried。Koko 可以牽朋友的手。」只要孩子仍在看、仍在思考，安靜也算參與。",
      observe: "留意孩子之後是否把詞用在扮演、畫畫或日常情境。他可能拿著玩具說 sad，也可能模仿 Koko 勇敢的姿勢。記住那一刻就好，不必立刻要求孩子照指令再說一次。",
      limit: "不要說「你就是家裡愛生氣的那一個」，也不要把故事反應當心理評估。若強烈困擾持續存在，孩子需要的是穩定成人支持，必要時再尋求適當專業意見。",
      bridge: "印一張情緒臉，放兩支蠟筆，請孩子替角色選一個顏色。五分鐘就收起來，不必填完每一格；隔天願意再回來，比一次完成更有價值。",
      revision: "本次修訂強化情境式情緒語言，移除人格標籤，並明確說明安靜觀察也是有效回應。"
    }, {
      scene: "تبدو Koko قلقة قبل عبور الجسر. بدل مطالبة الطفل بحفظ happy وsad وworried وbrave معًا، يتوقف الوالد عند الوجه ويسمي شعورًا واحدًا يظهر في الصورة.",
      goal: "تفيد كلمة الشعور حين ترتبط بإشارة في الجسم وموقف وفعل ممكن. يمكن أن ترتبط worried بكتفين مشدودين وجسر جديد وطلب المساعدة. تفتح الكلمة الحوار ولا تحدد شخصية الطفل.",
      routine: "اختاروا تضادًا واحدًا مثل calm وworried. أشيروا إلى صورتين وقولوا كل كلمة مرة، ثم دعوا الطفل يطابق وجهًا أو لونًا أو حركة. اختموا بسؤال عربي عما قد يساعد الشخصية.",
      example: "قد يشير الطفل إلى الوجه القلق من دون كلام. يمكن للوالد أن يقول عن الشخصية: Koko is worried، ويمكنها إمساك يد صديق. الصمت مشاركة صالحة عندما يراقب الطفل ويفكر.",
      observe: "راقبوا استعمال الكلمة لاحقًا في اللعب أو الرسم أو الحياة اليومية. قد يحمل الطفل لعبة ويقول sad أو يقلد وقفة Koko الشجاعة. لا تطلبوا إعادة الكلمة فورًا لإثبات التعلم.",
      limit: "لا تقولوا للطفل أنت الغاضب في العائلة، ولا تعاملوا إجابته كفحص نفسي. الضيق القوي والمستمر يحتاج دعمًا هادئًا من بالغ، وأحيانًا رأي مختص مناسب.",
      bridge: "اطبعوا وجهًا واحدًا للمشاعر وقدموا لونين، ثم اطلبوا اختيار لون للشخصية. توقفوا بعد خمس دقائق. العودة في يوم آخر أهم من ملء كل خانة.",
      revision: "يركز التنقيح على لغة مرتبطة بالموقف، ويحذف أوصاف الشخصية، ويوضح أن المراقبة الصامتة استجابة صحيحة."
    })
  },
  {
    slug: GUIDE_SLUGS[2], world: "koko", sources: SOURCES.sharedReading,
    title: localized("Repetition without pressure", "不施壓的重複：孩子想看同一則故事時", "التكرار من دون ضغط"),
    description: localized("Use a familiar story again without turning repetition into drilling, bargaining, or a test.", "孩子想重看同一則故事時，如何保留熟悉感，又不把重複變成操練、交換或考試。", "استخدموا القصة المألوفة مرة أخرى من دون تحويل التكرار إلى تدريب قسري أو اختبار."),
    details: localized({
      scene: "A child asks for the same Koko episode for the fourth evening. The adult feels that learning should move forward, yet the child is using predictability to notice a sound, anticipate a joke, or feel safe enough to join in.",
      goal: "Keep the story stable and change only one small invitation. Familiarity reduces the work of following the plot, leaving attention available for a phrase, gesture, or detail that was missed before.",
      routine: "On the first repeat, simply watch together. On the next, pause once before a familiar phrase. On another day, invite the child to choose a gesture or prop. Stop there; variety can grow across days rather than inside one session.",
      example: "Before Koko says ‘hello, friend,’ the parent pauses and smiles. The child may supply the phrase, make the greeting gesture, or wait. Each option preserves agency because the story continues without a demand.",
      observe: "Notice anticipation, relaxed attention, spontaneous imitation, and new comments about the picture. These changes are more informative than counting forced repetitions. The same story can support a different kind of participation each time.",
      limit: "Do not withhold the story until a child performs, and do not replay a clip until pronunciation is perfect. If repetition seems rigid, distressing, or disruptive to daily life, this guide is not a substitute for individualized support.",
      bridge: "Keep a small repeat card. After the story, the child may mark ‘watch,’ ‘say,’ or ‘draw’ for next time. The card gives choice without promising a reward or turning screen access into a negotiation.",
      revision: "This guide now distinguishes child-led familiarity from adult-led drilling and adds examples of participation that do not require speech."
    }, {
      scene: "孩子連續第四個晚上要求看同一則 Koko 故事。大人可能覺得學習應該往前走，但孩子正在利用可預測性注意聲音、等待笑點，或先取得足夠安全感才加入互動。",
      goal: "保留故事穩定，只改變一個很小的邀請。熟悉內容能降低追情節的負擔，讓注意力留給之前沒聽見的短句、動作或圖像細節。",
      routine: "第一次重看就單純陪看；下一次只在熟悉短句前停一次；另一天再請孩子選一個動作或道具。到這裡就好，變化可以分散在不同日子，不必塞進同一次活動。",
      example: "Koko 說 hello, friend 前，家長停一下並微笑。孩子可以接出短句、做招呼動作，也可以只是等待。故事不會因為沒有回答而停止，因此每個選擇都保留孩子的主動權。",
      observe: "觀察孩子是否開始預測、放鬆觀看、自發模仿，或談到之前沒注意的畫面。這些變化比計算被要求說了幾次更有資訊；同一故事每次可以支持不同形式的參與。",
      limit: "不要把故事扣住，要求孩子表現後才能看，也不要為了完美發音反覆播放片段。若重複行為帶來明顯困擾或影響生活，本指南不能替代個別化專業支持。",
      bridge: "準備一張小小的重看卡。故事結束後，孩子可以替下次選「看、說、畫」其中一項。卡片提供選擇，但不把螢幕當獎品，也不變成討價還價。",
      revision: "本次修訂區分孩子主導的熟悉感與成人主導的操練，並加入不需要開口也能參與的例子。"
    }, {
      scene: "يطلب الطفل قصة Koko نفسها للمساء الرابع. قد يظن البالغ أن التعلم يجب أن يتقدم، لكن الطفل يستخدم التوقع لملاحظة صوت أو انتظار مزحة أو الشعور بالأمان قبل المشاركة.",
      goal: "أبقوا القصة ثابتة وغيروا دعوة صغيرة واحدة فقط. تقلل الألفة جهد متابعة الأحداث وتترك انتباهًا لعبارة أو حركة أو تفصيل لم يلاحظه الطفل من قبل.",
      routine: "في الإعادة الأولى شاهدوا فقط. في التالية توقفوا مرة قبل عبارة مألوفة. في يوم آخر دعوا الطفل يختار حركة أو أداة. يكفي ذلك؛ يمكن توزيع التنويع على أيام متعددة.",
      example: "قبل أن تقول Koko: hello, friend، يتوقف الوالد ويبتسم. قد يكمل الطفل العبارة أو يؤدي التحية أو ينتظر. تستمر القصة بلا طلب، ولذلك تحتفظ كل استجابة بحرية الاختيار.",
      observe: "لاحظوا التوقع والانتباه الهادئ والتقليد التلقائي والتعليقات الجديدة على الصورة. هذه التغيرات أهم من عد مرات التكرار المفروض، وقد تدعم القصة مشاركة مختلفة كل مرة.",
      limit: "لا تمنعوا القصة حتى يؤدي الطفل المطلوب، ولا تعيدوا المقطع حتى يصبح النطق مثاليًا. إذا صار التكرار مؤلمًا أو معطلًا للحياة اليومية فالدليل لا يغني عن دعم فردي.",
      bridge: "اصنعوا بطاقة صغيرة للإعادة. بعد القصة يختار الطفل للمرة القادمة: مشاهدة أو قول أو رسم. تمنح البطاقة خيارًا من دون جعل الشاشة مكافأة أو صفقة.",
      revision: "يميز التنقيح بين الألفة التي يقودها الطفل والتدريب الذي يقوده البالغ، ويضيف أمثلة مشاركة لا تتطلب الكلام."
    })
  },
  {
    slug: GUIDE_SLUGS[3], world: "koko", sources: SOURCES.sharedReading,
    title: localized("From a story video to a five-minute printable", "從故事影片走到五分鐘可列印活動", "من فيديو القصة إلى ورقة نشاط لخمس دقائق"),
    description: localized("A short transition from watching together to one useful offline activity, without trying to finish a worksheet packet.", "從一起看故事，平順轉到一個真正有用的離線活動，不追求把整份學習單做完。", "انتقال قصير من المشاهدة المشتركة إلى نشاط واحد مفيد خارج الشاشة دون محاولة إنهاء حزمة كاملة."),
    details: localized({
      scene: "The story ends and the child is ready to run away. The parent has printed three pages and feels pressure to use them all. A better transition begins with one page already chosen and the rest out of sight.",
      goal: "The printable should extend one idea from the story, not compete with it. Five minutes is a ceiling, not a target. The page succeeds when it supports one exchange between child and adult, even if it remains unfinished.",
      routine: "Before viewing, choose one sheet and place two crayons nearby. After the video, name the connection: ‘Koko felt brave; this page has a brave face.’ Offer one choice, work beside the child, and stop when attention moves away.",
      example: "Instead of asking the child to trace every word, the parent circles brave, draws a bridge, and invites the child to add Koko. The drawing creates a reason to repeat the word while hands and conversation stay relaxed.",
      observe: "Look for a reference back to the story, a chosen color, a copied gesture, or a question. Completion percentage is not useful evidence. Keep pages only when the child wants to revisit them, not as a record of performance.",
      limit: "Do not use the printable as a condition for more play or as proof that screen time was educational. Children who dislike paper activities can use blocks, toys, or movement instead. The learning idea matters more than the format.",
      bridge: "Store remaining pages for later and write the story title on the back of the completed fragment. A small folder can become a family memory without becoming homework or a portfolio that the child must maintain.",
      revision: "The guide was revised to make five minutes a maximum, protect unfinished work, and offer non-paper alternatives."
    }, {
      scene: "故事結束，孩子已經想跑走；家長手上卻印了三頁，開始覺得全部用完才不浪費。更好的轉場，是事先只選一頁，把其他頁收在看不到的地方。",
      goal: "學習單應延伸故事中的一個想法，不是和故事競爭。五分鐘是上限，不是目標；只要那一頁促成一次親子交流，即使沒有完成，也已發揮作用。",
      routine: "播放前先選一張紙，旁邊放兩支蠟筆。影片後直接說明連結：「Koko 剛才很勇敢，這張有一張勇敢的臉。」提供一個選擇，成人坐在旁邊一起做，注意力離開就結束。",
      example: "不要要求描完所有單字。家長可以圈出 brave、畫一座橋，再請孩子加上 Koko。畫面自然產生重複詞語的理由，雙手與對話都保持放鬆。",
      observe: "看孩子是否提到故事、選了顏色、模仿動作或提出問題。完成百分比不是有用證據；只有孩子想再看時才保存作品，不把它當成表現紀錄。",
      limit: "不要把完成學習單當成繼續玩耍的條件，也不要拿它證明螢幕時間一定有教育效果。不喜歡紙張活動的孩子可以改用積木、玩具或身體動作，學習概念比形式重要。",
      bridge: "其餘頁面留到別天，在完成的小片段背面寫上故事名稱。小資料夾可以成為家庭記憶，但不要變成功課，也不要要求孩子維護作品集。",
      revision: "本次修訂把五分鐘明確設為上限，保護未完成作品，也加入非紙本替代方案。"
    }, {
      scene: "تنتهي القصة ويستعد الطفل للابتعاد، بينما طبع الوالد ثلاث صفحات ويشعر بضرورة استعمالها كلها. يبدأ الانتقال الأفضل بصفحة واحدة مختارة مسبقًا وإبعاد البقية عن النظر.",
      goal: "يجب أن توسع الورقة فكرة واحدة من القصة بدل منافستها. خمس دقائق حد أعلى وليست هدفًا. تنجح الصفحة عندما تدعم تبادلًا واحدًا بين الطفل والبالغ حتى لو بقيت ناقصة.",
      routine: "قبل المشاهدة اختاروا ورقة وضعوا لونين قربها. بعد الفيديو اذكروا الصلة: شعرت Koko بالشجاعة وهذه الصفحة فيها وجه شجاع. قدموا خيارًا واحدًا واعملوا بجانب الطفل وتوقفوا عند انتقال الانتباه.",
      example: "بدل طلب تتبع كل كلمة، يضع الوالد دائرة حول brave ويرسم جسرًا ويدعو الطفل لإضافة Koko. يصنع الرسم سببًا طبيعيًا لتكرار الكلمة مع بقاء اليدين والحوار مرتاحين.",
      observe: "ابحثوا عن إشارة إلى القصة أو لون مختار أو حركة مقلدة أو سؤال. نسبة الإكمال ليست دليلًا مفيدًا. احتفظوا بالصفحة فقط إذا أراد الطفل العودة إليها، لا كسجل أداء.",
      limit: "لا تجعلوا الورقة شرطًا للعب ولا دليلًا على أن وقت الشاشة تعليمي. يمكن لمن لا يحب الورق استخدام المكعبات أو اللعب أو الحركة. الفكرة أهم من الشكل.",
      bridge: "احفظوا الصفحات الباقية ليوم آخر واكتبوا اسم القصة خلف الجزء المستخدم. يمكن لملف صغير أن يصبح ذكرى عائلية من دون أن يتحول إلى واجب أو ملف إنجاز مفروض.",
      revision: "عدلنا الدليل ليجعل خمس دقائق حدًا أعلى ويحمي العمل غير المكتمل ويقدم بدائل غير ورقية."
    })
  },
  {
    slug: GUIDE_SLUGS[4], world: "noor", sources: SOURCES.language,
    title: localized("Chinese story time for Arabic-speaking families", "阿語家庭的中文故事共讀起點", "وقت قصة صينية للعائلات الناطقة بالعربية"),
    description: localized("A parent-led Chinese story routine that uses Arabic for understanding and Pinyin as a limited reading aid.", "由家長帶領的中文故事流程：用阿語確保理解，把拼音當有限的閱讀輔助。", "روتين قصة صينية يقوده الوالد ويستخدم العربية للفهم وPinyin كأداة قراءة محدودة."),
    details: localized({
      scene: "An Arabic-speaking parent sees Chinese characters, Pinyin, and a translated prompt on the same page. Trying to pronounce, translate, explain, and test everything at once makes a three-minute story feel like a lesson the parent did not prepare for.",
      goal: "Give each language one job. Chinese carries the sound and one key expression; Arabic carries explanation, warmth, and the family conversation; Pinyin helps the adult locate a pronunciation but does not replace listening to a reliable model.",
      routine: "Preview the three target words, listen once when audio is available, and choose the easiest word to say. During reading, point to the picture, say the Chinese word, explain the scene in Arabic, then return to the Chinese word once before moving on.",
      example: "For 你好 nǐ hǎo, the parent waves, says the phrase, and explains in Arabic that Nour is greeting Zayd. The child can wave back without speaking. Later the family can use the same phrase when entering a room.",
      observe: "Notice recognition of the gesture, attention to a repeated sound, and spontaneous use in a real greeting. Do not expect a child to explain tones or identify characters after one story. Recognition can appear before speech.",
      limit: "Pinyin spelling can tempt adults to read every sound through Arabic or English habits. Use it as a cue, not proof of pronunciation. This guide does not replace a teacher or speech-language professional when individualized help is needed.",
      bridge: "Place one picture card near the door and use the greeting during a real arrival. Keep Arabic available for the rest of the conversation. A small Chinese phrase is more likely to survive when it has a clear place in family life.",
      revision: "This guide now assigns distinct roles to Chinese, Arabic, and Pinyin and removes the expectation that families teach all three systems at once."
    }, {
      scene: "阿語家長在同一頁看到漢字、拼音與翻譯提示。如果同時想發音、翻譯、解釋、考孩子，三分鐘故事很快就會變成一堂沒有備課的正式課程。",
      goal: "替每種語言安排一個工作：中文承載聲音與一個核心表達；阿語負責理解、情感與家庭對話；拼音幫成人找到讀音位置，但不能取代可靠音源。",
      routine: "事先看三個目標詞，有音檔就先聽一次，再選最容易說的一個。共讀時指圖、說中文詞、用阿語解釋情境，離開前再回到中文詞一次。",
      example: "讀到「你好 nǐ hǎo」時，家長揮手、說出短句，再用阿語解釋努爾正在向 Zayd 打招呼。孩子可以只揮手，不必開口；之後家人進房時可以再次使用同一句。",
      observe: "留意孩子是否認出招呼動作、注意重複聲音，或在真實問候中自發使用。不要期待孩子一次故事後就能解釋聲調或辨認漢字，理解與辨識可能先於口語。",
      limit: "拼音容易讓成人用阿語或英文習慣猜每個音，因此只能當提示，不能當發音正確的證明。需要個別協助時，本指南不能取代教師或語言相關專業人員。",
      bridge: "在門邊放一張圖卡，家人真的進門時使用問候語，其餘對話繼續用阿語。中文短句若在家庭生活中有明確位置，比孤立背誦更容易被記住。",
      revision: "本次修訂替中文、阿語與拼音分配不同角色，移除家庭必須同時教會三套系統的期待。"
    }, {
      scene: "يرى الوالد العربي الحروف الصينية وPinyin وترجمة في صفحة واحدة. محاولة النطق والترجمة والشرح والاختبار معًا تحول قصة ثلاث دقائق إلى درس لم يستعد له الوالد.",
      goal: "أعطوا كل لغة وظيفة. تحمل الصينية الصوت وتعبيرًا أساسيًا، وتحمل العربية الفهم والدفء والحوار، ويساعد Pinyin البالغ على تحديد النطق من دون أن يحل محل الاستماع إلى نموذج موثوق.",
      routine: "راجعوا الكلمات الثلاث واستمعوا مرة عند توفر الصوت واختاروا الأسهل. أثناء القراءة أشيروا إلى الصورة وقولوا الكلمة الصينية واشرحوا بالعربية ثم عودوا إلى الكلمة الصينية مرة قبل الانتقال.",
      example: "مع 你好 nǐ hǎo يلوح الوالد ويقول العبارة ويشرح أن نور تحيي Zayd. يمكن للطفل التلويح بلا كلام. لاحقًا تستعمل الأسرة العبارة نفسها عند دخول الغرفة.",
      observe: "لاحظوا التعرف على الحركة والانتباه للصوت والاستعمال التلقائي في تحية حقيقية. لا تتوقعوا شرح النغمات أو معرفة الحروف بعد قصة واحدة؛ قد يظهر التعرف قبل الكلام.",
      limit: "قد يدفع Pinyin البالغ إلى قراءة الأصوات بعادات عربية أو إنجليزية. استخدموه كإشارة لا كدليل على النطق. لا يغني الدليل عن معلم أو مختص عند الحاجة الفردية.",
      bridge: "ضعوا بطاقة صورة قرب الباب واستعملوا التحية عند وصول حقيقي، مع إبقاء بقية الحوار بالعربية. تعيش العبارة الصينية الصغيرة حين يكون لها مكان واضح في الحياة العائلية.",
      revision: "يوزع التنقيح أدوارًا مختلفة على الصينية والعربية وPinyin ويلغي توقع تعليم الأنظمة الثلاثة دفعة واحدة."
    })
  },
  {
    slug: GUIDE_SLUGS[5], world: "noor", sources: SOURCES.language,
    title: localized("Pinyin and tones: a parent-friendly starting point", "拼音與聲調：家長可以採用的簡單起點", "Pinyin والنغمات: بداية مناسبة للوالدين"),
    description: localized("Use Pinyin and Mandarin tone cues carefully without turning a family story into a phonetics class.", "謹慎使用拼音與中文聲調提示，不把家庭故事變成語音學課堂。", "استخدموا Pinyin وإشارات نغمات الصينية بعناية من دون تحويل القصة العائلية إلى درس صوتيات."),
    details: localized({
      scene: "A parent sees mā, má, mǎ, and mà and assumes every tone must be mastered before saying a useful word. The marks are important, but beginning with an accurate model, a gesture, and one meaningful phrase is more practical than studying a full chart during story time.",
      goal: "Treat Pinyin as a map between a Chinese character and a sound model. The tone mark reminds the adult that pitch movement matters. It does not guarantee the right consonant, vowel, rhythm, or natural use by itself.",
      routine: "Choose one word, listen to a reliable recording two or three times, and copy the whole syllable rather than spelling it letter by letter. Add a simple hand path for the tone, say the word in its phrase, and then return to the story.",
      example: "For 好 hǎo, the hand can dip and rise gently while the parent says 你好 as one greeting. The child may copy the wave instead of the tone motion. Keep the phrase connected to Nour greeting Zayd rather than asking for isolated repetitions.",
      observe: "Listen for growing familiarity, not perfection. The child may recognize that the phrase belongs to greeting before producing a stable tone. Adults may also improve slowly; using audio again is a responsible choice, not a failure.",
      limit: "Do not invent tone rules from the written mark or correct a child through repeated public comparison. Tone learning varies with exposure and context. Seek a qualified teacher for detailed pronunciation goals and a health professional for communication concerns.",
      bridge: "Keep one QR or audio link beside the printable so the adult can check the model privately. After the sound check, put the phone away and use the phrase with eye contact, a wave, and an actual family interaction.",
      revision: "The guide was revised to define Pinyin as a limited map, add whole-phrase practice, and discourage letter-by-letter guessing."
    }, {
      scene: "家長看到 mā、má、mǎ、mà，可能以為每個聲調都學會後才有資格說中文。符號確實重要，但故事時間先聽可靠示範、配上一個動作與有意義短句，比研究整張聲調表更實際。",
      goal: "把拼音當成漢字與聲音示範之間的地圖。聲調符號提醒成人音高變化很重要，但它本身不能保證聲母、韻母、節奏與自然使用都正確。",
      routine: "一次只選一個詞，可靠錄音聽兩三次，模仿整個音節，不要逐字母拼讀。加上一條簡單手勢表示聲調，在完整短句中說一次，然後回到故事。",
      example: "說「好 hǎo」時，手可以輕輕先降再升，接著把它放進「你好」這個問候。孩子只模仿揮手也可以；讓短句留在努爾向 Zayd 打招呼的情境，不做孤立重複。",
      observe: "聽熟悉度是否增加，不追求完美。孩子可能先知道這句屬於問候，之後才逐漸穩定聲調；成人也需要時間，再次播放音檔是負責任的選擇，不是失敗。",
      limit: "不要只看符號就自行發明規則，也不要公開反覆比較、糾正孩子。聲調學習會受接觸量與情境影響；詳細發音目標可找合格教師，溝通發展疑慮則應找健康專業人員。",
      bridge: "在學習單旁留一個音檔或 QR 入口，讓成人私下核對。確認聲音後放下手機，用眼神、揮手與真實家庭互動說出短句。",
      revision: "本次修訂把拼音定義為有限的聲音地圖，加入完整短句練習，並避免逐字母猜音。"
    }, {
      scene: "يرى الوالد mā وmá وmǎ وmà ويظن أن إتقان كل نغمة شرط لقول كلمة مفيدة. العلامات مهمة، لكن نموذجًا صوتيًا دقيقًا وحركة وعبارة ذات معنى أكثر عملية من دراسة جدول كامل أثناء القصة.",
      goal: "عاملوا Pinyin كخريطة بين الحرف الصيني والنموذج الصوتي. تذكر علامة النغمة بأن حركة طبقة الصوت مهمة، لكنها لا تضمن وحدها الحرف الساكن أو الحركة أو الإيقاع أو الاستعمال الطبيعي.",
      routine: "اختاروا كلمة واستمعوا إلى تسجيل موثوق مرتين أو ثلاثًا، وقلدوا المقطع كاملًا بدل تهجئته. أضيفوا مسارًا بسيطًا باليد للنغمة، وقولوا الكلمة داخل عبارتها، ثم عودوا إلى القصة.",
      example: "مع 好 hǎo يمكن لليد أن تنخفض ثم ترتفع بلطف بينما يقول الوالد 你好 كتحية واحدة. قد يقلد الطفل التلويح فقط. أبقوا العبارة مرتبطة بتحية نور لـ Zayd بدل التكرار المنفصل.",
      observe: "استمعوا إلى زيادة الألفة لا الكمال. قد يعرف الطفل أن العبارة للتحية قبل إنتاج نغمة ثابتة. يتحسن البالغ أيضًا ببطء، والعودة إلى التسجيل اختيار مسؤول لا فشل.",
      limit: "لا تخترعوا قواعد من العلامة المكتوبة ولا تصححوا الطفل بالمقارنة العلنية المتكررة. يختلف تعلم النغمات حسب التعرض والسياق. استعينوا بمعلم مؤهل لهدف نطق مفصل وبمختص صحي لمخاوف التواصل.",
      bridge: "ضعوا رابط صوت أو QR قرب الورقة ليراجع البالغ النموذج بهدوء. بعد التحقق أغلقوا الهاتف واستخدموا العبارة مع تواصل بصري وتلويح وتفاعل عائلي حقيقي.",
      revision: "يعرف التنقيح Pinyin كخريطة محدودة ويضيف تدريب العبارة الكاملة ويحذر من التخمين حرفًا حرفًا."
    })
  },
  {
    slug: GUIDE_SLUGS[6], world: "noor", sources: SOURCES.sharedReading,
    title: localized("Three Chinese words a day: a flexible family ritual", "一天三個中文詞：可以變動的家庭小儀式", "ثلاث كلمات صينية يوميًا: طقس عائلي مرن"),
    description: localized("Choose a tiny set of useful words without promising daily mastery or turning a number into a quota.", "選一小組真正用得到的詞，不保證每天精熟，也不讓數字變成配額。", "اختاروا مجموعة صغيرة من الكلمات المفيدة من دون وعد بالإتقان اليومي أو تحويل الرقم إلى حصة إلزامية."),
    details: localized({
      scene: "‘Three words a day’ sounds simple until a tired family misses a day, a child wants only one word, or yesterday's words are forgotten. The number should shrink the task, not create a streak that adults feel required to protect.",
      goal: "Choose words that belong together in one visible moment: red, blue, green while sorting blocks; hello, goodbye, thank you at the door; big, small, same during play. Meaningful grouping gives the words somewhere to live.",
      routine: "Begin with one word from the story. Add a second only if attention remains, and let the third be optional. Say, point, and use each word once in a real choice. On the next day, reuse any word the family remembers instead of starting a test.",
      example: "With 红 hóng, 蓝 lán, and 绿 lǜ, Nour's color page can sit beside three blocks. The parent names one color and asks the child to hand over any matching block. If only red is used, the routine is still complete.",
      observe: "Watch for recognition during a choice, a glance toward the right object, or use of a gesture. Forgetting is expected. Reencountering a word in another story is part of learning and should not be framed as starting over.",
      limit: "Do not maintain charts that shame missed days or promise a vocabulary total after a fixed number of weeks. Word exposure is not the same as mastery. Individual language development cannot be measured by this family routine.",
      bridge: "Keep three small picture cards in a bowl and allow yesterday's card to remain. The child can choose one for play, the dinner table, or a walk. The ritual follows family energy rather than controlling it.",
      revision: "This revision makes the third word optional, removes streak language, and explains why forgetting and reencounter are normal."
    }, {
      scene: "「一天三個詞」聽起來很簡單，直到疲累的一家人漏掉一天、孩子只想看一個詞，或昨天的內容全忘了。數字應縮小任務，不是創造大人必須守住的連續紀錄。",
      goal: "選擇在同一個可見情境裡彼此相關的詞：整理積木時用紅、藍、綠；進門時用你好、再見、謝謝；玩耍時用大、小、一樣。成組的意義替詞語找到生活位置。",
      routine: "先從故事選一個詞，注意力還在才加入第二個，第三個永遠可以省略。每個詞只要說一次、指一次、放進一次真實選擇。隔天先重用家人記得的內容，不從考試開始。",
      example: "學「紅 hóng、藍 lán、綠 lǜ」時，把努爾顏色頁放在三塊積木旁。家長說一個顏色，請孩子拿任何相符積木；如果最後只用到紅色，今天的流程仍然完整。",
      observe: "觀察孩子是否在選擇時認得、看向正確物品或使用動作。忘記很正常，在另一則故事再次遇見同一詞就是學習的一部分，不應被描述成全部重來。",
      limit: "不要用表格羞辱漏掉的日子，也不要承諾固定幾週後一定累積多少詞。接觸詞語不等於精熟，個別語言發展更不能用這套家庭儀式衡量。",
      bridge: "把三張小圖卡放進碗裡，允許昨天的卡繼續留下。孩子可以選一張帶去遊戲、餐桌或散步；儀式配合家庭能量，而不是控制家庭。",
      revision: "本次修訂把第三個詞改成可選，移除連續打卡語言，並解釋忘記與再次遇見都是正常過程。"
    }, {
      scene: "تبدو عبارة ثلاث كلمات يوميًا سهلة حتى تفوت الأسرة يومًا أو يريد الطفل كلمة واحدة أو تُنسى كلمات الأمس. يجب أن يصغر الرقم المهمة بدل أن يصنع سلسلة يشعر البالغ بضرورة حمايتها.",
      goal: "اختاروا كلمات تعيش في موقف واحد: أحمر وأزرق وأخضر مع المكعبات؛ مرحبًا ووداعًا وشكرًا عند الباب؛ كبير وصغير ومتشابه أثناء اللعب. يمنح التجميع الكلمات مكانًا واضحًا.",
      routine: "ابدأوا بكلمة من القصة. أضيفوا ثانية إذا بقي الانتباه، واجعلوا الثالثة اختيارية. قولوا وأشيروا واستعملوا كل كلمة مرة في اختيار حقيقي. في اليوم التالي أعيدوا ما تتذكره العائلة بدل بدء اختبار.",
      example: "مع 红 hóng و蓝 lán و绿 lǜ توضع صفحة ألوان نور بجانب ثلاثة مكعبات. يسمي الوالد لونًا ويطلب أي مكعب مطابق. إذا استعملت كلمة الأحمر فقط فالروتين مكتمل.",
      observe: "راقبوا التعرف أثناء الاختيار أو النظر نحو الشيء أو استعمال حركة. النسيان متوقع، ومقابلة الكلمة في قصة أخرى جزء من التعلم وليست بداية من الصفر.",
      limit: "لا تستخدموا جداول تشعر الأسرة بالخجل من الأيام الفائتة ولا تعدوا بعدد مفردات بعد أسابيع ثابتة. التعرض للكلمة ليس إتقانًا، ولا يقيس هذا الروتين نمو اللغة الفردي.",
      bridge: "ضعوا ثلاث بطاقات صور في وعاء واتركوا بطاقة الأمس. يختار الطفل واحدة للعب أو الطعام أو المشي. يتبع الطقس طاقة الأسرة بدل التحكم فيها.",
      revision: "يجعل التنقيح الكلمة الثالثة اختيارية ويحذف لغة السلسلة ويوضح أن النسيان واللقاء المتكرر طبيعيان."
    })
  },
  {
    slug: GUIDE_SLUGS[7], world: "noor", sources: SOURCES.sharedReading,
    title: localized("A three-minute Chinese routine that can stop on time", "能準時結束的三分鐘中文小習慣", "روتين صيني لثلاث دقائق ينتهي في وقته"),
    description: localized("Build a repeatable beginning, middle, and ending so a short Chinese activity remains calm and honest.", "用固定的開始、中段與結尾，讓短中文活動保持平靜、可重複，也誠實面對家庭狀態。", "ابنوا بداية ووسطًا ونهاية قابلة للتكرار كي يبقى النشاط الصيني القصير هادئًا وصادقًا."),
    details: localized({
      scene: "A parent says the activity will take three minutes, but keeps adding one more word, question, and worksheet box. The child learns that the promised ending is unreliable. A trustworthy short routine needs an ending that adults honor.",
      goal: "Use a recognizable shape: greet, explore one story moment, and close. The timer protects the relationship rather than measuring the child. Finishing early is allowed, and stopping on time builds confidence that another session will also be manageable.",
      routine: "Minute one: wave and use one greeting. Minute two: point to one picture and say up to three words. Minute three: let the child choose a gesture, object, or mark, then say a consistent goodbye and put materials away together.",
      example: "Nour greets Zayd, the family says 你好, points to one color, and chooses a matching crayon. When the timer sounds, the parent says 再见 zàijiàn and closes the folder even if another box is blank.",
      observe: "Notice whether transitions become easier, the child approaches the folder willingly, or a phrase appears outside the routine. These are signs that the structure is usable. They are not proof of language proficiency or a guaranteed outcome.",
      limit: "Do not restart the timer after distraction or use the final minute to test recall. Some days the routine may be skipped entirely. Families should adapt for sensory, attention, or communication needs and seek individualized advice where appropriate.",
      bridge: "Keep the greeting card on top and the goodbye card at the bottom of the folder. The visible order helps the adult resist adding tasks. Invite the child to close the folder so the boundary belongs to both people.",
      revision: "The guide was revised to make the timer a promise to stop, add an early-finish option, and remove end-of-session testing."
    }, {
      scene: "家長說活動只要三分鐘，卻一直追加一個詞、一個問題、一格學習單。孩子因此學到承諾的結束時間不可靠。真正可信的短流程，需要成人也遵守結尾。",
      goal: "使用孩子能辨認的形狀：打招呼、探索一個故事片段、收尾。計時器用來保護關係，不是測量孩子；提早完成可以，準時停止也能讓下次活動看起來仍然做得到。",
      routine: "第一分鐘：揮手並使用一句問候。第二分鐘：指一張圖，最多說三個詞。第三分鐘：讓孩子選動作、物品或記號，再使用固定道別語，一起收起材料。",
      example: "努爾向 Zayd 打招呼，全家說「你好」，指一個顏色並挑出相符蠟筆。計時器響起時，家長說「再見 zàijiàn」，即使還有空格也關上資料夾。",
      observe: "留意轉場是否變容易、孩子是否自願靠近資料夾，或短句是否出現在流程之外。這些表示結構對家庭可用，不是語言能力證明，也不是保證成果。",
      limit: "分心後不要重新計時，也不要用最後一分鐘考記憶。有些日子完全跳過也可以。家庭可依感官、注意或溝通需要調整，適當時尋求個別建議。",
      bridge: "把問候卡放在資料夾最上面，道別卡放在最下面。看得到的順序幫助成人抵抗追加任務，也可以邀請孩子親手關上資料夾，讓界線屬於雙方。",
      revision: "本次修訂把計時器定義為停止承諾，加入提早結束選項，並移除活動結尾的測驗。"
    }, {
      scene: "يقول الوالد إن النشاط ثلاث دقائق ثم يضيف كلمة وسؤالًا وخانة أخرى. يتعلم الطفل أن النهاية الموعودة غير موثوقة. يحتاج الروتين القصير إلى نهاية يحترمها البالغ.",
      goal: "استخدموا شكلًا معروفًا: تحية ثم لحظة قصة ثم إغلاق. يحمي المؤقت العلاقة ولا يقيس الطفل. يسمح بالانتهاء مبكرًا، ويجعل التوقف في الوقت الجلسة التالية قابلة للإدارة.",
      routine: "الدقيقة الأولى: تلويح وتحية. الثانية: الإشارة إلى صورة وقول ثلاث كلمات كحد أقصى. الثالثة: يختار الطفل حركة أو شيئًا أو علامة، ثم تقول الأسرة وداعًا ثابتًا وتعيد المواد معًا.",
      example: "تحيي نور Zayd، وتقول الأسرة 你好، وتشير إلى لون وتختار قلمًا مطابقًا. عند صوت المؤقت يقول الوالد 再见 zàijiàn ويغلق الملف حتى لو بقيت خانة فارغة.",
      observe: "لاحظوا سهولة الانتقال أو اقتراب الطفل من الملف أو ظهور العبارة خارجه. تدل هذه الأشياء على أن البنية صالحة للعائلة، ولا تثبت الطلاقة ولا تضمن نتيجة.",
      limit: "لا تعيدوا المؤقت بعد التشتت ولا تستعملوا الدقيقة الأخيرة للاختبار. يمكن تجاوز الروتين في بعض الأيام. عدلوا النشاط حسب حاجات الحس والانتباه والتواصل واطلبوا نصيحة فردية عند الحاجة.",
      bridge: "ضعوا بطاقة التحية أعلى الملف وبطاقة الوداع أسفله. يساعد الترتيب المرئي البالغ على عدم إضافة مهام، ويمكن للطفل إغلاق الملف ليشارك في وضع الحد.",
      revision: "يجعل التنقيح المؤقت وعدًا بالتوقف ويضيف الانتهاء المبكر ويحذف اختبار نهاية الجلسة."
    })
  },
];
