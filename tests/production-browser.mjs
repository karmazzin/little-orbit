// npm run build, then PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs node tests/production-browser.mjs
// Serves dist through intercepted requests in an isolated browser context.
import {readFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({channel:'chrome',headless:true});
try{for(const amber of [false,true]){
 const context=await browser.newContext();const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('http://orbit.test/**',async route=>{const path=new URL(route.request().url()).pathname.replace(/^\/little-orbit\//,'');try{const body=await readFile(resolve('dist',path||'index.html'));await route.fulfill({body,contentType:({'.js':'text/javascript','.css':'text/css','.html':'text/html','.svg':'image/svg+xml'})[extname(path||'index.html')]||'application/octet-stream'});}catch{await route.fulfill({status:404,body:''});}});
 if(amber)await page.addInitScript(()=>localStorage.setItem('little-orbit-travel-v1','{"open":true,"amber":false}'));
 await page.goto('http://orbit.test/little-orbit/?test=1'+(amber?'&planet=amber':''));
 await page.waitForFunction(()=>document.querySelector('#loading')?.hidden,{}, {timeout:30000});
 assert.equal(await page.locator('#planet-preview').count(),0);
 await page.locator('#start').click();await page.waitForFunction(()=>document.body.classList.contains('playing'));
 assert.deepEqual(errors,[]);console.log('PASS production startup',amber?'Amber':'Khvoya');await context.close();
}}finally{await browser.close();}
