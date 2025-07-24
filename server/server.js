import express from 'express';
import multer from 'multer';
import { OpenAI } from 'openai';
import dotenv from 'dotenv';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

// ES module dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Initialize Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Middleware
app.use(cors());
app.use(express.json());

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPEG, JPG, PNG, and WebP images are allowed'), false);
    }
  },
});

// Serve static files from public directory
app.use(express.static(path.join(__dirname, '../public')));

// API endpoint for image analysis
app.post('/api/analyze', upload.single('image'), async (req, res) => {
  try {
    // 1. Extract token from Authorization header
    const authHeader = req.headers['authorization'] || req.headers['Authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const token = authHeader.replace('Bearer ', '');
    // 2. Validate with Supabase
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    // 3. Check if user email is verified
    if (!user.email_confirmed_at) {
      return res.status(403).json({ 
        error: 'Email verification required',
        message: 'Please verify your email address before using this feature.'
      });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ 
        error: 'OpenAI API key not configured. Please add your API key to the .env file.' 
      });
    }

    // Convert image to base64
    const base64Image = req.file.buffer.toString('base64');
    const mimeType = req.file.mimetype;

    // Create the prompt for calorie estimation
    const prompt = `You are a helpful assistant that identifies food and estimates nutritional information from a photo.

Please analyze this image and return:
1. A list of identifiable food items
2. An estimated total calorie count
3. A nutrition facts breakdown, including:
   - Protein (g)
   - Fat (g)
   - Carbohydrates (g)
   - (Include other nutrients if clearly identifiable, like fiber or sugar)
4. Serving size (e.g., 1 plate, 1 bowl, 100g), if possible
5. A confidence score (0–1) representing how certain you are about the identification and estimation
6. A brief explanation of how you arrived at these estimates

If the food is unclear, say so and provide general estimates based on visual clues.

Format your response as a JSON object like this:
{
  "foodItems": ["item1", "item2", ...],
  "totalCalories": number,
  "nutritionFacts": {
    "protein_g": number,
    "fat_g": number,
    "carbohydrates_g": number,
    "fiber_g": number,
    "sugar_g": number
  },
  "servingSize": "string",
  "confidenceScore": number,
  "explanation": "your explanation here"
}`;

    // Call OpenAI Vision API
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            {
              type: "image_url",
              image_url: {
                url: `data:${mimeType};base64,${base64Image}`,
                detail: "auto" // Use low detail to reduce costs then changed to auto
              }
            }
          ]
        }
      ],
      max_tokens: 300,
      temperature: 0.1,
    });

    let resultText = response.choices[0].message.content;
    // Remove code block markers if present
    if (typeof resultText === 'string') {
      resultText = resultText.trim();
      // Remove ```json ... ``` or ``` ... ```
      if (resultText.startsWith('```')) {
        resultText = resultText.replace(/^```json\s*|^```\s*|```$/gim, '');
        // Remove trailing triple backticks if present
        resultText = resultText.replace(/```$/g, '').trim();
      }
    }

    // Try to parse JSON response
    let parsedResult;
    let isFallback = false;
    try {
      parsedResult = JSON.parse(resultText);
    } catch (parseError) {
      // If JSON parsing fails, create a structured response
      parsedResult = {
        foodItems: ["Food items identified"],
        totalCalories: 0,
        explanation: response.choices[0].message.content,
        fallback: true
      };
      isFallback = true;
    }

    // If parsedResult is missing required fields, treat as fallback
    if (
      !parsedResult.foodItems ||
      !Array.isArray(parsedResult.foodItems) ||
      typeof parsedResult.totalCalories !== 'number' ||
      typeof parsedResult.explanation !== 'string'
    ) {
      parsedResult = {
        foodItems: ["Food items identified"],
        totalCalories: 0,
        explanation: typeof resultText === 'string' ? resultText : 'Could not parse analysis result.',
        fallback: true
      };
      isFallback = true;
    }

    // Save result to Supabase
    try {
      const { error, data } = await supabase.from('calorie_results').insert([
        {
          user_id: user.id,
          image_url: 'inline',
          food_items: parsedResult.foodItems,
          total_calories: parsedResult.totalCalories,
          explanation: parsedResult.explanation,
          nutrition_table: parsedResult.nutritionFacts || null,
        },
      ]);
      console.log("🧾 Supabase Insert Result:", { data, error });
      if (error) {
        console.error('Supabase insert error:', error);
      } else {
        console.log('Supabase insert success:', data);
      }
    } catch (supabaseError) {
      console.error('Failed to insert calorie result into Supabase:', supabaseError);
    }

    res.json({
      success: true,
      result: parsedResult,
      usage: response.usage,
      fallback: isFallback
    });

  } catch (error) {
    console.error('Error analyzing image:', error);
    
    if (error.code === 'insufficient_quota') {
      return res.status(402).json({
        error: 'OpenAI API quota exceeded. Please check your billing settings.',
        type: 'quota_exceeded'
      });
    }
    
    if (error.code === 'invalid_api_key') {
      return res.status(401).json({
        error: 'Invalid OpenAI API key. Please check your configuration.',
        type: 'invalid_key'
      });
    }

    res.status(500).json({
      error: 'Failed to analyze image. Please try again.',
      details: error.message
    });
  }
});

// Route to fetch calorie results for the authenticated user
app.get('/api/user-history', async (req, res) => {
  try {
    const authHeader = req.headers['authorization'] || req.headers['Authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid Authorization header' });
    }
    const token = authHeader.replace('Bearer ', '');

    // Validate JWT and get user info from Supabase
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    const userId = user.id;

    // Query calorie_results for this user, excluding all-zero UUID
    const { data, error } = await supabase
      .from('calorie_results')
      .select('*')
      .eq('user_id', userId)
      .neq('user_id', '00000000-0000-0000-0000-000000000000')
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(500).json({ error: error.message });
    }
    res.json({ success: true, results: data });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch user history', details: err.message });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Food Calorie Estimator API is running',
    timestamp: new Date().toISOString()
  });
});

// Fallback route to serve React app
app.get('*', (req, res) => {
  const indexPath = path.join(__dirname, 'public', 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).json({ 
      error: 'Frontend not built. Please run "npm run build" first.' 
    });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        error: 'File too large. Please upload an image smaller than 5MB.',
        type: 'file_too_large'
      });
    }
  }
  
  console.error('Unexpected error:', error);
  res.status(500).json({ 
    error: 'Something went wrong. Please try again.' 
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Food Calorie Estimator server running on port ${PORT}`);
  console.log(`📱 Frontend: http://localhost:${PORT}`);
  console.log(`🔌 API: http://localhost:${PORT}/api/health`);
  
  if (!process.env.OPENAI_API_KEY) {
    console.warn('⚠️  Warning: OPENAI_API_KEY not found in environment variables');
    console.warn('   Please add your OpenAI API key to the .env file');
  }
});
