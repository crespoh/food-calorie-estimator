import { generateShareCardV2 } from './utils/shareImageGeneratorV2.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Sample data for testing
const sampleData = {
  dishName: 'Chicken Caesar Salad with Fresh Greens',
  caloriesKcal: 520,
  servingLabel: 'per bowl',
  proteinG: 38,
  carbsG: 22,
  fatG: 28,
  confidencePct: 7,
  imageUrl: null, // No image for testing - will use gradient background
  brandDomain: 'calorie.codedcheese.com',
  locale: 'en'
};

async function generateV2Previews() {
  try {
    console.log('🎨 Generating Share Card v2 previews...');
    
    // Generate all variants
    const variants = ['photo', 'light', 'dark'];
    
    for (const variant of variants) {
      console.log(`📸 Generating ${variant} variant...`);
      
      const imageBuffer = await generateShareCardV2(sampleData, variant);
      
      const outputPath = path.join(__dirname, `preview-share-card-v2-${variant}.png`);
      fs.writeFileSync(outputPath, imageBuffer);
      
      console.log(`✅ ${variant} variant saved: ${outputPath}`);
    }
    
    console.log('');
    console.log('🎯 Share Card v2 Features:');
    console.log('• Minimalist design with clean typography');
    console.log('• Three variants: photo, light, dark');
    console.log('• Proper safe areas (48px margins)');
    console.log('• Color-coded macro pills (P/C/F)');
    console.log('• Confidence chip when available');
    console.log('• Modern gradients and styling');
    console.log('• Brand footer with domain');
    console.log('');
    console.log('📱 To view the previews:');
    console.log('1. Open the generated PNG files');
    console.log('2. Or use: open preview-share-card-v2-*.png');
    
  } catch (error) {
    console.error('❌ Error generating v2 previews:', error);
  }
}

generateV2Previews();
