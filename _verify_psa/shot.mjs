import { createRequire } from "module";
import { mkdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const require = createRequire(import.meta.url);
const puppeteer = require("puppeteer-core");

const dir = dirname(fileURLToPath(import.meta.url));
mkdirSync(dir, { recursive: true });

const browser = await puppeteer.launch({
  executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  headless: "new",
  args: ["--hide-scrollbars", "--no-first-run"],
});

async function shot(url, path, width, height) {
  const page = await browser.newPage();
  await page.setViewport({ width, height, deviceScaleFactor: 1 });
  await page.goto(url, { waitUntil: "networkidle0", timeout: 120000 });
  await page.waitForFunction(
    () => document.body.innerText.includes("Our view"),
    { timeout: 120000 },
  );
  await new Promise((r) => setTimeout(r, 800));
  await page.screenshot({ path, fullPage: true });
  const text = await page.evaluate(() => document.body.innerText);
  await page.close();
  return text;
}

const webDesk = await shot(
  "http://localhost:3000/achievements",
  join(dir, "web-desktop.png"),
  1440,
  900,
);
const webMob = await shot(
  "http://localhost:3000/achievements",
  join(dir, "web-mobile.png"),
  390,
  844,
);
const appText = await shot(
  "http://localhost:8081/achievements",
  join(dir, "app-achievements.png"),
  390,
  844,
);

function report(label, text) {
  const ourView = text.includes("Our view");
  const knowledge = text.includes("To our knowledge");
  const titles = [...text.matchAll(/PSA PDC|PSA 1|Obedience Champion|High in Trial|High in Obedience|3rd Overall/g)];
  console.log(`--- ${label} ---`);
  console.log("Our view:", ourView);
  console.log("To our knowledge:", knowledge);
  console.log("title-ish matches:", titles.length);
}

report("website desktop", webDesk);
report("website mobile", webMob);
report("app", appText);

await browser.close();
