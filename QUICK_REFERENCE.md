# Quick Reference - CaloriTrack

## 🚀 Quick Start Commands

```bash
# Start server
cd server && npm start

# Test image generation (v1)
node test-image-design.js

# Test image generation (v2)
node test-share-card-v2.js

# View preview images
open preview-new-design.png
open preview-share-card-v2-*.png
```

## 🔧 Key Files

- **Share Button**: `client/src/components/ShareButton.tsx`
- **Image Generator (v1)**: `server/utils/shareImageGenerator.js`
- **Image Generator (v2)**: `server/utils/shareImageGeneratorV2.js` (NEW)
- **Server**: `server/server.js`
- **Test Script (v1)**: `server/test-image-design.js`
- **Test Script (v2)**: `server/test-share-card-v2.js` (NEW)

## 🌐 Important URLs

- **Frontend**: https://calorie.codedcheese.com
- **Backend**: https://caloritrack-production.up.railway.app
- **OG Endpoint (v1)**: `https://caloritrack-production.up.railway.app/og/[result-id]`
- **OG Endpoint (v2)**: `https://caloritrack-production.up.railway.app/og/food/[result-id].png?variant=photo|light|dark`

## 🐛 Common Issues & Solutions

1. **Mobile sharing not working** → Check `openSocialApp()` function
2. **Anonymous user errors** → Verify `if (!user)` checks
3. **No image preview** → Test OG endpoint with curl
4. **Text wrapping** → Check `whitespace-nowrap` classes
5. **V2 endpoint not working** → Check variant parameter (photo/light/dark)

## 📱 Testing Social Sharing

1. **Twitter**: Use Tweet Composer to test OG preview
2. **Facebook**: Use Facebook Debugger
3. **Mobile**: Test on actual mobile device
4. **V2 Variants**: Test all three variants (photo, light, dark)

## 🎨 Design Notes

### V1 Design (Legacy)
- Image size: 1200x630px
- Background: Blue-purple gradient
- Content: White rounded card
- QR Code: Bottom-right with "Scan to view" label

### V2 Design (NEW - Minimalist)
- Image size: 1200x630px
- Safe areas: 48px margins
- Variants: photo, light, dark themes
- Typography: Inter font family
- Macros: Color-coded P/C/F pills
- Confidence: Optional accuracy chip
- Brand: Clean domain footer
- Background: Gradients or photo overlay
- Accent: Blue keyline at top

## 🔄 Migration Notes

- **V1**: Uses `/api/generate-share-image` POST endpoint
- **V2**: Uses `/og/food/:id.png` GET endpoint with variants
- **Client**: Updated to use v2 endpoint automatically
- **Backward Compatibility**: V1 still available for legacy support
