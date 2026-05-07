// Commented by Irene
import { render, screen, fireEvent } from '@testing-library/react'
import WelcomeContent from '@/components/scanner/welcomeContent'
import '@testing-library/jest-dom'

// mock lucide icons so the real library isn't needed in tests
jest.mock('lucide-react', () => ({
  Package:  () => <svg data-testid="package-icon" />,
  Users:    () => <svg data-testid="users-icon" />,
  MapPin:   () => <svg data-testid="map-pin-icon" />,
  Building2: () => <svg data-testid="building2-icon" />,
}))

describe('WelcomeContent Component', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  // page title and subtitle should always be visible
  it('renders the page title and subtitle', () => {
    render(<WelcomeContent onNavigate={jest.fn()} />)
    expect(screen.getByText('Swinburne Asset Tracking System')).toBeInTheDocument()
    expect(screen.getByText('Choose an option to fulfill your task')).toBeInTheDocument()
  })

  // all 4 option cards must be rendered
  it('renders all 4 scan option buttons', () => {
    render(<WelcomeContent onNavigate={jest.fn()} />)
    expect(screen.getByText('View & Update Asset')).toBeInTheDocument()
    expect(screen.getByText("Update Assets' Location")).toBeInTheDocument()
    expect(screen.getByText('Associate Asset with Staff')).toBeInTheDocument()
    expect(screen.getByText("Update Assets' Department")).toBeInTheDocument()
  })

  // each card should show its description text
  it('renders descriptions for each scan option', () => {
    render(<WelcomeContent onNavigate={jest.fn()} />)
    expect(screen.getByText(/Scan asset barcode to view and update information/i)).toBeInTheDocument()
    expect(screen.getByText(/Scan location QR code to tag asset to location/i)).toBeInTheDocument()
    expect(screen.getByText(/Scan staff id to tag asset to staff/i)).toBeInTheDocument()
    expect(screen.getByText(/Scan department QR code to tag asset to department/i)).toBeInTheDocument()
  })

  // clicking "View & Update Asset" should pass "asset" to onNavigate
  it('calls onNavigate with "asset" when View & Update Asset is clicked', () => {
    const mockNavigate = jest.fn()
    render(<WelcomeContent onNavigate={mockNavigate} />)
    fireEvent.click(screen.getByText('View & Update Asset'))
    expect(mockNavigate).toHaveBeenCalledWith('asset')
  })

  // clicking "Update Assets' Location" should pass "location" to onNavigate
  it('calls onNavigate with "location" when Update Assets Location is clicked', () => {
    const mockNavigate = jest.fn()
    render(<WelcomeContent onNavigate={mockNavigate} />)
    fireEvent.click(screen.getByText("Update Assets' Location"))
    expect(mockNavigate).toHaveBeenCalledWith('location')
  })

  // clicking "Associate Asset with Staff" should pass "staff" to onNavigate
  it('calls onNavigate with "staff" when Associate Asset with Staff is clicked', () => {
    const mockNavigate = jest.fn()
    render(<WelcomeContent onNavigate={mockNavigate} />)
    fireEvent.click(screen.getByText('Associate Asset with Staff'))
    expect(mockNavigate).toHaveBeenCalledWith('staff')
  })

  // clicking "Update Assets' Department" should pass "department" to onNavigate
  it('calls onNavigate with "department" when Update Assets Department is clicked', () => {
    const mockNavigate = jest.fn()
    render(<WelcomeContent onNavigate={mockNavigate} />)
    fireEvent.click(screen.getByText("Update Assets' Department"))
    expect(mockNavigate).toHaveBeenCalledWith('department')
  })

  // each click should only fire onNavigate once
  it('calls onNavigate exactly once per button click', () => {
    const mockNavigate = jest.fn()
    render(<WelcomeContent onNavigate={mockNavigate} />)
    fireEvent.click(screen.getByText('View & Update Asset'))
    expect(mockNavigate).toHaveBeenCalledTimes(1)
  })
})
