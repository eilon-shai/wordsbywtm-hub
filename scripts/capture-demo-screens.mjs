// One-off: capture clean screenshots of the live hub flow for the Vyond explainer video.
// Uses the existing "Eleanor" demo collection (admin + share tokens below).
// Run: node scripts/capture-demo-screens.mjs
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const BASE = 'https://wordsbywtm-hub-git-fix-synthesis-never-refu-b2e3cd-ai-projects1.vercel.app';
const ADMIN = '9VuuCQLkWnbgAMiKK0BwmPGCR58i0Ut7';
const SHARE = 'di3ySKcaht1gNkN8';

const OUT = join(homedir(), 'Desktop', 'wtm-video-assets', 'screenshots');
mkdirSync(OUT, { recursive: true });

// [file, url, mode]  mode: 'viewport' = top fold only, 'full' = whole page
const SHOTS = [
  ['01_home_hero.png',            `${BASE}/`,             'viewport'],
  ['02_home_full.png',            `${BASE}/`,             'full'],
  ['03_memorial_hero.png',        `${BASE}/memorial`,     'viewport'],
  ['04_memorial_full.png',        `${BASE}/memorial`,     'full'],
  ['05_create_form.png',          `${BASE}/memorial/start`, 'viewport'],
  ['06_create_form_full.png',     `${BASE}/memorial/start`, 'full'],
  ['07_contributor_form.png',     `${BASE}/c/${SHARE}`,   'viewport'],
  ['08_contributor_form_full.png',`${BASE}/c/${SHARE}`,   'full'],
  ['09_dashboard_top.png',        `${BASE}/collect/manage?t=${ADMIN}`, 'viewport'],
  ['10_dashboard_full.png',       `${BASE}/collect/manage?t=${ADMIN}`, 'full'],
];

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 2,
  // Vercel deployment-protection bypass (secret passed via env, never hardcoded)
  extraHTTPHeaders: process.env.BYPASS
    ? { 'x-vercel-protection-bypass': process.env.BYPASS, 'x-vercel-set-bypass-cookie': 'true' }
    : {},
});
const page = await ctx.newPage();

for (const [file, url, mode] of SHOTS) {
  try {
    await page.goto(url, { waitUntil: 'load', timeout: 60000 });
    await page.waitForTimeout(2800); // let fonts/images settle (avoid networkidle — it hangs here)
    await page.screenshot({
      path: join(OUT, file),
      fullPage: mode === 'full',
    });
    console.log('captured', file);
  } catch (e) {
    console.error('FAILED', file, e.message);
  }
}

// Targeted section shots (viewport-framed for device mockups).
// [file, url, text-substring-to-scroll-to]
const SECTIONS = [
  ['11_occasions.png',          `${BASE}/`,        'One way to honor'],
  ['12_solo_vs_everyone.png',   `${BASE}/`,        'writes from one person'],
  ['13_four_steps.png',         `${BASE}/`,        'Four steps'],
  ['14_sample_tribute.png',     `${BASE}/memorial`,'Ask anyone who knew Eleanor'],
  ['15_dashboard_memories.png', `${BASE}/collect/manage?t=${ADMIN}`, 'Include in the tribute'],
  ['16_finalize_card.png',      `${BASE}/collect/manage?t=${ADMIN}`, 'will be woven from'],
];

for (const [file, url, substr] of SECTIONS) {
  try {
    await page.goto(url, { waitUntil: 'load', timeout: 60000 });
    await page.waitForTimeout(2500);
    const loc = page.getByText(substr, { exact: false }).first();
    await loc.scrollIntoViewIfNeeded();
    await page.evaluate(() => window.scrollBy(0, -90)); // a little breathing room above
    await page.waitForTimeout(400);
    await page.screenshot({ path: join(OUT, file), fullPage: false });
    console.log('captured', file);
  } catch (e) {
    console.error('FAILED', file, e.message);
  }
}

await browser.close();
console.log('\nDone. Files in:', OUT);
