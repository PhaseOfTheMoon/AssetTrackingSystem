// Commented by Irene
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import ConfirmationContent from '@/components/scanner/confirmationContext'
import '@testing-library/jest-dom'

// mock lucide icons — component uses many of them
jest.mock('lucide-react', () => ({
  ChevronLeft: () => <svg />,
  CheckCircle: () => <svg />,
  Edit: () => <svg />,
  AlertCircle: () => <svg />,
  Save: () => <svg />,
  PackagePlus: () => <svg />,
  MapPin: () => <svg />,
  Building2: () => <svg />,
  Upload: () => <svg />,
  Sparkles: () => <svg />,
  PenLine: () => <svg />,
  RefreshCw: () => <svg />,
}))

// intercept all fetch calls — component hits /api/location, /api/department, /api/scanner
const mockFetch = jest.fn()
global.fetch = mockFetch

// alert fires when register form validation fails
window.alert = jest.fn()

// returns empty location/dept lists and whatever scanner result is passed in
const setupFetchMocks = (scannerResult: { success: boolean; data: any | null }) => {
  mockFetch.mockImplementation((url: string) => {
    if (url.includes('/api/location')) {
      return Promise.resolve({ json: () => Promise.resolve({ data: [] }) })
    }
    if (url.includes('/api/department')) {
      return Promise.resolve({ json: () => Promise.resolve({ data: [] }) })
    }
    if (url.includes('/api/scanner')) {
      return Promise.resolve({ json: () => Promise.resolve(scannerResult) })
    }
    return Promise.resolve({ json: () => Promise.resolve({}) })
  })
}

// shared props for most tests; individual tests override what they need
const defaultProps = {
  item: { code: 'ASSET-001' },
  tableName: 'Asset',
  onBack: jest.fn(),
  onSubmit: jest.fn(),
  onCreate: jest.fn().mockResolvedValue(undefined),
  parentScan: null,
}

describe('ConfirmationContent Component', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  // loading state
  it('shows loading state while fetching asset data', () => {
    mockFetch.mockReturnValue(new Promise(() => {})) // never resolves
    render(<ConfirmationContent {...defaultProps} />)
    expect(screen.getByText('Searching for asset...')).toBeInTheDocument()
  })

  // no item code means bad data — show error right away
  it('shows an error message when the item code is missing', async () => {
    mockFetch.mockResolvedValue({ json: () => Promise.resolve({ data: [] }) })
    render(<ConfirmationContent {...defaultProps} item={{ code: null }} />)
    await waitFor(() => {
      expect(screen.getByText('Invalid asset data.')).toBeInTheDocument()
    })
  })

  // register mode — asset not found in the system
  it('shows the register form when the asset is not found', async () => {
    setupFetchMocks({ success: false, data: null })
    render(<ConfirmationContent {...defaultProps} />)
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Register New Asset/i })).toBeInTheDocument()
    })
  })

  // scanned code must appear on the form so the user knows what they scanned
  it('shows the scanned asset code on the register form', async () => {
    setupFetchMocks({ success: false, data: null })
    render(<ConfirmationContent {...defaultProps} item={{ code: 'NEW-XYZ-999' }} />)
    await waitFor(() => screen.getByRole('heading', { name: /Register New Asset/i }))
    expect(screen.getByText('NEW-XYZ-999')).toBeInTheDocument()
  })

  it('does not call onCreate and shows alert when required fields are empty', async () => {
    setupFetchMocks({ success: false, data: null })
    const mockOnCreate = jest.fn().mockResolvedValue(undefined)
    render(<ConfirmationContent {...defaultProps} onCreate={mockOnCreate} />)
    await waitFor(() => screen.getByRole('button', { name: /Register New Asset/i }))
    fireEvent.click(screen.getByRole('button', { name: /Register New Asset/i }))
    expect(mockOnCreate).not.toHaveBeenCalled()
    expect(window.alert).toHaveBeenCalled()
  })

  it('calls onCreate with correct data when the form is fully filled and submitted', async () => {
    setupFetchMocks({ success: false, data: null })
    const mockOnCreate = jest.fn().mockResolvedValue(undefined)
    render(<ConfirmationContent {...defaultProps} onCreate={mockOnCreate} />)

    await waitFor(() => screen.getByRole('heading', { name: /Register New Asset/i }))

    fireEvent.change(screen.getByPlaceholderText('e.g., Dell Latitude 5420'), { target: { value: 'My Test Laptop' } })
    fireEvent.change(screen.getByPlaceholderText('e.g., Laptop'), { target: { value: 'IT Equipment' } })
    fireEvent.change(screen.getByPlaceholderText('e.g., Latitude 5420'), { target: { value: 'XPS 15' } })

    fireEvent.click(screen.getByRole('button', { name: /Register New Asset/i }))

    expect(mockOnCreate).toHaveBeenCalledWith({
      name: 'My Test Laptop',
      category: 'IT Equipment',
      model: 'XPS 15',
      description: '',
      condition: 'In-use',
      location_id: null,
      department_id: null,
    })
  })

  it('calls onBack when "Back to Scan" is clicked in register mode', async () => {
    setupFetchMocks({ success: false, data: null })
    const mockOnBack = jest.fn()
    render(<ConfirmationContent {...defaultProps} onBack={mockOnBack} />)
    await waitFor(() => screen.getByRole('button', { name: /Back to Scan/i }))
    fireEvent.click(screen.getByRole('button', { name: /Back to Scan/i }))
    expect(mockOnBack).toHaveBeenCalled()
  })

  // editing mode — asset already exists in the system
  it('shows "Confirm Asset" heading when the asset is found', async () => {
    setupFetchMocks({
      success: true,
      data: {
        asset_id: 'ASSET-001',
        name: 'Old Laptop',
        category: 'Tech',
        model: 'V1',
        condition: 'In-use',
        location_id: null,
        department_id: null,
        description: '',
      },
    })
    render(<ConfirmationContent {...defaultProps} />)
    await waitFor(() => {
      expect(screen.getByText('Confirm Asset')).toBeInTheDocument()
    })
  })

  it('displays the existing asset name in editing mode', async () => {
    setupFetchMocks({
      success: true,
      data: {
        asset_id: 'ASSET-001',
        name: 'Old Laptop',
        category: 'Tech',
        model: 'V1',
        condition: 'In-use',
        location_id: null,
        department_id: null,
        description: '',
      },
    })
    render(<ConfirmationContent {...defaultProps} />)
    await waitFor(() => screen.getByText('Confirm Asset'))
    expect(screen.getByText('Old Laptop')).toBeInTheDocument()
  })

  it('displays the existing asset ID and category in editing mode', async () => {
    setupFetchMocks({
      success: true,
      data: {
        asset_id: 'ASSET-001',
        name: 'Old Laptop',
        category: 'Tech',
        model: 'V1',
        condition: 'In-use',
        location_id: null,
        department_id: null,
        description: '',
      },
    })
    render(<ConfirmationContent {...defaultProps} />)
    await waitFor(() => screen.getByText('Confirm Asset'))
    expect(screen.getByText('ASSET-001')).toBeInTheDocument()
    expect(screen.getByText('Tech')).toBeInTheDocument()
  })

  it('advances to the update step when "Update Asset" is clicked', async () => {
    setupFetchMocks({
      success: true,
      data: {
        asset_id: 'ASSET-001',
        name: 'Old Laptop',
        category: 'Tech',
        model: 'V1',
        condition: 'In-use',
        location_id: null,
        department_id: null,
        description: '',
      },
    })
    render(<ConfirmationContent {...defaultProps} />)
    await waitFor(() => screen.getByRole('button', { name: /Update Asset/i }))
    fireEvent.click(screen.getByRole('button', { name: /Update Asset/i }))
    // "Confirm Asset" heading from the previous step should be gone
    expect(screen.queryByText('Confirm Asset')).not.toBeInTheDocument()
    // "Update Asset" is now a heading, not the button that was clicked
    expect(screen.queryByRole('button', { name: /^Update Asset$/i })).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /Update Asset/i })).toBeInTheDocument()
  })

  it('calls onBack when "Back" is clicked in the confirm step', async () => {
    setupFetchMocks({
      success: true,
      data: {
        asset_id: 'ASSET-001',
        name: 'Old Laptop',
        category: 'Tech',
        model: 'V1',
        condition: 'In-use',
        location_id: null,
        department_id: null,
        description: '',
      },
    })
    const mockOnBack = jest.fn()
    render(<ConfirmationContent {...defaultProps} onBack={mockOnBack} />)
    // wait for editing mode — "Update Asset" button only appears once the asset loads
    await waitFor(() => screen.getByRole('button', { name: /Update Asset/i }))
    // in editing confirm mode the back button reads exactly "Back" (not "Back to Scan")
    fireEvent.click(screen.getByRole('button', { name: /^Back$/i }))
    expect(mockOnBack).toHaveBeenCalled()
  })
})
