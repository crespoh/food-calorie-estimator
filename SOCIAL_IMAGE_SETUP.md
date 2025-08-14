# Social Media Image Enhancement Setup Guide

## 🎯 Overview
This guide covers the implementation of social media image generation for CaloriTrack, allowing users to share beautiful branded images of their food analysis results.

## ✅ Completed Changes

### Backend Changes
- ✅ Added database schema updates (`supabase-social-image-schema.sql`)
- ✅ Created image generation utility (`server/utils/shareImageGenerator.js`)
- ✅ Added new API endpoints to `server/server.js`:
  - `GET /og/:resultId` - Open Graph meta tags for social sharing
  - `POST /api/generate-share-image` - Generate share images
- ✅ Updated `server/package.json` with new dependencies

### Frontend Changes
- ✅ Created `ShareImagePreview` component
- ✅ Updated `ShareButton` component with image generation
- ✅ Added analytics tracking functions
- ✅ Created placeholder for default share image

## 🔧 Manual Steps Required

### 1. Database Setup
Run the SQL commands in your Supabase SQL editor:
```sql
-- Copy and paste the contents of supabase-social-image-schema.sql
```

### 2. Install Backend Dependencies
```bash
cd server
npm install canvas qrcode
```

### 3. Environment Variables
Add to your backend `.env` file:
```env
FRONTEND_URL=https://calorie.codedcheese.com
```

### 4. Create Assets Directory
```bash
# Create assets directory in server
mkdir -p server/assets/fonts
mkdir -p server/assets

# Create assets directory in client
mkdir -p client/public/assets
```

### 5. Add Brand Assets
You need to add the following files:

#### Server Assets (`server/assets/`)
- `caloritrack-logo-white.png` - White CaloriTrack logo (200x60px recommended)
- `fonts/Inter-Bold.ttf` - Inter Bold font file
- `fonts/Inter-Regular.ttf` - Inter Regular font file

#### Client Assets (`client/public/assets/`)
- `caloritrack-logo.png` - CaloriTrack logo
- `default-share-image.png` - Default share image (1200x630px)

### 6. Deploy Backend
```bash
cd server
npm run build  # if you have a build script
# Deploy to Railway or your hosting platform
```

### 7. Test the Implementation

#### Test Image Generation
1. Analyze a food image
2. Make the result public
3. Click "Share" → "Preview Share Image"
4. Verify the image generates correctly

#### Test Social Sharing
1. Click "Share" → "Share on Twitter"
2. Verify the OG meta tags work
3. Test native sharing on mobile devices

#### Test Download
1. Click "Share" → "Download Share Image"
2. Verify the image downloads correctly

## 🎨 Design Specifications

### Share Image Template
- **Size**: 1200x630px (1.91:1 aspect ratio)
- **Background**: Emerald gradient (#10B981 to #059669)
- **Logo**: White CaloriTrack logo in top-left
- **Food Image**: 300x300px (if available) in top-left
- **Content**: Food items, calories, nutrition facts
- **QR Code**: 120x120px in bottom-right
- **Call to Action**: "Try CaloriTrack yourself!"

### Platform Optimizations
- **Twitter/X**: 1200x675px (16:9)
- **Facebook**: 1200x630px (1.91:1)
- **LinkedIn**: 1200x627px (1.91:1)
- **Instagram**: 1080x1080px (1:1) or 1080x1350px (4:5)

## 🔍 Troubleshooting

### Common Issues

#### 1. Canvas Installation Issues
```bash
# On Ubuntu/Debian
sudo apt-get install build-essential libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev

# On macOS
brew install pkg-config cairo pango libpng jpeg giflib librsvg

# On Windows
# Install Visual Studio Build Tools first
```

#### 2. Font Loading Issues
- Ensure font files are in the correct path
- Check file permissions
- Use fallback fonts if custom fonts fail

#### 3. Image Generation Fails
- Check Supabase storage bucket permissions
- Verify RLS policies are correct
- Check server logs for detailed errors

#### 4. OG Meta Tags Not Working
- Test the `/og/:resultId` endpoint directly
- Verify the result is public
- Check if social image URL is accessible

## 📊 Analytics Events

The following events are now tracked:
- `share_image_generated` - When a share image is created
- `share_image_downloaded` - When a share image is downloaded
- `native_share_with_image` - When native sharing includes an image

## 🚀 Next Steps

### Phase 2 Enhancements
1. **Platform-Specific Templates**: Different designs for each platform
2. **Custom Branding**: User-customizable templates
3. **Batch Generation**: Generate images for multiple platforms at once
4. **Image Caching**: Cache generated images for better performance

### Phase 3 Features
1. **Advanced Templates**: More design options
2. **A/B Testing**: Test different template designs
3. **Analytics Dashboard**: Track share image performance
4. **White Label**: Customizable for different brands

## 📝 Notes

- The image generation uses server-side Canvas for consistent results
- QR codes link to the public result page
- Images are stored in Supabase Storage for fast delivery
- Fallback to default image if generation fails
- Rate limiting prevents abuse of image generation

## 🆘 Support

If you encounter issues:
1. Check the server logs for detailed error messages
2. Verify all dependencies are installed correctly
3. Test the API endpoints directly with curl/Postman
4. Ensure Supabase storage bucket is properly configured
