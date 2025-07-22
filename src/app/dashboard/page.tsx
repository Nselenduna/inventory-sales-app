'use client';

import { useEffect, useState } from 'react';
import AppShell from '@/components/layout/AppShell';
import db from '@/lib/db';
import Link from 'next/link';
import { formatCurrency } from '@/lib/utils';
import { useAsyncData } from '@/lib/hooks';

interface DashboardStats {
  totalItems: number;
  lowStockItems: number;
  totalSalesToday: number;
  totalRevenueToday: number;
  currency: string;
}

export default function DashboardPage() {
  const fetchStats = async () => {
    // Get shop settings
    const settings = await db.settings.toArray();
    let shopName = '';
    let currency = 'GBP';
    if (settings.length > 0) {
      shopName = settings[0].name;
      currency = settings[0].currency || 'GBP';
    }
    // Count total items
    const totalItemsCount = await db.items.count();
    // Get low stock items
    const lowStockThreshold = settings[0]?.lowStockThreshold || 5;
    const lowStockItemsCount = await db.items
      .where('quantity')
      .belowOrEqual(lowStockThreshold)
      .count();
    // Get today's sales
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todaySales = await db.sales
      .where('timestamp')
      .aboveOrEqual(today)
      .toArray();
    const totalSalesToday = todaySales.length;
    const totalRevenueToday = todaySales.reduce((sum, sale) => sum + sale.totalAmount, 0);
    return {
      totalItems: totalItemsCount,
      lowStockItems: lowStockItemsCount,
      totalSalesToday,
      totalRevenueToday,
      currency,
      shopName,
    };
  };
  const { data: stats, isLoading, error } = useAsyncData(fetchStats, []);
  const [shopName, setShopName] = useState<string>('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Get shop settings
        const settings = await db.settings.toArray();
        if (settings.length > 0) {
          setShopName(settings[0].name);
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      }
    };

    fetchData();
  }, []);

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

  return (
    <AppShell>
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
          {shopName ? `${shopName} Dashboard` : 'Dashboard'}
        </h1>

        {isLoading ? (
          <div className="mt-6 grid gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg animate-pulse">
                <div className="p-5 h-32"></div>
              </div>
            ))}
          </div>
        ) : (
          <>
            <div className="mt-6 grid gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
              {/* Total Items */}
              <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 bg-indigo-500 rounded-md p-3">
                      <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                      </svg>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                          Total Items
                        </dt>
                        <dd>
                          <div className="text-lg font-medium text-gray-900 dark:text-white">
                            {stats?.totalItems}
                          </div>
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700 px-4 py-4 sm:px-6">
                  <div className="text-sm">
                    <Link
                      href="/inventory"
                      className="font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-500"
                    >
                      View all items
                    </Link>
                  </div>
                </div>
              </div>

              {/* Low Stock Items */}
              <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 bg-red-500 rounded-md p-3">
                      <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                          Low Stock Items
                        </dt>
                        <dd>
                          <div className="text-lg font-medium text-gray-900 dark:text-white">
                            {stats?.lowStockItems}
                          </div>
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700 px-4 py-4 sm:px-6">
                  <div className="text-sm">
                    <Link
                      href="/inventory?filter=low-stock"
                      className="font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-500"
                    >
                      View low stock items
                    </Link>
                  </div>
                </div>
              </div>

              {/* Sales Today */}
              <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 bg-green-500 rounded-md p-3">
                      <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                      </svg>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                          Sales Today
                        </dt>
                        <dd>
                          <div className="text-lg font-medium text-gray-900 dark:text-white">
                            {stats?.totalSalesToday}
                          </div>
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700 px-4 py-4 sm:px-6">
                  <div className="text-sm">
                    <Link
                      href="/sales"
                      className="font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-500"
                    >
                      View all sales
                    </Link>
                  </div>
                </div>
              </div>

              {/* Revenue Today */}
              <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 bg-yellow-500 rounded-md p-3">
                      <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                          Revenue Today
                        </dt>
                        <dd>
                          <div className="text-lg font-medium text-gray-900 dark:text-white">
                            {formatCurrency(stats?.totalRevenueToday || 0, stats?.currency)}
                          </div>
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700 px-4 py-4 sm:px-6">
                  <div className="text-sm">
                    <Link
                      href="/reports"
                      className="font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-500"
                    >
                      View reports
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="mt-8">
              <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Quick Actions</h2>
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                <Link
                  href="/inventory/add"
                  className="block bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  <div className="p-6 flex items-center">
                    <div className="flex-shrink-0 bg-indigo-500 rounded-md p-3">
                      <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                    </div>
                    <div className="ml-4">
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white">Add Item</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Add new inventory item</p>
                    </div>
                  </div>
                </Link>

                <Link
                  href="/scan"
                  className="block bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  <div className="p-6 flex items-center">
                    <div className="flex-shrink-0 bg-indigo-500 rounded-md p-3">
                      <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                      </svg>
                    </div>
                    <div className="ml-4">
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white">Scan Items</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Scan barcodes or QR codes</p>
                    </div>
                  </div>
                </Link>

                <Link
                  href="/sales/new"
                  className="block bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  <div className="p-6 flex items-center">
                    <div className="flex-shrink-0 bg-indigo-500 rounded-md p-3">
                      <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                    <div className="ml-4">
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white">New Sale</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Create a new sale</p>
                    </div>
                  </div>
                </Link>

                <Link
                  href="/reports"
                  className="block bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  <div className="p-6 flex items-center">
                    <div className="flex-shrink-0 bg-indigo-500 rounded-md p-3">
                      <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                    <div className="ml-4">
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white">Reports</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">View sales and inventory reports</p>
                    </div>
                  </div>
                </Link>
              </div>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
} 