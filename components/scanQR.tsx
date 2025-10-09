"use client"
import React, { useState, useEffect } from 'react';
import { QrCode, Barcode, ChevronLeft, ChevronRight, Menu, CheckCircle, UserCircle, Settings, LogOut, Search, Home, Package, MapPin, Building2, Users, ChevronDown, X } from 'lucide-react';

export default function ScannerPage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

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

  const sidebarItems = [
    { name: "Dashboard", icon: Home, href: "/dashboard" },
    { 
      name: "Asset Management", 
      icon: Package, 
      href: "/asset",
      dropdown: ["Assets", "Categories", "Reports"]
    },
    { 
      name: "Location", 
      icon: MapPin, 
      href: "/location",
      dropdown: ["Sites", "Rooms", "Zones"]
    },
    { 
      name: "Department", 
      icon: Building2, 
      href: "/department",
      dropdown: ["Units", "Teams", "Budgets"]
    },
    { 
      name: "Staff", 
      icon: Users, 
      href: "/staff",
      dropdown: ["Employees", "Roles", "Attendance"]
    },
  ];

  const scannedItems = [
    { id: 1, code: 'AST-001', time: '2 mins ago', status: 'verified' },
    { id: 2, code: 'AST-002', time: '5 mins ago', status: 'verified' },
    { id: 3, code: 'AST-003', time: '10 mins ago', status: 'verified' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Overlay */}
      {isMobile && isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Top Navigation Bar */}
      <div className="fixed top-0 left-0 right-0 bg-white shadow-md z-20 h-16">
        <div className="flex items-center justify-between h-full px-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
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
              <span className="text-lg font-bold text-red-600">Asset Tracking</span>
            )}
          </div>
          
          <div className="relative">
            <button
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className="flex items-center gap-2 p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <div className="w-10 h-10 rounded-full bg-red-600 flex items-center justify-center text-white font-bold">
                JD
              </div>
              {!isMobile && (
                <>
                  <span className="font-medium text-gray-700">John Doe</span>
                  <ChevronDown className={`w-5 h-5 text-gray-700 transition-transform ${isProfileOpen ? 'rotate-180' : ''}`} />
                </>
              )}
            </button>
            
            {isProfileOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white border rounded-lg shadow-xl py-2">
                <div className="px-4 py-3 border-b">
                  <p className="text-sm font-medium text-gray-900">John Doe</p>
                  <p className="text-xs text-gray-500">john.doe@example.com</p>
                </div>
                <a href="#" className="flex items-center gap-3 px-4 py-2 text-gray-700 hover:bg-red-50 hover:text-red-600">
                  <UserCircle className="w-5 h-5" />
                  My Profile
                </a>
                <a href="#" className="flex items-center gap-3 px-4 py-2 text-gray-700 hover:bg-red-50 hover:text-red-600">
                  <Settings className="w-5 h-5" />
                  Settings
                </a>
                <hr className="my-2" />
                <a href="#" className="flex items-center gap-3 px-4 py-2 text-red-600 hover:bg-red-50">
                  <LogOut className="w-5 h-5" />
                  Log Out
                </a>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sidebar */}
      <div className={`fixed left-0 top-0 h-full bg-white shadow-lg z-40 transition-transform duration-300 w-64 ${
        isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
      } ${isMobile ? 'top-0' : 'top-16'}`}>
        <div className="flex flex-col h-full">
          <div className="p-4 border-b flex items-center justify-between">
            <h2 className="text-xl font-bold text-red-600">Asset Tracking</h2>
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="lg:hidden p-1 hover:bg-gray-100 rounded transition-colors"
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
                  onClick={() => setOpenDropdown(openDropdown === item.href ? null : item.href)}
                  className="flex items-center w-full p-3 text-gray-700 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors"
                >
                  <item.icon className="w-5 h-5 mr-3" />
                  <span className="flex-1 text-left">{item.name}</span>
                  {item.dropdown && (
                    <ChevronDown className={`w-5 h-5 transition-transform ${openDropdown === item.href ? 'rotate-180' : ''}`} />
                  )}
                </button>
                {item.dropdown && openDropdown === item.href && (
                  <div className="ml-8 mt-1 space-y-1">
                    {item.dropdown.map((sub) => (
                      <a key={sub} href="#" className="block p-2 text-sm text-gray-600 hover:text-red-600 hover:bg-red-50 rounded">
                        {sub}
                      </a>
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

      {/* Main Content */}
      <div className={`pt-16 transition-all duration-300 ${isSidebarOpen && !isMobile ? 'ml-64' : 'ml-0'}`}>
        <div className="p-4 lg:p-8">
          <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="bg-white rounded-lg shadow-md mb-6 overflow-hidden">
              <div className="px-6 py-4 bg-gradient-to-r from-red-700 to-red-500 text-white">
                <div className="flex items-center gap-3">
                  <QrCode className="w-8 h-8" />
                  <div>
                    <h1 className="text-2xl font-bold">Asset Scanner</h1>
                    <p className="text-sm text-red-100">Scan asset QR codes or barcodes</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Scanner Card */}
            <div className="bg-white rounded-lg shadow-md mb-6">
              <div className="p-6 lg:p-8">
                <div className="relative w-full h-64 lg:h-80 border-4 border-dashed border-gray-300 rounded-2xl flex flex-col items-center justify-center bg-gradient-to-br from-gray-50 to-white hover:border-red-400 transition-all">
                  <QrCode className="w-20 h-20 text-red-600 animate-pulse mb-4" />
                  <Barcode className="w-20 h-20 text-black opacity-20 absolute" />
                  <p className="text-lg font-medium text-gray-700">Scan QR Code or Barcode</p>
                  <p className="text-sm text-gray-500 mt-2">Position the code within the frame</p>
                </div>

                <div className="mt-6 p-4 bg-red-50 rounded-lg">
                  <h3 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                    <QrCode className="w-5 h-5 text-red-600" />
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

            {/* Recent Scans */}
            <div className="bg-white rounded-lg shadow-md mb-6">
              <div className="px-6 py-4 bg-gray-50 border-b">
                <h2 className="text-lg font-semibold text-gray-800">Recent Scans</h2>
              </div>
              <div className="hidden lg:block">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">ID</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Code</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Time</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {scannedItems.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm font-medium">#{item.id}</td>
                        <td className="px-6 py-4 text-sm font-mono">{item.code}</td>
                        <td className="px-6 py-4 text-sm text-gray-500">{item.time}</td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                            <CheckCircle className="w-3 h-3" />
                            {item.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="lg:hidden">
                {scannedItems.map((item) => (
                  <div key={item.id} className="border-b p-4">
                    <div className="flex justify-between mb-2">
                      <span className="font-medium">#{item.id}</span>
                      <span className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">
                        <CheckCircle className="w-3 h-3" />
                        {item.status}
                      </span>
                    </div>
                    <div className="font-mono text-sm mb-1">{item.code}</div>
                    <div className="text-sm text-gray-500">{item.time}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Navigation Buttons */}
            <div className="bg-white rounded-lg shadow-md">
              <div className="px-4 lg:px-6 py-4 bg-gray-50">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <button className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors font-medium shadow-md">
                    <ChevronLeft className="w-5 h-5" />
                    Previous
                  </button>
                  <span className="text-sm text-gray-600">Continue to next step</span>
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