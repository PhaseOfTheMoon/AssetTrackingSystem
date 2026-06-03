import { render, screen, fireEvent } from '@testing-library/react'
import Sidebar from '@/components/navbar/sidebar'

jest.mock('next-auth/react', () => ({ useSession: jest.fn() }))
jest.mock('next/navigation', () => ({ usePathname: jest.fn() }))

jest.mock('next/link', () => {
  return function MockLink({ href, children }: any) {
    return <a href={href}>{children}</a>
  }
})

jest.mock('lucide-react', () => ({
  HomeIcon: () => <svg data-testid="home-icon" />
}))

jest.mock('@heroicons/react/24/outline', () => ({
  MagnifyingGlassIcon: () => <svg />,
  ChevronDownIcon: () => <svg data-testid="chevron" />,
  MapPinIcon: () => <svg />,
  BuildingOfficeIcon: () => <svg />,
  UsersIcon: () => <svg />,
  ComputerDesktopIcon: () => <svg />
}))

jest.mock('@/components/logoutButton', () => {
  return function MockLogoutButton({ text }: any) {
    return <button>{text}</button>
  }
})

const { useSession } = require('next-auth/react')
const { usePathname } = require('next/navigation')

const mockSetIsOpen = jest.fn()

describe('Sidebar', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    usePathname.mockReturnValue('/admin/dashboard')
    useSession.mockReturnValue({ data: { user: { role: 'admin' } } })
    localStorage.clear()
  })

  // Visibility

  // sidebar must not render any content when closed
  it('renders nothing when isOpen is false', () => {
    render(<Sidebar isOpen={false} setIsOpen={mockSetIsOpen} />)
    expect(screen.queryByText('Admin')).not.toBeInTheDocument()
    expect(screen.queryByText('Sign Out')).not.toBeInTheDocument()
  })

  // sidebar content is visible when open
  it('renders sidebar content when isOpen is true', () => {
    render(<Sidebar isOpen={true} setIsOpen={mockSetIsOpen} />)
    expect(screen.getByText('Sign Out')).toBeInTheDocument()
  })

  // Admin role

  it('renders the Admin group label for admin users', () => {
    render(<Sidebar isOpen={true} setIsOpen={mockSetIsOpen} />)
    expect(screen.getByText('Admin')).toBeInTheDocument()
  })

  it('renders all admin nav items', () => {
    render(<Sidebar isOpen={true} setIsOpen={mockSetIsOpen} />)
    expect(screen.getByText('Home')).toBeInTheDocument()
    expect(screen.getByText('Asset Tracking')).toBeInTheDocument()
    expect(screen.getByText('Location')).toBeInTheDocument()
    expect(screen.getByText('Department')).toBeInTheDocument()
    expect(screen.getByText('Staff')).toBeInTheDocument()
  })

  // Staff role

  it('renders the Staff group label for non-admin users', () => {
    useSession.mockReturnValue({ data: { user: { role: 'staff' } } })
    render(<Sidebar isOpen={true} setIsOpen={mockSetIsOpen} />)
    expect(screen.getByText('Staff')).toBeInTheDocument()
    expect(screen.queryByText('Admin')).not.toBeInTheDocument()
  })

  it('shows Main Menu for staff users instead of admin modules', () => {
    useSession.mockReturnValue({ data: { user: { role: 'staff' } } })
    render(<Sidebar isOpen={true} setIsOpen={mockSetIsOpen} />)
    expect(screen.getByText('Main Menu')).toBeInTheDocument()
    expect(screen.queryByText('Asset Tracking')).not.toBeInTheDocument()
  })

  // defaults to staff when session has no user
  it('falls back to staff modules when session is null', () => {
    useSession.mockReturnValue({ data: null })
    render(<Sidebar isOpen={true} setIsOpen={mockSetIsOpen} />)
    expect(screen.getByText('Main Menu')).toBeInTheDocument()
  })

  // Dropdown interaction

  // clicking a module with sub-items should reveal them
  it('expands the Asset Tracking dropdown when clicked', () => {
    render(<Sidebar isOpen={true} setIsOpen={mockSetIsOpen} />)
    fireEvent.click(screen.getByText('Asset Tracking'))
    expect(screen.getByText('Assets')).toBeInTheDocument()
    expect(screen.getByText('Maintenance')).toBeInTheDocument()
  })

  // clicking the same module again should collapse it
  it('collapses the dropdown when the same module is clicked again', () => {
    render(<Sidebar isOpen={true} setIsOpen={mockSetIsOpen} />)
    fireEvent.click(screen.getByText('Asset Tracking'))
    expect(screen.getByText('Assets')).toBeInTheDocument()
    fireEvent.click(screen.getByText('Asset Tracking'))
    expect(screen.queryByText('Assets')).not.toBeInTheDocument()
  })

  // Staff sub-items: List and Approvals
  it('shows List and Approvals when Staff dropdown is expanded', () => {
    render(<Sidebar isOpen={true} setIsOpen={mockSetIsOpen} />)
    fireEvent.click(screen.getByText('Staff'))
    expect(screen.getByText('List')).toBeInTheDocument()
    expect(screen.getByText('Approvals')).toBeInTheDocument()
  })

  // Location sub-items
  it('shows Rooms when Location dropdown is expanded', () => {
    render(<Sidebar isOpen={true} setIsOpen={mockSetIsOpen} />)
    fireEvent.click(screen.getByText('Location'))
    expect(screen.getByText('Rooms')).toBeInTheDocument()
  })

  // Department sub-items
  it('shows Units when Department dropdown is expanded', () => {
    render(<Sidebar isOpen={true} setIsOpen={mockSetIsOpen} />)
    fireEvent.click(screen.getByText('Department'))
    expect(screen.getByText('Units')).toBeInTheDocument()
  })

  // Sign Out

  it('shows the Sign Out button at the bottom of the sidebar', () => {
    render(<Sidebar isOpen={true} setIsOpen={mockSetIsOpen} />)
    expect(screen.getByText('Sign Out')).toBeInTheDocument()
  })

  // Mouse hover

  // hovering a direct link must not crash
  it('handles mouseEnter and mouseLeave on a direct link', () => {
    useSession.mockReturnValue({ data: { user: { role: 'staff' } } })
    render(<Sidebar isOpen={true} setIsOpen={mockSetIsOpen} />)
    const homeLink = screen.getByText('Main Menu').closest('a')!
    fireEvent.mouseEnter(homeLink)
    fireEvent.mouseLeave(homeLink)
    expect(screen.getByText('Main Menu')).toBeInTheDocument()
  })

  // hovering a dropdown button must not crash
  it('handles mouseEnter and mouseLeave on a dropdown button', () => {
    render(<Sidebar isOpen={true} setIsOpen={mockSetIsOpen} />)
    const btn = screen.getByText('Asset Tracking').closest('button')!
    fireEvent.mouseEnter(btn)
    fireEvent.mouseLeave(btn)
    expect(screen.getByText('Asset Tracking')).toBeInTheDocument()
  })

  // Click outside on mobile

  // on mobile, clicking outside the sidebar element must call setIsOpen(false)
  it('closes the sidebar when clicking outside on mobile', () => {
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 500 })
    render(<Sidebar isOpen={true} setIsOpen={mockSetIsOpen} />)
    fireEvent.click(document.body)
    expect(mockSetIsOpen).toHaveBeenCalledWith(false)
  })
})
