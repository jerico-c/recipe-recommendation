import React from 'react';
import { ExternalLink, Heart, BookOpen, Utensils } from 'lucide-react';

export default function RecipeDetail({ recipe }) {
  if (!recipe) return null;

  const title = recipe.title || recipe.Title || "Judul Tidak Tersedia";
  const loves = recipe.loves || recipe.Loves || 0;
  const url = recipe.url || recipe.URL || "#";

  // Memastikan data terkonversi ke array bersih tanpa baris kosong
  const cleanList = (data) => {
    if (Array.isArray(data)) {
       return data.map(item => item.trim()).filter(item => item.length > 0);
    }
    if (typeof data === 'string') {
      return data.split('--')
        .map(item => item.trim().replace(/^[-•]\s*/, ''))
        .filter(item => item.length > 0 && item !== '\r');
    }
    return [];
  };

  const ingredientsList = cleanList(recipe.ingredients || recipe.Ingredients);
  const stepsList = cleanList(recipe.steps || recipe.Steps);

  return (
    <div className="p-6 bg-white rounded-xl shadow-sm border border-gray-100">
      <div className="flex flex-col md:flex-row justify-between md:items-start gap-4 mb-6 pb-4 border-b border-gray-100">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 leading-tight mb-2">{title}</h2>
          {loves > 0 && (
            <div className="flex items-center gap-4 text-sm">
              <span className="flex items-center gap-1 text-gray-600 font-medium bg-gray-50 px-3 py-1 rounded-full">
                <Heart size={16} className="text-red-500 fill-red-500" /> {loves.toLocaleString('id-ID')} disukai
              </span>
            </div>
          )}
        </div>
        
        {url && url !== "#" && (
          <a 
            href={url} 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 bg-orange-100 text-orange-600 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-orange-200 transition shrink-0"
          >
            Buka di Cookpad <ExternalLink size={16} />
          </a>
        )}
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        <div className="md:col-span-1">
          <div className="bg-orange-50/50 rounded-xl p-5 border border-orange-100">
            <h3 className="text-lg font-bold flex items-center gap-2 mb-4 text-orange-800">
              <BookOpen size={20} /> Bahan-bahan
            </h3>
            <ul className="space-y-2">
              {ingredientsList.length > 0 ? (
                ingredientsList.map((item, idx) => (
                  <li key={idx} className="flex gap-2 text-gray-700 text-sm leading-relaxed">
                    <span className="text-orange-400 mt-0.5">•</span>
                    <span>{item}</span>
                  </li>
                ))
              ) : (
                <li className="text-sm text-gray-500 italic">Bahan tidak tersedia.</li>
              )}
            </ul>
          </div>
        </div>
        
        <div className="md:col-span-2">
          <h3 className="text-lg font-bold flex items-center gap-2 mb-4 text-gray-800">
            <Utensils size={20} className="text-orange-500" /> Langkah Pembuatan
          </h3>
          <div className="space-y-4">
            {stepsList.length > 0 ? (
              stepsList.map((step, idx) => (
                <div key={idx} className="flex gap-4">
                  <div className="flex-shrink-0 flex items-center justify-center w-7 h-7 rounded-full bg-orange-100 text-orange-700 font-bold text-sm mt-0.5">
                    {idx + 1}
                  </div>
                  <p className="text-gray-700 leading-relaxed text-sm md:text-base">
                    {step}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500 italic">Langkah pembuatan tidak tersedia.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}