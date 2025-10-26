'use client'

import { useState, useEffect } from 'react'
import { useSession } from '@/components/auth/SessionProvider'
import { useRouter } from 'next/navigation'
import { useIsAuthenticated } from '@azure/msal-react'
import Breadcrumb from '@/components/ui/Breadcrumb'
import {
  MagnifyingGlassIcon,
  ArrowPathIcon,
  PrinterIcon,
  PencilIcon,
  TrashIcon
} from '@heroicons/react/24/outline'

interface Asset {
  asset_id: string
  name: string
  model: string
  description: string
  condition: string
  location_id: string
  department_id: string
  category: string
  created_dt: string
  updated_dt: string
  location?: { name: string; description: string }
  department?: { name: string }
}

interface Location {
  location_id: string
  name: string
  description: string
}

interface Department {
  department_id: string
  name: string
}

export default function AssetsPage() {
  const isAuthenticated = useIsAuthenticated()
  const { session } = useSession()
  const router = useRouter()

  // Data states
  const [assets, setAssets] = useState<Asset[]>([])
  const [locations, setLocations] = useState<Location[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)

  // Search and pagination states
  const [searchTerm, setSearchTerm] = useState('')
  const [searchField, setSearchField] = useState('name')
  const [currentPage, setCurrentPage] = useState(1)
  const [recordsPerPage, setRecordsPerPage] = useState(10)
  const [totalItems, setTotalItems] = useState(0)
  const [totalPages, setTotalPages] = useState(0)

  // Sorting states
  const [sortBy, setSortBy] = useState('created_dt')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  // Modal states for editing
  const [showModal, setShowModal] = useState(false)
  const [currentAsset, setCurrentAsset] = useState<Asset | null>(null)
  const [formData, setFormData] = useState({
    asset_id: '',
    name: '',
    model: '',
    description: '',
    condition: 'Good',
    location_id: '',
    department_id: '',
    category: ''
  })

  // Handle mounting and authentication
  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (mounted && (!isAuthenticated || !session)) {
      router.push('/')
    }
  }, [mounted, isAuthenticated, session, router])

  // Load initial data
  useEffect(() => {
    if (mounted && isAuthenticated && session) {
      loadAssets()
      loadLocations()
      loadDepartments()
    }
  }, [mounted, isAuthenticated, session, currentPage, recordsPerPage, sortBy, sortOrder])

  // Don't render anything until mounted and authenticated
  if (!mounted || !isAuthenticated || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  // Load assets with search and pagination
  const loadAssets = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: recordsPerPage.toString(),
        sortBy,
        sortOrder,
        ...(searchTerm && { search: searchTerm, searchField })
      })

      const response = await fetch(`/api/assets?${params}`)
      if (!response.ok) throw new Error('Failed to fetch assets')

      const data = await response.json()
      setAssets(data.data)
      setTotalItems(data.totalItems)
      setTotalPages(data.totalPages)
    } catch (error) {
      console.error('Error loading assets:', error)
      alert('Failed to load assets')
    } finally {
      setLoading(false)
    }
  }

  // Load locations
  const loadLocations = async () => {
    try {
      const response = await fetch('/api/locations')
      if (response.ok) {
        const data = await response.json()
        setLocations(data.data || [])
      }
    } catch (error) {
      console.error('Error loading locations:', error)
    }
  }

  // Load departments
  const loadDepartments = async () => {
    try {
      const response = await fetch('/api/departments')
      if (response.ok) {
        const data = await response.json()
        setDepartments(data.data || [])
      }
    } catch (error) {
      console.error('Error loading departments:', error)
    }
  }

  // Handle search
  const handleSearch = () => {
    setCurrentPage(1)
    loadAssets()
  }

  // Handle reset
  const handleReset = () => {
    setSearchTerm('')
    setSearchField('name')
    setCurrentPage(1)
    setSortBy('created_dt')
    setSortOrder('desc')
  }

  // Handle sort
  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(column)
      setSortOrder('asc')
    }
  }

  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  // Handle edit asset
  const handleEdit = (asset: Asset) => {
    setCurrentAsset(asset)
    setFormData({
      asset_id: asset.asset_id,
      name: asset.name,
      model: asset.model,
      description: asset.description,
      condition: asset.condition,
      location_id: asset.location_id,
      department_id: asset.department_id,
      category: asset.category
    })
    setShowModal(true)
  }

  // Handle delete asset
  const handleDelete = async (asset: Asset) => {
    if (!confirm(`Are you sure you want to delete asset "${asset.name}"?`)) return

    try {
      const response = await fetch(`/api/assets?asset_id=${asset.asset_id}`, {
        method: 'DELETE'
      })

      if (!response.ok) throw new Error('Failed to delete asset')

      alert('Asset deleted successfully!')
      loadAssets()
    } catch (error) {
      console.error('Error deleting asset:', error)
      alert('Failed to delete asset')
    }
  }

  // Handle save asset (edit only)
  const handleSave = async () => {
    if (!formData.asset_id || !formData.name || !formData.model || !formData.category || !formData.location_id || !formData.department_id) {
      alert('Please fill in all required fields')
      return
    }

    try {
      const response = await fetch('/api/assets', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (!response.ok) throw new Error('Failed to update asset')

      alert('Asset updated successfully!')
      setShowModal(false)
      loadAssets()
    } catch (error) {
      console.error('Error updating asset:', error)
      alert('Failed to update asset')
    }
  }

  // Handle print
  const handlePrint = () => {
    window.print()
  }

  // Generate pagination buttons
  const renderPagination = () => {
    const pages = []
    const maxVisible = 5
    let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2))
    let endPage = Math.min(totalPages, startPage + maxVisible - 1)

    if (endPage - startPage + 1 < maxVisible) {
      startPage = Math.max(1, endPage - maxVisible + 1)
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(
        <button
          key={i}
          onClick={() => handlePageChange(i)}
          className={`px-3 py-2 text-sm font-medium rounded-md ${
            currentPage === i
              ? 'bg-red-600 text-white'
              : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
          }`}
        >
          {i}
        </button>
      )
    }

    return (
      <div className="flex items-center justify-between px-4 py-3 bg-white border-t border-gray-200 sm:px-6">
        <div className="flex justify-between flex-1 sm:hidden">
          <button
            onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="relative inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <button
            onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className="relative inline-flex items-center px-4 py-2 ml-3 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
        <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-gray-700">
              Showing <span className="font-medium">{((currentPage - 1) * recordsPerPage) + 1}</span> to{' '}
              <span className="font-medium">
                {Math.min(currentPage * recordsPerPage, totalItems)}
              </span>{' '}
              of <span className="font-medium">{totalItems}</span> results
            </p>
          </div>
          <div>
            <nav className="relative z-0 inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
              <button
                onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="relative inline-flex items-center px-2 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-l-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              {pages}
              <button
                onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="relative inline-flex items-center px-2 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-r-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </nav>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <Breadcrumb />
            <div className="mt-4">
              <h1 className="text-3xl font-bold text-gray-900">Assets</h1>
              <p className="mt-2 text-sm text-gray-600">
                Manage and track your organization's assets
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search and Controls */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              {/* Search Field Selector */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Search Field
                </label>
                <select
                  value={searchField}
                  onChange={(e) => setSearchField(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                >
                  <option value="name">Asset Name</option>
                  <option value="asset_id">Asset ID</option>
                </select>
              </div>

              {/* Search Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Search Term
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                    placeholder="Enter search term..."
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  />
                  <MagnifyingGlassIcon className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                </div>
              </div>

              {/* Records Per Page */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Records per page
                </label>
                <select
                  value={recordsPerPage}
                  onChange={(e) => {
                    setRecordsPerPage(parseInt(e.target.value))
                    setCurrentPage(1)
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>

              {/* Action Buttons */}
              <div className="flex items-end space-x-2">
                <button
                  onClick={handleSearch}
                  className="flex items-center px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                >
                  <MagnifyingGlassIcon className="h-4 w-4 mr-2" />
                  Search
                </button>
                <button
                  onClick={handleReset}
                  className="flex items-center px-4 py-2 bg-gray-600 text-white text-sm font-medium rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                >
                  <ArrowPathIcon className="h-4 w-4 mr-2" />
                  Reset
                </button>
                <button
                  onClick={handlePrint}
                  className="flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  <PrinterIcon className="h-4 w-4 mr-2" />
                  Print
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Assets Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
              <span className="ml-3 text-gray-600">Loading assets...</span>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th
                        onClick={() => handleSort('asset_id')}
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      >
                        <div className="flex items-center space-x-1">
                          <span>Asset ID</span>
                          {sortBy === 'asset_id' && (
                            <span className="text-red-600">
                              {sortOrder === 'asc' ? '↑' : '↓'}
                            </span>
                          )}
                        </div>
                      </th>
                      <th
                        onClick={() => handleSort('name')}
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      >
                        <div className="flex items-center space-x-1">
                          <span>Name</span>
                          {sortBy === 'name' && (
                            <span className="text-red-600">
                              {sortOrder === 'asc' ? '↑' : '↓'}
                            </span>
                          )}
                        </div>
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Model
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Category
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Condition
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Location
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Department
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {assets.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                          No assets found
                        </td>
                      </tr>
                    ) : (
                      assets.map((asset) => (
                        <tr key={asset.asset_id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-red-600">
                            {asset.asset_id}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {asset.name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {asset.model}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {asset.category}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              asset.condition === 'Good' ? 'bg-green-100 text-green-800' :
                              asset.condition === 'Fair' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {asset.condition}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {asset.location?.name || 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {asset.department?.name || 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex space-x-2">
                              <button
                                onClick={() => handleEdit(asset)}
                                className="text-blue-600 hover:text-blue-900"
                                title="Edit Asset"
                              >
                                <PencilIcon className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(asset)}
                                className="text-red-600 hover:text-red-900"
                                title="Delete Asset"
                              >
                                <TrashIcon className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              {renderPagination()}
            </>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Edit Asset</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Asset ID</label>
                  <input
                    type="text"
                    value={formData.asset_id}
                    disabled
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-100 text-gray-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Model *</label>
                  <input
                    type="text"
                    value={formData.model}
                    onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Category *</label>
                  <input
                    type="text"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Condition</label>
                  <select
                    value={formData.condition}
                    onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500"
                  >
                    <option value="Good">Good</option>
                    <option value="Fair">Fair</option>
                    <option value="Poor">Poor</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Location *</label>
                  <select
                    value={formData.location_id}
                    onChange={(e) => setFormData({ ...formData, location_id: e.target.value })}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500"
                  >
                    <option value="">Select Location</option>
                    {locations.map((location) => (
                      <option key={location.location_id} value={location.location_id}>
                        {location.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Department *</label>
                  <select
                    value={formData.department_id}
                    onChange={(e) => setFormData({ ...formData, department_id: e.target.value })}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500"
                  >
                    <option value="">Select Department</option>
                    {departments.map((department) => (
                      <option key={department.department_id} value={department.department_id}>
                        {department.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}