import { createRequire } from "module";
import { join, dirname } from "path";
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
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
await page.goto("http://localhost:8081/achievements", {
  waitUntil: "networkidle0",
  timeout: 120000,
});
await page.waitForFunction(
  () => document.body.innerText.includes("Our view"),
  { timeout: 120000 },
);
await new Promise((r) => setTimeout(r, 500));

async function scrollToText(needle) {
  const found = await page.evaluate((n) => {
    const nodes = [...document.querySelectorAll("*")];
    const el = nodes.find((e) => (e.innerText || "").includes(n) && (e.innerText || "").length < 400);
    if (!el) return false;
    el.scrollIntoView({ block: "start" });
    const scrollParent = el.closest("[data-testid]") || el.parentElement;
    let p = el.parentElement;
    while (p) {
      const s = getComputedStyle(p);
      if (/(auto|scroll)/.test(s.overflowY) && p.scrollHeight > p.clientHeight) {
        p.scrollTop = el.offsetTop - 24;
        break;
      }
      p = p.parentElement;
    }
    return true;
  }, needle);
  await new Promise((r) => setTimeout(r, 400));
  return found;
}

await page.screenshot({ path: join(dir, "app-lead.png") });

const rankingFound = await scrollToText("Our view, based on the pressure");
await page.screenshot({ path: join(dir, "app-ranking.png") });

const recordFound = await scrollToText("To our knowledge");
await page.screenshot({ path: join(dir, "app-record.png") });

const listFound = await scrollToText("PSA PDC");
await page.screenshot({ path: join(dir, "app-list.png") });

const body = await page.evaluate(() => document.body.innerText);
console.log("rankingFound", rankingFound);
console.log("recordFound", recordFound);
console.log("listFound", listFound);
console.log("has Our view", body.includes("Our view"));
console.log("has To our knowledge", body.includes("To our knowledge"));
console.log("has stick hits", body.includes("stick hits"));
console.log("has chainsaws", body.includes("chainsaws"));
const titles = [...body.matchAll(/PSA PDC[^\n]*/g)].map((m) => m[0]);
console.log("PSA PDC titles:", titles);
console.log("--- body excerpt from Our view ---");
const i = body.indexOf("Our view");
console.log(body.slice(i, i + 900));

await browser.close();
