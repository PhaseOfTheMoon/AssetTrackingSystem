'use client'

import { useState, useEffect } from 'react'
import { ChevronUpIcon, ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline'

interface Column {
  key: string
  label: string
  sortable?: boolean
  render?: (value: any, row: any) => React.ReactNode
}

interface DataTableProps {
  columns: Column[]
  data: any[]
  loading?: boolean
  pagination?: {
    currentPage: number
    totalPages: number
    totalItems: number
    onPageChange: (page: number) => void
  }
  sorting?: {
    sortBy: string
    sortOrder: 'asc' | 'desc'
    onSort: (column: string) => void
  }
  actions?: {
    onEdit?: (row: any) => void
    onDelete?: (row: any) => void
    onView?: (row: any) => void
  }
}

export default function DataTable({
  columns,
  data,
  loading = false,
  pagination,
  sorting,
  actions
}: DataTableProps) {
  const renderSortIcon = (column: Column) => {
    if (!column.sortable || !sorting) return null
    
    if (sorting.sortBy === column.key) {
      return sorting.sortOrder === 'asc' ? (
        <ChevronUpIcon className="w-4 h-4 ml-1" />
      ) : (
        <ChevronDownIcon className="w-4 h-4 ml-1" />
      )
    }
    
    return (
      <div className="flex flex-col ml-1">
        <ChevronUpIcon className="w-3 h-3 text-gray-300" />
        <ChevronDownIcon className="w-3 h-3 text-gray-300 -mt-1" />
      </div>
    )
  }

  const handleSort = (column: Column) => {
    if (column.sortable && sorting) {
      sorting.onSort(column.key)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="bg-white shadow-sm rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${
                    column.sortable ? 'cursor-pointer hover:bg-gray-100' : ''
                  }`}
                  onClick={() => handleSort(column)}
                >
                  <div className="flex items-center">
                    {column.label}
                    {renderSortIcon(column)}
                  </div>
                </th>
              ))}
              {actions && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + (actions ? 1 : 0)}
                  className="px-6 py-4 text-center text-gray-500"
                >
                  No data available
                </td>
              </tr>
            ) : (
              data.map((row, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  {columns.map((column) => (
                    <td key={column.key} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {column.render ? column.render(row[column.key], row) : row[column.key]}
                    </td>
                  ))}
                  {actions && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        {actions.onView && (
                          <button
                            onClick={() => actions.onView!(row)}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            View
                          </button>
                        )}
                        {actions.onEdit && (
                          <button
                            onClick={() => actions.onEdit!(row)}
                            className="text-indigo-600 hover:text-indigo-900"
                          >
                            Edit
                          </button>
                        )}
                        {actions.onDelete && (
                          <button
                            onClick={() => actions.onDelete!(row)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      
      {pagination && (
        <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
          <div className="flex-1 flex justify-between sm:hidden">
            <button
              onClick={() => pagination.onPageChange(pagination.currentPage - 1)}
              disabled={pagination.currentPage <= 1}
              className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              onClick={() => pagination.onPageChange(pagination.currentPage + 1)}
              disabled={pagination.currentPage >= pagination.totalPages}
              className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                Showing{' '}
                <span className="font-medium">
                  {(pagination.currentPage - 1) * 10 + 1}
                </span>{' '}
                to{' '}
                <span className="font-medium">
                  {Math.min(pagination.currentPage * 10, pagination.totalItems)}
                </span>{' '}
                of{' '}
                <span className="font-medium">{pagination.totalItems}</span> results
              </p>
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                <button
                  onClick={() => pagination.onPageChange(pagination.currentPage - 1)}
                  disabled={pagination.currentPage <= 1}
                  className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeftIcon className="h-5 w-5" />
                </button>
                
                {/* Page numbers */}
                {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                  const pageNum = i + 1
                  return (
                    <button
                      key={pageNum}
                      onClick={() => pagination.onPageChange(pageNum)}
                      className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                        pageNum === pagination.currentPage
                          ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                          : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      {pageNum}
                    </button>
                  )
                })}
                
                <button
                  onClick={() => pagination.onPageChange(pagination.currentPage + 1)}
                  disabled={pagination.currentPage >= pagination.totalPages}
                  className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRightIcon className="h-5 w-5" />
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}