import { generateShareCardV2 } from './utils/shareImageGeneratorV2.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Test with a real food image URL
const testData = {
  dishName: 'Delicious Chicken Caesar Salad',
  caloriesKcal: 520,
  servingLabel: 'per bowl',
  proteinG: 38,
  carbsG: 22,
  fatG: 28,
  confidencePct: 7,
  imageUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=1200&h=630&fit=crop&crop=center',
  brandDomain: 'calorie.codedcheese.com',
  locale: 'en'
};

async function testRealFoodImage() {
  try {
    console.log('🎨 Testing Share Card v2 with real food image...');
    console.log('🖼️ Image URL:', testData.imageUrl);
    
    const imageBuffer = await generateShareCardV2(testData, 'photo');
    
    const outputPath = path.join(__dirname, 'test-real-food-image-result.png');
    fs.writeFileSync(outputPath, imageBuffer);
    
    console.log('✅ Test completed! Check the result at:', outputPath);
    console.log('📱 Open with: open test-real-food-image-result.png');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testRealFoodImage();
