# Inventory & Sales Manager PWA

A mobile-first Progressive Web App for managing inventory and sales with QR/barcode scanning functionality.

## Features Implemented

- **Authentication & User Roles**
  - Supabase integration for authentication
  - Role-based access (owner and staff accounts)
  - User profile management

- **Offline Data Persistence**
  - IndexedDB (via Dexie.js) for local storage
  - Background sync with Supabase when connection is restored
  - Full offline functionality for critical operations

- **QR/Barcode Scanning**
  - Camera integration for scanning product codes
  - Support for multiple barcode formats
  - Toggle between inventory and sales scan modes

- **PWA Capabilities**
  - Installable on mobile and desktop devices
  - Offline functionality
  - Service worker for caching and background sync

- **Dashboard**
  - Overview of key metrics (total items, low stock, sales)
  - Quick access to common actions

- **Responsive UI**
  - Mobile-first design approach
  - Dark/light mode support

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## App Structure

- `src/app/*` - Next.js App Router components and pages
- `src/components/*` - Reusable React components
- `src/lib/*` - Utility functions, database setup, and services
- `src/context/*` - React context providers
- `public/*` - Static assets and PWA manifest

## Key Components

- **Authentication Context** (`src/context/AuthContext.tsx`) - Manages user authentication state
- **Database** (`src/lib/db.ts`) - Dexie.js setup for IndexedDB
- **Sync Service** (`src/lib/sync.ts`) - Handles data synchronization with Supabase
- **Scanner** (`src/components/scanner/Scanner.tsx`) - QR/barcode scanning component

## Features to Implement

- Inventory Management Module
  - Item listing, filtering, and search
  - Item detail view and edit form
  - Stock history and audit log

- Sales Module
  - Shopping cart functionality
  - Sales history and receipts
  - Customer management

- Reports & Analytics
  - Sales trends and charts
  - Inventory valuation and turnover
  - Export functionality

- User Management
  - Staff permissions and access control
  - Activity logging

## Environment Setup

Create a `.env.local` file with your Supabase credentials:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_JWT_SECRET=your_jwt_secret
```

## License

[MIT](https://choosealicense.com/licenses/mit/)
