import React, { useState } from 'react';
import { ExternalLink, Heart, BookOpen, Utensils, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function RecipeDetail({ recipe }) {
  const navigate = useNavigate();
  
  if (!recipe) return null;

  // Normalisasi Properti (Mendukung Huruf Besar & Kecil dari Dataset)
  const title = recipe.title || recipe.Title || "Judul Tidak Tersedia";
  const loves = recipe.loves || recipe.Loves || 0;
  const url = recipe.url || recipe.URL || "#";
  
  // URL Gambar (Menggunakan hasil ekstraksi ID dari Pinterest Cookpad)
  const [imgSrc, setImgSrc] = useState(
    recipe.imageUrl || `https://loremflickr.com/800/600/food,cooked?lock=${recipe.id || 1}`
  );

  // Fungsi pembersih list (Menghilangkan baris kosong & bullet liar)
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

  const handleImageError = () => {
    setImgSrc(`https://loremflickr.com/800/600/food,cooked,delicious?lock=${recipe.id || 1}`);
  };

  return (
    <div className="max-w-5xl mx-auto bg-white rounded-2xl shadow-md overflow-hidden border border-gray-100 mb-10">
      
      {/* 1. HERO IMAGE SECTION */}
      <div className="relative w-full h-64 md:h-[450px] bg-gray-200">
        <img 
          src={imgSrc} 
          alt={title} 
          onError={handleImageError}
          className="w-full h-full object-cover"
        />
        {/* Overlay Gradasi agar teks di atas gambar (jika ada) nantinya terbaca */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
        
        {/* Tombol Back Mobile (Floating) */}
        <button 
          onClick={() => navigate(-1)}
          className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm p-2 rounded-full shadow-md md:hidden text-gray-700 hover:bg-white transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
      </div>

      {/* 2. HEADER INFO SECTION */}
      <div className="p-6 md:p-8 border-b border-gray-50">
        <div className="flex flex-col md:flex-row justify-between items-start gap-4">
          <div className="flex-grow">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-800 leading-tight mb-3">
              {title}
            </h1>
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5 text-red-500 bg-red-50 px-3 py-1.5 rounded-full text-sm font-bold">
                <Heart size={18} className="fill-red-500" /> {Number(loves).toLocaleString('id-ID')} disukai
              </span>
            </div>
          </div>
          
          <div className="shrink-0 w-full md:w-auto">
            <a 
              href={url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 bg-orange-500 text-white px-6 py-3 rounded-xl font-bold hover:bg-orange-600 transition shadow-lg shadow-orange-200 w-full md:w-auto"
            >
              Buka di Cookpad <ExternalLink size={18} />
            </a>
          </div>
        </div>
      </div>

      {/* 3. CONTENT GRID (Ingredients & Steps) */}
      <div className="grid md:grid-cols-3">
        
        {/* Kolom Bahan (1/3 Lebar di Desktop) */}
        <div className="md:col-span-1 bg-gray-50/50 p-6 md:p-8 border-b md:border-b-0 md:border-r border-gray-100">
          <h3 className="text-xl font-bold flex items-center gap-2 mb-6 text-gray-800">
            <BookOpen size={24} className="text-orange-500" /> Bahan-bahan
          </h3>
          <ul className="space-y-4">
            {ingredientsList.length > 0 ? (
              ingredientsList.map((item, idx) => (
                <li key={idx} className="flex gap-3 text-gray-700 text-base leading-relaxed">
                  <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-orange-400 mt-2.5"></span>
                  <span>{item}</span>
                </li>
              ))
            ) : (
              <li className="text-gray-400 italic">Daftar bahan tidak tersedia.</li>
            )}
          </ul>
        </div>
        
        {/* Kolom Langkah (2/3 Lebar di Desktop) */}
        <div className="md:col-span-2 p-6 md:p-8 bg-white">
          <h3 className="text-xl font-bold flex items-center gap-2 mb-6 text-gray-800">
            <Utensils size={24} className="text-orange-500" /> Langkah Pembuatan
          </h3>
          <div className="space-y-8">
            {stepsList.length > 0 ? (
              stepsList.map((step, idx) => (
                <div key={idx} className="flex gap-5 group">
                  <div className="flex-shrink-0 flex items-center justify-center w-9 h-9 rounded-full bg-orange-100 text-orange-700 font-bold text-lg transition-colors group-hover:bg-orange-500 group-hover:text-white">
                    {idx + 1}
                  </div>
                  <div className="pt-1 border-b border-gray-50 pb-6 w-full last:border-0">
                    <p className="text-gray-700 leading-relaxed text-base md:text-lg">
                      {step}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-400 italic text-center py-10">Langkah pembuatan tidak tersedia.</p>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}