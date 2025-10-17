"use client"
import React from 'react'
import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Loader2, FileDown, Plus, Edit, Trash2, X } from 'lucide-react';
 
interface Assets {
  asset_id: string;
  name: string;
  model: string;
  description: string;
  condition: number;
  location_id: string;
  department_id: string;
  category: string;
  created_dt: string;
  updated_dt: string;
}

export default function DataTable() {
  const [data, setData] = useState<Assets[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1); 
  const [totalPages, setTotalPages] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [currentItem, setCurrentItem] = useState<Assets | null>(null);
  const [locations, setLocations] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [formData, setFormData] = useState({
    asset_id: '',
    name: '',
    model: '',
    description: '',
    condition: '',
    location_id: '',
    department_id: '',
    category: 'IT Equipment'
  });
  const limit = 10;

  useEffect(() => {
    loadData();
  }, [page]);

  // Add this useEffect to fetch locations and departments when component mounts
  useEffect(() => {
    fetchLocationsAndDepartments();
  }, []);

  // Add this function to fetch data
  const fetchLocationsAndDepartments = async () => {
    setLoadingOptions(true);
    try {
      // Fetch locations
      const locResponse = await fetch('/api/locations');
      if (locResponse.ok) {
        const locData = await locResponse.json();
        setLocations(locData.data || []);
        console.log('Locations fetched:', locData.data);
      }

      // Fetch departments
      const deptResponse = await fetch('/api/departments');
      if (deptResponse.ok) {
        const deptData = await deptResponse.json();
        setDepartments(deptData.data || []);
        console.log('Departments fetched:', deptData.data);
      }
    } catch (error) {
      console.error('Error fetching locations/departments:', error);
    } finally {
      setLoadingOptions(false);
    }
  };
  // ============= LOAD DATA (GET) =============
  const loadData = async () => {
    setLoading(true);
    try {
      const url = `/api/assets?page=${page}&limit=10&sortBy=name&sortOrder=asc`;
      console.log('Fetching from:', url);  // Shows which URL is being called
      
      const response = await fetch(url);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));  //  Added .catch() to handle JSON parse errors
        console.error('API Error:', errorData);
        throw new Error(errorData.error || `HTTP ${response.status}: Failed to fetch assets`);
      }
      
      const result = await response.json();
      console.log('Data loaded successfully:', result);
      setData(result.data);
      setTotalPages(result.totalPages);
      setTotalItems(result.totalItems);
    } catch (error) {
      console.error('Error loading data:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      alert(`Failed to load assets: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };
    useEffect(() => {
      loadData();
    }, [page]); 

    // ============= PAGINATION =============
    const goToPage = (newPage: number) => {
      if (newPage >= 1 && newPage <= totalPages) {
        setPage(newPage);
      }
    };

  // ============= ADD NEW ASSET =============
  const handleAdd = () => {
    setModalMode('add');
    setFormData({
      asset_id: '', 
      name: '',
      model: '',
      description: '',
      condition: '',
      location_id: '',
      department_id: '',
      category: 'Electronics'
    });
    setShowModal(true);
  };
  

  // ============= EDIT EXISTING ASSET =============
  const handleEdit = (item: Assets) => {
    setModalMode('edit');
    setCurrentItem(item);
    setFormData({
      asset_id: item.asset_id, 
      name: item.name,
      model: item.model,
      description: item.description,
      condition: item.condition.toString(),
      location_id: item.location_id,
      department_id: item.department_id,
      category: item.category
    });
    setShowModal(true);
  };

  // ============= DELETE ASSET =============
  const handleDelete = async (asset_id: string) => {
    if (confirm('Are you sure you want to delete this asset?')) {
      try {
        const response = await fetch(`/api/assets/${asset_id}`, {
          method: 'DELETE'
        });

        if (!response.ok) {
          throw new Error('Failed to delete asset');
        }

        alert('Asset deleted successfully!');
        loadData();
      } catch (error) {
        console.error('Error:', error);
        alert(
          error instanceof Error
            ? error.message
            : 'Failed to delete asset'
        );
      }
    }
  };

  // ============= SAVE ASSET (CREATE OR UPDATE) =============
  const handleSave = async () => {
    // Validation
    if (
      !formData.asset_id ||
      !formData.name ||
      !formData.model ||
      !formData.category ||
      !formData.location_id ||
      !formData.department_id
    ) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      if (modalMode === 'add') {
        // ===== CREATE NEW ASSET (POST) =====
        const response = await fetch('/api/assets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            asset_id: formData.asset_id,
            name: formData.name,
            model: formData.model,
            description: formData.description,
            condition: parseInt(formData.condition) || 0,
            location_id: formData.location_id,
            department_id: formData.department_id,
            category: formData.category
          })
        });

        if (!response.ok) {
          throw new Error('Failed to add asset');
        }

        alert('Asset added successfully!');
        setPage(1); // Reset to first page
        loadData(); // Refresh table
      } else {
        // ===== UPDATE EXISTING ASSET (PUT) =====
        if (!currentItem) {
          throw new Error('No asset selected for update');
        }

        const response = await fetch(`/api/assets/${currentItem.asset_id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            asset_id: formData.asset_id,
            name: formData.name,
            model: formData.model,
            description: formData.description,
            condition: parseInt(formData.condition) || 0,
            location_id: formData.location_id,
            department_id: formData.department_id,
            category: formData.category
          })
        });

        if (!response.ok) {
          throw new Error('Failed to update asset');
        }

        alert('Asset updated successfully!');
        loadData(); // Refresh table
      }

      setShowModal(false);
    } catch (error) {
      console.error('Error:', error);
      alert(
        error instanceof Error ? error.message : 'An error occurred'
      );
    }
  };

  // ============= PRINT PDF =============
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
            h1 { color: #dc2626; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
            th { background-color: #dc2626; color: white; }
            tr:nth-child(even) { background-color: #f9fafb; }
            .header { margin-bottom: 20px; }
            .footer { margin-top: 20px; font-size: 12px; color: #666; }
            @media print {
              button { display: none; }
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
                <th>Asset ID</th>
                <th>Name</th>
                <th>Model</th>
                <th>Category</th>
                <th>Location ID</th>
                <th>Condition</th>
              </tr>
            </thead>
            <tbody>
              ${data.map(item => `
                <tr>
                  <td>${item.asset_id}</td>
                  <td>${item.name}</td>
                  <td>${item.model}</td>
                  <td>${item.category}</td>
                  <td>${item.location_id}</td>
                  <td>${item.condition}</td>
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

  return (
    <div>
      <div className="bg-gray-50 p-8">
        <div className="max-w-6xl mx-auto">
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 bg-gradient-to-r from-red-700 to-red-500 text-white">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold">Asset Management</h1>
                  <p className="text-white text-sm mt-1">Total assets: {totalItems}</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                  <button
                    onClick={handleAdd}
                    className="flex items-center gap-2 px-4 py-2 bg-white text-gray-700 rounded-lg hover:bg-red-50 transition-colors font-medium"
                  >
                    <Plus className="w-4 h-4" />
                    Add Asset
                  </button>
                  <button
                    onClick={handlePrintPDF}
                    className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg hover:bg-red-900 transition-colors font-medium"
                  >
                    <FileDown className="w-4 h-4" />
                    Print PDF
                  </button>
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    {/* Asset ID */}
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Asset ID
                    </th>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Name
                    </th>

                    {/* Model */}
                    <th className="hidden sm:table-cell px-3 sm:px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Model
                    </th>
                    
                    {/* Category */}
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Category
                    </th>
                    
                    {/* Location ID */}
                    <th className="hidden md:table-cell px-3 sm:px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Location ID
                    </th>

                    {/* Department ID */}
                    <th className="hidden md:table-cell px-3 sm:px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Department ID
                    </th>
                    
                    {/* Condition*/}
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Condition
                    </th>

                    {/* Description*/}
                    <th className="hidden lg:table-cell px-3 sm:px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Description
                    </th>
                    
                    {/* Actions*/}
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody className="bg-white divide-y divide-gray-200">
                  {loading ? (
                    <tr>
                      <td colSpan={9} className="px-6 py-12 text-center">
                        <div className="flex items-center justify-center">
                          <Loader2 className="w-8 h-8 text-red-600 animate-spin" />
                          <span className="ml-2 text-gray-600">Loading data...</span>
                        </div>
                      </td>
                    </tr>
                  ) : data.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-6 py-12 text-center text-gray-500">No data available</td>
                    </tr>
                  ) : (
                    data.map((item) => (
                      <tr key={item.asset_id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm font-medium text-gray-900">{item.asset_id}</td>
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm text-gray-700">{item.name}</td>
                        <td className="hidden sm:table-cell px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm text-gray-700">{item.model}</td>
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">
                            {item.category}
                          </span>
                        </td>
                        <td className="hidden md:table-cell px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm text-gray-700">{item.location_id}</td>
                        <td className="hidden md:table-cell px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm text-gray-700">{item.department_id}</td>
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm text-gray-700">{item.condition}/10</td>
                        <td className="hidden lg:table-cell px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm text-gray-700 truncate">{item.description}</td>
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm">
                          <div className="flex gap-1">
                            <button
                              onClick={() => handleEdit(item)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                              title="Edit"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(item.asset_id)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {!loading && data.length > 0 && (
              <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
                <div className="text-sm text-gray-600">
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
                    <ChevronLeft className="w-5 h-5 text-gray-600" />
                  </button>

                  <div className="flex gap-1">
                    {[...Array(totalPages)].map((_, i) => {
                      const pageNum = i + 1;
                      if (pageNum === 1 || pageNum === totalPages || (pageNum >= page - 1 && pageNum <= page + 1)) {
                        return (
                          <button
                            key={pageNum}
                            onClick={() => goToPage(pageNum)}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                              page === pageNum
                                ? 'bg-red-600 text-white'
                                : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      } else if (pageNum === page - 2 || pageNum === page + 2) {
                        return <span key={pageNum} className="px-2 py-2 text-gray-500">...</span>;
                      }
                      return null;
                    })}
                  </div>

                  <button
                    onClick={() => goToPage(page + 1)}
                    disabled={page === totalPages}
                    className="p-2 rounded-md border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRight className="w-5 h-5 text-gray-600" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-white">
                <h2 className="text-xl font-bold text-gray-900">
                  {modalMode === 'add' ? 'Add New Asset' : 'Edit Asset'}
                </h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-1 hover:bg-gray-100 rounded transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              <div className="px-6 py-4">
                <div className="space-y-4">
                  {/* Row 1: Asset ID (editable on add, read-only on edit), Name */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Asset ID {modalMode === 'add' ? '*' : '(Read-only)'}
                      </label>
                      <input
                        type="text"
                        value={formData.asset_id}
                        onChange={(e) => setFormData({...formData, asset_id: e.target.value})}
                        disabled={modalMode === 'edit'}
                        className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 ${
                          modalMode === 'edit' ? 'bg-gray-50 text-gray-500' : ''
                        }`}
                        placeholder={modalMode === 'add' ? 'Enter asset ID' : ''}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                        placeholder="Asset name"
                      />
                    </div>
                  </div>

                  {/* Row 2: Model, Category */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Model *</label>
                      <input
                        type="text"
                        value={formData.model}
                        onChange={(e) => setFormData({...formData, model: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                        placeholder="Asset model"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
                      <select
                        value={formData.category}
                        onChange={(e) => setFormData({...formData, category: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                      >
                        <option>It Equipment</option>
                        <option>Office Furniture</option>
                        <option>Table</option>
                        <option>Chairs</option>
                      </select>
                    </div>
                  </div>

                  {/* Row 3: Location ID, Department ID */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Location *</label>
                      {loadingOptions ? (
                        <div className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500">
                          Loading...
                        </div>
                      ) : (
                        <select
                          value={formData.location_id}
                          onChange={(e) => setFormData({...formData, location_id: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                        >
                          <option value="">Select a location</option>
                          {locations.map((loc) => (
                            <option key={loc.location_id} value={loc.location_id}>
                              {loc.location_id} - {loc.name}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Department *</label>
                      {loadingOptions ? (
                        <div className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500">
                          Loading...
                        </div>
                      ) : (
                        <select
                          value={formData.department_id}
                          onChange={(e) => setFormData({...formData, department_id: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                        >
                          <option value="">Select a department</option>
                          {departments.map((dept) => (
                            <option key={dept.department_id} value={dept.department_id}>
                              {dept.department_id} - {dept.name}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  </div>

                  {/* Row 4: Condition */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Condition (0-10) *</label>
                    <input
                      type="number"
                      min="0"
                      max="10"
                      value={formData.condition}
                      onChange={(e) => setFormData({...formData, condition: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                      placeholder="0-10"
                    />
                  </div>

                  {/* Row 5: Description */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({...formData, description: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                      placeholder="Asset description"
                      rows={4}
                    />
                  </div>

                  {/* Timestamps (Read-only, only on edit) */}
                  {modalMode === 'edit' && currentItem && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Created Date</label>
                        <input
                          type="text"
                          value={new Date(currentItem.created_dt).toLocaleString()}
                          disabled
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Updated Date</label>
                        <input
                          type="text"
                          value={new Date(currentItem.updated_dt).toLocaleString()}
                          disabled
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 text-sm"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => setShowModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
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