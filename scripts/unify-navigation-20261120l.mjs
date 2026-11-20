import {readdirSync,readFileSync,writeFileSync,existsSync} from 'node:fs';
import {join,relative} from 'node:path';
const standard=[['/#channels','Stories'],['/#weekly-pack','Free pack'],['/products','Products'],['/#rhythm','How It Works'],['/guides','Parent guides'],['/about','About'],['/editorial-method','Editorial method']];
const esc=s=>s.replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;').replaceAll('>','&gt;');
const link=([href,label])=>`<a href="${esc(href)}">${esc(label)}</a>`;
function languageLinks(html, path, baseRoot) {
 const rel=relative(baseRoot,path).replaceAll("\\","/");
 const base="/"+rel.replace(/index\.html$/, "").replace(/\.html$/, "");
 const targets={};
 for(const [label,prefix] of [["EN",""],["中文","/zh"],["عربي","/ar"]]){
  const route=prefix+base;
  const file=join(baseRoot,route.replace(/^\//, ""));
  const exists=existsSync(route.endsWith("/")?join(file,"index.html"):`${file}.html`) || existsSync(join(file,"index.html"));
  targets[label]=exists?[route,label]:[prefix+"/",label==="EN"?"EN home":label==="中文"?"中文首頁":"العربية الرئيسية"];
 }
 return html.replace(/<nav\b[^>]*class="l3-nav"[^>]*>[\s\S]*?<\/nav>/,nav=>nav.replace(/<a href="[^"]*">(EN|中文|عربي)<\/a>/g,(_,label)=>link(targets[label])));
}
export function unifyNavigation(root, baseRoot=root){
 for(const e of readdirSync(root,{withFileTypes:true})){
  const path=join(root,e.name);if(e.isDirectory()){unifyNavigation(path,baseRoot);continue}if(!e.name.endsWith('.html'))continue;
  let s=readFileSync(path,'utf8');if(!/<html\b[^>]*\blang=["']en/i.test(s))continue;
  s=s.replace(/(<form\b[^>]*>[\s\S]*?<\/form\s*>|<textarea\b[^>]*>[\s\S]*?<\/textarea\s*>|<script\b[^>]*>[\s\S]*?<\/script\s*>|<style\b[^>]*>[\s\S]*?<\/style\s*>|<[^>]+>)|([^<]+)/gi,(m,tag,txt)=>tag || txt.replace(/\bNoor\b/g,'Nour'));
  if(s.includes('class="l3-nav"')){writeFileSync(path,languageLinks(s,path,baseRoot));continue;}
  const nav=s.match(/<nav\b[^>]*>[\s\S]*?<\/nav\s*>/i);
  const original=[];for(const a of (nav?.[0] || "").matchAll(/<a\b[^>]*\bhref=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)){
   let label=a[2].replace(/<[^>]*>/g,'').replace(/\s+/g,' ').trim();let href=a[1].replaceAll('&amp;','&');if(label)original.push([href,label]);
  }
  let langs=original.filter(x=>['EN','中文','عربي'].includes(x[1]));if(langs.length<3)langs=[['/','EN'],['/zh/','中文'],['/ar/','عربي']];
  const seen=new Set([...standard,...langs,['/','']].map(x=>x[0]));const extra=original.filter(x=>!seen.has(x[0]));
  const attrs = (nav?.[0] || "").match(/\bdata-[\w-]+(?:=(?:"[^"]*"|'[^']*'|[^\s>]+))?/g) || [];
  if (/\/(?:products|products\/(?:koko-printable|noor-worksheet))\.html$/.test(path) && !attrs.some(a => a.startsWith("data-editorial-nav"))) attrs.push("data-editorial-nav");
  const preservedData = [...new Set(attrs)].map(a => ` ${a}`).join("");
  const markup=`<nav class="l3-nav" aria-label="Main navigation"${preservedData}><div class="l3-nav-inner"><a class="l3-logo" href="/" aria-label="Fursay home"><svg aria-hidden="true"><use href="/images/brand-icons.svg#paw"></use></svg><span>Fursay</span></a><div class="l3-primary">${standard.slice(0,3).map(link).join('')}</div><div class="l3-desktop">${[...standard.slice(3),...langs].map(link).join('')}</div><details class="l3-menu"><summary aria-label="Open menu">☰</summary><div class="l3-menu-panel">${[...standard.slice(3),...extra,...langs].map(link).join('')}</div></details></div></nav>`;
  s=(nav?s.replace(nav[0],markup):s.replace(/(<body\b[^>]*>)/i,`$1${markup}`)).replace('</head>','<link rel="stylesheet" href="/css/site-navigation-20261120l.css"></head>');writeFileSync(path,languageLinks(s,path,baseRoot));
 }
}
