# Food Calorie Estimator 🍎

A full-stack web application that uses OpenAI's Vision API to estimate calories from food photos with user authentication and history tracking.

## ✨ Features

- **📱 Drag & Drop Upload**: Easy image upload with preview
- **🤖 AI-Powered Analysis**: Uses OpenAI GPT-4o Vision for accurate food identification
- **📊 Instant Results**: Get calorie estimates and detailed nutrition facts
- **👤 User Authentication**: Secure login with Supabase Auth
- **📈 History Tracking**: View your past calorie analysis results
- **💰 Cost-Efficient**: Optimized for minimal API usage (~$0.006 per request)
- **📱 Responsive Design**: Works perfectly on desktop and mobile
- **🔄 Real-time Sync**: Data synced across devices

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ installed
- OpenAI API key ([Get one here](https://platform.openai.com/api-keys))
- Supabase project ([Create one here](https://supabase.com))

### Installation

1. **Clone and install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   ```bash
   cp server/.env.example server/.env
   ```
   Edit `server/.env` and add your credentials:
   ```
   OPENAI_API_KEY=your-openai-api-key-here
   SUPABASE_URL=your-supabase-project-url
   SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
   ```

3. **Build and start the application:**
   ```bash
   npm run build
   npm start
   ```

4. **Open your browser:**
   Visit `http://localhost:3000`

## 🛠️ Development

### Frontend Development
```bash
npm run dev:client
```

### Backend Development
```bash
npm run dev:server
```

## 📁 Project Structure

```
/
├── client/                 # React frontend
│   ├── src/
│   │   ├── App.tsx        # Main React component
│   │   ├── components/    # React components
│   │   │   ├── AuthForm.tsx
│   │   │   └── History.tsx
│   │   ├── AuthContext.tsx
│   │   └── supabaseClient.ts
│   ├── dist/              # Built frontend (generated)
│   └── package.json
├── server/                # Express backend
│   ├── server.js          # Main server file
│   ├── public/            # Served frontend files (copied from client/dist)
│   ├── .env.example       # Environment variables template
│   └── package.json
├── package.json           # Root package file with build scripts
└── README.md             # This file
```

## 🔌 API Endpoints

### `POST /api/analyze`
Analyze food image and return calorie estimate.

**Headers:**
- `Authorization: Bearer <supabase-jwt-token>`

**Request:**
- Method: POST
- Content-Type: multipart/form-data
- Body: image file (max 5MB)

**Response:**
```json
{
  "success": true,
  "result": {
    "foodItems": ["Pizza slice", "Salad"],
    "totalCalories": 650,
    "nutritionFacts": {
      "protein_g": 25,
      "fat_g": 30,
      "carbohydrates_g": 70
    },
    "servingSize": "1 plate",
    "confidenceScore": 0.85,
    "explanation": "Based on the image, I can see a pizza slice and side salad..."
  },
  "fallback": false
}
```

### `GET /api/user-history`
Get user's analysis history.

**Headers:**
- `Authorization: Bearer <supabase-jwt-token>`

**Response:**
```json
{
  "success": true,
  "results": [
    {
      "id": "uuid",
      "created_at": "2024-01-01T12:00:00Z",
      "food_items": ["Pizza slice"],
      "total_calories": 350,
      "explanation": "...",
      "nutrition_table": {...}
    }
  ]
}
```

### `GET /api/health`
Health check endpoint.

## 🐛 Recent Bug Fixes

### Fixed Issues:

1. **Frontend Build Error**: 
   - **Issue**: "Frontend not built. Please run 'npm run build' first"
   - **Fix**: Updated build process to copy client/dist to server/public
   - **Solution**: Run `npm run build` to build frontend and copy files

2. **Pattern Matching Error**:
   - **Issue**: "The string did not match the expected pattern" when analyzing food
   - **Fix**: Improved JSON parsing with better error handling and fallback responses
   - **Solution**: Enhanced regex patterns and validation for OpenAI responses

3. **Missing Environment Variables**:
   - **Issue**: Server crashes when OpenAI or Supabase credentials are missing
   - **Fix**: Added conditional initialization with helpful error messages
   - **Solution**: Server now starts gracefully and shows configuration warnings

## 💰 Cost Analysis

| Component | Cost per Request | Notes |
|-----------|------------------|-------|
| OpenAI Vision API | ~$0.004 | Input tokens (~800) |
| OpenAI Response | ~$0.002 | Output tokens (~150) |
| Supabase | Free tier | Up to 50,000 monthly active users |
| **Total** | **~$0.006** | Per image analysis |

## 🔧 Configuration

### Environment Variables (server/.env)
- `OPENAI_API_KEY`: Your OpenAI API key (required for analysis)
- `SUPABASE_URL`: Your Supabase project URL (required for auth/history)
- `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase service role key (required for auth/history)
- `PORT`: Server port (default: 3000)

### Application Modes
The application can run in different modes based on available configuration:

1. **Full Mode**: All environment variables set - full functionality
2. **Demo Mode**: Only OPENAI_API_KEY set - analysis only, no auth/history
3. **Development Mode**: No environment variables - server starts with warnings

## 🛡️ Security

- JWT-based authentication via Supabase
- File type validation (only images allowed)
- File size limits (5MB max)
- Email verification required
- Error handling for API failures
- Input sanitization

## 🚀 Deployment

### Railway
1. Connect your GitHub repository
2. Add environment variables in Railway dashboard
3. Deploy automatically

### Render
1. Create new Web Service
2. Connect repository  
3. Add environment variables
4. Set build command: `npm run build`
5. Set start command: `npm start`

## 🐛 Troubleshooting

### Common Issues

1. **"OpenAI API key not configured"**
   - Add `OPENAI_API_KEY` to `server/.env`
   - Ensure the key starts with `sk-`

2. **"Authentication service not configured"**
   - Add `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` to `server/.env`
   - Check your Supabase project settings

3. **"Frontend not built"**
   - Run `npm run build` to build the frontend
   - Check that `server/public/` folder exists

4. **"The string did not match the expected pattern"**
   - This is now handled gracefully with fallback responses
   - Check server logs for parsing details

5. **Build failures**
   - Ensure all dependencies are installed: `npm install`
   - Check that both client and server packages are installed

## 📄 License

MIT License - feel free to use this project for personal or commercial purposes.

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## 📞 Support

For issues or questions:
- Open an issue on GitHub
- Check the troubleshooting section
- Review OpenAI API documentation

---

**Made with ❤️ for healthy living and nutrition tracking**