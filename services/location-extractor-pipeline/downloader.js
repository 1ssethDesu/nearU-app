const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const config = require('./config');

// ─────────────────────────────────────────────
// Video Downloader — yt-dlp
// Downloads TikTok videos to a temp file
// ─────────────────────────────────────────────

/**
 * Check if yt-dlp is installed on the system.
 * @returns {boolean}
 */
function checkYtDlp() {
  try {
    execSync('yt-dlp --version', { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Build a yt-dlp command for a given cookie strategy.
 * @param {string} tmpPath - Output file path.
 * @param {string} cleanUrl - The TikTok URL (no query params).
 * @param {string|null} cookieBrowser - Browser name to pull cookies from, or null.
 */
function buildCmd(tmpPath, cleanUrl, cookieBrowser = null) {
  const args = [
    'yt-dlp',
    '--quiet',
    '--no-warnings',
    '--format', 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
    '--merge-output-format', 'mp4',
    '--output', `"${tmpPath}"`,
    '--no-playlist',
  ];
  if (cookieBrowser) {
    args.push('--cookies-from-browser', cookieBrowser);
  }
  args.push(`"${cleanUrl}"`);
  return args.join(' ');
}

/**
 * Download a TikTok video to a temporary .mp4 file using yt-dlp.
 * Tries multiple cookie strategies to work around TikTok's bot detection.
 * @param {string} tiktokUrl - The TikTok video URL to download.
 * @returns {Promise<string>} - The path to the downloaded .mp4 file.
 */
async function downloadVideo(tiktokUrl) {
  if (!checkYtDlp()) {
    throw new Error('yt-dlp is not installed. Run: brew install yt-dlp');
  }

  const tmpPath = path.join(os.tmpdir(), `nearu-${Date.now()}.mp4`);

  // Strip query parameters that often break yt-dlp TikTok extraction
  const cleanUrl = tiktokUrl.split('?')[0];

  // TikTok requires browser cookies to avoid "unable to extract universal data" errors.
  // Try Safari first (default on macOS), then Chrome, then no cookies as a last resort.
  const strategies = ['safari', 'chrome', null];

  let lastError;
  for (const browser of strategies) {
    const cmd = buildCmd(tmpPath, cleanUrl, browser);
    try {
      execSync(cmd, { stdio: 'pipe', timeout: config.DOWNLOAD_TIMEOUT });
      lastError = null;
      break;
    } catch (err) {
      lastError = err;
      // Clean up any partial file before retrying with next strategy
      if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
    }
  }

  if (lastError) {
    throw new Error(`yt-dlp download failed: ${lastError.message}`);
  }

  if (!fs.existsSync(tmpPath)) {
    // yt-dlp may append extension — try to locate the file
    const dir = os.tmpdir();
    const files = fs.readdirSync(dir).filter(f => f.startsWith('nearu-') && f.endsWith('.mp4'));
    if (files.length === 0) throw new Error('yt-dlp did not produce a video file.');
    return path.join(dir, files[files.length - 1]);
  }

  return tmpPath;
}

/**
 * Delete a temporary video file.
 * @param {string} videoPath - Path to the file to delete.
 */
function cleanupVideo(videoPath) {
  if (videoPath && fs.existsSync(videoPath)) {
    fs.unlinkSync(videoPath);
  }
}

module.exports = { checkYtDlp, downloadVideo, cleanupVideo };
