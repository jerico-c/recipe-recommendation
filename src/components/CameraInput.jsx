import React, { useState, useRef, useEffect } from 'react';
import { Camera as CameraIcon, Zap, Video, VideoOff, RefreshCw } from 'lucide-react';
import { useRecipe } from '../context/RecipeContext';
import { toast as sonnerToast } from 'sonner';
import { loadModel, predictFromCanvas, getModelStatus } from '../services/tfjsModelService';


class Camera {
    #currentStream;
    #streaming = false;
    #width = 640; 
    #height = 0;
  
    #selectCameraElement;
    #videoElement;
    #canvasElement;

    static addNewStream(stream) {
      if (!stream) return;
      if (!Array.isArray(window.currentStreams)) {
        window.currentStreams = [stream];
        return;
      }
      window.currentStreams = [...window.currentStreams, stream];
    }

    static stopAllStreams() {
      if (!Array.isArray(window.currentStreams)) {
        window.currentStreams = [];
        return;
      }
      window.currentStreams.forEach((stream) => {
        if (stream && stream.active) {
          stream.getTracks().forEach((track) => track.stop());
        }
      });
      window.currentStreams = [];
    }
  
    constructor({ video, cameraSelect, canvas, options = {} }) {
      this.#videoElement = video;
      this.#selectCameraElement = cameraSelect;
      this.#canvasElement = canvas;
      this.#width = options.width || this.#width;
      this.#initialListener();
    }
  
    #initialListener() {
      if (!this.#videoElement || !this.#selectCameraElement || !this.#canvasElement) {
        console.error("Camera class: One or more required HTML elements are missing.");
        return;
      }
  
      this.#selectCameraElement.addEventListener('change', () => this.startCamera(this.#selectCameraElement.value));
  
      this.#videoElement.addEventListener('canplay', () => {
        if (!this.#streaming) {
          this.#height = this.#videoElement.videoHeight / (this.#videoElement.videoWidth / this.#width);
          this.#videoElement.setAttribute('width', this.#width.toString());
          this.#videoElement.setAttribute('height', this.#height.toString());
          this.#canvasElement.setAttribute('width', this.#width.toString());
          this.#canvasElement.setAttribute('height', this.#height.toString());
          this.#streaming = true;
        }
      }, false);
    }
  
    async getAvailableCameras() {
      try {
        // Pancing izin sementara agar browser memberikan nama label kamera (iOS/Chrome Mobile butuh ini)
        try {
          const tempStream = await navigator.mediaDevices.getUserMedia({ video: true });
          tempStream.getTracks().forEach(track => track.stop());
        } catch (e) {
          console.warn("Izin kamera mungkin belum diberikan");
        }

        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(device => device.kind === 'videoinput');
        this.#selectCameraElement.innerHTML = ''; 

        let backCameraId = null;

        videoDevices.forEach((device, index) => {
          const option = document.createElement('option');
          option.value = device.deviceId;
          const label = device.label || `Camera ${index + 1}`;
          option.text = label;
          this.#selectCameraElement.appendChild(option);

          // Deteksi kamera belakang dari labelnya
          const labelLower = label.toLowerCase();
          if (labelLower.includes('back') || labelLower.includes('environment') || labelLower.includes('rear')) {
            backCameraId = device.deviceId;
          }
        });

        if (videoDevices.length > 0) {
          // Prioritas: Kamera belakang yang terdeteksi, atau asumsikan kamera terakhir adalah kamera belakang (sering terjadi di HP), atau default kamera pertama
          const defaultDeviceId = backCameraId || (videoDevices.length > 1 ? videoDevices[videoDevices.length - 1].deviceId : videoDevices[0].deviceId);
          
          this.#selectCameraElement.value = defaultDeviceId;
          this.startCamera(defaultDeviceId); 
        } else {
          console.warn("No cameras found.");
          sonnerToast.error("Tidak ada kamera ditemukan", { description: "Pastikan kamera terhubung dan izin telah diberikan." });
        }
      } catch (err) {
        console.error("Error enumerating devices:", err);
        sonnerToast.error("Gagal mengakses kamera", { description: err.message });
      }
    }
  
    startCamera(deviceId) {
      Camera.stopAllStreams();
      
      // Tambahkan instruksi fallback facingMode: 'environment' agar browser memprioritaskan kamera belakang jika deviceId gagal dimuat
      const videoConstraints = deviceId 
        ? { deviceId: { exact: deviceId }, width: { ideal: this.#width } } 
        : { facingMode: 'environment', width: { ideal: this.#width } };

      const constraints = {
        video: videoConstraints,
        audio: false
      };

      navigator.mediaDevices.getUserMedia(constraints)
        .then((stream) => {
          this.#currentStream = stream;
          Camera.addNewStream(this.#currentStream);
          this.#videoElement.srcObject = stream;
          this.#videoElement.play();
        })
        .catch((err) => {
          console.error("Error starting camera:", err);
          sonnerToast.error("Gagal memulai kamera", { description: err.message });
        });
    }
  
    stopCamera() {
      if (this.#currentStream && this.#currentStream.active) {
        this.#currentStream.getTracks().forEach(track => track.stop());
      }
      this.#streaming = false;
    }
  
    takePicture() {
      if (this.#width && this.#height) {
        const context = this.#canvasElement.getContext('2d');
        this.#canvasElement.width = this.#width;
        this.#canvasElement.height = this.#height;
        context.drawImage(this.#videoElement, 0, 0, this.#width, this.#height);
        return this.#canvasElement.toDataURL('image/jpeg', 0.8);
      } else {
        console.warn("Width or height not set for taking picture.");
        return null;
      }
    }
}


async function dataURLtoBlob(dataurl) {
    const arr = dataurl.split(',');
    if (arr.length < 2) throw new Error('Invalid data URL');
    const mimeMatch = arr[0].match(/:(.*?);/);
    if (!mimeMatch) throw new Error('Could not determine MIME type');
    const mime = mimeMatch[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
}


const CameraInput = () => {
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);
  const [modelReady, setModelReady] = useState(false);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const cameraSelectRef = useRef(null);
  const cameraInstanceRef = useRef(null);

  const { addIngredient, selectedIngredients } = useRecipe();

  // Load model on component mount
  useEffect(() => {
    const initializeModel = async () => {
      try {
        sonnerToast.loading("Memuat model klasifikasi...", { id: 'model-loading' });
        await loadModel();
        setModelReady(true);
        sonnerToast.success("Model klasifikasi siap digunakan", { id: 'model-loading' });
      } catch (error) {
        console.error("Error loading model:", error);
        sonnerToast.error("Gagal memuat model", { description: error.message });
      }
    };

    initializeModel();
  }, []);

  useEffect(() => {
    if (isCameraOpen && videoRef.current && cameraSelectRef.current && canvasRef.current) {
      if (!cameraInstanceRef.current) {
        cameraInstanceRef.current = new Camera({
          video: videoRef.current,
          cameraSelect: cameraSelectRef.current,
          canvas: canvasRef.current,
          options: { width: 320 }
        });
      }
      cameraInstanceRef.current.getAvailableCameras();
    } else {
      if (cameraInstanceRef.current) {
        cameraInstanceRef.current.stopCamera();
        cameraInstanceRef.current = null;
      }
      Camera.stopAllStreams();
    }
    return () => {
      if (cameraInstanceRef.current) {
        cameraInstanceRef.current.stopCamera();
      }
      Camera.stopAllStreams();
    };
  }, [isCameraOpen]);

  const handleToggleCamera = () => {
    setIsCameraOpen(prev => !prev);
    setPreviewImage(null);
  };

  const handleCameraChange = (event) => {
    const deviceId = event.target.value;
    if (cameraInstanceRef.current) {
      cameraInstanceRef.current.startCamera(deviceId);
    }
  };


  const handleTakePictureAndUpload = async () => {
    if (!cameraInstanceRef.current) {
        sonnerToast.error("Kamera belum siap.");
        return;
    }

    if (!modelReady) {
        sonnerToast.error("Model belum siap. Silakan tunggu...");
        return;
    }

    const pictureDataUrl = cameraInstanceRef.current.takePicture();
    if (pictureDataUrl) {
      setPreviewImage(pictureDataUrl);
      setIsCapturing(true);
      sonnerToast.info("Memproses gambar...", { description: "Menganalisis bahan menggunakan model TFJS."});

      try {
        // Create image element from canvas
        const canvas = canvasRef.current;
        if (!canvas) {
          throw new Error("Canvas tidak tersedia");
        }

        // Perform prediction using TFJS
        const result = await predictFromCanvas(canvas);
        
        if (result && result.class) {
            const ingredientName = result.class;
            const confidence = result.confidence;
            
            const isAlreadySelected = selectedIngredients.some(
              (selected) => selected.name.toLowerCase() === ingredientName.toLowerCase()
            );

            if (!isAlreadySelected) {
              addIngredient({
                id: `camera-${Date.now()}-${ingredientName.toLowerCase().replace(/\s+/g, '-')}`,
                name: ingredientName,
              });
              sonnerToast.success(`Bahan "${ingredientName}" (${confidence}% confidence) berhasil dideteksi dan ditambahkan!`);
            } else {
              sonnerToast.info(`Bahan "${ingredientName}" sudah ada dalam daftar pilihan.`);
            }
        } else {
            sonnerToast.warning("Prediksi Gagal", { description: "Tidak ada bahan yang dikenali dari gambar yang diambil." });
        }

      } catch (error) {
        console.error("Error saat mengambil gambar atau melakukan prediksi:", error);
        sonnerToast.error("Terjadi kesalahan", { description: error.message || "Tidak dapat memproses gambar." });
      } finally {
        setIsCapturing(false);
      }
    } else {
        sonnerToast.error("Gagal mengambil gambar dari kamera.");
    }
  };


  return (
    <div className="w-full">
      <button
        onClick={handleToggleCamera}
        className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg transition-colors
                    ${isCameraOpen 
                        ? 'bg-red-100 hover:bg-red-200 text-red-700 border border-red-300' 
                        : 'bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-300'}`}
        type="button"
      >
        {isCameraOpen ? <VideoOff size={18} /> : <Video size={18} />}
        <span>{isCameraOpen ? 'Tutup Kamera' : 'Buka Kamera & Scan Bahan'}</span>
      </button>

      {isCameraOpen && (
        <div className="mt-4 p-4 border border-gray-200 rounded-lg bg-white shadow-sm">
          <div className="mb-3">
            <label htmlFor="cameraSelect" className="block text-sm font-medium text-gray-700 mb-1">Pilih Kamera:</label>
            <select
              id="cameraSelect"
              ref={cameraSelectRef}
              onChange={handleCameraChange}
              className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-foodie-500 focus:border-foodie-500"
            >
            </select>
          </div>
          
          <div className="relative w-full max-w-md mx-auto bg-black rounded overflow-hidden aspect-video shadow-inner">
            <video 
                ref={videoRef} 
                autoPlay 
                playsInline
                className="w-full h-full object-cover"
                style={{ transform: 'scaleX(-1)' }}
            >
                Kamera tidak didukung oleh browser Anda.
            </video>
          </div>
          <canvas ref={canvasRef} style={{ display: 'none' }}></canvas>
          
          <button
            onClick={handleTakePictureAndUpload}
            disabled={isCapturing || !modelReady}
            className="w-full mt-4 bg-foodie-500 hover:bg-foodie-600 text-white py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-70"
          >
            <CameraIcon size={18} />
            <span>{isCapturing ? 'Memproses...' : !modelReady ? 'Model Dimuat...' : 'Ambil Gambar & Analisis Bahan'}</span>
          </button>
        </div>
      )}
      
      {previewImage && (
        <div className="mt-4 p-3 border border-gray-200 rounded-lg bg-gray-50">
          <p className="text-sm text-gray-600 mb-2 font-medium">Preview Gambar Terakhir:</p>
          <div className="relative w-full max-w-xs mx-auto h-auto bg-white rounded-md overflow-hidden shadow aspect-video">
            <img
              src={previewImage}
              alt="Gambar bahan yang diambil"
              className="w-full h-full object-contain"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default CameraInput;