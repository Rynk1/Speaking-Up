import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

  await page.goto('http://localhost:3000');
  await page.waitForTimeout(2000);

  // Take screenshot of feed cards with interaction bar
  await page.screenshot({ path: '/home/jules/verification/verification_action_bar.png', fullPage: false });

  await browser.close();
})();
