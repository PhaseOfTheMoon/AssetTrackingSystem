// Commented by Irene
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import ConfirmationContent from '@/components/scanner/confirmationContext'
import '@testing-library/jest-dom'

// ─── MOCKS ───────────────────────────────────────────────────────────────────

// mock all lucide icons used in ConfirmationContent
jest.mock('lucide-react', () => ({
  ChevronLeft:  () => <svg />,
  CheckCircle:  () => <svg />,
  Edit:         () => <svg />,
  AlertCircle:  () => <svg />,
  Save:         () => <svg />,
  PackagePlus:  () => <svg />,
  MapPin:       () => <svg />,
  Building2:    () => <svg />,
  Upload:       () => <svg />,
  Sparkles:     () => <svg />,
  PenLine:      () => <svg />,
  RefreshCw:    () => <svg />,
}))

// component now calls fetch for /api/location, /api/department, and /api/scanner
// — we replace global.fetch so no real HTTP requests are made
const mockFetch = jest.fn()
global.fetch = mockFetch

// window.alert is called for validation errors in register mode
window.alert = jest.fn()

// ─── HELPERS ─────────────────────────────────────────────────────────────────

// sets up fetch to return the given scanner result plus empty location/dept lists
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

// base props reused across tests — individual tests can override specific fields
const defaultProps = {
  item:      { code: 'ASSET-001' },
  tableName: 'Asset',
  onBack:    jest.fn(),
  onSubmit:  jest.fn(),
  onCreate:  jest.fn().mockResolvedValue(undefined),
  parentScan: null,
}

// ─── TESTS ───────────────────────────────────────────────────────────────────

describe('ConfirmationContent Component', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  // ── LOADING STATE ────────────────────────────────────────────────────────

  // component should show a loading message while the API calls are in-flight
  it('shows loading state while fetching asset data', () => {
    mockFetch.mockReturnValue(new Promise(() => {})) // never resolves
    render(<ConfirmationContent {...defaultProps} />)
    expect(screen.getByText('Searching for asset...')).toBeInTheDocument()
  })

  // ── ERROR STATE ──────────────────────────────────────────────────────────

  // missing item code should immediately switch to error mode
  it('shows an error message when the item code is missing', async () => {
    mockFetch.mockResolvedValue({ json: () => Promise.resolve({ data: [] }) })
    render(<ConfirmationContent {...defaultProps} item={{ code: null }} />)
    await waitFor(() => {
      expect(screen.getByText('Invalid asset data.')).toBeInTheDocument()
    })
  })

  // ── REGISTER MODE (asset not found) ──────────────────────────────────────

  // when scanner returns no data, the user should see the register form
  it('shows the register form when the asset is not found', async () => {
    setupFetchMocks({ success: false, data: null })
    render(<ConfirmationContent {...defaultProps} />)
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Register New Asset/i })).toBeInTheDocument()
    })
  })

  // the scanned asset code should be displayed on the register form
  it('shows the scanned asset code on the register form', async () => {
    setupFetchMocks({ success: false, data: null })
    render(<ConfirmationContent {...defaultProps} item={{ code: 'NEW-XYZ-999' }} />)
    await waitFor(() => screen.getByRole('heading', { name: /Register New Asset/i }))
    expect(screen.getByText('NEW-XYZ-999')).toBeInTheDocument()
  })

  // submitting without filling in required fields must not call onCreate
  it('does not call onCreate when required fields are empty', async () => {
    setupFetchMocks({ success: false, data: null })
    const mockOnCreate = jest.fn().mockResolvedValue(undefined)
    render(<ConfirmationContent {...defaultProps} onCreate={mockOnCreate} />)
    await waitFor(() => screen.getByRole('button', { name: /Register New Asset/i }))
    fireEvent.click(screen.getByRole('button', { name: /Register New Asset/i }))
    expect(mockOnCreate).not.toHaveBeenCalled()
  })

  // filling all required fields and submitting should call onCreate with the entered data
  it('calls onCreate with correct data when the form is fully filled and submitted', async () => {
    setupFetchMocks({ success: false, data: null })
    const mockOnCreate = jest.fn().mockResolvedValue(undefined)
    render(<ConfirmationContent {...defaultProps} onCreate={mockOnCreate} />)

    await waitFor(() => screen.getByRole('heading', { name: /Register New Asset/i }))

    fireEvent.change(screen.getByPlaceholderText('e.g., Dell Latitude 5420'), { target: { value: 'My Test Laptop' } })
    fireEvent.change(screen.getByPlaceholderText('e.g., Laptop'),             { target: { value: 'IT Equipment' } })
    fireEvent.change(screen.getByPlaceholderText('e.g., Latitude 5420'),      { target: { value: 'XPS 15' } })

    fireEvent.click(screen.getByRole('button', { name: /Register New Asset/i }))

    expect(mockOnCreate).toHaveBeenCalledWith({
      name:          'My Test Laptop',
      category:      'IT Equipment',
      model:         'XPS 15',
      description:   '',
      condition:     'In-use',
      location_id:   null,
      department_id: null,
    })
  })

  // "Back to Scan" in register mode should call onBack
  it('calls onBack when "Back to Scan" is clicked in register mode', async () => {
    setupFetchMocks({ success: false, data: null })
    const mockOnBack = jest.fn()
    render(<ConfirmationContent {...defaultProps} onBack={mockOnBack} />)
    await waitFor(() => screen.getByRole('button', { name: /Back to Scan/i }))
    fireEvent.click(screen.getByRole('button', { name: /Back to Scan/i }))
    expect(mockOnBack).toHaveBeenCalled()
  })

  // ── EDITING MODE (asset found) ───────────────────────────────────────────

  // when the scanner returns existing asset data, show the confirm step
  it('shows "Confirm Asset" heading when the asset is found', async () => {
    setupFetchMocks({
      success: true,
      data: {
        asset_id:      'ASSET-001',
        name:          'Old Laptop',
        category:      'Tech',
        model:         'V1',
        condition:     'In-use',
        location_id:   null,
        department_id: null,
        description:   '',
      },
    })
    render(<ConfirmationContent {...defaultProps} />)
    await waitFor(() => {
      expect(screen.getByText('Confirm Asset')).toBeInTheDocument()
    })
  })

  // existing asset name should be displayed in the confirm step
  it('displays the existing asset name in editing mode', async () => {
    setupFetchMocks({
      success: true,
      data: {
        asset_id:      'ASSET-001',
        name:          'Old Laptop',
        category:      'Tech',
        model:         'V1',
        condition:     'In-use',
        location_id:   null,
        department_id: null,
        description:   '',
      },
    })
    render(<ConfirmationContent {...defaultProps} />)
    await waitFor(() => screen.getByText('Confirm Asset'))
    expect(screen.getByText('Old Laptop')).toBeInTheDocument()
  })

  // existing asset ID and category should appear in the confirm step
  it('displays the existing asset ID and category in editing mode', async () => {
    setupFetchMocks({
      success: true,
      data: {
        asset_id:      'ASSET-001',
        name:          'Old Laptop',
        category:      'Tech',
        model:         'V1',
        condition:     'In-use',
        location_id:   null,
        department_id: null,
        description:   '',
      },
    })
    render(<ConfirmationContent {...defaultProps} />)
    await waitFor(() => screen.getByText('Confirm Asset'))
    expect(screen.getByText('ASSET-001')).toBeInTheDocument()
    expect(screen.getByText('Tech')).toBeInTheDocument()
  })

  // clicking "Update Asset" in the confirm step should advance to the update form
  it('advances to the update step when "Update Asset" is clicked', async () => {
    setupFetchMocks({
      success: true,
      data: {
        asset_id:      'ASSET-001',
        name:          'Old Laptop',
        category:      'Tech',
        model:         'V1',
        condition:     'In-use',
        location_id:   null,
        department_id: null,
        description:   '',
      },
    })
    render(<ConfirmationContent {...defaultProps} />)
    await waitFor(() => screen.getByRole('button', { name: /Update Asset/i }))
    fireEvent.click(screen.getByRole('button', { name: /Update Asset/i }))
    // heading changes to "Update Asset" after advancing
    expect(screen.getByText('Update Asset')).toBeInTheDocument()
  })

  // "Back" in the confirm step should call onBack
  it('calls onBack when "Back" is clicked in the confirm step', async () => {
    setupFetchMocks({
      success: true,
      data: {
        asset_id:      'ASSET-001',
        name:          'Old Laptop',
        category:      'Tech',
        model:         'V1',
        condition:     'In-use',
        location_id:   null,
        department_id: null,
        description:   '',
      },
    })
    const mockOnBack = jest.fn()
    render(<ConfirmationContent {...defaultProps} onBack={mockOnBack} />)
    // wait for editing mode — "Update Asset" button only appears once the asset loads
    await waitFor(() => screen.getByRole('button', { name: /Update Asset/i }))
    // in editing confirm mode the back button reads "Back" (not "Back to Scan")
    fireEvent.click(screen.getByRole('button', { name: /Back/i }))
    expect(mockOnBack).toHaveBeenCalled()
  })
})
