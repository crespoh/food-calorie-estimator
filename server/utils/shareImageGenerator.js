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
  
  // Modern gradient background
  const gradient = ctx.createLinearGradient(0, 0, 1200, 630);
  gradient.addColorStop(0, '#667eea'); // Modern blue-purple
  gradient.addColorStop(1, '#764ba2'); // Purple
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 1200, 630);
  
  // Add subtle pattern overlay
  ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
  for (let i = 0; i < 1200; i += 40) {
    for (let j = 0; j < 630; j += 40) {
      if ((i + j) % 80 === 0) {
        ctx.fillRect(i, j, 2, 2);
      }
    }
  }
  
  // Add logo/branding with better positioning
  try {
    const logoPath = path.join(__dirname, '../assets/caloritrack-logo-white.png');
    if (fs.existsSync(logoPath)) {
      const logo = await loadImage(logoPath);
      ctx.drawImage(logo, 60, 40, 160, 48);
    } else {
      // Modern text logo
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 36px Inter-Bold, Arial, sans-serif';
      ctx.fillText('CaloriTrack', 60, 70);
    }
  } catch (error) {
    // Modern text logo fallback
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 36px Inter-Bold, Arial, sans-serif';
    ctx.fillText('CaloriTrack', 60, 70);
  }
  
  // Add tagline with better spacing
  ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
  ctx.font = '16px Inter-Regular, Arial, sans-serif';
  ctx.fillText('AI-Powered Nutrition Analysis', 60, 95);
  
  // Create main content area with rounded rectangle
  const contentX = 60;
  const contentY = 120; // Moved down to give more space for header
  const contentWidth = 1080;
  const contentHeight = 420; // Increased height for better spacing
  
  // Draw content background with rounded corners
  ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.1)';
  ctx.shadowBlur = 20;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 10;
  
  // Rounded rectangle function
  const roundRect = (x, y, width, height, radius) => {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  };
  
  roundRect(contentX, contentY, contentWidth, contentHeight, 20);
  ctx.fill();
  
  // Reset shadow
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
  
  // Add food image if available (left side)
  if (result.image_url && result.image_url !== 'inline') {
    try {
      const foodImage = await loadImage(result.image_url);
      const aspectRatio = foodImage.width / foodImage.height;
      let drawWidth = 280;
      let drawHeight = 280 / aspectRatio;
      
      if (drawHeight > 280) {
        drawHeight = 280;
        drawWidth = 280 * aspectRatio;
      }
      
      const imageX = contentX + 40;
      const imageY = contentY + 40;
      
      // Draw image with rounded corners
      ctx.save();
      roundRect(imageX, imageY, drawWidth, drawHeight, 15);
      ctx.clip();
      ctx.drawImage(foodImage, imageX, imageY, drawWidth, drawHeight);
      ctx.restore();
      
      // Add subtle border
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
      ctx.lineWidth = 1;
      roundRect(imageX, imageY, drawWidth, drawHeight, 15);
      ctx.stroke();
    } catch (error) {
      console.log('Failed to load food image for share:', error);
    }
  }
  
  // Right side content area
  const rightContentX = contentX + 360;
  const rightContentY = contentY + 40;
  
  // Main heading
  ctx.fillStyle = '#1a202c';
  ctx.font = 'bold 32px Inter-Bold, Arial, sans-serif';
  ctx.fillText('Nutrition Analysis', rightContentX, rightContentY + 40);
  
  // Calories display with modern styling
  ctx.fillStyle = '#667eea';
  ctx.font = 'bold 48px Inter-Bold, Arial, sans-serif';
  ctx.fillText(`${result.total_calories}`, rightContentX, rightContentY + 90);
  
  ctx.fillStyle = '#4a5568';
  ctx.font = '20px Inter-Regular, Arial, sans-serif';
  ctx.fillText('calories', rightContentX + 10, rightContentY + 115);
  
  // Food items with modern bullet points - better spacing
  ctx.fillStyle = '#2d3748';
  ctx.font = '18px Inter-Regular, Arial, sans-serif';
  const foodItems = result.food_items?.slice(0, 4) || ['Food items'];
  foodItems.forEach((item, index) => {
    const y = rightContentY + 160 + (index * 35); // Increased spacing from 30 to 35
    // Modern bullet point
    ctx.fillStyle = '#667eea';
    ctx.beginPath();
    ctx.arc(rightContentX, y - 5, 3, 0, 2 * Math.PI);
    ctx.fill();
    
    // Item text
    ctx.fillStyle = '#2d3748';
    ctx.fillText(item, rightContentX + 15, y);
  });
  
  if (result.food_items?.length > 4) {
    ctx.fillStyle = '#718096';
    ctx.font = '16px Inter-Regular, Arial, sans-serif';
    ctx.fillText(`+${result.food_items.length - 4} more items`, rightContentX + 15, rightContentY + 160 + (4 * 35));
  }
  
  // Nutrition facts with modern layout - better spacing
  if (result.nutrition_table) {
    try {
      const nutrition = typeof result.nutrition_table === 'string' 
        ? JSON.parse(result.nutrition_table) 
        : result.nutrition_table;
      
      const nutritionY = rightContentY + 320; // Increased spacing from 300 to 320
      
      // Nutrition heading
      ctx.fillStyle = '#4a5568';
      ctx.font = 'bold 16px Inter-Bold, Arial, sans-serif';
      ctx.fillText('Nutrition Facts', rightContentX, nutritionY);
      
      // Nutrition values
      ctx.font = '14px Inter-Regular, Arial, sans-serif';
      const nutritionItems = [
        { label: 'Protein', value: nutrition.protein_g || 0, unit: 'g', color: '#48bb78' },
        { label: 'Carbs', value: nutrition.carbs_g || 0, unit: 'g', color: '#ed8936' },
        { label: 'Fat', value: nutrition.fat_g || 0, unit: 'g', color: '#f56565' }
      ];
      
      nutritionItems.forEach((item, index) => {
        const x = rightContentX + (index * 120);
        const y = nutritionY + 25;
        
        // Color dot
        ctx.fillStyle = item.color;
        ctx.beginPath();
        ctx.arc(x, y - 5, 4, 0, 2 * Math.PI);
        ctx.fill();
        
        // Label
        ctx.fillStyle = '#718096';
        ctx.fillText(item.label, x + 10, y);
        
        // Value
        ctx.fillStyle = '#2d3748';
        ctx.font = 'bold 16px Inter-Bold, Arial, sans-serif';
        ctx.fillText(`${item.value}${item.unit}`, x + 10, y + 18);
      });
    } catch (error) {
      console.log('Failed to parse nutrition table:', error);
    }
  }
  
  // QR code with modern styling and better visibility
  try {
    const publicUrl = `${process.env.FRONTEND_URL}/result/${result.id}`;
    const qrCode = await QRCode.toDataURL(publicUrl, { 
      width: 100,
      margin: 1,
      color: {
        dark: '#1a202c',
        light: '#ffffff'
      }
    });
    const qrImage = await loadImage(qrCode);
    
    const qrX = contentX + contentWidth - 130; // Adjusted position
    const qrY = contentY + contentHeight - 130; // Adjusted position
    
    // QR code background with better contrast
    ctx.fillStyle = '#ffffff';
    roundRect(qrX - 15, qrY - 15, 130, 130, 15);
    ctx.fill();
    
    // QR code border for better definition
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.lineWidth = 2;
    roundRect(qrX - 15, qrY - 15, 130, 130, 15);
    ctx.stroke();
    
    // QR code
    ctx.drawImage(qrImage, qrX, qrY, 100, 100);
    
    // QR code label with better visibility
    ctx.fillStyle = '#2d3748'; // Darker color for better readability
    ctx.font = 'bold 14px Inter-Bold, Arial, sans-serif'; // Bold and larger font
    ctx.textAlign = 'center';
    ctx.fillText('Scan to view', qrX + 50, qrY + 125);
    ctx.textAlign = 'left';
  } catch (error) {
    console.log('Failed to generate QR code:', error);
  }
  
  // Bottom call to action
  const ctaY = contentY + contentHeight + 30;
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 24px Inter-Bold, Arial, sans-serif';
  ctx.fillText('Try CaloriTrack yourself!', contentX, ctaY);
  
  ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
  ctx.font = '16px Inter-Regular, Arial, sans-serif';
  ctx.fillText('AI-powered food calorie estimation', contentX, ctaY + 30);
  
  // Convert to buffer
  return canvas.toBuffer('image/png');
};

export { generateAndStoreSocialImage };
