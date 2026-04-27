const { scrapeWithApify } = require('./scraper');
const { checkYtDlp, downloadVideo, cleanupVideo } = require('./downloader');
const { extractLocationsFromVideo } = require('./extractor');
const { geocodePlace } = require('./geocoder');

// ─────────────────────────────────────────────
// NearU AI Pipeline — Main Orchestrator
// Coordinates: Scrape → Download → Analyze → Geocode
// ─────────────────────────────────────────────

/**
 * Run the full NearU location extraction pipeline on a TikTok video.
 *
 * @param {string} tiktokUrl - The TikTok video URL to process.
 * @param {Object} [options] - Pipeline options.
 * @param {boolean} [options.geocode=false] - Whether to geocode the results.
 * @param {boolean} [options.verbose=false] - Whether to log progress to console.
 * @returns {Promise<{ primaryPlace: Object, allPlaces: Array }>}
 */
async function runPipeline(tiktokUrl, options = {}) {
  const { geocode = false, verbose = false } = options;
  const log = verbose ? console.log.bind(console) : () => { };

  // Pre-flight check
  if (!checkYtDlp()) {
    throw new Error('yt-dlp is not installed. Run: brew install yt-dlp');
  }

  let videoPath = null;

  try {
    // Step 1: Scrape TikTok metadata
    log('🔍 Step 1: Scraping TikTok metadata...');
    const { caption, locationMeta, duration } = await scrapeWithApify(tiktokUrl);
    log(`   ✅ Caption: ${caption.slice(0, 100)}`);
    log(`   ✅ Location: ${locationMeta || '(none)'} | Duration: ${duration}s`);

    // Step 2: Download the video
    log('📥 Step 2: Downloading video...');
    videoPath = await downloadVideo(tiktokUrl);
    log(`   ✅ Downloaded to ${videoPath}`);

    // Step 3: Gemini video analysis
    log('🎬 Step 3: Analyzing video with Gemini...');
    const { places, primaryPlace } = await extractLocationsFromVideo(videoPath, caption, locationMeta);
    log(`   ✅ Found ${places.length} place(s)`);
    places.forEach((p, i) => {
      log(`   ${i + 1}. ${p.placeName} — ${p.city}, ${p.country} [${p.confidence}] via ${p.source}`);
    });

    // Step 4: Geocode (optional)
    if (geocode && primaryPlace) {
      log('📍 Step 4: Geocoding primary place...');
      const coords = await geocodePlace(primaryPlace.placeName, primaryPlace.city, primaryPlace.country);
      if (coords) {
        primaryPlace.lat = coords.lat;
        primaryPlace.lng = coords.lng;
        log(`   ✅ Coordinates: ${coords.lat}, ${coords.lng}`);
      } else {
        log('   ⚠️  Could not geocode (no API key or no results).');
      }
    }

    return { primaryPlace, allPlaces: places };

  } finally {
    // Always clean up the temp video file
    if (videoPath) {
      cleanupVideo(videoPath);
      log('🗑️  Temp video deleted.');
    }
  }
}

module.exports = { runPipeline };
