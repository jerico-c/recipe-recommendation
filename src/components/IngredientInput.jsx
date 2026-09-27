
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useRecipe } from '../context/RecipeContext'; 
import { X } from 'lucide-react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast as sonnerToast } from 'sonner'; 


const newMasterIngredientsList = [
  'Bawang Bombai', 'Bawang Merah', 'Bawang Putih', 'Brokoli', 'Cabai Hijau', 
  'Cabai Merah', 'Daging Sapi', 'Daging Unggas', 'Ikan', 'Jagung', 'Jahe', 
  'Jamur', 'Kacang Hijau', 'Kacang Merah', 'Kacang Panjang', 'Kacang Tanah', 
  'Kembang Kol', 'Kentang', 'Kikil', 'Kol', 'Labu Siam', 'Mie', 'Nasi', 
  'Petai', 'Sawi', 'Selada', 'Seledri', 'Telur Ayam', 'Telur Bebek', 
  'Tempe', 'Terong', 'Timun', 'Tomat', 'Usus', 'Wortel'
].map((name, index) => ({ 
  id: `master-${index}-${name.toLowerCase().replace(/\s+/g, '-')}`, 
  name: name,
}));

const normalizeIngredientName = (value) =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

const getSimilarity = (left, right) => {
  if (left === right) return 1;
  if (!left || !right) return 0;

  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let row = 1; row <= left.length; row += 1) {
    const current = [row];
    for (let column = 1; column <= right.length; column += 1) {
      current[column] = Math.min(
        current[column - 1] + 1,
        previous[column] + 1,
        previous[column - 1] + (left[row - 1] === right[column - 1] ? 0 : 1),
      );
    }
    for (let column = 0; column <= right.length; column += 1) {
      previous[column] = current[column];
    }
  }

  return 1 - previous[right.length] / Math.max(left.length, right.length);
};

const getIngredientSuggestionScore = (query, ingredientName) => {
  const normalizedName = normalizeIngredientName(ingredientName);
  const queryWords = query.split(' ').filter(Boolean);
  const nameWords = normalizedName.split(' ').filter(Boolean);
  const fullNameScore = getSimilarity(query, normalizedName);
  const wordScore = Math.max(
    ...queryWords.flatMap(queryWord =>
      nameWords.map(nameWord => getSimilarity(queryWord, nameWord)),
    ),
    0,
  );

  return Math.max(fullNameScore, wordScore);
};

const IngredientInput = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [multiInput, setMultiInput] = useState('');
  const { selectedIngredients, addIngredient, removeIngredient } = useRecipe();
  const dropdownRef = useRef(null);

  // Filter bahan dari daftar master baru
  const filteredMasterIngredients = newMasterIngredientsList.filter(ingredient =>
    ingredient.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
    !selectedIngredients.some(selected => selected.name.toLowerCase() === ingredient.name.toLowerCase())
  );

  const suggestedIngredient = useMemo(() => {
    const normalizedQuery = normalizeIngredientName(searchQuery);
    if (!normalizedQuery || filteredMasterIngredients.length > 0) return null;

    return newMasterIngredientsList
      .filter(ingredient => !selectedIngredients.some(
        selected => selected.name.toLowerCase() === ingredient.name.toLowerCase(),
      ))
      .map(ingredient => ({
        ingredient,
        score: getIngredientSuggestionScore(
          normalizedQuery,
          ingredient.name,
        ),
      }))
      .sort((left, right) => right.score - left.score)[0] || null;
  }, [searchQuery, filteredMasterIngredients.length, selectedIngredients]);

  const hasSuggestion = Boolean(
    suggestedIngredient && suggestedIngredient.score >= 0.58,
  );

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        const searchInput = document.getElementById('ingredientSearchInput'); 
        if (searchInput && searchInput.contains(event.target)) {
            return;
        }
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [dropdownRef]);


  const handleSelectIngredient = (ingredient) => {
    addIngredient({ 
        id: ingredient.id,
        name: ingredient.name,
        image: ingredient.image // Jika ada
    });
    setSearchQuery('');
    setShowDropdown(false);
  };

  const handleAddTypedIngredient = () => {
    const typedIngredientName = searchQuery.trim();
    if (typedIngredientName) {
      const isAlreadySelected = selectedIngredients.some(
        (selected) => selected.name.toLowerCase() === typedIngredientName.toLowerCase()
      );
      if (isAlreadySelected) {
        sonnerToast.info(`Bahan "${typedIngredientName}" sudah ada dalam daftar.`);
      } else {
        addIngredient({
          id: `typed-${Date.now()}-${typedIngredientName.toLowerCase().replace(/\s+/g, '-')}`,
          name: typedIngredientName,
          // image: opsional, bisa null atau placeholder default
        });
        sonnerToast.success(`Bahan "${typedIngredientName}" ditambahkan.`);
      }
      setSearchQuery('');
      setShowDropdown(false);
    }
  };

  const handleAcceptSuggestion = () => {
    if (hasSuggestion && suggestedIngredient?.ingredient) {
      handleSelectIngredient(suggestedIngredient.ingredient);
    }
  };

  const handleSearchInputChange = (e) => {
    setSearchQuery(e.target.value);
    if (e.target.value.trim() !== '') {
      setShowDropdown(true);
    } else {
      setShowDropdown(false);
    }
  };
  
  const handleSearchInputKeyDown = (e) => {
    if (e.key === 'Enter' && searchQuery.trim() !== '') {
      e.preventDefault(); // Mencegah submit form jika ada
      if (filteredMasterIngredients.length > 0) {
        handleSelectIngredient(filteredMasterIngredients[0]);
      } else if (hasSuggestion) {
        handleAcceptSuggestion();
      } else {
        handleAddTypedIngredient();
      }
    }
  };


  return (
    <div className="w-full space-y-4">
      {/* Input Pencarian Bahan Tunggal */}
      <div className="relative" ref={dropdownRef}>
        <div className="relative">
          <Input
            id="ingredientSearchInput" // Tambahkan ID untuk referensi
            type="text"
            placeholder="Cari atau ketik bahan..."
            value={searchQuery}
            onChange={handleSearchInputChange}
            onFocus={() => searchQuery.trim() && setShowDropdown(true)}
            onKeyDown={handleSearchInputKeyDown} // Tambahkan event listener untuk Enter
            className="w-full pl-10 pr-16 py-2 text-sm" // Tambahkan padding kanan untuk tombol "Tambah"
          />
          
          {/* Bahan manual hanya tersedia jika tidak ada kandidat yang cukup mirip. */}
          {searchQuery.trim() && !hasSuggestion && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 px-2 text-foodie-600 hover:bg-foodie-100"
              onClick={handleAddTypedIngredient}
            >
              Tambah
            </Button>
          )}
        </div>

        {showDropdown && searchQuery.trim() && (
          <div className="absolute z-20 mt-1 w-full bg-white rounded-md shadow-lg max-h-60 overflow-auto border border-gray-200">
            {filteredMasterIngredients.length > 0 ? (
              <ul className="py-1">
                {filteredMasterIngredients.map((ingredient) => (
                  <li
                    key={ingredient.id}
                    className="px-3 py-2 hover:bg-foodie-50 cursor-pointer flex items-center text-sm"
                    onClick={() => handleSelectIngredient(ingredient)}
                    onMouseDown={(e) => e.preventDefault()} // Mencegah blur pada input saat item diklik
                  >
                    
                    <span>{ingredient.name}</span>
                  </li>
                ))}
              </ul>
            ) : hasSuggestion ? (
              <button
                type="button"
                className="w-full px-3 py-3 text-left hover:bg-foodie-50 text-sm"
                onClick={handleAcceptSuggestion}
                onMouseDown={(e) => e.preventDefault()}
              >
                <span className="block text-gray-500">Mungkin maksud Anda:</span>
                <span className="font-medium text-foodie-600">
                  {suggestedIngredient.ingredient.name}
                </span>
              </button>
            ) : (
              <p className="px-3 py-2 text-gray-500 text-sm">
                Bahan tidak ditemukan di daftar. Tekan Enter atau tombol "Tambah" untuk menambahkan "{searchQuery}" secara manual.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Daftar Bahan yang Dipilih */}
      {selectedIngredients.length > 0 && (
        <div>
            <h3 className="font-medium mb-2 text-gray-700 text-sm">Bahan yang Dipilih:</h3>
            <div className="flex flex-wrap gap-2">
            {selectedIngredients.map(ingredient => (
                <div 
                key={ingredient.id || ingredient.name} // Fallback ke nama jika ID tidak ada
                className="bg-foodie-100 text-foodie-700 px-2.5 py-1 rounded-full flex items-center gap-1.5 text-sm shadow-sm"
                >
                <span>{ingredient.name}</span>
                <button 
                    onClick={() => removeIngredient(ingredient.id || ingredient.name)} // Fallback ke nama jika ID tidak ada
                    className="text-foodie-500 hover:text-foodie-700"
                    aria-label={`Hapus ${ingredient.name}`}
                >
                    <X size={14} />
                </button>
                </div>
            ))}
            </div>
        </div>
      )}
    </div>
  );
};

export default IngredientInput;
