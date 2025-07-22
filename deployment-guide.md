# 🚀 Deployment Guide - Vercel

## Deploy Your Inventory & Sales App

### Option 1: One-Click Deploy (Easiest)

1. **Go to Vercel**: https://vercel.com
2. **Sign up** with your GitHub account
3. **Import Repository**:
   - Click "New Project"
   - Find your `inventory-sales-app` repository
   - Click "Import"

### Option 2: Vercel CLI

```bash
# Install Vercel CLI globally
npm i -g vercel

# Deploy from your project directory
vercel

# Follow the prompts:
# - Link to existing project? No
# - Project name? inventory-sales-app
# - Directory? ./
# - Settings? No (use defaults)
```

## Environment Variables Setup

In Vercel dashboard:

1. Go to your project → **Settings** → **Environment Variables**
2. Add these variables:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=your_supabase_anon_key
```

3. **Redeploy** your app after adding variables

## Your App Will Be Live At:
- `https://inventory-sales-app-username.vercel.app`
- You can also add a custom domain later

## Alternative Deployment Options:

### Netlify
1. Go to https://netlify.com
2. Drag & drop your built project folder
3. Add environment variables in Site Settings

### Railway
1. Go to https://railway.app
2. Connect GitHub repository
3. Add environment variables
4. Deploy automatically

### Render
1. Go to https://render.com
2. Connect GitHub repository
3. Choose "Static Site" or "Web Service"
4. Add environment variables

## Post-Deployment Checklist:

- ✅ App loads without errors
- ✅ User registration works
- ✅ Login/logout functions
- ✅ Can add inventory items
- ✅ Scanner works (on HTTPS only)
- ✅ Offline mode functions
- ✅ Data syncs between devices

## Sharing Your App:

Once deployed, share the URL with friends:
- They can install it as a PWA on their phones
- Works offline after first visit
- Supports barcode scanning on mobile devices
- Each user gets their own account and data 