import { generateAndStoreSocialImage } from './utils/shareImageGenerator.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Sample data for testing
const sampleResult = {
  id: 'test-123',
  food_items: ['Hainanese Chicken Rice', 'Yellow Rice', 'Chicken Soup', 'Vegetable Pickles', 'Soy Sauce', 'Chili Sauce'],
  total_calories: 1200,
  nutrition_table: {
    protein_g: 45,
    carbs_g: 180,
    fat_g: 35
  },
  image_url: null, // No food image for this test
  created_at: new Date().toISOString()
};

async function generatePreview() {
  try {
    console.log('🎨 Generating preview of new social share image design...');
    
    const imageBuffer = await generateAndStoreSocialImage(sampleResult, 'preview');
    
    const outputPath = path.join(__dirname, 'preview-new-design.png');
    fs.writeFileSync(outputPath, imageBuffer);
    
    console.log('✅ Preview generated successfully!');
    console.log('📁 File saved as:', outputPath);
    console.log('🖼️  Image size: 1200x630 pixels');
    console.log('');
    console.log('🎯 New Design Features:');
    console.log('• Modern blue-purple gradient background');
    console.log('• Clean white content area with rounded corners');
    console.log('• Better typography with Inter font');
    console.log('• Color-coded nutrition facts');
    console.log('• Modern bullet points for food items');
    console.log('• Styled QR code with background');
    console.log('• Subtle shadows and borders');
    console.log('');
    console.log('📱 To view the preview:');
    console.log('1. Open the file:', outputPath);
    console.log('2. Or use: open', outputPath);
    
  } catch (error) {
    console.error('❌ Error generating preview:', error);
  }
}

generatePreview();
