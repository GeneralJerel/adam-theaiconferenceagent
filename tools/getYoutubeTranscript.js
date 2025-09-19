'use strict';

/**
 * Playwright script to extract the full transcript from a YouTube video.
 *
 * Usage:
 *   node utils/getYoutubeTranscript.js <youtube_video_url> [--headful] [--no-timestamps] [--timeout=30000]
 *
 * Notes:
 * - Expects the YouTube UI to be in English to find "Show transcript". Tries fallbacks.
 * - Handles cookie consent popups best-effort.
 * - Scrolls the transcript panel to load all segments before extraction.
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

function waitMs(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function dismissConsentIfPresent(page) {
  try {
    const consentSelectors = [
      'button:has-text("Reject all")',
      'button:has-text("I agree")',
      'button:has-text("Accept all")',
      '#introAgreeButton'
    ];
    for (const selector of consentSelectors) {
      const el = await page.$(selector);
      if (el) {
        await el.click({ force: true });
        await waitMs(500);
      }
    }
  } catch (_) {
    // ignore
  }
}

async function waitForAnyTranscriptContainer(page, timeout) {
  const selectors = [
    'ytd-transcript-segment-list-renderer',
    'ytd-transcript-renderer ytd-transcript-segment-list-renderer',
    'ytd-engagement-panel-section-list-renderer ytd-transcript-segment-list-renderer',
    'ytd-transcript-tabs-renderer ytd-transcript-segment-list-renderer'
  ];
  const start = Date.now();
  while (Date.now() - start < timeout) {
    for (const sel of selectors) {
      const loc = page.locator(sel).first();
      if (await loc.count()) {
        try {
          await loc.waitFor({ state: 'visible', timeout: 500 });
          return sel;
        } catch {}
      }
    }
    await page.waitForTimeout(300);
  }
  throw new Error('Transcript container not found');
}

async function openTranscriptViaOverflow(page) {
  const roleLocator = page.getByRole('button', { name: /more actions|more/i });
  if (await roleLocator.count()) {
    try {
      await roleLocator.first().click();
      const popup = page.locator('ytd-menu-popup-renderer:visible');
      await popup.waitFor({ state: 'visible', timeout: 2000 });
      const menuItemByRole = popup.getByRole('menuitem', { name: /transcript/i }).first();
      if (await menuItemByRole.count()) {
        await menuItemByRole.click();
        return true;
      }
      const fallback = popup.locator('tp-yt-paper-item:has-text("Transcript"), tp-yt-paper-item:has-text("Show transcript"), tp-yt-paper-item:has-text("Open transcript")').first();
      if (await fallback.count()) {
        await fallback.click({ force: true });
        return true;
      }
    } catch {}
  }

  const candidates = [
    'button[aria-label*="More actions"]',
    'tp-yt-paper-icon-button[aria-label*="More actions"]',
    '#menu tp-yt-paper-icon-button[aria-label*="More"]',
    '#actions ytd-menu-renderer tp-yt-paper-icon-button[aria-label*="More"]',
    '#top-level-buttons-computed tp-yt-paper-icon-button[aria-label*="More"]'
  ];
  for (const selector of candidates) {
    const locator = page.locator(selector).filter({ hasNot: page.locator('[disabled]') });
    if (await locator.count()) {
      try {
        await locator.first().click({ force: true });
        const popup = page.locator('ytd-menu-popup-renderer:visible');
        await popup.waitFor({ state: 'visible', timeout: 2000 });
        const item = popup.getByRole('menuitem', { name: /transcript/i }).first();
        if (await item.count()) {
          await item.click();
          return true;
        }
        const fallback = popup.locator('tp-yt-paper-item:has-text("Transcript"), tp-yt-paper-item:has-text("Show transcript")').first();
        if (await fallback.count()) {
          await fallback.click({ force: true });
          return true;
        }
      } catch {}
    }
  }
  return false;
}

async function openTranscriptViaDescription(page) {
  // Expand the description if collapsed
  const expanders = [
    'ytd-text-inline-expander tp-yt-paper-button:has-text("more")',
    'ytd-text-inline-expander tp-yt-paper-button:has-text("More")',
    'tp-yt-paper-button:has-text("more")',
    'tp-yt-paper-button:has-text("More")',
    'button:has-text("more")',
    'button:has-text("More")'
  ];
  for (const sel of expanders) {
    const loc = page.locator(sel).first();
    if (await loc.count()) {
      try { await loc.click({ force: true }); await page.waitForTimeout(200); } catch {}
    }
  }
  // Look for a transcript button/link in the description area
  const possibleTranscriptTriggers = [
    'ytd-transcript-inline-expander tp-yt-paper-button:has-text("Transcript")',
    'ytd-transcript-inline-expander tp-yt-paper-button:has-text("Show transcript")',
    'yt-button-shape:has-text("Transcript")',
    'yt-button-shape:has-text("Show transcript")',
    'a:has-text("Transcript")',
    'tp-yt-paper-button:has-text("Transcript")'
  ];
  for (const sel of possibleTranscriptTriggers) {
    const loc = page.locator(sel).first();
    if (await loc.count()) {
      try { await loc.click({ force: true }); return true; } catch {}
    }
  }
  // Generic visible text button
  const anyTranscriptText = page.getByText(/Transcript/i).filter({ has: page.locator('button, a') }).first();
  if (await anyTranscriptText.count()) {
    try { await anyTranscriptText.click({ force: true }); return true; } catch {}
  }
  return false;
}

async function openTranscriptPanel(page, overallTimeoutMs) {
  const deadline = Date.now() + overallTimeoutMs;
  const timeLeft = () => Math.max(0, deadline - Date.now());

  await page.waitForLoadState('domcontentloaded', { timeout: timeLeft() });
  await dismissConsentIfPresent(page);
  await page.waitForTimeout(1000);

  // Strategy 1: Overflow menu
  for (let i = 0; i < 3; i += 1) {
    if (await openTranscriptViaOverflow(page)) break;
    await page.keyboard.press('Escape').catch(() => {});
    await page.waitForTimeout(300);
  }

  // If not present yet, Strategy 2: Description area
  let transcriptOpened = false;
  try {
    await waitForAnyTranscriptContainer(page, 2000);
    transcriptOpened = true;
  } catch {
    transcriptOpened = await openTranscriptViaDescription(page);
  }

  // Final wait for any transcript container
  await waitForAnyTranscriptContainer(page, timeLeft());
}

async function fullyScrollTranscriptList(page) {
  const transcriptListSelector = 'ytd-transcript-segment-list-renderer';
  await page.waitForSelector(transcriptListSelector, { timeout: 15000 });

  await page.evaluate(async (selector) => {
    function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
    const list = document.querySelector(selector);
    if (!list) return;
    let lastHeight = -1;
    let stableIterations = 0;
    for (let i = 0; i < 50; i += 1) {
      list.scrollTop = list.scrollHeight;
      await sleep(150);
      const currentHeight = list.scrollHeight;
      if (currentHeight === lastHeight) {
        stableIterations += 1;
        if (stableIterations >= 3) break;
      } else {
        stableIterations = 0;
        lastHeight = currentHeight;
      }
    }
  }, transcriptListSelector);
}

async function extractTranscriptSegments(page) {
  const segments = await page.$$eval(
    'ytd-transcript-segment-list-renderer ytd-transcript-segment-renderer',
    (nodes) => {
      return nodes.map((el) => {
        const timeEl = el.querySelector('#segment-timestamp, .segment-timestamp, [class*="timestamp"]');
        const textEl = el.querySelector('#segment-text, .segment-text, yt-formatted-string[force-default-style], yt-formatted-string');
        const time = timeEl ? timeEl.textContent.trim() : '';
        let text = textEl ? textEl.textContent : '';
        if (text) text = text.replace(/\s+/g, ' ').trim();
        return { time, text };
      }).filter(s => s.text && s.text.length > 0);
    }
  );
  return segments;
}

function slugify(input) {
  return (input || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80);
}

function extractVideoId(url) {
  try {
    const u = new URL(url);
    if (u.hostname.includes('youtu.be')) return u.pathname.replace('/', '');
    const v = u.searchParams.get('v');
    return v || '';
  } catch {
    return '';
  }
}

async function getTranscriptOnPage(page, videoUrl, includeTimestamps, timeoutMs) {
  await page.goto(videoUrl, { waitUntil: 'domcontentloaded', timeout: timeoutMs });
  // Try to grab a reliable title from the watch page
  let pageTitle = '';
  try {
    const titleLoc = page.locator('h1 yt-formatted-string').first();
    await titleLoc.waitFor({ state: 'visible', timeout: 5000 });
    pageTitle = (await titleLoc.textContent())?.trim() || '';
  } catch {}
  if (!pageTitle) {
    try {
      const raw = await page.title();
      pageTitle = raw.replace(/ - YouTube$/i, '').trim();
    } catch {}
  }

  await openTranscriptPanel(page, timeoutMs);
  await fullyScrollTranscriptList(page);
  const segments = await extractTranscriptSegments(page);
  const transcript = segments.length === 0
    ? ''
    : segments.map(s => (includeTimestamps && s.time ? `${s.time} ${s.text}` : s.text)).join('\n');

  return { transcript, pageTitle };
}

(async () => {
  const args = process.argv.slice(2);
  const headful = args.includes('--headful');
  const includeTimestamps = !args.includes('--no-timestamps');
  const timeoutArg = args.find(a => a.startsWith('--timeout='));
  const timeoutMs = timeoutArg ? Number(timeoutArg.split('=')[1]) : 60000;
  const jsonArg = args.find(a => a === '--from-json' || a.startsWith('--from-json='));
  let jsonPathArg = null;
  if (jsonArg) {
    const parts = jsonArg.split('=');
    jsonPathArg = parts[1] || 'channel_videos.json';
  } else if (args[0] && args[0].endsWith('.json')) {
    jsonPathArg = args[0];
  }
  const outDirArg = (args.find(a => a.startsWith('--out=')) || '').split('=')[1] || path.join(process.cwd(), 'transcripts');

  // Single URL mode
  if (!jsonPathArg && args[0] && args[0].startsWith('http')) {
    const videoUrl = args[0];
    const browser = await chromium.launch({ headless: !headful });
    const context = await browser.newContext({ locale: 'en-US' });
    const page = await context.newPage();
    try {
      const { transcript } = await getTranscriptOnPage(page, videoUrl, includeTimestamps, timeoutMs);
      if (!transcript) {
        console.error('No transcript segments found. The video may not have a transcript or selectors changed.');
        process.exitCode = 2;
      } else {
        console.log(transcript);
      }
    } catch (err) {
      console.error('Failed to extract transcript:', err && err.message ? err.message : err);
      process.exitCode = 1;
    } finally {
      await page.close().catch(() => {});
      await context.close().catch(() => {});
      await browser.close().catch(() => {});
    }
    return;
  }

  // Batch mode from JSON
  if (!jsonPathArg) {
    console.error('Usage: node tools/getYoutubeTranscript.js <youtube_video_url> | --from-json[=channel_videos.json] [--out=transcripts] [--headful] [--no-timestamps] [--timeout=60000]');
    process.exit(1);
  }

  const jsonPath = path.isAbsolute(jsonPathArg) ? jsonPathArg : path.join(process.cwd(), jsonPathArg);
  const raw = fs.readFileSync(jsonPath, 'utf8');
  const parsed = JSON.parse(raw);
  const videos = Array.isArray(parsed)
    ? parsed
    : Array.isArray(parsed.videos)
      ? parsed.videos
      : [];
  if (!videos.length) {
    console.error('No videos found in JSON. Expected an array or an object with a "videos" array.');
    process.exit(1);
  }

  if (!fs.existsSync(outDirArg)) fs.mkdirSync(outDirArg, { recursive: true });

  const browser = await chromium.launch({ headless: !headful });
  const context = await browser.newContext({ locale: 'en-US' });
  const page = await context.newPage();

  let successCount = 0;
  const limitArg = args.find(a => a.startsWith('--limit='));
  const limit = limitArg ? Math.max(1, parseInt(limitArg.split('=')[1], 10)) : videos.length;
  for (let i = 0; i < videos.length; i += 1) {
    if (i >= limit) break;
    const item = videos[i];
    const url = item.url || item.link || '';
    if (!url) continue;
    const id = extractVideoId(url) || String(i + 1);
    const indexText = (item.playlistIndex || String(i + 1)).toString().padStart(3, '0');
    // Fetch transcript and also derive a clean title from the watch page
    let transcript = '';
    let realTitle = '';
    try {
      const res = await getTranscriptOnPage(page, url, includeTimestamps, timeoutMs);
      transcript = res.transcript;
      realTitle = res.pageTitle;
    } catch (err) {
      // will be rethrown below for logging
      throw err;
    }
    const slug = slugify(realTitle || item.title || 'video');
    const filename = `${indexText}-${slug || 'video'}-${id}.txt`;
    const outPath = path.join(outDirArg, filename);
    try {
      if (transcript) {
        fs.writeFileSync(outPath, transcript, 'utf-8');
        console.log(`Saved: ${outPath}`);
        successCount += 1;
      } else {
        console.warn(`No transcript for: ${url}`);
      }
    } catch (err) {
      console.warn(`Failed (${i + 1}/${videos.length}): ${url} → ${err && err.message ? err.message : err}`);
    }
    await page.waitForTimeout(400);
  }

  await page.close().catch(() => {});
  await context.close().catch(() => {});
  await browser.close().catch(() => {});

  console.log(`\nCompleted. Transcripts saved: ${successCount}/${videos.length} → ${outDirArg}`);
})();
