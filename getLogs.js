const { chromium } = require('playwright-core');

(async () => {
  const browser = await chromium.launch({
    headless: false,
    args: ['--enable-webgl', '--use-gl=angle', '--ignore-gpu-blocklist'],
  });
  const page = await browser.newPage();
  page.on('console', (msg) => console.log('PAGE LOG:', msg.type(), msg.text(), msg.location()));
  page.on('pageerror', (err) =>
    console.log('PAGE ERROR STR:', err.toString(), '\\nSTACK:', err.stack),
  );
  console.log('Navigating...');
  await page.goto('http://localhost:8085/game');
  await page.waitForTimeout(5000);
  await browser.close();
})();
