import assert from "node:assert/strict";
import test from "node:test";
import worker, {trialLanguageHref} from "../src/worker.js";

test("same-brand language routes preserve bounded source values", () => {
 for(const brand of ["koko","noor"])for(const prefix of ["","zh/","ar/"]){
  const page=`https://fursay.com/${prefix}trials/${brand}-week-one?utm_source=newsletter&utm_campaign=parent_trial&email=private%40example.com&utm_term=private%40example.com`;
  for(const target of ["","zh/","ar/"]){
   const url=new URL(trialLanguageHref(`/${target}trials/${brand}-week-one`,page));
   assert.equal(url.searchParams.get("utm_source"),"newsletter");
   assert.equal(url.searchParams.get("utm_campaign"),"parent_trial");
   assert.equal(url.searchParams.has("email"),false);
   assert.equal(url.searchParams.has("utm_term"),false);
  }
 }
});
test("unrelated routes, foreign origins and absent valid sources are unchanged",()=>{
 const page="https://fursay.com/zh/trials/koko-week-one?utm_source=newsletter";
 for(const href of ["/trials/noor-week-one","https://other.example/trials/koko-week-one","/products/koko-printable","https://["])assert.equal(trialLanguageHref(href,page),null);
 for(const query of ["","?email=private%40example.com","?utm_source="+"x".repeat(81),"?utm_source=has%20spaces"])
  assert.equal(trialLanguageHref("/trials/koko-week-one","https://fursay.com/trials/koko-week-one"+query),null);
});
test("Worker attributed response removes cache validators and preserves security",async()=>{
 const original=globalThis.HTMLRewriter;const changes=[];
 globalThis.HTMLRewriter=class {
  on(selector,handler){assert.equal(selector,".brand-language a");this.handler=handler;return this;}
  transform(response){
   for(const href of ["/trials/koko-week-one","/ar/trials/koko-week-one","/trials/noor-week-one"]){
    const element={getAttribute:()=>href,setAttribute:(key,value)=>changes.push({key,value})};this.handler.element(element);
   }
   return response;
  }
 };
 try{
  const env={ASSETS:{fetch:async()=>new Response("trial",{headers:{"Content-Type":"text/html","Content-Security-Policy":"default-src 'self'","ETag":"old","Content-Length":"5"}})}};
  const response=await worker.fetch(new Request("https://fursay.com/zh/trials/koko-week-one?utm_source=newsletter"),env);
  assert.equal(response.headers.get("Cache-Control"),"private, no-store");
  assert.equal(response.headers.has("ETag"),false);assert.equal(response.headers.has("Content-Length"),false);
  assert.equal(response.headers.get("Content-Security-Policy"),"default-src 'self'");
  assert.equal(response.headers.get("X-Content-Type-Options"),"nosniff");
  assert.equal(changes.length,2);assert.ok(changes.every(x=>new URL(x.value).searchParams.get("utm_source")==="newsletter"));
  assert.equal(await response.text(),"trial");
 }finally{if(original===undefined)delete globalThis.HTMLRewriter;else globalThis.HTMLRewriter=original;}
});
test("ordinary pages do not invoke the trial rewriter",async()=>{
 const original=globalThis.HTMLRewriter;
 globalThis.HTMLRewriter=class{constructor(){throw Error("must not rewrite");}};
 try{
  const env={ASSETS:{fetch:async()=>new Response("ordinary")}};
  for(const path of ["/zh/products?utm_source=newsletter","/zh/trials/koko-week-one"]){
   const response=await worker.fetch(new Request("https://fursay.com"+path),env);
   assert.notEqual(response.headers.get("Cache-Control"),"private, no-store");
   assert.equal(await response.text(),"ordinary");
  }
 }finally{if(original===undefined)delete globalThis.HTMLRewriter;else globalThis.HTMLRewriter=original;}
});
