import React, { useState, useEffect, useMemo } from 'react';
import RecipeCard from './RecipeCard';
import { Search, ChevronLeft, ChevronRight, Utensils } from 'lucide-react';

const RecipeList = ({ recipes }) => {
  // State untuk Pencarian dan Paginasi
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // Reset halaman ke 1 setiap kali daftar resep asli atau kata kunci pencarian berubah
  useEffect(() => {
    setCurrentPage(1);
  }, [recipes, searchTerm]);

  // Memfilter resep berdasarkan pencarian (Sangat cepat karena menggunakan useMemo)
  const processedRecipes = useMemo(() => {
    if (!searchTerm.trim()) return recipes;
    
    return recipes.filter(recipe => {
      const title = recipe.title || recipe.Title || "";
      return title.toLowerCase().includes(searchTerm.toLowerCase());
    });
  }, [recipes, searchTerm]);

  // Menghitung data untuk paginasi
  const totalPages = Math.ceil(processedRecipes.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  // Memotong array resep untuk hanya menampilkan 20 data pada halaman saat ini
  const currentRecipes = processedRecipes.slice(startIndex, startIndex + itemsPerPage);

  // Fungsi navigasi halaman
  const goToNextPage = () => setCurrentPage(prev => Math.min(prev + 1, totalPages));
  const goToPrevPage = () => setCurrentPage(prev => Math.max(prev - 1, 1));
  const goToPage = (page) => setCurrentPage(page);

  return (
    <div className="container mx-auto p-4 max-w-7xl">
      
      {/* 1. Header & Search Bar */}
      {recipes && recipes.length > 0 && (
        <div className="mb-6 bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4">
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            Rekomendasi Resep 
            <span className="bg-orange-100 text-orange-600 px-3 py-1 rounded-full text-sm font-semibold">
              {processedRecipes.length}
            </span>
          </h2>
          
          <div className="relative w-full md:w-80">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={18} className="text-gray-400" />
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari nama resep di sini..."
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all shadow-sm text-sm"
            />
          </div>
        </div>
      )}

      {/* 2. Grid Resep */}
      {currentRecipes.length > 0 ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 items-stretch">
            {currentRecipes.map((recipe, index) => (
              <RecipeCard 
                key={recipe.id || recipe.Title || recipe.title || index} 
                recipe={recipe} 
              />
            ))}
          </div>

          {/* 3. Paginasi (Hanya tampil jika halaman lebih dari 1) */}
          {totalPages > 1 && (
            <div className="mt-12 mb-8 flex justify-center items-center gap-2">
              <button 
                onClick={goToPrevPage} 
                disabled={currentPage === 1}
                className="p-2.5 rounded-lg border border-gray-200 hover:bg-orange-50 hover:text-orange-600 disabled:opacity-40 disabled:hover:bg-transparent disabled:cursor-not-allowed transition-colors bg-white shadow-sm"
              >
                <ChevronLeft size={20} />
              </button>
              
              <div className="flex gap-1 md:gap-2">
                {Array.from({ length: totalPages }).map((_, idx) => {
                  const page = idx + 1;
                  // Logika cerdas untuk menyingkat angka halaman jika terlalu banyak (1 ... 4 5 6 ... 10)
                  if (
                    page === 1 || 
                    page === totalPages || 
                    (page >= currentPage - 1 && page <= currentPage + 1)
                  ) {
                    return (
                      <button
                        key={page}
                        onClick={() => goToPage(page)}
                        className={`w-10 h-10 rounded-lg font-bold text-sm transition-all shadow-sm ${
                          currentPage === page 
                            ? 'bg-orange-500 text-white scale-110' 
                            : 'bg-white text-gray-600 border border-gray-200 hover:bg-orange-50 hover:text-orange-600'
                        }`}
                      >
                        {page}
                      </button>
                    );
                  } else if (
                    page === currentPage - 2 || 
                    page === currentPage + 2
                  ) {
                    return <span key={page} className="px-1 text-gray-400 flex items-end font-bold tracking-widest pb-2">...</span>;
                  }
                  return null; // Sembunyikan halaman lainnya
                })}
              </div>

              <button 
                onClick={goToNextPage} 
                disabled={currentPage === totalPages}
                className="p-2.5 rounded-lg border border-gray-200 hover:bg-orange-50 hover:text-orange-600 disabled:opacity-40 disabled:hover:bg-transparent disabled:cursor-not-allowed transition-colors bg-white shadow-sm"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          )}
        </>
      ) : (
        /* Tampilan Jika Tidak Ada Resep (Kosong) */
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-gray-100 shadow-sm mt-4">
          <div className="bg-gray-50 p-4 rounded-full mb-4">
            <Utensils size={40} className="text-gray-400" />
          </div>
          <h3 className="text-xl font-bold text-gray-700 mb-2">Tidak ada resep ditemukan</h3>
          <p className="text-gray-500 text-center max-w-md">
            {searchTerm 
              ? `Kami tidak menemukan resep dengan nama "${searchTerm}". Coba gunakan kata kunci lain.` 
              : "Pilih bahan makanan Anda terlebih dahulu untuk mendapatkan rekomendasi resep terbaik."}
          </p>
          
          {/* Tombol reset pencarian jika user salah ketik */}
          {searchTerm && (
             <button 
                onClick={() => setSearchTerm('')}
                className="mt-6 px-6 py-2 bg-orange-100 text-orange-600 font-semibold rounded-lg hover:bg-orange-200 transition"
             >
               Hapus Pencarian
             </button>
          )}
        </div>
      )}
    </div>
  );
};

export default RecipeList;