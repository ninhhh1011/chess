const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:4173';
const OUTPUT_DIR = path.resolve(__dirname, '../artifacts/ui-option-c/final');

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

async function capture() {
  console.log(`Starting final visual verification screenshots from ${BASE_URL}...`);
  const browser = await chromium.launch({ headless: true });

  const viewports = [
    {
      name: 'desktop-1440',
      width: 1440,
      height: 900,
      targets: [
        { route: '/', name: 'home.png' },
        { route: '/play', name: 'lobby.png', action: async (p) => {
          // Reset to lobby
          const newGame = p.getByRole('button', { name: /Ván mới/i });
          if (await newGame.isVisible().catch(() => false)) await newGame.click();
        }},
        { route: '/play', name: 'play-game.png', action: async (p) => {
          const start = p.getByRole('button', { name: /Bắt đầu ván/i });
          if (await start.isVisible().catch(() => false)) await start.click();
          await p.waitForTimeout(1000);
          const tab = p.getByRole('tab', { name: /Ván đấu/i });
          if (await tab.isVisible().catch(() => false)) await tab.click();
        }},
        { route: '/play', name: 'play-analysis.png', action: async (p) => {
          const tab = p.getByRole('tab', { name: /Phân tích/i });
          if (await tab.isVisible().catch(() => false)) await tab.click();
        }},
        { route: '/play', name: 'play-coach.png', action: async (p) => {
          const tab = p.getByRole('tab', { name: /Huấn luyện/i });
          if (await tab.isVisible().catch(() => false)) await tab.click();
        }},
        { route: '/play', name: 'review.png', action: async (p) => {
          const resign = p.getByRole('button', { name: /Đầu hàng/i });
          if (await resign.isVisible().catch(() => false)) await resign.click();
          await p.waitForTimeout(1000);
        }},
        { route: '/training', name: 'training.png' },
        { route: '/exercises', name: 'exercises.png' },
        { route: '/login', name: 'login.png' }
      ]
    },
    {
      name: 'mobile-390',
      width: 390,
      height: 844,
      targets: [
        { route: '/', name: 'home.png' },
        { route: '/play', name: 'lobby.png', action: async (p) => {
          const newGame = p.getByRole('button', { name: /Ván mới/i });
          if (await newGame.isVisible().catch(() => false)) await newGame.click();
        }},
        { route: '/play', name: 'play.png', action: async (p) => {
          const start = p.getByRole('button', { name: /Bắt đầu ván/i });
          if (await start.isVisible().catch(() => false)) await start.click();
          await p.waitForTimeout(1000);
        }},
        { route: '/play', name: 'review.png', action: async (p) => {
          const resign = p.getByRole('button', { name: /Đầu hàng/i });
          if (await resign.isVisible().catch(() => false)) await resign.click();
          await p.waitForTimeout(1000);
        }},
        { route: '/training', name: 'training.png' },
        { route: '/login', name: 'login.png' }
      ]
    },
    {
      name: 'tablet-768',
      width: 768,
      height: 1024,
      targets: [
        { route: '/play', name: 'play.png', action: async (p) => {
          const start = p.getByRole('button', { name: /Bắt đầu ván/i });
          if (await start.isVisible().catch(() => false)) await start.click();
          await p.waitForTimeout(1000);
        }},
        { route: '/play', name: 'review.png', action: async (p) => {
          const resign = p.getByRole('button', { name: /Đầu hàng/i });
          if (await resign.isVisible().catch(() => false)) await resign.click();
          await p.waitForTimeout(1000);
        }},
        { route: '/training', name: 'training.png' }
      ]
    },
    {
      name: 'desktop-1920',
      width: 1920,
      height: 1080,
      targets: [
        { route: '/', name: 'home.png' },
        { route: '/play', name: 'play.png', action: async (p) => {
          const start = p.getByRole('button', { name: /Bắt đầu ván/i });
          if (await start.isVisible().catch(() => false)) await start.click();
          await p.waitForTimeout(1000);
        }}
      ]
    }
  ];

  for (const vp of viewports) {
    console.log(`\nCapturing for viewport: ${vp.name} (${vp.width}x${vp.height})`);
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height }
    });
    await context.addInitScript(() => {
      localStorage.setItem('chess-app-onboarding', 'true');
    });
    const page = await context.newPage();

    for (const target of vp.targets) {
      const fileName = `${vp.name}-${target.name}`;
      const filePath = path.join(OUTPUT_DIR, fileName);
      console.log(`  -> Navigating to ${target.route}...`);
      await page.goto(`${BASE_URL}${target.route}`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(600);

      if (target.action) {
        try {
          await target.action(page);
          await page.waitForTimeout(600);
        } catch (e) {
          console.log(`    Action warning for ${fileName}:`, e.message);
        }
      }

      await page.screenshot({ path: filePath, fullPage: true });
      console.log(`    Saved: ${fileName}`);
    }

    await context.close();
  }

  await browser.close();
  console.log('\nAll final screenshots captured to:', OUTPUT_DIR);
}

capture().catch(console.error);
