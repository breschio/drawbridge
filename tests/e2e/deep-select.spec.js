const { test, expect, chromium } = require('@playwright/test');
const path = require('path');
const fs = require('fs');
const os = require('os');
const http = require('http');

const EXT_PATH = path.resolve(__dirname, '../../chrome-extension');
const DEMO_DIR = path.resolve(__dirname, '../../demo');

const MIME = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
};

function startStaticServer(rootDir) {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const urlPath = decodeURIComponent(req.url.split('?')[0]);
      const filePath = path.join(rootDir, urlPath === '/' ? 'index.html' : urlPath);
      fs.readFile(filePath, (err, data) => {
        if (err) {
          res.statusCode = 404;
          res.end('not found');
          return;
        }
        res.setHeader('Content-Type', MIME[path.extname(filePath)] || 'application/octet-stream');
        res.end(data);
      });
    });
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

let server;
let baseURL;
let context;
let userDataDir;

test.beforeAll(async () => {
  server = await startStaticServer(DEMO_DIR);
  baseURL = `http://127.0.0.1:${server.address().port}`;

  userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'db-e2e-'));
  context = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    args: [
      `--disable-extensions-except=${EXT_PATH}`,
      `--load-extension=${EXT_PATH}`,
      '--no-first-run',
    ],
  });

  // Content-script globals live in an isolated world we cannot read from the
  // page's main world, but localStorage is shared per-origin. Seed it so the
  // sidebar auto-shows and the "C" comment shortcut is allowed.
  await context.addInitScript(() => {
    try {
      localStorage.setItem('moat.visible', 'true');
    } catch (e) {}
  });
});

test.afterAll(async () => {
  if (context) await context.close();
  if (server) await new Promise((r) => server.close(r));
  if (userDataDir) fs.rmSync(userDataDir, { recursive: true, force: true });
});

async function openCommentModePage() {
  const page = await context.newPage();
  await page.bringToFront();
  await page.goto(`${baseURL}/deep-select-test.html`);

  // Sidebar (light DOM) proves the extension content scripts ran.
  await page.locator('#moat-moat.float-moat-visible').waitFor({ timeout: 20000 });

  // Enter comment mode via the real keyboard shortcut.
  await page.keyboard.press('c');
  await page.waitForFunction(
    () => document.body.classList.contains('float-comment-mode'),
    null,
    { timeout: 10000 }
  );
  return page;
}

async function pointOn(page, selector) {
  const box = await page.locator(selector).boundingBox();
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

test('Ctrl+Click drills deeper and does NOT open a comment box', async () => {
  const page = await openCommentModePage();
  const p = await pointOn(page, '.front-image');

  await page.mouse.move(p.x, p.y);

  await page.keyboard.down('Control');
  await page.mouse.click(p.x, p.y);
  await page.keyboard.up('Control');

  const badge = page.locator('.float-deep-select-badge');
  await expect(badge).toBeVisible();
  await expect(badge).toHaveText(/Layer 2\/\d+/);

  expect(await page.locator('.float-comment-box').count(), 'no comment box on Ctrl+Click').toBe(0);

  await page.close();
});

test('plain Click opens a comment box', async () => {
  const page = await openCommentModePage();
  const p = await pointOn(page, '.front-image');

  await page.mouse.move(p.x, p.y);
  await page.mouse.click(p.x, p.y);

  await expect(page.locator('.float-comment-box')).toBeVisible();

  await page.close();
});

test('Ctrl+Click twice drills two layers', async () => {
  const page = await openCommentModePage();
  const p = await pointOn(page, '.front-image');

  await page.mouse.move(p.x, p.y);

  await page.keyboard.down('Control');
  await page.mouse.click(p.x, p.y);
  await page.mouse.move(p.x, p.y);
  await page.mouse.click(p.x, p.y);
  await page.keyboard.up('Control');

  await expect(page.locator('.float-deep-select-badge')).toHaveText(/Layer 3\/\d+/);
  expect(await page.locator('.float-comment-box').count()).toBe(0);

  await page.close();
});

test('Ctrl+Click via click-only event drills (trackpad path)', async () => {
  const page = await openCommentModePage();
  const p = await pointOn(page, '.front-image');

  await page.mouse.move(p.x, p.y);

  await page.evaluate(({ x, y }) => {
    const target = document.elementFromPoint(x, y);
    target.dispatchEvent(
      new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        clientX: x,
        clientY: y,
        ctrlKey: true,
      })
    );
  }, p);

  await expect(page.locator('.float-deep-select-badge')).toHaveText(/Layer 2\/\d+/);
  expect(await page.locator('.float-comment-box').count()).toBe(0);

  await page.close();
});
