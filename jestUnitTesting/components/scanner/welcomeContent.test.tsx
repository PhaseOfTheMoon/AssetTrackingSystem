import { render, screen, fireEvent } from '@testing-library/react'
import WelcomeContent from '@/components/scanner/welcomeContent'
import '@testing-library/jest-dom'

jest.mock('lucide-react', () => ({
  Package: () => <svg data-testid="package-icon" />,
  MapPin: () => <svg data-testid="mappin-icon" />,
  Users: () => <svg data-testid="users-icon" />,
  Building2: () => <svg data-testid="building-icon" />
}))

describe('WelcomeContent Component', () => {
  it('renders the main title and subtitle', () => {
    render(<WelcomeContent onNavigate={jest.fn()} />)
    expect(screen.getByText('Swinburne Asset Tracking System')).toBeInTheDocument()
    expect(screen.getByText('Choose an option to fulfill your task')).toBeInTheDocument()
  })

  it('renders all 4 scanning option cards', () => {
    render(<WelcomeContent onNavigate={jest.fn()} />)
    expect(screen.getByText('View & Update Asset')).toBeInTheDocument()
    expect(screen.getByText("Update Assets' Location")).toBeInTheDocument()
    expect(screen.getByText('Associate Asset with Staff')).toBeInTheDocument()
    expect(screen.getByText("Update Assets' Department")).toBeInTheDocument()
  })

  it('calls onNavigate with "asset" when View & Update Asset is clicked', () => {
    const mockNavigate = jest.fn()
    render(<WelcomeContent onNavigate={mockNavigate} />)
    fireEvent.click(screen.getByText('View & Update Asset'))
    expect(mockNavigate).toHaveBeenCalledWith('asset')
  })

  it('calls onNavigate with "location" when Update Assets Location is clicked', () => {
    const mockNavigate = jest.fn()
    render(<WelcomeContent onNavigate={mockNavigate} />)
    fireEvent.click(screen.getByText("Update Assets' Location"))
    expect(mockNavigate).toHaveBeenCalledWith('location')
  })

  it('calls onNavigate with "staff" when Associate Asset with Staff is clicked', () => {
    const mockNavigate = jest.fn()
    render(<WelcomeContent onNavigate={mockNavigate} />)
    fireEvent.click(screen.getByText('Associate Asset with Staff'))
    expect(mockNavigate).toHaveBeenCalledWith('staff')
  })

  it('calls onNavigate with "department" when Update Assets Department is clicked', () => {
    const mockNavigate = jest.fn()
    render(<WelcomeContent onNavigate={mockNavigate} />)
    fireEvent.click(screen.getByText("Update Assets' Department"))
    expect(mockNavigate).toHaveBeenCalledWith('department')
  })
})