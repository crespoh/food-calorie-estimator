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
import { generateAndStoreSocialImage } from './utils/shareImageGenerator.js';

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
      image_url: req.body.imageUrl || 'inline', // Use provided imageUrl or fallback
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
    
    // Add the result ID if the insert was successful
    if (uploadResult.success && uploadResult.data && uploadResult.data[0]) {
      responseData.resultId = uploadResult.data[0].id;
      console.log('✅ Setting resultId in response:', responseData.resultId);
    } else {
      console.log('⚠️ No resultId available - uploadResult:', {
        success: uploadResult.success,
        hasData: !!uploadResult.data,
        dataLength: uploadResult.data?.length
      });
    }
    
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

// Route to upload resized image to Supabase Storage
app.post('/api/upload-image', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    // Extract user info if authenticated
    let userId = null;
    const authHeader = req.headers['authorization'] || req.headers['Authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user }, error: userError } = await supabase.auth.getUser(token);
      if (!userError && user) {
        userId = user.id;
      }
    }

    // Generate descriptive filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = userId ? `${userId}_${timestamp}.jpg` : `anonymous_${timestamp}.jpg`;

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('uploads')
      .upload(filename, req.file.buffer, {
        contentType: req.file.mimetype,
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error('Storage upload error:', error);
      return res.status(500).json({ error: 'Failed to upload image to storage' });
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('uploads')
      .getPublicUrl(filename);

    console.log('✅ Image uploaded successfully:', filename);
    
    res.json({
      success: true,
      imageUrl: urlData.publicUrl,
      filename: filename
    });

  } catch (error) {
    console.error('Upload image error:', error);
    res.status(500).json({ error: 'Failed to upload image', details: error.message });
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

// Route to log share events
app.post('/api/share-event', async (req, res) => {
  try {
    console.log('📤 Share event received:', req.body);
    const { platform, resultId, userAgent, timestamp } = req.body;
    
    if (!platform) {
      console.log('❌ Missing platform field');
      return res.status(400).json({ error: 'Missing required field: platform' });
    }

    // Extract user info if authenticated
    let userId = null;
    const authHeader = req.headers['authorization'] || req.headers['Authorization'];
    console.log('🔐 Auth header:', authHeader ? 'Present' : 'Missing');
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user }, error: userError } = await supabase.auth.getUser(token);
      if (!userError && user) {
        userId = user.id;
        console.log('✅ Authenticated user:', userId);
      } else {
        console.log('❌ Auth error:', userError);
      }
    } else {
      console.log('👤 Anonymous user');
    }

    // Insert share event into share_events table
    const shareEventData = {
      user_id: userId,
      platform: platform,
      result_id: resultId || null,
      user_agent: userAgent || null,
      created_at: timestamp || new Date().toISOString()
    };
    
    console.log('💾 Inserting share event data:', shareEventData);
    
    const { data, error } = await supabase.from('share_events').insert([shareEventData]);

    if (error) {
      console.error('Share event insert error:', error);
      return res.status(500).json({ error: 'Failed to log share event' });
    }

    console.log('✅ Share event logged successfully');
    res.json({ success: true, data });

  } catch (error) {
    console.error('Share event error:', error);
    res.status(500).json({ error: 'Failed to log share event', details: error.message });
  }
});

// Route to submit feedback
app.post('/api/feedback', async (req, res) => {
  try {
    console.log('📝 Feedback endpoint called with body:', req.body);
    const { calorieResultId, imageId, feedback, rating } = req.body;
    
    if (!feedback) {
      console.log('❌ Missing feedback field');
      return res.status(400).json({ error: 'Missing required field: feedback' });
    }

    // Extract user info if authenticated
    let userId = null;
    const authHeader = req.headers['authorization'] || req.headers['Authorization'];
    console.log('🔐 Auth header:', authHeader ? 'Present' : 'Missing');
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user }, error: userError } = await supabase.auth.getUser(token);
      if (!userError && user) {
        userId = user.id;
        console.log('✅ Authenticated user:', userId);
      } else {
        console.log('❌ Auth error:', userError);
      }
    } else {
      console.log('👤 Anonymous user');
    }

    // Insert feedback into feedback table
    const feedbackData = {
      image_id: imageId,
      user_id: userId,
      feedback: feedback,
      rating: rating || null,
      created_at: new Date().toISOString()
    };
    
    // Only add calorie_result_id if it's provided and valid
    if (calorieResultId && calorieResultId !== 'null') {
      feedbackData.calorie_result_id = calorieResultId;
    }
    
    console.log('💾 Inserting feedback data:', feedbackData);
    
    const { data, error } = await supabase.from('feedback').insert([feedbackData]);

    if (error) {
      console.error('Feedback insert error:', error);
      return res.status(500).json({ error: 'Failed to save feedback' });
    }

    console.log('✅ Feedback saved successfully');
    res.json({ success: true, data });

  } catch (error) {
    console.error('Feedback error:', error);
    res.status(500).json({ error: 'Failed to submit feedback', details: error.message });
  }
});

// Route to fetch feedback for a specific calorie result
app.get('/api/feedback/:calorieResultId', async (req, res) => {
  try {
    const { calorieResultId } = req.params;
    
    // Extract user info if authenticated
    let userId = null;
    const authHeader = req.headers['authorization'] || req.headers['Authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user }, error: userError } = await supabase.auth.getUser(token);
      if (!userError && user) {
        userId = user.id;
      }
    }

    console.log('🔍 Fetching feedback for calorieResultId:', calorieResultId, 'userId:', userId);
    
    // Query feedback for this calorie result
    // If user is authenticated, look for their feedback
    // If not authenticated, look for anonymous feedback (user_id = null)
    let query = supabase
      .from('feedback')
      .select('*')
      .eq('calorie_result_id', calorieResultId)
      .order('created_at', { ascending: false })
      .limit(1);
    
    if (userId) {
      // Authenticated user - look for their specific feedback
      query = query.eq('user_id', userId);
      console.log('🔍 Looking for authenticated user feedback');
    } else {
      // Anonymous user - look for anonymous feedback
      query = query.is('user_id', null);
      console.log('🔍 Looking for anonymous feedback');
    }
    
    const { data, error } = await query;
    console.log('📥 Feedback query result:', { data, error });

    if (error) {
      console.error('Feedback fetch error:', error);
      return res.status(500).json({ error: 'Failed to fetch feedback' });
    }

    res.json({ success: true, feedback: data[0] || null });
  } catch (error) {
    console.error('Feedback fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch feedback', details: error.message });
  }
});

// Route to fetch public calorie result by ID
app.get('/api/public-result/:resultId', async (req, res) => {
  try {
    const { resultId } = req.params;
    
    console.log('🔍 Fetching public result:', resultId);
    
    // Validate resultId format (should be a valid UUID)
    if (!resultId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(resultId)) {
      return res.status(400).json({ error: 'Invalid result ID format' });
    }
    
    // Fetch public result from database
    const { data, error } = await supabase
      .from('calorie_results')
      .select(`
        id,
        created_at,
        food_items,
        total_calories,
        explanation,
        nutrition_table,
        serving_size,
        confidence_score,
        image_url
      `)
      .eq('id', resultId)
      .eq('is_public', true)
      .single();
    
    if (error) {
      console.error('❌ Database error fetching public result:', error);
      return res.status(500).json({ error: 'Failed to fetch result' });
    }
    
    if (!data) {
      console.log('❌ Public result not found:', resultId);
      return res.status(404).json({ error: 'Result not found or not public' });
    }
    
    console.log('✅ Public result fetched successfully:', resultId);
    
    // Return the public result data
    res.json({ 
      success: true, 
      result: data 
    });
    
  } catch (error) {
    console.error('❌ Error fetching public result:', error);
    res.status(500).json({ error: 'Failed to fetch public result', details: error.message });
  }
});

// Route to update result public status
app.patch('/api/result/:resultId/public', async (req, res) => {
  try {
    const { resultId } = req.params;
    const { isPublic } = req.body;
    
    console.log('🔧 Updating result public status:', resultId, 'isPublic:', isPublic);
    
    // Validate resultId format
    if (!resultId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(resultId)) {
      return res.status(400).json({ error: 'Invalid result ID format' });
    }
    
    // Extract user info if authenticated
    let userId = null;
    const authHeader = req.headers['authorization'] || req.headers['Authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user }, error: userError } = await supabase.auth.getUser(token);
      if (!userError && user) {
        userId = user.id;
      }
    }
    
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    // Update the result's public status
    const { data, error } = await supabase
      .from('calorie_results')
      .update({ is_public: isPublic })
      .eq('id', resultId)
      .eq('user_id', userId)
      .select()
      .single();
    
    if (error) {
      console.error('❌ Database error updating result:', error);
      return res.status(500).json({ error: 'Failed to update result' });
    }
    
    if (!data) {
      return res.status(404).json({ error: 'Result not found or not owned by user' });
    }
    
    console.log('✅ Result public status updated successfully:', resultId, 'isPublic:', isPublic);
    
    res.json({ 
      success: true, 
      result: data 
    });
    
  } catch (error) {
    console.error('❌ Error updating result public status:', error);
    res.status(500).json({ error: 'Failed to update result', details: error.message });
  }
});

// Route to track analytics events
app.post('/api/analytics/event', async (req, res) => {
  try {
    const { event, resultId, timestamp, userAgent, referrer, path } = req.body;
    
    console.log('📊 Analytics event:', event, resultId);
    
    // Insert analytics event into database
    const { error } = await supabase
      .from('analytics_events')
      .insert([{
        event_type: event,
        result_id: resultId || null,
        timestamp: timestamp || new Date().toISOString(),
        user_agent: userAgent,
        referrer: referrer || null,
        path: path,
        ip_address: req.headers['x-forwarded-for']?.toString().split(',')[0] || req.connection.remoteAddress,
      }]);
    
    if (error) {
      console.error('❌ Analytics insert error:', error);
      return res.status(500).json({ error: 'Failed to track event' });
    }
    
    res.json({ success: true });
    
  } catch (error) {
    console.error('❌ Analytics error:', error);
    res.status(500).json({ error: 'Failed to track analytics event' });
  }
});

// Route to fetch public result analytics (admin only)
app.get('/api/public-analytics', async (req, res) => {
  try {
    // Check if user is authenticated and has admin role (you can customize this)
    const authHeader = req.headers['authorization'] || req.headers['Authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Get analytics data for the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Get public result views
    const { data: viewEvents, error: viewError } = await supabase
      .from('analytics_events')
      .select('*')
      .eq('event_type', 'public_result_view')
      .gte('timestamp', thirtyDaysAgo.toISOString());

    // Get public result shares
    const { data: shareEvents, error: shareError } = await supabase
      .from('analytics_events')
      .select('*')
      .eq('event_type', 'public_result_share')
      .gte('timestamp', thirtyDaysAgo.toISOString());

    // Get CTA clicks
    const { data: ctaEvents, error: ctaError } = await supabase
      .from('analytics_events')
      .select('*')
      .eq('event_type', 'public_result_cta_click')
      .gte('timestamp', thirtyDaysAgo.toISOString());

    if (viewError || shareError || ctaError) {
      console.error('❌ Analytics fetch error:', { viewError, shareError, ctaError });
      return res.status(500).json({ error: 'Failed to fetch analytics' });
    }

    // Get top shared results
    const { data: topResults, error: topResultsError } = await supabase
      .from('analytics_events')
      .select('result_id, count')
      .eq('event_type', 'public_result_view')
      .gte('timestamp', thirtyDaysAgo.toISOString())
      .not('result_id', 'is', null)
      .select(`
        result_id,
        count(*)
      `)
      .group('result_id')
      .order('count', { ascending: false })
      .limit(10);

    const analytics = {
      period: 'Last 30 days',
      views: viewEvents?.length || 0,
      shares: shareEvents?.length || 0,
      ctaClicks: ctaEvents?.length || 0,
      conversionRate: viewEvents?.length ? ((ctaEvents?.length || 0) / viewEvents.length * 100).toFixed(1) : '0',
      topResults: topResults || [],
    };

    res.json({ success: true, analytics });
    
  } catch (error) {
    console.error('❌ Public analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch public analytics' });
  }
});

// Route to fetch share analytics (admin only)
app.get('/api/share-analytics', async (req, res) => {
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

    // TODO: Add admin check here if needed
    // For now, allow any authenticated user to view analytics

    // Get share analytics
    const { data: platformStats, error: platformError } = await supabase
      .from('share_events')
      .select('platform, count(*)')
      .group('platform');

    if (platformError) {
      return res.status(500).json({ error: platformError.message });
    }

    // Get recent share events
    const { data: recentShares, error: recentError } = await supabase
      .from('share_events')
      .select(`
        *,
        calorie_results(food_items, total_calories)
      `)
      .order('created_at', { ascending: false })
      .limit(10);

    if (recentError) {
      return res.status(500).json({ error: recentError.message });
    }

    res.json({ 
      success: true, 
      analytics: {
        platformStats,
        recentShares,
        totalShares: recentShares.length
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch share analytics', details: err.message });
  }
});

// Open Graph meta tags route for social sharing
app.get('/og/:resultId', async (req, res) => {
  try {
    const { resultId } = req.params;
    
    // Fetch result data
    const { data: result, error } = await supabase
      .from('calorie_results')
      .select('*')
      .eq('id', resultId)
      .eq('is_public', true)
      .single();
    
    if (error || !result) {
      return res.status(404).send(`
        <html>
          <head>
            <title>CaloriTrack - Result Not Found</title>
            <meta property="og:title" content="CaloriTrack - Result Not Found" />
            <meta property="og:description" content="This calorie analysis result is not available." />
            <meta property="og:image" content="${process.env.FRONTEND_URL || 'https://calorie.codedcheese.com'}/assets/default-share-image.png" />
            <meta property="og:url" content="${process.env.FRONTEND_URL || 'https://calorie.codedcheese.com'}" />
            <meta name="twitter:card" content="summary_large_image" />
            <meta name="twitter:title" content="CaloriTrack - Result Not Found" />
            <meta name="twitter:description" content="This calorie analysis result is not available." />
            <meta name="twitter:image" content="${process.env.FRONTEND_URL || 'https://calorie.codedcheese.com'}/assets/default-share-image.png" />
          </head>
          <body>
            <script>window.location.href = '${process.env.FRONTEND_URL || 'https://calorie.codedcheese.com'}/result/${resultId}';</script>
          </body>
        </html>
      `);
    }
    
    // Generate social image if not exists
    let socialImageUrl = result.social_image_url;
    if (!socialImageUrl) {
      try {
        const imageBuffer = await generateAndStoreSocialImage(result);
        const fileName = `share-images/${result.id}-default-${Date.now()}.png`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('public-assets')
          .upload(fileName, imageBuffer, {
            contentType: 'image/png',
            cacheControl: '3600'
          });
        
        if (!uploadError) {
          const { data: { publicUrl } } = supabase.storage
            .from('public-assets')
            .getPublicUrl(fileName);
          
          socialImageUrl = publicUrl;
          
          // Update result with social image URL
          await supabase
            .from('calorie_results')
            .update({ 
              social_image_url: socialImageUrl,
              social_image_generated_at: new Date().toISOString()
            })
            .eq('id', resultId);
        }
      } catch (error) {
        console.error('Failed to generate social image:', error);
        socialImageUrl = `${process.env.FRONTEND_URL || 'https://calorie.codedcheese.com'}/assets/default-share-image.png`;
      }
    }
    
    // Create food items text
    const foodItemsText = result.food_items?.join(', ') || 'Food items';
    
    // Generate meta tags
    const metaTags = `
      <html>
        <head>
          <title>CaloriTrack - ${foodItemsText} (${result.total_calories} calories)</title>
          <meta property="og:title" content="CaloriTrack - ${foodItemsText}" />
          <meta property="og:description" content="${foodItemsText} - ${result.total_calories} calories total. Analyzed with AI-powered CaloriTrack!" />
          <meta property="og:image" content="${socialImageUrl}" />
          <meta property="og:url" content="${process.env.FRONTEND_URL || 'https://calorie.codedcheese.com'}/result/${resultId}" />
          <meta property="og:type" content="website" />
          <meta name="twitter:card" content="summary_large_image" />
          <meta name="twitter:title" content="CaloriTrack - ${foodItemsText}" />
          <meta name="twitter:description" content="${foodItemsText} - ${result.total_calories} calories total. Analyzed with AI-powered CaloriTrack!" />
          <meta name="twitter:image" content="${socialImageUrl}" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        </head>
        <body>
          <script>window.location.href = '${process.env.FRONTEND_URL || 'https://calorie.codedcheese.com'}/result/${resultId}';</script>
        </body>
      </html>
    `;
    
    res.setHeader('Content-Type', 'text/html');
    res.send(metaTags);
  } catch (error) {
    console.error('OG route error:', error);
    res.status(500).send('Error generating preview');
  }
});

// Generate share image endpoint
app.post('/api/generate-share-image', async (req, res) => {
  try {
    const { resultId, platform = 'default' } = req.body;
    
    // Extract token from Authorization header
    const authHeader = req.headers['authorization'] || req.headers['Authorization'];
    const sessionToken = authHeader?.startsWith('Bearer ') ? authHeader.replace('Bearer ', '') : null;
    
    if (!sessionToken) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    // Validate with Supabase for authenticated users
    const { data: { user }, error: userError } = await supabase.auth.getUser(sessionToken);
    if (userError || !user) {
      return res.status(401).json({ error: 'Invalid authentication token' });
    }
    
    // Fetch result data
    const { data: result, error } = await supabase
      .from('calorie_results')
      .select('*')
      .eq('id', resultId)
      .single();
    
    if (error || !result) {
      return res.status(404).json({ error: 'Result not found' });
    }
    
    // Check if user owns the result or result is public
    if (result.user_id !== user.id && !result.is_public) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Generate social image
    const imageBuffer = await generateAndStoreSocialImage(result, platform);
    const fileName = `share-images/${resultId}-${platform}-${Date.now()}.png`;
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('public-assets')
      .upload(fileName, imageBuffer, {
        contentType: 'image/png',
        cacheControl: '3600'
      });
    
    if (uploadError) throw uploadError;
    
    const { data: { publicUrl } } = supabase.storage
      .from('public-assets')
      .getPublicUrl(fileName);
    
    // Update result with social image URL
    await supabase
      .from('calorie_results')
      .update({ 
        social_image_url: publicUrl,
        social_image_generated_at: new Date().toISOString()
      })
      .eq('id', resultId);
    
    // Log share image generation
    await supabase
      .from('share_images')
      .insert({
        result_id: resultId,
        user_id: user.id,
        platform,
        image_url: publicUrl,
        metadata: { platform, generated_at: new Date().toISOString() }
      });
    
    res.json({ success: true, imageUrl: publicUrl });
  } catch (error) {
    console.error('Share image generation error:', error);
    res.status(500).json({ error: 'Failed to generate share image' });
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
    message: 'CaloriTrack API is running',
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
  console.log(`🚀 CaloriTrack server running on port ${PORT}`);
  console.log(`📱 Frontend: http://localhost:${PORT}`);
  console.log(`🔌 API: http://localhost:${PORT}/api/health`);
  
  if (!process.env.OPENAI_API_KEY) {
    console.warn('⚠️  Warning: OPENAI_API_KEY not found in environment variables');
    console.warn('   Please add your OpenAI API key to the .env file');
  }
});
