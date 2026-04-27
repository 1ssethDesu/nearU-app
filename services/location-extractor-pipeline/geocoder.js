const config = require('./config');

// ─────────────────────────────────────────────
// Geocoder — Google Maps Geocoding API
// Converts place names to lat/lng coordinates
// ─────────────────────────────────────────────

/**
 * Geocode a place name to lat/lng coordinates using Google Maps.
 * @param {string} placeName - Name of the place/venue.
 * @param {string} city - City name.
 * @param {string} country - Country name.
 * @returns {Promise<{ lat: number, lng: number } | null>}
 */
async function geocodePlace(placeName, city, country) {
  if (!config.GOOGLE_MAPS_KEY) {
    return null;
  }

  const query = [placeName, city, country].filter(Boolean).join(', ');
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&key=${config.GOOGLE_MAPS_KEY}`;

  const response = await fetch(url);
  const data = await response.json();

  if (!data.results || data.results.length === 0) {
    return null;
  }

  const { lat, lng } = data.results[0].geometry.location;
  return { lat, lng };
}

module.exports = { geocodePlace };
