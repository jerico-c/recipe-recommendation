const ABBREVIATIONS = {
  bawang: 'bawang',
  cabe: 'cabai',
  cabai: 'cabai',
  tepung: 'tepung',
  sdm: 'sendok makan',
  sdt: 'sendok teh',
  gr: 'gram',
  kg: 'kilogram',
  ml: 'mililiter',
  ltr: 'liter',
};

const STOP_WORDS = new Set([
  'dan', 'dengan', 'secukupnya', 'sesuai', 'selera', 'untuk', 'atau',
  'yang', 'sudah', 'saja', 'buah', 'butir', 'batang', 'lembar', 'ruas',
  'siung', 'potong', 'gram', 'kilogram', 'mililiter', 'liter',
]);

const normalizeText = (value = '') =>
  value
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\d+(?:[.,]\d+)?\s*(?:kg|kilogram|gram|gr|g|ml|mililiter|l|liter|sdm|sdt)\b/g, ' ')
    .replace(/[^a-z\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const normalizeIngredient = (value) => {
  const words = normalizeText(value)
    .split(' ')
    .filter(Boolean)
    .map(word => ABBREVIATIONS[word] || word)
    .join(' ');

  return words
    .split(' ')
    .filter(word => word && !STOP_WORDS.has(word))
    .join(' ')
    .trim();
};

const ingredientItems = (recipe) => {
  if (Array.isArray(recipe.ingredients) && recipe.ingredients.length > 0) {
    return recipe.ingredients;
  }

  return (recipe.Ingredients_Clean || recipe.Ingredients || '')
    .split('--')
    .map(item => item.replace(/^[-•]\s*/, '').trim())
    .filter(Boolean);
};

const levenshteinDistance = (left, right) => {
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

  return previous[right.length];
};

const fuzzySimilarity = (left, right) => {
  if (left === right) return 1;
  const maxLength = Math.max(left.length, right.length);
  if (!maxLength) return 1;
  return 1 - levenshteinDistance(left, right) / maxLength;
};

const getFuzzyMatch = (input, vocabulary) => {
  const normalizedInput = normalizeIngredient(input);
  if (!normalizedInput) return null;

  let bestMatch = null;
  vocabulary.forEach(candidate => {
    const isContainedPhrase =
      candidate.includes(normalizedInput) || normalizedInput.includes(candidate);
    const score = isContainedPhrase
      ? 0.86 + (Math.min(normalizedInput.length, candidate.length) /
          Math.max(normalizedInput.length, candidate.length)) * 0.14
      : fuzzySimilarity(normalizedInput, candidate);
    if (!bestMatch || score > bestMatch.score) {
      bestMatch = { value: candidate, score };
    }
  });

  // A typo should be close enough to a known ingredient; unrelated words
  // must not introduce a false positive into the recommendation query.
  return bestMatch && bestMatch.score >= 0.72 ? bestMatch : null;
};

const termFrequency = (terms) => {
  const frequencies = new Map();
  terms.forEach(term => frequencies.set(term, (frequencies.get(term) || 0) + 1));
  return frequencies;
};

const cosineSimilarity = (left, right) => {
  let dotProduct = 0;
  let leftMagnitude = 0;
  let rightMagnitude = 0;

  left.forEach((leftValue, term) => {
    const rightValue = right.get(term) || 0;
    dotProduct += leftValue * rightValue;
    leftMagnitude += leftValue ** 2;
  });
  right.forEach(value => {
    rightMagnitude += value ** 2;
  });

  if (!leftMagnitude || !rightMagnitude) return 0;
  return dotProduct / (Math.sqrt(leftMagnitude) * Math.sqrt(rightMagnitude));
};

const waitForNextFrame = () =>
  new Promise(resolve => setTimeout(resolve, 0));

export const getRecommendationsProgressive = async (
  userIngredients,
  recipes,
  onProgress,
) => {
  if (!Array.isArray(userIngredients) || userIngredients.length === 0 || !Array.isArray(recipes)) {
    return [];
  }

  const documents = [];
  for (let index = 0; index < recipes.length; index += 1) {
    documents.push(
      ingredientItems(recipes[index]).map(normalizeIngredient).filter(Boolean),
    );
    if (index > 0 && index % 500 === 0) await waitForNextFrame();
  }

  const vocabulary = [...new Set(documents.flat())];
  const matchedIngredients = userIngredients
    .map(input => ({ input, match: getFuzzyMatch(input, vocabulary) }))
    .filter(item => item.match);
  const queryTerms = matchedIngredients.map(item => item.match.value);

  if (queryTerms.length === 0) return [];

  const documentFrequency = new Map();
  documents.forEach(document => {
    [...new Set(document)].forEach(term => {
      documentFrequency.set(term, (documentFrequency.get(term) || 0) + 1);
    });
  });

  const totalDocuments = documents.length;
  const toTfidf = terms => {
    const frequencies = termFrequency(terms);
    const vector = new Map();
    frequencies.forEach((frequency, term) => {
      const inverseDocumentFrequency = Math.log(
        (totalDocuments + 1) / ((documentFrequency.get(term) || 0) + 1),
      ) + 1;
      vector.set(term, (frequency / terms.length) * inverseDocumentFrequency);
    });
    return vector;
  };

  const queryVector = toTfidf(queryTerms);
  const scoredRecipes = [];
  const batchSize = 500;

  for (let start = 0; start < recipes.length; start += batchSize) {
    const end = Math.min(start + batchSize, recipes.length);
    for (let index = start; index < end; index += 1) {
      const document = documents[index];
      const similarity = cosineSimilarity(queryVector, toTfidf(document));
      if (similarity <= 0) continue;

      const recipeTerms = new Set(document);
      scoredRecipes.push({
        ...recipes[index],
        similarity,
        matchScore: similarity,
        matchedIngredients: matchedIngredients
          .filter(item => recipeTerms.has(item.match.value))
          .map(item => item.match.value),
      });
    }

    scoredRecipes.sort((left, right) => right.similarity - left.similarity);
    onProgress([...scoredRecipes]);
    await waitForNextFrame();
  }

  return scoredRecipes;
};
