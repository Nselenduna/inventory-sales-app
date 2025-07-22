# ⚡ QUICK DEPLOY CHECKLIST

Deploy your Inventory & Sales App in **15 minutes**:

## ✅ Step 1: Supabase Setup (5 mins)
1. Go to https://app.supabase.com → **New Project**
2. **SQL Editor** → Copy/paste `supabase-setup.sql` → **Run**
3. **Settings** → **API** → Copy URL & API Key

## ✅ Step 2: Deploy to Vercel (5 mins)
1. Go to https://vercel.com → **New Project**
2. Import your GitHub repo `Nselenduna/inventory-sales-app`
3. **Deploy** (it will build automatically)

## ✅ Step 3: Add Environment Variables (2 mins)
In Vercel dashboard:
- **Settings** → **Environment Variables**
- Add: `NEXT_PUBLIC_SUPABASE_URL=your_url`
- Add: `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=your_key`
- **Redeploy**

## ✅ Step 4: Test & Share (3 mins)
- Visit your live URL: `https://inventory-sales-app-yourusername.vercel.app`
- Create account → Test features
- **Share with friends!**

## 🎯 Your App Features:
- 📱 **Mobile PWA** (installable)
- 📷 **Barcode Scanner**
- 📦 **Inventory Management**
- 💰 **Sales Tracking**
- 📊 **Analytics Dashboard**
- 🌙 **Dark Mode**
- 📡 **Offline Support**

## 🔗 Live Examples:
- Demo: `https://inventory-sales-demo.vercel.app`
- Your app: `https://inventory-sales-app-yourusername.vercel.app`

## ⚠️ Important Notes:
- **Camera/Scanner** only works on HTTPS (production)
- **Each user** gets their own isolated data
- **Works offline** after first visit
- **Install as app** on mobile for best experience

---
**Total Time**: ~15 minutes for complete deployment! 🚀 