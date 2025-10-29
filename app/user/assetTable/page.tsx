"use client"
import React from 'react'

import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Loader2, FileDown, Plus, X, Menu } from 'lucide-react';

interface Asset {
  id: number;
  name: string;
  category: string;
  location: string;
}

const fetchData = async (page: number, limit: number) => {
  await new Promise(resolve => setTimeout(resolve, 500));
  
  const allAssets: Asset[] = [
    { id: 1, name: 'Laptop Dell XPS 15', category: 'Electronics', location: 'Building A' },
    { id: 2, name: 'Monitor Samsung 27"', category: 'Electronics', location: 'Building B' },
    { id: 3, name: 'Keyboard Logitech', category: 'Electronics', location: 'Warehouse' },
    { id: 4, name: 'Mouse Wireless', category: 'Electronics', location: 'Warehouse' }
  ];
  
  const totalItems = allAssets.length;
  
  return {
    data: allAssets,
    page: 1,
    limit: totalItems,
    totalItems,
    totalPages: 1
  };
};

export default function DataTable() {
  const [data, setData] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [currentItem, setCurrentItem] = useState<Asset | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    category: 'Electronics',
    location: ''
  });
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const limit = 10;

  useEffect(() => {
    loadData();
  }, [page]);

  // Check if mobile on mount and resize
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const result = await fetchData(page, limit);
      setData(result.data);
      setTotalPages(result.totalPages);
      setTotalItems(result.totalItems);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const goToPage = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPage(newPage);
    }
  };

  const handleAdd = () => {
    setModalMode('add');
    setFormData({ name: '', category: 'Electronics', location: '' });
    setShowModal(true);
  };

  const handleEdit = (item: Asset) => {
    setModalMode('edit');
    setCurrentItem(item);
    setFormData({
      name: item.name,
      category: item.category,
      location: item.location
    });
    setShowModal(true);
  };

  const handleSave = () => {
    if (!formData.name || !formData.location) {
      alert('Please fill in all fields');
      return;
    }
    
    if (modalMode === 'add') {
      // Your add logic here
      alert('Add functionality with data: ' + JSON.stringify(formData));
    } else {
      // Your update logic here
      alert('Update functionality for ID: ' + currentItem?.id);
    }
    
    setShowModal(false);
  };

  const handlePrintPDF = () => {
    const printWindow = window.open('', '_blank');
    
    if (!printWindow) {
      alert('Unable to open print window. Please check your popup blocker settings.');
      return;
    }
    
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Asset Management - Page ${page}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            h1 { color: #2563eb; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
            th { background-color: #2563eb; color: white; }
            tr:nth-child(even) { background-color: #f9fafb; }
            .header { margin-bottom: 20px; }
            .footer { margin-top: 20px; font-size: 12px; color: #666; }
            @media print {
              button { display: none; }
            }
            @media (max-width: 768px) {
              body { margin: 10px; }
              table { font-size: 12px; }
              th, td { padding: 8px; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Asset Management Report</h1>
            <p><strong>Page:</strong> ${page} of ${totalPages}</p>
            <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
            <p><strong>Total Assets:</strong> ${totalItems}</p>
          </div>
          
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Category</th>
                <th>Location</th>
              </tr>
            </thead>
            <tbody>
              ${data.map(item => `
                <tr>
                  <td>${item.id}</td>
                  <td>${item.name}</td>
                  <td>${item.category}</td>
                  <td>${item.location}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          <div class="footer">
            <p>Generated on ${new Date().toLocaleString()}</p>
          </div>
          
          <script>
            window.onload = function() {
              window.print();
            }
          </script>
        </body>
      </html>
    `;
    
    printWindow.document.write(html);
    printWindow.document.close();
  };

  // Render table rows for desktop
  const renderTableRows = () => {
    if (loading) {
      return (
        <tr>
          <td colSpan={4} className="px-6 py-12 text-center">
            <div className="flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-red-600 animate-spin" />
              <span className="ml-2 text-gray-600">Loading data...</span>
            </div>
          </td>
        </tr>
      );
    }

    if (data.length === 0) {
      return (
        <tr>
          <td colSpan={4} className="px-6 py-12 text-center text-gray-500">No data available</td>
        </tr>
      );
    }

    return data.map((item) => (
      <tr key={item.id} className="hover:bg-gray-50 transition-colors">
        <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.id}</td>
        <td className="px-4 lg:px-6 py-4 text-sm text-gray-700">
          <div className="max-w-[150px] lg:max-w-none truncate" title={item.name}>
            {item.name}
          </div>
        </td>
        <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
          <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
            {item.category}
          </span>
        </td>
        <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm text-gray-700">
          <div className="max-w-[100px] lg:max-w-none truncate" title={item.location}>
            {item.location}
          </div>
        </td>
      </tr>
    ));
  };

  // Render mobile cards
  const renderMobileCards = () => {
    if (loading) {
      return (
        <div className="py-12 text-center">
          <div className="flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-red-600 animate-spin" />
            <span className="ml-2 text-gray-600">Loading data...</span>
          </div>
        </div>
      );
    }

    if (data.length === 0) {
      return (
        <div className="py-12 text-center text-gray-500">No data available</div>
      );
    }

    return data.map((item) => (
      <div key={item.id} className="border-b border-gray-200 p-4 hover:bg-gray-50">
        <div className="flex justify-between items-start mb-2">
          <div className="font-medium text-gray-900">#{item.id}</div>
          <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
            {item.category}
          </span>
        </div>
        <div className="mb-2">
          <div className="font-semibold text-gray-900 truncate" title={item.name}>
            {item.name}
          </div>
        </div>
        <div className="text-sm text-gray-600">
          <div className="flex items-center gap-1">
            <span>📍 {item.location}</span>
          </div>
        </div>
      </div>
    ));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      
      {/* Mobile Header */}
      <div className="lg:hidden bg-gradient-to-r from-red-700 to-red-500 text-white p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 rounded-lg bg-red-800 hover:bg-red-900 transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl font-bold">Asset Table</h1>
              <p className="text-red-100 text-sm">Total assets: {totalItems}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="lg:ml-auto lg:w-[81%] bg-gray-50 p-4 lg:p-8">
        <div className="max-w-6xl mx-auto">
          {/* Desktop Header */}
          <div className="hidden lg:block bg-white rounded-lg shadow-md overflow-hidden mb-6">
            <div className="px-6 py-4 bg-gradient-to-r from-red-700 to-red-500 text-white">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold">Asset Table</h1>
                  <p className="text-white text-sm mt-1">Total assets: {totalItems}</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <button
                    onClick={handlePrintPDF}
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-black text-white rounded-lg hover:bg-red-900 transition-colors font-medium"
                  >
                    <FileDown className="w-4 h-4" />
                    <span>Print PDF</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Mobile Action Buttons */}
          <div className="lg:hidden flex gap-2 mb-4">
            <button
              onClick={handlePrintPDF}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-black text-white rounded-lg hover:bg-red-900 transition-colors font-medium"
            >
              <FileDown className="w-4 h-4" />
              <span>Print PDF</span>
            </button>
          </div>

          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            {/* Desktop Table View */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">ID</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Category</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Location</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {renderTableRows()}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="lg:hidden">
              {renderMobileCards()}
            </div>

            {/* Pagination */}
            {!loading && data.length > 0 && (
              <div className="px-4 lg:px-6 py-4 bg-gray-50 border-t border-gray-200">
                <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
                  <div className="text-sm text-gray-600 text-center lg:text-left">
                    Showing <span className="font-medium">{(page - 1) * limit + 1}</span> to{' '}
                    <span className="font-medium">{Math.min(page * limit, totalItems)}</span> of{' '}
                    <span className="font-medium">{totalItems}</span> results
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => goToPage(page - 1)}
                      disabled={page === 1}
                      className="p-2 rounded-md border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4 lg:w-5 lg:h-5 text-gray-600" />
                    </button>

                    <div className="flex gap-1">
                      {[...Array(totalPages)].map((_, i) => {
                        const pageNum = i + 1;
                        // Show limited pages on mobile
                        if (isMobile) {
                          if (pageNum === page || pageNum === 1 || pageNum === totalPages) {
                            return (
                              <button
                                key={pageNum}
                                onClick={() => goToPage(pageNum)}
                                className={`px-3 py-2 text-xs lg:px-4 lg:py-2 lg:text-sm rounded-md font-medium transition-colors ${
                                  page === pageNum
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                                }`}
                              >
                                {pageNum}
                              </button>
                            );
                          } else if ((pageNum === page - 1 && page > 2) || (pageNum === page + 1 && page < totalPages - 1)) {
                            return <span key={pageNum} className="px-1 py-2 text-gray-500">...</span>;
                          }
                          return null;
                        } else {
                          // Desktop pagination
                          if (pageNum === 1 || pageNum === totalPages || (pageNum >= page - 1 && pageNum <= page + 1)) {
                            return (
                              <button
                                key={pageNum}
                                onClick={() => goToPage(pageNum)}
                                className={`px-3 py-2 text-xs lg:px-4 lg:py-2 lg:text-sm rounded-md font-medium transition-colors ${
                                  page === pageNum
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                                }`}
                              >
                                {pageNum}
                              </button>
                            );
                          } else if (pageNum === page - 2 || pageNum === page + 2) {
                            return <span key={pageNum} className="px-1 lg:px-2 py-2 text-gray-500">...</span>;
                          }
                          return null;
                        }
                      })}
                    </div>

                    <button
                      onClick={() => goToPage(page + 1)}
                      disabled={page === totalPages}
                      className="p-2 rounded-md border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronRight className="w-4 h-4 lg:w-5 lg:h-5 text-gray-600" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between px-4 lg:px-6 py-4 border-b sticky top-0 bg-white">
                <h2 className="text-lg lg:text-xl font-bold text-gray-900">
                  {modalMode === 'add' ? 'Add New Asset' : 'Edit Asset'}
                </h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-1 hover:bg-gray-100 rounded transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              <div className="px-4 lg:px-6 py-4">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
                      placeholder="Enter asset name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({...formData, category: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
                    >
                      <option>Electronics</option>
                      <option>Clothing</option>
                      <option>Food</option>
                      <option>Books</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                    <input
                      type="text"
                      value={formData.location}
                      onChange={(e) => setFormData({...formData, location: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
                      placeholder="Enter location"
                    />
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 mt-6">
                  <button
                    onClick={() => setShowModal(false)}
                    className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                  >
                    {modalMode === 'add' ? 'Add Asset' : 'Update Asset'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}