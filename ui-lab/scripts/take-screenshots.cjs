const { chromium } = require('playwright');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const ROUTES = [
  { name: 'home', route: '/home' },
  { name: 'lobby', route: '/lobby' },
  { name: 'play', route: '/play' },
  { name: 'review', route: '/review' },
  { name: 'progress', route: '/progress' },
];

const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'mobile', width: 390, height: 844 },
];

const OUTPUT_DIRS = [
  path.resolve(__dirname, '../screenshots/option-c'),
  path.resolve(__dirname, '../public/screenshots/option-c'),
];

// Ensure output directories exist
for (const dir of OUTPUT_DIRS) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

async function isServerReady(url) {
  try {
    const res = await fetch(url);
    return res.ok;
  } catch {
    return false;
  }
}

async function main() {
  console.log('--- STARTING SCREENSHOT GENERATION AUTOMATION (OPTION C) ---');

  const serverUrl = 'http://127.0.0.1:4175';
  let serverProcess = null;

  const alreadyRunning = await isServerReady(serverUrl);
  if (!alreadyRunning) {
    console.log(`Starting Vite preview server on ${serverUrl}...`);
    // Run npm run preview from ui-lab
    serverProcess = spawn('npx', ['vite', 'preview', '--host', '127.0.0.1', '--port', '4175'], {
      cwd: path.resolve(__dirname, '..'),
      shell: true,
      stdio: 'inherit',
    });

    // Wait for server to become ready
    let retries = 30;
    while (retries > 0) {
      await new Promise((r) => setTimeout(r, 500));
      if (await isServerReady(serverUrl)) {
        console.log('Vite server is ready!');
        break;
      }
      retries--;
    }

    if (retries === 0) {
      console.error('Failed to start Vite preview server in time.');
      if (serverProcess) serverProcess.kill();
      process.exit(1);
    }
  } else {
    console.log(`Using existing server at ${serverUrl}`);
  }

  const browser = await chromium.launch({ headless: true });

  try {
    for (const vp of VIEWPORTS) {
      console.log(`\nCapturing for Viewport: ${vp.name} (${vp.width}x${vp.height})...`);
      const context = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
        deviceScaleFactor: 2,
      });
      const page = await context.newPage();

      for (const item of ROUTES) {
        const url = `${serverUrl}${item.route}`;
        await page.goto(url, { waitUntil: 'networkidle' });
        await page.waitForTimeout(300); // Allow quiet motion animations to settle

        // Check horizontal overflow
        const overflow = await page.evaluate(() => {
          return document.documentElement.scrollWidth > document.documentElement.clientWidth;
        });

        if (overflow) {
          console.warn(`⚠️ Warning: Horizontal overflow detected on ${item.route} (${vp.name})`);
        } else {
          console.log(`✓ No horizontal overflow on ${item.route} (${vp.name})`);
        }

        const fileName = `${item.name}-${vp.name}.png`;
        for (const outDir of OUTPUT_DIRS) {
          const filePath = path.join(outDir, fileName);
          await page.screenshot({ path: filePath, fullPage: false });
        }
        console.log(`  📸 Saved: ${fileName}`);
      }

      await context.close();
    }

    console.log('\n✅ ALL 10 OPTION C SCREENSHOTS CAPTURED SUCCESSFULLY!\n');
  } finally {
    await browser.close();
    if (serverProcess) {
      serverProcess.kill();
    }
  }
}

main().catch((err) => {
  console.error('Screenshot capture failed:', err);
  process.exit(1);
});
