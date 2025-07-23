# Inventory & Sales Management App

A modern, offline-capable inventory and sales management application built with Next.js, Supabase, and IndexedDB.

## Features

- **Offline-first design** - Works without internet connection
- **Real-time sync** - Automatically syncs data when online
- **Barcode scanning** - Scan products with your device camera
- **Sales tracking** - Record and track sales transactions
- **Inventory management** - Manage product stock levels
- **User authentication** - Secure login with Supabase Auth
- **PWA support** - Install as a mobile app

## Tech Stack

- **Frontend**: Next.js 15, React, TypeScript
- **Database**: Supabase (PostgreSQL)
- **Local Storage**: IndexedDB (Dexie.js)
- **Authentication**: Supabase Auth
- **Styling**: Tailwind CSS
- **PWA**: next-pwa
- **Barcode Scanning**: html5-qrcode

## Getting Started

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd inventory-sales-app
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env.local` file with your Supabase credentials:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=your_supabase_anon_key
   ```

4. **Set up Supabase database**
   - Create a new Supabase project
   - Run the SQL script from `supabase-setup.sql` in your Supabase SQL Editor

5. **Run the development server**
   ```bash
   npm run dev
   ```

## Deployment

The app is configured for deployment on Vercel with automatic builds from the main branch.

## License

MIT License

---

*Last updated: 2024 - Build fix applied for Supabase configuration handling*
