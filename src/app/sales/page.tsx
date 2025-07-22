'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import AppShell from '@/components/layout/AppShell';
import db, { Sale, SaleItem } from '@/lib/db';
import { formatCurrency } from '@/lib/utils';
import { useAsyncData } from '@/lib/hooks';

export default function SalesPage() {
  const [dateRange, setDateRange] = useState('today');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const fetchSales = async () => {
    // Determine date range based on filter
    let minDate = new Date();
    const maxDate = new Date();
    maxDate.setHours(23, 59, 59, 999); // End of today

    switch (dateRange) {
      case 'today':
        minDate.setHours(0, 0, 0, 0); // Start of today
        break;
      case 'yesterday':
        minDate.setDate(minDate.getDate() - 1);
        minDate.setHours(0, 0, 0, 0); // Start of yesterday
        break;
      case 'week':
        minDate.setDate(minDate.getDate() - 7);
        break;
      case 'month':
        minDate.setMonth(minDate.getMonth() - 1);
        break;
      case 'custom':
        if (startDate) {
          minDate = new Date(startDate);
          minDate.setHours(0, 0, 0, 0);
        }
        if (endDate) {
          const customEndDate = new Date(endDate);
          customEndDate.setHours(23, 59, 59, 999);
          // Only update maxDate if endDate is provided and valid
          if (!isNaN(customEndDate.getTime())) {
            maxDate.setTime(customEndDate.getTime());
          }
        }
        break;
    }
    
    // Get sales within date range
    let salesData = await db.sales
      .where('timestamp')
      .between(minDate, maxDate)
      .reverse()
      .sortBy('timestamp');
    
    // Fetch items for each sale
    const salesWithItems = await Promise.all(salesData.map(async (sale) => {
      const saleItems = await db.saleItems
        .where('saleId')
        .equals(sale.id!.toString())
        .toArray();
      
      // Get item names
      const itemsWithNames = await Promise.all(saleItems.map(async (saleItem) => {
        const item = await db.items.get(parseInt(saleItem.itemId));
        return {
          name: item?.name || 'Unknown Item',
          quantity: saleItem.quantity
        };
      }));
      
      return {
        ...sale,
        items: itemsWithNames
      };
    }));
    
    return salesWithItems;
  };
  const { data: sales, isLoading, error } = useAsyncData(fetchSales, [dateRange, startDate, endDate]);
  const salesArray = Array.isArray(sales) ? sales : [];

  const handleDateRangeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setDateRange(e.target.value);
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString();
  };

  const calculateTotalRevenue = () => {
    return salesArray.reduce((total, sale) => total + sale.totalAmount, 0);
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

  return (
    <AppShell>
      <div className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
                Sales History
              </h1>
            </div>
            <div className="mt-4 flex md:ml-4 md:mt-0">
              <Link
                href="/sales/new"
                className="ml-3 inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
              >
                New Sale
              </Link>
            </div>
          </div>

          {/* Filters */}
          <div className="mt-4 bg-white dark:bg-gray-800 shadow rounded-lg p-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="col-span-1">
                <label htmlFor="dateRange" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Date Range
                </label>
                <select
                  id="dateRange"
                  name="dateRange"
                  value={dateRange}
                  onChange={handleDateRangeChange}
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-700 dark:bg-gray-800 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                >
                  <option value="today">Today</option>
                  <option value="yesterday">Yesterday</option>
                  <option value="week">Last 7 Days</option>
                  <option value="month">Last 30 Days</option>
                  <option value="custom">Custom Range</option>
                </select>
              </div>

              {dateRange === 'custom' && (
                <>
                  <div className="col-span-1">
                    <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Start Date
                    </label>
                    <input
                      type="date"
                      id="startDate"
                      name="startDate"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-700 dark:bg-gray-800 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                    />
                  </div>

                  <div className="col-span-1">
                    <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      End Date
                    </label>
                    <input
                      type="date"
                      id="endDate"
                      name="endDate"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-700 dark:bg-gray-800 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                    />
                  </div>
                </>
              )}

              <div className="col-span-1 sm:col-span-2">
                <div className="h-full flex items-end">
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg px-4 py-2 text-sm">
                    <span className="font-medium text-gray-700 dark:text-gray-300">Total Sales:</span>{' '}
                    <span className="font-bold text-gray-900 dark:text-white">{salesArray.length}</span>
                    <span className="mx-2">|</span>
                    <span className="font-medium text-gray-700 dark:text-gray-300">Revenue:</span>{' '}
                    <span className="font-bold text-gray-900 dark:text-white">{formatCurrency(calculateTotalRevenue())}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Sales List */}
          <div className="mt-4">
            {isLoading ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-600"></div>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Loading sales...</p>
              </div>
            ) : salesArray.length === 0 ? (
              <div className="text-center py-12 bg-white dark:bg-gray-800 shadow rounded-lg">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No sales found</h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  No sales recorded in the selected date range.
                </p>
                <div className="mt-6">
                  <Link
                    href="/sales/new"
                    className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    <svg className="-ml-1 mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    New Sale
                  </Link>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {salesArray.map((sale) => (
                  <div key={sale.id} className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg">
                    <div className="px-4 py-4 sm:px-6 flex justify-between items-center">
                      <div>
                        <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
                          Sale #{sale.id}
                        </h3>
                        <p className="mt-1 max-w-2xl text-sm text-gray-500 dark:text-gray-400">
                          {formatDate(sale.timestamp)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-semibold text-gray-900 dark:text-white">
                          {formatCurrency(sale.totalAmount)}
                        </p>
                        <Link
                          href={`/sales/${sale.id}`}
                          className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-900"
                        >
                          View Details
                        </Link>
                      </div>
                    </div>
                    <div className="border-t border-gray-200 dark:border-gray-700 px-4 py-3 sm:px-6">
                      <div className="text-sm">
                        <p className="font-medium text-gray-700 dark:text-gray-300 mb-2">Items:</p>
                        <ul className="space-y-1">
                          {sale.items?.map((item, index) => (
                            <li key={index} className="text-gray-500 dark:text-gray-400">
                              {item.quantity}x {item.name}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
} 