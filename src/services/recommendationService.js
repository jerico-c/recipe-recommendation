// src/services/recommendationService.js

export const getRecommendations = (userIngredients, recipes) => {
  if (!userIngredients || userIngredients.length === 0) return [];

  // Normalisasi input user (kecilkan huruf dan hapus spasi berlebih)
  const normalizedInputs = userIngredients.map(ing => ing.toLowerCase().trim());

  const scoredRecipes = recipes.map(recipe => {
    let score = 0;
    let matchedIngredients = [];

    // Pastikan bahan berformat string dan kecilkan hurufnya
    const cleanIngredientsText = (recipe.Ingredients_Clean || '').toLowerCase();

    // Loop setiap input user
    normalizedInputs.forEach(input => {
      // Gunakan string inclusion yang lebih aman ketimbang regex boundary
      if (cleanIngredientsText.includes(input)) {
        score += 1;
        matchedIngredients.push(input);
      }
    });

    return {
      ...recipe,
      matchScore: score,
      matchedIngredients: matchedIngredients
    };
  });

  // Ambil hanya resep yang punya minimal 1 bahan yang cocok
  const filteredRecipes = scoredRecipes.filter(recipe => recipe.matchScore > 0);

  // Urutkan: 1) Skor tertinggi, 2) Kalau seri, urutkan berdasarkan jumlah 'Loves' terbanyak
  return filteredRecipes.sort((a, b) => {
    if (b.matchScore !== a.matchScore) {
      return b.matchScore - a.matchScore;
    }
    return (b.loves || 0) - (a.loves || 0);
  });
};