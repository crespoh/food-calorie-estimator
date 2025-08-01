import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function checkAndRecordUpload(userId, insertData) {
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    if (userId) {
      // Authenticated user - check 3 uploads per day
      const { count, error: countError } = await supabase
        .from("calorie_results")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .gte("created_at", todayStart.toISOString())
        .lte("created_at", todayEnd.toISOString());

      if (countError) {
        console.error("Error counting user uploads:", countError.message);
        return { success: false, error: { message: "Server error while checking usage." } };
      }

      const currentUsage = count || 0;
      const maxUploads = 3;

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

      // Insert the record and return the inserted data
      const { data, error } = await supabase.from('calorie_results').insert([insertData]).select();
      
      if (error) {
        console.error('Supabase insert error:', error);
        return { success: false, error: { message: "Failed to save analysis result." } };
      }

      console.log('✅ Inserted calorie result:', data);

      return {
        success: true,
        data,
        usage: {
          current: currentUsage + 1,
          max: maxUploads,
          remaining: maxUploads - (currentUsage + 1)
        }
      };
    } else {
      // Anonymous user - check 1 upload per day by IP
      const { count, error: countError } = await supabase
        .from("calorie_results")
        .select("*", { count: "exact", head: true })
        .is("user_id", null)
        .eq("ip_address", insertData.ip_address)
        .gte("created_at", todayStart.toISOString())
        .lte("created_at", todayEnd.toISOString());

      if (countError) {
        console.error("Error counting anonymous uploads:", countError.message);
        return { success: false, error: { message: "Server error while checking usage." } };
      }

      const currentUsage = count || 0;
      const maxUploads = 1;

      if (currentUsage >= maxUploads) {
        return {
          success: false,
          error: { message: "Anonymous users are limited to 1 upload per day. Please sign in to unlock more." },
          usage: {
            current: currentUsage,
            max: maxUploads,
            remaining: 0
          }
        };
      }

      // Insert the record and return the inserted data
      const { data, error } = await supabase.from('calorie_results').insert([insertData]).select();
      
      if (error) {
        console.error('Supabase insert error:', error);
        return { success: false, error: { message: "Failed to save analysis result." } };
      }

      console.log('✅ Inserted anonymous calorie result:', data);

      return {
        success: true,
        data,
        usage: {
          current: 1,
          max: 1,
          remaining: 0
        }
      };
    }
  } catch (error) {
    console.error('Upload limiter error:', error);
    return { success: false, error: { message: "Server error while processing upload." } };
  }
}

export async function getCurrentUsage(userId) {
  try {
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
      console.error("Error getting current usage:", error);
      return null;
    }

    return {
      current: count || 0,
      max: 3,
      remaining: 3 - (count || 0)
    };
  } catch (error) {
    console.error('Get current usage error:', error);
    return null;
  }
}