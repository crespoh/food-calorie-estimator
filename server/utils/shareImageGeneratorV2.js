import { createCanvas, loadImage, registerFont } from 'canvas';
import fs from 'fs';
import path from 'path';
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

// SVG templates from the specification
const SVG_TEMPLATES = {
  withPhoto: `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bgPhoto" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#F4C77E"/>
      <stop offset="100%" stop-color="#D96A6B"/>
    </linearGradient>
    <linearGradient id="legibility" x1="0" y1="0" x2="0" y2="1">
      <stop offset="55%" stop-color="#00000000"/>
      <stop offset="100%" stop-color="#000000B3"/>
    </linearGradient>
    <radialGradient id="vignette" cx="50%" cy="50%" r="70%">
      <stop offset="60%" stop-color="#00000000"/>
      <stop offset="100%" stop-color="#00000066"/>
    </radialGradient>
    <style><![CDATA[
      .font-sans { font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", "Liberation Sans", "DejaVu Sans", sans-serif; }
      .headline { fill: #FFFFFF; font-weight: 800; font-size: 72px; letter-spacing: -0.5px; }
      .subhead { fill: #FFFFFF; opacity: 0.9; font-weight: 600; font-size: 38px; }
      .pillText { fill: #FFFFFF; font-weight: 700; font-size: 26px; letter-spacing: 0.2px; }
      .pillBg { fill: #FFFFFF; opacity: 0.14; }
      .pillStroke { fill: none; stroke: #FFFFFF; stroke-opacity: 0.12; }
      .brand { fill: #FFFFFF; opacity: 0.92; font-weight: 700; font-size: 24px; letter-spacing: 0.2px; }
      .accent { fill: #5B8CFF; }
    ]]></style>
  </defs>

  <!-- Background: Photo if available, otherwise gradient -->
  {{BACKGROUND}}

  <!-- Abstract food illustration (circles, leaves, highlights) -->
  <g opacity="0.6">
    <circle cx="330" cy="260" r="140" fill="#FFF2CC"/>
    <circle cx="520" cy="300" r="110" fill="#FFD6A5"/>
    <circle cx="690" cy="210" r="90" fill="#FFE5B4"/>
    <circle cx="880" cy="310" r="130" fill="#FFB3B3"/>
    <ellipse cx="420" cy="220" rx="180" ry="60" fill="#77D68B" opacity="0.6"/>
    <ellipse cx="760" cy="260" rx="160" ry="50" fill="#6ECF90" opacity="0.6"/>
    <circle cx="600" cy="180" r="18" fill="#FFFFFF" opacity="0.35"/>
    <circle cx="950" cy="240" r="14" fill="#FFFFFF" opacity="0.35"/>
  </g>

  <!-- Vignette -->
  <rect x="0" y="0" width="1200" height="630" fill="url(#vignette)"/>
  <!-- Bottom legibility gradient overlay -->
  <rect x="0" y="0" width="1200" height="630" fill="url(#legibility)"/>

  <!-- Accent keyline at top -->
  <rect x="0" y="0" width="1200" height="6" class="accent"/>

  <!-- Safe area: 48px all around -->
  <g id="safe" transform="translate(48,48)">
    <!-- Text block positioned near bottom-left -->
    <g transform="translate(0,390)">
      <text class="font-sans headline" x="0" y="0">{{DISH_NAME}}</text>
      <text class="font-sans subhead" x="0" y="56">{{CALORIES}} kcal · {{SERVING_LABEL}}</text>

      <!-- Confidence chip -->
      {{CONFIDENCE_CHIP}}

      <!-- Macro pills row -->
      <g transform="translate(120,90)">
        <!-- P -->
        <g>
          <rect x="0" y="0" width="112" height="42" rx="10" class="pillBg"/>
          <rect x="0.5" y="0.5" width="111" height="41" rx="9.5" class="pillStroke"/>
          <text class="font-sans pillText" x="16" y="28">P {{PROTEIN}}g</text>
        </g>
        <!-- C -->
        <g transform="translate(128,0)">
          <rect x="0" y="0" width="112" height="42" rx="10" class="pillBg"/>
          <rect x="0.5" y="0.5" width="111" height="41" rx="9.5" class="pillStroke"/>
          <text class="font-sans pillText" x="16" y="28">C {{CARBS}}g</text>
        </g>
        <!-- F -->
        <g transform="translate(256,0)">
          <rect x="0" y="0" width="112" height="42" rx="10" class="pillBg"/>
          <rect x="0.5" y="0.5" width="111" height="41" rx="9.5" class="pillStroke"/>
          <text class="font-sans pillText" x="16" y="28">F {{FAT}}g</text>
        </g>
      </g>

      <!-- Brand footer -->
      <g transform="translate(0,150)">
        <circle cx="14" cy="14" r="10" fill="#FFFFFF" opacity="0.92"/>
        <text class="font-sans brand" x="36" y="22">{{BRAND_DOMAIN}}</text>
      </g>
    </g>
  </g>
</svg>`,

  noPhotoLight: `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <radialGradient id="bgLight" cx="50%" cy="40%" r="80%">
      <stop offset="0%" stop-color="#FFFFFF"/>
      <stop offset="100%" stop-color="#EEF1F6"/>
    </radialGradient>
    <linearGradient id="legibilityLight" x1="0" y1="0" x2="0" y2="1">
      <stop offset="55%" stop-color="#FFFFFF00"/>
      <stop offset="100%" stop-color="#FFFFFFCC"/>
    </linearGradient>
    <style><![CDATA[
      .font-sans { font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", "Liberation Sans", "DejaVu Sans", sans-serif; }
      .headline { fill: #0B0C10; font-weight: 800; font-size: 72px; letter-spacing: -0.5px; }
      .subhead { fill: #30343B; opacity: 0.9; font-weight: 600; font-size: 38px; }
      .pillText { fill: #0B0C10; font-weight: 700; font-size: 26px; letter-spacing: 0.2px; }
      .pillBg { fill: #0B0C10; opacity: 0.06; }
      .pillStroke { fill: none; stroke: #0B0C10; stroke-opacity: 0.10; }
      .brand { fill: #30343B; opacity: 0.92; font-weight: 700; font-size: 24px; letter-spacing: 0.2px; }
      .accent { fill: #5B8CFF; }
      .plateRim { fill: none; stroke: #D6DBE4; stroke-width: 10; }
      .plateFill { fill: #FFFFFF; }
      .glyph { fill: #D6DBE4; }
    ]]></style>
  </defs>

  <rect x="0" y="0" width="1200" height="630" fill="url(#bgLight)"/>

  <!-- Simple plate glyph as thumbprint -->
  <g transform="translate(800,140)">
    <circle cx="180" cy="180" r="160" class="plateFill"/>
    <circle cx="180" cy="180" r="160" class="plateRim"/>
    <circle cx="180" cy="180" r="26" class="glyph" opacity="0.6"/>
  </g>

  <!-- Bottom legibility area for text (light) -->
  <rect x="0" y="0" width="1200" height="630" fill="url(#legibilityLight)"/>

  <!-- Accent keyline at top -->
  <rect x="0" y="0" width="1200" height="6" class="accent"/>

  <g id="safe" transform="translate(48,48)">
    <g transform="translate(0,390)">
      <text class="font-sans headline" x="0" y="0">{{DISH_NAME}}</text>
      <text class="font-sans subhead" x="0" y="56">{{CALORIES}} kcal · {{SERVING_LABEL}}</text>

      <!-- Confidence chip -->
      {{CONFIDENCE_CHIP}}

      <!-- Macro pills row -->
      <g transform="translate(120,90)">
        <g>
          <rect x="0" y="0" width="112" height="42" rx="10" class="pillBg"/>
          <rect x="0.5" y="0.5" width="111" height="41" rx="9.5" class="pillStroke"/>
          <text class="font-sans pillText" x="16" y="28">P {{PROTEIN}}g</text>
        </g>
        <g transform="translate(128,0)">
          <rect x="0" y="0" width="112" height="42" rx="10" class="pillBg"/>
          <rect x="0.5" y="0.5" width="111" height="41" rx="9.5" class="pillStroke"/>
          <text class="font-sans pillText" x="16" y="28">C {{CARBS}}g</text>
        </g>
        <g transform="translate(256,0)">
          <rect x="0" y="0" width="112" height="42" rx="10" class="pillBg"/>
          <rect x="0.5" y="0.5" width="111" height="41" rx="9.5" class="pillStroke"/>
          <text class="font-sans pillText" x="16" y="28">F {{FAT}}g</text>
        </g>
      </g>

      <!-- Brand footer -->
      <g transform="translate(0,150)">
        <circle cx="14" cy="14" r="10" fill="#0B0C10" opacity="0.92"/>
        <text class="font-sans brand" x="36" y="22">{{BRAND_DOMAIN}}</text>
      </g>
    </g>
  </g>
</svg>`,

  noPhotoDark: `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <radialGradient id="bgDark" cx="50%" cy="40%" r="80%">
      <stop offset="0%" stop-color="#0E0F12"/>
      <stop offset="100%" stop-color="#0A0B0E"/>
    </radialGradient>
    <linearGradient id="legibilityDark" x1="0" y1="0" x2="0" y2="1">
      <stop offset="55%" stop-color="#00000000"/>
      <stop offset="100%" stop-color="#000000B3"/>
    </linearGradient>
    <style><![CDATA[
      .font-sans { font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", "Liberation Sans", "DejaVu Sans", sans-serif; }
      .headline { fill: #FFFFFF; font-weight: 800; font-size: 72px; letter-spacing: -0.5px; }
      .subhead { fill: #FFFFFF; opacity: 0.9; font-weight: 600; font-size: 38px; }
      .pillText { fill: #FFFFFF; font-weight: 700; font-size: 26px; letter-spacing: 0.2px; }
      .pillBg { fill: #FFFFFF; opacity: 0.12; }
      .pillStroke { fill: none; stroke: #FFFFFF; stroke-opacity: 0.10; }
      .brand { fill: #FFFFFF; opacity: 0.92; font-weight: 700; font-size: 24px; letter-spacing: 0.2px; }
      .accent { fill: #5B8CFF; }
      .plateRim { fill: none; stroke: #2A2F3A; stroke-width: 10; }
      .plateFill { fill: #0F1115; }
      .glyph { fill: #2A2F3A; }
    ]]></style>
  </defs>

  <rect x="0" y="0" width="1200" height="630" fill="url(#bgDark)"/>

  <!-- Simple plate glyph as thumbprint -->
  <g transform="translate(800,140)">
    <circle cx="180" cy="180" r="160" class="plateFill"/>
    <circle cx="180" cy="180" r="160" class="plateRim"/>
    <circle cx="180" cy="180" r="26" class="glyph" opacity="0.7"/>
  </g>

  <!-- Bottom legibility area for text (dark) -->
  <rect x="0" y="0" width="1200" height="630" fill="url(#legibilityDark)"/>

  <!-- Accent keyline at top -->
  <rect x="0" y="0" width="1200" height="6" class="accent"/>

  <g id="safe" transform="translate(48,48)">
    <g transform="translate(0,390)">
      <text class="font-sans headline" x="0" y="0">{{DISH_NAME}}</text>
      <text class="font-sans subhead" x="0" y="56">{{CALORIES}} kcal · {{SERVING_LABEL}}</text>

      <!-- Confidence chip -->
      {{CONFIDENCE_CHIP}}

      <!-- Macro pills row -->
      <g transform="translate(120,90)">
        <g>
          <rect x="0" y="0" width="112" height="42" rx="10" class="pillBg"/>
          <rect x="0.5" y="0.5" width="111" height="41" rx="9.5" class="pillStroke"/>
          <text class="font-sans pillText" x="16" y="28">P {{PROTEIN}}g</text>
        </g>
        <g transform="translate(128,0)">
          <rect x="0" y="0" width="112" height="42" rx="10" class="pillBg"/>
          <rect x="0.5" y="0.5" width="111" height="41" rx="9.5" class="pillStroke"/>
          <text class="font-sans pillText" x="16" y="28">C {{CARBS}}g</text>
        </g>
        <g transform="translate(256,0)">
          <rect x="0" y="0" width="112" height="42" rx="10" class="pillBg"/>
          <rect x="0.5" y="0.5" width="111" height="41" rx="9.5" class="pillStroke"/>
          <text class="font-sans pillText" x="16" y="28">F {{FAT}}g</text>
        </g>
      </g>

      <!-- Brand footer -->
      <g transform="translate(0,150)">
        <circle cx="14" cy="14" r="10" fill="#FFFFFF" opacity="0.92"/>
        <text class="font-sans brand" x="36" y="22">{{BRAND_DOMAIN}}</text>
      </g>
    </g>
  </g>
</svg>`
};

// Helper function to truncate text to fit in 2 lines
const truncateText = (text, maxLength = 25) => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

// Helper function to generate confidence chip SVG
const generateConfidenceChip = (confidencePct) => {
  if (!confidencePct) return '';
  
  return `<g transform="translate(0,90)">
    <rect x="0" y="0" width="104" height="42" rx="10" class="pillBg"/>
    <rect x="0.5" y="0.5" width="103" height="41" rx="9.5" class="pillStroke"/>
    <text class="font-sans pillText" x="20" y="28">±${confidencePct}%</text>
  </g>`;
};

// Helper function to generate photo overlay SVG
const generatePhotoOverlay = (imageUrl) => {
  if (!imageUrl) return '';
  
  return `<image href="${imageUrl}" x="0" y="0" width="1200" height="630" preserveAspectRatio="xMidYMid slice"/>`;
};

// Main function to generate share card v2
const generateShareCardV2 = async (data, variant = 'photo') => {
  const {
    dishName,
    caloriesKcal,
    servingLabel,
    proteinG,
    carbsG,
    fatG,
    confidencePct,
    imageUrl,
    brandDomain = 'calorie.codedcheese.com',
    locale = 'en'
  } = data;

  // Validate inputs
  if (!dishName || !caloriesKcal) {
    throw new Error('Missing required fields: dishName, caloriesKcal');
  }

  // Determine which template to use
  let template;

  if (variant === 'photo') {
    template = SVG_TEMPLATES.withPhoto;
  } else if (variant === 'light') {
    template = SVG_TEMPLATES.noPhotoLight;
  } else {
    template = SVG_TEMPLATES.noPhotoDark;
  }

  // Prepare data for template
  const templateData = {
    DISH_NAME: truncateText(dishName),
    CALORIES: caloriesKcal,
    SERVING_LABEL: servingLabel || 'per serving',
    PROTEIN: proteinG || 0,
    CARBS: carbsG || 0,
    FAT: fatG || 0,
    BRAND_DOMAIN: brandDomain,
    BACKGROUND: imageUrl ? '' : '<rect x="0" y="0" width="1200" height="630" fill="url(#bgPhoto)"/>', // Remove photo overlay from SVG
    CONFIDENCE_CHIP: generateConfidenceChip(confidencePct)
  };

  // Replace placeholders in template
  let svg = template;
  Object.entries(templateData).forEach(([key, value]) => {
    svg = svg.replace(new RegExp(`{{${key}}}`, 'g'), value);
  });

  // Convert SVG to PNG using canvas
  const canvas = createCanvas(1200, 630);
  const ctx = canvas.getContext('2d');

  // If we have an image URL, load and draw it first
  if (imageUrl && variant === 'photo') {
    try {
      console.log('🖼️ Loading food image:', imageUrl);
      const foodImage = await loadImage(imageUrl);
      // Draw the image using a "cover" strategy to preserve aspect ratio without distortion
      // Similar to CSS object-fit: cover centered
      const canvasWidth = 1200;
      const canvasHeight = 630;
      const imageWidth = foodImage.width;
      const imageHeight = foodImage.height;

      // Compute the scale that covers the entire canvas
      const scale = Math.max(canvasWidth / imageWidth, canvasHeight / imageHeight);
      const drawWidth = imageWidth * scale;
      const drawHeight = imageHeight * scale;

      // Center the image within the canvas
      const dx = (canvasWidth - drawWidth) / 2;
      const dy = (canvasHeight - drawHeight) / 2;

      ctx.drawImage(foodImage, dx, dy, drawWidth, drawHeight);
      console.log('✅ Food image loaded successfully');
    } catch (error) {
      console.log('⚠️ Failed to load food image, using gradient background:', error.message);
      // Draw gradient background as fallback
      const gradient = ctx.createLinearGradient(0, 0, 1200, 630);
      gradient.addColorStop(0, '#F4C77E');
      gradient.addColorStop(1, '#D96A6B');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 1200, 630);
    }
  } else {
    // Create a data URL from SVG
    const svgDataUrl = 'data:image/svg+xml;base64,' + Buffer.from(svg).toString('base64');
    
    // Load SVG as image
    const img = await loadImage(svgDataUrl);
    ctx.drawImage(img, 0, 0, 1200, 630);
  }

  // If we have a food image, overlay the SVG content on top
  if (imageUrl && variant === 'photo') {
    // Create SVG without the background (just the overlays and text)
    const overlaySvg = svg.replace(/<rect[^>]*fill="url\(#bgPhoto\)"[^>]*\/>/g, ''); // Remove background rect
    
    // Create a data URL from the overlay SVG
    const overlaySvgDataUrl = 'data:image/svg+xml;base64,' + Buffer.from(overlaySvg).toString('base64');
    
    // Load overlay SVG as image
    const overlayImg = await loadImage(overlaySvgDataUrl);
    ctx.drawImage(overlayImg, 0, 0, 1200, 630);
  }

  // Return buffer
  return canvas.toBuffer('image/png');
};

// Function to generate and store share card
const generateAndStoreShareCardV2 = async (result, variant = 'photo') => {
  try {
    // Prepare data from result
    const data = {
      dishName: result.food_items?.join(', ') || 'Food Analysis',
      caloriesKcal: result.total_calories || 0,
      servingLabel: result.serving_size || 'per serving',
      proteinG: result.nutrition_table?.protein_g || 0,
      carbsG: result.nutrition_table?.carbs_g || 0,
      fatG: result.nutrition_table?.fat_g || 0,
      confidencePct: result.confidence_score ? Math.round(result.confidence_score * 100) : null,
      imageUrl: result.image_url,
      brandDomain: 'calorie.codedcheese.com'
    };

    // Generate the share card
    const imageBuffer = await generateShareCardV2(data, variant);
    
    // Generate filename with variant
    const fileName = `share-cards-v2/${result.id}-${variant}-${Date.now()}.png`;
    
    // Upload to Supabase storage
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('public-assets')
      .upload(fileName, imageBuffer, {
        contentType: 'image/png',
        cacheControl: '3600'
      });

    if (uploadError) {
      console.error('Failed to upload share card:', uploadError);
      throw uploadError;
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('public-assets')
      .getPublicUrl(fileName);

    // Update result with new share card URL
    await supabase
      .from('calorie_results')
      .update({ 
        social_image_url: publicUrl,
        social_image_generated_at: new Date().toISOString()
      })
      .eq('id', result.id);

    return publicUrl;
  } catch (error) {
    console.error('Failed to generate share card v2:', error);
    throw error;
  }
};

export { generateShareCardV2, generateAndStoreShareCardV2 };
