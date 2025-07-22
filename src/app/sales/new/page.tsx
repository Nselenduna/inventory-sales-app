'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import AppShell from '@/components/layout/AppShell';
import Scanner from '@/components/scanner/Scanner';
import db, { Item } from '@/lib/db';
import { Html5QrcodeResult } from 'html5-qrcode';
import { formatCurrency } from '@/lib/utils';

interface CartItem extends Item {
  cartQuantity: number;
}

export default function NewSalePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [isLoading, setIsLoading] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Item[]>([]);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [notes, setNotes] = useState('');

  // Handle item and quantity from URL if coming from scan page
  useEffect(() => {
    const itemId = searchParams.get('item');
    const quantity = searchParams.get('quantity');
    
    if (itemId && quantity) {
      const fetchItem = async () => {
        try {
          const item = await db.items.get(parseInt(itemId));
          if (item) {
            addToCart(item, parseInt(quantity));
          }
        } catch (error) {
          console.error('Error fetching item:', error);
        }
      };
      
      fetchItem();
    }
  }, [searchParams]);

  // Handle search for items
  useEffect(() => {
    const searchItems = async () => {
      if (!searchTerm.trim()) {
        setSearchResults([]);
        return;
      }

      try {
        const term = searchTerm.toLowerCase();
        const allItems = await db.items.toArray();
        
        const filtered = allItems.filter(item => 
          item.name.toLowerCase().includes(term) || 
          item.sku.toLowerCase().includes(term) || 
          (item.barcode && item.barcode.toLowerCase().includes(term))
        );
        
        setSearchResults(filtered);
      } catch (error) {
        console.error('Error searching items:', error);
        setSearchResults([]);
      }
    };

    // Debounce search
    const timeoutId = setTimeout(() => {
      searchItems();
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const handleScanSuccess = async (decodedText: string, decodedResult: Html5QrcodeResult) => {
    try {
      // Look up the barcode in the database
      const item = await db.items
        .where('barcode')
        .equals(decodedText)
        .or('sku')
        .equals(decodedText)
        .first();

      if (item) {
        addToCart(item, 1);
        setShowScanner(false); // Close scanner after successful scan
      } else {
        alert(`No item found with barcode/QR: ${decodedText}`);
      }
    } catch (err) {
      console.error('Error looking up item:', err);
      alert('Error looking up item. Please try again.');
    }
  };

  const handleScanFailure = (errorMessage: string) => {
    // Avoid showing errors for normal scan attempts
    if (!errorMessage.includes('No QR code found')) {
      console.error('Scan error:', errorMessage);
    }
  };

  const addToCart = (item: Item, quantity: number = 1) => {
    setCartItems(prevItems => {
      // Check if item already exists in cart
      const existingItemIndex = prevItems.findIndex(cartItem => cartItem.id === item.id);
      
      if (existingItemIndex >= 0) {
        // Update quantity if item exists
        const updatedItems = [...prevItems];
        const newQuantity = updatedItems[existingItemIndex].cartQuantity + quantity;
        
        // Check if we have enough stock
        if (newQuantity > item.quantity) {
          alert(`Not enough stock. Only ${item.quantity} available.`);
          updatedItems[existingItemIndex].cartQuantity = item.quantity;
        } else {
          updatedItems[existingItemIndex].cartQuantity = newQuantity;
        }
        
        return updatedItems;
      } else {
        // Add new item to cart
        const cartQuantity = Math.min(quantity, item.quantity);
        
        if (quantity > item.quantity) {
          alert(`Not enough stock. Only ${item.quantity} available.`);
        }
        
        return [...prevItems, { ...item, cartQuantity }];
      }
    });
  };

  const updateCartItemQuantity = (itemId: number | undefined, quantity: number) => {
    if (!itemId) return;
    
    setCartItems(prevItems => {
      const updatedItems = [...prevItems];
      const itemIndex = updatedItems.findIndex(item => item.id === itemId);
      
      if (itemIndex >= 0) {
        const item = updatedItems[itemIndex];
        
        // Check stock availability
        if (quantity > item.quantity) {
          alert(`Not enough stock. Only ${item.quantity} available.`);
          updatedItems[itemIndex].cartQuantity = item.quantity;
        } else if (quantity <= 0) {
          // Remove item if quantity is 0 or negative
          updatedItems.splice(itemIndex, 1);
        } else {
          updatedItems[itemIndex].cartQuantity = quantity;
        }
      }
      
      return updatedItems;
    });
  };

  const removeFromCart = (itemId: number | undefined) => {
    if (!itemId) return;
    
    setCartItems(prevItems => prevItems.filter(item => item.id !== itemId));
  };

  const calculateSubtotal = () => {
    return cartItems.reduce((sum, item) => sum + (item.price * item.cartQuantity), 0);
  };

  const handleCompleteSale = async () => {
    if (cartItems.length === 0) {
      alert('Please add items to the cart first.');
      return;
    }
    
    setIsLoading(true);
    
    try {
      const now = new Date();
      const totalAmount = calculateSubtotal();
      
      // Create sale record
      const saleId = await db.sales.add({
        timestamp: now,
        totalAmount,
        notes: notes || undefined,
        customerId: customerName || undefined,
        syncStatus: 'pending'
      });
      
      // Add sale items
      for (const item of cartItems) {
        // Add sale item
        await db.saleItems.add({
          saleId: saleId.toString(),
          itemId: item.id!.toString(),
          quantity: item.cartQuantity,
          salePrice: item.price
        });
        
        // Update inventory quantity
        await db.items.update(item.id!, {
          quantity: item.quantity - item.cartQuantity,
          lastUpdated: now,
          syncStatus: 'pending'
        });
        
        // Record stock movement
        await db.stockMovements.add({
          itemId: item.id!.toString(),
          quantity: item.cartQuantity,
          type: 'sale',
          timestamp: now,
          notes: `Sale #${saleId}`,
          syncStatus: 'pending'
        });
      }
      
      // Redirect to the sale details page or sales list
      router.push(`/sales/${saleId}`);
      
    } catch (error) {
      console.error('Error completing sale:', error);
      alert('An error occurred while processing the sale.');
      setIsLoading(false);
    }
  };

  const handleClearCart = () => {
    if (confirm('Are you sure you want to clear the cart?')) {
      setCartItems([]);
    }
  };

  return (
    <AppShell>
      <div className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
                New Sale
              </h1>
            </div>
            <div className="mt-4 flex md:ml-4 md:mt-0">
              <Link
                href="/sales"
                className="inline-flex items-center rounded-md bg-white dark:bg-gray-800 px-3 py-2 text-sm font-semibold text-gray-900 dark:text-white shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancel
              </Link>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-12">
            {/* Left Column - Item Search and Scanner */}
            <div className="lg:col-span-7">
              <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg">
                <div className="px-4 py-5 sm:px-6">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
                      Add Items
                    </h3>
                    <button
                      onClick={() => setShowScanner(!showScanner)}
                      className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none"
                    >
                      {showScanner ? 'Hide Scanner' : 'Scan Barcode'}
                    </button>
                  </div>
                </div>

                {showScanner && (
                  <div className="px-4 py-5 border-t border-gray-200 dark:border-gray-700 sm:px-6">
                    <Scanner 
                      onScanSuccess={handleScanSuccess}
                      onScanFailure={handleScanFailure}
                      qrbox={250}
                    />
                  </div>
                )}

                <div className="px-4 py-5 border-t border-gray-200 dark:border-gray-700 sm:px-6">
                  <label htmlFor="search" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Search Items
                  </label>
                  <div className="relative rounded-md shadow-sm">
                    <input
                      type="text"
                      name="search"
                      id="search"
                      value={searchTerm}
                      onChange={handleSearch}
                      className="block w-full pr-10 border-gray-300 dark:border-gray-700 dark:bg-gray-800 rounded-md focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      placeholder="Search by name, SKU or barcode..."
                    />
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                      <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                  </div>
                </div>

                {searchTerm && (
                  <div className="px-4 py-5 border-t border-gray-200 dark:border-gray-700 sm:px-6">
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Search Results {searchResults.length > 0 ? `(${searchResults.length})` : ''}
                      </h4>
                      {searchResults.length === 0 ? (
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          No items found matching "{searchTerm}"
                        </p>
                      ) : (
                        <div className="mt-2 space-y-2">
                          {searchResults.map(item => (
                            <div 
                              key={item.id} 
                              className="flex justify-between items-center p-3 border border-gray-200 dark:border-gray-700 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
                            >
                              <div className="flex-1">
                                <h5 className="text-sm font-medium text-gray-900 dark:text-white">{item.name}</h5>
                                <p className="text-xs text-gray-500 dark:text-gray-400">SKU: {item.sku}</p>
                                <div className="flex items-center mt-1">
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium 
                                    ${item.quantity > 0 ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'}`}>
                                    {item.quantity > 0 ? `${item.quantity} in stock` : 'Out of stock'}
                                  </span>
                                  <span className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                                    {formatCurrency(item.price)}
                                  </span>
                                </div>
                              </div>
                              <button
                                onClick={() => addToCart(item)}
                                disabled={item.quantity <= 0}
                                className="ml-4 inline-flex items-center p-1.5 border border-transparent rounded-full shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                </svg>
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column - Cart */}
            <div className="lg:col-span-5">
              <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg">
                <div className="px-4 py-5 sm:px-6">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
                      Cart {cartItems.length > 0 ? `(${cartItems.length})` : ''}
                    </h3>
                    {cartItems.length > 0 && (
                      <button
                        onClick={handleClearCart}
                        className="inline-flex items-center px-3 py-1.5 border border-gray-300 dark:border-gray-600 text-xs leading-4 font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none"
                      >
                        Clear Cart
                      </button>
                    )}
                  </div>
                </div>

                <div className="px-4 py-5 border-t border-gray-200 dark:border-gray-700 sm:px-6">
                  {cartItems.length === 0 ? (
                    <div className="text-center py-6">
                      <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                      <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">Your cart is empty</h3>
                      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        Search for items or scan barcodes to add items to your cart.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {cartItems.map(item => (
                        <div 
                          key={item.id} 
                          className="flex flex-col sm:flex-row sm:items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-md"
                        >
                          <div className="flex-1 mb-2 sm:mb-0">
                            <h5 className="text-sm font-medium text-gray-900 dark:text-white">{item.name}</h5>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              SKU: {item.sku} • Price: {formatCurrency(item.price)}
                            </p>
                          </div>
                          <div className="flex items-center">
                            <div className="flex rounded-md shadow-sm mr-2">
                              <button
                                type="button"
                                onClick={() => updateCartItemQuantity(item.id, item.cartQuantity - 1)}
                                className="relative inline-flex items-center px-2 py-1 rounded-l-md border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-sm font-medium text-gray-500 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600"
                              >
                                <span className="text-lg font-bold">-</span>
                              </button>
                              <div className="relative flex items-center px-3 py-1 border-y border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-700 dark:text-gray-300">
                                {item.cartQuantity}
                              </div>
                              <button
                                type="button"
                                onClick={() => updateCartItemQuantity(item.id, item.cartQuantity + 1)}
                                className="relative inline-flex items-center px-2 py-1 rounded-r-md border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-sm font-medium text-gray-500 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600"
                              >
                                <span className="text-lg font-bold">+</span>
                              </button>
                            </div>
                            <button
                              onClick={() => removeFromCart(item.id)}
                              className="p-1 rounded-full text-gray-400 hover:text-gray-500 focus:outline-none"
                            >
                              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                          <div className="w-full sm:w-auto mt-2 sm:mt-0 sm:ml-4 text-right">
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                              {formatCurrency(item.price * item.cartQuantity)}
                            </p>
                          </div>
                        </div>
                      ))}

                      {/* Additional Info */}
                      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                        <div className="mb-4">
                          <label htmlFor="customerName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Customer Name (Optional)
                          </label>
                          <input
                            type="text"
                            id="customerName"
                            name="customerName"
                            value={customerName}
                            onChange={(e) => setCustomerName(e.target.value)}
                            className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 dark:border-gray-700 dark:bg-gray-800 rounded-md"
                            placeholder="Enter customer name"
                          />
                        </div>

                        <div className="mb-4">
                          <label htmlFor="notes" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Notes (Optional)
                          </label>
                          <textarea
                            id="notes"
                            name="notes"
                            rows={2}
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 dark:border-gray-700 dark:bg-gray-800 rounded-md"
                            placeholder="Add notes about this sale"
                          />
                        </div>
                      </div>

                      {/* Summary */}
                      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                        <div className="flex justify-between items-center text-base font-medium text-gray-900 dark:text-white">
                          <p>Subtotal</p>
                          <p>{formatCurrency(calculateSubtotal())}</p>
                        </div>

                        <button
                          onClick={handleCompleteSale}
                          disabled={isLoading || cartItems.length === 0}
                          className="mt-4 w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isLoading ? (
                            <>
                              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              Processing...
                            </>
                          ) : (
                            <>Complete Sale</>
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
} 