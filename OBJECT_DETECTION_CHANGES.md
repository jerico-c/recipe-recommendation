# Dokumentasi Perubahan: Object Detection vs Klasifikasi

## Ringkasan Perubahan

Proyek Eatzi telah diubah dari **Classification Model** (single label) ke **Object Detection Model** (multiple objects with bounding boxes) menggunakan:
- **MediaPipe Vision Tasks** library
- **MobileNetV2 tflite model** yang sudah Anda konversi

## File yang Diubah/Dibuat

### 1. **NEW: `/src/services/objectDetectionService.js`**
Service baru yang menggantikan `tfjsModelService.js` dengan fitur:
- `loadModel()` - Load MediaPipe ObjectDetector dengan model tflite
- `detectFromCanvas()` - Deteksi dari canvas (camera)
- `detectFromFile()` - Deteksi dari file gambar
- `drawDetections()` - Gambar bounding boxes di canvas
- `getTopDetectionsPerClass()` - Filter hasil terbaik per class

**Key differences dari Classification:**
- Mengembalikan array detections dengan bounding boxes
- Bisa mendeteksi multiple bahan dalam satu gambar
- Memberikan koordinat lokasi (x, y, width, height) untuk setiap deteksi

### 2. **UPDATED: `/src/components/CameraInput.jsx`**
Perubahan:
- Import dari `objectDetectionService` bukan `tfjsModelService`
- `handleTakePictureAndUpload()` menggunakan `detectFromCanvas()` bukan `predictFromCanvas()`
- **FITUR BARU:** Dapat menambahkan multiple bahan dari satu capture
- Menampilkan bounding boxes pada hasil deteksi
- Mengatasi duplikasi: cek apakah bahan sudah ada sebelum menambah

### 3. **UPDATED: `/src/components/FileInput.jsx`**
Perubahan:
- Import dari `objectDetectionService`
- `handleFileChangeAndUpload()` menggunakan `detectFromFile()` bukan `predictFromFile()`
- Dapat menambahkan multiple deteksi dari satu upload
- Info toast menampilkan total bahan yang ditambahkan

## Model Loading

Model tflite dimuat dari: `/public/tfjs_model/model_bahan_makanan.tflite`

**Path konfigurasi di objectDetectionService.js:**
```javascript
modelAssetPath: "/tfjs_model/model_bahan_makanan.tflite"
```

## Perbedaan Output

### Classification (LAMA):
```javascript
{
  class: "Apel",           // Single class
  confidence: 95.5,
  allPredictions: [...]
}
```

### Object Detection (BARU):
```javascript
{
  detections: [
    {
      id: 0,
      class: "Apel",
      confidence: 0.95,
      boundingBox: { x: 0.1, y: 0.2, width: 0.3, height: 0.4 }
    },
    {
      id: 1,
      class: "Pisang",
      confidence: 0.87,
      boundingBox: { x: 0.5, y: 0.1, width: 0.35, height: 0.5 }
    }
  ],
  processingTime: 150,
  raw: {...}
}
```

## Threshold dan Konfigurasi

Di `objectDetectionService.js`:
- **scoreThreshold**: 0.5 (50% confidence minimum)
- **maxResults**: 10 (max 10 deteksi per gambar)
- **delegate**: "GPU" (gunakan GPU jika tersedia untuk performance lebih baik)
- **runningMode**: "IMAGE"

Bisa disesuaikan sesuai kebutuhan.

## Testing Model

File testing HTML yang Anda kirim sudah cocok, model akan berjalan dengan benar karena:
1. ✅ MediaPipe library version match (0.10.3)
2. ✅ Path model tflite sama (`/tfjs_model/model_bahan_makanan.tflite`)
3. ✅ Bounding box rendering implementasi sama

## Next Steps (Optional)

Jika diperlukan optimisasi lebih lanjut:
1. **Adjust confidence threshold** - Naikkan jika terlalu banyak false positives
2. **Add performance monitoring** - Track detection time per image
3. **Caching results** - Cache deteksi untuk gambar yang sama
4. **Batch processing** - Proses multiple gambar sekaligus

## Cara Menjalankan

```bash
npm run dev
# Akses https://localhost:8080/
# Test dengan Camera Input atau File Upload
# Model akan otomatis terload saat component mount
```

## Troubleshooting

Jika model tidak terload:
1. Pastikan `/public/tfjs_model/model_bahan_makanan.tflite` exist
2. Check browser console untuk error messages
3. Pastikan internet connection untuk load MediaPipe wasm files
4. Cek network tab - pastikan model file terbaca (HTTP 200)
