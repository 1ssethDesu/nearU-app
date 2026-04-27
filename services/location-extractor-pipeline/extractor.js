const { GoogleGenerativeAI } = require('@google/generative-ai');
const { GoogleAIFileManager } = require('@google/generative-ai/server');
const config = require('./config');

// ─────────────────────────────────────────────
// Location Extractor — Gemini Multimodal Video Analysis
// Uploads a video to Gemini and reads on-screen text overlays
// ─────────────────────────────────────────────

/**
 * Upload a file with exponential backoff retries on transient errors (e.g. 503).
 * @param {GoogleAIFileManager} fileManager
 * @param {string} videoPath
 * @param {number} maxRetries
 */
async function uploadWithRetry(fileManager, videoPath, maxRetries = 4) {
  let delay = 2000;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fileManager.uploadFile(videoPath, {
        mimeType: 'video/mp4',
        displayName: 'tiktok-video',
      });
    } catch (err) {
      const isTransient = err.message && (
        err.message.includes('503') ||
        err.message.includes('Service Unavailable') ||
        err.message.includes('500') ||
        err.message.includes('429')
      );
      if (!isTransient || attempt === maxRetries) throw err;
      console.warn(`   ⚠️  Gemini upload attempt ${attempt} failed (${err.message.split('\n')[0]}). Retrying in ${delay / 1000}s...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      delay *= 2;
    }
  }
}

/**
 * Upload a video to Gemini and use vision to extract all locations shown on screen.
 * @param {string} videoPath - Path to the .mp4 file.
 * @param {string} caption - TikTok post caption text.
 * @param {string} locationMeta - TikTok location metadata (e.g. country code).
 * @returns {Promise<{ places: Array, primaryPlace: Object }>}
 */
async function extractLocationsFromVideo(videoPath, caption, locationMeta) {
  const fileManager = new GoogleAIFileManager(config.GEMINI_API_KEY);
  const genAI = new GoogleGenerativeAI(config.GEMINI_API_KEY);

  // Upload the video file (with retry on transient 503/500/429 errors)
  const uploadResult = await uploadWithRetry(fileManager, videoPath);

  // Poll until Gemini finishes processing the video frames
  let file = await fileManager.getFile(uploadResult.file.name);
  let attempts = 0;
  while (file.state === 'PROCESSING' && attempts < config.GEMINI_MAX_POLL_ATTEMPTS) {
    await new Promise(resolve => setTimeout(resolve, config.GEMINI_POLL_INTERVAL));
    file = await fileManager.getFile(uploadResult.file.name);
    attempts++;
  }

  if (file.state !== 'ACTIVE') {
    throw new Error(`Gemini file processing failed. State: ${file.state}`);
  }

  // Send video + prompt to Gemini
  const model = genAI.getGenerativeModel({ model: config.GEMINI_MODEL });

  const prompt = `You are a travel location extractor for the NearU app. Watch this TikTok travel video very carefully.

Your task:
1. Scan EVERY frame for on-screen text overlays, title cards, name tags, and captions burned into the video.
2. Identify the name of EVERY specific place shown — restaurants, cafes, temples, landmarks, markets, parks, hotels, etc.
3. Also consider this context: Caption="${caption}", Location metadata="${locationMeta}".
4. Translate any non-English place names to English.

Important: Prioritize text shown visually in the video over inferred information.

Return ONLY raw JSON — no markdown, no explanation:
{
  "places": [
    {
      "placeName": "Exact name as shown in the video",
      "city": "City name",
      "country": "Country name",
      "confidence": "high | medium | low",
      "source": "video_overlay | audio | caption | inferred"
    }
  ],
  "primaryPlace": {
    "placeName": "First or most prominent place",
    "city": "City name",
    "country": "Country name",
    "confidence": "high | medium | low"
  }
}`;

  const result = await model.generateContent([
    {
      fileData: {
        fileUri: file.uri,
        mimeType: 'video/mp4',
      },
    },
    { text: prompt },
  ]);

  // Cleanup: delete the uploaded Gemini file
  try {
    await fileManager.deleteFile(uploadResult.file.name);
  } catch (cleanupErr) {
    console.warn(`\n⚠️  Warning: Failed to delete video from Gemini API: ${cleanupErr.message}`);
  }

  const text = result.response.text().trim();
  const cleaned = text.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim();

  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch (e) {
    throw new Error(`Gemini did not return valid JSON. Raw: ${text}`);
  }

  return parsed;
}

module.exports = { extractLocationsFromVideo };
