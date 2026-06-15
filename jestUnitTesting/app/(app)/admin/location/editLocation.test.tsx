/**
 * Unit tests for the EditLocationPage
 *
 * This page extracts the location ID from the URL params, enforces admin access, 
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
import EditLocationPage from '@/app/(app)/admin/location/editLocation/[id]/page'
import DynamicEdit from '@/components/dynamicEdit'

jest.mock('@/hooks/useAdminAccess', () => ({
  useAdminAccess: jest.fn()
}))

jest.mock('next/navigation', () => ({
  useParams: jest.fn()
}))

jest.mock('@/components/dynamicEdit', () => {
  return jest.fn(() => <div data-testid="mock-dynamic-edit" />)
})

describe('EditLocationPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(useParams as jest.Mock).mockReturnValue({ id: 'G001' })
  })

  it('renders nothing while admin access is loading', () => {
    ;(useAdminAccess as jest.Mock).mockReturnValue({ isLoading: true, isAdmin: false })
    
    const { container } = render(<EditLocationPage />)

    expect(container).toBeEmptyDOMElement()
  })

  it('renders nothing if the user is not an admin', () => {
    ;(useAdminAccess as jest.Mock).mockReturnValue({ isLoading: false, isAdmin: false })
    
    const { container } = render(<EditLocationPage />)

    expect(container).toBeEmptyDOMElement()
  })

  it('renders DynamicEdit with the correct config and recordId when user is an admin', () => {
    ;(useAdminAccess as jest.Mock).mockReturnValue({ isLoading: false, isAdmin: true })
    
    render(<EditLocationPage />)
    
    expect(screen.getByTestId('mock-dynamic-edit')).toBeInTheDocument()

    expect(DynamicEdit).toHaveBeenCalledWith(
      expect.objectContaining({
        recordId: 'G001',
        config: expect.objectContaining({
          entityName: 'location',
          primaryKey: 'location_id',
          apiEndpoint: '/api/location',
        }),
      }),
      undefined
    )
  })

  it('extracts the first element safely if the router param ID is an array', () => {
    ;(useAdminAccess as jest.Mock).mockReturnValue({ isLoading: false, isAdmin: true })
    ;(useParams as jest.Mock).mockReturnValue({ id: ['B504', 'EXTRA'] })
    
    render(<EditLocationPage />)
    
    expect(DynamicEdit).toHaveBeenCalledWith(
      expect.objectContaining({
        recordId: 'B504',
      }),
      undefined
    )
  })
})
