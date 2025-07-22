'use client';

import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import AppShell from '@/components/layout/AppShell';
import db, { Item, StockMovement } from '@/lib/db';
import { formatCurrency } from '@/lib/utils';
import { useAsyncData } from '@/lib/hooks';

export default function ItemDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;
  
  const fetchItemDetails = async () => {
    // Convert string ID to number
    const itemId = parseInt(id);
    if (isNaN(itemId)) {
      throw new Error('Invalid item ID');
    }
    // Get item details
    const itemData = await db.items.get(itemId);
    if (!itemData) {
      throw new Error('Item not found');
    }
    // Get stock movements for this item
    const movements = await db.stockMovements
      .where('itemId')
      .equals(itemId.toString())
      .reverse()
      .sortBy('timestamp');
    return { item: itemData, stockMovements: movements };
  };
  const { data: itemData, isLoading, error } = useAsyncData(fetchItemDetails, [id]);

  useEffect(() => {
    if (isLoading) {
      console.error('Error fetching item details:', 'Loading item details...');
      router.push('/inventory');
    }
  }, [isLoading, router]);

  const handleDelete = async () => {
    if (!itemData?.item?.id) return;
    
    // setIsDeleting(true); // This state was removed
    try {
      // Delete associated stock movements first
      await db.stockMovements
        .where('itemId')
        .equals(itemData.item.id.toString())
        .delete();
        
      // Then delete the item
      await db.items.delete(itemData.item.id);
      
      // Redirect back to inventory list
      router.push('/inventory');
    } catch (error) {
      console.error('Error deleting item:', error);
      alert('An error occurred while deleting the item');
      // setIsDeleting(false); // This state was removed
    }
  };

  const formatDate = (dateString: Date) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  if (error) {
    return (
      <AppShell>
        <div className="py-6">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center py-12">
              <p className="text-lg text-red-600 dark:text-red-400">An error occurred: {error.message || String(error)}</p>
            </div>
          </div>
        </div>
      </AppShell>
    );
  }

  if (isLoading) {
    return (
      <AppShell>
        <div className="py-6">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-600"></div>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Loading item details...</p>
            </div>
          </div>
        </div>
      </AppShell>
    );
  }

  if (!itemData?.item) {
    return (
      <AppShell>
        <div className="py-6">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center py-12">
              <p className="text-lg text-gray-700 dark:text-gray-300">Item not found</p>
              <Link
                href="/inventory"
                className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
              >
                Back to Inventory
              </Link>
            </div>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Breadcrumbs */}
          <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 mb-4">
            <Link href="/inventory" className="hover:text-gray-700 dark:hover:text-gray-200">
              Inventory
            </Link>
            <svg className="mx-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <span className="truncate">{itemData.item.name}</span>
          </div>

          {/* Header */}
          <div className="md:flex md:items-center md:justify-between">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-semibold text-gray-900 dark:text-white sm:text-3xl">
                {itemData.item.name}
              </h1>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                SKU: {itemData.item.sku} {itemData.item.barcode && `• Barcode: ${itemData.item.barcode}`}
              </p>
            </div>
            <div className="mt-4 flex md:mt-0 md:ml-4 space-x-3">
              <Link
                href={`/inventory/${itemData.item.id}/edit`}
                className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                <svg className="mr-2 -ml-1 h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Edit
              </Link>
              <button
                onClick={() => {
                  // setShowDeleteConfirm(true); // This state was removed
                  // The original code had a modal for deletion, but the new_code removed the state.
                  // For now, we'll just call handleDelete directly.
                  handleDelete();
                }}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700"
              >
                <svg className="mr-2 -ml-1 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Delete
              </button>
            </div>
          </div>

          {/* Item Details */}
          <div className="mt-6 bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg">
            <div className="px-4 py-5 sm:px-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">Item Details</h3>
            </div>
            <div className="border-t border-gray-200 dark:border-gray-700">
              <dl>
                <div className="bg-gray-50 dark:bg-gray-700 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Current Quantity</dt>
                  <dd className="mt-1 text-sm text-gray-900 dark:text-white sm:mt-0 sm:col-span-2">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium 
                      ${itemData.item.quantity <= 0 
                        ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' 
                        : itemData.item.quantity <= 5
                        ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
                        : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                      }`}>
                      {itemData.item.quantity} in stock
                    </span>
                  </dd>
                </div>
                <div className="bg-white dark:bg-gray-800 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Selling Price</dt>
                  <dd className="mt-1 text-sm text-gray-900 dark:text-white sm:mt-0 sm:col-span-2">
                    {formatCurrency(itemData.item.price)}
                  </dd>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Cost Price</dt>
                  <dd className="mt-1 text-sm text-gray-900 dark:text-white sm:mt-0 sm:col-span-2">
                    {itemData.item.costPrice ? formatCurrency(itemData.item.costPrice) : '-'}
                  </dd>
                </div>
                <div className="bg-white dark:bg-gray-800 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Profit Margin</dt>
                  <dd className="mt-1 text-sm text-gray-900 dark:text-white sm:mt-0 sm:col-span-2">
                    {itemData.item.costPrice && itemData.item.price ? (
                      <>
                        {formatCurrency(itemData.item.price - itemData.item.costPrice)} ({Math.round((itemData.item.price - itemData.item.costPrice) / itemData.item.price * 100)}%)
                      </>
                    ) : '-'}
                  </dd>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Supplier</dt>
                  <dd className="mt-1 text-sm text-gray-900 dark:text-white sm:mt-0 sm:col-span-2">
                    {itemData.item.supplier || '-'}
                  </dd>
                </div>
                <div className="bg-white dark:bg-gray-800 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Category</dt>
                  <dd className="mt-1 text-sm text-gray-900 dark:text-white sm:mt-0 sm:col-span-2">
                    {itemData.item.category || '-'}
                  </dd>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Last Updated</dt>
                  <dd className="mt-1 text-sm text-gray-900 dark:text-white sm:mt-0 sm:col-span-2">
                    {formatDate(itemData.item.lastUpdated)}
                  </dd>
                </div>
              </dl>
            </div>
          </div>

          {/* Stock Movements */}
          <div className="mt-8">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Stock Movement History</h2>
            
            {itemData.stockMovements.length === 0 ? (
              <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg px-4 py-5 text-center">
                <p className="text-sm text-gray-500 dark:text-gray-400">No stock movements recorded yet.</p>
              </div>
            ) : (
              <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Date
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Type
                        </th>
                        <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Quantity
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Notes
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {itemData.stockMovements.map((movement) => (
                        <tr key={movement.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {formatDate(movement.timestamp)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium 
                              ${movement.type === 'intake'
                                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                                : movement.type === 'sale'
                                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
                                : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
                              }`}>
                              {movement.type.charAt(0).toUpperCase() + movement.type.slice(1)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900 dark:text-white">
                            {movement.type === 'sale' ? '-' : '+'}{movement.quantity}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {movement.notes || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Delete confirmation modal */}
      {/* This modal was removed as per the new_code, as the state for it was removed. */}
      {/* If deletion functionality is still desired, it needs to be re-added or handled differently. */}
    </AppShell>
  );
} 