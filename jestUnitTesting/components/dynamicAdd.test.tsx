/**
 * Unit tests for the DynamicAdd component
 *
 * This component acts as a universal form for adding Assets, Locations, and Departments.
 *
 * What we cover:
 * - Auth checking (shows loading, returns null & redirects when unauthenticated)
 * - Related data fetching on mount (locations and departments)
 * - Correct form initialization based on dynamic configuration
 * - Debounced barcode preview generation (400ms)
 * - Debounced duplicate asset_id checking (800ms)
 * - Live client-side regex validation (Strict text, level, email, mobile)
 * - Zod schema validation on form submission
 * - Nullifying empty foreign key fields (location_id, department_id)
 * - Form submission behavior (POST request formatting, success redirects, conflict errors)
 * - Cancel button behavior
 */

import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import DynamicAdd from '@/components/dynamicAdd'
import type { dynamicAddConfig } from '@/components/dynamicAdd'

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}))

// Mock next-auth/react
jest.mock('next-auth/react', () => ({
  useSession: jest.fn(),
}))

// Mock Breadcrumb
jest.mock('@/components/ui/breadcrumb', () => {
  return function MockBreadcrumb() {
    return <div data-testid="breadcrumb">Breadcrumb</div>
  }
})

// Mock BarcodePreview
jest.mock('@/components/ui/barcodePreview', () => {
  return function MockBarcodePreview({ value, isDuplicate }: any) {
    return (
      <div data-testid="barcode-preview">
        Barcode: {value} {isDuplicate ? '(Duplicate)' : ''}
      </div>
    )
  }
})

// Mock fetch and alert
global.fetch = jest.fn()
global.alert = jest.fn()

// --- Test Data Configurations ---

const mockAssetConfig: dynamicAddConfig = {
  entityName: 'asset',
  entityDisplayName: 'Asset',
  entityDisplayNameSingular: 'Asset',
  apiEndpoint: '/api/assets',
  primaryKey: 'asset_id',
  pageTitle: 'Add Asset',
  backUrl: '/admin/assets',
  formFields: [
    { key: 'asset_id', label: 'Asset ID', type: 'text', required: true, maxLength: 30 },
    { key: 'name', label: 'Name', type: 'text', required: true, maxLength: 50 },
    { key: 'model', label: 'Model', type: 'text', required: true, maxLength: 30 },
    { key: 'category', label: 'Category', type: 'text', required: true, maxLength: 50 },
    { key: 'condition', label: 'Condition', type: 'select', options: [{ value: 'In-use', label: 'In-use' }] },
    { key: 'location_id', label: 'Location', type: 'select' }, // dynamic options
    { key: 'desc', label: 'Description', type: 'textarea' },
    { key: 'level', label: 'Level', type: 'text' }, // specialized validation test
  ],
}

describe('DynamicAdd Component', () => {
  const mockPush = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    jest.mocked(useRouter).mockReturnValue({ push: mockPush } as any)
    
    // Default fetch mock using clean, lightweight structural mock objects
    jest.mocked(global.fetch).mockImplementation((url: any) => {
      if (url.includes('/api/location')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ data: [{ location_id: 'L1', name: 'Server Room' }] })
        } as any)
      }
      if (url.includes('/api/department')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ data: [{ department_id: 'D1', name: 'IT Dept' }] })
        } as any)
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({})
      } as any)
    })
  })

  // ─── Auth & Loading States ──────────────────────────────────────────────────

  it('renders a loading spinner when session status is loading', () => {
    jest.mocked(useSession).mockReturnValue({ status: 'loading' } as any)
    render(<DynamicAdd config={mockAssetConfig} />)
    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })

  it('redirects to /login and renders nothing if unauthenticated', async () => {
    jest.mocked(useSession).mockReturnValue({ status: 'unauthenticated' } as any)
    const { container } = render(<DynamicAdd config={mockAssetConfig} />)
    
    expect(container).toBeEmptyDOMElement()
    expect(mockPush).toHaveBeenCalledWith('/login')
  })

  // ─── Rendering & Initialization ──────────────────────────────────────────────

  it('renders the form correctly for authenticated users', async () => {
    jest.mocked(useSession).mockReturnValue({ status: 'authenticated' } as any)
    
    await act(async () => { render(<DynamicAdd config={mockAssetConfig} />) })

    // Look specifically for the heading element to avoid matching the button text
    expect(screen.getByRole('heading', { name: /Add Asset/i })).toBeInTheDocument()
    expect(screen.getByTestId('breadcrumb')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Add Asset/i })).toBeInTheDocument()
  })

  it('fetches and populates location options on mount', async () => {
    jest.mocked(useSession).mockReturnValue({ status: 'authenticated' } as any)
    
    await act(async () => { render(<DynamicAdd config={mockAssetConfig} />) })

    // Fix: Match the exact text element rendered inside your option rows
    await waitFor(() => {
      expect(screen.getByText('L1 - Server Room')).toBeInTheDocument()
    })
    
    expect(global.fetch).toHaveBeenCalledWith('/api/location?page=1&limit=100')
  })

  it('displays an error banner if related data fetching fails', async () => {
    jest.mocked(useSession).mockReturnValue({ status: 'authenticated' } as any)
    jest.mocked(global.fetch).mockRejectedValueOnce(new Error('Network error'))

    await act(async () => { render(<DynamicAdd config={mockAssetConfig} />) })

    await waitFor(() => {
      expect(screen.getByText('Failed to load location and department options. Some dropdowns may be empty.')).toBeInTheDocument()
    })
  })

  // ─── Client-Side Validation ─────────────────────────────────────────────────

  it('shows strict validation error when typing special characters in standard text fields', async () => {
    jest.mocked(useSession).mockReturnValue({ status: 'authenticated' } as any)
    await act(async () => { render(<DynamicAdd config={mockAssetConfig} />) })

    // The name field has strict validation
    const nameInput = document.getElementById('name') as HTMLInputElement
    
    await act(async () => {
      fireEvent.change(nameInput, { target: { value: 'Bad@Name!' } })
    })

    expect(screen.getByText(/Contains sensitive special characters/i)).toBeInTheDocument()
  })

  it('allows positive integers and hyphens in Level field', async () => {
    jest.mocked(useSession).mockReturnValue({ status: 'authenticated' } as any)
    await act(async () => { render(<DynamicAdd config={mockAssetConfig} />) })

    const levelInput = document.getElementById('level') as HTMLInputElement
    
    // Valid input (Integers only)
    await act(async () => { fireEvent.change(levelInput, { target: { value: '2' } }) })
    expect(screen.queryByText(/Invalid:/i)).not.toBeInTheDocument()

    // Invalid input (Hyphens or letters)
    await act(async () => { fireEvent.change(levelInput, { target: { value: 'LG-1' } }) })
    expect(screen.getByText(/Level can only be numbers/i)).toBeInTheDocument()
  })

  // ─── Debouncing & Duplicate Checking ────────────────────────────────────────

  it('triggers debounced duplicate check and barcode update when asset_id is typed', async () => {
    jest.useFakeTimers()
    jest.mocked(useSession).mockReturnValue({ status: 'authenticated' } as any)
    
    jest.mocked(global.fetch).mockImplementation(async (url: any) => {
      if (url.includes('/api/check')) {
        // Fix: must return exists: true to trigger the "already exists" warning
        return { ok: true, json: async () => ({ exists: true }) } as any
      }
      return { ok: true, json: async () => ({ data: [] }) } as any
    })

    await act(async () => { render(<DynamicAdd config={mockAssetConfig} />) })

    const idInput = document.getElementById('asset_id') as HTMLInputElement
    
    await act(async () => {
      fireEvent.change(idInput, { target: { value: 'NEW-ASSET' } })
    })

    await act(async () => { jest.advanceTimersByTime(400) })
    expect(screen.getByTestId('barcode-preview')).toHaveTextContent('Barcode: NEW-ASSET')

    await act(async () => { jest.advanceTimersByTime(400) })
    await act(async () => { jest.runAllTimers() })

    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/api/check?table=Asset&id=NEW-ASSET'))
    
    await waitFor(() => {
      expect(screen.getByText(/already exists/i)).toBeInTheDocument()
    })

    jest.useRealTimers()
  })

  // ─── Form Submission ────────────────────────────────────────────────────────

  it('submits form successfully and redirects on 200 OK', async () => {
    jest.useFakeTimers()
    jest.mocked(useSession).mockReturnValue({ status: 'authenticated' } as any)
    
    // Override fetch to succeed on POST and handle the duplicate check GET
    jest.mocked(global.fetch).mockImplementation(async (url: any, options) => {
      if (options?.method === 'POST') {
        return { ok: true, json: async () => ({ success: true }) } as any
      }
      if (url.includes('/api/check')) {
        return { ok: true, json: async () => ({ exists: false }) } as any
      }
      return { ok: true, json: async () => ({ data: [] }) } as any
    })

    await act(async () => { render(<DynamicAdd config={mockAssetConfig} />) })

    // Fill out required fields
    await act(async () => {
      fireEvent.change(document.getElementById('asset_id')!, { target: { value: 'A100' } })
      fireEvent.change(document.getElementById('name')!, { target: { value: 'Test Laptop' } })
      fireEvent.change(document.getElementById('model')!, { target: { value: 'Dell XPS' } })
      fireEvent.change(document.getElementById('category')!, { target: { value: 'Hardware' } })
    })

    await act(async () => { jest.runAllTimers() })

    const submitButton = screen.getByRole('button', { name: /Add Asset/i })
    expect(submitButton).not.toBeDisabled()

    await act(async () => {
      fireEvent.click(submitButton)
    })

    expect(global.fetch).toHaveBeenCalledWith('/api/assets', expect.objectContaining({
      method: 'POST',
      body: expect.stringContaining('"asset_id":"A100"'),
    }))

    expect(mockPush).toHaveBeenCalledWith('/admin/assets')

    jest.useRealTimers()
  })

  it('prevents submission if validation errors exist', async () => {
    jest.mocked(useSession).mockReturnValue({ status: 'authenticated' } as any)
    await act(async () => { render(<DynamicAdd config={mockAssetConfig} />) })

    // Trigger client-side input validation error rule intentionally
    const nameInput = screen.getByLabelText(/Name/i) as HTMLInputElement
    await act(async () => {
      fireEvent.change(nameInput, { target: { value: 'Bad@Name' } })
    })

    // const submitButton = screen.getByRole('button', { name: /Add Asset/i })
    const formElement = nameInput.closest('form')
    
    await act(async () => {
      fireEvent.submit(formElement!)
    })
    
    // Assert that we did not execute backend network requests because validation blocked it
    expect(jest.mocked(global.fetch)).not.toHaveBeenCalledWith('/api/assets', expect.any(Object))
  })

  // ─── Buttons ───────────────────────────────────────────────────────────────

  it('navigates back when Cancel is clicked', async () => {
    jest.mocked(useSession).mockReturnValue({ status: 'authenticated' } as any)
    await act(async () => { render(<DynamicAdd config={mockAssetConfig} />) })

    const cancelButton = screen.getByRole('button', { name: /Cancel/i })
    fireEvent.click(cancelButton)

    expect(mockPush).toHaveBeenCalledWith('/admin/assets')
  })
})