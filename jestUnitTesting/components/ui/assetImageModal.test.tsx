import { render, screen, fireEvent } from '@testing-library/react'
import AssetImageModal from '@/components/ui/assetImageModal'

jest.mock('@heroicons/react/24/outline', () => ({
  XMarkIcon: () => <svg data-testid="x-mark" />
}))

const defaultProps = {
  isOpen: true,
  onClose: jest.fn(),
  assetId: 'ICT-LAPTOP-001',
  imageUrl: 'https://example.com/image.png'
}

describe('AssetImageModal', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  // modal should not render anything when closed
  it('renders nothing when isOpen is false', () => {
    const { container } = render(<AssetImageModal {...defaultProps} isOpen={false} />)
    expect(container.firstChild).toBeNull()
  })

  // modal should be visible when open
  it('renders the modal when isOpen is true', () => {
    render(<AssetImageModal {...defaultProps} />)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  // header must show which asset the image belongs to
  it('shows the asset ID in the header', () => {
    render(<AssetImageModal {...defaultProps} />)
    expect(screen.getByText(/ICT-LAPTOP-001/)).toBeInTheDocument()
  })

  // the image element should load the correct URL
  it('renders the asset image when imageUrl is provided', () => {
    render(<AssetImageModal {...defaultProps} />)
    const img = screen.getByAltText(/ICT-LAPTOP-001/)
    expect(img).toBeInTheDocument()
    expect(img).toHaveAttribute('src', 'https://example.com/image.png')
  })

  // when no URL is passed, a fallback message should appear
  it('shows "No image available" when imageUrl is undefined', () => {
    render(<AssetImageModal {...defaultProps} imageUrl={undefined} />)
    expect(screen.getByText('No image available')).toBeInTheDocument()
  })

  // close button should trigger onClose
  it('calls onClose when the close button is clicked', () => {
    const onClose = jest.fn()
    render(<AssetImageModal {...defaultProps} onClose={onClose} />)
    fireEvent.click(screen.getByLabelText('Close modal'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  // clicking the backdrop should also close the modal
  it('calls onClose when the backdrop is clicked', () => {
    const onClose = jest.fn()
    render(<AssetImageModal {...defaultProps} onClose={onClose} />)
    fireEvent.click(screen.getByRole('dialog'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  // clicking inside the card must not bubble to the backdrop
  it('does not call onClose when clicking inside the modal card', () => {
    const onClose = jest.fn()
    render(<AssetImageModal {...defaultProps} onClose={onClose} />)
    fireEvent.click(screen.getByText(/Asset Image/))
    expect(onClose).not.toHaveBeenCalled()
  })

  // pressing Escape should close the modal
  it('calls onClose when the Escape key is pressed', () => {
    const onClose = jest.fn()
    render(<AssetImageModal {...defaultProps} onClose={onClose} />)
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})