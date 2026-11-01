export function sisterSiteLink(locale) {
  const label = locale === 'zh' ? '姊妹站：ParentTech 家庭科技清單' : locale === 'ar' ? 'الموقع الشقيق: ParentTech Checklist — أدلة التقنية للعائلة' : 'Sister site: ParentTech Checklist — family tech setup guides';
  return `<a href="https://parenttechchecklist.com/?utm_source=fursay&amp;utm_medium=footer&amp;utm_campaign=sister_site">${label}</a>`;
}
