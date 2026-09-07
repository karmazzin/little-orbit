// Isolated Chrome fixture; never uses a user's browser profile.
// PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs node tests/planet-preview-browser.mjs
import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const page=await browser.newPage({viewport:{width:800,height:600}});page.setDefaultTimeout(90000);
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const original={'little-orbit-world-v1':'normal-world-sentinel','little-orbit-travel-v1':'{"open":false,"amber":false}','little-orbit-music-v1':'normal-music-sentinel'};
 await page.addInitScript(original=>{if(!sessionStorage.getItem('seeded')){for(const [k,v] of Object.entries(original))localStorage.setItem(k,v);sessionStorage.setItem('seeded','1');}},original);
 await page.goto((process.env.BASE_URL||'http://127.0.0.1:5173/little-orbit/')+'?planet=amber&test=1');
 await page.locator('#planet-preview summary').filter({hasText:'Тест: Янтарь'}).waitFor({state:'attached'});
 await page.waitForFunction(()=>document.querySelector('#loading')?.hidden);
 await page.locator('#start').click();
 await page.evaluate(()=>window.dispatchEvent(new Event('pagehide')));
 assert.ok(await page.evaluate(()=>localStorage.getItem('little-orbit-preview:little-orbit-amber-world-v1')));
 const checkOriginal=async()=>assert.deepEqual(await page.evaluate(keys=>Object.fromEntries(keys.map(k=>[k,localStorage.getItem(k)])),Object.keys(original)),original);
 await checkOriginal();
 await page.keyboard.press('j');await page.locator('#reset').click();await page.locator('#reset-confirm').click();
 await page.locator('#planet-preview summary').filter({hasText:'Тест: Хвоя'}).waitFor({state:'attached'});
 assert.equal(new URL(page.url()).searchParams.get('test'),'1');await checkOriginal();
 assert.equal(await page.evaluate(()=>localStorage.getItem('little-orbit-preview:little-orbit-amber-world-v1')),null);
 await page.locator('#help-toggle').click();await page.locator('#planet-preview summary').click();await page.getByRole('link',{name:'Янтарь',exact:true}).click();
 await page.locator('#planet-preview summary').filter({hasText:'Тест: Янтарь'}).waitFor({state:'attached'});await checkOriginal();
 await page.locator('#help-toggle').click();await page.locator('#planet-preview summary').click();await page.getByRole('link',{name:'Вернуться в обычную игру'}).click();
 await page.locator('#planet-preview summary').filter({hasText:'Тест планет'}).waitFor({state:'attached'});assert.equal(new URL(page.url()).search,'');
 assert.deepEqual(errors,[]);console.log('PASS: direct Amber, isolated save, isolated reset, planet picker, return to regular game; no page errors');
}finally{await browser.close();}
