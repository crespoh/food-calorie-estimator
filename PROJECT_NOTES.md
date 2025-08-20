# CaloriTrack Project Notes

## Recent Fixes & Improvements (August 14, 2025)

### 🔧 Bug Fixes Completed

#### 1. Mobile Twitter Sharing Issue
- **Problem**: Mobile browsers couldn't open Twitter properly
- **Solution**: Implemented mobile-specific sharing with app URLs and fallbacks
- **Files Modified**: `client/src/components/ShareButton.tsx`
- **Key Changes**: Added `openSocialApp()` utility function

#### 2. Anonymous User Authentication Error
- **Problem**: Anonymous users got 401 errors when trying to share
- **Solution**: Added authentication checks and disabled sharing for anonymous users
- **Files Modified**: `client/src/components/ShareButton.tsx`
- **Key Changes**: Added `if (!user)` checks in share handlers

#### 3. Desktop UX - Share Button Text Wrapping
- **Problem**: Share button dropdown text was wrapping on desktop
- **Solution**: Redesigned with fixed width and better typography
- **Files Modified**: `client/src/components/ShareButton.tsx`
- **Key Changes**: Added `whitespace-nowrap`, `truncate`, better spacing

#### 4. Link Display Issue - Railway vs Custom Domain
- **Problem**: Links showed Railway URL instead of custom domain
- **Solution**: Used custom domain for user-facing links, Railway for OG endpoints
- **Files Modified**: `client/src/components/ShareButton.tsx`, `client/src/pages/PublicResult.tsx`
- **Key Changes**: Added `customDomain` and `ogBaseUrl` variables

#### 5. Twitter Card Image Preview Missing
- **Problem**: No image preview in posted tweets
- **Solution**: Enhanced OG meta tags and fixed image generation
- **Files Modified**: `server/server.js`, `server/utils/shareImageGenerator.js`
- **Key Changes**: Added missing meta tags, improved image generation

### 🎨 Design Improvements

#### Social Share Image Redesign (v1)
- **Problem**: Original design was basic and unprofessional
- **Solution**: Complete redesign with modern styling
- **Files Modified**: `server/utils/shareImageGenerator.js`
- **Key Features**:
  - Modern blue-purple gradient background
  - Clean white content area with rounded corners
  - Better typography with Inter font
  - Color-coded nutrition facts
  - Styled QR code with background
  - Fixed spacing and positioning issues

#### Share Card v2 Implementation (NEW)
- **Problem**: Previous design was too complex and not minimalist enough
- **Solution**: Implemented new minimalist design based on SHARE_CARD_V2_README.md specifications
- **Files Modified**: 
  - `server/utils/shareImageGeneratorV2.js` (NEW)
  - `server/server.js`
  - `client/src/components/ShareButton.tsx`
- **Key Features**:
  - **Minimalist Design**: Clean, modern aesthetic with proper typography
  - **Three Variants**: photo, light, dark themes
  - **Proper Safe Areas**: 48px margins for all content
  - **Color-coded Macros**: P/C/F pills with consistent styling
  - **Confidence Chip**: Optional accuracy indicator
  - **Brand Footer**: Clean domain display
  - **SVG-based**: Uses exact SVG templates from specification
  - **New Endpoint**: `/og/food/:id.png?variant=photo|light|dark`
- **Technical Improvements**:
  - Better caching with proper headers
  - Fallback handling for missing images
  - Optimized for social media platforms
  - Reduced file size and improved performance

### 📁 Key Files Modified

1. **`client/src/components/ShareButton.tsx`**
   - Mobile sharing functionality
   - Anonymous user handling
   - Desktop UX improvements
   - Link generation fixes
   - **NEW**: Updated to use v2 endpoint

2. **`server/server.js`**
   - Enhanced OG meta tags
   - Better error handling
   - **NEW**: Added `/og/food/:id.png` endpoint

3. **`server/utils/shareImageGenerator.js`**
   - Complete redesign (v1)
   - Modern styling and layout
   - Better spacing and typography

4. **`server/utils/shareImageGeneratorV2.js`** (NEW)
   - Implemented exact SVG templates from specification
   - Three variant support (photo, light, dark)
   - Proper safe areas and typography
   - Color-coded macro pills
   - Confidence chip support

5. **`client/src/pages/PublicResult.tsx`**
   - Fixed link generation

6. **`server/test-share-card-v2.js`** (NEW)
   - Test script for v2 design previews

### 🔍 Testing Commands

```bash
# Test OG endpoint
curl "https://caloritrack-production.up.railway.app/og/[result-id]"

# Test new v2 endpoint
curl "https://caloritrack-production.up.railway.app/og/food/[result-id].png?variant=photo"
curl "https://caloritrack-production.up.railway.app/og/food/[result-id].png?variant=light"
curl "https://caloritrack-production.up.railway.app/og/food/[result-id].png?variant=dark"

# Test image generation
node test-image-design.js

# Test v2 image generation
node test-share-card-v2.js

# Check image accessibility
curl -I "https://jxodqklpnjsjcrpvhwym.supabase.co/storage/v1/object/public/public-assets/share-images/[filename]"
```

### 🚀 Current Status

- ✅ Mobile sharing working
- ✅ Anonymous user handling complete
- ✅ Desktop UX improved
- ✅ Link generation fixed
- ✅ Twitter card preview working
- ✅ Social share image redesigned (v1)
- ✅ **NEW**: Share Card v2 implemented with minimalist design
- ✅ **NEW**: Three variant support (photo, light, dark)
- ✅ **NEW**: Proper SVG-based implementation
- ✅ **NEW**: Optimized endpoint structure

### 📝 Next Steps

1. Test the new v2 design with real results
2. Monitor social media sharing performance
3. Consider adding more platform-specific optimizations
4. **NEW**: Deploy and test v2 endpoint in production
5. **NEW**: Update documentation for v2 features

### 🛠️ Environment Variables

Make sure these are set in your `.env` file:
```env
FRONTEND_URL=https://calorie.codedcheese.com
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 📊 Architecture Notes

- **Frontend**: Deployed on custom domain (calorie.codedcheese.com)
- **Backend**: Deployed on Railway (caloritrack-production.up.railway.app)
- **OG Endpoints**: Use Railway URL for social media crawlers
- **User Links**: Use custom domain for user-facing links
- **Image Storage**: Supabase storage for generated images
- **NEW**: Share Card v2 uses `/og/food/:id.png` endpoint with variants
- **NEW**: SVG-based generation for better quality and smaller file sizes
