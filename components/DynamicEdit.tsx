'use client'

import { useState, useEffect } from 'react'
import { useSession } from '@/components/SessionProvider'
import { useRouter } from 'next/navigation'
import Breadcrumb from '@/components/ui/Breadcrumb'
import { ArrowLeftIcon } from '@heroicons/react/24/outline'

interface FormFieldConfig {
  key: string
  label: string
  type: 'text' | 'textarea' | 'select' | 'number'
  required?: boolean
  options?: { value: string; label: string }[]
  placeholder?: string
  disabled?: boolean
}

interface DynamicEditConfig {
  entityName: string
  entityDisplayName: string
  entityDisplayNameSingular: string
  apiEndpoint: string
  primaryKey: string
  formFields: FormFieldConfig[]
  pageTitle: string
  backUrl: string
}

interface DynamicEditProps {
  config: DynamicEditConfig
  recordId: string
}

export default function DynamicEdit({ config, recordId }: DynamicEditProps) {
  const { session } = useSession()
  const router = useRouter()
  const [formData, setFormData] = useState<any>({})
  const [relatedData, setRelatedData] = useState<{ [key: string]: any[] }>({})
  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(true)
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])
  
  useEffect(() => {
    if (mounted && !session) {
      router.push('/')
    }
  }, [mounted, session, router])

  useEffect(() => {
    if (mounted && session && recordId) {
      loadRecord()
      loadRelatedData()
    }
  }, [mounted, session, recordId])

  const loadRecord = async () => {
    try {
      const response = await fetch(`${config.apiEndpoint}/${recordId}`)
      const result = await response.json()
      
      if (result.success) {
        setFormData(result.data)
      } else {
        alert('Error loading record')
        router.push(config.backUrl)
      }
    } catch (error) {
      console.error('Error loading record:', error)
      alert('Failed to load record')
      router.push(config.backUrl)
    } finally {
      setLoadingData(false)
    }
  }

  const loadRelatedData = async () => {
    const selectFields = config.formFields.filter(field => 
      field.type === 'select' && !field.options && field.key.endsWith('_id')
    )
  
    for (const field of selectFields) {
      try {
        let endpoint = ''
        if (field.key === 'location_id') endpoint = '/api/location'
        else if (field.key === 'department_id') endpoint = '/api/department'
        
        if (endpoint) {
          const response = await fetch(`${endpoint}?page=1&limit=1000`)
          const data = await response.json()
          
          const items = data.data || []
          const formattedItems = items.map((item: any) => ({
            value: item.location_id || item.department_id,
            label: item.name
          }))
          setRelatedData(prev => ({
            ...prev,
            [field.key]: formattedItems
          }))
        }
      } catch (error) {
        console.error(`Error loading ${field.key} data:`, error)
      }
    }
  }

  const handleInputChange = (key: string, value: any) => {
    setFormData((prev: { [key: string]: any }) => ({ ...prev, [key]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch(`${config.apiEndpoint}/${recordId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      const result = await response.json()
      
      if (result.success) {
        alert(`${config.entityDisplayNameSingular} updated successfully!`)
        router.push(config.backUrl)
      } else {
        alert(`Error: ${result.error}`)
      }
    } catch (error) {
      console.error('Error updating record:', error)
      alert('Failed to update record. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const renderField = (field: FormFieldConfig) => {
    const value = formData[field.key] || ''
    const isIdField = field.key === config.primaryKey
    const isDisabled = field.disabled || isIdField
  
    if (field.type === 'select') {
      let options = field.options || []
  
      if (field.key.endsWith('_id') && relatedData[field.key]) {
        options = relatedData[field.key].map(item => ({
          value: item.location_id || item.department_id,
          label: item.name
        }))
      }
  
      return (
        <select
          value={value}
          onChange={(e) => handleInputChange(field.key, e.target.value)}
          disabled={isDisabled}
          className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent ${
            isDisabled ? 'bg-gray-100 cursor-not-allowed' : ''
          }`}
          required={field.required}
        >
          <option value="">Select {field.label}</option>
          {options.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      )
    }

    if (field.type === 'textarea') {
      return (
        <textarea
          value={value}
          onChange={(e) => handleInputChange(field.key, e.target.value)}
          disabled={isDisabled}
          placeholder={field.placeholder}
          className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent ${
            isDisabled ? 'bg-gray-100 cursor-not-allowed' : ''
          }`}
          rows={3}
          required={field.required}
        />
      )
    }

    return (
      <input
        type={field.type === 'number' ? 'number' : 'text'}
        value={value}
        onChange={(e) => handleInputChange(field.key, e.target.value)}
        disabled={isDisabled}
        placeholder={field.placeholder}
        className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent ${
          isDisabled ? 'bg-gray-100 cursor-not-allowed' : ''
        }`}
        required={field.required}
      />
    )
  }

  const breadcrumbItems = [
    { label: 'Home', href: '/admin/dashboard', isClickable: true },
    { label: config.entityDisplayName, href: config.backUrl, isClickable: true },
    { label: `Edit ${config.entityDisplayNameSingular}`, href: '', isClickable: false }
  ]

  if (!mounted || !session) return null

  if (loadingData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="p-6">
        <div className="max-w-4xl mx-auto">
          <Breadcrumb />
          
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Edit {config.entityDisplayNameSingular}</h1>
            <p className="text-gray-600 mt-1">Update {config.entityDisplayNameSingular.toLowerCase()} details</p>
          </div>

          <div className="bg-white shadow-sm rounded-lg border border-gray-200">
            <form onSubmit={handleSubmit} className="p-6">
              {/* Form fields */}
              <div className="space-y-6">
                {config.formFields.map((field) => (
                  <div key={field.key}>
                    <label htmlFor={field.key} className="block text-sm font-medium text-gray-700">
                      {field.label}
                    </label>
                    <div className="mt-1">
                      {renderField(field)}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-8 flex justify-end space-x-3">
                <button
                    type="button"
                    onClick={() => router.push(config.backUrl)}
                    className="px-6 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                  >
                    Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Saving...' : `Save ${config.entityDisplayNameSingular}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  )
}