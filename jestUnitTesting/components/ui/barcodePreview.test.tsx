import { render, screen, act } from '@testing-library/react'
import BarcodePreview from '@/components/ui/barcodePreview'

jest.mock('@/lib/idCode/idCodeImage', () => ({
  buildBarcodeDataUrl: jest.fn().mockResolvedValue('data:image/png;base64,mockedbarcode')
}))

jest.mock('@heroicons/react/24/outline', () => ({
  ExclamationTriangleIcon: () => <svg data-testid="warning-icon" />,
  PrinterIcon: () => <svg data-testid="printer-icon" />,
  ArrowDownTrayIcon: () => <svg data-testid="download-icon" />
}))

describe('BarcodePreview', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  // empty string should show the placeholder state
  it('shows "Awaiting Asset ID" when value is empty', () => {
    render(<BarcodePreview value="" />)
    expect(screen.getByText('Awaiting Asset ID')).toBeInTheDocument()
  })

  // whitespace-only value should also trigger the placeholder
  it('shows placeholder when value is only whitespace', () => {
    render(<BarcodePreview value="   " />)
    expect(screen.getByText('Awaiting Asset ID')).toBeInTheDocument()
  })

  // a valid value should render the preview container
  it('renders the preview region when a valid value is provided', async () => {
    await act(async () => {
      render(<BarcodePreview value="ICT-LAPTOP-001" />)
    })
    expect(screen.getByRole('region')).toBeInTheDocument()
  })

  // "Preview" label appears in the toolbar when in preview mode
  it('shows the Preview label when value is valid', async () => {
    await act(async () => {
      render(<BarcodePreview value="ICT-LAPTOP-001" />)
    })
    expect(screen.getByText('Preview')).toBeInTheDocument()
  })

  // Save and Print buttons appear by default
  it('shows Save and Print buttons when showControls is true', async () => {
    await act(async () => {
      render(<BarcodePreview value="ICT-LAPTOP-001" showControls={true} />)
    })
    expect(screen.getByTitle('Save barcode as PNG')).toBeInTheDocument()
    expect(screen.getByTitle('Print barcode')).toBeInTheDocument()
  })

  // passing showControls=false should hide the buttons
  it('hides Save and Print buttons when showControls is false', async () => {
    await act(async () => {
      render(<BarcodePreview value="ICT-LAPTOP-001" showControls={false} />)
    })
    expect(screen.queryByTitle('Save barcode as PNG')).not.toBeInTheDocument()
  })

  // isDuplicate should not crash, preview still renders
  it('still renders the preview when isDuplicate is true', async () => {
    await act(async () => {
      render(<BarcodePreview value="ICT-LAPTOP-001" isDuplicate={true} />)
    })
    expect(screen.getByRole('region')).toBeInTheDocument()
  })
})
