-- Add public visibility field to calorie_results table
ALTER TABLE calorie_results 
ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT FALSE;

-- Add index for public results for better query performance
CREATE INDEX IF NOT EXISTS idx_calorie_results_public ON calorie_results(is_public) WHERE is_public = TRUE;

-- Add index for public results by creation date (for recent public results)
CREATE INDEX IF NOT EXISTS idx_calorie_results_public_created ON calorie_results(created_at) WHERE is_public = TRUE;

-- Update RLS policies to allow public access to public results
-- Allow anyone to read public results
CREATE POLICY "Public results are viewable by everyone" ON calorie_results
  FOR SELECT USING (is_public = TRUE);

-- Allow authenticated users to update their own results' public status
CREATE POLICY "Users can update their own results' public status" ON calorie_results
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Add comments for documentation
COMMENT ON COLUMN calorie_results.is_public IS 'Whether this result can be viewed publicly without authentication'; 