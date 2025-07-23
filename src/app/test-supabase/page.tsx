'use client';

import { useState } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

export default function TestSupabasePage() {
  const [testResults, setTestResults] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const addResult = (message: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const runTests = async () => {
    setIsLoading(true);
    setTestResults([]);
    
    try {
      // Test 1: Environment variables
      addResult('Checking environment variables...');
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      addResult(`URL set: ${!!url}`);
      addResult(`Key set: ${!!key}`);
      if (url) addResult(`URL: ${url.substring(0, 30)}...`);

      // Test 2: Check if Supabase is configured
      addResult('Checking Supabase configuration...');
      if (!isSupabaseConfigured()) {
        addResult('ERROR: Supabase not configured - missing URL or key');
        return;
      }
      addResult('Supabase configuration OK');

      // Test 3: Supabase auth endpoint
      addResult('Testing Supabase auth...');
      try {
        const { data, error } = await supabase!.auth.getSession();
        if (error) {
          addResult(`Auth test failed: ${error.message}`);
        } else {
          addResult('Auth test successful');
        }
      } catch (error) {
        addResult(`Auth test error: ${error}`);
      }

      // Test 4: Try to sign up (this will test the actual auth functionality)
      addResult('Testing signup functionality...');
      try {
        const { data, error } = await supabase!.auth.signUp({
          email: 'test@example.com',
          password: 'testpassword123'
        });
        
        if (error) {
          if (error.message.includes('already registered')) {
            addResult('Signup test: Email already registered (expected)');
          } else {
            addResult(`Signup test failed: ${error.message}`);
          }
        } else {
          addResult('Signup test successful');
        }
      } catch (error) {
        addResult(`Signup test error: ${error}`);
      }
      
    } catch (error) {
      addResult(`Test error: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Supabase Connection Test</h1>
      
      <button 
        onClick={runTests}
        disabled={isLoading}
        className="mb-4 px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50"
      >
        {isLoading ? 'Running Tests...' : 'Run Tests'}
      </button>

      <div className="bg-gray-100 p-4 rounded">
        <h2 className="font-bold mb-2">Test Results:</h2>
        {testResults.length === 0 ? (
          <p className="text-gray-500">Click "Run Tests" to start</p>
        ) : (
          <div className="space-y-1">
            {testResults.map((result, index) => (
              <div key={index} className="text-sm font-mono">{result}</div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 