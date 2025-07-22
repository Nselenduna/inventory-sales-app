# 🔗 Connect Your Existing Supabase Project

Since you already have a Supabase project called `inventory-sales-app`, let's connect it properly:

## ✅ Step 1: Set Up Database Schema (3 minutes)

1. **Open Supabase Dashboard**:
   - Click "Open in Supabase" from your Vercel dashboard
   - OR go to https://app.supabase.com and select your `inventory-sales-app` project

2. **Set Up Database Tables**:
   - Go to **SQL Editor** (left sidebar)
   - Create a **New Query**
   - Copy and paste the entire contents of `supabase-setup.sql` from your GitHub repo
   - Click **Run** to execute the SQL

3. **Verify Tables Created**:
   - Go to **Table Editor** (left sidebar)
   - You should see these tables:
     - `profiles` (user accounts and roles)
     - `items` (inventory items)
     - `sales` (sales records)
     - `sale_items` (items in each sale)
     - `stock_movements` (inventory audit trail)
     - `shop_settings` (shop configuration)

## ✅ Step 2: Get Your Credentials (1 minute)

1. In your Supabase dashboard:
   - Go to **Settings** → **API**
   - Copy these values:
     - **Project URL** (e.g., `https://xxxxxxxxxxx.supabase.co`)
     - **Project API Key** (anon public key)

## ✅ Step 3: Add Environment Variables in Vercel (2 minutes)

1. **In your Vercel dashboard**:
   - Go to your `inventory-sales-app` project
   - Click **Settings** → **Environment Variables**

2. **Add these variables**:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

3. **Redeploy**:
   - Go to **Deployments** tab
   - Click **"Redeploy"** on the latest deployment
   - OR make a small change to your code and push to GitHub

## ✅ Step 4: Test Connection (2 minutes)

1. **Visit your live app URL**
2. **Try to create an account**:
   - Should work without errors
   - Check Supabase **Authentication** tab to see new user
3. **Test app features**:
   - Add inventory items
   - Create sales
   - Check data appears in Supabase **Table Editor**

## 🔧 Troubleshooting

### If signup/login doesn't work:
- Check environment variables are correct
- Verify Supabase SQL schema was applied
- Check browser console for errors

### If you get RLS (Row Level Security) errors:
- Make sure you ran the complete `supabase-setup.sql`
- The SQL includes all necessary security policies

### If tables don't exist:
- Go to Supabase SQL Editor
- Run the `supabase-setup.sql` script again
- Verify execution completed without errors

## 🎯 What the SQL Script Does:

- ✅ Creates all necessary tables for your app
- ✅ Sets up Row Level Security (RLS) policies
- ✅ Creates indexes for better performance
- ✅ Adds automatic user profile creation
- ✅ Inserts sample data for testing

## 🚀 After Connection:

Your app will have:
- ✅ **User authentication** working
- ✅ **Data persistence** in cloud
- ✅ **Multi-device sync** capability
- ✅ **Secure data isolation** per user
- ✅ **Real-time capabilities** (future feature)

## ⚡ Quick Connect Summary:

1. Supabase SQL Editor → Run `supabase-setup.sql`
2. Supabase Settings → Copy URL & API Key
3. Vercel Settings → Add environment variables
4. Redeploy → Test signup/login

**Total time: ~8 minutes** ⏱️ 