"use client"
import React, { useState, useEffect } from 'react';
import { QrCode, Barcode, ChevronLeft, ChevronRight, Menu, CheckCircle, UserCircle, Settings, LogOut, Search, Home, Package, MapPin, Building2, Users, ChevronDown, X, Trash2, ShoppingCart, Check } from 'lucide-react';

// Success Page Component
function SuccessPage({ onBack, scannedCount, scanType }: { 
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
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      {isMobile && isSidebarOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-30" onClick={() => setIsSidebarOpen(false)} />
      )}

      <div className="fixed top-0 left-0 right-0 bg-white shadow-md z-20 h-16">
        <div className="flex items-center justify-between h-full px-4">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg">
              <Menu className="w-6 h-6" />
            </button>
            <span className="text-lg font-bold text-red-600">Asset Tracking</span>
          </div>
          <button className="flex items-center gap-2 p-2 hover:bg-gray-100 rounded-lg">
            <div className="w-10 h-10 rounded-full bg-red-600 flex items-center justify-center text-white font-bold">JD</div>
          </button>
        </div>
      </div>

      <Sidebar isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} isMobile={isMobile} />

      <div className={`pt-16 transition-all duration-300 ${isSidebarOpen && !isMobile ? 'ml-64' : 'ml-0'}`}>
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
                {scannedCount} {scanType} {scannedCount === 1 ? 'item has' : 'items have'} been successfully submitted.
              </p>

              {/* Success Details */}
              <div className="bg-green-50 border-2 border-green-200 rounded-lg p-6 mb-8 max-w-md mx-auto">
                <div className="flex items-center justify-center gap-2 text-green-800 mb-2">
                  <CheckCircle className="w-6 h-6" />
                  <span className="font-semibold text-lg">Confirmation Details</span>
                </div>
                <div className="text-sm text-green-700 space-y-2 mt-4">
                  <p>Total Items: <span className="font-bold">{scannedCount}</span></p>
                  <p>Status: <span className="font-bold">Confirmed</span></p>
                  <p>Date: <span className="font-bold">{new Date().toLocaleDateString()}</span></p>
                  <p>Time: <span className="font-bold">{new Date().toLocaleTimeString()}</span></p>
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
                  onClick={() => window.location.href = '#'}
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

// Welcome Page Component
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
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const scanOptions = [
    { title: 'Asset Scan', icon: Package, page: 'asset', color: 'from-red-600 to-red-500', description: 'Scan asset QR codes or barcodes' },
    { title: 'Staff ID Scan', icon: Users, page: 'staff', color: 'from-black to-gray-800', description: 'Scan staff identification codes' },
    { title: 'Location Scan', icon: MapPin, page: 'location', color: 'from-red-700 to-red-600', description: 'Scan location QR codes or barcodes' },
    { title: 'Department Scan', icon: Building2, page: 'department', color: 'from-gray-800 to-black', description: 'Scan department codes' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {isMobile && isSidebarOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-30" onClick={() => setIsSidebarOpen(false)} />
      )}

      <div className="fixed top-0 left-0 right-0 bg-white shadow-md z-20 h-16">
        <div className="flex items-center justify-between h-full px-4">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg">
              <Menu className="w-6 h-6" />
            </button>
            <span className="text-lg font-bold text-red-600">Asset Tracking</span>
          </div>
          <button onClick={() => setIsProfileOpen(!isProfileOpen)} className="flex items-center gap-2 p-2 hover:bg-gray-100 rounded-lg">
            <div className="w-10 h-10 rounded-full bg-red-600 flex items-center justify-center text-white font-bold">JD</div>
            {!isMobile && <span className="font-medium text-gray-700">John Doe</span>}
          </button>
        </div>
      </div>

      <Sidebar isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} isMobile={isMobile} />

      <div className={`pt-16 transition-all duration-300 ${isSidebarOpen && !isMobile ? 'ml-64' : 'ml-0'}`}>
        <div className="p-4 lg:p-8">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-red-600 rounded-full mb-4">
                <Package className="w-10 h-10 text-white" />
              </div>
              <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-4">Welcome to Asset Tracking</h1>
              <p className="text-xl text-gray-600">Choose a scanning option to get started</p>
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
                    <p className="text-white text-opacity-90">{option.description}</p>
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
                  <span className="text-sm text-gray-600">Select a scan type to continue</span>
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

// Scanner Page Component
function ScannerPage({ title, description, icon: Icon, onBack, onSubmit }: { 
  title: string; 
  description: string; 
  icon: React.ElementType;
  onBack: () => void;
  onSubmit: (items: any[]) => void;
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [cartItems, setCartItems] = useState<any[]>([]);
  const [showCart, setShowCart] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      const width = window.innerWidth;
      setIsMobile(width < 768);
      setIsSidebarOpen(width >= 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Simulate scanning
  const handleScan = () => {
    const newItem = {
      id: Date.now(),
      code: `${title.split(' ')[0].toUpperCase()}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`,
      time: new Date().toLocaleTimeString(),
      name: `${title.split(' ')[0]} Item ${cartItems.length + 1}`,
    };
    setCartItems([...cartItems, newItem]);
    setShowCart(true);
  };

  const removeItem = (id: number) => {
    setCartItems(cartItems.filter(item => item.id !== id));
  };

  const handleConfirm = () => {
    if (cartItems.length === 0) {
      alert('Please scan at least one item before submitting.');
      return;
    }
    onSubmit(cartItems);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {isMobile && isSidebarOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-30" onClick={() => setIsSidebarOpen(false)} />
      )}

      <div className="fixed top-0 left-0 right-0 bg-white shadow-md z-20 h-16">
        <div className="flex items-center justify-between h-full px-4">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg">
              <Menu className="w-6 h-6" />
            </button>
            {!isMobile && (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input type="text" placeholder="Search..." className="pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600 w-64" />
              </div>
            )}
            {isMobile && <span className="text-lg font-bold text-red-600">Asset Tracking</span>}
          </div>
          <div className="flex items-center gap-4">
            {/* Cart Badge */}
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
            <button className="flex items-center gap-2 p-2 hover:bg-gray-100 rounded-lg">
              <div className="w-10 h-10 rounded-full bg-red-600 flex items-center justify-center text-white font-bold">JD</div>
              {!isMobile && <span className="font-medium text-gray-700">John Doe</span>}
            </button>
          </div>
        </div>
      </div>

      <Sidebar isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} isMobile={isMobile} />

      <div className={`pt-16 transition-all duration-300 ${isSidebarOpen && !isMobile ? 'ml-64' : 'ml-0'}`}>
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
                <div 
                  onClick={handleScan}
                  className="relative w-full h-64 lg:h-80 border-4 border-dashed border-gray-300 rounded-2xl flex flex-col items-center justify-center bg-gradient-to-br from-gray-50 to-white hover:border-red-400 transition-all cursor-pointer"
                >
                  <QrCode className="w-20 h-20 text-red-600 animate-pulse mb-4" />
                  <Barcode className="w-20 h-20 text-black opacity-20 absolute" />
                  <p className="text-lg font-medium text-gray-700">Click to Simulate Scan</p>
                  <p className="text-sm text-gray-500 mt-2">Or position the code within the frame</p>
                </div>

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

            {/* Shopping Cart */}
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
                    onClick={onBack}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors font-medium shadow-md"
                  >
                    <ChevronLeft className="w-5 h-5" />
                    Back to Home
                  </button>
                  <span className="text-sm text-gray-600">
                    {cartItems.length > 0 ? `${cartItems.length} items in cart` : 'Scan items to continue'}
                  </span>
                  <button 
                    onClick={handleConfirm}
                    disabled={cartItems.length === 0}
                    className={`w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-lg transition-colors font-medium shadow-md ${
                      cartItems.length > 0 
                        ? 'bg-red-600 text-white hover:bg-red-700' 
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
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

// Sidebar Component (Reusable)
function Sidebar({ isSidebarOpen, setIsSidebarOpen, isMobile }: { 
  isSidebarOpen: boolean; 
  setIsSidebarOpen: (open: boolean) => void;
  isMobile: boolean;
}) {
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  const sidebarItems = [
    { name: "Dashboard", icon: Home, href: "/dashboard" },
    { name: "Asset Management", icon: Package, href: "/asset", dropdown: ["Assets", "Categories", "Reports"] },
    { name: "Location", icon: MapPin, href: "/location", dropdown: ["Sites", "Rooms", "Zones"] },
    { name: "Department", icon: Building2, href: "/department", dropdown: ["Units", "Teams", "Budgets"] },
    { name: "Staff", icon: Users, href: "/staff", dropdown: ["Employees", "Roles", "Attendance"] },
  ];

  return (
    <div className={`fixed left-0 top-0 h-full bg-white shadow-lg z-40 transition-transform duration-300 w-64 ${
      isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
    } ${isMobile ? 'top-0' : 'top-16'}`}>
      <div className="flex flex-col h-full">
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="text-xl font-bold text-red-600">Asset Tracking</h2>
          <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden p-1 hover:bg-gray-100 rounded">
            <X className="w-6 h-6 text-gray-500" />
          </button>
        </div>

        {isMobile && (
          <div className="p-3 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input type="text" placeholder="Search..." className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600" />
            </div>
          </div>
        )}

        <nav className="flex-1 p-3 space-y-2 overflow-y-auto">
          {sidebarItems.map((item) => (
            <div key={item.name}>
              <button onClick={() => setOpenDropdown(openDropdown === item.href ? null : item.href)} className="flex items-center w-full p-3 text-gray-700 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors">
                <item.icon className="w-5 h-5 mr-3" />
                <span className="flex-1 text-left">{item.name}</span>
                {item.dropdown && <ChevronDown className={`w-5 h-5 transition-transform ${openDropdown === item.href ? 'rotate-180' : ''}`} />}
              </button>
              {item.dropdown && openDropdown === item.href && (
                <div className="ml-8 mt-1 space-y-1">
                  {item.dropdown.map((sub) => (
                    <a key={sub} href="#" className="block p-2 text-sm text-gray-600 hover:text-red-600 hover:bg-red-50 rounded">{sub}</a>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>

        <div className="border-t p-3 space-y-2">
          <a href="#" className="flex items-center gap-3 p-3 text-gray-700 hover:bg-red-50 hover:text-red-600 rounded-lg">
            <Settings className="w-5 h-5" />
            Settings
          </a>
          <a href="#" className="flex items-center gap-3 p-3 text-gray-700 hover:bg-red-50 hover:text-red-600 rounded-lg">
            <LogOut className="w-5 h-5" />
            Log Out
          </a>
        </div>
      </div>
    </div>
  );
}

// Main App Component
export default function App() {
  const [currentPage, setCurrentPage] = useState('welcome');
  const [submittedData, setSubmittedData] = useState<any>(null);

  const scannerConfigs = {
    asset: { title: 'Asset Scanner', description: 'Scan asset QR codes or barcodes', icon: Package },
    staff: { title: 'Staff ID Scanner', description: 'Scan staff identification codes', icon: Users },
    location: { title: 'Location Scanner', description: 'Scan location QR codes or barcodes', icon: MapPin },
    department: { title: 'Department Scanner', description: 'Scan department codes', icon: Building2 },
  };

  const handleSubmit = (items: any[]) => {
    setSubmittedData({ items, page: currentPage });
    setCurrentPage('success');
  };

  const handleBackToScanner = () => {
    setCurrentPage(submittedData?.page || 'welcome');
    setSubmittedData(null);
  };

  if (currentPage === 'welcome') {
    return <WelcomePage onNavigate={setCurrentPage} />;
  }

  if (currentPage === 'success') {
    return (
      <SuccessPage 
        onBack={handleBackToScanner} 
        scannedCount={submittedData?.items?.length || 0}
        scanType={scannerConfigs[submittedData?.page as keyof typeof scannerConfigs]?.title.split(' ')[0] || 'scanned'}
      />
    );
  }

  const config = scannerConfigs[currentPage as keyof typeof scannerConfigs];
  return <ScannerPage {...config} onBack={() => setCurrentPage('welcome')} onSubmit={handleSubmit} />;
}