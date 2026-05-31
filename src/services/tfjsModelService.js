/**
 * Service untuk mengelola TFJS model classification
 * Menggantikan API endpoint dengan model lokal
 */

let model = null;
let classLabels = [];
let modelLoading = false;
let modelLoadError = null;

/**
 * Load class labels dari label.txt
 */
async function loadLabels() {
  try {
    const response = await fetch('/tfjs_model/label.txt');
    const text = await response.text();
    classLabels = text.split('\n').map(label => label.trim()).filter(Boolean);
    console.log('Labels loaded:', classLabels.length, 'classes');
    return classLabels;
  } catch (error) {
    console.error('Error loading labels:', error);
    modelLoadError = 'Gagal memuat label klasifikasi';
    throw error;
  }
}

/**
 * Load TFJS model
 */
async function loadModel() {
  if (model) {
    console.log('Model sudah dimuat');
    return model;
  }

  if (modelLoading) {
    console.log('Model sedang dimuat, tunggu...');
    // Tunggu sampai loading selesai
    let attempts = 0;
    while (modelLoading && attempts < 100) {
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }
    return model;
  }

  modelLoading = true;

  try {
    // Load TensorFlow.js jika belum dimuat
    if (typeof tf === 'undefined') {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs';
      await new Promise((resolve, reject) => {
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
      });
    }

    console.log('Loading TFJS model from /tfjs_model/model.json...');
    // Use http:// protocol with relative path yang akan di-resolve oleh Vite dev server
    const modelPath = `${window.location.origin}/tfjs_model/model.json`;
    model = await tf.loadGraphModel(modelPath);
    
    // Load labels
    await loadLabels();

    console.log('TFJS model loaded successfully');
    return model;
  } catch (error) {
    console.error('Error loading TFJS model:', error);
    modelLoadError = error.message;
    model = null;
    throw error;
  } finally {
    modelLoading = false;
  }
}

/**
 * Preprocess image untuk model
 * @param {HTMLImageElement|HTMLCanvasElement} imageElement
 * @returns {tf.Tensor} Processed tensor [1, 224, 224, 3]
 */
function preprocessImage(imageElement) {
  return tf.tidy(() => {
    // Convert image ke tensor
    let tensor = tf.browser.fromPixels(imageElement);
    
    console.log('Original tensor shape:', tensor.shape);
    console.log('Original tensor dtype:', tensor.dtype);
    
    // Resize ke 224x224 (sesuai model training)
    tensor = tf.image.resizeBilinear(tensor, [224, 224]);
    
    // Convert ke float32 dan normalize ke range [0, 1]
    tensor = tensor.cast('float32').div(tf.scalar(255.0));
    
    console.log('After normalization - min:', tensor.min().arraySync(), 'max:', tensor.max().arraySync());
    
    // Add batch dimension: [224, 224, 3] -> [1, 224, 224, 3]
    tensor = tensor.expandDims(0);
    
    console.log('Final tensor shape for model:', tensor.shape);
    
    return tensor;
  });
}

/**
 * Predict class dari image
 * @param {HTMLImageElement|HTMLCanvasElement} imageElement
 * @returns {Promise<{class: string, confidence: number, allPredictions: Array}>}
 */
async function predictImage(imageElement) {
  if (!model) {
    throw new Error('Model belum dimuat. Panggil loadModel() terlebih dahulu.');
  }

  if (!classLabels || classLabels.length === 0) {
    throw new Error('Class labels belum dimuat');
  }

  try {
    const processingStart = Date.now();
    
    // Preprocess image
    const inputTensor = preprocessImage(imageElement);
    
    console.log('Input tensor shape:', inputTensor.shape);

    // Run prediction
    const predictions = await model.predict(inputTensor);
    const predictionsData = await predictions.data();
    
    const processingTime = Date.now() - processingStart;
    console.log(`Prediction completed in ${processingTime}ms`);

    // Find max prediction
    let maxIndex = 0;
    let maxConfidence = predictionsData[0];

    for (let i = 1; i < predictionsData.length; i++) {
      if (predictionsData[i] > maxConfidence) {
        maxConfidence = predictionsData[i];
        maxIndex = i;
      }
    }

    const predictedClass = classLabels[maxIndex];
    const confidence = Math.round(maxConfidence * 10000) / 100; // Convert to percentage with 2 decimals

    // Get top 5 predictions for debugging
    const allPredictions = Array.from(predictionsData)
      .map((conf, idx) => ({
        class: classLabels[idx],
        confidence: Math.round(conf * 10000) / 100
      }))
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 5);

    // Cleanup
    inputTensor.dispose();
    predictions.dispose();

    return {
      class: predictedClass,
      confidence: confidence,
      allPredictions: allPredictions,
      classIndex: maxIndex
    };
  } catch (error) {
    console.error('Error during prediction:', error);
    throw error;
  }
}

/**
 * Predict dari canvas element (untuk camera capture)
 * @param {HTMLCanvasElement} canvas
 */
async function predictFromCanvas(canvas) {
  return predictImage(canvas);
}

/**
 * Predict dari image file
 * @param {File} file
 */
async function predictFromFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = async (e) => {
      try {
        const img = new Image();
        img.onload = async () => {
          try {
            const result = await predictImage(img);
            resolve(result);
          } catch (error) {
            reject(error);
          }
        };
        img.onerror = () => reject(new Error('Gagal memuat gambar'));
        img.src = e.target.result;
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = () => reject(new Error('Gagal membaca file'));
    reader.readAsDataURL(file);
  });
}

/**
 * Get model status
 */
function getModelStatus() {
  return {
    loaded: model !== null,
    loading: modelLoading,
    error: modelLoadError,
    labelsCount: classLabels.length
  };
}

/**
 * Dispose model (cleanup memory)
 */
function disposeModel() {
  if (model) {
    model.dispose();
    model = null;
  }
}

/**
 * Get all class labels
 */
function getClassLabels() {
  return [...classLabels];
}

export {
  loadModel,
  loadLabels,
  predictImage,
  predictFromCanvas,
  predictFromFile,
  preprocessImage,
  getModelStatus,
  disposeModel,
  getClassLabels
};

export default {
  loadModel,
  loadLabels,
  predictImage,
  predictFromCanvas,
  predictFromFile,
  preprocessImage,
  getModelStatus,
  disposeModel,
  getClassLabels
};
