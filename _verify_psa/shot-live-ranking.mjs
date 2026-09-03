import { createRequire } from "module";
import { mkdirSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const require = createRequire(import.meta.url);
const puppeteer = require("puppeteer-core");

const dir = dirname(fileURLToPath(import.meta.url));
mkdirSync(dir, { recursive: true });

const LIVE = "https://www.diedericksdobermanns.com/achievements";

const browser = await puppeteer.launch({
  executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  headless: "new",
  args: ["--hide-scrollbars", "--no-first-run"],
});

async function open(width, height) {
  const page = await browser.newPage();
  await page.setViewport({ width, height, deviceScaleFactor: 1 });
  await page.goto(LIVE, { waitUntil: "networkidle0", timeout: 120000 });
  await page.waitForFunction(
    () => document.body.innerText.includes("Our view"),
    { timeout: 120000 },
  );
  await new Promise((r) => setTimeout(r, 800));
  return page;
}

async function cropRanking(page, outPath) {
  const clip = await page.evaluate(() => {
    const ol = document.querySelector("ol");
    if (!ol) return null;
    ol.scrollIntoView({ block: "center" });
    const r = ol.getBoundingClientRect();
    const pad = 40;
    return {
      x: Math.max(0, r.x - pad),
      y: Math.max(0, r.y - pad - 80),
      width: Math.min(window.innerWidth, r.width + pad * 2),
      height: Math.min(window.innerHeight, r.height + pad * 2 + 80),
      html: ol.outerHTML.slice(0, 400),
      className: ol.className,
      tag: ol.tagName,
      firstLiText: ol.querySelector("li")?.innerText?.replace(/\s+/g, " ").trim() ?? "",
      listStyle: getComputedStyle(ol).listStyleType,
    };
  });
  await new Promise((r) => setTimeout(r, 300));
  if (clip) {
    await page.screenshot({
      path: outPath,
      clip: {
        x: clip.x,
        y: clip.y,
        width: clip.width,
        height: clip.height,
      },
    });
  } else {
    await page.screenshot({ path: outPath });
  }
  return clip;
}

const desk = await open(1440, 900);
const deskMeta = await cropRanking(desk, join(dir, "live-ranking-desktop.png"));
const deskHtml = await desk.evaluate(() => {
  const ol = document.querySelector("ol.mt-8") || document.querySelector("ol");
  return {
    tag: ol?.tagName ?? null,
    className: ol?.className ?? null,
    listStyleType: ol ? getComputedStyle(ol).listStyleType : null,
    items: [...(ol?.querySelectorAll("li") ?? [])].map((li) =>
      li.innerText.replace(/\s+/g, " ").trim(),
    ),
    bodyHasDouble: /1\.\s*1PSA/.test(document.body.innerText),
    snippet: (document.body.innerText.match(/Our view[\s\S]{0,280}/) || [""])[0],
  };
});
await desk.close();

const mob = await open(390, 844);
const mobMeta = await cropRanking(mob, join(dir, "live-ranking-mobile.png"));
await mob.screenshot({ path: join(dir, "live-achievements-mobile-full.png"), fullPage: false });
await mob.close();

const report = { deskMeta, deskHtml, mobMeta };
writeFileSync(join(dir, "live-ranking-report.json"), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));

await browser.close();
