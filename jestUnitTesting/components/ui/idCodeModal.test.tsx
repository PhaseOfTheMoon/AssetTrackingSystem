import { render, screen, fireEvent } from '@testing-library/react'
import IdCodeModal from '@/components/ui/idCodeModal'

jest.mock('@/lib/supabase/client', () => ({
  supabase: {
    storage: {
      from: jest.fn().mockReturnValue({
        getPublicUrl: jest.fn().mockReturnValue({
          data: { publicUrl: 'https://example.com/barcode.png' }
        })
      })
    }
  }
}))

jest.mock('@heroicons/react/24/outline', () => ({
  XMarkIcon: () => <svg data-testid="x-mark" />,
  PrinterIcon: () => <svg data-testid="printer" />,
  ArrowDownTrayIcon: () => <svg data-testid="download" />
}))

global.fetch = jest.fn().mockResolvedValue({
  blob: () => Promise.resolve(new Blob(['img'], { type: 'image/png' }))
})
global.URL.createObjectURL = jest.fn().mockReturnValue('blob:http://localhost/mock')
global.URL.revokeObjectURL = jest.fn()

const defaultProps = {
  isOpen: true,
  onClose: jest.fn(),
  tagPath: 'assets/ICT-LAPTOP-001.png',
  entityType: 'asset' as const,
  entityId: 'ICT-LAPTOP-001',
  entityLabel: 'Lenovo ThinkPad'
}

describe('IdCodeModal', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  // modal must not render when closed
  it('renders nothing when isOpen is false', () => {
    const { container } = render(<IdCodeModal {...defaultProps} isOpen={false} />)
    expect(container.firstChild).toBeNull()
  })

  // modal must be visible when open
  it('renders the modal when isOpen is true', () => {
    render(<IdCodeModal {...defaultProps} />)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  // title for asset type should say "Asset Barcode"
  it('shows "Asset Barcode" as the title for entity type asset', () => {
    render(<IdCodeModal {...defaultProps} />)
    expect(screen.getByText('Asset Barcode')).toBeInTheDocument()
  })

  // title for location type should say "Location QR Code"
  it('shows "Location QR Code" as the title for entity type location', () => {
    render(<IdCodeModal {...defaultProps} entityType="location" />)
    expect(screen.getByText('Location QR Code')).toBeInTheDocument()
  })

  // entity ID must be shown in the header (combined with label in one element)
  it('shows the entity ID in the header', () => {
    render(<IdCodeModal {...defaultProps} />)
    expect(screen.getByText(/ICT-LAPTOP-001/)).toBeInTheDocument()
  })

  // entity label must appear alongside the ID
  it('shows the entity label when provided', () => {
    render(<IdCodeModal {...defaultProps} />)
    expect(screen.getByText(/Lenovo ThinkPad/)).toBeInTheDocument()
  })

  // close button must trigger onClose
  it('calls onClose when the close button is clicked', () => {
    const onClose = jest.fn()
    render(<IdCodeModal {...defaultProps} onClose={onClose} />)
    fireEvent.click(screen.getByLabelText('Close modal'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  // clicking the backdrop must also trigger onClose
  it('calls onClose when the backdrop is clicked', () => {
    const onClose = jest.fn()
    render(<IdCodeModal {...defaultProps} onClose={onClose} />)
    fireEvent.click(screen.getByRole('dialog'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  // null tagPath means no image can be fetched, show fallback
  it('shows "No image available" when tagPath is null', () => {
    render(<IdCodeModal {...defaultProps} tagPath={null} />)
    expect(screen.getByText('No image available')).toBeInTheDocument()
  })
})
