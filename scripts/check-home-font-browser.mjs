import {createServer} from 'node:http';
import {readFile,writeFile,mkdir,stat} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {createHash} from 'node:crypto';
import {chromium} from 'playwright';
import {checkPage} from './check-accessibility-browser.mjs';
const root=resolve(import.meta.dirname,'..'),site=resolve(root,'fursay-optimized-site');
const out=resolve(process.argv[2]||'/tmp/fursay-home-font-browser');await mkdir(out,{recursive:true});
const before=process.argv[3]?resolve(process.argv[3]):null;
const fontCss=await readFile(resolve(site,'css/home-fonts-20261004-v1.css'),'utf8');
const sources=JSON.parse(await readFile(resolve(site,'fonts/home-20261004/sources.json'),'utf8'));
for(const f of sources.fontFiles){const b=await readFile(resolve(site,'.'+f.localPath));if(createHash('sha256').update(b).digest('hex')!==f.sha256)throw Error('font hash mismatch '+f.localPath);}
const server=createServer(async(req,res)=>{try{
 const u=new URL(req.url,'http://127.0.0.1');if(req.method!=='GET'||u.pathname.startsWith('/api/'))return void res.writeHead(405).end();
 let p=decodeURIComponent(u.pathname);if(p.endsWith('/'))p+='index.html';if(!extname(p))p+='.html';
 let file=resolve(site,'.'+p);if(!file.startsWith(site+sep))throw Error('path');
 if(before&&u.searchParams.has('before')&&['/index.html','/zh/index.html','/ar/index.html'].includes(p))file=resolve(before,'fursay-optimized-site','.'+p);
 if(!(await stat(file)).isFile())throw Error('file');res.writeHead(200,{'content-type':({'.html':'text/html','.css':'text/css','.js':'text/javascript','.woff2':'font/woff2','.svg':'image/svg+xml','.avif':'image/avif','.png':'image/png','.webp':'image/webp'})[extname(file)]||'application/octet-stream'});res.end(await readFile(file));
}catch{res.writeHead(404).end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
const report={browser:'',sourceRoot:root,before,fonts:sources.fontFiles,cases:[],a11y:[],failures:[],scope:'integrated home 3 languages x 390/900/901/980/981/1440; Noor EN/RTL 901/1440; a11y homes 390/981'};
let browser;
try{
 browser=await chromium.launch({headless:true,args:['--disable-gpu']});report.browser=browser.version();
 const cases=['/','/zh/','/ar/'].flatMap(path=>[390,900,901,980,981,1440].map(width=>({path,width}))).concat(['/products/noor-worksheet','/ar/products/noor-worksheet'].flatMap(path=>[901,1440].map(width=>({path,width}))));
 if(before)cases.unshift(...['/','/zh/','/ar/'].flatMap(path=>[390,901,1440].map(width=>({path,width,before:true}))));
 for(const c of cases){
  const row={...c,id:(c.before?'before-':'after-')+(c.path==='/'?'home-en':c.path.replaceAll('/','_').replace(/^_/,''))+'-'+c.width,failures:[],requests:{externalBlocked:0,eventsMocked:0,writeAttempts:0,fontPaths:[]}};
  const context=await browser.newContext({viewport:{width:c.width,height:900},serviceWorkers:'block',reducedMotion:'reduce'});
  await context.route('**/*',async route=>{const req=route.request(),u=new URL(req.url());
   if(u.hostname==='fonts.googleapis.com'&&u.pathname==='/css2'&&c.path.includes('noor'))return route.fulfill({status:200,contentType:'text/css',body:fontCss.replaceAll('/fonts/',origin+'/fonts/')});
   if(u.origin!==origin){row.requests.externalBlocked++;return route.abort();}
   if(u.pathname==='/api/event'){row.requests.eventsMocked++;return route.fulfill({status:200,contentType:'application/json',body:'{"ok":true}'});}
   if(req.method()!=='GET'||u.pathname.startsWith('/api/')){row.requests.writeAttempts++;return route.abort();}
   if(u.pathname.endsWith('.woff2'))row.requests.fontPaths.push(u.pathname);return route.continue();
  });await context.routeWebSocket('**/*',socket=>socket.close());
  const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  try{
   if((await page.goto(origin+c.path+(c.before?'?before=1':''),{waitUntil:'load'})).status()!==200)throw Error('HTTP not 200');await page.evaluate(()=>document.fonts.ready);
   row.metrics=await page.evaluate(()=>{
    const hero=document.querySelector('.brand-hero')||document.querySelector('.hero');const box=e=>{const r=e.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom};};
    const title=hero.querySelector('h1');const ctas=[...hero.querySelectorAll('.brand-btn,.btn,.btn-primary,.btn-secondary')].filter(e=>e.getBoundingClientRect().width).map(e=>{const r=e.getBoundingClientRect(),h=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return{text:e.textContent.trim(),box:box(e),centerHit:h===e||e.contains(h)};});
    return{lang:document.documentElement.lang,dir:getComputedStyle(document.documentElement).direction,title:box(title),titleCss:getComputedStyle(title).font,titleFamily:getComputedStyle(title).fontFamily,ctas,scrollWidth:document.documentElement.scrollWidth,fonts:[...document.fonts].map(f=>({family:f.family,status:f.status,weight:f.weight})),fontLinks:[...document.querySelectorAll('link[rel="stylesheet"]')].map(e=>e.getAttribute('href')).filter(s=>s.includes('font')),camelDisplay:(()=>{const e=document.querySelector('.hero > .hero-float.float-4');return e?getComputedStyle(e).display:null;})()};
   });
   if(!c.path.includes("noor")) {
   row.heroComposition=await page.evaluate(()=>{
    const hero=document.querySelector('.hero'),camelEl=hero.querySelector('.hero-float.float-4'),img=camelEl.querySelector('img'),badge=hero.querySelector('.hero-badge'),h1=hero.querySelector('h1');const r=img.getBoundingClientRect().toJSON(),h=hero.getBoundingClientRect().toJSON(),b=badge.getBoundingClientRect().toJSON();
    const display=getComputedStyle(camelEl).display,visible=display!=='none'&&r.width>1&&r.height>1;
    const sprites=[...hero.querySelectorAll(':scope > .hero-float')].filter(e=>getComputedStyle(e).display!=='none'&&e.getBoundingClientRect().width>1).map((e,order)=>{const image=e.querySelector('img'),box=image.getBoundingClientRect().toJSON(),c=document.createElement('canvas');c.width=Math.round(box.width);c.height=Math.round(box.height);const x=c.getContext('2d',{willReadFrequently:true});x.drawImage(image,0,0,c.width,c.height);return{name:e.className,box,order,z:Number(getComputedStyle(e).zIndex)||0,width:c.width,height:c.height,data:x.getImageData(0,0,c.width,c.height).data};});
    const opaqueAt=(s,x,y)=>{const sx=Math.floor((x-s.box.left)*s.width/s.box.width),sy=Math.floor((y-s.box.top)*s.height/s.box.height);return sx>=0&&sy>=0&&sx<s.width&&sy<s.height&&s.data[(sy*s.width+sx)*4+3]>=128;};
    const camel=sprites.find(s=>s.name.includes('float-4'));let opaque=0,occluded=0,badgeAlpha=0,h1Alpha=0,ctaAlpha=0;
    if(camel){for(let y=0;y<camel.height;y++)for(let x=0;x<camel.width;x++){if(camel.data[(y*camel.width+x)*4+3]<128)continue;opaque++;const px=camel.box.left+(x+.5)*camel.box.width/camel.width,py=camel.box.top+(y+.5)*camel.box.height/camel.height;if(px>=b.left&&px<b.right&&py>=b.top&&py<b.bottom)badgeAlpha++;if(sprites.some(o=>(o.z>camel.z||o.z===camel.z&&o.order>camel.order)&&opaqueAt(o,px,py)))occluded++;}
     const roots=[{kind:'h1',el:h1},...[...hero.querySelectorAll('.hero-buttons a,.hero-buttons button')].map(el=>({kind:'cta',el}))];for(const root of roots){const walker=document.createTreeWalker(root.el,NodeFilter.SHOW_TEXT);let node;while(node=walker.nextNode())for(let i=0;i<node.length;i++){if(!node.textContent[i].trim())continue;const range=document.createRange();range.setStart(node,i);range.setEnd(node,i+1);const box=range.getBoundingClientRect();let n=0;for(let y=Math.max(0,Math.floor(box.top-camel.box.top));y<Math.min(camel.height,Math.ceil(box.bottom-camel.box.top));y++)for(let x=Math.max(0,Math.floor(box.left-camel.box.left));x<Math.min(camel.width,Math.ceil(box.right-camel.box.left));x++)if(camel.data[(y*camel.width+x)*4+3]>=128)n++;if(root.kind==='h1')h1Alpha+=n;else ctaAlpha+=n;}}
    }
    return {display,visible,alt:img.getAttribute('alt'),rect:r,hero:h,badgeVisible:b.width>1&&b.height>1,opaque,occluded,badgeAlpha,h1Alpha,ctaAlpha};
   });
   const hc=row.heroComposition;
   if(c.width>=901&&c.width<=980){if(hc.display!=='none'||hc.visible||hc.rect.width||hc.rect.height||hc.alt!=='')row.failures.push('final-hero-hidden-band-regressed');}
   if(c.width===981){if(!hc.visible||!hc.opaque||hc.occluded||hc.badgeAlpha||hc.h1Alpha||hc.ctaAlpha)row.failures.push('visible-camel-collision-or-missing');const r=hc.rect,h=hc.hero;if(r.left<h.left||r.right>h.right||r.top<h.top||r.bottom>h.bottom||r.bottom>900)row.failures.push('camel-outside-hero-or-viewport');}
   if(!hc.badgeVisible)row.failures.push('badge-not-visible');
   }
   const cd=await context.newCDPSession(page);await cd.send('DOM.enable');await cd.send('CSS.enable');const d=await cd.send('DOM.getDocument');const nodes=await cd.send('DOM.querySelectorAll',{nodeId:d.root.nodeId,selector:'.hero h1,.hero .btn,.hero .btn-primary,.hero .btn-secondary,.brand-hero h1,.brand-hero .brand-btn,.nav-logo'});row.renderedFonts=[];
   for(const nodeId of nodes.nodeIds){const n=await cd.send('DOM.describeNode',{nodeId});row.renderedFonts.push({nodeName:n.node.nodeName,attributes:n.node.attributes,fonts:(await cd.send('CSS.getPlatformFontsForNode',{nodeId})).fonts});}
   const m=row.metrics;if(m.title.x<0||m.title.right>c.width+1)row.failures.push('h1 horizontal bounds');if(m.scrollWidth>c.width+1)row.failures.push('horizontal overflow');if(!m.ctas.length)row.failures.push('missing CTA');
   for(const v of m.ctas){const b=v.box;if(b.x<0||b.right>c.width+1||b.y<0||b.bottom>900)row.failures.push('CTA outside viewport: '+v.text);if(!v.centerHit)row.failures.push('CTA center obscured: '+v.text);if(Math.min(m.title.right,b.right)>Math.max(m.title.x,b.x)&&Math.min(m.title.bottom,b.bottom)>Math.max(m.title.y,b.y))row.failures.push('h1/CTA overlap: '+v.text);}
   if(!c.before){
    if(m.fonts.some(f=>f.status==='error'))row.failures.push('font face error');const groups=row.renderedFonts;
    const title=groups.find(g=>g.nodeName==='H1');const expected=c.path.startsWith('/ar/')?'Cairo':c.path.startsWith('/zh/')?null:'Baloo 2';if(expected&&!title?.fonts.some(f=>f.familyName===expected&&f.isCustomFont&&f.glyphCount>0))row.failures.push('expected h1 font absent: '+expected);
    if(c.path==='/zh/'&&!groups.some(g=>g.fonts.some(f=>f.isCustomFont&&f.familyName==='Baloo 2'&&f.glyphCount>0)))row.failures.push('ZH Latin brand font absent');
    if(!row.requests.fontPaths.length)row.failures.push('no official font request');
   }
   if(row.requests.writeAttempts)row.failures.push('write attempt');if(errors.length)row.failures.push(...errors);await page.screenshot({path:resolve(out,row.id+'.png')});
  }catch(e){row.failures.push(e.message);}finally{await context.close();}
  report.cases.push(row);if(!c.before)report.failures.push(...row.failures.map(f=>row.id+': '+f));console.log(row.id+': '+(row.failures.length?'FAIL '+row.failures.join('; '):'PASS'));
 }
 for(const [path,lang] of [['/','en'],['/zh/','zh-TW'],['/ar/','ar']])for(const width of [390,981]){const result=await checkPage(browser,origin,{path,lang,dialog:true,width});report.a11y.push(result);report.failures.push(...result.failures.map(f=>path+':'+width+': '+f));console.log('a11y '+path+':'+width+': '+result.checks.length+' passed, '+result.failures.length+' failed');}
}finally{if(browser)await browser.close();await new Promise(r=>server.close(r));await writeFile(resolve(out,'report.json'),JSON.stringify(report,null,2)+'\n');}
console.log(JSON.stringify({cases:report.cases.length,a11yCases:report.a11y.length,failures:report.failures},null,2));process.exitCode=report.failures.length?1:0;
