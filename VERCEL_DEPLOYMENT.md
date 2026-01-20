# Deploying to Vercel with Gemini API

## Step 1: Set Up Vercel Account
1. Go to [vercel.com](https://vercel.com)
2. Sign up or log in with GitHub
3. Click "New Project"
4. Select your GitHub repo: `Stranger_Audio_Drums_2.0`

## Step 2: Configure Environment Variables
In Vercel's project settings, add these environment variables:

### Required Variables:
- **GEMINI_API_KEY**: `AIzaSyBXepTgELGwaKYOF5bPpZKyUAapHDwmEG0`
- **DATABASE_URL**: Your PostgreSQL connection string (see below)
- **NODE_ENV**: `production`

### Get Your Database URL:
You'll need a PostgreSQL database. Options:
1. **Neon** (Recommended - Free tier available)
   - Go to [neon.tech](https://neon.tech)
   - Create a project
   - Copy the connection string
   - Add it as DATABASE_URL in Vercel

2. **AWS RDS**
   - Create a PostgreSQL instance
   - Copy the connection string

3. **Railway.app** (Quick setup)
   - Go to [railway.app](https://railway.app)
   - Create a PostgreSQL service
   - Copy the DATABASE_URL

## Step 3: Deploy
1. In Vercel dashboard, click "Deploy"
2. Wait for build to complete
3. Your app will be live at: `https://your-project.vercel.app`

## Step 4: Test the API
Once deployed, test the generate endpoint:

```bash
curl -X POST https://your-project.vercel.app/api/patterns/generate \
  -H "Content-Type: application/json" \
  -d '{
    "bpm": 140,
    "style": "Metal",
    "type": "Groove",
    "complexity": 50
  }'
```

## Troubleshooting

### Build Fails
- Make sure NODE_ENV is set to `production`
- Check that all environment variables are set
- View logs in Vercel dashboard

### Database Connection Error
- Verify DATABASE_URL is correct
- Ensure database exists and is accessible
- Run migrations: Vercel will auto-run on first deployment

### Gemini API Not Working
- Verify GEMINI_API_KEY is correct
- Check API quota at [aistudio.google.com](https://aistudio.google.com)
- Make sure key has access to gemini-2.0-flash model

## Re-Deploy After Changes
1. Push changes to GitHub
2. Vercel automatically deploys on push
3. Or manually deploy from Vercel dashboard

