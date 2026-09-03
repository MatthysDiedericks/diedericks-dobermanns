import { createRequire } from "module";
const require = createRequire(import.meta.url);
const puppeteer = require("puppeteer-core");

const browser = await puppeteer.launch({
  executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  headless: "new",
});
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 2000 });
await page.goto("http://localhost:8081/achievements", {
  waitUntil: "networkidle0",
  timeout: 120000,
});
await page.waitForFunction(() => document.body.innerText.includes("To our knowledge"));
const titles = await page.evaluate(() => {
  const text = document.body.innerText;
  const after = text.split("Three of them are ours.")[1] ?? "";
  return after
    .split("\n")
    .map((l) => l.trim())
    .filter((l) =>
      /PSA |Obedience|High in|3rd Overall|IGP|KNPV|Champion|Title Achieved/.test(l),
    );
});
console.log(titles.join("\n"));
console.log("count", titles.length);
await browser.close();
