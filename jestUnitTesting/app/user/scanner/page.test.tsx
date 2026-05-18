// Commented by Irene
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import ScannerPage from '@/app/(app)/user/scanner/page'
import { useAuth } from '@/hooks/useAuth'

// fake out the auth hook so we control login state in each test
jest.mock('@/hooks/useAuth', () => ({
  useAuth: jest.fn(),
}))

const mockPush = jest.fn()
const mockSearchParamsGet = jest.fn()

// fake out Next.js navigation — useSearchParams lets us pretend to pass ?type=xxx
jest.mock('next/navigation', () => ({
  useSearchParams: () => ({ get: mockSearchParamsGet }),
  useRouter: () => ({ push: mockPush }),
}))

// replace lucide icons with plain SVGs so we don't need the real icon library
jest.mock('lucide-react', () => ({
  Package: () => <svg />,
  Users: () => <svg />,
  MapPin: () => <svg />,
  Building2: () => <svg />,
  CheckCircle: () => <svg />,
  AlertCircle: () => <svg />,
  ShoppingCart: () => <svg />,
  Trash2: () => <svg data-testid="trash-icon" />,
  X: () => <svg data-testid="x-icon" />,
}))

// ScannerContent mock — lets tests trigger a scan by clicking a button
jest.mock('@/components/scanner/scannerContext', () => {
  return function MockScannerContent({ onItemScanned, title, onBack }: any) {
    return (
      <div data-testid="scanner-content">
        <h1 data-testid="scanner-title">{title}</h1>
        <button
          data-testid="trigger-scan"
          onClick={() => onItemScanned({ code: 'TEST-001' })}
        >
          Simulate Scan
        </button>
        <button data-testid="trigger-back" onClick={onBack}>
          Back
        </button>
      </div>
    )
  }
})

// SuccessContent mock — shows scanType so tests can check which flow completed
jest.mock('@/components/scanner/successContent', () => {
  return function MockSuccessContent({ scanType, item }: any) {
    return (
      <div data-testid="success-content">
        <div data-testid="scan-type">{scanType}</div>
        <div data-testid="item-name">{item?.name}</div>
      </div>
    )
  }
})

// ConfirmationContent mock — exposes submit and create buttons so tests can click them
jest.mock('@/components/scanner/confirmationContext', () => {
  return function MockConfirmationContent({ onSubmit, onCreate, onBack }: any) {
    return (
      <div data-testid="confirmation-content">
        <button
          data-testid="confirm-submit"
          onClick={() => onSubmit({ condition: 'In-use', location_id: 'L001', department_id: null })}
        >
          Submit Changes
        </button>
        <button
          data-testid="confirm-create"
          onClick={() => onCreate({ name: 'New Asset', category: 'IT', model: 'X1', description: '', condition: 'In-use', location_id: null, department_id: null })}
        >
          Register Asset
        </button>
        <button data-testid="confirm-back" onClick={onBack}>
          Back
        </button>
      </div>
    )
  }
})

// mock fetch and alert so tests can intercept and check them
global.fetch = jest.fn()
global.alert = jest.fn()

// shorthand auth states to reuse across tests
const authReady = { isLoading: false, isAuthenticated: true }
const authLoading = { isLoading: true, isAuthenticated: false }
const authGuest = { isLoading: false, isAuthenticated: false }

// wrap fetch response so tests don't have to repeat the same boilerplate
function mockFetch(data: any, success = true) {
  return { json: () => Promise.resolve({ success, data }) }
}

describe('ScannerPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockSearchParamsGet.mockReturnValue(null) // defaults to asset scan
    ;(global.fetch as jest.Mock).mockResolvedValue(mockFetch(null))
  })

  // page should show nothing while still checking if user is logged in
  it('renders nothing while auth is loading', () => {
    ;(useAuth as jest.Mock).mockReturnValue(authLoading)
    const { container } = render(<ScannerPage />)
    expect(container.firstChild).toBeNull()
  })

  // logged out users shouldn't see the scanner at all
  it('renders nothing when the user is not authenticated', () => {
    ;(useAuth as jest.Mock).mockReturnValue(authGuest)
    const { container } = render(<ScannerPage />)
    expect(container.firstChild).toBeNull()
  })

  // without any ?type= param, it defaults to the asset scanner
  it('shows Asset Scanner by default when no type param is set', () => {
    ;(useAuth as jest.Mock).mockReturnValue(authReady)
    render(<ScannerPage />)
    expect(screen.getByTestId('scanner-title')).toHaveTextContent('Asset Scanner')
  })

  // ?type=location should show the location scanner
  it('shows Location Scanner when type=location', () => {
    ;(useAuth as jest.Mock).mockReturnValue(authReady)
    mockSearchParamsGet.mockReturnValue('location')
    render(<ScannerPage />)
    expect(screen.getByTestId('scanner-title')).toHaveTextContent('Location Scanner')
  })

  // ?type=staff should show the staff ID scanner
  it('shows Staff ID Scanner when type=staff', () => {
    ;(useAuth as jest.Mock).mockReturnValue(authReady)
    mockSearchParamsGet.mockReturnValue('staff')
    render(<ScannerPage />)
    expect(screen.getByTestId('scanner-title')).toHaveTextContent('Staff ID Scanner')
  })

  // ?type=department should show the department scanner
  it('shows Department Scanner when type=department', () => {
    ;(useAuth as jest.Mock).mockReturnValue(authReady)
    mockSearchParamsGet.mockReturnValue('department')
    render(<ScannerPage />)
    expect(screen.getByTestId('scanner-title')).toHaveTextContent('Department Scanner')
  })

  // pressing Back on the scanner should send the user to their dashboard
  it('navigates to dashboard when Back is clicked on the scanner', () => {
    ;(useAuth as jest.Mock).mockReturnValue(authReady)
    render(<ScannerPage />)
    fireEvent.click(screen.getByTestId('trigger-back'))
    expect(mockPush).toHaveBeenCalledWith('/user/dashboard')
  })

  // scanning an asset code should bring up the confirmation screen
  it('moves to confirmation when an asset code is scanned', async () => {
    ;(useAuth as jest.Mock).mockReturnValue(authReady)
    render(<ScannerPage />)

    await act(async () => { fireEvent.click(screen.getByTestId('trigger-scan')) })

    expect(screen.getByTestId('confirmation-content')).toBeInTheDocument()
  })

  // pressing Back inside confirmation should go back to the scanner
  it('returns to scanning when Back is clicked inside confirmation', async () => {
    ;(useAuth as jest.Mock).mockReturnValue(authReady)
    render(<ScannerPage />)

    await act(async () => { fireEvent.click(screen.getByTestId('trigger-scan')) })
    await act(async () => { fireEvent.click(screen.getByTestId('confirm-back')) })

    expect(screen.getByTestId('scanner-content')).toBeInTheDocument()
  })

  // submitting an update should POST to /api/scanner and show the success screen
  it('calls POST /api/scanner and shows success after submitting asset update', async () => {
    ;(useAuth as jest.Mock).mockReturnValue(authReady)
    ;(global.fetch as jest.Mock).mockResolvedValue(mockFetch(null, true))

    render(<ScannerPage />)

    await act(async () => { fireEvent.click(screen.getByTestId('trigger-scan')) })
    await act(async () => { fireEvent.click(screen.getByTestId('confirm-submit')) })

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/scanner',
        expect.objectContaining({ method: 'POST' })
      )
      expect(screen.getByTestId('success-content')).toBeInTheDocument()
    })
  })

  // registering a brand new asset should show "New Asset Registered" on success
  it('shows New Asset Registered scan type after creating a new asset', async () => {
    ;(useAuth as jest.Mock).mockReturnValue(authReady)
    ;(global.fetch as jest.Mock).mockResolvedValue(mockFetch(null, true))

    render(<ScannerPage />)

    await act(async () => { fireEvent.click(screen.getByTestId('trigger-scan')) })
    await act(async () => { fireEvent.click(screen.getByTestId('confirm-create')) })

    await waitFor(() => {
      expect(screen.getByTestId('success-content')).toBeInTheDocument()
      expect(screen.getByTestId('scan-type')).toHaveTextContent('New Asset Registered')
    })
  })

  // if the asset update POST fails, success screen must not appear
  it('shows error alert and stays off success screen when asset update POST fails', async () => {
    ;(useAuth as jest.Mock).mockReturnValue(authReady)
    ;(global.fetch as jest.Mock).mockResolvedValue(mockFetch(null, false))

    render(<ScannerPage />)

    await act(async () => { fireEvent.click(screen.getByTestId('trigger-scan')) })
    await act(async () => { fireEvent.click(screen.getByTestId('confirm-submit')) })

    await waitFor(() => {
      expect(global.alert).toHaveBeenCalled()
      expect(screen.queryByTestId('success-content')).not.toBeInTheDocument()
    })
  })

  // first scan in location mode looks up the location — scanner should stay open for the asset scan
  it('stays on scanning after the first scan (location step) succeeds', async () => {
    ;(useAuth as jest.Mock).mockReturnValue(authReady)
    mockSearchParamsGet.mockReturnValue('location')
    ;(global.fetch as jest.Mock).mockResolvedValue(
      mockFetch({ name: 'Warehouse A' }, true)
    )

    render(<ScannerPage />)

    await act(async () => { fireEvent.click(screen.getByTestId('trigger-scan')) })

    await waitFor(() => {
      expect(screen.getByTestId('scanner-content')).toBeInTheDocument()
    })
  })

  // if the scanned location code doesn't exist, show an alert
  it('shows alert when the scanned location ID is not found', async () => {
    ;(useAuth as jest.Mock).mockReturnValue(authReady)
    mockSearchParamsGet.mockReturnValue('location')
    ;(global.fetch as jest.Mock).mockResolvedValue(mockFetch(null, false))

    render(<ScannerPage />)

    await act(async () => { fireEvent.click(screen.getByTestId('trigger-scan')) })

    await waitFor(() => {
      expect(global.alert).toHaveBeenCalledWith(expect.stringContaining('not found'))
    })
  })

  // second scan (asset) in location mode — should tag the asset and show success
  it('tags asset to location and shows success on the second scan', async () => {
    ;(useAuth as jest.Mock).mockReturnValue(authReady)
    mockSearchParamsGet.mockReturnValue('location')

    ;(global.fetch as jest.Mock)
      .mockResolvedValueOnce(mockFetch({ name: 'Warehouse A' }, true))           // location lookup
      .mockResolvedValueOnce(mockFetch({ asset_id: 'TEST-001', name: 'Laptop' }, true)) // asset lookup
      .mockResolvedValueOnce(mockFetch(null, true))                              // tag_asset post

    render(<ScannerPage />)

    await act(async () => { fireEvent.click(screen.getByTestId('trigger-scan')) })
    await waitFor(() => expect(screen.getByTestId('scanner-content')).toBeInTheDocument())
    await act(async () => { fireEvent.click(screen.getByTestId('trigger-scan')) })

    await waitFor(() => {
      expect(screen.getByTestId('success-content')).toBeInTheDocument()
      expect(screen.getByTestId('scan-type')).toHaveTextContent('Tagged to Warehouse A')
    })
  })

  // if the asset isn't found during location tagging, show the registration form instead
  it('goes to confirmation when asset is not found during location tagging', async () => {
    ;(useAuth as jest.Mock).mockReturnValue(authReady)
    mockSearchParamsGet.mockReturnValue('location')

    ;(global.fetch as jest.Mock)
      .mockResolvedValueOnce(mockFetch({ name: 'Warehouse A' }, true)) // location found
      .mockResolvedValueOnce(mockFetch(null, false))                    // asset not found

    render(<ScannerPage />)

    await act(async () => { fireEvent.click(screen.getByTestId('trigger-scan')) })
    await waitFor(() => expect(screen.getByTestId('scanner-content')).toBeInTheDocument())
    await act(async () => { fireEvent.click(screen.getByTestId('trigger-scan')) })

    await waitFor(() => {
      expect(screen.getByTestId('confirmation-content')).toBeInTheDocument()
    })
  })

  // scanning a valid staff ID should show a modal with the staff's name
  it('shows StaffConfirmedModal with staff name when a valid staff ID is scanned', async () => {
    ;(useAuth as jest.Mock).mockReturnValue(authReady)
    mockSearchParamsGet.mockReturnValue('staff')

    ;(global.fetch as jest.Mock)
      .mockResolvedValueOnce(mockFetch({ staff_id: 'S001', name: 'John Doe' }, true)) // staff lookup
      .mockResolvedValueOnce({ json: () => Promise.resolve({ success: true, count: 3 }) }) // asset count

    render(<ScannerPage />)

    await act(async () => { fireEvent.click(screen.getByTestId('trigger-scan')) })

    await waitFor(() => {
      expect(screen.getByText('Staff Confirmed')).toBeInTheDocument()
      expect(screen.getByText('John Doe')).toBeInTheDocument()
    })
  })

  // the modal should also show how many assets that staff currently has
  it('shows asset count in StaffConfirmedModal', async () => {
    ;(useAuth as jest.Mock).mockReturnValue(authReady)
    mockSearchParamsGet.mockReturnValue('staff')

    ;(global.fetch as jest.Mock)
      .mockResolvedValueOnce(mockFetch({ staff_id: 'S001', name: 'John Doe' }, true))
      .mockResolvedValueOnce({ json: () => Promise.resolve({ success: true, count: 5 }) })

    render(<ScannerPage />)

    await act(async () => { fireEvent.click(screen.getByTestId('trigger-scan')) })

    await waitFor(() => {
      expect(screen.getByText('Currently owns 5 asset(s)')).toBeInTheDocument()
    })
  })

  // scanning a staff ID that doesn't exist should open an error modal
  it('shows error modal when staff ID is not found', async () => {
    ;(useAuth as jest.Mock).mockReturnValue(authReady)
    mockSearchParamsGet.mockReturnValue('staff')

    ;(global.fetch as jest.Mock).mockResolvedValueOnce(mockFetch(null, false))

    render(<ScannerPage />)

    await act(async () => { fireEvent.click(screen.getByTestId('trigger-scan')) })

    await waitFor(() => {
      expect(screen.getByText('Error')).toBeInTheDocument()
      expect(screen.getByText(/Staff ID not found/i)).toBeInTheDocument()
    })
  })

  // pressing Close on the error modal should dismiss it
  it('closes error modal when Close is clicked', async () => {
    ;(useAuth as jest.Mock).mockReturnValue(authReady)
    mockSearchParamsGet.mockReturnValue('staff')

    ;(global.fetch as jest.Mock).mockResolvedValueOnce(mockFetch(null, false))

    render(<ScannerPage />)

    await act(async () => { fireEvent.click(screen.getByTestId('trigger-scan')) })
    await waitFor(() => expect(screen.getByText('Error')).toBeInTheDocument())

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Close/i }))
    })

    expect(screen.queryByText('Error')).not.toBeInTheDocument()
  })

  // after confirming staff and clicking Continue Scanning, scanning an asset should add it to the cart
  it('adds an asset to the cart after staff is confirmed and Continue Scanning is clicked', async () => {
    ;(useAuth as jest.Mock).mockReturnValue(authReady)
    mockSearchParamsGet.mockReturnValue('staff')

    ;(global.fetch as jest.Mock)
      .mockResolvedValueOnce(mockFetch({ staff_id: 'S001', name: 'John' }, true))    // staff
      .mockResolvedValueOnce({ json: () => Promise.resolve({ success: true, count: 0 }) }) // count
      .mockResolvedValueOnce(mockFetch({ asset_id: 'TEST-001', name: 'Laptop' }, true)) // asset
      .mockResolvedValueOnce(mockFetch([], true))                                   // assignment check

    render(<ScannerPage />)

    await act(async () => { fireEvent.click(screen.getByTestId('trigger-scan')) })
    await waitFor(() => expect(screen.getByText('Staff Confirmed')).toBeInTheDocument())
    await act(async () => { fireEvent.click(screen.getByText('Continue Scanning')) })
    await act(async () => { fireEvent.click(screen.getByTestId('trigger-scan')) })

    await waitFor(() => {
      expect(screen.getByText('Cart (1)')).toBeInTheDocument()
    })
  })

  // scanning the same asset code twice should show a duplicate error
  it('shows error when the same asset is scanned twice (duplicate in cart)', async () => {
    ;(useAuth as jest.Mock).mockReturnValue(authReady)
    mockSearchParamsGet.mockReturnValue('staff')

    ;(global.fetch as jest.Mock)
      .mockResolvedValueOnce(mockFetch({ staff_id: 'S001', name: 'John' }, true))
      .mockResolvedValueOnce({ json: () => Promise.resolve({ success: true, count: 0 }) })
      .mockResolvedValueOnce(mockFetch({ asset_id: 'TEST-001', name: 'Laptop' }, true))
      .mockResolvedValueOnce(mockFetch([], true))
    // Second scan of same code triggers duplicate check before any fetch

    render(<ScannerPage />)

    await act(async () => { fireEvent.click(screen.getByTestId('trigger-scan')) })
    await waitFor(() => expect(screen.getByText('Staff Confirmed')).toBeInTheDocument())
    await act(async () => { fireEvent.click(screen.getByText('Continue Scanning')) })

    // First asset scan — adds to cart
    await act(async () => { fireEvent.click(screen.getByTestId('trigger-scan')) })
    await waitFor(() => expect(screen.getByText('Cart (1)')).toBeInTheDocument())

    // Second scan of the same code — should show duplicate error
    await act(async () => { fireEvent.click(screen.getByTestId('trigger-scan')) })

    await waitFor(() => {
      expect(screen.getByText(/already in cart/i)).toBeInTheDocument()
    })
  })

  // clicking Submit Changes should POST the cart and show the success screen
  it('submits the cart and shows success after staff assignment', async () => {
    ;(useAuth as jest.Mock).mockReturnValue(authReady)
    mockSearchParamsGet.mockReturnValue('staff')

    ;(global.fetch as jest.Mock)
      .mockResolvedValueOnce(mockFetch({ staff_id: 'S001', name: 'John' }, true))
      .mockResolvedValueOnce({ json: () => Promise.resolve({ success: true, count: 0 }) })
      .mockResolvedValueOnce(mockFetch({ asset_id: 'TEST-001', name: 'Laptop' }, true))
      .mockResolvedValueOnce(mockFetch([], true))       // assignment check → action = ASSIGN
      .mockResolvedValueOnce(mockFetch(null, true))     // assign post

    render(<ScannerPage />)

    await act(async () => { fireEvent.click(screen.getByTestId('trigger-scan')) })
    await waitFor(() => expect(screen.getByText('Staff Confirmed')).toBeInTheDocument())
    await act(async () => { fireEvent.click(screen.getByText('Continue Scanning')) })
    await act(async () => { fireEvent.click(screen.getByTestId('trigger-scan')) })
    await waitFor(() => expect(screen.getByText('Cart (1)')).toBeInTheDocument())

    await act(async () => { fireEvent.click(screen.getByText('Submit Changes')) })

    await waitFor(() => {
      expect(screen.getByTestId('success-content')).toBeInTheDocument()
    })
  })

  // first scan in department mode looks up the department — scanner should stay open for the asset scan
  it('stays on scanning after the first scan (department step) succeeds', async () => {
    ;(useAuth as jest.Mock).mockReturnValue(authReady)
    mockSearchParamsGet.mockReturnValue('department')
    ;(global.fetch as jest.Mock).mockResolvedValue(mockFetch({ name: 'IT Department' }, true))

    render(<ScannerPage />)

    await act(async () => { fireEvent.click(screen.getByTestId('trigger-scan')) })

    await waitFor(() => {
      expect(screen.getByTestId('scanner-content')).toBeInTheDocument()
    })
  })

  // if the scanned department code doesn't exist, show an alert
  it('shows alert when the scanned department code is not found', async () => {
    ;(useAuth as jest.Mock).mockReturnValue(authReady)
    mockSearchParamsGet.mockReturnValue('department')
    ;(global.fetch as jest.Mock).mockResolvedValue(mockFetch(null, false))

    render(<ScannerPage />)

    await act(async () => { fireEvent.click(screen.getByTestId('trigger-scan')) })

    await waitFor(() => {
      expect(global.alert).toHaveBeenCalledWith(expect.stringContaining('not found'))
    })
  })

  // second scan (asset) in department mode — should tag the asset and show success
  it('tags asset to department and shows success on the second scan', async () => {
    ;(useAuth as jest.Mock).mockReturnValue(authReady)
    mockSearchParamsGet.mockReturnValue('department')

    ;(global.fetch as jest.Mock)
      .mockResolvedValueOnce(mockFetch({ name: 'IT Department' }, true))          // department lookup
      .mockResolvedValueOnce(mockFetch({ asset_id: 'TEST-001', name: 'Laptop' }, true)) // asset lookup
      .mockResolvedValueOnce(mockFetch(null, true))                               // tag_asset post

    render(<ScannerPage />)

    await act(async () => { fireEvent.click(screen.getByTestId('trigger-scan')) })
    await waitFor(() => expect(screen.getByTestId('scanner-content')).toBeInTheDocument())
    await act(async () => { fireEvent.click(screen.getByTestId('trigger-scan')) })

    await waitFor(() => {
      expect(screen.getByTestId('success-content')).toBeInTheDocument()
      expect(screen.getByTestId('scan-type')).toHaveTextContent('Tagged to IT Department')
    })
  })

  // if the asset isn't found during department tagging, show the registration form instead
  it('goes to confirmation when asset is not found during department tagging', async () => {
    ;(useAuth as jest.Mock).mockReturnValue(authReady)
    mockSearchParamsGet.mockReturnValue('department')

    ;(global.fetch as jest.Mock)
      .mockResolvedValueOnce(mockFetch({ name: 'IT Department' }, true)) // department found
      .mockResolvedValueOnce(mockFetch(null, false))                     // asset not found

    render(<ScannerPage />)

    await act(async () => { fireEvent.click(screen.getByTestId('trigger-scan')) })
    await waitFor(() => expect(screen.getByTestId('scanner-content')).toBeInTheDocument())
    await act(async () => { fireEvent.click(screen.getByTestId('trigger-scan')) })

    await waitFor(() => {
      expect(screen.getByTestId('confirmation-content')).toBeInTheDocument()
    })
  })

  // clicking the X button should empty the entire cart
  it('clears the entire cart when the X button is clicked', async () => {
    ;(useAuth as jest.Mock).mockReturnValue(authReady)
    mockSearchParamsGet.mockReturnValue('staff')

    ;(global.fetch as jest.Mock)
      .mockResolvedValueOnce(mockFetch({ staff_id: 'S001', name: 'John' }, true))
      .mockResolvedValueOnce({ json: () => Promise.resolve({ success: true, count: 0 }) })
      .mockResolvedValueOnce(mockFetch({ asset_id: 'TEST-001', name: 'Laptop' }, true))
      .mockResolvedValueOnce(mockFetch([], true))

    render(<ScannerPage />)

    await act(async () => { fireEvent.click(screen.getByTestId('trigger-scan')) })
    await waitFor(() => expect(screen.getByText('Staff Confirmed')).toBeInTheDocument())
    await act(async () => { fireEvent.click(screen.getByText('Continue Scanning')) })
    await act(async () => { fireEvent.click(screen.getByTestId('trigger-scan')) })
    await waitFor(() => expect(screen.getByText('Cart (1)')).toBeInTheDocument())

    // Click the X button that calls setCart([])
    const allButtons = screen.getAllByRole('button')
    const clearButton = allButtons.find(btn => btn.querySelector('[data-testid="x-icon"]'))
    expect(clearButton).toBeDefined()
    await act(async () => { fireEvent.click(clearButton!) })

    await waitFor(() => {
      expect(screen.queryByText('Cart (1)')).not.toBeInTheDocument()
    })
  })
})
