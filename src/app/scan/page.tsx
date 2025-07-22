'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Html5QrcodeResult } from 'html5-qrcode';
import AppShell from '@/components/layout/AppShell';
import Scanner from '@/components/scanner/Scanner';
import db from '@/lib/db';

type ScanMode = 'inventory' | 'sales';

export default function ScanPage() {
  const [scanMode, setScanMode] = useState<ScanMode>('inventory');
  const [lastScanned, setLastScanned] = useState<string | null>(null);
  const [scannedItem, setScannedItem] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const router = useRouter();

  const handleScanSuccess = async (decodedText: string, decodedResult: Html5QrcodeResult) => {
    setLastScanned(decodedText);
    setIsLoading(true);
    setError(null);

    try {
      // Look up the barcode in the database
      const item = await db.items
        .where('barcode')
        .equals(decodedText)
        .or('sku')
        .equals(decodedText)
        .first();

      if (item) {
        setScannedItem(item);
        
        // If in sales mode, redirect to the sales page with the item
        if (scanMode === 'sales') {
          router.push(`/sales/new?item=${item.id}&quantity=${quantity}`);
        }
      } else {
        setScannedItem(null);
        setError(`No item found with barcode/QR: ${decodedText}`);
      }
    } catch (err) {
      console.error('Error looking up item:', err);
      setError('Error looking up item. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleScanFailure = (errorMessage: string) => {
    // Avoid showing errors for normal scan attempts
    if (!errorMessage.includes('No QR code found')) {
      console.error('Scan error:', errorMessage);
    }
  };

  const handleUpdateStock = async () => {
    if (!scannedItem) return;
    
    setIsLoading(true);
    try {
      // Update item quantity
      await db.items.update(scannedItem.id!, {
        quantity: scannedItem.quantity + quantity,
        lastUpdated: new Date(),
        syncStatus: 'pending'
      });
      
      // Add stock movement record
      await db.stockMovements.add({
        itemId: scannedItem.id!.toString(),
        quantity: quantity,
        type: 'intake',
        timestamp: new Date(),
        notes: 'Added via scanner',
        syncStatus: 'pending'
      });
      
      // Show confirmation and reset
      setLastScanned(null);
      setScannedItem(null);
      setQuantity(1);
      
      // Show success message
      alert(`Successfully updated ${scannedItem.name} stock. New quantity: ${scannedItem.quantity + quantity}`);
    } catch (error) {
      console.error('Error updating stock:', error);
      setError('Error updating stock. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddToSale = () => {
    if (!scannedItem) return;
    router.push(`/sales/new?item=${scannedItem.id}&quantity=${quantity}`);
  };

  return (
    <AppShell>
      <div className="max-w-lg mx-auto">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">
          Barcode & QR Scanner
        </h1>

        {/* Mode Switch */}
        <div className="mb-6">
          <div className="flex border border-gray-300 dark:border-gray-600 rounded-md p-1 mb-4">
            <button
              className={`flex-1 py-2 px-4 text-sm font-medium rounded-md ${
                scanMode === 'inventory'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300'
              }`}
              onClick={() => setScanMode('inventory')}
            >
              Inventory Mode
            </button>
            <button
              className={`flex-1 py-2 px-4 text-sm font-medium rounded-md ${
                scanMode === 'sales'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300'
              }`}
              onClick={() => setScanMode('sales')}
            >
              Sales Mode
            </button>
          </div>
          
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {scanMode === 'inventory' 
              ? 'Scan items to update inventory quantities' 
              : 'Scan items to add them to a sale'}
          </p>
        </div>

        {/* Scanner */}
        <div className="bg-white dark:bg-gray-800 shadow overflow-hidden rounded-lg divide-y divide-gray-200 dark:divide-gray-700">
          <div className="px-4 py-5 sm:px-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
              Scanner
            </h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500 dark:text-gray-400">
              Position barcode or QR code in the center of the camera view.
            </p>
          </div>
          
          <div className="px-4 py-5 sm:p-6">
            <Scanner
              onScanSuccess={handleScanSuccess}
              onScanFailure={handleScanFailure}
              qrbox={250}
            />
          </div>
        </div>

        {/* Results Panel */}
        {(lastScanned || error) && (
          <div className="mt-6 bg-white dark:bg-gray-800 shadow overflow-hidden rounded-lg">
            <div className="px-4 py-5 sm:px-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
                Scan Result
              </h3>
            </div>
            
            <div className="border-t border-gray-200 dark:border-gray-700 px-4 py-5 sm:p-6">
              {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 p-4 rounded-md">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-red-800 dark:text-red-300">Error</h3>
                      <div className="mt-2 text-sm text-red-700 dark:text-red-400">
                        <p>{error}</p>
                      </div>
                      {lastScanned && (
                        <div className="mt-2">
                          <button
                            onClick={() => router.push(`/inventory/add?barcode=${encodeURIComponent(lastScanned)}`)}
                            className="text-sm font-medium text-red-800 dark:text-red-300 underline"
                          >
                            Add as new item
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {scannedItem && (
                <div className="space-y-6">
                  <div>
                    <h4 className="text-base font-medium text-gray-900 dark:text-white">
                      {scannedItem.name}
                    </h4>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      SKU: {scannedItem.sku}
                    </p>
                    <div className="mt-2 flex items-center text-sm text-gray-500 dark:text-gray-400">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        scannedItem.quantity > 0 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' 
                          : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                      }`}>
                        {scannedItem.quantity > 0 ? 'In Stock' : 'Out of Stock'}
                      </span>
                      <span className="ml-2">
                        Current Quantity: {scannedItem.quantity}
                      </span>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="quantity" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      {scanMode === 'inventory' ? 'Add Quantity' : 'Sale Quantity'}
                    </label>
                    <div className="mt-1 flex rounded-md shadow-sm">
                      <button
                        type="button"
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        className="relative inline-flex items-center px-3 py-2 rounded-l-md border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-300"
                      >
                        <span className="text-lg font-bold">-</span>
                      </button>
                      <input
                        type="number"
                        name="quantity"
                        id="quantity"
                        min="1"
                        value={quantity}
                        onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                        className="focus:ring-indigo-500 focus:border-indigo-500 flex-1 block w-full px-3 py-2 border-gray-300 dark:border-gray-600 dark:bg-gray-800 text-center"
                      />
                      <button
                        type="button"
                        onClick={() => setQuantity(quantity + 1)}
                        className="relative inline-flex items-center px-3 py-2 rounded-r-md border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-300"
                      >
                        <span className="text-lg font-bold">+</span>
                      </button>
                    </div>
                  </div>

                  {scanMode === 'inventory' ? (
                    <button
                      onClick={handleUpdateStock}
                      disabled={isLoading}
                      className="w-full inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isLoading ? 'Updating...' : 'Update Stock'}
                    </button>
                  ) : (
                    <button
                      onClick={handleAddToSale}
                      disabled={isLoading || scannedItem.quantity < quantity}
                      className="w-full inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isLoading ? 'Processing...' : 'Add to Sale'}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
} 