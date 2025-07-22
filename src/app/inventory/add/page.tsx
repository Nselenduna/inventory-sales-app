'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import AppShell from '@/components/layout/AppShell';
import db from '@/lib/db';
import Link from 'next/link';

type FormErrors = {
  name?: string;
  sku?: string;
  barcode?: string;
  price?: string;
  quantity?: string;
};

export default function AddItemPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Initialize form with barcode from URL if available
  const initialBarcode = searchParams.get('barcode') || '';

  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    barcode: initialBarcode,
    price: '',
    costPrice: '',
    quantity: '0',
    supplier: '',
    category: '',
    notes: ''
  });
  const [errors, setErrors] = useState<FormErrors>({});

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error when field is edited
    if (errors[name as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  const validateForm = () => {
    const newErrors: FormErrors = {};
    
    // Required fields
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }
    
    if (!formData.sku.trim()) {
      newErrors.sku = 'SKU is required';
    }
    
    // Price must be a valid number
    const price = parseFloat(formData.price);
    if (isNaN(price) || price < 0) {
      newErrors.price = 'Price must be a valid number';
    }
    
    // Quantity must be a valid integer
    const quantity = parseInt(formData.quantity);
    if (isNaN(quantity) || quantity < 0) {
      newErrors.quantity = 'Quantity must be a valid number';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setIsLoading(true);
    try {
      // Check if SKU or barcode already exists
      const skuExists = await db.items.where('sku').equals(formData.sku).count();
      if (skuExists > 0) {
        setErrors(prev => ({ ...prev, sku: 'This SKU already exists' }));
        setIsLoading(false);
        return;
      }
      
      if (formData.barcode) {
        const barcodeExists = await db.items.where('barcode').equals(formData.barcode).count();
        if (barcodeExists > 0) {
          setErrors(prev => ({ ...prev, barcode: 'This barcode already exists' }));
          setIsLoading(false);
          return;
        }
      }
      
      // Add item to database
      await db.items.add({
        name: formData.name,
        sku: formData.sku,
        barcode: formData.barcode,
        price: parseFloat(formData.price) || 0,
        costPrice: parseFloat(formData.costPrice) || 0,
        quantity: parseInt(formData.quantity) || 0,
        supplier: formData.supplier,
        category: formData.category,
        lastUpdated: new Date(),
        syncStatus: 'pending' // Mark for sync with server
      });
      
      // Add stock movement record for initial stock
      if (parseInt(formData.quantity) > 0) {
        // Get the newly added item to get its ID
        const newItem = await db.items
          .where('sku')
          .equals(formData.sku)
          .first();
        
        if (newItem?.id) {
          await db.stockMovements.add({
            itemId: newItem.id.toString(),
            quantity: parseInt(formData.quantity),
            type: 'intake',
            timestamp: new Date(),
            notes: 'Initial stock',
            syncStatus: 'pending'
          });
        }
      }
      
      // Redirect back to inventory list
      router.push('/inventory');
      
    } catch (error) {
      console.error('Error adding item:', error);
      alert('An error occurred while adding the item. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const generateSku = () => {
    // Generate a simple SKU based on the name and a timestamp
    if (formData.name) {
      const prefix = formData.name.substring(0, 3).toUpperCase();
      const timestamp = Date.now().toString().substring(7);
      const newSku = `${prefix}-${timestamp}`;
      setFormData(prev => ({ ...prev, sku: newSku }));
    }
  };

  return (
    <AppShell>
      <div className="py-6">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Add New Item</h1>
            <Link
              href="/inventory"
              className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
            >
              Cancel
            </Link>
          </div>

          <form onSubmit={handleSubmit} className="mt-6 bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                <div className="sm:col-span-6">
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Name *
                  </label>
                  <div className="mt-1">
                    <input
                      type="text"
                      name="name"
                      id="name"
                      required
                      value={formData.name}
                      onChange={handleInputChange}
                      className={`shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 rounded-md ${errors.name ? 'border-red-300 dark:border-red-500' : ''}`}
                      placeholder="Product name"
                    />
                    {errors.name && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{errors.name}</p>}
                  </div>
                </div>

                <div className="sm:col-span-3">
                  <label htmlFor="sku" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    SKU *
                  </label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <input
                      type="text"
                      name="sku"
                      id="sku"
                      required
                      value={formData.sku}
                      onChange={handleInputChange}
                      className={`shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 rounded-md ${errors.sku ? 'border-red-300 dark:border-red-500' : ''}`}
                      placeholder="Stock keeping unit"
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center">
                      <button
                        type="button"
                        onClick={generateSku}
                        className="h-full py-0 px-2 text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                      >
                        Generate
                      </button>
                    </div>
                    {errors.sku && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{errors.sku}</p>}
                  </div>
                </div>

                <div className="sm:col-span-3">
                  <label htmlFor="barcode" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Barcode
                  </label>
                  <div className="mt-1">
                    <input
                      type="text"
                      name="barcode"
                      id="barcode"
                      value={formData.barcode}
                      onChange={handleInputChange}
                      className={`shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 rounded-md ${errors.barcode ? 'border-red-300 dark:border-red-500' : ''}`}
                      placeholder="UPC, EAN, or QR code value"
                    />
                    {errors.barcode && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{errors.barcode}</p>}
                  </div>
                </div>

                <div className="sm:col-span-3">
                  <label htmlFor="price" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Selling Price *
                  </label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-gray-500 dark:text-gray-400 sm:text-sm">£</span>
                    </div>
                    <input
                      type="number"
                      name="price"
                      id="price"
                      required
                      min="0"
                      step="0.01"
                      value={formData.price}
                      onChange={handleInputChange}
                      className={`pl-7 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 rounded-md ${errors.price ? 'border-red-300 dark:border-red-500' : ''}`}
                      placeholder="0.00"
                    />
                    {errors.price && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{errors.price}</p>}
                  </div>
                </div>

                <div className="sm:col-span-3">
                  <label htmlFor="costPrice" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Cost Price
                  </label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-gray-500 dark:text-gray-400 sm:text-sm">£</span>
                    </div>
                    <input
                      type="number"
                      name="costPrice"
                      id="costPrice"
                      min="0"
                      step="0.01"
                      value={formData.costPrice}
                      onChange={handleInputChange}
                      className="pl-7 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 rounded-md"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label htmlFor="quantity" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Initial Stock Quantity
                  </label>
                  <div className="mt-1">
                    <input
                      type="number"
                      name="quantity"
                      id="quantity"
                      min="0"
                      step="1"
                      value={formData.quantity}
                      onChange={handleInputChange}
                      className={`shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 rounded-md ${errors.quantity ? 'border-red-300 dark:border-red-500' : ''}`}
                    />
                    {errors.quantity && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{errors.quantity}</p>}
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label htmlFor="supplier" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Supplier
                  </label>
                  <div className="mt-1">
                    <input
                      type="text"
                      name="supplier"
                      id="supplier"
                      value={formData.supplier}
                      onChange={handleInputChange}
                      className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 rounded-md"
                      placeholder="Supplier name"
                    />
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label htmlFor="category" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Category
                  </label>
                  <div className="mt-1">
                    <input
                      type="text"
                      name="category"
                      id="category"
                      value={formData.category}
                      onChange={handleInputChange}
                      className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 rounded-md"
                      placeholder="e.g. Electronics, Clothing"
                    />
                  </div>
                </div>

                <div className="sm:col-span-6">
                  <label htmlFor="notes" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Notes
                  </label>
                  <div className="mt-1">
                    <textarea
                      id="notes"
                      name="notes"
                      rows={3}
                      value={formData.notes}
                      onChange={handleInputChange}
                      className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 rounded-md"
                      placeholder="Optional notes about this item"
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700 text-right sm:px-6">
              <button
                type="submit"
                disabled={isLoading}
                className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Saving...' : 'Save Item'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </AppShell>
  );
} 