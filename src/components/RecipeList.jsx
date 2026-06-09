import React from 'react';
import RecipeCard from './RecipeCard';
import { Utensils } from 'lucide-react';

const RecipeList = ({ recipes }) => {
  return (
    <div className="container mx-auto p-4">
      {recipes && recipes.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 items-stretch">
          {recipes.map((recipe, index) => (
            <RecipeCard 
              // Fallback unik ID jika properti id/Title/title tidak tersedia
              key={recipe.id || recipe.Title || recipe.title || index} 
              recipe={recipe} 
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 bg-gray-50 rounded-xl border border-gray-100">
          <Utensils size={48} className="text-gray-300 mb-4" />
          <h3 className="text-lg font-semibold text-gray-700">Tidak ada resep ditemukan</h3>
          <p className="text-gray-500 text-sm mt-1 max-w-sm text-center">
            Coba sesuaikan kata kunci bahan makanan Anda untuk mendapatkan rekomendasi.
          </p>
        </div>
      )}
    </div>
  );
};

export default RecipeList;