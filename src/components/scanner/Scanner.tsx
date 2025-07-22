'use client';

import { useState, useEffect, useRef } from 'react';
import { Html5Qrcode, Html5QrcodeScanner, Html5QrcodeScannerState, Html5QrcodeScanType, Html5QrcodeResult } from 'html5-qrcode';

interface ScannerProps {
  fps?: number;
  qrbox?: number;
  aspectRatio?: number;
  disableFlip?: boolean;
  verbose?: boolean;
  onScanSuccess: (decodedText: string, decodedResult: Html5QrcodeResult) => void;
  onScanFailure?: (error: string) => void;
}

export default function Scanner({
  fps = 10,
  qrbox = 250,
  aspectRatio = 1.0,
  disableFlip = false,
  verbose = false,
  onScanSuccess,
  onScanFailure
}: ScannerProps) {
  const [isStarted, setIsStarted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [hasPermission, setHasPermission] = useState(true);
  const [availableCameras, setAvailableCameras] = useState<Array<{ id: string; label: string }>>([]);
  const [selectedCamera, setSelectedCamera] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Clean up scanner when component unmounts
    return () => {
      if (scannerRef.current && scannerRef.current.getState() === Html5QrcodeScannerState.SCANNING) {
        scannerRef.current.stop().catch(error => console.error('Error stopping scanner:', error));
      }
    };
  }, []);

  const initializeScanner = async () => {
    if (!containerRef.current) return;
    
    setIsLoading(true);
    try {
      // Create scanner instance
      scannerRef.current = new Html5Qrcode(containerRef.current.id);
      
      // Get available cameras
      const devices = await Html5Qrcode.getCameras();
      if (devices && devices.length > 0) {
        setAvailableCameras(devices);
        setSelectedCamera(devices[0].id);
      } else {
        console.error('No cameras found');
        setHasPermission(false);
      }
    } catch (error) {
      console.error('Error initializing scanner:', error);
      setHasPermission(false);
    } finally {
      setIsLoading(false);
    }
  };

  const startScanner = async () => {
    if (!scannerRef.current || !selectedCamera) return;
    
    setIsLoading(true);
    try {
      await scannerRef.current.start(
        selectedCamera,
        {
          fps,
          qrbox: { width: qrbox, height: qrbox },
          aspectRatio,
          disableFlip,
          experimentalFeatures: {
            useBarCodeDetectorIfSupported: true
          }
        },
        (decodedText, decodedResult) => {
          onScanSuccess(decodedText, decodedResult);
        },
        (errorMessage) => {
          if (onScanFailure) {
            onScanFailure(errorMessage);
          }
        }
      );
      setIsStarted(true);
    } catch (error: any) {
      console.error('Error starting scanner:', error);
      if (error.toString().includes('permission')) {
        setHasPermission(false);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const stopScanner = async () => {
    if (!scannerRef.current) return;
    
    setIsLoading(true);
    try {
      await scannerRef.current.stop();
      setIsStarted(false);
    } catch (error) {
      console.error('Error stopping scanner:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCameraChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedCamera(e.target.value);
  };

  return (
    <div className="w-full">
      {!hasPermission && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 p-4 rounded-md mb-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800 dark:text-red-300">Camera access denied</h3>
              <div className="mt-2 text-sm text-red-700 dark:text-red-400">
                <p>
                  Please grant camera permission to scan barcodes and QR codes. You may need to reset permissions in your browser settings.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
      
      <div className="flex flex-col space-y-4">
        {!scannerRef.current && (
          <button
            onClick={initializeScanner}
            disabled={isLoading}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-md shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Initializing...' : 'Initialize Scanner'}
          </button>
        )}
        
        {scannerRef.current && !isStarted && (
          <div className="space-y-4">
            <div className="flex flex-col space-y-2">
              <label htmlFor="camera-select" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Select Camera
              </label>
              <select
                id="camera-select"
                value={selectedCamera || ''}
                onChange={handleCameraChange}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 dark:bg-gray-700 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 rounded-md shadow-sm"
              >
                {availableCameras.map((camera) => (
                  <option key={camera.id} value={camera.id}>
                    {camera.label || `Camera ${camera.id}`}
                  </option>
                ))}
              </select>
            </div>
            
            <button
              onClick={startScanner}
              disabled={isLoading || !selectedCamera}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-md shadow-sm disabled:opacity-50 disabled:cursor-not-allowed w-full"
            >
              {isLoading ? 'Starting Camera...' : 'Start Scanning'}
            </button>
          </div>
        )}
        
        {isStarted && (
          <button
            onClick={stopScanner}
            disabled={isLoading}
            className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-md shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Stopping...' : 'Stop Scanning'}
          </button>
        )}
      </div>
      
      <div 
        id="scanner-container" 
        ref={containerRef} 
        className="relative w-full max-w-md mx-auto mt-4 overflow-hidden rounded-lg"
        style={{ minHeight: isStarted ? '300px' : '0' }}
      >
        {/* Scanner will render here */}
        {isLoading && (
          <div className="absolute inset-0 bg-black bg-opacity-25 flex items-center justify-center">
            <div className="inline-flex items-center px-4 py-2 font-semibold leading-6 text-sm rounded-md text-white bg-indigo-500">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Processing...
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 