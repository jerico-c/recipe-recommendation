/**
 * Service untuk Object Detection menggunakan MediaPipe dan TFLite Model (MobileNetV2)
 * Mendeteksi bahan makanan dalam gambar dengan bounding boxes
 */

import { ObjectDetector, FilesetResolver } from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/vision_bundle.mjs";

let objectDetector = null;
let isModelLoaded = false;
let modelLoadError = null;
let modelLoading = false;

/**
 * Initialize ObjectDetector dengan model MobileNetV2 tflite
 */
async function loadModel() {
  if (objectDetector) {
    console.log('Model sudah dimuat');
    return objectDetector;
  }

  if (modelLoading) {
    console.log('Model sedang dimuat, tunggu...');
    // Tunggu sampai loading selesai - timeout lebih lama untuk mobile
    let attempts = 0;
    const maxAttempts = 600; // 60 detik untuk mobile yang lambat
    while (modelLoading && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }
    if (!isModelLoaded) {
      throw new Error('Gagal memuat model setelah menunggu');
    }
    return objectDetector;
  }

  modelLoading = true;

  try {
    console.log('Initializing MediaPipe ObjectDetector...');
    
    // Deteksi device untuk optimisasi
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    console.log('Device type:', isMobile ? 'Mobile' : 'Desktop');
    
    // Resolve WebAssembly untuk MediaPipe dengan timeout lebih panjang di mobile
    console.log('Loading WebAssembly files...');
    const vision = await Promise.race([
      FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
      ),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('WebAssembly loading timeout')), isMobile ? 30000 : 15000)
      )
    ]);
    
    console.log('Creating ObjectDetector with model...');
    // Create ObjectDetector dengan model MobileNetV2 tflite
    // Gunakan CPU delegate untuk mobile, GPU untuk desktop
    const delegate = isMobile ? "CPU" : "GPU";
    
    objectDetector = await ObjectDetector.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: "/tfjs_model/model_bahan_makanan.tflite",
        delegate: delegate // CPU untuk mobile, GPU untuk desktop
      },
      scoreThreshold: 0.5, // Threshold kepercayaan deteksi
      runningMode: "IMAGE",
      maxResults: 10 // Maksimal 10 deteksi per gambar
    });

    isModelLoaded = true;
    modelLoadError = null;
    console.log('MediaPipe ObjectDetector loaded successfully with delegate:', delegate);
    return objectDetector;

  } catch (error) {
    console.error('Error loading MediaPipe model:', error);
    console.error('Error stack:', error.stack);
    modelLoadError = error.message;
    isModelLoaded = false;
    throw error;
  } finally {
    modelLoading = false;
  }
}

/**
 * Detect objects dalam gambar
 * @param {HTMLImageElement|HTMLCanvasElement} imageElement
 * @returns {Promise<{detections: Array, processingTime: number}>}
 */
async function detectObjects(imageElement) {
  if (!objectDetector) {
    throw new Error('Model belum dimuat. Panggil loadModel() terlebih dahulu.');
  }

  if (!isModelLoaded) {
    throw new Error('Model sedang dimuat atau gagal dimuat');
  }

  try {
    const startTime = Date.now();
    
    // Run detection
    const result = objectDetector.detect(imageElement);
    
    const processingTime = Date.now() - startTime;
    console.log(`Detection completed in ${processingTime}ms, found ${result.detections.length} objects`);

    // Transform hasil deteksi ke format yang lebih mudah digunakan
    const detections = result.detections.map((detection, idx) => ({
      id: idx,
      class: detection.categories[0]?.categoryName || 'Unknown',
      confidence: detection.categories[0]?.score || 0,
      boundingBox: {
        x: detection.boundingBox?.originX || 0,
        y: detection.boundingBox?.originY || 0,
        width: detection.boundingBox?.width || 0,
        height: detection.boundingBox?.height || 0
      }
    }));

    return {
      detections: detections,
      processingTime: processingTime,
      raw: result
    };

  } catch (error) {
    console.error('Error during detection:', error);
    throw error;
  }
}

/**
 * Detect dari canvas element (untuk camera capture)
 * @param {HTMLCanvasElement} canvas
 * @returns {Promise<Array>} Array of detections dengan confidence > threshold
 */
async function detectFromCanvas(canvas) {
  const result = await detectObjects(canvas);
  // Filter hasil - ambil yang paling confidence tinggi untuk setiap class
  const topDetections = getTopDetectionsPerClass(result.detections);
  return {
    detections: topDetections,
    raw: result
  };
}

/**
 * Detect dari image file
 * @param {File} file
 * @returns {Promise<Array>} Array of detections
 */
async function detectFromFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = async (e) => {
      try {
        const img = new Image();
        img.onload = async () => {
          try {
            const result = await detectObjects(img);
            const topDetections = getTopDetectionsPerClass(result.detections);
            resolve({
              detections: topDetections,
              raw: result
            });
          } catch (error) {
            reject(error);
          }
        };
        img.onerror = () => reject(new Error('Gagal memuat gambar'));
        img.src = e.target.result;
        img.crossOrigin = 'anonymous';
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = () => reject(new Error('Gagal membaca file'));
    reader.readAsDataURL(file);
  });
}

/**
 * Get top detection per class (untuk menghindari multiple detections dari bahan yang sama)
 * @param {Array} detections
 * @returns {Array} Top detection per class
 */
function getTopDetectionsPerClass(detections) {
  const classMap = new Map();
  
  detections.forEach(detection => {
    const classKey = detection.class.toLowerCase();
    
    if (!classMap.has(classKey) || detection.confidence > classMap.get(classKey).confidence) {
      classMap.set(classKey, detection);
    }
  });
  
  return Array.from(classMap.values())
    .sort((a, b) => b.confidence - a.confidence)
    .filter(d => d.confidence >= 0.5); // Filter minimum confidence
}

/**
 * Draw detections pada canvas
 * @param {HTMLCanvasElement} canvas
 * @param {Array} detections
 * @param {Number} imageWidth Original image width
 * @param {Number} imageHeight Original image height
 */
function drawDetections(canvas, detections, imageWidth, imageHeight) {
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  const scaleX = canvas.width / imageWidth;
  const scaleY = canvas.height / imageHeight;
  
  ctx.lineWidth = 3;
  ctx.font = "14px Arial";
  ctx.textBaseline = "top";

  detections.forEach(detection => {
    const { boundingBox, class: className, confidence } = detection;
    
    // Kalikan koordinat dengan skala render
    const x = boundingBox.x * scaleX;
    const y = boundingBox.y * scaleY;
    const width = boundingBox.width * scaleX;
    const height = boundingBox.height * scaleY;

    const text = `${className} ${Math.round(confidence * 100)}%`;

    // Bounding Box
    ctx.strokeStyle = "#ec4899"; 
    ctx.strokeRect(x, y, width, height);

    // Background Teks
    ctx.fillStyle = "#ec4899";
    const textWidth = ctx.measureText(text).width;
    ctx.fillRect(x, y - 24, textWidth + 8, 24);

    // Teks
    ctx.fillStyle = "#ffffff";
    ctx.fillText(text, x + 4, y - 20);
  });
}

/**
 * Get model status
 */
function getModelStatus() {
  return {
    loaded: isModelLoaded,
    loading: modelLoading,
    error: modelLoadError
  };
}

/**
 * Dispose model (cleanup memory)
 */
function disposeModel() {
  if (objectDetector) {
    // MediaPipe doesn't expose dispose, but we can set it to null
    objectDetector = null;
    isModelLoaded = false;
  }
}

export {
  loadModel,
  detectObjects,
  detectFromCanvas,
  detectFromFile,
  drawDetections,
  getTopDetectionsPerClass,
  getModelStatus,
  disposeModel
};

export default {
  loadModel,
  detectObjects,
  detectFromCanvas,
  detectFromFile,
  drawDetections,
  getTopDetectionsPerClass,
  getModelStatus,
  disposeModel
};
