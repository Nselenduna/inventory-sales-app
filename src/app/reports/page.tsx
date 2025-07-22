'use client';

import { useState, useEffect } from 'react';
import AppShell from '@/components/layout/AppShell';
import db, { Sale, Item } from '@/lib/db';
import { useNetworkStatus } from '@/lib/network';
import { formatCurrency } from '@/lib/utils';
import { useAsyncData } from '@/lib/hooks';

interface SalesByDay {
  date: string;
  sales: number;
  revenue: number;
}

interface TopSellingItem {
  id?: number;
  name: string;
  quantity: number;
  revenue: number;
}

interface InventorySummary {
  totalItems: number;
  totalValue: number;
  lowStockItems: number;
  outOfStockItems: number;
}

export default function ReportsPage() {
  const [dateRange, setDateRange] = useState('week');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  const fetchReportData = async () => {
    // Get settings for low stock threshold
    const settings = await db.settings.toArray();
    let lowStockThreshold = 5;
    if (settings.length > 0) {
      lowStockThreshold = settings[0].lowStockThreshold;
    }
    // Determine date range
    let startDateObj = new Date();
    const endDateObj = new Date();
    
    switch (dateRange) {
      case 'week':
        startDateObj.setDate(startDateObj.getDate() - 7);
        break;
      case 'month':
        startDateObj.setDate(startDateObj.getDate() - 30);
        break;
      case 'quarter':
        startDateObj.setDate(startDateObj.getDate() - 90);
        break;
      case 'year':
        startDateObj.setDate(startDateObj.getDate() - 365);
        break;
      case 'custom':
        if (startDate) {
          startDateObj = new Date(startDate);
        }
        if (endDate) {
          const customEndDate = new Date(endDate);
          customEndDate.setHours(23, 59, 59, 999);
          if (!isNaN(customEndDate.getTime())) {
            endDateObj.setTime(customEndDate.getTime());
          }
        }
        break;
    }
    
    // Reset time to start of day for start date
    startDateObj.setHours(0, 0, 0, 0);
    // Set time to end of day for end date
    endDateObj.setHours(23, 59, 59, 999);
    
    // Fetch sales data within the date range
    const sales = await db.sales
      .where('timestamp')
      .between(startDateObj, endDateObj)
      .toArray();
    
    // Fetch sale items
    const allSaleItems = await db.saleItems.toArray();
    
    // Fetch all items
    const allItems = await db.items.toArray();
    
    // Calculate sales by day
    const salesByDay: SalesByDay[] = [];
    const dayMap = new Map<string, { sales: number; revenue: number }>();
    
    sales.forEach(sale => {
      const dayKey = sale.timestamp.toISOString().split('T')[0];
      const existing = dayMap.get(dayKey) || { sales: 0, revenue: 0 };
      dayMap.set(dayKey, {
        sales: existing.sales + 1,
        revenue: existing.revenue + sale.totalAmount
      });
    });
    
    dayMap.forEach((value, key) => {
      salesByDay.push({
        date: key,
        sales: value.sales,
        revenue: value.revenue
      });
    });
    
    salesByDay.sort((a, b) => a.date.localeCompare(b.date));
    
    // Calculate top selling items
    const itemSales = new Map<string, { name: string; quantity: number; revenue: number }>();
    
    for (const sale of sales) {
      const saleItems = allSaleItems.filter(si => si.saleId === sale.id?.toString());
      for (const saleItem of saleItems) {
        const item = allItems.find(i => i.id?.toString() === saleItem.itemId);
        if (item) {
          const existing = itemSales.get(item.name) || { name: item.name, quantity: 0, revenue: 0 };
          itemSales.set(item.name, {
            name: item.name,
            quantity: existing.quantity + saleItem.quantity,
            revenue: existing.revenue + (saleItem.salePrice * saleItem.quantity)
          });
        }
      }
    }
    
    const topSellingItems = Array.from(itemSales.values())
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10);
    
    // Calculate inventory summary
    const totalItems = allItems.length;
    const totalValue = allItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const lowStockItems = allItems.filter(item => item.quantity <= lowStockThreshold).length;
    const outOfStockItems = allItems.filter(item => item.quantity === 0).length;
    
    const inventorySummary: InventorySummary = {
      totalItems,
      totalValue,
      lowStockItems,
      outOfStockItems
    };
    
    return { 
      sales, 
      allSaleItems, 
      allItems, 
      lowStockThreshold, 
      startDateObj, 
      endDateObj,
      salesByDay,
      topSellingItems,
      inventorySummary
    };
  };
  const { data: reportData, isLoading, error } = useAsyncData(fetchReportData, [dateRange, startDate, endDate]);

  const isOnline = useNetworkStatus();

  useEffect(() => {
    // The useAsyncData hook manages its own dependencies and state,
    // so we don't need to call fetchData here directly.
    // The data will be available in reportData.
  }, [dateRange, startDate, endDate]);

  const handleDateRangeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setDateRange(e.target.value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short'
    });
  };

  const calculateTotalRevenue = () => {
    const salesByDay = Array.isArray(reportData?.salesByDay) ? reportData.salesByDay : [];
    return salesByDay.reduce((total, day) => total + day.revenue, 0) || 0;
  };

  const calculateTotalSales = () => {
    const salesByDay = Array.isArray(reportData?.salesByDay) ? reportData.salesByDay : [];
    return salesByDay.reduce((total, day) => total + day.sales, 0) || 0;
  };

  const calculateAverageOrderValue = () => {
    const totalSales = calculateTotalSales();
    return totalSales > 0 ? calculateTotalRevenue() / totalSales : 0;
  };

  const exportInventoryCsv = async () => {
    // This function needs to be refactored to use reportData
    // For now, it will use dummy data or throw an error if not implemented
    console.warn("Export Inventory CSV not fully implemented with useAsyncData");
    alert('Export Inventory CSV functionality is not yet fully implemented.');
  };

  const exportSalesCsv = async () => {
    // This function needs to be refactored to use reportData
    // For now, it will use dummy data or throw an error if not implemented
    console.warn("Export Sales CSV not fully implemented with useAsyncData");
    alert('Export Sales CSV functionality is not yet fully implemented.');
  };

  // Function to generate a simple sales chart
  const generateSalesChart = () => {
    if (!reportData?.salesByDay || reportData.salesByDay.length === 0) return null;
    
    const maxRevenue = Math.max(...reportData.salesByDay.map(day => day.revenue));
    const chartHeight = 200;
    
    return (
      <div className="relative h-52">
        <div className="absolute bottom-0 left-0 right-0 flex items-end justify-between h-48 space-x-1">
          {reportData.salesByDay.map((day, index) => {
            const height = maxRevenue > 0 ? (day.revenue / maxRevenue) * chartHeight : 0;
            return (
              <div key={index} className="flex flex-col items-center flex-1">
                <div 
                  className="w-full bg-indigo-500 rounded-t"
                  style={{ height: `${height}px` }}
                  title={`${formatCurrency(day.revenue)} (${day.sales} sales)`}
                ></div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate w-full text-center">
                  {formatDate(day.date)}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
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

  const inventorySummary = reportData?.inventorySummary || { totalItems: 0, totalValue: 0, lowStockItems: 0, outOfStockItems: 0 };
  const topSellingItems = Array.isArray(reportData?.topSellingItems) ? reportData.topSellingItems : [];

  return (
    <AppShell>
      <div className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
            Reports & Analytics
          </h1>

          {/* Date Range Selector */}
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
                  <option value="week">Last 7 Days</option>
                  <option value="month">Last 30 Days</option>
                  <option value="quarter">Last 90 Days</option>
                  <option value="year">Last Year</option>
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

              <div className="col-span-1 lg:col-span-1 flex items-end space-x-2">
                <button
                  onClick={exportSalesCsv}
                  disabled={isLoading}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 text-sm leading-4 font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Export Sales CSV
                </button>
                <button
                  onClick={exportInventoryCsv}
                  disabled={isLoading}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 text-sm leading-4 font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Export Inventory CSV
                </button>
              </div>
            </div>
          </div>

          {isLoading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-600"></div>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Loading reports...</p>
            </div>
          ) : (
            <>
              {/* Sales Overview */}
              <div className="mt-6">
                <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Sales Overview</h2>
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
                  <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
                    <div className="px-4 py-5 sm:p-6">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 bg-indigo-500 rounded-md p-3">
                          <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                          </svg>
                        </div>
                        <div className="ml-5 w-0 flex-1">
                          <dl>
                            <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                              Total Sales
                            </dt>
                            <dd>
                              <div className="text-lg font-medium text-gray-900 dark:text-white">
                                {calculateTotalSales()}
                              </div>
                            </dd>
                          </dl>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
                    <div className="px-4 py-5 sm:p-6">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 bg-green-500 rounded-md p-3">
                          <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <div className="ml-5 w-0 flex-1">
                          <dl>
                            <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                              Total Revenue
                            </dt>
                            <dd>
                              <div className="text-lg font-medium text-gray-900 dark:text-white">
                                {formatCurrency(calculateTotalRevenue())}
                              </div>
                            </dd>
                          </dl>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
                    <div className="px-4 py-5 sm:p-6">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 bg-yellow-500 rounded-md p-3">
                          <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <div className="ml-5 w-0 flex-1">
                          <dl>
                            <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                              Avg. Order Value
                            </dt>
                            <dd>
                              <div className="text-lg font-medium text-gray-900 dark:text-white">
                                {formatCurrency(calculateAverageOrderValue())}
                              </div>
                            </dd>
                          </dl>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Sales Chart */}
              <div className="mt-6 bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg">
                <div className="px-4 py-5 sm:px-6">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
                    Sales Trend
                  </h3>
                </div>
                <div className="px-4 py-5 sm:p-6">
                  {(Array.isArray(reportData?.salesByDay) ? reportData.salesByDay : []).length === 0 ? (
                    <p className="text-center text-gray-500 dark:text-gray-400">No sales data available for the selected period</p>
                  ) : (
                    <>
                      {generateSalesChart()}
                      <div className="mt-4 text-xs text-center text-gray-500 dark:text-gray-400">
                        {dateRange === 'custom' 
                          ? `${startDate || 'Start date'} to ${endDate || 'End date'}` 
                          : dateRange === 'week' ? 'Last 7 days'
                          : dateRange === 'month' ? 'Last 30 days'
                          : dateRange === 'quarter' ? 'Last 90 days'
                          : 'Last 365 days'}
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Inventory Summary */}
              <div className="mt-6">
                <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Inventory Summary</h2>
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-4">
                  <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
                    <div className="px-4 py-5 sm:p-6">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                          Total Items
                        </dt>
                        <dd className="mt-1 text-3xl font-semibold text-gray-900 dark:text-white">
                          {inventorySummary.totalItems}
                        </dd>
                      </dl>
                    </div>
                  </div>
                  <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
                    <div className="px-4 py-5 sm:p-6">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                          Inventory Value
                        </dt>
                        <dd className="mt-1 text-3xl font-semibold text-gray-900 dark:text-white">
                          {formatCurrency(inventorySummary.totalValue)}
                        </dd>
                      </dl>
                    </div>
                  </div>
                  <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
                    <div className="px-4 py-5 sm:p-6">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                          Low Stock Items
                        </dt>
                        <dd className="mt-1 text-3xl font-semibold text-yellow-500 dark:text-yellow-400">
                          {inventorySummary.lowStockItems}
                        </dd>
                      </dl>
                    </div>
                  </div>
                  <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
                    <div className="px-4 py-5 sm:p-6">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                          Out of Stock Items
                        </dt>
                        <dd className="mt-1 text-3xl font-semibold text-red-500 dark:text-red-400">
                          {inventorySummary.outOfStockItems}
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              {/* Top Selling Items */}
              <div className="mt-6 bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg">
                <div className="px-4 py-5 sm:px-6">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
                    Top Selling Items
                  </h3>
                </div>
                <div className="border-t border-gray-200 dark:border-gray-700">
                  {topSellingItems.length === 0 ? (
                    <div className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                      No sales data available for the selected period
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-700">
                          <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                              Product
                            </th>
                            <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                              Quantity Sold
                            </th>
                            <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                              Revenue
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                          {topSellingItems.map((item, index) => (
                            <tr key={index}>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                                {item.name}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-500 dark:text-gray-400">
                                {item.quantity}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900 dark:text-white">
                                {formatCurrency(item.revenue)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Offline indicator */}
          {!isOnline && (
            <div className="mt-6 bg-yellow-50 dark:bg-yellow-900/30 border-l-4 border-yellow-400 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-yellow-700 dark:text-yellow-300">
                    You are currently offline. Report data may not be up to date.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
} 