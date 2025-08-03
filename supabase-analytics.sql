-- Create analytics_events table for tracking public result interactions
CREATE TABLE IF NOT EXISTS analytics_events (
  id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
  event_type TEXT NOT NULL,
  result_id UUID REFERENCES calorie_results(id) ON DELETE SET NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  user_agent TEXT,
  referrer TEXT,
  path TEXT,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_analytics_events_type ON analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_events_result_id ON analytics_events(result_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_timestamp ON analytics_events(timestamp);
CREATE INDEX IF NOT EXISTS idx_analytics_events_path ON analytics_events(path);

-- RLS policies for analytics events
-- Allow inserts from anyone (for public result tracking)
CREATE POLICY "Allow analytics event inserts" ON analytics_events
  FOR INSERT WITH CHECK (true);

-- Allow service role to read all analytics
CREATE POLICY "Service role can read analytics" ON analytics_events
  FOR SELECT USING (auth.role() = 'service_role');

-- Enable RLS
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

-- Add comments for documentation
COMMENT ON TABLE analytics_events IS 'Tracks user interactions with public results and general analytics events';
COMMENT ON COLUMN analytics_events.event_type IS 'Type of event (e.g., public_result_view, public_result_share)';
COMMENT ON COLUMN analytics_events.result_id IS 'Associated calorie result ID if applicable'; 