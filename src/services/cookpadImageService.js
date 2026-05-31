/**
 * Service untuk fetch gambar dari Cookpad menggunakan share link meta tags
 */

const imageCache = new Map();

/**
 * Fetch Open Graph image dari URL Cookpad
 * @param {string} recipeId Recipe ID dari Cookpad
 * @returns {Promise<string|null>} Image URL atau null jika gagal
 */
export async function fetchCookpadImageFromShare(recipeId) {
  if (!recipeId) return null;

  // Check cache terlebih dahulu
  if (imageCache.has(recipeId)) {
    return imageCache.get(recipeId);
  }

  try {
    // Build Cookpad share URL
    const cookpadUrl = `https://cookpad.com/id/resep/${recipeId}`;

    // Fetch menggunakan CORS proxy untuk menghindari CORS issues
    // Alternative: gunakan backend API yang Anda control
    const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(cookpadUrl)}`;

    const response = await fetch(proxyUrl);
    if (!response.ok) {
      console.warn(`Failed to fetch Cookpad share page for ID: ${recipeId}`);
      return null;
    }

    const data = await response.json();
    const html = data.contents;

    // Extract Open Graph image meta tag
    // Pattern: <meta property="og:image" content="https://...">
    const ogImageMatch = html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i);
    
    if (ogImageMatch && ogImageMatch[1]) {
      const imageUrl = ogImageMatch[1];
      // Cache result
      imageCache.set(recipeId, imageUrl);
      return imageUrl;
    }

    // Fallback: try alternate pattern
    const ogImageAltMatch = html.match(/<meta\s+content=["']([^"']+)["']\s+property=["']og:image["']/i);
    if (ogImageAltMatch && ogImageAltMatch[1]) {
      const imageUrl = ogImageAltMatch[1];
      imageCache.set(recipeId, imageUrl);
      return imageUrl;
    }

    return null;
  } catch (error) {
    console.error(`Error fetching Cookpad image for ID ${recipeId}:`, error);
    return null;
  }
}

/**
 * Get image URL dari recipe - try share link method dulu, fallback ke CDN
 * @param {object} recipe Recipe object
 * @returns {Promise<string|null>} Image URL atau null
 */
export async function getRecipeImageUrlFromShare(recipe) {
  if (!recipe || typeof recipe !== 'object') return null;

  // Extract recipe ID dari Steps
  const stepsText = recipe.Steps || '';
  const recipeIdMatch = stepsText.match(/\/resep\/(\d+)/);

  if (recipeIdMatch && recipeIdMatch[1]) {
    const recipeId = recipeIdMatch[1];
    const imageUrl = await fetchCookpadImageFromShare(recipeId);
    if (imageUrl) {
      return imageUrl;
    }
  }

  return null;
}

/**
 * Clear image cache
 */
export function clearImageCache() {
  imageCache.clear();
}

/**
 * Get cache stats untuk debugging
 */
export function getCacheStats() {
  return {
    size: imageCache.size,
    keys: Array.from(imageCache.keys()),
  };
}

export default {
  fetchCookpadImageFromShare,
  getRecipeImageUrlFromShare,
  clearImageCache,
  getCacheStats,
};
