'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import AppShell from '@/components/layout/AppShell';
import db, { Sale, SaleItem, Item } from '@/lib/db';
import { formatCurrency } from '@/lib/utils';
import { useAsyncData } from '@/lib/hooks';

interface DetailSaleItem extends SaleItem {
  name: string;
  sku: string;
  totalPrice: number;
}

export default function SaleDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const fetchSaleDetails = async () => {
    // Get the sale
    const saleId = parseInt(id);
    if (isNaN(saleId)) {
      throw new Error('Invalid sale ID');
    }
    const saleData = await db.sales.get(saleId);
    if (!saleData) {
      throw new Error('Sale not found');
    }
    // Get the sale items
    const saleItemsData = await db.saleItems
      .where('saleId')
      .equals(saleId.toString())
      .toArray();
    // Get item details for each sale item
    const detailItems = await Promise.all(saleItemsData.map(async (saleItem) => {
      const item = await db.items.get(parseInt(saleItem.itemId));
      return {
        ...saleItem,
        name: item?.name || 'Unknown Item',
        sku: item?.sku || '',
        totalPrice: saleItem.salePrice * saleItem.quantity
      };
    }));
    return { sale: saleData, saleItems: detailItems };
  };
  const { data: saleData, isLoading, error } = useAsyncData(fetchSaleDetails, [id]);

  const [sale, setSale] = useState<any>(null);
  const [saleItems, setSaleItems] = useState<any[]>([]);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (isLoading) {
      return;
    }
    if (!saleData?.sale) {
      router.push('/sales');
      return;
    }
    setSale(saleData.sale);
    setSaleItems(saleData.saleItems);
  }, [saleData, isLoading, router]);

  const handleDelete = async () => {
    if (!sale?.id) return;
    
    setIsDeleting(true);
    try {
      // First, find all the sale items
      const saleItems = await db.saleItems
        .where('saleId')
        .equals(sale.id.toString())
        .toArray();
      
      // Get the item IDs and quantities to restore stock
      const itemUpdates = [];
      for (const saleItem of saleItems) {
        const item = await db.items.get(parseInt(saleItem.itemId));
        if (item) {
          itemUpdates.push({
            id: item.id!,
            quantity: item.quantity + saleItem.quantity
          });
        }
      }
      
      // Start a transaction to ensure data consistency
      await db.transaction('rw', [db.sales, db.saleItems, db.items, db.stockMovements], async () => {
        // Restore item quantities
        for (const update of itemUpdates) {
          await db.items.update(update.id, {
            quantity: update.quantity,
            lastUpdated: new Date(),
            syncStatus: 'pending'
          });
          
          // Add stock movement record for the restored items
          await db.stockMovements.add({
            itemId: update.id.toString(),
            quantity: saleItems.find(si => parseInt(si.itemId) === update.id)?.quantity || 0,
            type: 'adjustment',
            timestamp: new Date(),
            notes: `Sale #${sale.id} cancelled`,
            syncStatus: 'pending'
          });
        }
        
        // Delete sale items
        await db.saleItems
          .where('saleId')
          .equals(sale.id!.toString())
          .delete();
        
        // Delete the sale
        await db.sales.delete(sale.id!);
      });
      
      // Redirect back to sales list
      router.push('/sales');
      
    } catch (error) {
      console.error('Error deleting sale:', error);
      alert('An error occurred while deleting the sale');
    } finally {
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString();
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
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Loading sale details...</p>
            </div>
          </div>
        </div>
      </AppShell>
    );
  }

  if (!sale) {
    return (
      <AppShell>
        <div className="py-6">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center py-12">
              <p className="text-lg text-gray-700 dark:text-gray-300">Sale not found</p>
              <Link
                href="/sales"
                className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
              >
                Back to Sales
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
            <Link href="/sales" className="hover:text-gray-700 dark:hover:text-gray-200">
              Sales
            </Link>
            <svg className="mx-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <span>Sale #{sale.id}</span>
          </div>

          {/* Header */}
          <div className="md:flex md:items-center md:justify-between">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-semibold text-gray-900 dark:text-white sm:text-3xl">
                Sale #{sale.id}
              </h1>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                {formatDate(sale.timestamp)}
                {sale.customerId && ` • Customer: ${sale.customerId}`}
              </p>
            </div>
            <div className="mt-4 flex md:mt-0 md:ml-4 space-x-3">
              <button
                onClick={() => window.print()}
                className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                <svg className="mr-2 -ml-1 h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                Print Receipt
              </button>
              <button
                onClick={() => setShowDeleteModal(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700"
              >
                <svg className="mr-2 -ml-1 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Cancel Sale
              </button>
            </div>
          </div>

          {/* Sale Details */}
          <div className="mt-6 bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg">
            <div className="px-4 py-5 sm:px-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
                Sale Details
              </h3>
            </div>
            <div className="border-t border-gray-200 dark:border-gray-700">
              <dl>
                <div className="bg-gray-50 dark:bg-gray-700 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Sale ID</dt>
                  <dd className="mt-1 text-sm text-gray-900 dark:text-white sm:mt-0 sm:col-span-2">
                    #{sale.id}
                  </dd>
                </div>
                <div className="bg-white dark:bg-gray-800 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Date</dt>
                  <dd className="mt-1 text-sm text-gray-900 dark:text-white sm:mt-0 sm:col-span-2">
                    {formatDate(sale.timestamp)}
                  </dd>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Customer</dt>
                  <dd className="mt-1 text-sm text-gray-900 dark:text-white sm:mt-0 sm:col-span-2">
                    {sale.customerId || '-'}
                  </dd>
                </div>
                <div className="bg-white dark:bg-gray-800 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Amount</dt>
                  <dd className="mt-1 text-sm text-gray-900 dark:text-white sm:mt-0 sm:col-span-2">
                    {formatCurrency(sale.totalAmount)}
                  </dd>
                </div>
                {sale.notes && (
                  <div className="bg-gray-50 dark:bg-gray-700 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Notes</dt>
                    <dd className="mt-1 text-sm text-gray-900 dark:text-white sm:mt-0 sm:col-span-2">
                      {sale.notes}
                    </dd>
                  </div>
                )}
              </dl>
            </div>
          </div>

          {/* Sale Items */}
          <div className="mt-8">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Sale Items</h2>
            
            <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Item
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        SKU
                      </th>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Price
                      </th>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Quantity
                      </th>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {saleItems.map((item) => (
                      <tr key={item.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                          {item.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {item.sku}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-500 dark:text-gray-400">
                          {formatCurrency(item.salePrice)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-500 dark:text-gray-400">
                          {item.quantity}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-gray-900 dark:text-white">
                          {formatCurrency(item.totalPrice)}
                        </td>
                      </tr>
                    ))}

                    {/* Total row */}
                    <tr className="bg-gray-50 dark:bg-gray-700">
                      <td colSpan={4} className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white text-right">
                        Total
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold text-gray-900 dark:text-white">
                        {formatCurrency(sale.totalAmount)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Delete confirmation modal */}
      {showDeleteModal && (
        <div className="fixed z-10 inset-0 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 dark:bg-gray-900 opacity-75"></div>
            </div>

            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            
            <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 dark:bg-red-900 sm:mx-0 sm:h-10 sm:w-10">
                    <svg className="h-6 w-6 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                    <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
                      Cancel Sale
                    </h3>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Are you sure you want to cancel this sale? This will restore all sold items back to inventory and delete the sale record.
                        This action cannot be undone.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={handleDelete}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isDeleting ? 'Processing...' : 'Cancel Sale'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowDeleteModal(false)}
                  disabled={isDeleting}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-600 shadow-sm px-4 py-2 bg-white dark:bg-gray-800 text-base font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Keep Sale
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Print-specific styles */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .max-w-7xl, .max-w-7xl * {
            visibility: visible;
          }
          .max-w-7xl {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          button, a {
            display: none !important;
          }
        }
      `}</style>
    </AppShell>
  );
} 