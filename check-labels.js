/**
 * Script untuk cek label order di label.txt
 * Run di browser console untuk lihat order label vs prediction
 */

async function checkLabels() {
  try {
    const response = await fetch('/tfjs_model/label.txt');
    const text = await response.text();
    const labels = text.split('\n').map(l => l.trim()).filter(Boolean);
    
    console.log('=== LABEL ORDER ===');
    labels.forEach((label, idx) => {
      console.log(`${idx}: ${label}`);
    });
    
    console.log(`\nTotal labels: ${labels.length}`);
    
    // Log specific indices yang potentially error
    console.log('\n=== CHECK INDICES ===');
    console.log(`Index 0: ${labels[0]}`);
    console.log(`Index 1: ${labels[1]}`);
    console.log(`Index 2: ${labels[2]}`);
    console.log(`\nApakah label[0] = "Beras Putih"?`, labels.indexOf('Beras Putih'));
    console.log(`Apakah label ada "Minyak Kelapa"?`, labels.indexOf('Minyak Kelapa'));
    console.log(`Apakah label ada "Brokoli"?`, labels.indexOf('Brokoli'));
    console.log(`Apakah label ada "Tomat"?`, labels.indexOf('Tomat'));
    
  } catch (error) {
    console.error('Error:', error);
  }
}

checkLabels();
