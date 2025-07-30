# Deployment Setup Guide - Fixing Magic Link 404 Error

## The Problem
You're getting a 404 error when clicking magic links because of misconfigured redirect URLs and missing environment variables for separate deployments.

## Solution Steps

### 1. Configure Supabase Authentication URLs

In your Supabase dashboard:

1. Go to **Authentication > Settings**
2. Update **Site URL** to your Vercel frontend URL:
   ```
   https://your-app-name.vercel.app
   ```
3. Add **Redirect URLs** (add both):
   ```
   https://your-app-name.vercel.app/auth/callback
   http://localhost:5173/auth/callback
   ```

### 2. Configure Vercel Environment Variables

In your Vercel project settings, add these environment variables:

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
VITE_API_URL=https://your-railway-backend.railway.app
```

### 3. Configure Railway Environment Variables

In your Railway project settings, add these environment variables:

```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
OPENAI_API_KEY=your_openai_key_here
PORT=3000
FRONTEND_URL=https://your-app-name.vercel.app
```

### 4. Update Your Local Development

For local development, use `.env.local`:

```bash
# Client/.env.local
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
VITE_API_URL=http://localhost:3000
```

```bash
# Server/.env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
OPENAI_API_KEY=your_openai_key_here
PORT=3000
FRONTEND_URL=http://localhost:5173
```

### 5. Deploy Changes

1. **Frontend (Vercel)**: Push your changes to trigger a new deployment
2. **Backend (Railway)**: Push your changes to trigger a new deployment

### 6. Test Magic Link Flow

1. Go to your Vercel frontend URL
2. Try signing in with Google or magic link
3. The auth callback should now work properly

## Key Files Changed

- `client/.env.production` - Production environment variables
- `client/.env.local` - Local development variables
- `client/vercel.json` - SPA routing configuration
- `server/.env` - Server environment variables
- `server/server.js` - Updated CORS configuration

## Common Issues

1. **Still getting 404**: Check that the redirect URL in Supabase exactly matches your deployed URL
2. **CORS errors**: Ensure `FRONTEND_URL` in Railway matches your Vercel deployment URL
3. **Magic link not working**: Verify the Site URL in Supabase matches your Vercel frontend URL

## Testing Locally

1. Start backend: `cd server && npm start`
2. Start frontend: `cd client && npm run dev`
3. Visit `http://localhost:5173`