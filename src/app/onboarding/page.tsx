'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import db from '@/lib/db';
import Image from 'next/image';

type OnboardingStep = 'welcome' | 'shop-info' | 'inventory-method' | 'complete';

export default function OnboardingPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('welcome');
  const [loading, setLoading] = useState(false);
  
  // Form state
  const [shopName, setShopName] = useState('');
  const [location, setLocation] = useState('');
  const [currency, setCurrency] = useState('GBP');
  const [lowStockThreshold, setLowStockThreshold] = useState(5);
  const [inventoryMethod, setInventoryMethod] = useState<'barcode' | 'manual'>('barcode');
  const [contactEmail, setContactEmail] = useState(user?.email || '');
  const [contactPhone, setContactPhone] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleNext = () => {
    if (currentStep === 'welcome') setCurrentStep('shop-info');
    else if (currentStep === 'shop-info') setCurrentStep('inventory-method');
    else if (currentStep === 'inventory-method') setCurrentStep('complete');
  };

  const handleComplete = async () => {
    setLoading(true);
    setError(null); // Reset error state
    
    try {
      // Try to validate Supabase connection first
      try {
        const { error: connectionError } = await supabase.from('shop_settings').select('count').limit(1);
        if (connectionError) {
          throw new Error(`Supabase connection error: ${connectionError.message}`);
        }
      } catch (connectionError) {
        console.error('Supabase connection test failed:', connectionError);
        setError('Could not connect to database. Please check your internet connection and try again.');
        setLoading(false);
        return;
      }
      
      // Create shop settings in Supabase
      const { data: shopData, error: shopError } = await supabase
        .from('shop_settings')
        .insert({
          name: shopName,
          location,
          currency,
          low_stock_threshold: lowStockThreshold,
          owner_id: user?.id,
          contact_email: contactEmail,
          contact_phone: contactPhone,
          inventory_method: inventoryMethod
        })
        .select()
        .single();

      if (shopError) {
        // Instead of throwing, store error in state
        const errorMessage = shopError.message || 'Error saving shop settings';
        console.error('Supabase error message:', errorMessage, shopError);
        setError(errorMessage);
        return; // Exit function early
      }

      // Store settings locally in IndexedDB
      await db.settings.add({
        name: shopName,
        location,
        currency,
        lowStockThreshold,
        contactEmail,
        contactPhone
      });

      // Redirect to dashboard using direct window location for reliability
      router.push('/dashboard');
    } catch (error) {
      console.error('Error saving settings:', error);
      setError(error instanceof Error ? error.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      {/* Progress bar */}
      <div className="w-full bg-gray-200 dark:bg-gray-800 h-2">
        <div 
          className="bg-indigo-600 h-2 transition-all duration-300"
          style={{ 
            width: currentStep === 'welcome' ? '25%' : 
                  currentStep === 'shop-info' ? '50%' : 
                  currentStep === 'inventory-method' ? '75%' : '100%' 
          }}
        />
      </div>
      
      <div className="flex-1 flex flex-col justify-center items-center p-4">
        <div className="w-full max-w-md">
          {/* App Title - replacing the Next.js logo */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">
              Inventory & Sales
            </h1>
          </div>

          {currentStep === 'welcome' && (
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                Welcome to Inventory & Sales Manager
              </h2>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                Let's set up your shop to help you manage inventory and track sales efficiently.
                This will only take a few minutes.
              </p>
              <button
                onClick={handleNext}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none"
              >
                Get Started
              </button>
            </div>
          )}

          {currentStep === 'shop-info' && (
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                Shop Information
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label htmlFor="shopName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Shop Name *
                  </label>
                  <input
                    type="text"
                    id="shopName"
                    value={shopName}
                    onChange={(e) => setShopName(e.target.value)}
                    required
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
                
                <div>
                  <label htmlFor="location" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Location
                  </label>
                  <input
                    type="text"
                    id="location"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="currency" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Currency
                    </label>
                    <select
                      id="currency"
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
                    >
                      <option value="GBP">GBP (£)</option>
                      <option value="USD">USD ($)</option>
                      <option value="EUR">EUR (€)</option>
                    </select>
                  </div>
                  
                  <div>
                    <label htmlFor="threshold" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Low Stock Alert
                    </label>
                    <input
                      type="number"
                      id="threshold"
                      min="1"
                      value={lowStockThreshold}
                      onChange={(e) => setLowStockThreshold(parseInt(e.target.value) || 5)}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                </div>
                
                <div>
                  <label htmlFor="contactEmail" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Contact Email
                  </label>
                  <input
                    type="email"
                    id="contactEmail"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
                
                <div>
                  <label htmlFor="contactPhone" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Contact Phone
                  </label>
                  <input
                    type="tel"
                    id="contactPhone"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </div>

              <div className="mt-6">
                <button
                  onClick={handleNext}
                  disabled={!shopName}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {currentStep === 'inventory-method' && (
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                Inventory Method
              </h2>
              
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                Choose how you'd like to primarily manage your inventory:
              </p>
              
              <div className="space-y-4">
                <div 
                  className={`border ${inventoryMethod === 'barcode' ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' : 'border-gray-300 dark:border-gray-600'} rounded-lg p-4 cursor-pointer`}
                  onClick={() => setInventoryMethod('barcode')}
                >
                  <div className="flex items-center">
                    <div className={`w-5 h-5 rounded-full border ${inventoryMethod === 'barcode' ? 'border-indigo-600 bg-indigo-600' : 'border-gray-400'} flex items-center justify-center mr-3`}>
                      {inventoryMethod === 'barcode' && (
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900 dark:text-white">Barcode / QR Scanning</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Use camera to scan barcodes or QR codes</p>
                    </div>
                  </div>
                </div>
                
                <div 
                  className={`border ${inventoryMethod === 'manual' ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' : 'border-gray-300 dark:border-gray-600'} rounded-lg p-4 cursor-pointer`}
                  onClick={() => setInventoryMethod('manual')}
                >
                  <div className="flex items-center">
                    <div className={`w-5 h-5 rounded-full border ${inventoryMethod === 'manual' ? 'border-indigo-600 bg-indigo-600' : 'border-gray-400'} flex items-center justify-center mr-3`}>
                      {inventoryMethod === 'manual' && (
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900 dark:text-white">Manual Entry</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Manually add inventory items and SKUs</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <button
                  onClick={handleNext}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none"
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {currentStep === 'complete' && (
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
              <div className="text-center mb-6">
                <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-4">
                  <svg className="h-8 w-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  You're all set!
                </h2>
                <p className="mt-2 text-gray-600 dark:text-gray-300">
                  Your shop has been configured. You're ready to start managing your inventory and sales.
                </p>
              </div>

              {error && (
                <div className="mb-4 p-3 rounded-md bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800">
                  <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                  <button 
                    className="text-xs text-indigo-600 dark:text-indigo-400 mt-2 hover:underline"
                    onClick={() => window.location.reload()}
                  >
                    Refresh page
                  </button>
                </div>
              )}
              
              {/* Shop Summary */}
              <div className="bg-gray-50 dark:bg-gray-900/50 rounded-md p-4 mb-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 text-center">Shop Summary</h3>
                
                <div className="grid grid-cols-2 gap-y-2">
                  <p className="text-gray-600 dark:text-gray-400">Shop Name:</p>
                  <p className="text-right text-gray-900 dark:text-white">{shopName}</p>
                  
                  <p className="text-gray-600 dark:text-gray-400">Location:</p>
                  <p className="text-right text-gray-900 dark:text-white">{location}</p>
                  
                  <p className="text-gray-600 dark:text-gray-400">Currency:</p>
                  <p className="text-right text-gray-900 dark:text-white">{currency}</p>
                  
                  <p className="text-gray-600 dark:text-gray-400">Low Stock Alert:</p>
                  <p className="text-right text-gray-900 dark:text-white">{lowStockThreshold} items</p>
                  
                  <p className="text-gray-600 dark:text-gray-400">Inventory Method:</p>
                  <p className="text-right text-gray-900 dark:text-white">
                    {inventoryMethod === 'barcode' ? 'Barcode/QR Scanning' : 'Manual Entry'}
                  </p>
                </div>
              </div>
              
              <button
                onClick={async () => {
                  try {
                    await handleComplete();
                  } catch (e) {
                    console.error('Error during dashboard navigation:', e instanceof Error ? e.message : 'Unknown error');
                    setError('Failed to save settings. Please try again.');
                  }
                }}
                disabled={loading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none disabled:bg-indigo-400 disabled:cursor-not-allowed"
              >
                {loading ? 'Saving...' : 'Go to Dashboard'}
              </button>
              
              {error && (
                <div className="mt-4 text-center">
                  <button
                    className="text-indigo-600 dark:text-indigo-400 text-sm hover:underline"
                    onClick={() => router.push('/dashboard')}
                  >
                    Skip and go to dashboard anyway
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 