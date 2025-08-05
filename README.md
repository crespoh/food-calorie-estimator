# CaloriTrack 🍎

A lightweight, cost-efficient web application that uses OpenAI's Vision API to estimate calories from food photos. No authentication required - just upload and analyze!

## ✨ Features

- **📱 Drag & Drop Upload**: Easy image upload with preview
- **🤖 AI-Powered Analysis**: Uses OpenAI GPT-4o Vision for accurate food identification
- **📊 Instant Results**: Get calorie estimates and food item identification
- **💰 Cost-Efficient**: Optimized for minimal API usage (~$0.006 per request)
- **📱 Responsive Design**: Works perfectly on desktop and mobile
- **⚡ No Database**: Simple, stateless architecture

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ installed
- OpenAI API key ([Get one here](https://platform.openai.com/api-keys))

### Installation

1. **Clone and install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` and add your OpenAI API key:
   ```
   OPENAI_API_KEY=your-openai-api-key-here
   ```

3. **Build the frontend:**
   ```bash
   npm run build
   ```

4. **Start the server:**
   ```bash
   npm run build:server
   ```

5. **Open your browser:**
   Visit `http://localhost:3000`

## 🛠️ Development

### Frontend Development
```bash
npm run dev
```

### Backend Development
```bash
npm run dev:server
```

### Full Development (Frontend + Backend)
```bash
npm run dev:full
```

## 📁 Project Structure

```
/
├── server.js              # Express server with OpenAI integration
├── package.json           # Dependencies and scripts
├── .env                   # Environment variables (create from .env.example)
├── public/                # Built frontend assets (generated)
├── src/                   # React source code
│   ├── App.tsx           # Main React component
│   ├── main.tsx          # React entry point
│   └── index.css         # Tailwind CSS
└── README.md             # This file
```

## 🔌 API Endpoints

### `POST /api/analyze`
Analyze food image and return calorie estimate.

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
    "explanation": "Based on the image, I can see a pizza slice and side salad..."
  }
}
```

### `GET /api/health`
Health check endpoint.

## 💰 Cost Analysis

| Component | Cost per Request | Notes |
|-----------|------------------|-------|
| OpenAI Vision API | ~$0.004 | Input tokens (~800) |
| OpenAI Response | ~$0.002 | Output tokens (~150) |
| **Total** | **~$0.006** | Per image analysis |

- Images are processed at low detail to minimize costs
- File size limited to 5MB
- Responses capped at 300 tokens

## 🚀 Deployment

### Railway
1. Connect your GitHub repository
2. Add environment variable: `OPENAI_API_KEY`
3. Deploy automatically

### Render
1. Create new Web Service
2. Connect repository
3. Add environment variables
4. Deploy

### Vercel/Netlify
Note: These platforms don't support the full-stack setup. Use Railway or Render for the backend.

## 🔧 Configuration

### Environment Variables
- `OPENAI_API_KEY`: Your OpenAI API key (required)
- `PORT`: Server port (default: 3000)

### Customization
- **Image size limits**: Modify `multer` config in `server.js`
- **OpenAI model**: Change model from `gpt-4o` to `gpt-4o-mini` for lower costs
- **Response length**: Adjust `max_tokens` in OpenAI call

## 🛡️ Security

- File type validation (only images allowed)
- File size limits (5MB max)
- Error handling for API failures
- Input sanitization

## 📈 Performance

- **Image processing**: ~2-4 seconds per request
- **Memory usage**: Minimal (images processed in memory)
- **Scalability**: Stateless design, scales horizontally

## 🐛 Troubleshooting

### Common Issues

1. **"OpenAI API key not configured"**
   - Check your `.env` file
   - Ensure the key starts with `sk-`

2. **"File too large"**
   - Images must be under 5MB
   - Try compressing the image

3. **"Invalid image format"**
   - Only JPEG, PNG, and WebP are supported

4. **Frontend not loading**
   - Run `npm run build` first
   - Check that `public/` folder exists

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