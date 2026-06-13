/**
 * Unit tests for the EditDepartmentPage
 *
 * This page extracts the department ID from the URL params, enforces admin access, 
 * and passes the data to the generic DynamicEdit component.
 *
 * What we cover:
 *   - Auth checking (renders nothing while loading or if not an admin)
 *   - ID extraction from useParams (handles string, array, and missing params)
 *   - Rendering DynamicEdit when authorized with the correct config and ID
 */

import { render, screen } from '@testing-library/react'
import { useAdminAccess } from '@/hooks/useAdminAccess'
import { useParams } from 'next/navigation'
import EditDepartmentPage from '@/app/(app)/admin/department/editDepartment/[id]/page'
import DynamicEdit from '@/components/dynamicEdit'

// Mock the admin access hook
jest.mock('@/hooks/useAdminAccess', () => ({
  useAdminAccess: jest.fn()
}))

// Mock Next.js navigation for useParams
jest.mock('next/navigation', () => ({
  useParams: jest.fn()
}))

// Mock the DynamicEdit component to just render a dummy div so we can check its props
jest.mock('@/components/dynamicEdit', () => {
  return jest.fn(() => <div data-testid="mock-dynamic-edit" />)
})

describe('EditDepartmentPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()

    // Default params mock
    ;(useParams as jest.Mock).mockReturnValue({ id: 'IT' })
  })

  it('renders nothing while admin access is loading', () => {
    ;(useAdminAccess as jest.Mock).mockReturnValue({ isLoading: true, isAdmin: false })
    
    const { container } = render(<EditDepartmentPage />)

    expect(container).toBeEmptyDOMElement()
  })

  it('renders nothing if the user is not an admin', () => {
    ;(useAdminAccess as jest.Mock).mockReturnValue({ isLoading: false, isAdmin: false })
    
    const { container } = render(<EditDepartmentPage />)

    expect(container).toBeEmptyDOMElement()
  })

  it('renders DynamicEdit with the correct config and recordId when user is an admin', () => {
    ;(useAdminAccess as jest.Mock).mockReturnValue({ isLoading: false, isAdmin: true })
    
    render(<EditDepartmentPage />)
    
    // Check that the mock component was rendered
    expect(screen.getByTestId('mock-dynamic-edit')).toBeInTheDocument()

    // Verify that DynamicEdit was called with the correct configuration and record ID
    expect(DynamicEdit).toHaveBeenCalledWith(
      expect.objectContaining({
        recordId: 'IT',
        config: expect.objectContaining({
          entityName: 'department',
          primaryKey: 'department_id',
          apiEndpoint: '/api/department',
        }),
      }),
      undefined
    )
  })

  it('extracts the first element safely if the router param ID is an array', () => {
    ;(useAdminAccess as jest.Mock).mockReturnValue({ isLoading: false, isAdmin: true })
    
    // Simulate Next.js passing an array of strings for the ID route
    ;(useParams as jest.Mock).mockReturnValue({ id: ['HR', 'EXTRA'] })
    
    render(<EditDepartmentPage />)
    
    expect(DynamicEdit).toHaveBeenCalledWith(
      expect.objectContaining({
        recordId: 'HR',
      }),
      undefined
    )
  })
})
