// Optional browser regression suite. Start Vite separately, then run:
// BASE_URL=http://127.0.0.1:5173/little-orbit/ node tests/runtime-browser.mjs
// Requires external Playwright and Chrome; set PLAYWRIGHT_MODULE to its module path if not installed locally.
// OUT_DIR selects screenshots/report location. SOFTWARE=1 forces SwiftShader.
// Fixtures use isolated browser contexts and never access a user's profile.
// Screenshots are visual evidence; animation frame counts are not fixed for pixel equality.
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const base = process.env.BASE_URL || 'http://127.0.0.1:5173/little-orbit/';
const out = process.env.OUT_DIR || '/tmp/orbit-runtime-qa';
await fs.mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: process.env.SOFTWARE ? ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] : [] });
let lastPage;
const report = [];
console.log('Testing', base);
const normal = (x, z) => { const d = Math.hypot(x, z), a = d / 64; return [x / d * Math.sin(a), Math.cos(a), z / d * Math.sin(a)]; };
function fixture(amber) { const up = amber ? [0, 1, 0] : normal(-58, 35); let forward = [0, -up[2], up[1]], l = Math.hypot(...forward); forward = forward.map(x => x / l); return JSON.stringify({ version: 2, solarSeconds: 155, timeSpeed: 1, timeStopped: true, distance: 15, elevation: .55, player: { up, forward, mode: 'walk', groundHeight: 65, jumpHeight: 0, verticalSpeed: 0, grounded: true, coyoteTime: 0, jumpBuffer: 0 } }); }
async function setup(amber, mobile = false) { console.log('Setup', amber ? 'amber' : 'khvoya', mobile ? 'mobile' : 'desktop'); const ctx = await browser.newContext(mobile ? { viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 } : { viewport: { width: 800, height: 600 }, deviceScaleFactor: 1 }); const page = await ctx.newPage(); page.setDefaultTimeout(90000); lastPage = page; const errors = []; page.on('pageerror', e => errors.push(e.message)); await page.addInitScript(({ amber, world }) => { let seed = 42; Math.random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }; if (!sessionStorage.getItem('seeded')) {
    localStorage.clear();
    localStorage.setItem('little-orbit-travel-v1', JSON.stringify({ open: true, amber: false }));
    localStorage.setItem(amber ? 'little-orbit-amber-world-v1' : 'little-orbit-world-v1', amber ? JSON.stringify({ world, places: [], met: [], cards: [], tracked: '' }) : world);
    sessionStorage.setItem('seeded', '1');
} }, { amber, world: fixture(amber) }); await page.goto(base + (amber ? '?planet=amber' : '')); await page.locator('#start').waitFor({ state: 'visible', timeout: 60000 }); await page.waitForFunction(() => document.querySelector('#loading')?.hidden || getComputedStyle(document.querySelector('#loading')).display === 'none', {}, { timeout: 60000 }); await page.waitForFunction(() => document.querySelector('#loading')?.hidden, {}, { polling: 100, timeout: 90000 }); await page.locator('#start').click(); await page.waitForFunction(() => document.body.classList.contains('playing')); await page.waitForTimeout(1800); await page.locator('#interact').waitFor({ state: 'visible' }); return { ctx, page, errors }; }
const save = async (page, amber) => { await page.evaluate(() => window.dispatchEvent(new Event('pagehide'))); await page.waitForTimeout(1200); return page.evaluate(amber => { const s = JSON.parse(localStorage.getItem(amber ? 'little-orbit-amber-world-v1' : 'little-orbit-world-v1')); return amber ? JSON.parse(s.world) : s; }, amber); };
try {
    for (const amber of (process.env.SKIP_DESKTOP ? [] : [false, true])) {
        const name = amber ? 'amber' : 'khvoya';
        const { ctx, page, errors } = await setup(amber);
        await page.keyboard.press('j');
        await page.locator('#journal[open]').waitFor();
        await page.screenshot({ path: `${out}/${name}-journal.png` });
        await page.keyboard.press('Escape');
        assert.equal(await page.locator('dialog[open]').count(), 0);
        await page.keyboard.press('m');
        await page.waitForFunction(() => document.body.classList.contains('overview'));
        await page.keyboard.press('Escape');
        await page.waitForFunction(() => !document.body.classList.contains('overview'));
        await page.keyboard.press('k');
        await page.locator('#system-map-dialog[open]').waitFor();
        await page.screenshot({ path: `${out}/${name}-system.png` });
        await page.keyboard.press('Escape');
        await page.keyboard.press('n');
        await page.waitForTimeout(150);
        assert.equal(await page.locator('dialog[open]').count(), 0);
        const before = await save(page, amber);
        await page.keyboard.down('w');
        await page.waitForTimeout(1300);
        await page.keyboard.up('w');
        const after = await save(page, amber);
        assert.ok(Math.hypot(...after.player.up.map((v, i) => v - before.player.up[i])) > .001, 'movement persisted');
        await page.reload();
        await page.locator('#start').waitFor({ state: 'visible' });
        await page.waitForFunction(() => document.querySelector('#loading')?.hidden, {}, { polling: 100, timeout: 90000 });
        await page.locator('#start').click();
        const restored = await save(page, amber);
        assert.ok(Math.hypot(...restored.player.up.map((v, i) => v - after.player.up[i])) < 1e-10, 'restored position matches after normalization');
        assert.equal(restored.solarSeconds, after.solarSeconds);
        assert.equal(restored.distance, after.distance);
        assert.equal(restored.elevation, after.elevation);
        assert.deepEqual(errors, [], 'no page errors');
        report.push({ scenario: name + ' desktop', pass: true, errors, checks: ['start', 'journal + Escape', 'M + Escape', 'K + Escape', 'N no modal', 'W movement saved', 'reload snapshot retained'] });
        await ctx.close();
    }
    for (const mobile of (process.env.ONLY_STORAGE ? [] : [false, true])) {
        const { ctx, page, errors } = await setup(false, mobile);
        if (mobile) {
            await page.locator('#touch-controls').waitFor({ state: 'visible' });
            await page.screenshot({ path: `${out}/khvoya-mobile.png` });
        }
        await (mobile ? page.locator('#interact').tap() : page.keyboard.press('e'));
        await page.getByRole('button', { name: 'Отправиться на Янтарь', exact: true }).click();
        await page.waitForURL('**/*planet=amber*');
        await page.waitForFunction(() => document.querySelector('#loading')?.hidden, {}, { polling: 100, timeout: 90000 });
        await page.locator('#start').click();
        await page.locator('#interact').waitFor({ state: 'visible' });
        if (mobile)
            await page.screenshot({ path: `${out}/amber-mobile.png` });
        await (mobile ? page.locator('#interact').tap() : page.keyboard.press('e'));
        await page.getByRole('button', { name: 'Вернуться на Хвою', exact: true }).click();
        await page.waitForURL(u => !u.searchParams.has('planet'));
        await page.locator('#start').waitFor({ state: 'visible' });
        assert.deepEqual(errors, [], 'no page errors');
        report.push({ scenario: `bidirectional travel ${mobile ? 'mobile' : 'desktop'}`, pass: true, errors });
        await ctx.close();
    }
    for (const amber of (process.env.ONLY_STORAGE ? [true] : [false, true])) {
        const { ctx, page, errors } = await setup(amber);
        await page.locator('#interact').waitFor({ state: 'visible' });
        console.log('Storage target', await page.locator('#interact').innerText());
        await page.evaluate(() => { Storage.prototype.setItem = function () { throw new DOMException('QA storage blocked', 'QuotaExceededError'); }; });
        await page.keyboard.press('e');
        await page.getByRole('button', { name: amber ? 'Вернуться на Хвою' : 'Отправиться на Янтарь', exact: true }).click();
        await page.waitForTimeout(350);
        assert.equal(new URL(page.url()).searchParams.get('planet'), amber ? 'amber' : null);
        assert.match(await page.locator('#toast').innerText(), /Переход отложен/);
        assert.deepEqual(errors, [], 'no page errors');
        report.push({ scenario: `storage failure ${amber ? 'amber' : 'khvoya'}`, pass: true, errors });
        await ctx.close();
    }
}
catch (e) {
    await lastPage?.screenshot({ path: `${out}/failure.png` }).catch(() => { });
    console.log(await lastPage?.locator('body').innerText());
    report.push({ pass: false, error: e.stack });
    process.exitCode = 1;
}
finally {
    await fs.writeFile(`${out}/report.json`, JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
    await browser.close();
}
