const books = {
  color: ['The Color Monster', '/go/amz-0316450014'],
  bilingual: ['My First Bilingual Picture Book (EN-AR)', '/go/amz-b0drvxfbmr'],
  feelings: ['The Feelings Book', '/go/amz-0316012491'],
  inMyHeart: ['In My Heart', '/go/amz-1419713108'],
  bucket: ['Have You Filled a Bucket Today?', '/go/amz-0996099948'],
  hotel: ['情緒大飯店', '/go/books-0010985365'],
  speak: ['我會好好說', '/go/books-0010960916'],
  bilingualZh: ['英阿雙語圖畫書', '/go/books-0010785383'],
  monsterZh: ['情緒怪獸', '/go/books-0010706003'],
  helloGoodbye: ['The Hello, Goodbye Window', '/go/amz-0786809140'],
  helloHello: ['Hello Hello', '/go/amz-1452150141'],
  brownBearGreetingsZh: ['Brown Bear, Brown Bear, What Do You See?', '/go/books-0010568432'],
  helloWorldZh: ['Hello, World!', '/go/books-0010661414'],
  brownBear: ['Brown Bear, Brown Bear, What Do You See?', '/go/amz-0805047905'],
  colors: ['My First Book of Colors', '/go/amz-0312527748'],
  brownBearZh: ['Brown Bear, Brown Bear, What Do You See?', '/go/books-0010785383'],
  colorsZh: ['My First Book of Colors', '/go/books-0010706003'],
};

const copy = {
  en: ['Books to continue the theme', 'These books extend the story theme and are not needed to finish the activity. Retailers control availability and editions; families can use the free sample without buying a book.', 'Some links may earn a small commission to support our free content.'],
  zh: ['延伸閱讀', '這些書延伸故事主題，完成活動不需要購書。書籍版本與供應情況由零售商決定；家庭不購書也能使用免費樣本。', '部分連結可能帶來少量聯盟佣金，支持我們的免費內容。'],
  ar: ['كتب لمتابعة الفكرة', 'توسع هذه الكتب موضوع القصة وليست مطلوبة لإكمال النشاط. يتحكم البائعون في توفر الكتب وطبعاتها، ويمكن للعائلة استخدام العينة المجانية دون شراء.', 'قد نحصل على عمولة صغيرة من بعض الروابط لدعم المحتوى المجاني.'],
};

export function productBooklist(locale, context, guide = null) {
  let keys = locale === 'zh'
    ? (context === 'hub' ? ['hotel', 'bilingualZh'] : ['hotel', 'speak'])
    : context === 'hub' ? ['color', 'bilingual']
      : context === 'guide' ? ['color', locale === 'ar' ? 'bilingual' : 'bucket']
        : ['color', 'feelings'];
  if (context === 'guide' && guide?.slug === 'bilingual-bedtime-books-for-toddlers') {
    keys = locale === 'zh' ? ['bilingualZh', 'monsterZh'] : ['bilingual', 'color'];
  } else if (context === 'guide' && guide?.slug === 'picture-books-for-naming-feelings') {
    keys = locale === 'zh' ? ['hotel', 'speak'] : ['feelings', 'inMyHeart'];
  } else if (context === 'guide' && guide?.world === 'noor') {
    if (guide.slug === 'nour-hello-goodbye-at-the-door') {
      keys = locale === 'zh' ? ['brownBearGreetingsZh', 'helloWorldZh'] : ['helloGoodbye', 'helloHello'];
    } else if (guide.slug === 'nour-colors-at-the-table') {
      keys = locale === 'zh' ? ['brownBearZh', 'colorsZh'] : ['brownBear', 'colors'];
    } else {
      keys = locale === 'zh' ? ['bilingualZh', 'monsterZh'] : ['color', 'bilingual'];
    }
  }
  const [heading, note, disclosure] = copy[locale];
  return `<style>@media print{.booklist-sec,#booklist{display:none!important}}</style><section class="booklist-sec" id="booklist"><h2>${heading}</h2><p class="booklist-editorial-note" data-booklist-editorial-note>${note}</p><ul>${keys.map((key) => `<li><a href="${books[key][1]}" rel="sponsored noopener" target="_blank">${books[key][0]}</a></li>`).join('')}</ul><p class="booklist-note">${disclosure}</p></section>`;
}
