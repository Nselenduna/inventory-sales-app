import Dexie, { Table } from 'dexie';

// Define the types for our database tables
export interface Item {
  id?: number;
  supabaseId?: string;
  name: string;
  sku: string;
  barcode: string;
  quantity: number;
  supplier: string;
  price: number;
  costPrice?: number;
  category?: string;
  lastUpdated: Date;
  syncStatus: 'synced' | 'pending' | 'failed';
}

export interface SaleItem {
  id?: number;
  itemId: string;
  quantity: number;
  salePrice: number;
  saleId: string;
}

export interface Sale {
  id?: number;
  supabaseId?: string;
  timestamp: Date;
  totalAmount: number;
  notes?: string;
  customerId?: string;
  syncStatus: 'synced' | 'pending' | 'failed';
}

export interface StockMovement {
  id?: number;
  supabaseId?: string;
  itemId: string;
  quantity: number;
  type: 'intake' | 'sale' | 'adjustment';
  timestamp: Date;
  notes?: string;
  syncStatus: 'synced' | 'pending' | 'failed';
}

export interface ShopSettings {
  id?: number;
  name: string;
  location?: string;
  contactEmail?: string;
  contactPhone?: string;
  lowStockThreshold: number;
  currency: string;
}

export class InventorySalesDB extends Dexie {
  items!: Table<Item>;
  sales!: Table<Sale>;
  saleItems!: Table<SaleItem>;
  stockMovements!: Table<StockMovement>;
  settings!: Table<ShopSettings>;

  constructor() {
    super('InventorySalesDB');
    this.version(2).stores({
      items: '++id, supabaseId, sku, barcode, name, supplier, category, quantity, syncStatus',
      sales: '++id, supabaseId, timestamp, customerId, syncStatus',
      saleItems: '++id, saleId, itemId',
      stockMovements: '++id, supabaseId, itemId, timestamp, type, syncStatus',
      settings: '++id, name'
    });
  }
}

const db = new InventorySalesDB();

export default db; 