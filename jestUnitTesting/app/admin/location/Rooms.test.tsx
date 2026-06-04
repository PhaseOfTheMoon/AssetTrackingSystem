import { render, screen, fireEvent } from '@testing-library/react'
import { useAdminAccess } from '@/hooks/useAdminAccess'
import LocationRoomsPage from '@/app/(app)/admin/location/rooms/page'
import DynamicPage from '@/components/dynamicPage'
import IdCodeModal from '@/components/ui/idCodeModal'

jest.mock('@/hooks/useAdminAccess', () => ({
  useAdminAccess: jest.fn()
}))

jest.mock('@/lib/supabase/client', () => ({
  supabase: {
    storage: {
      from: jest.fn(() => ({
        getPublicUrl: jest.fn(() => ({ data: { publicUrl: 'https://fake-supabase/qr.png' } }))
      }))
    }
  }
}))

// Mock DynamicPage to capture its config props so we can test the custom column rendering
jest.mock('@/components/dynamicPage', () => {
  return jest.fn(() => <div data-testid="mock-dynamic-page" />)
})

jest.mock('@/components/ui/idCodeModal', () => {
  return jest.fn(() => <div data-testid="mock-id-code-modal" />)
})

describe('LocationRoomsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders nothing while admin access is loading', () => {
    ;(useAdminAccess as jest.Mock).mockReturnValue({ isLoading: true, isAdmin: false })
    
    const { container } = render(<LocationRoomsPage />)

    expect(container).toBeEmptyDOMElement()
  })

  it('renders nothing if the user is not an admin', () => {
    ;(useAdminAccess as jest.Mock).mockReturnValue({ isLoading: false, isAdmin: false })
    
    const { container } = render(<LocationRoomsPage />)

    expect(container).toBeEmptyDOMElement()
  })

  it('renders the DynamicPage table component when user is an admin', () => {
    ;(useAdminAccess as jest.Mock).mockReturnValue({ isLoading: false, isAdmin: true })
    
    render(<LocationRoomsPage />)
    
    expect(screen.getByTestId('mock-dynamic-page')).toBeInTheDocument()
    
    expect(DynamicPage).toHaveBeenCalledWith(
      expect.objectContaining({
        config: expect.objectContaining({
          entityName: 'location',
          primaryKey: 'location_id',
          showConditionFilter: false
        })
      }),
      undefined
    )
  })

  it('opens the QR code modal when the tag_path render function is triggered', () => {
    ;(useAdminAccess as jest.Mock).mockReturnValue({ isLoading: false, isAdmin: true })
    
    render(<LocationRoomsPage />)
    
    // Extract the config passed to the mocked DynamicPage component
    const passedConfig = (DynamicPage as jest.Mock).mock.calls[0][0].config
    const tagPathColumn = passedConfig.columns.find((col: any) => col.key === 'tag_path')
    
    // Render the custom cell exactly as DynamicPage would
    const customCell = tagPathColumn.render('path/to/qr.png', { location_id: 'G001', name: 'Main Room' })
    const { getByRole } = render(customCell)
    
    // The modal should not exist yet
    expect(screen.queryByTestId('mock-id-code-modal')).not.toBeInTheDocument()
    
    // Click the QR thumbnail button
    const qrButton = getByRole('button')
    fireEvent.click(qrButton)
    
    // The modal should now be in the document
    expect(screen.getByTestId('mock-id-code-modal')).toBeInTheDocument()
    
    // Verify the modal received the correct props
    expect(IdCodeModal).toHaveBeenCalledWith(
      expect.objectContaining({
        tagPath: 'path/to/qr.png',
        entityId: 'G001',
        entityLabel: 'Main Room'
      }),
      undefined
    )
  })

  it('renders a No QR badge if tag_path is null', () => {
    ;(useAdminAccess as jest.Mock).mockReturnValue({ isLoading: false, isAdmin: true })
    
    render(<LocationRoomsPage />)
    
    const passedConfig = (DynamicPage as jest.Mock).mock.calls[0][0].config
    const tagPathColumn = passedConfig.columns.find((col: any) => col.key === 'tag_path')
    
    const customCell = tagPathColumn.render(null, { location_id: 'G001' })
    const { getByText } = render(customCell)
    
    expect(getByText('No QR')).toBeInTheDocument()
  })
})
