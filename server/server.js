import express from 'express';
import multer from 'multer';
import dotenv from 'dotenv';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { createClient } from '@supabase/supabase-js';
import { analyzeImage } from './utils/llmDispatcher.js';
import { checkAndRecordUpload } from './utils/uploadLimiter.js';

// ES module dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Middleware
app.use(cors({
  origin: [
    'http://localhost:5173',  // Vite dev server
    'http://localhost:3000',  // Local server
    process.env.FRONTEND_URL || 'https://your-vercel-frontend-url.vercel.app'
  ],
  credentials: true
}));
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
// app.use(express.static(path.join(__dirname, '../public')));

// API endpoint for image analysis
app.post('/api/analyze', upload.single('image'), async (req, res) => {
  try {
    let user = null;
    let isAnonymous = false;
    
    // 1. Extract token from Authorization header
    const authHeader = req.headers['authorization'] || req.headers['Authorization'];
    const sessionToken = authHeader?.startsWith('Bearer ') ? authHeader.replace('Bearer ', '') : null;
    
    if (sessionToken) {
      // 2. Validate with Supabase for authenticated users
      const { data: { user: authUser }, error: userError } = await supabase.auth.getUser(sessionToken);
      if (userError || !authUser) {
        return res.status(401).json({ error: 'Invalid authentication token' });
      }
      
      // 3. Check if user email is verified
      if (!authUser.email_confirmed_at) {
        return res.status(403).json({ 
          error: 'Email verification required',
          message: 'Please verify your email address before using this feature.'
        });
      }
      
      user = authUser;
    } else {
      // Anonymous user - extract IP address for rate limiting
      isAnonymous = true;
      const forwardedFor = req.headers["x-forwarded-for"]?.toString();
      const remoteAddr = req.connection.remoteAddress;
      const socketAddr = req.socket.remoteAddress;
      
      const ip = forwardedFor?.split(",")[0] || remoteAddr || socketAddr;
      
      console.log('🌐 IP Address extraction:', {
        'x-forwarded-for': forwardedFor,
        'remoteAddress': remoteAddr,
        'socketAddress': socketAddr,
        'finalIP': ip
      });
      
      if (!ip) {
        console.error('❌ No IP address found in request');
        return res.status(400).json({ error: 'Unable to identify request source' });
      }
      
      // Check anonymous user rate limit (1 upload/day)
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);

      console.log('🔍 Checking anonymous user rate limit for IP:', ip);
      console.log('📅 Date range:', todayStart.toISOString(), 'to', todayEnd.toISOString());

      // First, try a simple query without IP filter to test basic functionality
      console.log('🔍 Testing basic anonymous query...');
      
      // Try a simpler query first to test connection
      const { data: testData, error: testError } = await supabase
        .from("calorie_results")
        .select("id")
        .limit(1);
      
      console.log('🔍 Test query result:', { data: testData, error: testError });
      
      if (testError) {
        console.error("❌ Test query failed:", testError);
        return res.status(500).json({ error: "Database connection issue.", details: testError.message });
      }
      
      // Now try the count query - use is() for null values
      const { count: basicCount, error: basicError } = await supabase
        .from("calorie_results")
        .select("*", { count: "exact", head: true })
        .is("user_id", null)
        .gte("created_at", todayStart.toISOString())
        .lte("created_at", todayEnd.toISOString());

      console.log('📊 Basic anonymous count result:', { count: basicCount, error: basicError });

      if (basicError) {
        console.error("❌ Basic anonymous query failed:", basicError.message);
        console.error("❌ Full error object:", basicError);
        
        // If the count query fails, try a different approach - get all records and count manually
        console.log('🔄 Trying alternative approach - fetching all records...');
        const { data: allRecords, error: fetchError } = await supabase
          .from("calorie_results")
          .select("id, created_at, user_id, ip_address")
          .is("user_id", null)
          .gte("created_at", todayStart.toISOString())
          .lte("created_at", todayEnd.toISOString());
        
        if (fetchError) {
          console.error("❌ Alternative approach also failed:", fetchError);
          return res.status(500).json({ error: "Unable to verify usage limit.", details: fetchError.message });
        }
        
        console.log('📊 Fetched records:', allRecords?.length || 0);
        
        // Count records with matching IP
        const matchingRecords = allRecords?.filter(record => record.ip_address === ip) || [];
        const count = matchingRecords.length;
        
        console.log('📊 Manual count result:', { count, totalRecords: allRecords?.length || 0 });
        
        if (count >= 1) {
          return res.status(429).json({ 
            error: "Anonymous users are limited to 1 upload per day. Please sign in to unlock more.",
            usage: {
              current: count,
              max: 1,
              remaining: 0
            }
          });
        }
        
        // Allow the request to proceed
        req.anonymousIp = ip;
        return; // Skip the rest of the IP filtering logic
      }

      // Now try the full query with IP filter
      console.log('🔍 Testing IP-filtered anonymous query...');
      const { count, error: anonCountError } = await supabase
        .from("calorie_results")
        .select("*", { count: "exact", head: true })
        .is("user_id", null) // ensure it's anonymous
        .eq("ip_address", ip)
        .gte("created_at", todayStart.toISOString())
        .lte("created_at", todayEnd.toISOString());

      console.log('📊 IP-filtered anonymous count result:', { count, error: anonCountError });

      if (anonCountError) {
        console.error("❌ Anon IP count error:", anonCountError.message);
        console.error("🔍 Error details:", anonCountError);
        
        // If the error is about missing column, provide helpful message
        if (anonCountError.message.includes('column') && anonCountError.message.includes('ip_address')) {
          return res.status(500).json({ 
            error: "Database schema needs update. Please add ip_address column to calorie_results table.",
            details: "Run: ALTER TABLE calorie_results ADD COLUMN ip_address TEXT;"
          });
        }
        
        // For now, allow the request to proceed if IP filtering fails
        console.log('⚠️ IP filtering failed, allowing request to proceed...');
        req.anonymousIp = ip;
      } else {
        console.log('✅ IP filtering successful, count:', count);
        
        if (count >= 1) {
          return res.status(429).json({ 
            error: "Anonymous users are limited to 1 upload per day. Please sign in to unlock more.",
            usage: {
              current: count,
              max: 1,
              remaining: 0
            }
          });
        }
        
        // Attach IP address to the request for tracking
        req.anonymousIp = ip;
      }

      if (count >= 1) {
        return res.status(429).json({ 
          error: "Anonymous users are limited to 1 upload per day. Please sign in to unlock more.",
          usage: {
            current: count,
            max: 1,
            remaining: 0
          }
        });
      }

      // Attach IP address to the request for tracking
      req.anonymousIp = ip;
    }

    // 4. For authenticated users, we'll check the limit after analysis but before saving
    // This prevents the race condition by making the check atomic with the insert

    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    // 4. Analyze image using the LLM dispatcher
    console.log('🔍 Starting image analysis...');
    const analysisResult = await analyzeImage(req, req.file.buffer);
    
    if (!analysisResult.success) {
      throw new Error('Analysis failed');
    }

    const parsedResult = analysisResult.result;

    // 5. Save result to Supabase with atomic limit checking using the upload limiter utility
    const insertData = {
      user_id: user?.id || null,
      image_url: 'inline',
      food_items: parsedResult.foodItems,
      total_calories: parsedResult.totalCalories,
      explanation: parsedResult.explanation,
      nutrition_table: parsedResult.nutritionFacts || null,
      serving_size: parsedResult.servingSize || null,
      confidence_score: parsedResult.confidenceScore || null,
      ip_address: req.anonymousIp || null,
    };
    
    console.log('💾 Attempting to save data with upload limit check:', {
      user_id: insertData.user_id,
      ip_address: insertData.ip_address,
      isAnonymous: !user
    });
    
    const uploadResult = await checkAndRecordUpload(user?.id, insertData);
    
    if (!uploadResult.success) {
      if (uploadResult.error.message.includes('Daily upload limit reached')) {
        return res.status(429).json({ 
          error: uploadResult.error.message,
          usage: uploadResult.usage
        });
      } else {
        console.error('❌ Failed to save upload:', uploadResult.error);
        return res.status(500).json({ error: "Server error while saving analysis." });
      }
    }
    
    console.log('✅ Upload saved successfully:', uploadResult.data);

    // 6. Return the analysis result
    const responseData = {
      success: true,
      result: parsedResult,
      usage: analysisResult.usage,
    };
    
    // Add usage information from the upload result
    if (uploadResult.usage) {
      responseData.dailyUsage = uploadResult.usage;
    }
    
    res.json(responseData);

  } catch (error) {
    console.error('❌ Analysis error:', error);
    
    if (error.message.includes('quota exceeded')) {
      return res.status(429).json({
        error: 'API quota exceeded. Please check your billing settings.',
        type: 'quota_exceeded'
      });
    }
    
    if (error.message.includes('invalid_api_key') || error.message.includes('Invalid')) {
      return res.status(401).json({
        error: 'Invalid API key. Please check your configuration.',
        type: 'invalid_key'
      });
    }

    res.status(500).json({
      error: 'Failed to analyze image. Please try again.',
      details: error.message
    });
  }
});

// Route to get current daily usage for the authenticated user
app.get('/api/user-usage', async (req, res) => {
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

    // Import the getCurrentUsage function
    const { getCurrentUsage } = await import('./utils/uploadLimiter.js');
    const usage = await getCurrentUsage(user.id);
    
    if (usage === null) {
      return res.status(500).json({ error: 'Failed to fetch usage data' });
    }

    res.json({ success: true, usage });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch user usage', details: err.message });
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
