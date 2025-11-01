// components/scanner/ScannerContent.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import {
  ShoppingCart, X, Trash2, QrCode, Barcode,
  CheckCircle, ChevronLeft, ChevronRight
} from 'lucide-react';

export default function ScannerContent({
  title,
  description,
  icon: Icon,
  onSubmit,
}: {
  title: string;
  description: string;
  icon: React.ElementType;
  onSubmit: (items: any[]) => Promise<void>;
}) {
  const [cartItems, setCartItems] = useState<any[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scannerError, setScannerError] = useState<string | null>(null);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerRegionId = "qr-reader";

  const safeStopAndClear = async (inst: Html5Qrcode | null) => {
    if (!inst) return;
    try {
      if ((inst as any).isScanning) {
        const maybe = (inst.stop as any)();
        if (maybe && typeof maybe.then === "function") await maybe;
      }
    } catch (e) { console.warn("Error stopping scanner", e); }
    try { (inst.clear as any)(); } catch (e) { console.warn("Error clearing", e); }
  };

  useEffect(() => {
    if (isScanning) {
      const startScanner = async () => {
        if (scannerRef.current) return;
        try {
          const scanner = new Html5Qrcode(scannerRegionId);
          scannerRef.current = scanner;

          const config = { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 };

          const onScanSuccess = (decodedText: string) => {
            scanner.pause(true);
            const newItem = {
              id: Date.now(),
              code: decodedText,
              time: new Date().toLocaleTimeString(),
              name: `${title.split(" ")[0]} - ${decodedText}`,
            };
            setCartItems(prev => [...prev, newItem]);
            setShowCart(true);

            const audio = new Audio("data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBTGH0fPTgjMGHm7A7+OZUQ0PVKzn77BdGgU+mtn0xG8qBSuBzvLZiTYIGWe77OWfTRAMUKnj7K5iHAY5j9n0xXksBS");
            audio.play().catch(() => {});

            setTimeout(() => scannerRef.current?.resume(), 800);
          };

          await (scanner as any).start(
            { facingMode: "environment" },
            config,
            onScanSuccess,
            () => {}
          );
        } catch (error: any) {
          setScannerError(error.message || "Camera access denied.");
          setIsScanning(false);
        }
      };
      startScanner();
    }

    return () => {
      safeStopAndClear(scannerRef.current);
      scannerRef.current = null;
    };
  }, [isScanning, title]);

  const handleStartClick = () => { setScannerError(null); setIsScanning(true); };
  const stopScanning = () => setIsScanning(false);
  const removeItem = (id: number) => setCartItems(prev => prev.filter(i => i.id !== id));

  const handleConfirm = async () => {
    if (cartItems.length === 0) return alert("Scan at least one item.");
    if (isScanning) stopScanning();
    await onSubmit(cartItems);
  };

  return (
    <div className="p-4 lg:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-md mb-6 overflow-hidden">
          <div className="px-6 py-4 bg-gradient-to-r from-red-700 to-red-500 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Icon className="w-8 h-8" />
                <div>
                  <h1 className="text-2xl font-bold">{title}</h1>
                  <p className="text-sm text-red-100">{description}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-red-100">Scanned Items</p>
                <p className="text-3xl font-bold">{cartItems.length}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md mb-6">
          <div className="p-6 lg:p-8">
            {!isScanning ? (
              <div
                onClick={handleStartClick}
                className="relative w-full h-64 lg:h-80 border-4 border-dashed border-gray-300 rounded-2xl flex flex-col items-center justify-center bg-gradient-to-br from-gray-50 to-white hover:border-red-400 transition-all cursor-pointer"
              >
                <QrCode className="w-20 h-20 text-red-600 animate-pulse mb-4" />
                <Barcode className="w-20 h-20 text-black opacity-20 absolute" />
                <p className="text-lg font-medium text-gray-700">Click to Scan</p>
                <p className="text-sm text-gray-500 mt-2">Position the code within the frame</p>
              </div>
            ) : (
              <div className="w-full text-center">
                <div id={scannerRegionId} className="w-full max-w-md mx-auto rounded-lg overflow-hidden border-2 border-gray-200" />
                <button
                  onClick={stopScanning}
                  className="mt-4 px-6 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors font-medium shadow-md"
                >
                  Stop Scanning
                </button>
              </div>
            )}

            {scannerError && (
              <div className="mt-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg text-center">
                <strong>Error:</strong> {scannerError}
              </div>
            )}

            <div className="mt-6 p-4 bg-red-50 rounded-lg">
              <h3 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                <Icon className="w-5 h-5 text-red-600" />
                Scanning Tips:
              </h3>
              <ul className="text-sm text-gray-600 space-y-1 ml-7">
                <li>• Ensure good lighting conditions</li>
                <li>• Hold device steady</li>
                <li>• Keep code centered in frame</li>
                <li>• Works with both QR codes and barcodes</li>
              </ul>
            </div>
          </div>
        </div>

        {showCart && cartItems.length > 0 && (
          <div className="bg-white rounded-lg shadow-md mb-6">
            <div className="px-6 py-4 bg-gray-50 border-b flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                <ShoppingCart className="w-5 h-5" />
                Scanned Items Cart ({cartItems.length})
              </h2>
              <button onClick={() => setShowCart(false)} className="text-gray-500 hover:text-red-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 max-h-96 overflow-y-auto">
              {cartItems.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-4 border-b hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                      <Icon className="w-6 h-6 text-red-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{item.name}</p>
                      <p className="text-sm text-gray-500 font-mono">{item.code}</p>
                      <p className="text-xs text-gray-400">{item.time}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => removeItem(item.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>
            <div className="px-6 py-4 bg-gray-50 border-t">
              <button
                onClick={handleConfirm}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium shadow-md"
              >
                <CheckCircle className="w-5 h-5" />
                Confirm & Submit ({cartItems.length} items)
              </button>
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-md">
          <div className="px-4 lg:px-6 py-4 bg-gray-50">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <button
                onClick={() => window.history.back()}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors font-medium shadow-md"
              >
                <ChevronLeft className="w-5 h-5" />
                Back to Home
              </button>
              <span className="text-sm text-gray-600">
                {cartItems.length > 0 ? `${cartItems.length} items in cart` : "Scan items to continue"}
              </span>
              <button
                onClick={handleConfirm}
                disabled={cartItems.length === 0}
                className={`w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-lg transition-colors font-medium shadow-md ${
                  cartItems.length > 0
                    ? "bg-red-600 text-white hover:bg-red-700"
                    : "bg-gray-300 text-gray-500 cursor-not-allowed"
                }`}
              >
                Submit
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}