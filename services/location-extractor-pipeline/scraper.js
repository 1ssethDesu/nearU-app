const { ApifyClient } = require('apify-client');
const config = require('./config');

// ─────────────────────────────────────────────
// TikTok Scraper — Apify
// Scrapes post metadata: caption, location, duration
// ─────────────────────────────────────────────

/**
 * Scrape a TikTok post using Apify to get caption, location metadata, and video duration.
 * @param {string} tiktokUrl - The TikTok video URL to scrape.
 * @returns {Promise<{ caption: string, locationMeta: string, duration: number }>}
 */
async function scrapeWithApify(tiktokUrl) {
  const client = new ApifyClient({ token: config.APIFY_TOKEN });

  const run = await client.actor(config.APIFY_ACTOR).call({
    postURLs: [tiktokUrl],
  });

  const { items } = await client.dataset(run.defaultDatasetId).listItems();

  if (!items || items.length === 0) {
    throw new Error('Apify returned no results for the given TikTok URL.');
  }

  const post = items[0];
  const caption = post.text || post.desc || '';
  const locationMeta = post.locationCreated || '';
  const duration = post.videoMeta?.duration || 0;

  return { caption, locationMeta, duration };
}

module.exports = { scrapeWithApify };
