// Commented by Irene
import { render, screen, fireEvent } from '@testing-library/react'
import SuccessContent from '@/components/scanner/successContent'
import '@testing-library/jest-dom'

const mockPush = jest.fn()

// mock Next.js router — component uses router.push for both buttons
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}))

// mock lucide icons so the real library isn't needed in tests
jest.mock('lucide-react', () => ({
  Check:       () => <svg data-testid="check-icon" />,
  CheckCircle: () => <svg data-testid="check-circle-icon" />,
}))

describe('SuccessContent Component', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  // ─── TITLE LOGIC ─────────────────────────────────────────────────────────────

  // regular asset scan should show generic success title
  it('renders "Submission Successful!" for a regular asset scan', () => {
    render(
      <SuccessContent
        scannedCount={1}
        scanType="asset"
        item={{ asset_id: 'A001', name: 'Test Laptop', category: 'IT', model: 'X1', condition: 'In-use' }}
      />
    )
    expect(screen.getByText('Submission Successful!')).toBeInTheDocument()
  })

  // new asset registration should show its own title
  it('renders "Asset Registered!" for a new asset registration', () => {
    render(
      <SuccessContent scannedCount={1} scanType="New Asset Registered" item={{ name: 'New Laptop' }} />
    )
    expect(screen.getByText('Asset Registered!')).toBeInTheDocument()
  })

  // any scanType that starts with "Tagged to" should show "Asset Tagged!"
  it('renders "Asset Tagged!" when scanType starts with "Tagged to"', () => {
    render(
      <SuccessContent
        scannedCount={1}
        scanType="Tagged to Location A"
        item={{ asset_id: 'A001', name: 'Chair', category: 'Furniture', model: 'F1', condition: 'In-use' }}
      />
    )
    expect(screen.getByText('Asset Tagged!')).toBeInTheDocument()
  })

  // staff assignment bulk operation should show "Staff Updated!"
  it('renders "Staff Updated!" for a Staff Assignment scan type', () => {
    render(
      <SuccessContent
        scannedCount={1}
        scanType="Staff Assignment"
        item={{ code: 'BULK', name: 'John Doe' }}
      />
    )
    expect(screen.getByText('Staff Updated!')).toBeInTheDocument()
  })

  // ─── SINGLE ASSET DETAILS ────────────────────────────────────────────────────

  // asset ID, name, and location should all appear in the confirmation box
  it('shows asset details for a single asset scan', () => {
    const item = {
      asset_id: 'ASSET-001',
      name: 'Test Bottle',
      category: 'Beverage',
      model: 'B1',
      condition: 'In-use',
      location_id: 'Warehouse',
    }
    render(<SuccessContent scannedCount={1} scanType="asset" item={item} />)
    expect(screen.getByText('Test Bottle')).toBeInTheDocument()
    expect(screen.getByText('ASSET-001')).toBeInTheDocument()
    expect(screen.getByText('Warehouse')).toBeInTheDocument()
  })

  // department should appear when set on the item
  it('shows department when the item has a department_id', () => {
    const item = {
      asset_id: 'A002',
      name: 'Monitor',
      category: 'IT',
      model: 'M1',
      condition: 'In-use',
      department_id: 'Engineering',
    }
    render(<SuccessContent scannedCount={1} scanType="asset" item={item} />)
    expect(screen.getByText('Engineering')).toBeInTheDocument()
  })

  // new asset registration shows the asset name in the subtitle description
  it('shows the new asset name in the description for a New Asset Registered scan', () => {
    render(
      <SuccessContent scannedCount={1} scanType="New Asset Registered" item={{ name: 'New Laptop' }} />
    )
    expect(screen.getByText(/New asset New Laptop has been created/i)).toBeInTheDocument()
  })

  // ─── BULK / STAFF OPERATION ──────────────────────────────────────────────────

  // staff bulk operations show a summary message instead of asset details
  it('shows bulk operation summary text for Staff Assignment', () => {
    render(
      <SuccessContent
        scannedCount={5}
        scanType="Staff Assignment"
        item={{ code: 'BULK', name: 'John' }}
      />
    )
    expect(screen.getByText('Staff records have been successfully updated.')).toBeInTheDocument()
  })

  // ─── BUTTON NAVIGATION ───────────────────────────────────────────────────────

  // "Scan More Items" should navigate back to the scanner page
  it('navigates to /user/scanner when "Scan More Items" is clicked', () => {
    render(
      <SuccessContent
        scannedCount={1}
        scanType="asset"
        item={{ asset_id: 'A001', name: 'Chair', category: 'Furniture', model: 'F1', condition: 'In-use' }}
      />
    )
    fireEvent.click(screen.getByText('Scan More Items'))
    expect(mockPush).toHaveBeenCalledWith('/user/scanner')
  })

  // "View All Submissions" should navigate to the user dashboard
  it('navigates to /user/dashboard when "View All Submissions" is clicked', () => {
    render(
      <SuccessContent
        scannedCount={1}
        scanType="asset"
        item={{ asset_id: 'A001', name: 'Chair', category: 'Furniture', model: 'F1', condition: 'In-use' }}
      />
    )
    fireEvent.click(screen.getByText('View All Submissions'))
    expect(mockPush).toHaveBeenCalledWith('/user/dashboard')
  })

  // each button should only fire router.push once per click
  it('calls router.push exactly once when Scan More Items is clicked', () => {
    render(
      <SuccessContent
        scannedCount={1}
        scanType="asset"
        item={{ asset_id: 'A001', name: 'Chair', category: 'Furniture', model: 'F1', condition: 'In-use' }}
      />
    )
    fireEvent.click(screen.getByText('Scan More Items'))
    expect(mockPush).toHaveBeenCalledTimes(1)
  })
})
