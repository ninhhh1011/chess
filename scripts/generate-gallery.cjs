const fs = require('fs');
const path = require('path');

const ARTIFACTS_DIR = path.resolve(__dirname, '../artifacts/ui-option-c');
const BASELINE_DIR = path.join(ARTIFACTS_DIR, 'baseline');
const FINAL_DIR = path.join(ARTIFACTS_DIR, 'final');
const GALLERY_PATH = path.join(ARTIFACTS_DIR, 'gallery.html');

function generateGallery() {
  const finalFiles = fs.existsSync(FINAL_DIR) ? fs.readdirSync(FINAL_DIR).filter(f => f.endsWith('.png')) : [];
  const baselineFiles = fs.existsSync(BASELINE_DIR) ? fs.readdirSync(BASELINE_DIR).filter(f => f.endsWith('.png')) : [];

  const html = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Production UI Option C — Visual Verification Gallery</title>
  <style>
    :root {
      --app-bg: #0C100E;
      --app-surface: #141A17;
      --app-border: #2D3932;
      --app-foreground: #F1F4F2;
      --app-muted: #9BA89F;
      --app-accent: #3FAD79;
      --app-copper: #C88954;
    }
    body {
      margin: 0;
      padding: 24px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: var(--app-bg);
      color: var(--app-foreground);
    }
    h1 {
      font-size: 28px;
      margin-bottom: 8px;
      color: var(--app-foreground);
    }
    .subtitle {
      color: var(--app-muted);
      margin-bottom: 32px;
      font-size: 14px;
    }
    .badge {
      display: inline-block;
      padding: 4px 8px;
      border-radius: 6px;
      background: rgba(63, 173, 121, 0.15);
      border: 1px solid rgba(63, 173, 121, 0.3);
      color: var(--app-accent);
      font-size: 12px;
      font-weight: 600;
      margin-right: 8px;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(420px, 1fr));
      gap: 24px;
      margin-bottom: 48px;
    }
    .card {
      background: var(--app-surface);
      border: 1px solid var(--app-border);
      border-radius: 8px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }
    .card-header {
      padding: 12px 16px;
      border-bottom: 1px solid var(--app-border);
      font-size: 13px;
      font-weight: 600;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .card-body {
      padding: 12px;
      display: flex;
      justify-content: center;
      background: #000;
    }
    img {
      max-width: 100%;
      height: auto;
      border-radius: 4px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.5);
    }
  </style>
</head>
<body>
  <h1>Production Option C — Visual Verification Gallery</h1>
  <p class="subtitle">
    <span class="badge">Option C Locked</span>
    <span class="badge">Charcoal + Pine + Copper</span>
    <span class="badge">HeroUI v3.2.4</span>
    <span class="badge">Tailwind CSS v4</span>
  </p>

  <h2>Final Production Screenshots</h2>
  <div class="grid">
    ${finalFiles.map(file => `
      <div class="card">
        <div class="card-header">
          <span>${file}</span>
          <span style="color: var(--app-accent);">Final</span>
        </div>
        <div class="card-body">
          <a href="final/${file}" target="_blank">
            <img src="final/${file}" alt="${file}" loading="lazy" />
          </a>
        </div>
      </div>
    `).join('')}
  </div>

  <h2>Baseline Screenshots Comparison</h2>
  <div class="grid">
    ${baselineFiles.map(file => `
      <div class="card">
        <div class="card-header">
          <span>${file}</span>
          <span style="color: var(--app-copper);">Baseline</span>
        </div>
        <div class="card-body">
          <a href="baseline/${file}" target="_blank">
            <img src="baseline/${file}" alt="${file}" loading="lazy" />
          </a>
        </div>
      </div>
    `).join('')}
  </div>
</body>
</html>`;

  fs.writeFileSync(GALLERY_PATH, html, 'utf8');
  console.log('Gallery generated at:', GALLERY_PATH);
}

generateGallery();
