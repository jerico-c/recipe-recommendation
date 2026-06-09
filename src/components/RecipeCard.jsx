import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, NotebookText } from 'lucide-react';

const RecipeCard = ({ recipe }) => {
    const title = recipe.title || recipe.Title || "Judul Tidak Tersedia";
    const loves = recipe.loves || recipe.Loves || 0;
    const ingredientsArray = recipe.ingredients || [];
    
    // Gunakan state untuk memegang URL gambar
    const [imgSrc, setImgSrc] = useState(
        recipe.imageUrl || `https://loremflickr.com/400/300/food,cooked?lock=${(recipe.id || 0) + 10}`
    );

    const recipeSlug = title.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '');

    // Fungsi canggih: Jika Cookpad mengembalikan error (gambar dihapus/server down),
    // otomatis ganti ke gambar ilustrasi makanan cantik secara instan.
    const handleImageError = () => {
        setImgSrc(`https://loremflickr.com/400/300/food,cooked,delicious?lock=${(recipe.id || 0) + 10}`);
    };

    return (
        <div className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow duration-300 overflow-hidden border border-gray-100 flex flex-col h-full group">
            
            {/* Bagian Gambar */}
            <div className="h-48 bg-slate-100 relative overflow-hidden flex-shrink-0">
                <img 
                    src={imgSrc} 
                    alt={title} 
                    onError={handleImageError} // Panggil fungsi error handler jika gagal
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                />
                
                {loves > 0 && (
                    <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-md text-xs font-semibold flex items-center gap-1 text-slate-700 shadow-sm">
                        <Heart size={14} className="text-red-500 fill-red-500" />
                        {loves.toLocaleString('id-ID')}
                    </div>
                )}
            </div>

            {/* Bagian Konten */}
            <div className="p-4 flex-grow flex flex-col">
                <h3 className="font-bold text-lg text-gray-800 mb-2 line-clamp-2 leading-tight">{title}</h3>
                
                <p className="text-sm text-gray-600 mb-4 line-clamp-2 mt-2">
                    <span className="font-medium text-gray-800">Bahan:</span> {ingredientsArray.join(', ') || 'Bahan tidak tersedia'}
                </p>
            </div>

            {/* Bagian Tombol */}
            <div className="p-4 pt-0 mt-auto border-t border-gray-50 pt-4">
                <Link
                    to={`/resep/${recipeSlug}`}
                    state={{ recipeData: recipe, fromRecipesPage: window.location.pathname === '/recipes' }}
                    className="w-full text-center bg-orange-500 hover:bg-orange-600 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-150 flex items-center justify-center"
                >
                    <NotebookText size={18} className="mr-2" />
                    Lihat Detail
                </Link>
            </div>
        </div>
    );
};

export default RecipeCard;