import { subscriptionNote } from "./subscription-note.mjs";
const copy = {
  en: ['Get this week’s story pack', 'One story, bilingual phrases, parent questions, and a printable activity.', 'Email address', 'Send me', 'Koko’s Forest story pack', 'Arabic Kids Chinese story pack', 'Send me the free story pack'],
  zh: ['取得本週故事包', '一個故事、雙語短句、親子問題和可列印活動。', '電子郵件', '我想收到', 'Koko 森林故事包', '努爾中文故事包', '寄給我免費故事包'],
  ar: ['احصلوا على حزمة قصة هذا الأسبوع', 'قصة وعبارات ثنائية اللغة وأسئلة للوالدين ونشاط قابل للطباعة.', 'البريد الإلكتروني', 'أرسلوا لي', 'حزمة قصص Koko', 'حزمة نور الصينية', 'أرسلوا الحزمة المجانية']
};
export function inlineSubscribe(locale, placement, slug = '', group = 'koko') {
  const c = copy[locale];
  const source = slug ? `guide_end_${slug}` : placement;
  return `<section class="inline-subscribe" aria-labelledby="inline-subscribe-title"><h2 id="inline-subscribe-title">${c[0]}</h2><p>${c[1]}</p><form data-subscribe-placement="${placement}" data-signup-source="${source}"${slug ? ` data-guide-slug="${slug}"` : ''}><div class="hp-field" aria-hidden="true"><label for="inline-website">Website</label><input type="text" id="inline-website" name="website" tabindex="-1" autocomplete="off"></div><div class="modal-field"><label for="inline-email">${c[2]}</label><input type="email" id="inline-email" autocomplete="email" required></div><fieldset><legend>${c[3]}</legend><label><input type="checkbox" name="groups" value="koko"${group === 'koko' ? ' checked' : ''}> ${c[4]}</label><label><input type="checkbox" name="groups" value="noor"${group === 'noor' ? ' checked' : ''}> ${c[5]}</label></fieldset>${subscriptionNote(locale)}<button type="submit" class="modal-submit">${c[6]}</button><p class="modal-note is-hidden" role="status" aria-live="polite" aria-atomic="true"></p></form></section>`;
}
