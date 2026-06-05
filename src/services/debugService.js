/**
 * Debug helper untuk troubleshooting model loading di mobile
 * Open browser console dan run: window.debugEatzi.checkModelStatus()
 */

window.debugEatzi = {
  // Check current model loading status
  checkModelStatus: () => {
    console.group('🔍 Model Loading Status');
    console.log('Device:', /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ? 'Mobile' : 'Desktop');
    console.log('Browser:', navigator.userAgent);
    console.log('Network Connection:', navigator.connection ? {
      effectiveType: navigator.connection.effectiveType,
      downlink: navigator.connection.downlink + ' Mbps',
      rtt: navigator.connection.rtt + ' ms',
      saveData: navigator.connection.saveData
    } : 'Not available');
    console.groupEnd();
  },

  // Check model file accessibility
  checkModelFile: async () => {
    console.group('📁 Checking Model File');
    try {
      const response = await fetch('/tfjs_model/model_bahan_makanan.tflite', { method: 'HEAD' });
      console.log('Status:', response.status, response.statusText);
      console.log('Content-Type:', response.headers.get('content-type'));
      console.log('Content-Length:', response.headers.get('content-length'), 'bytes');
      console.log('Cache-Control:', response.headers.get('cache-control'));
    } catch (error) {
      console.error('Error accessing model file:', error);
    }
    console.groupEnd();
  },

  // Check WebAssembly support
  checkWasmSupport: () => {
    console.group('⚙️ WebAssembly Support');
    console.log('WebAssembly supported:', typeof WebAssembly !== 'undefined');
    console.log('SharedArrayBuffer:', typeof SharedArrayBuffer !== 'undefined');
    console.log('Worker supported:', typeof Worker !== 'undefined');
    console.groupEnd();
  },

  // Run all checks
  runAllChecks: async () => {
    window.debugEatzi.checkModelStatus();
    await window.debugEatzi.checkModelFile();
    window.debugEatzi.checkWasmSupport();
    console.log('✅ Debug check complete. Check console for details.');
  }
};

// Log available debug commands
console.log('%c🛠️ Eatzi Debug Tools Available', 'color: #ec4899; font-weight: bold;');
console.log('Run these commands in console:');
console.log('  - window.debugEatzi.checkModelStatus()');
console.log('  - window.debugEatzi.checkModelFile()');
console.log('  - window.debugEatzi.checkWasmSupport()');
console.log('  - window.debugEatzi.runAllChecks()');

export default window.debugEatzi;
