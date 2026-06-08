
import React, { useState, useEffect, useMemo } from 'react';
import { Upload, Search, Utensils, AlertCircle, X } from 'lucide-react';
import RecipeCard from '../components/RecipeCard';
import RecipeDetail from '../components/RecipeDetail';

// CSV parser (supports quoted fields with commas)
const parseCSV = (text) => {
  const lines = [];
  let currentLine = [];
  let currentCell = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"' && text[i + 1] === '"') {
      currentCell += '"';
      i++; // skip escaped quote
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      currentLine.push(currentCell);
      currentCell = '';
    } else if ((char === '\n' || (char === '\r' && text[i + 1] === '\n')) && !inQuotes) {
      if (char === '\r') i++;
      currentLine.push(currentCell);
      lines.push(currentLine);
      currentLine = [];
      currentCell = '';
    } else {
      currentCell += char;
    }
  }
  if (currentCell || currentLine.length > 0) {
    currentLine.push(currentCell);
    lines.push(currentLine);
  }
  return lines;
};

const Recipes = () => {
  const [recipes, setRecipes] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Attempt to load default dataset from public folder
  useEffect(() => {
    const loadDefault = async () => {
      setIsLoading(true);
      setError('');
      try {
        const resp = await fetch('/dataset_finale_v2.csv');
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const text = await resp.text();
        const parsed = parseCSV(text);
        if (parsed.length < 2) throw new Error('Dataset kosong atau tidak valid');

        const headers = parsed[0].map(h => h.trim().toLowerCase());
        const titleIdx = headers.indexOf('title');
        const ingredientsIdx = headers.indexOf('ingredients');
        const stepsIdx = headers.indexOf('steps');
        const lovesIdx = headers.indexOf('loves');
        const urlIdx = headers.indexOf('url');

        const mapped = parsed.slice(1).map((row, idx) => {
          if (!row || row.length === 0 || !row[titleIdx]) return null;
          const rawUrl = urlIdx !== -1 && row[urlIdx] ? row[urlIdx].trim() : '';
          let finalUrl = '';
          if (rawUrl.startsWith('http')) finalUrl = rawUrl;
          else if (rawUrl.startsWith('/id/resep/')) finalUrl = `https://cookpad.com${rawUrl}`;
          else if (rawUrl) finalUrl = `https://cookpad.com${rawUrl}`;

          const ingredientsStr = ingredientsIdx !== -1 ? row[ingredientsIdx] : '';
          const stepsStr = stepsIdx !== -1 ? row[stepsIdx] : '';

          return {
            id: idx,
            Title: row[titleIdx],
            Ingredients: ingredientsStr || '', // RecipeCard expects Ingredients prop
            Steps: stepsStr || '',
            Loves: lovesIdx !== -1 ? parseInt(row[lovesIdx]) || 0 : 0,
            url: finalUrl,
            imageUrl: `https://loremflickr.com/400/300/food?lock=${idx + 10}`
          };
        }).filter(r => r !== null);

        setRecipes(mapped);
      } catch (err) {
        console.warn('Could not load default dataset:', err.message);
        setError('Gagal memuat dataset default. Anda dapat mengunggah file CSV.');
      } finally {
        setIsLoading(false);
      }
    };

    loadDefault();
  }, []);

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    if (!file.name.endsWith('.csv')) {
      setError('Mohon unggah file dengan format .csv');
      return;
    }

    setIsLoading(true);
    setError('');

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target.result;
        const parsed = parseCSV(text);
        if (parsed.length < 2) throw new Error('Dataset tampak kosong atau tidak valid.');
        const headers = parsed[0].map(h => h.trim().toLowerCase());
        const titleIdx = headers.indexOf('title');
        const ingredientsIdx = headers.indexOf('ingredients');
        const stepsIdx = headers.indexOf('steps');
        const lovesIdx = headers.indexOf('loves');
        const urlIdx = headers.indexOf('url');
        if (titleIdx === -1) throw new Error('Kolom "Title" tidak ditemukan di CSV.');

        const mapped = parsed.slice(1).map((row, index) => {
          if (!row || row.length === 0 || !row[titleIdx]) return null;
          const rawUrl = urlIdx !== -1 && row[urlIdx] ? row[urlIdx].trim() : '';
          let finalUrl = '';
          if (rawUrl.startsWith('http')) finalUrl = rawUrl;
          else if (rawUrl.startsWith('/id/resep/')) finalUrl = `https://cookpad.com${rawUrl}`;
          else if (rawUrl) finalUrl = `https://cookpad.com${rawUrl}`;
          const ingredientsStr = ingredientsIdx !== -1 ? row[ingredientsIdx] : '';
          const stepsStr = stepsIdx !== -1 ? row[stepsIdx] : '';
          return {
            id: index,
            Title: row[titleIdx],
            Ingredients: ingredientsStr || '',
            Steps: stepsStr || '',
            Loves: lovesIdx !== -1 ? parseInt(row[lovesIdx]) || 0 : 0,
            url: finalUrl,
            imageUrl: `https://loremflickr.com/400/300/food?lock=${index + 10}`
          };
        }).filter(r => r !== null);

        setRecipes(mapped);
      } catch (err) {
        setError(`Gagal memproses data: ${err.message}`);
      } finally {
        setIsLoading(false);
      }
    };
    reader.onerror = () => {
      setError('Terjadi kesalahan saat membaca file.');
      setIsLoading(false);
    };
    reader.readAsText(file);
  };

  const filtered = useMemo(() => {
    if (!searchTerm) return recipes;
    return recipes.filter(r => (r.Title || '').toLowerCase().includes(searchTerm.toLowerCase()));
  }, [recipes, searchTerm]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans">
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-orange-600">
            <h1 className="text-2xl font-bold tracking-tight">Katalog Resep</h1>
          </div>

          <div className="relative w-full sm:w-72">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-slate-400" />
            </div>
            <input
              type="text"
              className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg leading-5 bg-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 sm:text-sm transition-colors"
              placeholder="Cari resep..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {recipes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-4 bg-white rounded-2xl shadow-sm border border-slate-100 border-dashed text-center">
            <div className="bg-orange-100 p-4 rounded-full mb-6 text-orange-600">
              <Upload size={40} />
            </div>
            <h2 className="text-2xl font-semibold mb-2">Unggah Dataset Cookpad Anda</h2>
            <p className="text-slate-500 mb-8 max-w-md">Unggah file CSV dataset (contoh: `dataset_finale_v2.csv`) atau letakkan file tersebut di folder `public/` agar otomatis dimuat.</p>

            <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md justify-center">
              <label className="cursor-pointer bg-orange-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-orange-700 transition-colors shadow-sm flex items-center justify-center gap-2">
                <Upload size={20} />
                <span>Unggah CSV</span>
                <input 
                  type="file" 
                  className="hidden" 
                  accept=".csv"
                  onChange={handleFileUpload}
                />
              </label>
            </div>

            {error && (
              <div className="mt-6 flex items-center gap-2 text-red-600 bg-red-50 px-4 py-3 rounded-lg">
                <AlertCircle size={20} />
                <span className="text-sm">{error}</span>
              </div>
            )}
            {isLoading && (
              <div className="mt-6 text-orange-600 font-medium animate-pulse">Memproses dataset...</div>
            )}
          </div>
        ) : (
          <div>
            <div className="mb-6 flex justify-between items-end">
              <h2 className="text-xl font-semibold text-slate-800">Semua Resep</h2>
            </div>

            {filtered.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-xl shadow-sm border border-slate-100">
                <Utensils size={48} className="mx-auto text-slate-300 mb-4" />
                <h3 className="text-lg font-medium text-slate-700">Tidak ada resep yang cocok</h3>
                <p className="text-slate-500 mt-1">Coba gunakan kata kunci pencarian yang lain.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filtered.map(recipe => (
                  <div key={recipe.id || recipe.Title} onClick={() => setSelectedRecipe(recipe)}>
                    <RecipeCard recipe={recipe} />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Modal detail resep */}
        {selectedRecipe && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <div className="flex justify-end p-4">
                <button onClick={() => setSelectedRecipe(null)} className="p-2 rounded-full bg-slate-100 hover:bg-slate-200">
                  <X />
                </button>
              </div>
              <div className="overflow-y-auto p-4 sm:p-6">
                <RecipeDetail recipe={selectedRecipe} />
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Recipes;