import { createRequire } from "module";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const require = createRequire(import.meta.url);
const puppeteer = require("puppeteer-core");
const dir = dirname(fileURLToPath(import.meta.url));

const browser = await puppeteer.launch({
  executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  headless: "new",
  args: ["--hide-scrollbars", "--no-first-run"],
});

const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
await page.goto(`file:///${join(dir, "screens.html").replace(/\\/g, "/")}`, {
  waitUntil: "networkidle0",
  timeout: 60000,
});
await new Promise((r) => setTimeout(r, 400));

async function shotEl(sel, name, w, h) {
  const el = await page.$(sel);
  const box = await el.boundingBox();
  await page.setViewport({ width: Math.max(w, 400), height: Math.max(h, 400), deviceScaleFactor: 1 });
  await page.screenshot({
    path: join(dir, name),
    clip: { x: box.x, y: box.y, width: box.width, height: box.height },
  });
}

await shotEl("#journey", "app-journey-hunter-king.png", 430, 900);
await shotEl("#health", "app-health-follow-ups.png", 430, 900);
await shotEl("#step", "web-breeding-plan-step.png", 1040, 780);

const live = await browser.newPage();
await live.setViewport({ width: 1280, height: 900, deviceScaleFactor: 1 });
const url =
  "https://www.diedericksdobermanns.com/admin/breeding/plans/40e7e029-284f-42f8-a5d6-5d615197477a/step?stepId=c941ac06-d048-4974-bcac-678a99317f43";
await live.goto(url, { waitUntil: "networkidle0", timeout: 120000 }).catch(() => {});
await new Promise((r) => setTimeout(r, 800));
const text = await live.evaluate(() => document.body.innerText.slice(0, 400));
await live.screenshot({ path: join(dir, "web-step-live.png"), fullPage: false });
console.log("LIVE_STEP_TEXT_START");
console.log(text);
console.log("LIVE_STEP_TEXT_END");

await browser.close();
