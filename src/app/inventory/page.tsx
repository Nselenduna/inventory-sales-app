'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import AppShell from '@/components/layout/AppShell';
import db, { Item } from '@/lib/db';
import { useNetworkStatus } from '@/lib/network';
import { formatCurrency } from '@/lib/utils';
import { useAsyncData } from '@/lib/hooks';

export default function InventoryPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isOnline = useNetworkStatus();

  // Add missing state variables
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('all');
  const [sortBy, setSortBy] = useState('name-asc');
  const [lowStockThreshold, setLowStockThreshold] = useState(5);
  const [filteredItems, setFilteredItems] = useState<Item[]>([]);

  const fetchInventory = async () => {
    // Get settings for low stock threshold
    const settings = await db.settings.toArray();
    if (settings.length > 0) {
      setLowStockThreshold(settings[0].lowStockThreshold);
    }
    // Get filter from URL if present
    const urlFilter = searchParams.get('filter');
    if (urlFilter) {
      setFilter(urlFilter);
    }
    // Get search term from URL if present
    const urlSearchTerm = searchParams.get('search');
    if (urlSearchTerm) {
      setSearchTerm(urlSearchTerm);
    }
    // Get sort by from URL if present
    const urlSortBy = searchParams.get('sort');
    if (urlSortBy) {
      setSortBy(urlSortBy);
    }
    // Get all items
    const allItems = await db.items.toArray();
    return { allItems, lowStockThreshold, urlFilter };
  };
  const { data: inventoryData, isLoading, error } = useAsyncData(fetchInventory, [searchParams]);

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

  // Filter and sort items when dependencies change
  useEffect(() => {
    // Apply filters and search term
    let result = [...inventoryData?.allItems || []];
    
    // Apply search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(item => 
        item.name.toLowerCase().includes(term) || 
        item.sku.toLowerCase().includes(term) || 
        item.barcode.toLowerCase().includes(term) ||
        (item.supplier && item.supplier.toLowerCase().includes(term))
      );
    }
    
    // Apply filter
    switch (filter) {
      case 'low-stock':
        result = result.filter(item => item.quantity <= lowStockThreshold);
        break;
      case 'out-of-stock':
        result = result.filter(item => item.quantity === 0);
        break;
      case 'in-stock':
        result = result.filter(item => item.quantity > 0);
        break;
      // 'all' case - no filtering needed
    }
    
    // Apply sorting
    const [sortField, sortDirection] = sortBy.split('-');
    result.sort((a, b) => {
      let comparison = 0;
      
      switch (sortField) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'sku':
          comparison = a.sku.localeCompare(b.sku);
          break;
        case 'quantity':
          comparison = a.quantity - b.quantity;
          break;
        case 'price':
          comparison = a.price - b.price;
          break;
        default:
          comparison = a.name.localeCompare(b.name);
      }
      
      return sortDirection === 'asc' ? comparison : -comparison;
    });
    
    setFilteredItems(result);
  }, [inventoryData?.allItems, searchTerm, filter, sortBy, lowStockThreshold]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilter(e.target.value);
    // Update URL with new filter
    const url = new URL(window.location.href);
    url.searchParams.set('filter', e.target.value);
    router.push(url.pathname + url.search);
  };

  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSortBy(e.target.value);
  };

  return (
    <AppShell>
      <div className="py-6">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
                Inventory
              </h1>
            </div>
            <div className="mt-4 flex md:ml-4 md:mt-0">
              <Link
                href="/inventory/add"
                className="ml-3 inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
              >
                Add Item
              </Link>
            </div>
          </div>

          {/* Filters and Search */}
          <div className="mt-4 bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg p-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="col-span-1">
                <label htmlFor="search" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Search
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <input
                    type="text"
                    name="search"
                    id="search"
                    value={searchTerm}
                    onChange={handleSearchChange}
                    className="block w-full pr-10 border-gray-300 dark:border-gray-700 dark:bg-gray-800 rounded-md focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    placeholder="Name, SKU, Barcode..."
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="col-span-1">
                <label htmlFor="filter" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Filter
                </label>
                <select
                  id="filter"
                  name="filter"
                  value={filter}
                  onChange={handleFilterChange}
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-700 dark:bg-gray-800 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                >
                  <option value="all">All Items</option>
                  <option value="in-stock">In Stock</option>
                  <option value="low-stock">Low Stock</option>
                  <option value="out-of-stock">Out of Stock</option>
                </select>
              </div>

              <div className="col-span-1">
                <label htmlFor="sort" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Sort By
                </label>
                <select
                  id="sort"
                  name="sort"
                  value={sortBy}
                  onChange={handleSortChange}
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-700 dark:bg-gray-800 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                >
                  <option value="name-asc">Name (A-Z)</option>
                  <option value="name-desc">Name (Z-A)</option>
                  <option value="quantity-asc">Quantity (Low to High)</option>
                  <option value="quantity-desc">Quantity (High to Low)</option>
                  <option value="price-asc">Price (Low to High)</option>
                  <option value="price-desc">Price (High to Low)</option>
                </select>
              </div>

              <div className="col-span-1">
                <div className="h-full flex items-end">
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    Showing {filteredItems.length} of {inventoryData?.allItems?.length || 0} items
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Inventory Items List */}
          <div className="mt-4">
            {isLoading ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-600"></div>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Loading items...</p>
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="text-center py-12 bg-white dark:bg-gray-800 shadow rounded-lg">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No items found</h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {searchTerm ? 
                    `No items match your search "${searchTerm}"` : 
                    'Get started by adding inventory items'}
                </p>
                <div className="mt-6">
                  <Link
                    href="/inventory/add"
                    className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    <svg className="-ml-1 mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Add Item
                  </Link>
                </div>
              </div>
            ) : (
              <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Name
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          SKU / Barcode
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Price
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Quantity
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Supplier
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Last Updated
                        </th>
                        <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {filteredItems.map((item) => (
                        <tr key={item.id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900 dark:text-white">{item.name}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-500 dark:text-gray-400">{item.sku}</div>
                            {item.barcode && (
                              <div className="text-xs text-gray-500 dark:text-gray-400">{item.barcode}</div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900 dark:text-white">{formatCurrency(item.price)}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium 
                              ${item.quantity <= 0 
                                ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' 
                                : item.quantity <= lowStockThreshold
                                ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
                                : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                              }`}>
                              {item.quantity}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              {item.supplier || '-'}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {item.lastUpdated 
                              ? new Date(item.lastUpdated).toLocaleDateString() 
                              : '-'
                            }
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <Link
                              href={`/inventory/${item.id}`}
                              className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-900 mr-4"
                            >
                              View
                            </Link>
                            <Link
                              href={`/inventory/${item.id}/edit`}
                              className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-900"
                            >
                              Edit
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Offline indicator */}
          {!isOnline && (
            <div className="mt-4 bg-yellow-50 dark:bg-yellow-900/30 border-l-4 border-yellow-400 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-yellow-700 dark:text-yellow-300">
                    You are currently offline. Changes will be synchronized when you reconnect.
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