-- Social Media Image Enhancement Database Schema Updates
-- Run these SQL commands in your Supabase SQL editor

-- 1. Add social image fields to calorie_results table
ALTER TABLE calorie_results 
ADD COLUMN social_image_url TEXT,
ADD COLUMN social_image_generated_at TIMESTAMPTZ;

-- Index for performance
CREATE INDEX idx_calorie_results_social_image ON calorie_results(social_image_url) WHERE social_image_url IS NOT NULL;

-- 2. Create share images tracking table
CREATE TABLE share_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  result_id UUID REFERENCES calorie_results(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  platform TEXT NOT NULL, -- twitter, instagram, facebook, etc.
  image_url TEXT NOT NULL,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}' -- store design choices, template used, etc.
);

-- Indexes for performance
CREATE INDEX idx_share_images_result_id ON share_images(result_id);
CREATE INDEX idx_share_images_user_id ON share_images(user_id);
CREATE INDEX idx_share_images_platform ON share_images(platform);

-- 3. Create storage bucket for public assets (if not exists)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('public-assets', 'public-assets', true)
ON CONFLICT (id) DO NOTHING;

-- 4. Set up RLS policies for public assets bucket
CREATE POLICY "Public assets are viewable by everyone" ON storage.objects
FOR SELECT USING (bucket_id = 'public-assets');

CREATE POLICY "Authenticated users can upload public assets" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'public-assets' AND auth.role() = 'authenticated');

-- 5. Add RLS policies for share_images table
ALTER TABLE share_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own share images" ON share_images
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own share images" ON share_images
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 6. Add RLS policies for calorie_results social image updates
CREATE POLICY "Users can update their own results' social image" ON calorie_results
FOR UPDATE USING (auth.uid() = user_id);

-- Note: Make sure the existing RLS policies for calorie_results allow these operations
