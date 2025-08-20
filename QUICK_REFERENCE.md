# Quick Reference - CaloriTrack

## 🚀 Quick Start Commands

```bash
# Start server
cd server && npm start

# Test image generation
node test-image-design.js

# View preview image
open preview-new-design.png
```

## 🔧 Key Files

- **Share Button**: `client/src/components/ShareButton.tsx`
- **Image Generator**: `server/utils/shareImageGenerator.js`
- **Server**: `server/server.js`
- **Test Script**: `server/test-image-design.js`

## 🌐 Important URLs

- **Frontend**: https://calorie.codedcheese.com
- **Backend**: https://caloritrack-production.up.railway.app
- **OG Endpoint**: `https://caloritrack-production.up.railway.app/og/[result-id]`

## 🐛 Common Issues & Solutions

1. **Mobile sharing not working** → Check `openSocialApp()` function
2. **Anonymous user errors** → Verify `if (!user)` checks
3. **No image preview** → Test OG endpoint with curl
4. **Text wrapping** → Check `whitespace-nowrap` classes

## 📱 Testing Social Sharing

1. **Twitter**: Use Tweet Composer to test OG preview
2. **Facebook**: Use Facebook Debugger
3. **Mobile**: Test on actual mobile device

## 🎨 Design Notes

- Image size: 1200x630px
- Background: Blue-purple gradient
- Content: White rounded card
- QR Code: Bottom-right with "Scan to view" label
