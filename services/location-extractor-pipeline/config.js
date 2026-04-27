require('dotenv').config();

// ─────────────────────────────────────────────
// NearU AI Pipeline — Shared Configuration
// ─────────────────────────────────────────────

const config = {
  // API Keys
  APIFY_TOKEN: process.env.APIFY_TOKEN,
  GEMINI_API_KEY: process.env.LLM_API_KEY,
  GOOGLE_MAPS_KEY: process.env.GOOGLE_MAPS_KEY,

  // Gemini model to use for video analysis
  GEMINI_MODEL: 'gemini-2.5-flash',

  // Apify actor for TikTok scraping
  APIFY_ACTOR: 'clockworks/tiktok-scraper',

  // yt-dlp download timeout (ms)
  DOWNLOAD_TIMEOUT: 300000,

  // Gemini file processing poll interval (ms)
  GEMINI_POLL_INTERVAL: 3000,

  // Max attempts to poll Gemini file processing
  GEMINI_MAX_POLL_ATTEMPTS: 40,
};

module.exports = config;
