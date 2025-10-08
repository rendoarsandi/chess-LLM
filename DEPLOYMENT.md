# Deployment Guide

This guide will help you deploy the Chess AI vs AI application to Vercel with Convex backend.

## Prerequisites

1. **Vercel Account**: Sign up at [vercel.com](https://vercel.com)
2. **Convex Account**: Sign up at [convex.dev](https://convex.dev)
3. **Google AI API Key**: Get one from [Google AI Studio](https://makersuite.google.com/app/apikey)

## Step 1: Deploy Convex Backend

1. Install Convex CLI globally (if not already installed):
```bash
npm install -g convex
```

2. Login to Convex:
```bash
npx convex login
```

3. Deploy Convex functions:
```bash
npx convex deploy
```

4. Note the production Convex URL that is displayed after deployment.

5. Set environment variables in Convex dashboard:
   - Go to [Convex Dashboard](https://dashboard.convex.dev)
   - Select your project
   - Go to Settings → Environment Variables
   - Add: `GOOGLE_AI_API_KEY` with your Google AI API key

## Step 2: Deploy Frontend to Vercel

### Option A: Deploy via Vercel Dashboard

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import your GitHub repository
3. Configure the project:
   - **Framework Preset**: Next.js
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`
   - **Install Command**: `npm install`

4. Add Environment Variables:
   - `NEXT_PUBLIC_CONVEX_URL`: Your production Convex URL (from Step 1)
   - `GOOGLE_AI_API_KEY`: Your Google AI API key

5. Click "Deploy"

### Option B: Deploy via Vercel CLI

1. Install Vercel CLI:
```bash
npm install -g vercel
```

2. Login to Vercel:
```bash
vercel login
```

3. Deploy:
```bash
vercel
```

4. Follow the prompts and add environment variables when asked.

5. For production deployment:
```bash
vercel --prod
```

## Step 3: Configure Environment Variables

Make sure these environment variables are set in Vercel:

### Required Variables

- `NEXT_PUBLIC_CONVEX_URL`: Your Convex deployment URL
  - Example: `https://your-project.convex.cloud`
  - Get this from Convex dashboard or after running `npx convex deploy`

- `GOOGLE_AI_API_KEY`: Your Google Generative AI API key
  - Get from: https://makersuite.google.com/app/apikey
  - Make sure the API key has access to Gemini models

## Step 4: Verify Deployment

1. Visit your deployed URL
2. Try creating a new game
3. Test both game modes:
   - Human vs AI
   - AI vs AI
4. Verify that:
   - Chess board displays correctly
   - Moves can be made
   - AI generates moves with reasoning
   - Opening references are shown
   - Illegal moves are tracked

## Troubleshooting

### Build Fails

**Error**: `NEXT_PUBLIC_CONVEX_URL is not defined`
- **Solution**: Make sure you've added the environment variable in Vercel settings

**Error**: `Module not found: Can't resolve 'convex/react'`
- **Solution**: Make sure all dependencies are installed. Try clearing cache and rebuilding.

### Runtime Errors

**Error**: `Failed to connect to Convex`
- **Solution**: 
  1. Verify `NEXT_PUBLIC_CONVEX_URL` is correct
  2. Make sure Convex deployment is active
  3. Check Convex dashboard for any errors

**Error**: `AI move generation failed`
- **Solution**:
  1. Verify `GOOGLE_AI_API_KEY` is set correctly
  2. Check API key has proper permissions
  3. Verify API quota is not exceeded

**Error**: `Illegal moves not being tracked`
- **Solution**:
  1. Check Convex functions are deployed
  2. Verify database schema is correct
  3. Check browser console for errors

### Performance Issues

**Slow AI responses**
- Consider using Gemini 2.5 Flash or Flash Lite for faster responses
- Check your internet connection
- Verify API quota limits

**Board not responsive**
- Clear browser cache
- Try different browser
- Check console for JavaScript errors

## Updating the Deployment

### Update Frontend

1. Push changes to your GitHub repository
2. Vercel will automatically redeploy (if auto-deploy is enabled)
3. Or manually trigger deployment from Vercel dashboard

### Update Backend

1. Make changes to Convex functions
2. Run:
```bash
npx convex deploy
```

## Environment-Specific Configuration

### Development
```env
NEXT_PUBLIC_CONVEX_URL=https://your-dev-deployment.convex.cloud
GOOGLE_AI_API_KEY=your-dev-api-key
```

### Production
```env
NEXT_PUBLIC_CONVEX_URL=https://your-prod-deployment.convex.cloud
GOOGLE_AI_API_KEY=your-prod-api-key
```

## Security Best Practices

1. **Never commit API keys** to version control
2. **Use environment variables** for all sensitive data
3. **Rotate API keys** regularly
4. **Monitor API usage** to detect unusual activity
5. **Set up rate limiting** if needed

## Monitoring

### Convex Dashboard
- Monitor function calls
- Check error logs
- View database queries
- Track performance metrics

### Vercel Analytics
- Monitor page views
- Track performance
- View error logs
- Check build logs

## Support

If you encounter issues:

1. Check the [README.md](README.md) for general information
2. Review Convex logs in the dashboard
3. Check Vercel deployment logs
4. Open an issue on GitHub

## Additional Resources

- [Next.js Deployment Documentation](https://nextjs.org/docs/deployment)
- [Convex Documentation](https://docs.convex.dev)
- [Vercel Documentation](https://vercel.com/docs)
- [Google AI Documentation](https://ai.google.dev/docs)

