import { render, screen, act } from '@testing-library/react'
import QrPreview from '@/components/ui/qrPreview'

jest.mock('@/lib/idCode/idCodeImage', () => ({
  buildQrDataUrl: jest.fn().mockResolvedValue('data:image/png;base64,mockedqr')
}))

jest.mock('@heroicons/react/24/outline', () => ({
  ExclamationTriangleIcon: () => <svg data-testid="warning-icon" />,
  PrinterIcon: () => <svg data-testid="printer-icon" />,
  ArrowDownTrayIcon: () => <svg data-testid="download-icon" />
}))

describe('QrPreview', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  // empty value for location type shows location-specific placeholder
  it('shows "Awaiting Location ID" when value is empty and entityType is location', () => {
    render(<QrPreview value="" entityType="location" />)
    expect(screen.getByText('Awaiting Location ID')).toBeInTheDocument()
  })

  // empty value for department type shows department-specific placeholder
  it('shows "Awaiting Department ID" when value is empty and entityType is department', () => {
    render(<QrPreview value="" entityType="department" />)
    expect(screen.getByText('Awaiting Department ID')).toBeInTheDocument()
  })

  // hint text should appear below the placeholder icon
  it('shows the placeholder hint text when value is empty', () => {
    render(<QrPreview value="" entityType="location" />)
    expect(screen.getByText(/QR code will appear here/)).toBeInTheDocument()
  })

  // a valid value renders the QR preview container
  it('renders the preview region when a valid value is provided', async () => {
    await act(async () => {
      render(<QrPreview value="G001" entityType="location" />)
    })
    expect(screen.getByRole('region')).toBeInTheDocument()
  })

  // location badge shows "Location QR"
  it('shows the Location QR badge for entity type location', async () => {
    await act(async () => {
      render(<QrPreview value="G001" entityType="location" />)
    })
    expect(screen.getByText('Location QR')).toBeInTheDocument()
  })

  // department badge shows "Department QR"
  it('shows the Department QR badge for entity type department', async () => {
    await act(async () => {
      render(<QrPreview value="IT" entityType="department" />)
    })
    expect(screen.getByText('Department QR')).toBeInTheDocument()
  })

  // Save and Print buttons are visible when showControls is true
  it('shows Save and Print buttons when showControls is true', async () => {
    await act(async () => {
      render(<QrPreview value="G001" entityType="location" showControls={true} />)
    })
    expect(screen.getByTitle('Save QR code as PNG')).toBeInTheDocument()
    expect(screen.getByTitle('Print QR code')).toBeInTheDocument()
  })

  // passing showControls=false should hide the buttons
  it('hides Save and Print buttons when showControls is false', async () => {
    await act(async () => {
      render(<QrPreview value="G001" entityType="location" showControls={false} />)
    })
    expect(screen.queryByTitle('Save QR code as PNG')).not.toBeInTheDocument()
  })

  // isDuplicate border styling should not break the component
  it('still renders the preview when isDuplicate is true', async () => {
    await act(async () => {
      render(<QrPreview value="G001" entityType="location" isDuplicate={true} />)
    })
    expect(screen.getByRole('region')).toBeInTheDocument()
  })
})