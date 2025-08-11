# Lead Generation System - Deployment Guide

## Prerequisites
1. Supabase account with project created
2. Vercel account
3. GitHub account

## Step 1: Supabase Setup
1. Go to your Supabase project SQL Editor
2. Run the SQL from `supabase/backend_schema.sql`
3. Copy the returned `default_client_id` UUID
4. Get your Supabase credentials:
   - Project URL: Found in Settings → API
   - Service Role Key: Found in Settings → API (use the service_role secret key)

## Step 2: Local Testing (Optional)
1. Edit `backend/.env` with your credentials:
   ```
   SUPABASE_URL=your-project-url
   SUPABASE_SERVICE_KEY=your-service-key
   DEFAULT_CLIENT_ID=your-client-uuid
   ```
2. Test locally:
   ```bash
   cd backend
   npm run dev
   # In another terminal:
   curl http://localhost:3000/healthz
   ```

## Step 3: GitHub Setup
1. Create a new repository on GitHub
2. Push this code:
   ```bash
   git add .
   git commit -m "Initial commit - Lead Generation System"
   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
   git push -u origin main
   ```

## Step 4: Vercel Deployment
1. Go to [Vercel](https://vercel.com)
2. Click "Add New Project"
3. Import your GitHub repository
4. Configure build settings:
   - Framework Preset: Other
   - Build Command: `cd backend && npm install && npm run build`
   - Output Directory: `backend/dist`
   - Install Command: `cd backend && npm install`

5. Add Environment Variables (Settings → Environment Variables):
   - `SUPABASE_URL` - Your Supabase project URL
   - `SUPABASE_SERVICE_KEY` - Your Supabase service role key
   - `DEFAULT_CLIENT_ID` - The UUID from step 1
   - `API_TOKEN` (optional) - Bearer token for API auth
   - `ANTHROPIC_API_KEY` (optional) - For Claude API
   - `OPENAI_API_KEY` (optional) - For OpenAI API

6. Click "Deploy"

## Step 5: Verify Deployment
Once deployed, test your API:
```bash
# Replace with your Vercel URL
curl https://your-project.vercel.app/healthz

# Test the API (replace CID with your DEFAULT_CLIENT_ID)
curl -X POST https://your-project.vercel.app/api/run \
  -H "x-client-id: YOUR_CLIENT_ID" \
  -H "content-type: application/json" \
  -d '{"prompt":"Hello MVP"}'
```

## API Endpoints
- `GET /healthz` - Health check
- `POST /api/run` - Create and run a job
- `GET /api/jobs` - List all jobs for a client
- `GET /api/jobs/:id` - Get specific job details

## Notes
- The backend uses mock responses by default unless you add real API keys
- Add `API_TOKEN` env var to require Bearer token authentication
- The frontend integration will come in the next phase