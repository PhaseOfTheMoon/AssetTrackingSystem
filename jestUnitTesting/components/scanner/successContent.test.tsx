import { render, screen, fireEvent } from '@testing-library/react'
import SuccessContent from '@/components/scanner/successContent'
import '@testing-library/jest-dom'

const mockPush = jest.fn()

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush })
}))

jest.mock('lucide-react', () => ({
  Check: () => <svg data-testid="check-icon" />,
  CheckCircle: () => <svg data-testid="check-circle-icon" />
}))

describe('SuccessContent Component', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders "Submission Successful!" for a standard asset scan', () => {
    const item = {
      asset_id: 'ASSET-001',
      name: 'Test Laptop',
      category: 'IT',
      condition: 'In-use',
      location_id: 'Warehouse A'
    }
    render(<SuccessContent scannedCount={1} scanType="asset" item={item} />)
    expect(screen.getByText('Submission Successful!')).toBeInTheDocument()
  })

  it('shows the asset ID, name, and location for a single asset scan', () => {
    const item = {
      asset_id: 'ASSET-001',
      name: 'Test Bottle',
      category: 'Beverage',
      condition: 'In-use',
      location_id: 'Warehouse'
    }
    render(<SuccessContent scannedCount={1} scanType="asset" item={item} />)
    expect(screen.getByText('Test Bottle')).toBeInTheDocument()
    expect(screen.getByText('ASSET-001')).toBeInTheDocument()
    expect(screen.getByText('Warehouse')).toBeInTheDocument()
  })

  it('renders "Asset Registered!" for a new asset registration', () => {
    const item = { name: 'New Laptop' }
    render(
      <SuccessContent scannedCount={1} scanType="New Asset Registered" item={item} />
    )
    expect(screen.getByText('Asset Registered!')).toBeInTheDocument()
    expect(screen.getByText(/New asset New Laptop has been created/i)).toBeInTheDocument()
  })

  it('renders "Asset Tagged!" when scanType starts with "Tagged to"', () => {
    render(
      <SuccessContent scannedCount={1} scanType="Tagged to Warehouse A" item={{ name: 'Laptop' }} />
    )
    expect(screen.getByText('Asset Tagged!')).toBeInTheDocument()
  })

  // "Scan More Items" button now calls the onScanAnother prop
  it('calls onScanAnother when "Scan More Items" is clicked', () => {
    const mockScanAnother = jest.fn()
    render(
      <SuccessContent
        scannedCount={1}
        scanType="asset"
        item={{}}
        onScanAnother={mockScanAnother}
      />
    )
    fireEvent.click(screen.getByText('Scan More Items'))
    expect(mockScanAnother).toHaveBeenCalledTimes(1)
  })

  // "View All Submissions" button navigates via router
  it('renders the View All Submissions button', () => {
    render(<SuccessContent scannedCount={1} scanType="asset" item={{}} />)
    expect(screen.getByText('View All Submissions')).toBeInTheDocument()
  })

  // clicking "View All Submissions" should push to the dashboard route
  it('navigates to the dashboard when View All Submissions is clicked', () => {
    render(<SuccessContent scannedCount={1} scanType="asset" item={{}} />)
    fireEvent.click(screen.getByText('View All Submissions'))
    expect(mockPush).toHaveBeenCalledWith('/user/dashboard')
  })

  // a Staff Assignment scan should show the "Staff Updated!" title
  it('renders "Staff Updated!" for a Staff Assignment scan', () => {
    render(
      <SuccessContent
        scannedCount={3}
        scanType="Staff Assignment"
        item={{ name: 'John Doe' }}
      />
    )
    expect(screen.getByText('Staff Updated!')).toBeInTheDocument()
  })

  // when no item is provided, the fallback summary should show the scanned count
  it('shows the total scanned count when no item is provided', () => {
    render(<SuccessContent scannedCount={5} scanType="asset" item={null} />)
    expect(screen.getByText('Total Items:')).toBeInTheDocument()
    expect(screen.getByText('5')).toBeInTheDocument()
  })
})