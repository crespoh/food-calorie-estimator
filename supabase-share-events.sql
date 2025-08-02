-- Create share_events table for tracking social sharing metrics
CREATE TABLE IF NOT EXISTS share_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  platform VARCHAR(50) NOT NULL, -- 'twitter', 'reddit', 'threads', 'native', 'copy_link'
  result_id UUID REFERENCES calorie_results(id) ON DELETE SET NULL,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_share_events_user_id ON share_events(user_id);
CREATE INDEX IF NOT EXISTS idx_share_events_platform ON share_events(platform);
CREATE INDEX IF NOT EXISTS idx_share_events_result_id ON share_events(result_id);
CREATE INDEX IF NOT EXISTS idx_share_events_created_at ON share_events(created_at);

-- Enable Row Level Security (RLS)
ALTER TABLE share_events ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Allow users to insert their own share events
CREATE POLICY "Users can insert their own share events" ON share_events
  FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Allow users to view their own share events
CREATE POLICY "Users can view their own share events" ON share_events
  FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);

-- Allow service role to insert share events (for anonymous users)
CREATE POLICY "Service role can insert share events" ON share_events
  FOR INSERT WITH CHECK (true);

-- Allow service role to view all share events (for analytics)
CREATE POLICY "Service role can view all share events" ON share_events
  FOR SELECT USING (true);

-- Add comments for documentation
COMMENT ON TABLE share_events IS 'Tracks social sharing events for analytics and user engagement metrics';
COMMENT ON COLUMN share_events.platform IS 'The platform where the content was shared (twitter, reddit, threads, native, copy_link)';
COMMENT ON COLUMN share_events.result_id IS 'Reference to the calorie result that was shared (optional)';
COMMENT ON COLUMN share_events.user_agent IS 'User agent string for device/browser analytics'; 