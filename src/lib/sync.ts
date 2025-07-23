import db, { Item, Sale, StockMovement } from './db';
import { supabase, isSupabaseConfigured } from './supabase';
import { networkStatus } from './network';

// Function to sync pending items to Supabase
export const syncItems = async () => {
  try {
    // Check if Supabase is configured
    if (!isSupabaseConfigured()) {
      console.warn('Supabase not configured, skipping sync');
      return;
    }

    // Get all items with pending sync status
    const pendingItems = await db.items
      .where('syncStatus')
      .equals('pending')
      .toArray();

    if (!pendingItems.length) return;

    // For each pending item
    for (const item of pendingItems) {
      try {
        // If the item has a supabaseId, update it
        if (item.supabaseId) {
          const { error } = await supabase!
            .from('items')
            .update({
              name: item.name,
              sku: item.sku,
              barcode: item.barcode,
              quantity: item.quantity,
              supplier: item.supplier,
              price: item.price,
              cost_price: item.costPrice,
              category: item.category,
              last_updated: item.lastUpdated.toISOString()
            })
            .eq('id', item.supabaseId);

          if (!error) {
            await db.items.update(item.id!, { syncStatus: 'synced' });
          }
        } else {
          // If the item doesn't have a supabaseId, insert it
          const { data, error } = await supabase!
            .from('items')
            .insert({
              name: item.name,
              sku: item.sku,
              barcode: item.barcode,
              quantity: item.quantity,
              supplier: item.supplier,
              price: item.price,
              cost_price: item.costPrice,
              category: item.category,
              last_updated: item.lastUpdated.toISOString()
            })
            .select()
            .single();

          if (!error && data) {
            await db.items.update(item.id!, { 
              supabaseId: data.id, 
              syncStatus: 'synced' 
            });
          }
        }
      } catch (error) {
        console.error('Error syncing item:', error);
        await db.items.update(item.id!, { syncStatus: 'failed' });
      }
    }
  } catch (error) {
    console.error('Error during item sync:', error);
  }
};

// Function to sync pending sales to Supabase
export const syncSales = async () => {
  try {
    // Check if Supabase is configured
    if (!isSupabaseConfigured()) {
      console.warn('Supabase not configured, skipping sync');
      return;
    }

    // Get all sales with pending sync status
    const pendingSales = await db.sales
      .where('syncStatus')
      .equals('pending')
      .toArray();

    if (!pendingSales.length) return;

    // For each pending sale
    for (const sale of pendingSales) {
      try {
        // Get the sale items
        const saleItems = await db.saleItems
          .where('saleId')
          .equals(sale.id!.toString())
          .toArray();

        // If the sale has a supabaseId, update it
        if (sale.supabaseId) {
          const { error } = await supabase!
            .from('sales')
            .update({
              timestamp: sale.timestamp.toISOString(),
              total_amount: sale.totalAmount,
              notes: sale.notes,
              customer_id: sale.customerId
            })
            .eq('id', sale.supabaseId);

          if (!error) {
            // Update sale items if needed
            for (const saleItem of saleItems) {
              await supabase!
                .from('sale_items')
                .upsert({
                  sale_id: sale.supabaseId,
                  item_id: saleItem.itemId,
                  quantity: saleItem.quantity,
                  sale_price: saleItem.salePrice
                });
            }

            await db.sales.update(sale.id!, { syncStatus: 'synced' });
          }
        } else {
          // If the sale doesn't have a supabaseId, insert it
          const { data, error } = await supabase!
            .from('sales')
            .insert({
              timestamp: sale.timestamp.toISOString(),
              total_amount: sale.totalAmount,
              notes: sale.notes,
              customer_id: sale.customerId
            })
            .select()
            .single();

          if (!error && data) {
            // Insert sale items
            for (const saleItem of saleItems) {
              await supabase!
                .from('sale_items')
                .insert({
                  sale_id: data.id,
                  item_id: saleItem.itemId,
                  quantity: saleItem.quantity,
                  sale_price: saleItem.salePrice
                });
            }

            await db.sales.update(sale.id!, { 
              supabaseId: data.id, 
              syncStatus: 'synced' 
            });
          }
        }
      } catch (error) {
        console.error('Error syncing sale:', error);
        await db.sales.update(sale.id!, { syncStatus: 'failed' });
      }
    }
  } catch (error) {
    console.error('Error during sales sync:', error);
  }
};

// Function to sync stock movements
export const syncStockMovements = async () => {
  try {
    // Check if Supabase is configured
    if (!isSupabaseConfigured()) {
      console.warn('Supabase not configured, skipping sync');
      return;
    }

    // Get all stock movements with pending sync status
    const pendingMovements = await db.stockMovements
      .where('syncStatus')
      .equals('pending')
      .toArray();

    if (!pendingMovements.length) return;

    // For each pending movement
    for (const movement of pendingMovements) {
      try {
        // If the movement has a supabaseId, update it
        if (movement.supabaseId) {
          const { error } = await supabase!
            .from('stock_movements')
            .update({
              item_id: movement.itemId,
              quantity: movement.quantity,
              type: movement.type,
              timestamp: movement.timestamp.toISOString(),
              notes: movement.notes
            })
            .eq('id', movement.supabaseId);

          if (!error) {
            await db.stockMovements.update(movement.id!, { syncStatus: 'synced' });
          }
        } else {
          // If the movement doesn't have a supabaseId, insert it
          const { data, error } = await supabase!
            .from('stock_movements')
            .insert({
              item_id: movement.itemId,
              quantity: movement.quantity,
              type: movement.type,
              timestamp: movement.timestamp.toISOString(),
              notes: movement.notes
            })
            .select()
            .single();

          if (!error && data) {
            await db.stockMovements.update(movement.id!, { 
              supabaseId: data.id, 
              syncStatus: 'synced' 
            });
          }
        }
      } catch (error) {
        console.error('Error syncing stock movement:', error);
        await db.stockMovements.update(movement.id!, { syncStatus: 'failed' });
      }
    }
  } catch (error) {
    console.error('Error during stock movement sync:', error);
  }
};

// Function to pull latest data from Supabase
export const pullFromSupabase = async () => {
  try {
    // Check if Supabase is configured
    if (!isSupabaseConfigured()) {
      console.warn('Supabase not configured, skipping pull');
      return;
    }

    // Get items from Supabase
    const { data: items, error: itemsError } = await supabase!
      .from('items')
      .select('*');
    
    if (!itemsError && items) {
      // Update local items
      for (const item of items) {
        const existingItem = await db.items
          .where('supabaseId')
          .equals(item.id)
          .first();
        
        if (existingItem) {
          await db.items.update(existingItem.id!, {
            name: item.name,
            sku: item.sku,
            barcode: item.barcode,
            quantity: item.quantity,
            supplier: item.supplier,
            price: item.price,
            costPrice: item.cost_price,
            category: item.category,
            lastUpdated: new Date(item.last_updated),
            syncStatus: 'synced'
          });
        } else {
          await db.items.add({
            supabaseId: item.id,
            name: item.name,
            sku: item.sku,
            barcode: item.barcode,
            quantity: item.quantity,
            supplier: item.supplier,
            price: item.price,
            costPrice: item.cost_price,
            category: item.category,
            lastUpdated: new Date(item.last_updated),
            syncStatus: 'synced'
          });
        }
      }
    }
  } catch (error) {
    console.error('Error pulling data from Supabase:', error);
  }
};

// Main sync function
export const syncData = async () => {
  if (networkStatus.isOnline) {
    await Promise.all([
      syncItems(),
      syncSales(),
      syncStockMovements(),
      pullFromSupabase()
    ]);
    return true;
  }
  return false;
};

// Register background sync
export const registerBackgroundSync = () => {
  // Check if browser supports background sync
  if ('serviceWorker' in navigator && 'SyncManager' in window) {
    navigator.serviceWorker.ready
      .then(registration => {
        // Register background sync with type assertion
        return (registration as any).sync?.register('sync-data');
      })
      .catch(err => {
        console.error('Background sync registration failed:', err);
      });
  }
}; 