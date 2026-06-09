import React, { useEffect, useState } from 'react';
import { useParams, useLocation, Navigate, Link } from 'react-router-dom'; 
import Header from '../components/Header'; 
import RecipeDetail from '../components/RecipeDetail'; 
import { useRecipe } from '../context/RecipeContext'; 
import { slugify } from '../lib/utils';
import { AlertTriangle, Home } from 'lucide-react'; 

const RecipePage = () => {
  const { recipeSlug } = useParams(); 
  const location = useLocation(); 

  const [recipe, setRecipe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const { filteredRecipes: contextRecipes } = useRecipe();

  useEffect(() => {
    const findRecipe = async () => {
      setLoading(true);
      setError(null);
      setRecipe(null); 
      let foundRecipe = null;

      const formatCookpadUrl = (rawUrl) => {
        if (!rawUrl) return 'https://cookpad.com';
        const trimmed = rawUrl.trim().replace(/(^"|"$)/g, '');
        if (trimmed.startsWith('http')) return trimmed;
        if (trimmed.startsWith('/id/resep/')) return `https://cookpad.com${trimmed}`;
        return `https://cookpad.com/id/resep/${trimmed}`;
      };

      try {
        if (location.state && location.state.recipeData) {
          const stateRecipeTitle = location.state.recipeData.title || location.state.recipeData.Title || "";
          if (slugify(stateRecipeTitle) === recipeSlug) {
            foundRecipe = location.state.recipeData;
          }
        }

        if (!foundRecipe && contextRecipes && contextRecipes.length > 0) {
          foundRecipe = contextRecipes.find(r => {
             const title = r.title || r.Title || "";
             return slugify(title) === recipeSlug;
          });
        }

        if (!foundRecipe) {
          const response = await fetch('/dataset_finale.csv');
          if (!response.ok) throw new Error("Gagal mengambil dataset");
          
          const csvText = await response.text();
          const rows = csvText.split('\n');
          const headers = rows[0].split(',').map(h => h.trim().toLowerCase());
          
          const titleIdx = headers.indexOf('title');
          const ingredientsIdx = headers.indexOf('ingredients');
          const stepsIdx = headers.indexOf('steps');
          const lovesIdx = headers.indexOf('loves');
          const urlIdx = headers.indexOf('url');

          const cleanSplitArray = (str) => {
            if (!str) return [];
            return str.replace(/(^"|"$)/g, '').split('--').map(i => i.trim()).filter(i => i.length > 0 && i !== '\r');
          };

          for (let i = 1; i < rows.length; i++) {
            const rowStr = rows[i];
            const row = rowStr.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || [];
            if (row.length < 2) continue;

            const cleanString = (str) => str ? str.replace(/(^"|"$)/g, '').trim() : '';
            const rowTitle = cleanString(row[titleIdx]);
            
            if (slugify(rowTitle) === recipeSlug) {
               const absoluteUrl = formatCookpadUrl(row[urlIdx]);
               foundRecipe = {
                 id: i,
                 title: rowTitle,
                 Title: rowTitle,
                 ingredients: cleanSplitArray(row[ingredientsIdx]),
                 steps: cleanSplitArray(row[stepsIdx]),
                 loves: parseInt(cleanString(row[lovesIdx])) || 0,
                 url: absoluteUrl,
                 URL: absoluteUrl
               };
               break;
            }
          }
        }

        if (foundRecipe) {
          setRecipe(foundRecipe);
        } else {
          setError("Resep tidak ditemukan di katalog kami.");
        }

      } catch (err) {
        console.error(err);
        setError("Terjadi kesalahan saat mencari detail resep.");
      } finally {
        setLoading(false);
      }
    };

    findRecipe();
  }, [recipeSlug, location.state, contextRecipes]);

  if (loading) {
     return (
       <div className="min-h-screen bg-gray-50">
         <Header />
         <div className="flex flex-col items-center justify-center py-32">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mb-4"></div>
            <p className="text-gray-500">Menyiapkan resep...</p>
         </div>
       </div>
     );
  }

  if (error) {
     return (
        <div className="min-h-screen flex flex-col bg-gray-50">
            <Header />
            <div className="flex-grow flex flex-col items-center justify-center text-center px-4 py-8">
                <AlertTriangle size={60} className="text-red-500 mb-6" />
                <p className="text-2xl md:text-3xl font-semibold text-red-600 mb-4">Oops! Terjadi Kesalahan</p>
                <p className="text-lg text-gray-700 mb-8 max-w-md">{error}</p>
                <Link to="/" className="bg-orange-500 hover:bg-orange-600 text-white font-medium px-8 py-3 rounded-lg shadow-md flex items-center">
                    <Home size={20} className="mr-2" /> Kembali ke Halaman Utama
                </Link>
            </div>
        </div>
     );
  }

  if (!recipe) {
    return <Navigate to="/404" state={{ from: location }} replace />; 
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="container mx-auto px-4 py-8 max-w-4xl">
         <Link to="/recipes" className="inline-flex items-center text-sm text-gray-500 hover:text-orange-500 mb-6 transition-colors">
            ← Kembali ke Rekomendasi
         </Link>
         <RecipeDetail recipe={recipe} />
      </main>
    </div>
  );
};

export default RecipePage;