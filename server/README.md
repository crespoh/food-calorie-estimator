# CaloriTrack Backend

This backend supports dynamic switching between OpenAI and Qwen2.5-VL for image analysis.

## Environment Variables

Create a `.env` file in the server directory with the following variables:

```env
# Server Configuration
PORT=3000

# Supabase Configuration
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# LLM Provider Configuration
# Set to 'openai' or 'qwen' to switch between providers
LLM_PROVIDER=openai

# OpenAI Configuration (required if LLM_PROVIDER=openai)
OPENAI_API_KEY=your_openai_api_key

# OpenRouter Configuration (required if LLM_PROVIDER=qwen)
OPENROUTER_API_KEY=your_openrouter_api_key
```

## LLM Provider Switching

To switch between LLM providers:

1. **For OpenAI (GPT-4o):**
   ```env
   LLM_PROVIDER=openai
   OPENAI_API_KEY=your_openai_api_key
   ```

2. **For Qwen2.5-VL:**
   ```env
   LLM_PROVIDER=qwen
   OPENROUTER_API_KEY=your_openrouter_api_key
   ```

3. **Restart the server** after changing the `LLM_PROVIDER` value.

## Features

- **Dynamic Provider Switching**: Change LLM providers via environment variable
- **Automatic Fallback**: If the primary provider fails, automatically tries the other provider
- **Consistent API**: Both providers return the same JSON structure
- **Error Handling**: Comprehensive error handling for both providers
- **Logging**: Console logs indicate which provider is being used

## API Endpoints

- `POST /api/analyze` - Analyze food images for calorie estimation
- `GET /api/user-history` - Get user's calorie estimation history
- `GET /api/health` - Health check endpoint

## File Structure

```
server/
├── utils/
│   ├── llmDispatcher.js      # Main dispatcher for LLM providers
│   ├── analyzeOpenAI.js      # OpenAI GPT-4o implementation
│   └── analyzeQwen.js        # Qwen2.5-VL implementation
├── server.js                 # Main Express server
└── README.md                 # This file
``` 