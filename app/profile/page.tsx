'use client'

import { useIsAuthenticated, useMsal } from '@azure/msal-react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function ProfilePage() {
  const isAuthenticated = useIsAuthenticated()
  const { accounts } = useMsal()
  const router = useRouter()
  const [userName, setUserName] = useState('')

  useEffect(() => {
    // Get user name from Microsoft account if available
    if (accounts.length > 0) {
      setUserName(accounts[0].name || 'User Name')
    }
  }, [accounts])

  // Placeholder data - will be replaced with real data from backend later
  const placeholderData = {
    userId: 'USR-12345',
    department: 'Information Technology',
    assignedAssets: [
      { id: 'AST-001', name: 'Laptop Dell XPS 15' },
      { id: 'AST-042', name: 'Monitor Samsung 27"' },
      { id: 'AST-089', name: 'Keyboard Logitech' },
      { id: 'AST-105', name: 'Mouse Wireless' },
    ]
  }

  // Show max 3 assets, with "View All" if more than 3
  const displayAssets = placeholderData.assignedAssets.slice(0, 3)
  const hasMoreAssets = placeholderData.assignedAssets.length > 3

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Profile Card */}
        <div className="bg-white rounded-lg shadow-lg p-6 md:p-8">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">User Profile</h1>
            <div className="h-1 w-20 bg-red-600 rounded"></div>
          </div>

          {/* User Information */}
          <div className="space-y-4">
            {/* User Name */}
            <div className="flex flex-col sm:flex-row sm:items-center">
              <label className="text-sm font-semibold text-gray-700 w-full sm:w-40 mb-1 sm:mb-0">
                User Name:
              </label>
              <div className="text-gray-900 bg-gray-50 px-4 py-2 rounded-md flex-1">
                {userName || 'Loading...'}
              </div>
            </div>

            {/* User ID */}
            <div className="flex flex-col sm:flex-row sm:items-center">
              <label className="text-sm font-semibold text-gray-700 w-full sm:w-40 mb-1 sm:mb-0">
                User ID:
              </label>
              <div className="text-gray-900 bg-gray-50 px-4 py-2 rounded-md flex-1">
                {placeholderData.userId}
              </div>
            </div>

            {/* Department */}
            <div className="flex flex-col sm:flex-row sm:items-center">
              <label className="text-sm font-semibold text-gray-700 w-full sm:w-40 mb-1 sm:mb-0">
                Department:
              </label>
              <div className="text-gray-900 bg-gray-50 px-4 py-2 rounded-md flex-1">
                {placeholderData.department}
              </div>
            </div>

            {/* Assigned Assets */}
            <div className="pt-4">
              <label className="text-sm font-semibold text-gray-700 mb-3 block">
                Assigned Assets:
              </label>
              <div className="space-y-3">
                {displayAssets.map((asset, index) => (
                  <div
                    key={asset.id}
                    className="bg-white border-2 border-gray-300 rounded-full px-4 py-3 flex items-center justify-between hover:border-red-400 transition-colors"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900">{asset.name}</p>
                      <p className="text-xs text-gray-500">{asset.id}</p>
                    </div>
                  </div>
                ))}

                {/* View All Button (shows if more than 3 assets) */}
                {hasMoreAssets && (
                  <button
                    onClick={() => {
                      // Navigate to assigned assets page (to be created later)
                      alert('Assigned Assets page - to be implemented')
                    }}
                    className="w-full bg-red-600 hover:bg-red-700 text-white rounded-full px-4 py-3 flex items-center justify-center space-x-2 transition-colors"
                  >
                    <span className="text-lg font-semibold">+</span>
                    <span className="text-sm font-medium">View All Assets ({placeholderData.assignedAssets.length})</span>
                  </button>
                )}

                {/* Show message if no assets */}
                {displayAssets.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    No assets assigned yet
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Back Button (for now, goes to home) */}
        <div className="mt-6">
          <button
            onClick={() => router.push('/')}
            className="w-full sm:w-auto px-6 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-md transition-colors"
          >
            Back to Home
          </button>
        </div>
      </div>
    </div>
  )
}