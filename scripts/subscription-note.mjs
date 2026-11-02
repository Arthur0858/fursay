const notes = {
  "en": "<p class=\"subscription-note\">For parents and caregivers aged 18+. Receive packs for the language and story world you choose. Occasional, at most one email a week. We only use your email address to send these packs; unsubscribe any time. <a href=\"/privacy\">Privacy</a>.</p>",
  "zh": "<p class=\"subscription-note\">適合年滿 18 歲（18+）的家長與照顧者。接收你選擇的語言及故事世界的陪讀包。不定期，最多每週一封。我們只使用你的電子郵件地址寄送這些陪讀包；隨時可以取消訂閱。<a href=\"/zh/privacy\">隱私政策</a>。</p>",
  "ar": "<p class=\"subscription-note\">للآباء ومقدمي الرعاية البالغين (18+)؛ ستصلكم حزم اللغة وعالم القصص الذي تختارونه. رسائل غير منتظمة، بحد أقصى رسالة واحدة في الأسبوع. نستخدم عنوان بريدكم فقط لإرسال هذه الحزم، ويمكنكم إلغاء الاشتراك في أي وقت. <a href=\"/ar/privacy\">الخصوصية</a>.</p>"
};
export const subscriptionNote = locale => notes[locale] || notes.en;
