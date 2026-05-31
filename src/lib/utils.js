// src/lib/utils.js
import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

/**
 * Mengubah teks menjadi format "slug" yang ramah URL.
 * @param {string} text Teks yang akan di-slugify.
 * @param {object} [options] Opsi tambahan.
 * @param {boolean} [options.lower=true] Apakah akan mengubah output menjadi huruf kecil.
 * @param {boolean} [options.strict=true] Apakah akan menghapus tanda hubung di awal/akhir.
 * @returns {string} Teks dalam format slug.
 */
export function slugify(text, options = {}) {
  if (typeof text !== 'string') {
    // Anda bisa uncomment baris di bawah untuk logging jika input bukan string
    // console.warn('Slugify: input is not a string, returning empty string.');
    return '';
  }

  const { lower = true, strict = true } = options;

  let str = text.toString();

  if (lower) {
    str = str.toLowerCase();
  }

  str = str
    .trim() // Hapus spasi di awal dan akhir
    .replace(/\s+/g, '-') // Ganti satu atau lebih spasi dengan tanda hubung (-)
    .replace(/[^\w-]+/g, '') // Hapus semua karakter non-word (alphanumeric & underscore) dan non-tanda hubung
    .replace(/--+/g, '-'); // Ganti beberapa tanda hubung berurutan menjadi satu

  if (strict) {
    str = str.replace(/^-+|-+$/g, ''); // Hapus tanda hubung yang mungkin ada di awal atau akhir string
  }

  return str;
}

/**
 * Mengekstrak URL Cookpad dari teks (biasanya dari kolom Steps).
 * @param {string} text Teks yang akan dicari URL Cookpad-nya.
 * @returns {string|null} URL Cookpad atau null jika tidak ditemukan.
 */
export function extractCookpadUrl(text) {
  if (!text || typeof text !== 'string') return null;
  
  // Cari pola URL Cookpad
  const match = text.match(/https:\/\/cookpad\.com\/id\/resep\/\d+[^\s)"]*/i);
  return match ? match[0] : null;
}

/**
 * Mengekstrak recipe ID dari URL Cookpad.
 * @param {string} url URL Cookpad.
 * @returns {string|null} Recipe ID atau null jika tidak valid.
 */
export function extractCookpadRecipeId(url) {
  if (!url || typeof url !== 'string') return null;
  
  const match = url.match(/\/resep\/(\d+)/);
  return match ? match[1] : null;
}

/**
 * Menghasilkan image URL dari Cookpad recipe ID menggunakan Open Graph meta tag.
 * Method ini mengambil gambar dari share preview Cookpad (seperti saat copy link).
 * @param {string} recipeId Recipe ID dari Cookpad.
 * @returns {string} Image URL Cookpad share preview.
 */
export function getCookpadImageUrl(recipeId) {
  if (!recipeId) return null;
  
  // Format image URL dari Cookpad share preview
  // Pattern: https://img-global.cpcdn.com/recipes/{prefix}/{id}/recipe_cover_{id}.webp
  // Prefix dihitung dari ID untuk struktur folder CDN Cookpad
  
  // Konversi ID ke string jika belum
  recipeId = String(recipeId);
  
  // Hitung prefix berdasarkan ID (biasanya menggunakan modulo atau substring)
  // Dari analisis, prefix seperti: 5c, bebe, 57c1f, etc
  // Mari gunakan formula yang umum: ambil 1-3 char pertama dan gabung dengan struktur
  let prefix = recipeId.substring(0, 3);
  
  // Jika ID sangat panjang, ambil bagian yang lebih spesifik
  if (recipeId.length > 6) {
    // Format: ambil prefix dari pembagian atau pattern tertentu
    const idNum = parseInt(recipeId);
    const prefixNum = Math.floor(idNum / 1000) || idNum.toString().substring(0, 2);
    prefix = prefixNum.toString().padStart(2, '0');
  }
  
  // Format URL untuk share preview Cookpad
  // Coba dengan webp terlebih dahulu (format modern)
  return `https://img-global.cpcdn.com/recipes/${prefix}/${recipeId}/recipe_cover_${recipeId}.webp`;
}

/**
 * Mengambil image URL dari resep (coba dari Steps sebagai Cookpad URL, atau fallback).
 * @param {object} recipe Objek recipe.
 * @returns {string|null} Image URL atau null.
 */
export function getRecipeImageUrl(recipe) {
  if (!recipe || typeof recipe !== 'object') return null;

  // Coba ekstrak dari kolom Steps
  const cookpadUrl = extractCookpadUrl(recipe.Steps);
  if (cookpadUrl) {
    const recipeId = extractCookpadRecipeId(cookpadUrl);
    if (recipeId) {
      return getCookpadImageUrl(recipeId);
    }
  }

  // Fallback ke Image_Name jika ada
  if (recipe.Image_Name) {
    return recipe.Image_Name;
  }

  return null;
}

/**
 * Generate alternative image URLs untuk fallback jika primary URL gagal.
 * @param {string} recipeId Recipe ID dari Cookpad.
 * @returns {array} Array of fallback URLs.
 */
export function getCookpadImageUrlFallbacks(recipeId) {
  if (!recipeId) return [];
  
  recipeId = String(recipeId);
  
  let prefix = recipeId.substring(0, 3);
  if (recipeId.length > 6) {
    const idNum = parseInt(recipeId);
    const prefixNum = Math.floor(idNum / 1000) || idNum.toString().substring(0, 2);
    prefix = prefixNum.toString().padStart(2, '0');
  }
  
  // Return multiple fallback formats
  return [
    // Primary: modern webp format dengan img-global CDN
    `https://img-global.cpcdn.com/recipes/${prefix}/${recipeId}/recipe_cover_${recipeId}.webp`,
    // Fallback 1: jpg format dengan img-global CDN
    `https://img-global.cpcdn.com/recipes/${prefix}/${recipeId}/recipe_cover_${recipeId}.jpg`,
    // Fallback 2: legacy img.cookpad.com format
    `https://img.cookpad.com/images/recipes/${recipeId}/recipe_cover_${recipeId}.jpg`,
  ];
}