"use client";
import React, { useState, useEffect, useRef } from "react";
// Import the core Html5Qrcode class
import { Html5Qrcode } from "html5-qrcode";
// Import your Supabase client
import { supabase } from "@/lib/supabase"; // <-- MODIFICATION 1
import {
  QrCode,
  Barcode,
  ChevronLeft,
  ChevronRight,
  Menu,
  CheckCircle,
  UserCircle,
  Settings,
  LogOut,
  Search,
  Home,
  Package,
  MapPin,
  Building2,
  Users,
  ChevronDown,
  X,
  Trash2,
  ShoppingCart,
  Check,
} from "lucide-react";

// ==================================================================
// == Success Page Component (No changes)
// ==================================================================
function SuccessPage({
  onBack,
  scannedCount,
  scanType,
}: {
  onBack: () => void;
  scannedCount: number;
  scanType: string;
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      const width = window.innerWidth;
      setIsMobile(width < 768);
      setIsSidebarOpen(width >= 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      {isMobile && isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <div className="fixed top-0 left-0 right-0 bg-white shadow-md z-20 h-16">
        <div className="flex items-center justify-between h-full px-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg"
            >
              <Menu className="w-6 h-6" />
            </button>
            <span className="text-lg font-bold text-red-600">
              Asset Tracking
            </span>
          </div>
          <button className="flex items-center gap-2 p-2 hover:bg-gray-100 rounded-lg">
            <div className="w-10 h-10 rounded-full bg-red-600 flex items-center justify-center text-white font-bold">
              JD
            </div>
          </button>
        </div>
      </div>

      <Sidebar
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
        isMobile={isMobile}
      />

      <div
        className={`pt-16 transition-all duration-300 ${
          isSidebarOpen && !isMobile ? "ml-64" : "ml-0"
        }`}
      >
        <div className="p-4 lg:p-8">
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-lg shadow-md p-8 lg:p-12 text-center">
              {/* Success Icon */}
              <div className="inline-flex items-center justify-center w-24 h-24 bg-green-100 rounded-full mb-6 animate-bounce">
                <Check className="w-12 h-12 text-green-600" />
              </div>

              {/* Success Message */}
              <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
                Submission Successful!
              </h1>
              <p className="text-xl text-gray-600 mb-8">
                {scannedCount} {scanType}{" "}
                {scannedCount === 1 ? "item has" : "items have"} been
                successfully submitted.
              </p>

              {/* Success Details */}
              <div className="bg-green-50 border-2 border-green-200 rounded-lg p-6 mb-8 max-w-md mx-auto">
                <div className="flex items-center justify-center gap-2 text-green-800 mb-2">
                  <CheckCircle className="w-6 h-6" />
                  <span className="font-semibold text-lg">
                    Confirmation Details
                  </span>
                </div>
                <div className="text-sm text-green-700 space-y-2 mt-4">
                  <p>
                    Total Items:{" "}
                    <span className="font-bold">{scannedCount}</span>
                  </p>
                  <p>
                    Status: <span className="font-bold">Confirmed</span>
                  </p>
                  <p>
                    Date:{" "}
                    <span className="font-bold">
                      {new Date().toLocaleDateString()}
                    </span>
                  </p>
                  <p>
                    Time:{" "}
                    <span className="font-bold">
                      {new Date().toLocaleTimeString()}
                    </span>
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button
                  onClick={onBack}
                  className="px-8 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium shadow-md"
                >
                  Scan More Items
                </button>
                <button
                  onClick={() => (window.location.href = "#")}
                  className="px-8 py-3 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors font-medium shadow-md"
                >
                  View All Submissions
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==================================================================
// == Welcome Page Component (No changes)
// ==================================================================
function WelcomePage({ onNavigate }: { onNavigate: (page: string) => void }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      const width = window.innerWidth;
      setIsMobile(width < 768);
      setIsSidebarOpen(width >= 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const scanOptions = [
    {
      title: "Asset Scan",
      icon: Package,
      page: "asset",
      color: "from-red-600 to-red-500",
      description: "Scan asset QR codes or barcodes",
    },
    {
      title: "Staff ID Scan",
      icon: Users,
      page: "staff",
      color: "from-black to-gray-800",
      description: "Scan staff identification codes",
    },
    {
      title: "Location Scan",
      icon: MapPin,
      page: "location",
      color: "from-red-700 to-red-600",
      description: "Scan location QR codes or barcodes",
    },
    {
      title: "Department Scan",
      icon: Building2,
      page: "department",
      color: "from-gray-800 to-black",
      description: "Scan department codes",
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {isMobile && isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <div className="fixed top-0 left-0 right-0 bg-white shadow-md z-20 h-16">
        <div className="flex items-center justify-between h-full px-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg"
            >
              <Menu className="w-6 h-6" />
            </button>
            <span className="text-lg font-bold text-red-600">
              Asset Tracking
            </span>
          </div>
          <button
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className="flex items-center gap-2 p-2 hover:bg-gray-100 rounded-lg"
          >
            <div className="w-10 h-10 rounded-full bg-red-600 flex items-center justify-center text-white font-bold">
              JD
            </div>
            {!isMobile && (
              <span className="font-medium text-gray-700">John Doe</span>
            )}
          </button>
        </div>
      </div>

      <Sidebar
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
        isMobile={isMobile}
      />

      <div
        className={`pt-16 transition-all duration-300 ${
          isSidebarOpen && !isMobile ? "ml-64" : "ml-0"
        }`}
      >
        <div className="p-4 lg:p-8">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-red-600 rounded-full mb-4">
                <Package className="w-10 h-10 text-white" />
              </div>
              <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
                Welcome to Asset Tracking!
              </h1>
              <p className="text-xl text-gray-600">
                Choose a scanning option to get started
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              {scanOptions.map((option) => (
                <button
                  key={option.page}
                  onClick={() => onNavigate(option.page)}
                  className={`group relative bg-gradient-to-r ${option.color} text-white rounded-2xl shadow-xl hover:shadow-2xl transform hover:-translate-y-1 transition-all duration-300 p-8 overflow-hidden text-left`}
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500" />
                  <div className="relative z-10">
                    <option.icon className="w-12 h-12 mb-4" />
                    <h3 className="text-2xl font-bold mb-2">{option.title}</h3>
                    <p className="text-white text-opacity-90">
                      {option.description}
                    </p>
                  </div>
                </button>
              ))}
            </div>

            <div className="bg-white rounded-lg shadow-md">
              <div className="px-4 lg:px-6 py-4 bg-gray-50">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <button className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors font-medium shadow-md">
                    <ChevronLeft className="w-5 h-5" />
                    Previous
                  </button>
                  <span className="text-sm text-gray-600">
                    Select a scan type to continue
                  </span>
                  <button className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium shadow-md">
                    Next
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==================================================================
// == SCANNER PAGE (MODIFIED)
// ==================================================================
function ScannerPage({
  title,
  description,
  icon: Icon,
  onBack,
  onSubmit,
}: {
  title: string;
  description: string;
  icon: React.ElementType;
  onBack: () => void;
  onSubmit: (items: any[]) => Promise<void>; // <-- MODIFICATION: Note that onSubmit is now async
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [cartItems, setCartItems] = useState<any[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scannerError, setScannerError] = useState<string | null>(null);

  // Use a ref for the Html5Qrcode instance
  const scannerRef = useRef<Html5Qrcode | null>(null);
  // Define the ID for the scanner element
  const scannerRegionId = "qr-reader";

  useEffect(() => {
    const checkMobile = () => {
      const width = window.innerWidth;
      setIsMobile(width < 768);
      setIsSidebarOpen(width >= 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Helper function from QrScanUI.tsx to safely stop and clear the scanner
  const safeStopAndClear = async (inst: Html5Qrcode | null) => {
    if (!inst) return;
    try {
      if ((inst as any).isScanning) {
        const maybe = (inst.stop as any)();
        if (maybe && typeof maybe.then === "function") {
          await maybe;
        }
      }
    } catch (e) {
      console.warn("Error stopping HTML5 Qrcode scanner", e);
    }
    try {
      (inst.clear as any)();
    } catch (e) {
      console.warn("Error clearing HTML5 Qrcode scanner", e);
    }
  };

  // Main useEffect for Scanner Logic
  useEffect(() => {
    if (isScanning) {
      const startScannerInstance = async () => {
        if (scannerRef.current) return;

        try {
          const scanner = new Html5Qrcode(scannerRegionId);
          scannerRef.current = scanner;

          const config = {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0,
          };

          const onScanSuccess = (decodedText: string, decodedResult: any) => {
            scanner.pause(true);

            const newItem = {
              id: Date.now(),
              code: decodedText,
              time: new Date().toLocaleTimeString(),
              name: `${title.split(" ")[0]} - ${decodedText}`,
              format: decodedResult?.result?.format?.formatName || "Unknown",
            };

            setCartItems((prev) => [...prev, newItem]);
            setShowCart(true);

            const audio = new Audio(
              "data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBTGH0fPTgjMGHm7A7+OZUQ0PVKzn77BdGgU+mtn0xG8qBSuBzvLZiTYIGWe77OWfTRAMUKnj7K5iHAY5j9n0xXksBS"
            );
            audio.play().catch(() => {});

            setTimeout(() => {
              if (scannerRef.current) {
                scanner.resume();
              }
            }, 800);
          };

          const onScanFailure = (errorMessage: string) => {
            // ignore
          };

          await (scanner as any).start(
            { facingMode: "environment" },
            config,
            onScanSuccess,
            onScanFailure
          );
        } catch (error: any) {
          console.error("Failed to start scanner:", error);
          setScannerError(
            error.message ||
              "Failed to start camera. Please grant camera permissions."
          );
          setIsScanning(false);
          scannerRef.current = null;
        }
      };

      startScannerInstance();
    }

    return () => {
      const scannerInstance = scannerRef.current;
      scannerRef.current = null;
      (async () => {
        await safeStopAndClear(scannerInstance);
      })();
    };
  }, [isScanning, title]);

  // Click handler to START scanning
  const handleStartClick = () => {
    setScannerError(null);
    setIsScanning(true);
  };

  // Click handler to STOP scanning
  const stopScanning = () => {
    setIsScanning(false);
  };

  const removeItem = (id: number) => {
    setCartItems(cartItems.filter((item) => item.id !== id));
  };

  // -----------------------------------------------------------------
  // == MODIFICATION 3: Make handleConfirm async
  // -----------------------------------------------------------------
  const handleConfirm = async () => {
    if (cartItems.length === 0) {
      alert("Please scan at least one item before submitting.");
      return;
    }
    if (isScanning) {
      stopScanning();
    }
    
    try {
      // Wait for the Supabase insert to complete
      await onSubmit(cartItems);
    } catch (error) {
      // The error is already logged in handleSubmit,
      // but you could add user feedback here if needed.
      console.error("Submission failed", error);
    }
  };

  const handleBack = () => {
    if (isScanning) {
      stopScanning();
    }
    onBack();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ... (Sidebar and Header JSX - no changes) ... */}
      {isMobile && isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
      <div className="fixed top-0 left-0 right-0 bg-white shadow-md z-20 h-16">
        {/* ... (Header content - no changes) ... */}
        <div className="flex items-center justify-between h-full px-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg"
            >
              <Menu className="w-6 h-6" />
            </button>
            {!isMobile && (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search..."
                  className="pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600 w-64"
                />
              </div>
            )}
            {isMobile && (
              <span className="text-lg font-bold text-red-600">
                Asset Tracking
              </span>
            )}
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowCart(!showCart)}
              className="relative p-2 text-gray-700 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <ShoppingCart className="w-6 h-6" />
              {cartItems.length > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-600 text-white text-xs rounded-full flex items-center justify-center">
                  {cartItems.length}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      <Sidebar
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
        isMobile={isMobile}
      />

      <div
        className={`pt-16 transition-all duration-300 ${
          isSidebarOpen && !isMobile ? "ml-64" : "ml-0"
        }`}
      >
        <div className="p-4 lg:p-8">
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-lg shadow-md mb-6 overflow-hidden">
              {/* ... (Header card - no changes) ... */}
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
                {/* ... (Scanner UI - no changes) ... */}
                {!isScanning && (
                  <div
                    onClick={handleStartClick}
                    className="relative w-full h-64 lg:h-80 border-4 border-dashed border-gray-300 rounded-2xl flex flex-col items-center justify-center bg-gradient-to-br from-gray-50 to-white hover:border-red-400 transition-all cursor-pointer"
                  >
                    <QrCode className="w-20 h-20 text-red-600 animate-pulse mb-4" />
                    <Barcode className="w-20 h-20 text-black opacity-20 absolute" />
                    <p className="text-lg font-medium text-gray-700">
                      Click to Scan
                    </p>
                    <p className="text-sm text-gray-500 mt-2">
                      Position the code within the frame
                    </p>
                  </div>
                )}

                {isScanning && (
                  <div className="w-full text-center">
                    <div
                      id={scannerRegionId}
                      className="w-full max-w-md mx-auto rounded-lg overflow-hidden border-2 border-gray-200"
                    />
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

            {/* Shopping Cart (No changes) */}
            {showCart && cartItems.length > 0 && (
              <div className="bg-white rounded-lg shadow-md mb-6">
                <div className="px-6 py-4 bg-gray-50 border-b flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                    <ShoppingCart className="w-5 h-5" />
                    Scanned Items Cart ({cartItems.length})
                  </h2>
                  <button
                    onClick={() => setShowCart(false)}
                    className="text-gray-500 hover:text-red-600"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="p-4 max-h-96 overflow-y-auto">
                  {cartItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-4 border-b hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                          <Icon className="w-6 h-6 text-red-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            {item.name}
                          </p>
                          <p className="text-sm text-gray-500 font-mono">
                            {item.code}
                          </p>
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

            {/* Footer Buttons (using new handleBack and handleConfirm) */}
            <div className="bg-white rounded-lg shadow-md">
              <div className="px-4 lg:px-6 py-4 bg-gray-50">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <button
                    onClick={handleBack}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors font-medium shadow-md"
                  >
                    <ChevronLeft className="w-5 h-5" />
                    Back to Home
                  </button>
                  <span className="text-sm text-gray-600">
                    {cartItems.length > 0
                      ? `${cartItems.length} items in cart`
                      : "Scan items to continue"}
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
      </div>
    </div>
  );
}

// ==================================================================
// == Sidebar Component (Reusable) (No changes)
// ==================================================================
function Sidebar({
  isSidebarOpen,
  setIsSidebarOpen,
  isMobile,
}: {
  isSidebarOpen: boolean;
  setIsSidebarOpen: (open: boolean) => void;
  isMobile: boolean;
}) {
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  const sidebarItems = [
    { name: "Dashboard", icon: Home, href: "/dashboard" },
    {
      name: "Asset Management",
      icon: Package,
      href: "/asset",
      dropdown: ["Assets", "Categories", "Reports"],
    },
    {
      name: "Location",
      icon: MapPin,
      href: "/location",
      dropdown: ["Sites", "Rooms", "Zones"],
    },
    {
      name: "Department",
      icon: Building2,
      href: "/department",
      dropdown: ["Units", "Teams", "Budgets"],
    },
    {
      name: "Staff",
      icon: Users,
      href: "/staff",
      dropdown: ["Employees", "Roles", "Attendance"],
    },
  ];

  return (
    <div
      className={`fixed left-0 top-0 h-full bg-white shadow-lg z-40 transition-transform duration-300 w-64 ${
        isSidebarOpen ? "translate-x-0" : "-translate-x-full"
      } ${isMobile ? "top-0" : "top-16"}`}
    >
      <div className="flex flex-col h-full">
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="text-xl font-bold text-red-600">Asset Tracking</h2>
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="lg:hidden p-1 hover:bg-gray-100 rounded"
          >
            <X className="w-6 h-6 text-gray-500" />
          </button>
        </div>

        {isMobile && (
          <div className="p-3 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search..."
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600"
              />
            </div>
          </div>
        )}

        <nav className="flex-1 p-3 space-y-2 overflow-y-auto">
          {sidebarItems.map((item) => (
            <div key={item.name}>
              <button
                onClick={() =>
                  setOpenDropdown(openDropdown === item.href ? null : item.href)
                }
                className="flex items-center w-full p-3 text-gray-700 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors"
              >
                <item.icon className="w-5 h-5 mr-3" />
                <span className="flex-1 text-left">{item.name}</span>
                {item.dropdown && (
                  <ChevronDown
                    className={`w-5 h-5 transition-transform ${
                      openDropdown === item.href ? "rotate-180" : ""
                    }`}
                  />
                )}
              </button>
              {item.dropdown && openDropdown === item.href && (
                <div className="ml-8 mt-1 space-y-1">
                  {item.dropdown.map((sub) => (
                    <a
                      key={sub}
                      href="#"
                      className="block p-2 text-sm text-gray-600 hover:text-red-600 hover:bg-red-50 rounded"
                    >
                      {sub}
                    </a>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>

        <div className="border-t p-3 space-y-2">
          <a
            href="#"
            className="flex items-center gap-3 p-3 text-gray-700 hover:bg-red-50 hover:text-red-600 rounded-lg"
          >
            <Settings className="w-5 h-5" />
            Settings
          </a>
          <a
            href="#"
            className="flex items-center gap-3 p-3 text-gray-700 hover:bg-red-50 hover:text-red-600 rounded-lg"
          >
            <LogOut className="w-5 h-5" />
            Log Out
          </a>
        </div>
      </div>
    </div>
  );
}

// ==================================================================
// == Main App Component (MODIFIED)
// ==================================================================
export default function App() {
  const [currentPage, setCurrentPage] = useState("welcome");
  const [submittedData, setSubmittedData] = useState<any>(null);

  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      if (event.state?.page) {
        setCurrentPage(event.state.page);
      } else {
        setCurrentPage("welcome");
      }
    };
    window.addEventListener("popstate", handlePopState);
    window.history.replaceState({ page: "welcome" }, "", "#welcome");
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  const scannerConfigs = {
    asset: {
      title: "Asset Scanner",
      description: "Scan asset QR codes or barcodes",
      icon: Package,
    },
    staff: {
      title: "Staff ID Scanner",
      description: "Scan staff identification codes",
      icon: Users,
    },
    location: {
      title: "Location Scanner",
      description: "Scan location QR codes or barcodes",
      icon: MapPin,
    },
    department: {
      title: "Department Scanner",
      description: "Scan department codes",
      icon: Building2,
    },
  };

  const handleNavigate = (page: string) => {
    setCurrentPage(page);
    window.history.pushState({ page: page }, "", `#${page}`);
  };

  // -----------------------------------------------------------------
  // == MODIFICATION 2: Updated handleSubmit function
  // -----------------------------------------------------------------
  const handleSubmit = async (items: any[]) => {
    // Make the function async
    // 1. Map the scanned items to the format for your 'scans' table
    const dataToInsert = items.map((item) => ({
      code_type: currentPage, // 'asset', 'staff', 'location', or 'department'
      code_value: item.code, // The scanned QR/Barcode value
      created_at: new Date().toISOString(), // Add timestamp
      // Add any other columns you need, e.g., user_id
    }));

    try {
      // 2. Insert all scanned items into Supabase in one go
      const { error } = await supabase.from("scans").insert(dataToInsert);

      if (error) {
        console.error("Supabase insert error:", error);
        alert("Error saving scans: " + error.message);
        // Throw an error to stop the process
        throw error;
      }

      // 3. If save is successful, proceed to success page
      setSubmittedData({ items, page: currentPage });
      const successPage = "success";
      setCurrentPage(successPage);
      window.history.pushState({ page: successPage }, "", `#${successPage}`);
    } catch (e: any) {
      console.error("Supabase exception:", e);
      alert("An unexpected error occurred: " + e.message);
      // Re-throw the error so handleConfirm knows it failed
      throw e;
    }
  };

  const handleBackToScanner = () => {
    window.history.back();
  };

  const handleBackToWelcome = () => {
    handleNavigate("welcome");
  };

  if (currentPage === "welcome") {
    return <WelcomePage onNavigate={handleNavigate} />;
  }

  if (currentPage === "success") {
    return (
      <SuccessPage
        onBack={handleBackToScanner}
        scannedCount={submittedData?.items?.length || 0}
        scanType={
          scannerConfigs[submittedData?.page as keyof typeof scannerConfigs]
            ?.title.split(" ")[0] || "scanned"
        }
      />
    );
  }

  const config = scannerConfigs[currentPage as keyof typeof scannerConfigs];

  if (!config) {
    return <WelcomePage onNavigate={handleNavigate} />;
  }

  return (
    <ScannerPage
      {...config}
      onBack={handleBackToWelcome}
      onSubmit={handleSubmit}
    />
  );
}
