const { runPipeline } = require('../services/location-extractor-pipeline');

// ─────────────────────────────────────────────
// NearU Pipeline Test Runner
// Usage: node scripts/test-pipeline.js
// ─────────────────────────────────────────────

const TEST_URL = 'https://www.tiktok.com/@sydneytetley/video/7232273004707728646?is_from_webapp=1&sender_device=pc&web_id=7553944628825064993';

async function main() {
  console.log('🚀 NearU Multimodal Video Pipeline');
  console.log('════════════════════════════════');
  console.log('TikTok URL:', TEST_URL);
  console.log('');

  try {
    const result = await runPipeline(TEST_URL, { verbose: true });

    console.log('\n🎉 PIPELINE COMPLETE!');
    console.log('════════════════════════════════');
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('\n❌ Pipeline failed:', error.message);
    process.exit(1);
  }
}

main();
