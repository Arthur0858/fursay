const localized = (en, zh, ar) => ({ en, zh, ar });

export const ROUND3_EDITORIAL_UPDATED = "2026-09-25";

const TOOL_CARDS = {
  "koko-feelings-at-bedtime": {
    en: ["Look: point to one face or body clue.", "Name: try one possible feeling, with 'maybe'.", "Next: choose a quiet action such as sit close or say goodnight."],
    zh: ["看一看：指一個表情或身體線索。", "說感覺：加上「可能」，只說一個詞。", "做下一步：靠近坐一下，或互道晚安。"],
    ar: ["لاحظوا: أشيروا إلى وجه أو علامة واحدة.", "سموا: جربوا شعورًا محتملًا واحدًا.", "تابعوا: اختاروا خطوة هادئة كالقرب أو قول تصبحون على خير."],
  },
  "koko-brave-after-a-hard-day": {
    en: ["One small try: choose a safe, manageable action.", "Pause: leave the page and return only if both people want."],
    zh: ["試一小步：挑一件安全、做得到的事。", "先暫停：收起故事，雙方都想看時再回來。"],
    ar: ["محاولة صغيرة: اختاروا فعلًا آمنًا وممكنًا.", "وقفة: اتركوا الصفحة وعودوا إذا رغب الطرفان."],
  },
  "nour-hello-goodbye-at-the-door": {
    en: ["Arrival: keep the family greeting, then optionally add 你好 nǐ hǎo or a wave.", "Leaving: say goodbye as usual; 再见 zàijiàn or a gesture is optional."],
    zh: ["到家：先照常用家庭語言問候，可加「你好 nǐ hǎo」或揮手。", "離開：先照平常道別，可選「再見 zàijiàn」或手勢。"],
    ar: ["الوصول: حافظوا على تحية البيت ثم أضيفوا 你好 nǐ hǎo أو تلويحًا اختياريًا.", "المغادرة: ودعوا كالمعتاد؛ 再见 zàijiàn أو حركة خيار إضافي."],
  },
  "nour-colors-at-the-table": {
    en: ["Blue: point to a safe blue object already on the table.", "Green: name the napkin or another familiar item.", "Choose: let the child point, pass an object, or keep eating."],
    zh: ["藍色：指餐桌上已存在的安全藍色物品。", "綠色：說出餐巾或另一件熟悉物品。", "選擇：孩子可指一指、遞物品，或繼續吃飯。"],
    ar: ["الأزرق: أشيروا إلى غرض أزرق آمن على المائدة.", "الأخضر: سموا المنديل أو غرضًا مألوفًا.", "الاختيار: يشير الطفل أو يناول غرضًا أو يتابع الطعام."],
  },
};

const FIELD_NAMES = ["scene", "goal", "routine", "example", "observe", "bridge", "limit"];
function guide(slug, world, title, description, revision, detailText, depth, tool) {
  const details = Object.fromEntries(["en", "zh", "ar"].map((locale) => [
    locale,
    Object.fromEntries(FIELD_NAMES.map((field, index) => [field, detailText[locale][index]]).concat([["revision", revision[locale]]])),
  ]));
  return { slug, world, title, description, details, datePublished: ROUND3_EDITORIAL_UPDATED, dateModified: ROUND3_EDITORIAL_UPDATED, tool: { title: tool, items: TOOL_CARDS[slug] } };
}

export const ROUND3_GUIDES = [
  guide(
    "koko-feelings-at-bedtime", "koko",
    localized("A quieter Koko story before bed: naming one feeling", "睡前讀 Koko：用一個情緒詞收好今天", "قصة Koko قبل النوم: تسمية شعور واحد"),
    localized("A low-pressure bedtime story plan for noticing a character's feeling, keeping the family language, and ending on time.", "把睡前共讀縮成一個表情、一個情緒詞與平靜收尾；不必把夜晚變成英文練習課。", "خطة هادئة لقصة ما قبل النوم تلاحظ شعور الشخصية وتحافظ على لغة الأسرة وتنتهي في وقت مناسب."),
    localized("We added a one-feeling limit, a short ending option, and a printable bedtime cue card; this is a family reading idea, not sleep or mental-health treatment.", "本次新增單一情緒詞上限、縮短收尾方案與睡前提示卡；這是家庭共讀想法，不是睡眠或心理治療。", "أضفنا حدًا لشعور واحد وخيارًا لنهاية قصيرة وبطاقة تذكير؛ هذه فكرة للقراءة العائلية وليست علاجًا للنوم أو للصحة النفسية."),
    {
      en: [
        "The pajamas are on, the light is already dim, and a child asks for Koko even though the bedtime routine has started late. The adult can feel pulled between wanting a warm connection and protecting the time to rest. Open to one picture rather than promising the whole episode. Let Koko's face be the starting point, not a quiz. If tonight has been difficult, the story can simply sit beside the family while everyone settles; no language target has to be completed before lights out.",
        "Choose one feeling that the illustration actually suggests, such as unsure, relieved, or proud. A picture cannot tell an adult exactly what a child feels, and a character's expression may be read differently across families. Use a tentative sentence: 'Koko might feel unsure here.' Then leave room for the child to disagree, point, or stay quiet. The useful aim is to offer a word that can be accepted or ignored, not to extract a personal disclosure at a tired moment.",
        "Keep the sequence smaller than the usual bedtime routine: look at one image, say the feeling in the home language, add one English word if the adult wants, and turn the page or close the book. There is no need to rehearse pronunciation or explain every emotion. If the child asks a question, answer briefly and return to the familiar bedtime steps. A predictable ending protects the practical job of bedtime while leaving a small place for a story.",
        "Suppose Koko's shoulders are raised beside a dark path. An adult might say, 'Koko looks a little worried; 我們先看見路，再看看誰陪她,' then point to the friend in the next picture. If the child says 'scared' instead, accept that reading and use the word the child chose. If no one wants to speak, the adult can describe the picture in one sentence and close it. A short example should fit a real evening, not require perfect attention or a full conversation.",
        "Notice the ending more than recall. Did the child relax, ask for the same page, turn away, or request another part of the routine? Those are cues for the adult about timing and interest, not evidence that the child has learned or mastered a feeling word. A child can enjoy the picture without naming anything. If the same word returns another evening, treat it as a fresh encounter rather than a score that proves progress.",
        "The companion 'one feeling, one page' card below lets an adult place a feeling word beside a picture and a calming next step. It can be used without printing: point to one row, choose the family language, and put it away. Koko's scene may lead to drawing a face or choosing a soft toy, but an extra activity is optional. The story is a prompt for shared attention, not a reason to delay sleep or add a reward chart.",
        "Skip this activity when the child is distressed, very sleepy, or asking clearly to stop. Do not use a story to decide why a child is worried, predict sleep, or label a temperament. Keep normal safety and bedtime needs first. If sleep, anxiety, or emotional concerns are persistent and affect daily life, a parent can speak with a qualified local health professional. This guide cannot assess a child and does not replace individualized advice.",
      ],
      zh: [
        "睡衣已穿好、燈也調暗了，孩子才想起要看 Koko；今天的晚間流程已經晚了。大人可能同時想保留親近感，也需要讓全家按時休息。這時先打開一張圖，不必承諾看完整集。把 Koko 的表情當成觀察起點，不當成考題。若今天過得很辛苦，故事可以只是安靜放在旁邊，陪大家慢慢收心；關燈以前不必完成任何語言目標。",
        "只挑畫面確實看得出的一個感覺，例如不確定、放心或得意。插圖不能替成人判定孩子心裡正在想什麼，不同家庭也可能讀出不同表情。可以試著說：「Koko 這裡好像有點不確定。」接著容許孩子反對、指圖，或安靜不回答。此刻的目的只是提供一個可以接受也可以略過的詞，不是趁疲累時要求孩子透露自己的感受。",
        "流程比平常睡前儀式更短：看一張圖、用家裡熟悉的語言說一次感覺，大人想加入時再補一個英文詞，接著翻頁或收起故事。不用練發音，也不用解釋每一種情緒。孩子若提問，簡短回應後就回到熟悉的睡前步驟。明確收尾能保護睡前真正要做的事，同時留一點位置給故事。",
        "例如 Koko 在暗色小路旁縮起肩膀，大人可以說：「她看起來有點擔心；我們先看看這條路，再看看誰陪她。」然後指向下一張圖裡的朋友。若孩子改說「害怕」，就接受他的讀法，使用孩子選的詞。若沒有人想開口，大人也可以只描述一句畫面就闔上書。示範要符合真實夜晚，不必要求注意力完美或談足一整段。",
        "與其測試孩子記得什麼，不如注意結尾是否順利。孩子放鬆了、要求重看同一頁、轉身離開，或想起接下來的睡前流程，都是成人判斷時間與興趣的線索；這些都不是孩子學會或精熟情緒詞的證據。孩子可以喜歡圖片而不命名任何感覺。另一個晚上再次聽到同一個詞，就當作新的相遇，不必計分證明進步。",
        "下面的「一個感覺、一張圖」提示卡，讓成人把情緒詞、圖像線索與一個安穩的下一步放在一起。不列印也能使用：挑一列、換成家中常用語言、看完就收起來。Koko 的畫面可以延伸成畫表情或挑一個抱枕，但額外活動完全可省略。故事只是共同注意力的提示，不能成為延後睡覺或新增獎勵表的理由。",
        "孩子已經很疲倦、正在強烈不安，或明確要求停止時，就跳過這個活動。不要用故事推斷孩子為什麼擔心、預測睡眠結果，或替孩子貼上性格標籤。先照顧安全與睡前需要；若睡眠、焦慮或情緒狀況持續影響日常生活，家長可詢問所在地合格健康專業人員。本指南不能評估個別孩子，也不能取代個人化建議。",
      ],
      ar: [
        "ارتدى الطفل ملابس النوم وخفت الإضاءة، ثم طلب قصة Koko بعد أن تأخر روتين المساء. قد يريد الوالد لحظة قرب، وفي الوقت نفسه يحتاج إلى حماية موعد الراحة. افتحوا صورة واحدة بدل الوعد بإنهاء الحلقة. اجعلوا وجه Koko بداية للملاحظة لا سؤالًا امتحانيًا. وإذا كان اليوم صعبًا، يمكن للقصة أن تبقى قرب الأسرة بينما يهدأ الجميع؛ لا يلزم إنجاز هدف لغوي قبل إطفاء الضوء.",
        "اختاروا شعورًا واحدًا توحي به الصورة فعلًا، مثل التردد أو الارتياح أو الفخر. لا تكشف الصورة يقينًا ما يشعر به الطفل، وقد تقرأ الأسر التعبير بطرق مختلفة. جربوا عبارة غير جازمة: تبدو Koko مترددة هنا. اتركوا للطفل فرصة للاختلاف أو الإشارة أو الصمت. المقصود تقديم كلمة يمكن قبولها أو تركها، لا انتزاع إفصاح شخصي في لحظة تعب.",
        "اجعلوا الخطوات أقصر من روتين النوم المعتاد: انظروا إلى صورة، وسموا الشعور بلغة البيت، وأضيفوا كلمة إنجليزية واحدة إن رغب البالغ، ثم اقلبوا الصفحة أو أغلقوا القصة. لا حاجة إلى تدريب النطق أو شرح كل شعور. إن سأل الطفل فأجيبوا بإيجاز ثم عودوا إلى خطوات النوم المألوفة. تحمي النهاية الواضحة مهمة النوم العملية وتترك مساحة صغيرة للقصة.",
        "إذا رفعت Koko كتفيها قرب طريق مظلم، قد يقول الوالد: تبدو قلقة قليلًا؛ لنر الطريق أولًا ثم من يرافقها. ثم يشير إلى الصديق في الصورة التالية. إن قال الطفل خائفة فاقبلوا قراءته واستخدموا كلمته. وإذا لم يرغب أحد في الكلام، يكفي وصف الصورة بجملة وإغلاق الكتاب. يجب أن يناسب المثال مساءً حقيقيًا، من دون اشتراط انتباه كامل أو محادثة طويلة.",
        "لاحظوا طريقة النهاية أكثر من استرجاع الكلمات. هل هدأ الطفل أو طلب الصورة نفسها أو ابتعد أو تذكر الخطوة التالية من الروتين؟ هذه إشارات للبالغ عن التوقيت والاهتمام وليست دليلًا على تعلم كلمة أو إتقانها. يستطيع الطفل الاستمتاع بالصورة من دون تسمية أي شعور. إذا عادت الكلمة في مساء آخر فاعتبروها لقاءً جديدًا لا درجة تثبت التقدم.",
        "تتيح بطاقة شعور واحد وصورة واحدة أدناه وضع كلمة بجانب دليل بصري وخطوة هادئة تالية. يمكن استخدامها بلا طباعة: اختاروا سطرًا باللغة المناسبة ثم ضعوا البطاقة جانبًا. قد تقود قصة Koko إلى رسم وجه أو اختيار لعبة ناعمة، لكن النشاط الإضافي اختياري. القصة دعوة إلى انتباه مشترك وليست سببًا لتأخير النوم أو إضافة جدول مكافآت.",
        "تجاوزوا النشاط إذا كان الطفل منزعجًا أو نعسانًا جدًا أو طلب التوقف بوضوح. لا تستخدموا القصة لتحديد سبب القلق أو توقع النوم أو وصف طبع الطفل. قدموا احتياجات السلامة والنوم أولًا. عند استمرار مشكلات النوم أو القلق أو المشاعر وتأثيرها في الحياة اليومية يمكن للوالد استشارة مختص صحي محلي مؤهل. لا يقيم هذا الدليل طفلًا بعينه ولا يحل محل نصيحة فردية.",
      ],
    },
    {
      headings: localized(
        ["Keep the bedtime promise small", "Offer a feeling as a guess", "Let home language settle the scene", "Try one page and one gentle response", "Read the ending, not the child's score", "Use the one-feeling cue card", "When bedtime needs a different kind of support"],
        ["把睡前承諾縮小", "把情緒當成猜想來分享", "用家庭語言安頓畫面", "只試一頁與一個回應", "看結尾是否平靜，不看孩子得幾分", "使用單一情緒提示卡", "什麼時候該換一種支持方式"],
        ["صغروا وعد وقت النوم", "قدموا الشعور كتخمين", "دعوا لغة البيت تهدئ المشهد", "جربوا صورة وردًا لطيفًا واحدًا", "لاحظوا النهاية لا درجة الطفل", "استخدموا بطاقة الشعور الواحد", "متى يحتاج النوم إلى دعم مختلف"]
      ),
      today: localized("Choose one Koko picture, name one possible feeling in your family language, and close the story before the bedtime routine stretches.", "今晚挑一張 Koko 圖，用家庭語言說一個可能的感覺，接著按原定睡前流程收尾。", "اختاروا صورة واحدة من Koko وسموا شعورًا محتملًا بلغة الأسرة ثم أغلقوا القصة قبل أن يطول روتين النوم."),
      notes: {
        en: [
          "A late start is not a reason to bargain with a child about finishing pages. Say what will happen in plain terms: one picture, then teeth or lights out. Predictability helps the adult keep a kind boundary, and the child is not surprised when the book closes. If the child protests, acknowledge the wish for more and repeat the next step without adding a new lesson or promising extra screen time tomorrow.",
          "Adults can soften certainty with 'maybe', 'looks like', or 'I wonder'. A child may know the character better or notice a detail the adult missed. A correction is welcome information, not a challenge to the adult. If naming a feeling makes a child more alert or upset, stop the language activity and offer ordinary comfort. The picture can wait for another day.",
          "The adult's most fluent language often carries the nuance of reassurance. Add an English label as a small echo, not a replacement for a meaningful conversation. A mixed sentence is acceptable when it feels natural. Families can also skip the English word entirely; bedtime is not a test of consistency between languages.",
          "Look at the character's posture, nearby objects, and what changes on the next page. Choose one clue to mention, then wait a few seconds. Children may answer with a gesture or move closer to the book. Avoid a rapid series of 'what is she feeling?' questions. If the moment stays calm, one sentence has done enough work.",
          "A settled transition might mean the child accepts the closing cue or simply moves into the familiar next step. Some nights remain difficult despite a thoughtful routine. Do not infer a health outcome from a single calm or restless evening. The adult can adjust tomorrow's timing without asking the child to prove a word was remembered tonight.",
          "The tool has three rows: a face or picture clue, one feeling word, and one possible next action such as sit close, turn the light down, or say goodnight. An adult chooses the action; the card does not prescribe what a child must do. Print it in black and white or copy one row onto scrap paper to avoid a full-color printer requirement.",
          "A family may have cultural, sensory, disability, or schedule needs that make this routine a poor fit. Adapt the light, sound, language, page count, or timing, and ask the child what helps when possible. If sleep is regularly difficult, use professional guidance rather than expanding an online reading exercise. A story can accompany care but cannot deliver treatment.",
        ],
        zh: [
          "開始得晚，不代表要和孩子討價還價看完幾頁。用直接的話先說清楚：「看一張圖，接著刷牙或關燈。」可預期的安排讓成人保有溫和界線，也讓孩子不會在故事突然結束時措手不及。若孩子抗議，可以承認他還想看，重複下一步即可；不要臨時加課，也不用承諾明天多看影片補償。",
          "成人可以在判斷前加上「可能」、「看起來」或「我在想」。孩子可能比大人熟悉角色，也可能看見成人漏掉的線索。孩子改正你的說法，是有用的訊息，不是挑戰大人。若命名感覺讓孩子更清醒或更不舒服，就停止語言活動，先給一般性的陪伴；圖片可以改天再看。",
          "成人最流利的語言，通常最能說清楚安慰與細節。英文標籤可以像小小回聲，不需要取代完整對話。自然混用兩種語言沒有問題；家庭也可以完全不說英文，睡前不必驗證兩種語言使用得多一致。",
          "先看看角色姿勢、附近物件與下一頁有什麼變化，挑一個線索說出來，然後等幾秒。孩子可能用手勢回應，或只是更靠近故事。不要連續追問「她現在是什麼感覺？」如果整個時刻仍然平靜，一句話已經足夠。",
          "平順轉換可能是孩子接受收書提示，也可能只是照熟悉流程往下一步走。有些夜晚即使流程想得很周到，仍然不容易。不要根據某一次平靜或躁動的夜晚推斷健康結果。大人可以調整明天開始的時間，不必今晚考孩子還記不記得某個詞。",
          "提示卡只有三列：臉部或圖片線索、一個情緒詞，以及一個可選下一步，例如靠近坐、調暗燈光或互道晚安。下一步由成人斟酌，卡片不規定孩子一定要怎麼做。可用黑白列印，或把一列抄在廢紙上，不需要彩色印表機。",
          "家庭可能有文化、感官、身心障礙或作息需求，讓這套流程不適合。可以調整燈光、聲音、語言、頁數與時間，並在可行時問孩子什麼對他有幫助。若睡眠長期困難，應尋求專業建議，不要一直擴寫網路共讀活動。故事可以陪伴照護，不能提供治療。",
        ],
        ar: [
          "لا تجعلوا التأخر سببًا للتفاوض حول إنهاء الصفحات. قولوا بوضوح ما سيحدث: صورة واحدة ثم تنظيف الأسنان أو إطفاء الضوء. يساعد الوضوح البالغ على وضع حد لطيف، ولا يفاجأ الطفل عند إغلاق الكتاب. إن احتج الطفل فاعترفوا برغبته في المزيد ثم كرروا الخطوة التالية من دون درس إضافي أو وعد بوقت شاشة غدًا.",
          "يستطيع البالغ تخفيف الجزم بكلمات مثل ربما أو يبدو أو أتساءل. قد يعرف الطفل الشخصية أكثر أو يلاحظ تفصيلًا فات البالغ. تصحيح الطفل معلومة مفيدة لا تحديًا. إذا جعلت تسمية الشعور الطفل أكثر يقظة أو انزعاجًا، أوقفوا النشاط اللغوي وقدموا مواساة عادية. يمكن للصورة أن تنتظر يومًا آخر.",
          "تحمل اللغة الأقوى لدى البالغ تفاصيل الطمأنة بدقة. أضيفوا الاسم الإنجليزي كصدى صغير لا بديلًا عن الحديث ذي المعنى. لا بأس بمزج الجملتين إن كان طبيعيًا. ويمكن للأسرة ترك الإنجليزية تمامًا؛ فالنوم ليس امتحانًا لاتساق اللغات.",
          "انظروا إلى وقفة الشخصية والأشياء القريبة وما يتغير في الصفحة التالية. اختاروا علامة واحدة واذكروها ثم انتظروا قليلًا. قد يجيب الطفل بحركة أو يقترب من الكتاب. تجنبوا سلسلة سريعة من الأسئلة عن الشعور. إذا بقي الجو هادئًا فقد أدت جملة واحدة ما يكفي.",
          "قد يعني الانتقال الهادئ قبول الطفل لإشارة الإغلاق أو انتقاله إلى الخطوة المألوفة التالية. تبقى بعض الليالي صعبة رغم روتين مدروس. لا تستنتجوا نتيجة صحية من مساء هادئ أو مضطرب واحد. يستطيع البالغ تعديل توقيت الغد من دون مطالبة الطفل بإثبات أنه تذكر كلمة الليلة.",
          "تتكون الأداة من ثلاثة أسطر: علامة في الوجه أو الصورة، وكلمة شعور، وخطوة تالية ممكنة مثل الجلوس بالقرب أو خفض الضوء أو قول تصبحون على خير. يختار البالغ الخطوة ولا تملي البطاقة على الطفل ما يجب فعله. اطبعوها بالأبيض والأسود أو انسخوا سطرًا على ورقة مستعملة.",
          "قد تجعل احتياجات الأسرة الثقافية أو الحسية أو المتعلقة بالإعاقة أو الجدول هذا الروتين غير مناسب. عدلوا الضوء والصوت واللغة وعدد الصفحات والتوقيت، واسألوا الطفل عما يساعده حين يكون ذلك ممكنًا. إذا استمر اضطراب النوم فاطلبوا إرشادًا مهنيًا بدل توسيع نشاط قراءة عبر الإنترنت. ترافق القصة الرعاية لكنها لا تقدم علاجًا.",
        ],
      },
      sources: [
        ["healthyChildrenEmotions", localized("Supports predictable routines and naming feelings; it does not validate this specific activity or assess an individual child.", "支持可預期作息與描述感覺；不代表認可本活動，也不評估個別孩子。", "يدعم الروتين المتوقع وتسمية المشاعر، لكنه لا يقر هذا النشاط ولا يقيم طفلًا بعينه.")],
        ["healthyChildrenBedtime", localized("Offers parent-facing bedtime routine guidance; it does not prescribe a fixed story length for every family.", "提供家長睡前流程建議；不規定所有家庭都要讀固定長度。", "يقدم إرشادًا روتينيًا لوقت النوم ولا يفرض مدة قصة واحدة على كل أسرة.")],
        ["cdcRoutines", localized("Describes simple, predictable family routines; it does not promise sleep or language outcomes.", "說明簡單且可預期的家庭流程；不保證睡眠或語言成果。", "يشرح روتين الأسرة البسيط والمتوقع ولا يضمن نتائج للنوم أو اللغة.")],
      ],
      links: ["feelings-words-through-stories", "three-minute-chinese-routine", "repetition-without-pressure"],
    },
    localized("One feeling · one picture · one next step", "一個感覺・一張圖・一個下一步", "شعور واحد · صورة واحدة · خطوة تالية"),
  ),
  guide(
    "koko-brave-after-a-hard-day", "koko",
    localized("After a hard day, let Koko's brave moment stay small", "辛苦的一天後，陪 Koko 做一件小小的勇敢事", "بعد يوم صعب، اجعلوا شجاعة Koko صغيرة"),
    localized("A story-based way to talk about trying again that leaves room for rest, uncertainty, and a child's own meaning of brave.", "用故事談再試一次時，也替休息、不確定與孩子自己的勇敢定義留位置。", "طريقة قصصية للحديث عن المحاولة من جديد مع مساحة للراحة والتردد وتعريف الطفل للشجاعة."),
    localized("We revised this guide to distinguish bravery from compliance, added a rest-first alternative, and made a two-choice reflection card.", "本次修訂區分勇敢與服從，加入先休息的替代方式與雙選項回想卡。", "نقحنا الدليل للفصل بين الشجاعة والطاعة، وأضفنا خيار الراحة أولًا وبطاقة تأمل ذات خيارين."),
    {
      en: [
        "A child comes home quiet after a change in plans, a hard school day, or a disagreement with a friend. An adult reaches for Koko's story about trying again and wants to encourage confidence. Begin by asking whether a story sounds welcome; do not assume the child wants to discuss the day. If the answer is no, let the book wait. The invitation itself should be safe to decline, because connection after a hard moment matters more than using the perfect teaching example.",
        "The word brave can mean asking for help, taking a break, returning to a task, or telling someone that a choice feels uncomfortable. It does not have to mean being fearless or continuing until an adult is satisfied. Before opening the page, decide to accept more than one kind of brave response. This keeps a story from turning into a hidden request to obey, perform, forgive, or repeat an action the child is not ready to try.",
        "Use a three-part pause: notice what happened in the story, name one possible feeling, then offer a choice between a small next step and rest. The adult can keep the invitation neutral: 'Would you like to look at Koko's next page, or leave it for tomorrow?' Wait for an answer or a gesture. If the child chooses rest, follow through. No worksheet, word practice, or explanation is needed to make the evening complete.",
        "If Koko drops a basket and looks disappointed, a parent might say, 'That did not go as planned. Do you want help picking it up, or a minute beside me?' A child may answer in Arabic, Mandarin, English, or no words. The adult can mirror the response instead of replacing it with 'be brave.' If the child wants to try again, agree on one manageable attempt; the story does not require a larger challenge.",
        "Notice whether the child is choosing, avoiding, asking, or changing the subject. Each response helps the adult understand what kind of support fits this moment, but it does not reveal a stable personality trait. A child who leaves the page may still be thinking. A child who repeats Koko's line may enjoy its rhythm rather than identify with the scene. Let meaning remain open until the child offers more.",
        "The two-choice card below offers 'try one small thing' and 'pause with an adult.' The adult can add a third option in conversation, such as drawing, getting water, or doing nothing for a while. Use it after everyone is calm, not as a way to interrupt tears or insist on a lesson. One gentle return to the story tomorrow is enough if both people want it.",
        "Do not use bravery language to minimize fear, pressure disclosure, or override safety boundaries. If a child faces bullying, a threat, injury, or persistent distress, the adult should address the real situation and seek appropriate support. A story cannot determine whether an event is harmless or resolve it. This article is a reading prompt for ordinary family conversation, not counselling or an assessment of resilience.",
      ],
      zh: [
        "孩子因為計畫臨時改變、學校過得不順，或和朋友意見不合，回家後變得安靜。大人想到 Koko「再試一次」的故事，想鼓勵孩子有信心。先問他願不願意聽故事，不要假設孩子想談今天發生的事。若答案是不想，就讓書先放著。這份邀請本身應該可以拒絕；辛苦時刻後的連結，比找到完美教材更重要。",
        "勇敢可以是求助、休息一下、回到某件事，或告訴別人自己不舒服；不必代表毫不害怕，也不代表一定要做到成人滿意。翻頁前先提醒自己，接受多種勇敢的回應。如此故事才不會暗中變成要求服從、表演、原諒，或做孩子還沒準備好的事情。",
        "把停頓分成三步：看故事發生什麼、說出一種可能的感受，再提供「做一個小步驟」或「先休息」的選擇。大人可以中性地問：「你想看 Koko 下一頁，還是明天再看？」等孩子用話或動作回應。如果孩子選擇休息，就照做。今晚不必再補學習單、詞語練習或長篇說明，仍然可以好好結束。",
        "如果 Koko 把籃子弄掉，看起來很失望，家長可以說：「事情沒有照計畫走。你要我陪你撿，還是先在我旁邊待一下？」孩子可能用阿語、中文、英文回答，也可能不說話。成人可以先呼應孩子，而不是用「勇敢一點」蓋過原意。若孩子想重試，就一起定下一個做得到的小步驟；故事不要求他接受更大的挑戰。",
        "留意孩子是在自己選擇、避開、求助，還是改變話題。每個回應都能幫成人理解當下需要哪種陪伴，卻不能推斷孩子有固定的性格特質。離開畫面的孩子可能仍在思考；重複 Koko 的句子，也可能只是喜歡節奏，不代表認同故事情境。只要孩子沒有說更多，就讓故事意思保持開放。",
        "下面的雙選項卡提供「做一件小事」與「和成人一起暫停」。成人談話時還可以加第三種選擇，例如畫畫、喝水，或安靜待一會兒。等大家平靜後再用卡片，不要在孩子哭泣時打斷，也不要藉此硬塞一堂課。若雙方都願意，明天再回到故事一次就足夠。",
        "不要用勇敢這個詞淡化恐懼、逼問隱私或跨越安全界線。如果孩子遭遇霸凌、威脅、受傷或持續困擾，成人應處理真實問題並尋求合適協助；故事無法判定事件是否無害，也無法自行解決問題。本文只為一般家庭對話提供閱讀提示，不是諮商，也不評估孩子的韌性。",
      ],
      ar: [
        "يعود الطفل صامتًا بعد تغير الخطة أو يوم مدرسي مرهق أو خلاف مع صديق. يفكر البالغ في قصة Koko عن المحاولة مجددًا ويريد تشجيعه. ابدأوا بسؤال الطفل إن كانت القصة مرحبًا بها؛ لا تفترضوا أنه يريد مناقشة يومه. إذا قال لا فاتركوا الكتاب لوقت آخر. ينبغي أن تكون الدعوة آمنة للرفض، لأن الصلة بعد لحظة صعبة أهم من اختيار مثال تعليمي مثالي.",
        "قد تعني الشجاعة طلب المساعدة أو أخذ استراحة أو العودة إلى مهمة أو إخبار شخص بأن الاختيار غير مريح. لا تعني غياب الخوف ولا الاستمرار حتى يرضى البالغ. قبل فتح الصفحة قرروا قبول أكثر من شكل للاستجابة الشجاعة. يمنع ذلك تحول القصة إلى طلب خفي للطاعة أو الأداء أو المسامحة أو تجربة شيء لم يستعد له الطفل.",
        "استخدموا وقفة من ثلاثة أجزاء: لاحظوا ما حدث في القصة، وسموا شعورًا محتملًا، ثم قدموا اختيارًا بين خطوة صغيرة والراحة. يمكن للبالغ أن يسأل بحياد: هل تريد رؤية صفحة Koko التالية أم تركها للغد؟ انتظروا إجابة أو حركة. إذا اختار الطفل الراحة فنفذوا ذلك. لا حاجة لورقة أو تدريب كلمات أو شرح كي يكتمل المساء.",
        "إذا أسقطت Koko سلة وبدا عليها الإحباط، يمكن للوالد القول: لم تسر الأمور كما خططنا؛ أتريد مساعدتي في جمعها أم دقيقة بجانبي؟ قد يجيب الطفل بالعربية أو الصينية أو الإنجليزية أو بلا كلام. عكسوا رده بدل استبداله بعبارة كن شجاعًا. إن أراد المحاولة من جديد فاتفقوا على خطوة واحدة ممكنة؛ لا تطلب القصة تحديًا أكبر.",
        "لاحظوا هل يختار الطفل أو يتجنب أو يطلب المساعدة أو يغير الموضوع. تساعد الاستجابة البالغ على فهم نوع الدعم الملائم الآن لكنها لا تكشف صفة ثابتة. قد يفكر الطفل الذي ابتعد عن الصورة، وقد يكرر آخر جملة Koko لأنه يحب إيقاعها لا لأنه يرى نفسه في المشهد. اتركوا المعنى مفتوحًا ما لم يضف الطفل شيئًا.",
        "تقدم البطاقة ذات الخيارين أدناه: تجربة شيء صغير أو التوقف مع بالغ. يستطيع الوالد إضافة خيار ثالث مثل الرسم أو شرب الماء أو عدم فعل شيء قليلًا. استخدموها بعد الهدوء لا لمقاطعة البكاء أو فرض درس. تكفي عودة لطيفة واحدة إلى القصة غدًا إذا رغب الطرفان.",
        "لا تستخدموا كلمة الشجاعة لتقليل الخوف أو الضغط للإفصاح أو تجاوز حدود السلامة. إذا واجه الطفل تنمرًا أو تهديدًا أو أذى أو ضيقًا مستمرًا فعلى البالغ معالجة الموقف الحقيقي وطلب الدعم المناسب. لا تحدد القصة أن الحدث غير مؤذ ولا تحله. يقدم المقال دعوة للقراءة والحوار العائلي المعتاد، وليس علاجًا نفسيًا أو تقييمًا للمرونة.",
      ],
    },
    {
      headings: localized(
        ["Ask before offering a story", "Make room for several meanings of brave", "Give rest equal status", "Use a real choice after Koko's setback", "Notice the child's lead without labeling", "Keep the two-choice reset card nearby", "When the problem needs adult action"],
        ["先問孩子要不要聽故事", "讓勇敢有不只一種意思", "把休息當成同等選擇", "用真實選項回應 Koko 的挫折", "跟隨孩子，不急著貼標籤", "備妥雙選項重新開始卡", "何時需要成人處理真實問題"],
        ["اسألوا قبل اقتراح القصة", "اتركوا للشجاعة معاني متعددة", "اجعلوا الراحة خيارًا مكافئًا", "قدموا اختيارًا حقيقيًا بعد تعثر Koko", "اتبعوا الطفل من دون وصف ثابت", "احتفظوا ببطاقة الخيارين", "متى يتطلب الأمر تدخل البالغ"]
      ),
      today: localized("Ask whether the child wants the story. If yes, offer one picture and two genuine next steps: try a tiny action or rest.", "先問孩子願不願意聽；願意的話只看一張圖，再提供「做一小步」或「先休息」兩個真選項。", "اسألوا إن كان الطفل يريد القصة. إن وافق فاعرضوا صورة واحدة وخطوتين حقيقيتين: تجربة صغيرة أو راحة."),
      notes: {
        en: [
          "A story invitation can be one sentence and then a pause. The child does not owe the adult an explanation for declining. Leave the book in view or put it away according to the family's preference, and continue with ordinary care. A different evening may offer a better opening, but the adult should not keep asking until the answer changes.",
          "Adults often use brave as praise, but praise can become a direction when the child hears that only one response is acceptable. Describe what happened instead: Koko tried to pick up the basket, then asked a friend for help. This lets children decide what to notice. The child can also prefer the helper's action to Koko's first attempt.",
          "Rest is an active choice when a child has used up attention. A parent can model it without framing it as giving up: 'We can leave this here and return when we have more energy.' The next step might be water, food, quiet, or contact with another trusted adult. The guide does not rank these options.",
          "Keep the two choices genuinely available. If the adult asks whether the child wants help or space, accept either answer unless immediate safety needs require action. Small choices can restore a sense of agency after a frustrating day. Avoid adding a third choice that is secretly the adult's preferred answer.",
          "A child who looks at the picture but does not speak may still be participating. A child who says no is communicating a boundary. Adults can make a note for themselves about what timing worked, but they should not record the child's feelings as a performance or share a private account publicly.",
          "The simple card has two large spaces that can be pointed to: 'one small try' and 'pause'. An adult may draw an icon beside each. Keep the card plain enough to photocopy, and do not use it as a token chart. If reading the choices adds pressure, set the card aside and offer comfort in the usual way.",
          "When a safety concern is real, move from story talk to adult responsibility. Contact the relevant school, caregiver, or local service when appropriate; a child should not be asked to solve a serious problem with a vocabulary phrase. This guide is deliberately narrow and cannot tell a family which service or legal step applies in every location.",
        ],
        zh: [
          "邀請聽故事只需一句話，接著停下來等。孩子不欠成人一個拒絕的理由。依照家庭習慣，把書留在看得到的位置或收起來，然後繼續照顧其他日常需要。另一天也許比較適合開啟故事，但不要一再追問，直到孩子改口答應為止。",
          "成人常把勇敢當成稱讚；但孩子若聽見只有一種回應能被肯定，稱讚就會變成指令。直接描述發生的事情更清楚：Koko 想把籃子撿起來，後來請朋友幫忙。孩子可以自行決定要注意哪一步，也可能更欣賞願意協助的朋友。",
          "注意力用完時，休息是主動選擇。家長可以示範，但不要把休息說成放棄：「我們先放在這裡，體力回來時再繼續。」下一步可能是喝水、吃點東西、安靜一下，或找另一位信任的大人。本指南不替這些選項排名。",
          "兩個選項都必須真的可以選。如果大人問孩子想要幫忙或空間，就接受任一答案；只有立即安全需要介入時例外。辛苦的一天後，小小選擇能讓孩子重新有些主動感。不要把第三個選項包裝成選擇，實際上卻只接受大人最喜歡的答案。",
          "孩子看著圖片但沒有說話，仍可能參與；孩子說不要，也是在表達界線。成人可以自己記下什麼時機較合適，但不應把孩子的感受當表現紀錄，更不應公開分享孩子的私密經驗。",
          "這張小卡有兩個可直接指的區域：「試一件小事」和「先休息」。成人可以各畫一個簡單圖示，保持黑白列印也看得清楚，不要把它做成集點表。若看選項本身增加壓力，就收起卡片，照平常方式陪伴。",
          "若真的涉及安全疑慮，就從故事對話轉向成人責任。適當時聯絡學校、照顧者或所在地服務；不能要孩子只靠一個詞語解決嚴重問題。本指南刻意聚焦在很小的情境，不能替每個地區判斷該找哪個單位或採取什麼法律步驟。",
        ],
        ar: [
          "تكفي جملة واحدة لاقتراح القصة ثم انتظروا. لا يدين الطفل للبالغ بتفسير رفضه. اتركوا الكتاب ظاهرًا أو أعيدوه إلى مكانه حسب رغبة الأسرة ثم تابعوا الرعاية اليومية. قد يناسب مساء آخر البدء من جديد، لكن لا تكرروا السؤال حتى تتغير الإجابة.",
          "يستخدم البالغون شجاع كثيرًا للمدح، لكن المديح قد يصبح توجيهًا إذا فهم الطفل أن استجابة واحدة فقط مقبولة. صفوا ما جرى بدلًا من ذلك: حاولت Koko رفع السلة ثم طلبت مساعدة صديق. يختار الطفل ما يلاحظه، وقد يفضل فعل الصديق المساعد على المحاولة الأولى.",
          "الراحة اختيار فعلي عندما ينفد الانتباه. يستطيع الوالد أن يقول: نترك هذا هنا ونعود حين تتوفر طاقة. قد تكون الخطوة التالية ماء أو طعامًا أو هدوءًا أو التواصل مع بالغ موثوق آخر. لا يرتب هذا الدليل الخيارات.",
          "أبقوا الخيارين متاحين حقًا. إذا سأل الوالد هل تريد المساعدة أم مساحة، فليقبل أي إجابة ما لم تقتض السلامة الفورية تدخلًا. تمنح الاختيارات الصغيرة بعض القدرة على القرار بعد يوم محبط. لا تضيفوا خيارًا ثالثًا يخفي الإجابة التي يفضلها البالغ.",
          "قد يشارك الطفل الذي ينظر إلى الصورة بصمت. والطفل الذي يقول لا يوضح حدًا. يمكن للبالغ تسجيل التوقيت المناسب لنفسه لكنه لا يسجل شعور الطفل كأداء ولا ينشر رواية خاصة.",
          "تحتوي البطاقة البسيطة على مساحتين كبيرتين للإشارة: محاولة صغيرة ووقفة. يستطيع البالغ رسم رمز قرب كل اختيار. اجعلوها واضحة للتصوير بالأبيض والأسود ولا تحولوها إلى جدول رموز. إذا أضافت قراءة الاختيار ضغطًا فاتركوها وقدموا مواساة معتادة.",
          "عندما يكون القلق متعلقًا بالسلامة انتقلوا من الحديث القصصي إلى مسؤولية البالغ. تواصلوا مع المدرسة أو مقدم الرعاية أو خدمة محلية عند اللزوم؛ ولا تطلبوا من الطفل حل مشكلة خطيرة بعبارة مفردات. لا يحدد هذا الدليل الجهة أو الإجراء القانوني الملائم في كل مكان.",
        ],
      },
      sources: [
        ["headStartFeelings", localized("Suggests naming feelings in daily routines and stories; it does not turn a child's response into an assessment.", "建議在日常與故事中描述感覺；不把孩子回應當評估。", "يقترح تسمية المشاعر في الروتين والقصص ولا يحول رد الطفل إلى تقييم.")],
        ["cdcEmotionCoaching", localized("Outlines caregiver listening and emotion-coaching steps; it is not a requirement to discuss feelings during a story.", "整理成人傾聽與情緒引導步驟；不要求一定要在故事中談感受。", "يعرض خطوات الإصغاء ومرافقة المشاعر ولا يفرض مناقشتها أثناء القصة.")],
        ["harvardServeReturnParents", localized("Describes responsive back-and-forth exchanges; it does not measure courage or promise outcomes from this card.", "說明回應式互動；不衡量勇敢，也不保證使用卡片會有特定成果。", "يشرح التبادل المستجيب ولا يقيس الشجاعة أو يضمن نتيجة لهذه البطاقة.")],
      ],
      links: ["repetition-without-pressure", "english-storytime-without-fluent-english", "feelings-words-through-stories"],
    },
    localized("Two choices after a hard moment", "辛苦時刻後的兩個選擇", "خياران بعد لحظة صعبة"),
  ),
  guide(
    "nour-hello-goodbye-at-the-door", "noor",
    localized("A Nour hello-and-goodbye routine at the family door", "從家門口開始：努爾的你好與再見小流程", "تحية نور ووداعها عند باب البيت"),
    localized("A small Chinese greeting practice for Arabic-speaking families that fits real arrivals and departures without demanding a spoken reply.", "為阿語家庭設計的中文招呼練習，放進真實進出門時刻，不要求孩子一定開口。", "تدريب صغير على التحية الصينية للعائلات الناطقة بالعربية ضمن الدخول والخروج الحقيقي من دون اشتراط رد شفهي."),
    localized("This revision adds a two-sided doorway strip, home-language substitutions, and a clear option to wave or skip the words.", "本次新增門口雙面提示條、家庭語言替代方式，並清楚保留揮手或跳過口語的選項。", "أضفنا شريط باب بوجهين وبدائل بلغة البيت وخيار التلويح أو ترك الكلمات."),
    {
      en: [
        "The door is a naturally repeated place: shoes come off, a bag is set down, or someone leaves for a walk. A parent can connect Nour's greeting story to one of these transitions instead of setting up a separate language lesson. First check what the family already says when someone arrives. Keep that familiar Arabic greeting fully intact, then decide whether one Chinese word has a useful place beside it. The purpose is recognition and connection, not replacing a family custom.",
        "Pick one phrase for arrival and one for leaving, such as nǐ hǎo and zàijiàn. Adults can listen to a reliable model before using a new sound and keep the pinyin visible as a reminder. Do not require a child to repeat the tones. A wave, a look toward the person, or carrying the shoes can be a complete response. The adult can say the phrase while doing the action, allowing meaning to stay tied to a real person.",
        "Use the same small order: pause at the door, greet the person in the home language, add the Chinese phrase if it feels natural, and continue with the practical transition. For leaving, let the child choose a wave, a spoken word, or no extra action. If the family has several caregivers, each can adapt the routine to their own voice. Consistency means a recognizable welcome, not identical pronunciation or wording from every adult.",
        "When an aunt arrives, the adult may say in Arabic, 'وصلت خالتك، نقول لها مرحبًا,' then add nǐ hǎo while looking toward the aunt. If the child waves, return the wave and continue taking off coats. On the way out, zàijiàn can accompany a goodbye to a neighbor, but the adult should not hold the door or block movement until the child speaks. The real exchange is more important than completing both target words.",
        "Notice whether the routine makes arrivals easier or adds friction. A child might anticipate the greeting, respond with a gesture, or prefer not to pause while carrying a toy. These are practical cues, not language scores. Ask older children which phrase feels comfortable and let them suggest another. If repeated prompts annoy the child, move the phrase to the adult's own greeting and stop asking for a performance.",
        "The doorway strip below has two sides: 'someone arrives' and 'we leave'. Under each, it shows a short Arabic cue, the Chinese phrase, and a gesture option. Tape it near adult eye level rather than where it becomes a play object in a crowded entry. A family can copy the two sides onto scrap paper, change the wording to a dialect they use, or remove pinyin once the adult no longer needs it.",
        "Do not practice at the door when people are rushing, the child is upset, or supervision is needed for stairs, traffic, or bags. Never make greeting a test of politeness or belonging. Some children communicate differently or need extra time; a gesture or silence may be their preferred response. This routine does not replace speech-language support or cultural guidance for a family's own greeting customs.",
      ],
      zh: [
        "家門口本來就會反覆出現：脫鞋、放書包、準備出門散步。家長可以把努爾的招呼故事接到其中一個轉換時刻，不必另外安排一堂語言課。先看家人平常怎麼迎接彼此，完整保留熟悉的阿語招呼，再決定是否有一個中文詞能自然放在旁邊。目的是辨認與連結，不是取代家庭原有的問候方式。",
        "先選一個進門詞和一個離開詞，例如 nǐ hǎo 和 zàijiàn。成人可以先聽可靠示範，並把拼音留在眼前當提醒；不要要求孩子跟著念準聲調。揮手、看向來的人，或幫忙拿鞋子，都可以是完整回應。成人在做動作時說出短句，讓語意和真實的人際互動連在一起。",
        "流程可以固定得很小：在門口停一下、用家庭主要語言問候、自然時再加中文，然後繼續原本的進出門安排。離開時讓孩子選擇揮手、說一個詞，或什麼額外動作也不做。若家中有多位照顧者，每個人可用自己的聲音調整。可辨認的歡迎才是穩定，不是每位成人都得用同一種發音。",
        "阿姨來訪時，大人可以先用阿語說「阿姨來了，我們跟她打聲招呼」，再看向阿姨說 nǐ hǎo。孩子如果揮手，就回揮並接著脫外套。出門遇到鄰居時，zàijiàn 可以陪著再見，但成人不可擋住門口，等孩子開口才讓他走。真實交流比完成兩個目標詞都重要。",
        "觀察這個流程讓迎接更順，還是增加摩擦。孩子可能開始預期招呼、用動作回應，或正拿玩具時不想停下來。這些是實際使用線索，不是語言分數。年紀較大的孩子可以直接問他哪個說法舒服，也能請他提議別的句子。如果重複提醒讓孩子煩躁，就把短句留作成人自己的問候，不再要求示範。",
        "下面的門口雙面提示條分成「有人到家」和「我們要出門」：各有一句阿語提示、一個中文短句與一種手勢選項。貼在成人視線高度，避免在人多擁擠的玄關變成孩子玩弄的小物件。家庭也可把兩面抄在廢紙上，換成平常說的阿語方言；成人熟悉後可移除拼音。",
        "趕時間、孩子不安，或大人需要看顧樓梯、車流與行李時，不要在門口練習。不要把招呼變成禮貌或歸屬感測驗。有些孩子溝通方式不同或需要較長時間，手勢或沉默可能就是他偏好的回應。這個流程不能取代語言治療支援，也不能替家庭決定自己的文化問候習慣。",
      ],
      ar: [
        "الباب مكان يتكرر طبيعيًا: نخلع الحذاء أو نضع الحقيبة أو نخرج للمشي. يمكن للوالد ربط قصة تحية نور بواحد من هذه الانتقالات بدل إعداد درس منفصل. ابدأوا بملاحظة التحية العربية التي تستخدمها الأسرة عند الوصول. أبقوها كاملة ثم قرروا إن كانت كلمة صينية واحدة تناسبها. الهدف هو الألفة والاتصال لا استبدال عادة عائلية.",
        "اختاروا عبارة للوصول وأخرى للمغادرة مثل nǐ hǎo وzàijiàn. يستطيع البالغ سماع نموذج موثوق أولًا وإبقاء Pinyin أمامه كتذكير. لا تطلبوا من الطفل تكرار النغمات. يمكن أن تكون حركة اليد أو النظر إلى الشخص أو حمل الحذاء استجابة كاملة. قولوا العبارة أثناء الفعل كي يبقى معناها مرتبطًا بشخص حقيقي.",
        "استخدموا ترتيبًا صغيرًا: توقف عند الباب، سلموا بلغة البيت، أضيفوا العبارة الصينية إن ناسبت، ثم تابعوا الانتقال العملي. عند الخروج دعوا الطفل يختار التلويح أو كلمة أو لا شيء إضافيًا. إذا تعدد مقدمو الرعاية فليعدل كل منهم الروتين بصوته. تعني الاستمرارية وجود ترحيب مألوف لا تطابق نطق الجميع.",
        "عندما تصل الخالة قد يقول البالغ بالعربية وصلت خالتك، لنرحب بها، ثم يضيف nǐ hǎo وهو ينظر إليها. إن لوح الطفل فلوحوا بالمثل وتابعوا خلع المعاطف. عند الخروج يمكن أن تصحب zàijiàn وداع الجار، لكن لا تحجبوا الباب ولا توقفوا الحركة حتى يتكلم الطفل. التبادل الحقيقي أهم من إكمال الكلمتين.",
        "لاحظوا هل يسهل الروتين الوصول أم يضيف احتكاكًا. قد يتوقع الطفل التحية أو يستجيب بحركة أو يرفض التوقف وهو يحمل لعبة. هذه إشارات عملية وليست درجات لغوية. اسألوا الأطفال الأكبر عن العبارة المريحة ودعوهم لاقتراح غيرها. إذا أزعجت التذكيرات المتكررة الطفل فليستخدم البالغ العبارة في تحيته ويتوقف عن طلب الأداء.",
        "يتكون شريط الباب أدناه من جهتين: وصول شخص ومغادرتنا. تعرض كل جهة إشارة عربية قصيرة وعبارة صينية وخيار حركة. ألصقوه قرب مستوى نظر البالغ حتى لا يتحول إلى لعبة وسط مدخل مزدحم. تستطيع الأسرة نسخ الجهتين على ورق مستعمل وتغيير العربية إلى لهجتها وحذف Pinyin عندما يستغني عنه البالغ.",
        "لا تتدربوا عند الباب إذا كنتم مسرعين أو كان الطفل منزعجًا أو احتجتم الإشراف على الدرج أو المرور أو الحقائب. لا تجعلوا التحية اختبارًا للتهذيب أو الانتماء. يتواصل بعض الأطفال بطرق مختلفة أو يحتاجون وقتًا أطول؛ وقد تكون الحركة أو الصمت استجابتهم المفضلة. لا يحل الروتين محل دعم النطق واللغة ولا يحدد عادات الأسرة الثقافية.",
      ],
    },
    {
      headings: localized(
        ["Start with the greeting your family already uses", "Pick one arrival phrase and one leaving phrase", "Attach words to a real door transition", "Let gestures complete the exchange", "Notice friction instead of scoring speech", "Make a two-sided doorway strip", "When the doorway is too busy for practice"],
        ["先保留家裡原本的問候", "選一個進門詞與一個離開詞", "把短句接在真實進出門流程裡", "手勢也能完成交流", "看流程是否卡住，不替說話打分", "做一張門口雙面提示條", "門口太忙時就先不練"],
        ["ابدأوا بتحية الأسرة المعتادة", "اختاروا عبارة للوصول وأخرى للمغادرة", "اربطوا الكلمات بانتقال حقيقي", "تكمل الحركة التبادل أيضًا", "لاحظوا الاحتكاك لا تقيموا الكلام", "اصنعوا شريط باب بوجهين", "اتركوا التدريب عندما ينشغل المدخل"]
      ),
      today: localized("Choose one real arrival today. Keep the Arabic greeting, add one Chinese phrase if it fits, and accept a wave or quiet response.", "今天挑一次真實迎接：先照常說阿語，合適時加一個中文短句，揮手或安靜都算可以。", "اختاروا وصولًا حقيقيًا اليوم. حافظوا على التحية العربية وأضيفوا عبارة صينية إن ناسبت واقبلوا التلويح أو الصمت."),
      notes: {
        en: [
          "Families use different greetings across dialects, generations, and settings. The adult should choose the phrase that already signals welcome in that home. Chinese may be added after it or omitted on a busy day. A small routine that can flex is more useful than asking everyone to adopt a new script at the door.",
          "Pinyin is a pronunciation aid for adults, not a spelling test for children. Check a recording from a dependable language source and avoid inventing tone rules from the accent marks. If the adult is unsure, say the phrase once and move on. Meaningful greeting does not require a child to repeat it back.",
          "Use an arrival only if there is enough time to attend to the person and supervise the child. The phrase can be spoken while hands handle shoes or a bag, so no one has to sit at a table. The activity should not make a caregiver late or distract from street safety.",
          "A wave, nod, smile, or moving toward a trusted relative can take the place of speech. Adults can model the phrase while honoring a child's choice about contact. Do not require hugs, eye contact, or a verbal greeting as proof of affection or politeness.",
          "A smoother transition may show that the cue is easy to recognize; a child not using the word does not mean the idea failed. If the adult hears repeated irritation, shorten the routine or keep the new word for another day. The family does not owe the guide a daily streak.",
          "Two pieces of paper can form the tool: on one side, arrival; on the other, leaving. Draw an arrow for the direction and a hand for a gesture option. Add the Chinese phrase in characters and pinyin only if the adult finds both useful. Use large print and enough spacing for an adult to glance quickly.",
          "A crowded doorway is an unsuitable teaching space when attention must stay on stairs, bags, visitors, pets, or traffic. In those moments, skip the prompt. Families can practice the phrase later during pretend play if the child initiates it, but there is no need to recreate a rushed arrival as a lesson.",
        ],
        zh: [
          "不同方言、世代與場合會使用不同問候。成人應先挑家中本來就能表達歡迎的說法；中文可以接在後面，忙碌的日子也可以完全略過。能彈性調整的小流程，比要求全家門口統一換上一套新台詞更有用。",
          "拼音是給成人確認讀音的工具，不是要孩子通過的拼字測驗。請從可靠語音來源核對，不要只看聲調符號就自行發明規則。成人仍不確定時，說一次就往下走。真正的招呼不需要孩子一定跟著複誦。",
          "只有在成人能同時留意來訪者和孩子安全時，才把招呼放進進門流程。句子可以在穿鞋或拿包包時自然說出，不必把所有人請到桌前。活動不能讓照顧者遲到，也不能分散對街道安全的注意力。",
          "揮手、點頭、微笑，或走向熟悉親友，都可以替代口說。成人可以示範短句，同時尊重孩子是否願意接觸他人。不要要求擁抱、眼神接觸或口頭招呼，作為證明親近或有禮貌的條件。",
          "進出門更順可能代表提示容易辨認；孩子沒有說出詞語，不代表整個想法失敗。成人若聽見孩子反覆不耐煩，就縮短流程或改天再加新詞，不欠任何指南一段每天完成的連勝紀錄。",
          "兩張紙就能做成工具：一面寫到家，一面寫離開。用箭頭表示移動方向，再畫一隻手代表揮手選項。只有在成人覺得有用時才同時寫漢字和拼音。字體要大、留白要足，方便成人快速瞄一眼。",
          "進出門擁擠時，如果成人得顧樓梯、行李、訪客、寵物或車流，門口就不適合教學。這時跳過提示即可。若孩子主動提起，之後可在扮家家酒裡練習，但不需要刻意把匆忙進門重演成課程。",
        ],
        ar: [
          "تختلف التحية بين اللهجات والأجيال والمواقف. اختاروا ما يدل فعلًا على الترحيب في بيتكم. يمكن إضافة الصينية بعده أو تركها في يوم مزدحم. يفيد الروتين المرن أكثر من إلزام الجميع بنص جديد عند الباب.",
          "Pinyin وسيلة للبالغ كي يتحقق من النطق لا اختبار تهجئة للطفل. استمعوا إلى نموذج لغوي موثوق ولا تخترعوا قواعد للنغمات من العلامات وحدها. إن بقي البالغ غير متأكد فليقل العبارة مرة ويتابع. لا تتطلب التحية ذات المعنى أن يكررها الطفل.",
          "استخدموا لحظة الوصول عندما يتوفر وقت للانتباه إلى الزائر والإشراف على الطفل. يمكن قول العبارة أثناء التعامل مع الحذاء أو الحقيبة ولا حاجة إلى الجلوس حول طاولة. لا ينبغي أن يجعل النشاط مقدم الرعاية متأخرًا أو يصرف النظر عن سلامة الطريق.",
          "قد تقوم حركة اليد أو الإيماء أو الابتسامة أو الاقتراب من قريب موثوق مقام الكلام. يستطيع البالغ عرض العبارة مع احترام اختيار الطفل بشأن التواصل. لا تشترطوا عناقًا أو تواصلًا بصريًا أو تحية لفظية لإثبات المودة أو الأدب.",
          "قد يعني الانتقال الأسهل أن الإشارة مألوفة، وعدم نطق الطفل للكلمة لا يعني فشل الفكرة. إذا ظهرت مضايقة متكررة فقصروا الروتين أو أجلوا الكلمة الجديدة. لا تدين الأسرة للدليل بسلسلة يومية.",
          "تكفي ورقتان للأداة: واحدة للوصول وأخرى للمغادرة. ارسموا سهمًا للحركة ويدًا لخيار التلويح. اكتبوا الحروف الصينية وPinyin إذا أفادا البالغ، واستخدموا خطًا كبيرًا ومسافة تكفي لنظرة سريعة.",
          "لا يناسب المدخل المزدحم التعليم إذا احتاج الانتباه إلى الدرج أو الحقائب أو الزوار أو الحيوانات أو المرور. تجاوزوا الإشارة عندها. يمكن للأسرة تجربة العبارة لاحقًا في لعب تخيلي إذا بدأ الطفل ذلك، ولا حاجة لتحويل وصول مستعجل إلى درس.",
        ],
      },
      sources: [
        ["naeycTransition", localized("Shows how familiar home-language messages can support transitions; it does not prescribe one Chinese greeting routine.", "說明熟悉的家庭語言訊息如何協助轉換；不規定單一中文招呼流程。", "يوضح كيف تدعم رسائل لغة البيت الانتقال ولا يفرض روتين تحية صينية محددًا.")],
        ["cdcCommunication", localized("Discusses caregiver communication and nonverbal responses; it does not make speech the only acceptable greeting.", "說明成人溝通與非口語回應；不把口說當唯一合格招呼。", "يناقش التواصل والإشارات غير اللفظية ولا يجعل الكلام التحية المقبولة الوحيدة.")],
        ["naeycFamilyKnowledge", localized("Highlights family language knowledge in supporting children; it does not evaluate this doorway tool.", "強調家庭語言知識對支持孩子的價值；不評估這張門口工具。", "يبرز معرفة الأسرة بلغاتها لدعم الأطفال ولا يقيم أداة الباب هذه.")],
      ],
      links: ["chinese-storytime-for-arabic-speaking-families", "pinyin-and-tones-for-parents", "three-chinese-words-a-day"],
    },
    localized("Arrive · greet · leave", "到家・問候・離開", "الوصول · التحية · المغادرة"),
  ),
  guide(
    "nour-colors-at-the-table", "noor",
    localized("A no-prep Nour color game for an ordinary family table", "餐桌旁的努爾顏色遊戲：不用備課也能開始", "لعبة ألوان نور على مائدة الأسرة بلا تجهيز"),
    localized("Use two safe, familiar objects at the table to connect one Chinese color word with a real choice, without turning dinner into a lesson.", "用餐桌上兩件熟悉又安全的物品，把一個中文顏色詞放進真實選擇，不把吃飯變成上課。", "استخدموا غرضين مألوفين وآمنين على المائدة لربط كلمة لون صينية باختيار حقيقي من دون تحويل الطعام إلى درس."),
    localized("We added a low-ink color mat, a food-allergy and choking-safety boundary, and a version that works with no printed materials.", "本次新增低墨水顏色墊、不把食物當玩具的安全界線，以及完全不列印的版本。", "أضفنا بساط ألوان منخفض الحبر وحدود سلامة للطعام والاختناق ونسخة بلا طباعة."),
    {
      en: [
        "Dinner is already underway: a blue cup, a brown placemat, and a green napkin are within reach. Instead of preparing a special worksheet, let Nour's color story point to something the family can see. Choose just two objects that are safe to handle and already part of the meal. The goal is a brief shared observation, not keeping a child seated longer or delaying food while an adult explains vocabulary.",
        "Choose one color pair that is easy to distinguish in the room, such as red and blue, and use the family's strongest language to explain the choice. Add one Mandarin label if the adult has checked its sound. Color words vary in usefulness depending on lighting, material, and a child's vision; never make matching a test. If the child uses a different label or points without speaking, accept that contribution and continue the meal.",
        "Place two familiar objects side by side and name one color once. Invite the child to hand you an item, point to a match, or choose which object should sit near Nour's picture. Then stop. The adult can repeat the word naturally when clearing the table, but does not need to request several rounds. A quick activity should fit the rhythm of eating, cleaning hands, and family conversation.",
        "For example, put a green napkin and a blue cup next to a printed Nour scene. Say 'green 綠 lǜ' while touching the napkin, then ask whether the cup or napkin belongs beside the leaf in the picture. If the child chooses the cup, talk about what caught their attention instead of saying wrong. If the scene is distracting from eating, turn it over and return to dinner.",
        "Notice whether the objects are accessible and the choice is comfortable. A child may prefer observing, may be using a mobility aid, or may not distinguish the colors named by the adult. Let texture, shape, or location be an alternative. The family is not gathering a color-recognition score; the adult is simply adapting how to share one word in context.",
        "The low-ink mat below uses outlines rather than filled color blocks. Draw or point to a cup, napkin, and leaf; write one target word beside each and leave a large blank space for the child to place a safe object. It can be copied on plain paper, or skipped entirely in favor of pointing at the table. No special cards, paint, food dye, or purchase are needed.",
        "Do not use small loose items, allergens, hot dishes, knives, or choking hazards as manipulatives. Keep food for eating unless the family already has a safe sensory-play setup away from mealtime. Avoid forcing a child to touch or taste anything. If meals are stressful, keep this game out of the routine; feeding, accessibility, and safety come first. Ask a qualified professional about individual feeding or vision concerns.",
      ],
      zh: [
        "晚餐已經開始：桌上有藍色杯子、咖啡色桌墊和綠色餐巾。與其先準備一份特別學習單，不如讓努爾的顏色故事指向全家看得到的物品。只挑兩件已經在餐桌上、拿取安全的東西。目的是一起觀察一下，不是讓孩子坐更久，也不是大人解釋詞彙時暫停大家吃飯。",
        "選一組在房間裡容易分辨的顏色，例如紅色和藍色，先用家庭最熟悉的語言說明，再由成人加入一個自己確認讀音的中文標記。燈光、材質與孩子視覺狀況都會影響顏色詞是否好用，所以不能拿配對結果考孩子。若孩子用不同名稱或只指物件，也接受他的貢獻，接著用餐。",
        "把兩件熟悉物品放在一起，說一次顏色，邀請孩子遞給你、指向相同顏色，或選一件放在努爾圖片旁邊，然後就停。成人收桌子時可以自然再說一次，但不用要求好幾輪。簡短活動要配合用餐、洗手與家庭談話原本的節奏。",
        "例如把綠餐巾和藍杯子放在努爾故事圖旁。成人摸著餐巾說「green，綠，lǜ」，接著問孩子想讓杯子還是餐巾陪圖片裡的葉子。孩子若選杯子，就聊聊他注意到什麼，而不是說錯了。如果故事圖已經讓孩子分心，就翻過去，回到晚餐。",
        "注意物品是否好拿，選擇是否舒服。孩子可能想在旁邊看，可能使用輔具，或不容易分辨成人說的顏色。此時可改用觸感、形狀或位置作提示。家庭不是在收集顏色辨識分數；成人只是在調整如何把一個詞放進具體情境。",
        "下面的低墨水顏色墊用輪廓取代整塊彩色底圖。畫出或指向杯子、餐巾與葉子，在旁邊寫一個目標詞，並留大一點的空白讓孩子放安全物件。可直接影印在普通紙上，也可以完全略過，改成指向桌面。無須特殊卡片、顏料、食用色素或購買用品。",
        "不要把小型散件、過敏原、熱盤子、刀具或可能噎到的物品拿來操作。除非家庭原本就有遠離用餐區的安全感官遊戲安排，否則食物應留給吃飯。不要強迫孩子觸摸或嘗試。若用餐本來就有壓力，就完全不加遊戲；進食、無障礙與安全優先。有個別餵食或視覺疑慮時，請諮詢合格專業人員。",
      ],
      ar: [
        "بدأ العشاء بالفعل: كوب أزرق ومفرش بني ومنديل أخضر في المتناول. بدل تحضير ورقة خاصة، دعوا قصة نور تشير إلى شيء تراه الأسرة. اختاروا غرضين آمنين موجودين ضمن الوجبة. الهدف ملاحظة قصيرة مشتركة، لا إبقاء الطفل جالسًا ولا تأخير الطعام بينما يشرح البالغ مفردات.",
        "اختاروا زوجًا يسهل تمييزه في المكان مثل الأحمر والأزرق، واشرحوا الاختيار بلغة الأسرة الأقوى. أضيفوا تسمية صينية واحدة بعد أن يتحقق البالغ من نطقها. تتغير فائدة اللون حسب الضوء والمادة ورؤية الطفل؛ فلا تحولوا المطابقة إلى اختبار. إذا استخدم الطفل تسمية أخرى أو أشار بصمت فاقبلوا مشاركته وتابعوا الوجبة.",
        "ضعوا غرضين مألوفين جنبًا إلى جنب وسموا لونًا مرة. ادعوا الطفل إلى تسليم غرض أو الإشارة إلى لون أو اختيار ما يوضع بجانب صورة نور ثم توقفوا. يمكن للبالغ تكرار الكلمة طبيعيًا عند رفع المائدة ولا حاجة لطلب جولات متعددة. ينبغي أن ينسجم النشاط السريع مع الأكل وغسل اليدين والحديث العائلي.",
        "ضعوا مثلًا منديلًا أخضر وكوبًا أزرق قرب صورة نور. قولوا green و綠 وlǜ عند لمس المنديل، ثم اسألوا أيهما يوضع قرب الورقة في الصورة. إذا اختار الطفل الكوب فتحدثوا عما لفت انتباهه بدل قول خطأ. وإذا شغلت الصورة الطفل عن الأكل فقلبوها وعادوا للعشاء.",
        "لاحظوا سهولة الوصول إلى الأغراض وارتياح الطفل للاختيار. قد يفضل الطفل المشاهدة أو يستخدم وسيلة حركة أو لا يميز اللون الذي سماه البالغ. يمكن استخدام الملمس أو الشكل أو المكان بدلًا منه. لا تجمع الأسرة درجة لتمييز الألوان؛ بل يكيف البالغ مشاركة كلمة ضمن موقف حقيقي.",
        "يستخدم بساط الألوان منخفض الحبر أدناه خطوطًا خارجية بدل مساحات ملونة. ارسموا كوبًا ومنديلًا وورقة، واكتبوا كلمة مستهدفة قرب كل واحد واتركوا مساحة واسعة لوضع غرض آمن. يمكن نسخه على ورق عادي أو تركه والإشارة إلى المائدة. لا تحتاج الأسرة إلى بطاقات خاصة أو طلاء أو ملون طعام أو شراء.",
        "لا تستخدموا قطعًا صغيرة أو مسببات حساسية أو أطباقًا ساخنة أو سكاكين أو أشياء قد تسبب اختناقًا. اتركوا الطعام للأكل إلا إذا كانت لدى الأسرة مساحة لعب حسي آمنة بعيدًا عن الوجبة. لا تجبروا الطفل على اللمس أو التذوق. إذا كان الطعام متوترًا فاتركوا اللعبة؛ فالتغذية وسهولة الوصول والسلامة أولى. استشيروا مختصًا لمخاوف فردية بشأن الأكل أو الرؤية.",
      ],
    },
    {
      headings: localized(
        ["Use the table that is already set", "Choose visible words, not a color quiz", "Make one invitation and end the turn", "Connect a real object to Nour's picture", "Adapt the cue to access and perception", "Copy the low-ink color mat", "Keep mealtime safety in charge"],
        ["直接用已經擺好的餐桌", "挑看得到的詞，不做顏色測驗", "邀請一次就結束這一輪", "把真實物件放進努爾圖片", "依孩子的使用方式調整提示", "影印低墨水顏色墊", "用餐安全始終優先"],
        ["استخدموا المائدة الجاهزة", "اختاروا كلمات مرئية لا اختبار ألوان", "قدموا دعوة واحدة وأنهوا الدور", "اربطوا غرضًا حقيقيًا بصورة نور", "كيفوا الإشارة وفق الوصول والرؤية", "انسخوا بساط الألوان منخفض الحبر", "اجعلوا سلامة الطعام أولًا"]
      ),
      today: localized("Point to two safe objects already on the table, name one color in the family language, add a checked Chinese word, and return to the meal.", "指兩件餐桌上安全物品，用家庭語言說一個顏色，再加一個成人確認過的中文詞，接著回去吃飯。", "أشيروا إلى غرضين آمنين على المائدة وسموا لونًا بلغة الأسرة وأضيفوا كلمة صينية متحققًا منها ثم عودوا إلى الطعام."),
      notes: {
        en: [
          "No setup is a feature, not a missing lesson. If the table has no safe objects to move, an adult can point from their seat or skip the activity. The family does not need a printable page for the word to be meaningful. Make the smallest change that keeps the meal comfortable.",
          "Color names can be culturally and linguistically specific. An adult should use the label they know and avoid asking a child to prove it. If two objects differ in shape or texture, those features may attract attention before color; describe what is visible without ranking the response.",
          "One turn might take less than a minute. The adult names, points, and lets the child choose; then the adult resumes serving food or conversation. Do not repeat the invitation if the child is chewing, reaching for food, or attending to another person.",
          "Nour's illustration can be turned face down after one comparison. That keeps the story connected while respecting the meal. The family can also use a blank napkin as a drawing surface later, away from food, if art is already part of the child's play.",
          "A child who cannot see a color contrast may use object location or touch instead. Provide larger, stable items and keep them within reach without requiring grasp. Ask before moving a child's cup or plate. This simple adaptation is not a clinical vision exercise.",
          "The mat has outlines for three ordinary objects and a blank area. Adults can photocopy the page in grayscale, enlarge it, or redraw it with a thick pen. Write the target word in one language or two, depending on what the adult can comfortably say. The mat should never be placed under hot cookware or near spills that create a hazard.",
          "Use only items the child can handle safely under the family's usual supervision. Keep allergies, choking risk, hot liquids, and sharp utensils in mind. Mealtimes vary widely; a child who needs support to eat should receive that support without a language activity competing for attention.",
        ],
        zh: [
          "不用準備材料是這個遊戲的特色，不是少上一堂課。餐桌上若沒有適合移動的安全物品，成人可坐在原位指一指，或直接跳過。讓詞語有意義不需要列印頁；只做最小的調整，維持用餐舒服即可。",
          "顏色詞會依文化與語言而不同。成人用自己確認過的名稱，不要要求孩子證明知道答案。若兩件物品形狀或觸感不同，孩子可能先注意那些特徵；只描述看見的事，不替回應打排名。",
          "一輪可能不到一分鐘：成人命名、指物，讓孩子選擇，接著繼續添飯或聊天。孩子正在咀嚼、伸手拿食物，或專注和家人互動時，就不要重複邀請。",
          "比較過一次後，可以把努爾故事圖翻面收好，讓故事仍與生活相連，同時尊重用餐。若畫畫本來就是孩子的遊戲之一，稍後離開食物再用空餐巾紙作畫也可以。",
          "若孩子看不出顏色差異，可改用物品位置或觸感。提供較大、穩定的物品，放在伸手可及處，但不要求孩子一定抓取。移動孩子的杯子或盤子前先詢問。這種簡單調整不是臨床視覺訓練。",
          "顏色墊只有三種日常物品外框與一塊空白區。成人可以灰階影印、放大，或用粗筆重畫。目標詞寫一種或兩種語言都可以，以成人念起來自在為準。紙張不能放在熱鍋下方，也不要放在容易灑出液體造成危險的地方。",
          "只能使用孩子在家庭原有看顧方式下能安全操作的物品，並留意過敏、噎食、熱飲與尖銳餐具。每個家庭的用餐狀況不同；需要協助進食的孩子應先得到照護，不應讓語言活動分散注意力。",
        ],
        ar: [
          "عدم التحضير ميزة لا درس ناقص. إذا لم يوجد غرض آمن لتحريكه يستطيع البالغ الإشارة من مكانه أو ترك النشاط. لا تحتاج الأسرة إلى ورقة مطبوعة كي تصبح الكلمة ذات معنى. أجروا أصغر تغيير يبقي الوجبة مريحة.",
          "تختلف أسماء الألوان بين الثقافات واللغات. استخدموا التسمية التي يعرفها البالغ ولا تطلبوا من الطفل إثباتها. إن اختلف شكل الغرضين أو ملمسهما فقد يلفت ذلك الانتباه قبل اللون؛ صفوا الظاهر من دون ترتيب الإجابات.",
          "قد لا يستغرق الدور دقيقة. يسمي البالغ ويشير ويدع الطفل يختار ثم يعود إلى تقديم الطعام أو الحديث. لا تكرروا الدعوة إذا كان الطفل يمضغ أو يصل إلى الطعام أو يصغي إلى شخص آخر.",
          "يمكن قلب صورة نور بعد مقارنة واحدة. تبقى القصة مرتبطة بالحياة مع احترام الوجبة. ويمكن للأسرة لاحقًا استخدام منديل فارغ للرسم بعيدًا عن الطعام إذا كان الرسم جزءًا من لعب الطفل.",
          "إذا لم يميز الطفل بين الألوان فاستخدموا المكان أو الملمس. قدموا أشياء كبيرة وثابتة وفي المتناول من دون اشتراط الإمساك. اسألوا قبل تحريك كوب الطفل أو طبقه. هذا التكيف البسيط ليس تمرينًا سريريًا للرؤية.",
          "يحتوي البساط على خطوط لأغراض عادية ومساحة فارغة. يستطيع البالغ نسخه بتدرج رمادي أو تكبيره أو إعادة رسمه بقلم عريض. اكتبوا الكلمة بلغة أو لغتين وفق راحة البالغ. لا تضعوه تحت أوان ساخنة أو قرب انسكاب يشكل خطرًا.",
          "استخدموا فقط أشياء يمكن للطفل التعامل معها بأمان وتحت إشراف الأسرة المعتاد. راعوا الحساسية وخطر الاختناق والسوائل الساخنة والأدوات الحادة. تختلف وجبات الأسر؛ والطفل الذي يحتاج مساعدة للأكل يجب أن يتلقاها بلا نشاط لغوي ينافس الانتباه.",
        ],
      },
      sources: [
        ["childcarePlay", localized("Summarizes how play can create conversational language moments; it does not claim that this color game teaches a fixed skill.", "整理遊戲如何帶出語言互動；不宣稱本顏色遊戲會教會固定技能。", "يلخص كيف يتيح اللعب لحظات لغوية ولا يدعي أن لعبة الألوان تعلم مهارة محددة.")],
        ["naeycGuidedPlay", localized("Discusses child agency in guided play; it does not endorse testing color recognition at meals.", "說明引導遊戲中的孩子主動性；不支持用餐時測驗顏色辨識。", "يناقش مبادرة الطفل في اللعب الموجه ولا يوصي باختبار الألوان أثناء الطعام.")],
        ["cdcRoutines", localized("Gives examples of family routines including mealtime; it does not require a learning activity at dinner.", "舉例說明包括用餐在內的家庭流程；不要求晚餐加入學習活動。", "يقدم أمثلة لروتين الأسرة ومنها الوجبات ولا يفرض نشاط تعلم أثناء العشاء.")],
      ],
      links: ["three-chinese-words-a-day", "chinese-storytime-for-arabic-speaking-families", "pinyin-and-tones-for-parents"],
    },
    localized("Notice · name · choose", "看見・命名・選擇", "لاحظوا · سموا · اختاروا"),
  ),
];

export const ROUND3_EDITORIAL_DEPTH = {
  "koko-feelings-at-bedtime": {
    headings: ROUND3_GUIDES[0] && localized(
      ["Keep the bedtime promise small", "Offer a feeling as a guess", "Let home language settle the scene", "Try one page and one gentle response", "Read the ending, not the child's score", "Use the one-feeling cue card", "When bedtime needs a different kind of support"],
      ["把睡前承諾縮小", "把情緒當成猜想來分享", "用家庭語言安頓畫面", "只試一頁與一個回應", "看結尾是否平靜，不看孩子得幾分", "使用單一情緒提示卡", "什麼時候該換一種支持方式"],
      ["صغروا وعد وقت النوم", "قدموا الشعور كتخمين", "دعوا لغة البيت تهدئ المشهد", "جربوا صورة وردًا لطيفًا واحدًا", "لاحظوا النهاية لا درجة الطفل", "استخدموا بطاقة الشعور الواحد", "متى يحتاج النوم إلى دعم مختلف"]
    ),
    today: localized("Choose one Koko picture, name one possible feeling in your family language, and close the story before the bedtime routine stretches.", "今晚挑一張 Koko 圖，用家庭語言說一個可能的感覺，接著按原定睡前流程收尾。", "اختاروا صورة واحدة من Koko وسموا شعورًا محتملًا بلغة الأسرة ثم أغلقوا القصة قبل أن يطول روتين النوم."),
    notes: {
      en: ["Say what happens next: one picture, then teeth or lights out. Predictability helps adults keep a kind boundary and keeps the child from being surprised when the book closes. Acknowledge a wish for more without bargaining or adding a lesson.", "Use 'maybe' or 'looks like' because the picture cannot identify the child's feeling. If naming a feeling increases distress, stop and offer ordinary comfort. The story can wait.", "The adult's fluent language can carry reassurance. Add an English label as an echo, or skip it. Bedtime is not a test of using two languages consistently.", "Notice posture and one visible clue, then wait. Avoid a rapid series of questions. If the moment stays calm, one sentence is enough.", "A calm ending is useful feedback about timing, not proof of a health or learning outcome. Adjust tomorrow without asking the child to demonstrate recall tonight.", "The card pairs a visual clue, one feeling word, and a possible next step. It can be printed in grayscale or copied onto scrap paper; it does not tell the child what to do.", "Adjust for sensory, disability, cultural, and schedule needs. Seek qualified guidance for persistent sleep or emotional concerns; a story does not provide treatment."],
      zh: ["開始得晚時先說清楚看一張圖後就刷牙或關燈，讓結束可以預期。孩子還想看，可以承認他的期待，但不用討價還價或加一堂課。", "圖片不能判定孩子心裡的感覺，因此用「可能」或「看起來」留有空間。命名讓孩子更不舒服時就停止，故事改天再看。", "成人最熟悉的語言可以承載安慰；英文詞只是回聲，也可以略過。睡前不是檢查兩種語言是否使用一致的場合。", "看一個姿勢或一個可見線索，再停下來等。避免連續追問；時刻仍平靜時，一句話已足夠。", "平靜收尾能幫成人判斷時間，不證明健康或學習成果。明天調整即可，不必今晚驗收孩子是否記得。", "卡片把視覺線索、一個情緒詞與一個可能步驟放在一起，可灰階列印或抄在廢紙，不替孩子規定行動。", "依感官、身心障礙、文化與作息需求調整。持續睡眠或情緒疑慮應找合格專業人員，故事不是治療。"],
      ar: ["قولوا ما سيحدث تاليًا: صورة واحدة ثم الأسنان أو إطفاء الضوء. يمنح الوضوح حدًا لطيفًا ويمنع مفاجأة الطفل عند الإغلاق. اعترفوا برغبته في المزيد من دون تفاوض أو درس إضافي.", "استخدموا ربما أو يبدو لأن الصورة لا تحدد شعور الطفل. إذا زادت التسمية الضيق فأوقفوا النشاط وقدموا مواساة عادية. يمكن للقصة أن تنتظر.", "تحمل اللغة الأقوى لدى البالغ الطمأنة. أضيفوا تسمية إنجليزية كصدى أو اتركوها؛ فالنوم ليس اختبار اتساق اللغتين.", "لاحظوا وقفة واحدة أو علامة بصرية ثم انتظروا. تجنبوا سلسلة أسئلة. تكفي جملة واحدة إذا بقي الجو هادئًا.", "تساعد النهاية الهادئة على تقدير التوقيت ولا تثبت نتيجة صحية أو تعليمية. عدلوا الغد من دون اختبار التذكر الليلة.", "تجمع البطاقة علامة بصرية وكلمة شعور وخطوة محتملة. يمكن نسخها رماديًا ولا تملي على الطفل ما يفعل.", "كيفوا الروتين للاحتياجات الحسية والإعاقة والثقافة والجدول. اطلبوا إرشادًا مؤهلًا للمشكلات المستمرة؛ فالقصة لا تعالج."],
    },
    sources: [["healthyChildrenEmotions", localized("Supports predictable routines and naming feelings; it does not validate this activity or assess a child.", "支持可預期作息與描述感覺；不代表認可活動或評估個別孩子。", "يدعم الروتين المتوقع وتسمية الشعور ولا يقر النشاط أو يقيم طفلًا.")], ["healthyChildrenBedtime", localized("Offers bedtime routine guidance without prescribing one story length for every family.", "提供睡前流程建議，不規定所有家庭的故事長度。", "يقدم إرشادًا لروتين النوم ولا يفرض مدة قصة واحدة.")], ["cdcRoutines", localized("Describes simple family routines; it does not promise sleep or language outcomes.", "說明簡單家庭流程；不保證睡眠或語言成果。", "يشرح روتين الأسرة ولا يضمن نتائج للنوم أو اللغة.")]],
    links: ["feelings-words-through-stories", "three-minute-chinese-routine", "repetition-without-pressure"],
  },
  "koko-brave-after-a-hard-day": {
    headings: localized(["Ask before offering a story", "Make room for several meanings of brave", "Give rest equal status", "Use a real choice after Koko's setback", "Notice the child's lead without labeling", "Keep the two-choice reset card nearby", "When the problem needs adult action"], ["先問孩子要不要聽故事", "讓勇敢有不只一種意思", "把休息當成同等選擇", "用真實選項回應 Koko 的挫折", "跟隨孩子，不急著貼標籤", "備妥雙選項重新開始卡", "何時需要成人處理真實問題"], ["اسألوا قبل اقتراح القصة", "اتركوا للشجاعة معاني متعددة", "اجعلوا الراحة خيارًا مكافئًا", "قدموا اختيارًا حقيقيًا بعد تعثر Koko", "اتبعوا الطفل من دون وصف ثابت", "احتفظوا ببطاقة الخيارين", "متى يتطلب الأمر تدخل البالغ"]),
    today: localized("Ask whether the child wants the story. If yes, offer one picture and two genuine next steps: try a tiny action or rest.", "先問孩子願不願意聽；願意的話只看一張圖，再提供「做一小步」或「先休息」兩個真選項。", "اسألوا إن كان الطفل يريد القصة. إن وافق فاعرضوا صورة واحدة وخطوتين حقيقيتين: تجربة صغيرة أو راحة."),
    notes: { en: ["Invite once and pause; the child owes no explanation for declining. Do not keep asking until the answer changes.", "Praise can sound like a demand. Describe what Koko did and allow the child to decide what mattered.", "Rest can be an active choice: leave the page and return when energy allows. Water, quiet, or no activity may fit.", "Accept either help or space unless immediate safety requires adult action. Do not disguise a preferred answer as a choice.", "Silence, refusal, or changing the subject are meaningful cues, not fixed personality labels or public performance notes.", "Point to 'one small try' or 'pause'. Keep the card simple, never a token chart, and set it aside if it adds pressure.", "Address real safety issues with appropriate adults or services. A vocabulary phrase cannot resolve bullying, injury, or threats."], zh: ["邀請一次後就停下來等；孩子拒絕不必解釋。不要一直問到答案改變。", "稱讚有時聽起來像要求。描述 Koko 做了什麼，讓孩子自己決定注意哪裡。", "休息可以是主動選擇：先放下故事，體力回來再看。喝水、安靜或不做事都可能合適。", "只要不是立即安全需要，大人就接受要幫忙或想獨處其中一種，不要把偏好的答案包裝成選擇。", "安靜、拒絕或改變話題都是當下線索，不是固定性格標籤，也不該公開記成表現。", "指向「試一小步」或「先停下」。卡片保持簡單，不做集點表；增加壓力就收起。", "真實安全問題要交由合適成人或服務處理；一個詞語不能解決霸凌、受傷或威脅。"], ar: ["ادعوا مرة وانتظروا؛ لا يدين الطفل بتفسير الرفض. لا تكرروا السؤال حتى تتغير الإجابة.", "قد يبدو المديح طلبًا. صفوا ما فعلته Koko ودعوا الطفل يحدد ما يهمه.", "الراحة اختيار نشط: اتركوا الصفحة وعودوا عند توفر الطاقة. قد يناسب ماء أو هدوء أو لا شيء.", "اقبلوا المساعدة أو المساحة ما لم تتطلب السلامة تدخلًا فوريًا. لا تخفوا الإجابة المفضلة داخل سؤال اختيار.", "الصمت أو الرفض أو تغيير الموضوع إشارات وليست أوصافًا ثابتة أو ملاحظات أداء عامة.", "أشيروا إلى محاولة صغيرة أو وقفة. أبقوا البطاقة بسيطة وليست جدول رموز واتركوها إذا سببت ضغطًا.", "عالجوا مشكلات السلامة مع بالغين أو خدمات مناسبة؛ لا تحل كلمة مفردات تنمرًا أو أذى أو تهديدًا."]},
    sources: [["headStartFeelings", localized("Suggests naming feelings in daily routines and stories; it is not an assessment.", "建議在日常與故事中描述感覺；不是評估。", "يقترح تسمية المشاعر في الروتين والقصص وليس تقييمًا.")], ["cdcEmotionCoaching", localized("Outlines listening and emotion coaching; it does not require a story conversation.", "整理傾聽與情緒引導；不要求一定在故事中談感受。", "يعرض الإصغاء ومرافقة المشاعر ولا يفرض حوارًا قصصيًا.")], ["harvardServeReturnParents", localized("Describes responsive exchanges; it does not measure courage or promise this card's results.", "說明回應互動；不衡量勇敢，也不保證卡片成效。", "يشرح التبادل المستجيب ولا يقيس الشجاعة أو يضمن نتائج البطاقة.")]],
    links: ["repetition-without-pressure", "english-storytime-without-fluent-english", "feelings-words-through-stories"],
  },
  "nour-hello-goodbye-at-the-door": {
    headings: localized(["Start with the greeting your family already uses", "Pick one arrival phrase and one leaving phrase", "Attach words to a real door transition", "Let gestures complete the exchange", "Notice friction instead of scoring speech", "Make a two-sided doorway strip", "When the doorway is too busy for practice"], ["先保留家裡原本的問候", "選一個進門詞與一個離開詞", "把短句接在真實進出門流程裡", "手勢也能完成交流", "看流程是否卡住，不替說話打分", "做一張門口雙面提示條", "門口太忙時就先不練"], ["ابدأوا بتحية الأسرة المعتادة", "اختاروا عبارة للوصول وأخرى للمغادرة", "اربطوا الكلمات بانتقال حقيقي", "تكمل الحركة التبادل أيضًا", "لاحظوا الاحتكاك لا تقيموا الكلام", "اصنعوا شريط باب بوجهين", "اتركوا التدريب عندما ينشغل المدخل"]),
    today: localized("Choose one real arrival today. Keep the Arabic greeting, add one Chinese phrase if it fits, and accept a wave or quiet response.", "今天挑一次真實迎接：先照常說阿語，合適時加一個中文短句，揮手或安靜都算可以。", "اختاروا وصولًا حقيقيًا اليوم. حافظوا على التحية العربية وأضيفوا عبارة صينية إن ناسبت واقبلوا التلويح أو الصمت."),
    notes: { en: ["Choose a welcome already used at home; Chinese can follow it or be skipped on busy days.", "Check pinyin with a reliable audio model. The adult can say the phrase once without asking a child to repeat it.", "Only use the cue when the adult can supervise the person and the entry safely. It must not delay travel.", "A wave, nod, or smile can replace speech. Do not require touch or eye contact to prove politeness.", "Ease of transition is useful; spoken output is not the only sign that the routine has meaning.", "Copy two sides for arrival and leaving, with an arrow and a gesture symbol. Large print helps a quick glance.", "Skip a crowded or unsafe doorway. There is no need to recreate a rushed moment as a lesson."], zh: ["先用家裡原本代表歡迎的說法；中文可接著用，忙碌時也可略過。", "用可靠音檔確認拼音。成人說一次即可，不必要求孩子跟讀。", "只有成人能同時照看訪客與出入口安全時才使用，不可延誤出門。", "揮手、點頭或微笑可以取代口說；不以碰觸或眼神接觸證明有禮貌。", "轉換順不順是實用線索；口說不是這個流程有意義的唯一證據。", "到家和離開分兩面，畫方向箭頭與手勢圖示；字體放大方便瞄一眼。", "玄關擁擠或不安全時就略過，不必重演匆忙情境當成課程。"], ar: ["ابدأوا بتحية تدل على الترحيب في البيت؛ يمكن إضافة الصينية أو تركها يوم الازدحام.", "تحققوا من Pinyin بصوت موثوق. تكفي كلمة البالغ ولا حاجة لتكرار الطفل.", "استخدموا الإشارة عندما يمكن الإشراف بأمان؛ يجب ألا تؤخر الخروج.", "يمكن أن يحل التلويح أو الإيماء أو الابتسام محل الكلام. لا تشترطوا اللمس أو النظر.", "سهولة الانتقال إشارة عملية؛ والكلام ليس الدليل الوحيد على معنى الروتين.", "انسخوا جهتين للوصول والمغادرة وارسموا سهمًا ورمز حركة بخط كبير.", "اتركوا التدريب عند ازدحام المدخل أو عدم أمانه؛ لا تعيدوا موقف استعجال كدرس."]},
    sources: [["naeycTransition", localized("Shows how familiar home-language messages may support transitions; it does not prescribe this Chinese routine.", "說明熟悉的家庭語言訊息如何支持轉換；不規定本中文流程。", "يوضح دعم لغة البيت للانتقال ولا يفرض هذا الروتين الصيني.")], ["cdcCommunication", localized("Discusses caregiver communication and nonverbal responses; speech is not the only greeting.", "說明成人溝通與非口語回應；口說不是唯一招呼方式。", "يناقش تواصل مقدم الرعاية والإشارات غير اللفظية؛ الكلام ليس التحية الوحيدة.")], ["naeycFamilyKnowledge", localized("Highlights family language knowledge; it does not evaluate the doorway strip.", "強調家庭語言知識；不評估門口提示條。", "يبرز معرفة الأسرة بلغاتها ولا يقيم شريط الباب.")]],
    links: ["chinese-storytime-for-arabic-speaking-families", "pinyin-and-tones-for-parents", "three-chinese-words-a-day"],
  },
  "nour-colors-at-the-table": {
    headings: localized(["Use the table that is already set", "Choose visible words, not a color quiz", "Make one invitation and end the turn", "Connect a real object to Nour's picture", "Adapt the cue to access and perception", "Copy the low-ink color mat", "Keep mealtime safety in charge"], ["直接用已經擺好的餐桌", "挑看得到的詞，不做顏色測驗", "邀請一次就結束這一輪", "把真實物件放進努爾圖片", "依孩子的使用方式調整提示", "影印低墨水顏色墊", "用餐安全始終優先"], ["استخدموا المائدة الجاهزة", "اختاروا كلمات مرئية لا اختبار ألوان", "قدموا دعوة واحدة وأنهوا الدور", "اربطوا غرضًا حقيقيًا بصورة نور", "كيفوا الإشارة وفق الوصول والرؤية", "انسخوا بساط الألوان منخفض الحبر", "اجعلوا سلامة الطعام أولًا"]),
    today: localized("Point to two safe objects already on the table, name one color in the family language, add a checked Chinese word, and return to the meal.", "指兩件餐桌上安全物品，用家庭語言說一個顏色，再加一個成人確認過的中文詞，接著回去吃飯。", "أشيروا إلى غرضين آمنين على المائدة وسموا لونًا بلغة الأسرة وأضيفوا كلمة صينية متحققًا منها ثم عودوا إلى الطعام."),
    notes: { en: ["No setup is a feature. If nothing safe can be moved, point from your seat or skip the activity.", "Color names vary by language and perception. Describe rather than ask a child to prove a label.", "One turn can take under a minute. Do not repeat while the child is eating or attending to someone else.", "Turn Nour's picture over after one comparison and return to the meal; the story remains a prompt, not a task.", "Use location, shape, or texture when a color contrast is not accessible. Ask before moving a cup or plate.", "Copy the outline mat in grayscale or redraw it with a thick pen. Keep it away from hot items and spills.", "Avoid allergens, small pieces, heat, and sharp utensils. Mealtime support and safety come before word play."], zh: ["不用準備材料是特色。沒有安全物件可移動時，成人坐著指一指或直接略過。", "顏色名稱依語言與視覺感受而異。描述眼前物品，不要求孩子證明他懂。", "一輪不到一分鐘也夠。孩子吃東西或正在和別人互動時不要重複邀請。", "比對一次就把努爾圖片翻面，回到用餐；故事只是提示，不是任務。", "顏色差異看不清時改用位置、形狀或觸感。移動杯盤前先詢問。", "顏色墊可灰階影印或用粗筆重畫，遠離熱物與容易潑灑的位置。", "避開過敏原、小物件、熱源與尖銳餐具。用餐照護與安全優先於玩詞語。"], ar: ["عدم التحضير ميزة. إذا لم يوجد غرض آمن فاشيروا من المكان أو اتركوا النشاط.", "تختلف أسماء اللون حسب اللغة والرؤية. صفوا ولا تطلبوا من الطفل إثبات التسمية.", "يكفي دور قصير. لا تكرروا الدعوة أثناء الأكل أو تواصل الطفل مع شخص آخر.", "اقلبوا صورة نور بعد المقارنة وعادوا إلى الوجبة؛ القصة إشارة لا مهمة.", "استخدموا المكان أو الشكل أو الملمس إذا تعذر تمييز اللون. اسألوا قبل تحريك الكوب.", "انسخوا البساط رماديًا أو أعيدوا رسمه بقلم عريض وأبعدوه عن الحرارة والانسكاب.", "تجنبوا مسببات الحساسية والقطع الصغيرة والحرارة والأدوات الحادة. السلامة أولى من الكلمات."]},
    sources: [["childcarePlay", localized("Summarizes language moments during play; it does not claim this game teaches a fixed skill.", "整理遊戲中的語言互動；不宣稱本遊戲教會固定技能。", "يلخص فرص اللغة في اللعب ولا يدعي أن اللعبة تعلم مهارة ثابتة.")], ["naeycGuidedPlay", localized("Discusses child agency in guided play; it does not endorse testing colors at meals.", "說明引導遊戲中的孩子主動性；不支持餐桌顏色測驗。", "يناقش مبادرة الطفل في اللعب الموجه ولا يقر اختبار الألوان أثناء الطعام.")], ["cdcRoutines", localized("Includes family routine examples; it does not require adding lessons to dinner.", "提供家庭作息例子；不要求晚餐加入課程。", "يقدم أمثلة لروتين الأسرة ولا يفرض درسًا على العشاء.")]],
    links: ["three-chinese-words-a-day", "chinese-storytime-for-arabic-speaking-families", "pinyin-and-tones-for-parents"],
  },
};

export const ROUND3_EDITORIAL_SOURCE_LIBRARY = {
  healthyChildrenEmotions: ["HealthyChildren.org: Healthy Mental & Emotional Development", "https://www.healthychildren.org/English/healthy-living/emotional-wellness/Building-Resilience/Pages/healthy-mental-and-emotional-development-in-children-key-building-blocks.aspx"],
  healthyChildrenBedtime: ["HealthyChildren.org: Bedtime Routines for School-Aged Children", "https://www.healthychildren.org/English/healthy-living/sleep/Pages/Bedtime-Routines-for-School-Aged-Children.aspx"],
  cdcRoutines: ["CDC: Tips for Relying on Routines and Rules", "https://www.cdc.gov/parenting-toddlers/structure-rules/index.html"],
  headStartFeelings: ["Head Start: Teaching Your Child About Feelings", "https://headstart.gov/publication/teaching-your-child-about-feelings"],
  cdcEmotionCoaching: ["CDC: Tips for Noticing and Naming Emotions", "https://www.cdc.gov/parenting-toddlers/noticing-and-naming/emotion-coaching.html"],
  harvardServeReturnParents: ["Harvard Center on the Developing Child: 5 Steps for Brain-Building Serve and Return", "https://developingchild.harvard.edu/resources/briefs/5-steps-for-brain-building-serve-and-return/"],
  naeycTransition: ["NAEYC: Easing First Day Jitters", "https://www.naeyc.org/node/815"],
  cdcCommunication: ["CDC: Tips for Connecting and Communicating", "https://www.cdc.gov/parenting-toddlers/communication/index.html"],
  naeycFamilyKnowledge: ["NAEYC: What Parents Have to Teach Us About Their Dual Language Children", "https://www.naeyc.org/node/734"],
  childcarePlay: ["ChildCare.gov: Supporting Children's Learning Through Play", "https://www.childcare.gov/consumer-education/support-my-childs-health-development/supporting-childrens-learning-through-play"],
  naeycGuidedPlay: ["NAEYC: The Power of Playful Learning in the Early Childhood Setting", "https://www.naeyc.org/node/4596"],
};
