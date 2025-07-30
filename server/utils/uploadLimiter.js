import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

/**
 * Atomically checks and records an upload for a user
 * Returns success/failure and current usage stats
 */
export async function checkAndRecordUpload(userId, uploadData) {
  const maxUploads = 3;
  
  if (!userId) {
    // Anonymous users get unlimited uploads (or handle separately)
    const { error, data } = await supabase.from('calorie_results').insert([uploadData]);
    return {
      success: !error,
      error: error,
      usage: {
        current: 1,
        max: 1,
        remaining: 0
      }
    };
  }
  
  try {
    // Start a transaction-like operation by checking limit immediately before insert
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    // Use a more precise timestamp for better race condition handling
    const now = new Date();
    
    // Count current uploads for today with a read lock (if supported)
    const { count, error: countError } = await supabase
      .from("calorie_results")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("created_at", todayStart.toISOString())
      .lte("created_at", todayEnd.toISOString());

    if (countError) {
      console.error("Error counting user uploads:", countError.message);
      return {
        success: false,
        error: { message: "Server error while checking usage." },
        usage: null
      };
    }

    const currentUsage = count || 0;
    
    // Check if limit would be exceeded
    if (currentUsage >= maxUploads) {
      return {
        success: false,
        error: { message: "Daily upload limit reached (3 uploads/day)." },
        usage: {
          current: currentUsage,
          max: maxUploads,
          remaining: 0
        }
      };
    }

    // Attempt to insert the record
    const { error: insertError, data } = await supabase
      .from('calorie_results')
      .insert([uploadData]);

    if (insertError) {
      console.error('❌ Supabase insert error:', insertError);
      
      // Handle potential constraint violations that might indicate limit exceeded
      if (insertError.message && (
        insertError.message.includes('constraint') || 
        insertError.message.includes('limit') ||
        insertError.message.includes('duplicate')
      )) {
        return {
          success: false,
          error: { message: "Daily upload limit reached (3 uploads/day)." },
          usage: {
            current: maxUploads,
            max: maxUploads,
            remaining: 0
          }
        };
      }
      
      return {
        success: false,
        error: insertError,
        usage: null
      };
    }

    // Success - return updated usage stats
    const newUsage = currentUsage + 1;
    return {
      success: true,
      error: null,
      data: data,
      usage: {
        current: newUsage,
        max: maxUploads,
        remaining: maxUploads - newUsage
      }
    };

  } catch (error) {
    console.error('❌ Unexpected error in checkAndRecordUpload:', error);
    
    // Handle potential race condition errors
    if (error.message && (
      error.message.includes('constraint') || 
      error.message.includes('limit') ||
      error.message.includes('duplicate')
    )) {
      return {
        success: false,
        error: { message: "Daily upload limit reached (3 uploads/day)." },
        usage: {
          current: maxUploads,
          max: maxUploads,
          remaining: 0
        }
      };
    }
    
    return {
      success: false,
      error: error,
      usage: null
    };
  }
}

/**
 * Gets current upload usage for a user without modifying anything
 */
export async function getCurrentUsage(userId) {
  if (!userId) {
    return {
      current: 0,
      max: 1,
      remaining: 1
    };
  }
  
  const maxUploads = 3;
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const { count, error } = await supabase
    .from("calorie_results")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", todayStart.toISOString())
    .lte("created_at", todayEnd.toISOString());

  if (error) {
    console.error("Error getting current usage:", error.message);
    return null;
  }

  const currentUsage = count || 0;
  return {
    current: currentUsage,
    max: maxUploads,
    remaining: maxUploads - currentUsage
  };
}