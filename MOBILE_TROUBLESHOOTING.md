# Troubleshooting Model Loading di Mobile

## 🔧 Optimasi yang Sudah Dilakukan

### 1. **Delegate Change (CPU vs GPU)**
- **Desktop**: Menggunakan GPU delegate (lebih cepat)
- **Mobile**: Menggunakan CPU delegate (lebih stabil)
- Auto-detection berdasarkan user agent

### 2. **Timeout Extension**
- **Desktop**: 15 detik untuk load WebAssembly
- **Mobile**: 30 detik untuk load WebAssembly
- Waiting loop: 60 detik max untuk model initialization

### 3. **Better Error Handling**
- Retry button di error toast
- Detailed error messages di console
- Stack trace logging untuk debugging

## 🐛 Debugging di Mobile

### Buka Browser Console
1. Di mobile, akses console (lihat cara per browser di bawah)
2. Jalankan perintah debug:

```javascript
// Check model loading status
window.debugEatzi.checkModelStatus()

// Check model file accessibility
window.debugEatzi.checkModelFile()

// Check WebAssembly support
window.debugEatzi.checkWasmSupport()

// Run all checks sekaligus
window.debugEatzi.runAllChecks()
```

### Cara Akses Console di Mobile

#### Android Chrome:
1. Open Chrome
2. Type: `chrome://inspect`
3. Enable "Discover USB devices"
4. Connect via USB
5. Click "inspect" pada halaman Eatzi

#### iOS Safari:
1. Open Safari
2. Go to: Settings > Safari > Advanced > Web Inspector (ON)
3. Open Eatzi in Safari
4. Connect to Mac
5. In Mac Safari: Develop > [Device] > [Halaman]

#### Mobile Firefox:
1. Type: `about:debugging`
2. Click "This Firefox"
3. Click "Enable USB Debugging"

## 📊 Apa yang Dicek oleh Debug Tools

### checkModelStatus()
- Device type (Mobile/Desktop)
- User Agent
- Network condition (4G, 5G, WiFi)
- Connection speed & latency

### checkModelFile()
- Model file HTTP status (200 = OK)
- Content-Type header
- File size
- Cache settings

### checkWasmSupport()
- WebAssembly support
- SharedArrayBuffer availability
- Web Worker support

## 🚨 Common Issues & Solutions

### Issue 1: "WebAssembly loading timeout"
**Penyebab**: Network lambat atau blocked CDN
**Solusi**:
1. Check network connection: `window.debugEatzi.checkModelStatus()`
2. Try dengan WiFi (lebih stabil)
3. Cek apakah CDN terblokir (akses https://cdn.jsdelivr.net dari browser)

### Issue 2: "Model belum dimuat. Panggil loadModel() terlebih dahulu"
**Penyebab**: Model loading masih dalam progress saat detection dipanggil
**Solusi**:
1. Sudah ada automatic retry - tunggu Toast notification
2. Click "Retry" button jika ada error
3. Tunggu sampai "Model siap digunakan" toast muncul

### Issue 3: Model file 404 Not Found
**Penyebab**: File `/public/tfjs_model/model_bahan_makanan.tflite` tidak ada
**Solusi**:
```bash
# Pastikan file ada
ls -la public/tfjs_model/model_bahan_makanan.tflite

# Jika tidak ada, pastikan sudah copy dari direktori yang benar
```

### Issue 4: CORS Error
**Penyebab**: Cross-origin resource sharing issue
**Solusi**: Sudah di-setup di Vite config, tidak perlu config tambahan

## 📈 Performance Optimization untuk Mobile

Jika masih lambat meski berhasil:

1. **Reduce Model Complexity** (di objectDetectionService.js):
```javascript
maxResults: 5  // Turunkan dari 10 ke 5
scoreThreshold: 0.6  // Naikkan dari 0.5 ke 0.6 (lebih ketat)
```

2. **Reduce Image Size** (di CameraInput.jsx):
```javascript
options: { width: 240 }  // Turunkan dari 320 ke 240
```

3. **Cache Model** (sudah implemented):
- Model hanya load sekali di first load
- Stored di memory selama session

## 🔍 Network Monitoring

Buka DevTools Network tab dan cari:
- `model_bahan_makanan.tflite` - Model file download
- `vision_bundle.mjs` - MediaPipe library
- `wasm/*` - WebAssembly files

Semuanya seharusnya status 200 (success).

## 📞 When to Ask for Help

Kumpulkan info ini sebelum lapor issue:
1. Output dari `window.debugEatzi.runAllChecks()`
2. Network connection type (4G, WiFi, etc)
3. Device model (iPhone 12, Samsung S20, etc)
4. Browser & version
5. Error message exact dari console
6. Screenshot console log

## 🚀 Testing Locally

```bash
# Run dev server
npm run dev

# Test di mobile dengan URL local
# Find local IP: ipconfig getifaddr en0 (Mac)
# Access dari mobile: https://[LOCAL_IP]:8080
```

Pastikan HTTPS dan gunakan network WiFi yang sama.
