import { createCanvas, loadImage, registerFont } from 'canvas';
import QRCode from 'qrcode';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// ES module dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Register custom fonts if available
const fontPath = path.join(__dirname, '../assets/fonts');
if (fs.existsSync(path.join(fontPath, 'Inter-Bold.ttf'))) {
  registerFont(path.join(fontPath, 'Inter-Bold.ttf'), { family: 'Inter-Bold' });
}
if (fs.existsSync(path.join(fontPath, 'Inter-Regular.ttf'))) {
  registerFont(path.join(fontPath, 'Inter-Regular.ttf'), { family: 'Inter-Regular' });
}

const generateAndStoreSocialImage = async (result, platform = 'default') => {
  const canvas = createCanvas(1200, 630);
  const ctx = canvas.getContext('2d');
  
  // Set background gradient
  const gradient = ctx.createLinearGradient(0, 0, 1200, 630);
  gradient.addColorStop(0, '#10B981'); // emerald-500
  gradient.addColorStop(1, '#059669'); // emerald-600
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 1200, 630);
  
  // Add logo/branding
  try {
    const logoPath = path.join(__dirname, '../assets/caloritrack-logo-white.png');
    if (fs.existsSync(logoPath)) {
      const logo = await loadImage(logoPath);
      ctx.drawImage(logo, 40, 40, 200, 60);
    } else {
      // Fallback text logo
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 48px Arial, sans-serif';
      ctx.fillText('CaloriTrack', 40, 80);
    }
  } catch (error) {
    // Fallback text logo
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 48px Arial, sans-serif';
    ctx.fillText('CaloriTrack', 40, 80);
  }
  
  // Add food image if available
  if (result.image_url && result.image_url !== 'inline') {
    try {
      const foodImage = await loadImage(result.image_url);
      const aspectRatio = foodImage.width / foodImage.height;
      let drawWidth = 300;
      let drawHeight = 300 / aspectRatio;
      
      if (drawHeight > 300) {
        drawHeight = 300;
        drawWidth = 300 * aspectRatio;
      }
      
      const x = 40;
      const y = 120;
      
      // Add rounded rectangle mask (simplified)
      ctx.save();
      ctx.beginPath();
      ctx.rect(x, y, drawWidth, drawHeight);
      ctx.clip();
      ctx.drawImage(foodImage, x, y, drawWidth, drawHeight);
      ctx.restore();
    } catch (error) {
      console.log('Failed to load food image for share:', error);
    }
  }
  
  // Add analysis results
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 36px Arial, sans-serif';
  ctx.fillText('Food Analysis Results', 400, 160);
  
  // Food items
  ctx.font = '24px Arial, sans-serif';
  const foodItems = result.food_items?.slice(0, 3) || ['Food items'];
  foodItems.forEach((item, index) => {
    ctx.fillText(`• ${item}`, 400, 200 + (index * 35));
  });
  
  if (result.food_items?.length > 3) {
    ctx.fillText(`... and ${result.food_items.length - 3} more items`, 400, 200 + (3 * 35));
  }
  
  // Calories
  ctx.font = 'bold 48px Arial, sans-serif';
  ctx.fillText(`${result.total_calories} calories`, 400, 320);
  
  // Nutrition facts if available
  if (result.nutrition_table) {
    try {
      const nutrition = JSON.parse(result.nutrition_table);
      ctx.font = '20px Arial, sans-serif';
      ctx.fillText(`Protein: ${nutrition.protein_g || 0}g`, 400, 380);
      ctx.fillText(`Carbs: ${nutrition.carbs_g || 0}g`, 400, 410);
      ctx.fillText(`Fat: ${nutrition.fat_g || 0}g`, 400, 440);
    } catch (error) {
      console.log('Failed to parse nutrition table:', error);
    }
  }
  
  // Add QR code
  try {
    const publicUrl = `${process.env.FRONTEND_URL}/result/${result.id}`;
    const qrCode = await QRCode.toDataURL(publicUrl, { width: 120 });
    const qrImage = await loadImage(qrCode);
    ctx.drawImage(qrImage, 1000, 480, 120, 120);
  } catch (error) {
    console.log('Failed to generate QR code:', error);
  }
  
  // Add call to action
  ctx.font = '20px Arial, sans-serif';
  ctx.fillText('Try CaloriTrack yourself!', 400, 520);
  ctx.fillText('AI-powered food calorie estimation', 400, 550);
  
  // Convert to buffer
  return canvas.toBuffer('image/png');
};

export { generateAndStoreSocialImage };
