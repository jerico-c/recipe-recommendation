import React from 'react';
import { Link } from 'react-router-dom';
import { Heart, Zap, NotebookText } from 'lucide-react';
import { getRecipeImageUrlFromShare } from '../services/cookpadImageService';

const RecipeCard = ({ recipe }) => {
    const [imageUrl, setImageUrl] = React.useState(null);
    const [imageError, setImageError] = React.useState(false);
    const [loadingImage, setLoadingImage] = React.useState(true);
    
    const recipeTitle = (typeof recipe.Title === 'string' ? recipe.Title : "Judul Tidak Tersedia").trim();

    const recipeSlug = recipeTitle
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^\w-]+/g, '');

    // Fetch image dari Cookpad share link
    React.useEffect(() => {
      const fetchImage = async () => {
        setLoadingImage(true);
        setImageError(false);
        
        try {
          const imageUrlFromShare = await getRecipeImageUrlFromShare(recipe);
          if (imageUrlFromShare) {
            setImageUrl(imageUrlFromShare);
          } else {
            setImageError(true);
          }
        } catch (error) {
          console.error('Error fetching recipe card image:', error);
          setImageError(true);
        } finally {
          setLoadingImage(false);
        }
      };

      if (recipe) {
        fetchImage();
      }
    }, [recipe]);

    const truncateText = (text, maxLength = 70) => {
        if (!text || typeof text !== 'string') return 'Bahan tidak tersedia';
        const trimmedText = text.trim();
        if (trimmedText.length <= maxLength) return trimmedText;
        return trimmedText.substring(0, maxLength) + '...';
    };

    return (
        <div className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300 flex flex-col h-full">
            <div className="relative w-full h-48 bg-green-100 overflow-hidden">
                {loadingImage ? (
                    <div className="w-full h-full flex items-center justify-center bg-gray-100">
                        <div className="animate-pulse flex items-center justify-center">
                            <svg className="w-10 h-10 text-gray-300" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" />
                            </svg>
                        </div>
                    </div>
                ) : imageUrl && !imageError ? (
                    <img
                        src={imageUrl}
                        alt={recipeTitle}
                        className="w-full h-full object-cover"
                        onError={() => setImageError(true)}
                    />
                ) : (
                    <div className="w-full h-full bg-green-100 flex items-center justify-center text-green-500">
                        <svg className="w-16 h-16 opacity-30" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" />
                        </svg>
                    </div>
                )}
            </div>

            <div className="p-5 flex flex-col flex-grow">
                <div className="flex-grow">
                    <h3 className="text-xl font-semibold text-green-700 mb-2 truncate" title={recipeTitle}>
                        {recipeTitle}
                    </h3>

                    {/* Memberikan tinggi minimum untuk menjaga konsistensi ruang */}
                    <div className="text-xs text-gray-500 mb-3 space-y-1 min-h-[2.25rem]">
                        {typeof recipe.Kalori === 'number' && recipe.Kalori > 0 && (
                            <div className="flex items-center">
                                <Zap size={14} className="mr-1.5 text-yellow-500" />
                                <span>{Math.round(recipe.Kalori)} Kalori</span>
                            </div>
                        )}
                        {typeof recipe.Loves === 'number' && recipe.Loves > 0 && (
                            <div className="flex items-center">
                                <Heart size={14} className="mr-1.5 text-red-500" />
                                <span>{recipe.Loves.toLocaleString('id-ID')} Suka</span>
                            </div>
                        )}
                    </div>

                    {/* Memberikan tinggi tetap pada paragraf bahan dan menyembunyikan teks berlebih */}
                    <p className="text-sm text-gray-600 mb-4 h-14 overflow-hidden">
                        <span className="font-medium">Bahan Utama:</span> {truncateText(recipe.Ingredients)}
                    </p>
                </div>

                <div className="pt-3 border-t border-gray-200">
                    <Link
                        to={`/resep/${recipeSlug}`}
                        state={{ recipeData: recipe, fromRecipesPage: window.location.pathname === '/recipes' }}
                        className="w-full text-center bg-foodie-500 hover:bg-foodie-600 text-white font-medium py-2 px-4 rounded-md transition-colors duration-150 flex items-center justify-center"
                    >
                        <NotebookText size={18} className="mr-2" />
                        Lihat Detail Resep
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default RecipeCard;