import React, { createContext, useContext, useState, useCallback } from 'react';
import { getRecommendations } from '../services/recommendationService'; 

const RecipeContext = createContext(undefined);

export const RecipeProvider = ({ children }) => {
  const [selectedIngredients, setSelectedIngredients] = useState([]);
  const [dietaryPreferences, setDietaryPreferences] = useState(['all']); 
  
  const [filteredRecipes, setFilteredRecipes] = useState([]);
  const [isLoadingRecipes, setIsLoadingRecipes] = useState(false); 
  const [recipeError, setRecipeError] = useState(''); 

  const isServiceReady = true; 

  const parseCSV = (text) => {
    const lines = [];
    let currentLine = [];
    let currentCell = '';
    let inQuotes = false;
    
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      if (char === '"' && text[i + 1] === '"') {
        currentCell += '"'; i++; 
      } else if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        currentLine.push(currentCell); currentCell = '';
      } else if ((char === '\n' || (char === '\r' && text[i + 1] === '\n')) && !inQuotes) {
        if (char === '\r') i++;
        currentLine.push(currentCell);
        lines.push(currentLine);
        currentLine = []; currentCell = '';
      } else {
        currentCell += char;
      }
    }
    if (currentCell || currentLine.length > 0) {
      currentLine.push(currentCell); lines.push(currentLine);
    }
    return lines;
  };

  const cleanSplitArray = (rawString) => {
    if (!rawString) return [];
    return rawString.split('--')
      .map(item => item.trim().replace(/^[-•]\s*/, ''))
      .filter(item => item.length > 0 && item !== '\r');
  };

  const formatCookpadUrl = (rawUrl) => {
    if (!rawUrl) return 'https://cookpad.com';
    const trimmed = rawUrl.trim().replace(/(^"|"$)/g, '');
    if (trimmed.startsWith('http')) return trimmed;
    if (trimmed.startsWith('/id/resep/')) return `https://cookpad.com${trimmed}`;
    return `https://cookpad.com/id/resep/${trimmed}`;
  };

  const fetchRecipesFromService = useCallback(async (ingredients) => {
    if (ingredients.length === 0) {
      setFilteredRecipes([]);
      return;
    }

    setIsLoadingRecipes(true);
    setRecipeError('');

    try {
      const response = await fetch('/dataset_finale.csv'); 
      if (!response.ok) throw new Error("Gagal mengambil dataset resep.");
      
      const csvText = await response.text();
      const rows = parseCSV(csvText);
      
      if (rows.length < 2) throw new Error("Dataset kosong");

      const headers = rows[0].map(h => h.trim().toLowerCase());
      
      const titleIdx = headers.indexOf('title');
      const ingredientsRawIdx = headers.indexOf('ingredients');
      const ingredientsCleanIdx = headers.findIndex(h => h.includes('clean')); 
      const stepsIdx = headers.indexOf('steps');
      const lovesIdx = headers.indexOf('loves');
      const urlIdx = headers.indexOf('url');

      const allRecipes = rows.slice(1).map((row, index) => {
        if (!row || row.length === 0 || !row[titleIdx]) return null;

        const rawIngredients = row[ingredientsRawIdx] || '';
        const cleanIngredients = ingredientsCleanIdx !== -1 ? row[ingredientsCleanIdx] : rawIngredients;
        const recipeTitle = row[titleIdx].trim();
        const rawUrl = urlIdx !== -1 ? row[urlIdx].trim().replace(/(^"|"$)/g, '') : '';
        const absoluteUrl = formatCookpadUrl(rawUrl);

        // --- INI ADALAH IMPLEMENTASI DARI PENEMUAN ANDA ---
        // Mencari angka ID resep di dalam URL (misal: 4471956)
        let cookpadId = '';
        const idMatch = rawUrl.match(/(?:\/resep\/|^)(\d+)/);
        if (idMatch && idMatch[1]) {
            cookpadId = idMatch[1];
        }

        // Memasukkan ID ke dalam pola link gambar OG Pinterest Cookpad
        const realImageUrl = cookpadId 
            ? `https://og-image.cookpad.com/global/id/share/recipes/${cookpadId}`
            : `https://loremflickr.com/400/300/food,cooked?lock=${index + 15}`; // Fallback jika ID tidak ada

        return {
          id: index,
          title: recipeTitle,
          Title: recipeTitle,
          Ingredients_Clean: cleanIngredients,
          ingredients: cleanSplitArray(rawIngredients),
          Ingredients: rawIngredients,
          steps: cleanSplitArray(row[stepsIdx]),
          Steps: row[stepsIdx] || '',
          loves: lovesIdx !== -1 ? parseInt(row[lovesIdx]) || 0 : 0,
          Loves: lovesIdx !== -1 ? parseInt(row[lovesIdx]) || 0 : 0,
          url: absoluteUrl,
          URL: absoluteUrl,
          imageUrl: realImageUrl // <- Gambar asli siap digunakan!
        };
      }).filter(r => r !== null && r.title);

      const recommended = getRecommendations(ingredients, allRecipes);
      setFilteredRecipes(recommended);
      
    } catch (err) {
      console.error(err);
      setRecipeError("Terjadi kesalahan: " + err.message);
    } finally {
      setIsLoadingRecipes(false);
    }
  }, []);

  const addIngredient = (ingredient) => {
    setSelectedIngredients(prev => {
      const exists = prev.some(item => item.name.toLowerCase() === ingredient.name.toLowerCase());
      if (exists) return prev;
      const newIngredients = [...prev, ingredient];
      fetchRecipesFromService(newIngredients.map(i => i.name));
      return newIngredients;
    });
  };
  
  const removeIngredient = (ingredientId) => {
    setSelectedIngredients(prev => {
      const newIngredients = prev.filter(i => i.id !== ingredientId);
      fetchRecipesFromService(newIngredients.map(i => i.name));
      return newIngredients;
    });
  };
  
  const togglePreference = (preference) => {};
  const likeRecipe = (id) => {};
  const dislikeRecipe = (id) => {};

  return (
    <RecipeContext.Provider value={{
      selectedIngredients, addIngredient, removeIngredient,
      dietaryPreferences, togglePreference, filteredRecipes,
      isLoadingRecipes, recipeError, isServiceReady, likeRecipe, dislikeRecipe
    }}>
      {children}
    </RecipeContext.Provider>
  );
};

export const useRecipe = () => useContext(RecipeContext);