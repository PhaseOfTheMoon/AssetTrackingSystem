/** *
 * Tests for the sidebar navigation component.
 *
 * What the Sidebar does:
 *  - Renders nothing when isOpen is false
 *  - Shows role-based navigation:
 *      admin  → "Admin" group with Home, Asset Tracking, Location, Department, Staff
 *      staff  → "Staff" group with Main Menu only
 *  - Expandable dropdowns: clicking a parent item expands its children;
 *    clicking again collapses them
 *  - Active route highlighting: parent turns red when the current path starts with
 *    the item's href; direct links turn red when the path matches exactly
 *  - localStorage persistence: the last expanded dropdown is saved and restored on mount
 *  - Mobile (<768px): shows a close "✕" button and a search input placeholder;
 *    clicking outside closes the sidebar
 *  - Always shows a Sign Out button at the bottom
 *
 * Admin modules (actual data from sidebar.tsx):
 *   Home → /admin/dashboard (no dropdown)
 *   Asset Tracking  → /admin/assetTracking dropdown: Assets, Maintenance
 *   Location → /admin/location dropdown: Rooms
 *   Department → /admin/department dropdown: Units
 *   Staff → /admin/staff dropdown: List, Approvals
 *
 * Staff modules:
 *   Main Menu → /user/dashboard (no dropdown)
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Sidebar from '@/components/navbar/sidebar'

// Mock all external dependencies
jest.mock('next/navigation', () => ({
  usePathname: jest.fn(),
  useRouter: jest.fn(() => ({ push: jest.fn() })),
}))

jest.mock('next-auth/react', () => ({
  useSession: jest.fn(),
}))

jest.mock('@/components/logoutButton', () =>
  function MockLogoutButton({ className, text }: { className: string; text: string }) {
    return <button className={className}>{text}</button>
  }
)

jest.mock('next/link', () =>
  function MockLink({ children, href, className, ...rest }: { children: React.ReactNode; href: string; className?: string; [key: string]: unknown }) {
    return <a href={href} className={className} {...rest}>{children}</a>
  }
)

// localStorage mock
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: jest.fn((key: string) => store[key] ?? null),
    setItem: jest.fn((key: string, value: string) => { store[key] = value }),
    removeItem: jest.fn((key: string) => { delete store[key] }),
    clear: jest.fn(() => { store = {} }),
  }
})()

Object.defineProperty(window, 'localStorage', { value: localStorageMock, writable: true })

// Device screen widths for testing responsive behaviour
const DESKTOP_WIDTH = 1024
const MOBILE_WIDTH  = 500

function setViewportWidth(width: number) {
  Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: width })
  window.dispatchEvent(new Event('resize'))
}

function renderSidebar(isOpen = true, setIsOpen = jest.fn()) {
  return render(<Sidebar isOpen={isOpen} setIsOpen={setIsOpen} />)
}

// Session fixtures
const adminSession = { data: { user: { role: 'admin' } } }
const staffSession = { data: { user: { role: 'staff' } } }
// Null session – role falls back to 'staff' per the component's `?? 'staff'` default
const nullSession = { data: null }

// Test setup
beforeEach(() => {
  jest.clearAllMocks()
  localStorageMock.clear()
  ;(usePathname as jest.Mock).mockReturnValue('/admin/dashboard')
  ;(useSession  as jest.Mock).mockReturnValue(adminSession)
  setViewportWidth(DESKTOP_WIDTH)
})

// 1. Visibility
describe('Visibility', () => {
  it('renders nothing when isOpen is false — sidebar must be fully hidden until triggered', () => {
    ;(useSession as jest.Mock).mockReturnValue(adminSession)
    renderSidebar(false)
    expect(screen.queryByText('Home')).not.toBeInTheDocument()
  })

  it('renders navigation items when isOpen is true', () => {
    renderSidebar(true)
    expect(screen.getByText('Home')).toBeInTheDocument()
  })
})

// 2. Role-based navigation — admin
describe('Admin navigation', () => {
  beforeEach(() => {
    ;(useSession as jest.Mock).mockReturnValue(adminSession)
  })

  it('shows the "Admin" section label so admins know they are in the admin area', () => {
    renderSidebar()
    expect(screen.getByText('Admin')).toBeInTheDocument()
  })

  it('renders all admin top-level navigation items', () => {
    renderSidebar()
    expect(screen.getByText('Home')).toBeInTheDocument()
    expect(screen.getByText('Asset Tracking')).toBeInTheDocument()
    expect(screen.getByText('Location')).toBeInTheDocument()
    expect(screen.getByText('Department')).toBeInTheDocument()
    expect(screen.getByText('Staff')).toBeInTheDocument()
  })

  it('does not show the staff-only "Main Menu" item to admin users', () => {
    renderSidebar()
    expect(screen.queryByText('Main Menu')).not.toBeInTheDocument()
  })

  it('Home links to /admin/dashboard', () => {
    renderSidebar()
    expect(screen.getByText('Home').closest('a')).toHaveAttribute('href', '/admin/dashboard')
  })
})

// 3. Role-based navigation — staff / regular user
describe('Staff navigation', () => {
  beforeEach(() => {
    ;(useSession as jest.Mock).mockReturnValue(staffSession)
    ;(usePathname as jest.Mock).mockReturnValue('/user/dashboard')
  })

  it('shows the "Staff" section label', () => {
    renderSidebar()
    expect(screen.getByText('Staff')).toBeInTheDocument()
  })

  it('renders "Main Menu" as the only navigation item for staff users', () => {
    renderSidebar()
    expect(screen.getByText('Main Menu')).toBeInTheDocument()
  })

  it('hides all admin-only modules from staff users', () => {
    renderSidebar()
    expect(screen.queryByText('Asset Tracking')).not.toBeInTheDocument()
    expect(screen.queryByText('Location')).not.toBeInTheDocument()
    expect(screen.queryByText('Department')).not.toBeInTheDocument()
  })

  it('Main Menu links to /user/dashboard', () => {
    renderSidebar()
    expect(screen.getByText('Main Menu').closest('a')).toHaveAttribute('href', '/user/dashboard')
  })

  it('treats a missing session role as staff so unauthenticated users are not granted admin access', () => {
    // Business rule: the role defaults to 'staff' when session is null.
    // This is a security boundary — never show admin menus to unauthenticated users.
    ;(useSession as jest.Mock).mockReturnValue(nullSession)
    renderSidebar()
    expect(screen.queryByText('Asset Tracking')).not.toBeInTheDocument()
    expect(screen.getByText('Main Menu')).toBeInTheDocument()
  })
})

// 4. Dropdown expansion
describe('Dropdown expansion', () => {
  beforeEach(() => {
    ;(useSession as jest.Mock).mockReturnValue(adminSession)
  })

  it('expands Asset Tracking to show Assets and Maintenance sub-items', async () => {
    renderSidebar()
    fireEvent.click(screen.getByText('Asset Tracking'))

    await waitFor(() => {
      expect(screen.getByText('Assets')).toBeInTheDocument()
      expect(screen.getByText('Maintenance')).toBeInTheDocument()
    })
  })

  it('expands Location to show Rooms sub-item', async () => {
    renderSidebar()
    fireEvent.click(screen.getByText('Location'))

    await waitFor(() => {
      expect(screen.getByText('Rooms')).toBeInTheDocument()
    })
  })

  it('expands Department to show Units sub-item', async () => {
    renderSidebar()
    fireEvent.click(screen.getByText('Department'))

    await waitFor(() => {
      expect(screen.getByText('Units')).toBeInTheDocument()
    })
  })

  it('expands Staff to show List and Approvals sub-items', async () => {
    renderSidebar()
    fireEvent.click(screen.getByText('Staff'))

    await waitFor(() => {
      expect(screen.getByText('List')).toBeInTheDocument()
      expect(screen.getByText('Approvals')).toBeInTheDocument()
    })
  })

  it('collapses the dropdown when the same parent item is clicked again', async () => {
    renderSidebar()
    fireEvent.click(screen.getByText('Asset Tracking'))

    await waitFor(() => expect(screen.getByText('Assets')).toBeInTheDocument())

    fireEvent.click(screen.getByText('Asset Tracking'))

    await waitFor(() => {
      expect(screen.queryByText('Assets')).not.toBeInTheDocument()
    })
  })

  it('only one dropdown is open at a time — opening a second collapses the first', async () => {
    // Prevents the sidebar from becoming an accordion-of-everything which
    // would force users to scroll to find the active section.
    renderSidebar()

    fireEvent.click(screen.getByText('Asset Tracking'))
    await waitFor(() => expect(screen.getByText('Assets')).toBeInTheDocument())

    fireEvent.click(screen.getByText('Location'))
    await waitFor(() => {
      expect(screen.getByText('Rooms')).toBeInTheDocument()
      expect(screen.queryByText('Assets')).not.toBeInTheDocument()
    })
  })

  it('builds sub-item hrefs correctly as parent/child paths', async () => {
    // for example: /admin/assetTracking/assets — not just /assets
    renderSidebar()
    fireEvent.click(screen.getByText('Asset Tracking'))

    await waitFor(() => {
      expect(screen.getByText('Assets').closest('a')).toHaveAttribute(
        'href', '/admin/assetTracking/assets'
      )
      expect(screen.getByText('Maintenance').closest('a')).toHaveAttribute(
        'href', '/admin/assetTracking/maintainApprove'
      )
    })
  })
})

// 5. Active route highlighting
describe('Active route highlighting', () => {
  beforeEach(() => {
    ;(useSession as jest.Mock).mockReturnValue(adminSession)
  })

  it('highlights the Home link red when the current path is /admin/dashboard', () => {
    ;(usePathname as jest.Mock).mockReturnValue('/admin/dashboard')
    renderSidebar()

    const homeLink = screen.getByText('Home').closest('a')
    expect(homeLink).toHaveClass('bg-red-600')
  })

  it('highlights the Location button red when the current path starts with /admin/location', () => {
    // Parent items highlight for any child route (startsWith), not just exact matches
    ;(usePathname as jest.Mock).mockReturnValue('/admin/location/rooms')
    renderSidebar()

    const locationButton = screen.getByText('Location').closest('button')
    expect(locationButton).toHaveClass('bg-red-600')
  })

  it('does not highlight a parent item that does not match the current path', () => {
    ;(usePathname as jest.Mock).mockReturnValue('/admin/location')
    renderSidebar()

    const assetButton = screen.getByText('Asset Tracking').closest('button')
    expect(assetButton).not.toHaveClass('bg-red-600')
  })
})

// 6. localStorage persistence
describe('localStorage persistence', () => {
  beforeEach(() => {
    ;(useSession as jest.Mock).mockReturnValue(adminSession)
  })

  it('reads sidebarActiveItem from localStorage on mount to restore the last open dropdown', () => {
    // Users should not lose their navigation context on page refresh.
    renderSidebar()
    expect(localStorageMock.getItem).toHaveBeenCalledWith('sidebarActiveItem')
  })

  it('saves the expanded dropdown href to localStorage when a dropdown is opened', () => {
    renderSidebar()
    fireEvent.click(screen.getByText('Asset Tracking'))

    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      'sidebarActiveItem', '/admin/assetTracking'
    )
  })

  it('clears the localStorage value when a dropdown is collapsed', () => {
    // Prevents stale state from auto-opening a dropdown the user intentionally closed.
    renderSidebar()
    fireEvent.click(screen.getByText('Asset Tracking')) // open
    fireEvent.click(screen.getByText('Asset Tracking')) // close

    expect(localStorageMock.setItem).toHaveBeenLastCalledWith('sidebarActiveItem', '')
  })

  it('restores the last-open dropdown section when the component mounts', async () => {
    // Simulate having previously expanded Asset Tracking
    localStorageMock.getItem.mockReturnValue('/admin/assetTracking')

    renderSidebar()

    // The dropdown should already be expanded without any click
    await waitFor(() => {
      expect(screen.getByText('Assets')).toBeInTheDocument()
    })
  })
})

// 7. Mobile behaviour (<768px)
describe('Mobile behaviour (<768px)', () => {
  beforeEach(() => {
    ;(useSession as jest.Mock).mockReturnValue(adminSession)
    setViewportWidth(MOBILE_WIDTH)
  })

  it('shows a close "✕" button on mobile so users can dismiss the sidebar', () => {
    renderSidebar(true)
    // The SVG path for the X icon is "M6 18L18 6M6 6l12 12"
    const closeButton = screen.getAllByRole('button').find((btn) =>
      btn.querySelector('svg path[d*="M6 18L18 6M6 6l12 12"]')
    )
    expect(closeButton).toBeInTheDocument()
  })

  it('calls setIsOpen(false) when the mobile close button is clicked', () => {
    const mockSetIsOpen = jest.fn()
    render(<Sidebar isOpen={true} setIsOpen={mockSetIsOpen} />)

    const closeButton = screen.getAllByRole('button').find((btn) =>
      btn.querySelector('svg path[d*="M6 18L18 6M6 6l12 12"]')
    )

    if (closeButton) fireEvent.click(closeButton)

    expect(mockSetIsOpen).toHaveBeenCalledWith(false)
  })

  it('renders a search input placeholder on mobile for future search functionality', () => {
    // The search bar is a UI placeholder; filtering is not yet implemented.
    // It must be present on mobile as per the design spec.
    renderSidebar(true)
    expect(screen.getByPlaceholderText('Search...')).toBeInTheDocument()
  })

  it('does not show the search input on desktop where there is enough room for all items', () => {
    setViewportWidth(DESKTOP_WIDTH)
    renderSidebar(true)
    expect(screen.queryByPlaceholderText('Search...')).not.toBeInTheDocument()
  })

  it('applies the "fixed" positioning class on mobile so the sidebar overlays the page', () => {
    const { container } = renderSidebar(true)
    const sidebar = container.querySelector('.sidebar')
    expect(sidebar).toHaveClass('fixed')
  })

  it('does not show the mobile close button on desktop', () => {
    setViewportWidth(DESKTOP_WIDTH)
    renderSidebar(true)

    const closeButton = screen.getAllByRole('button').find((btn) =>
      btn.querySelector('svg path[d*="M6 18L18 6M6 6l12 12"]')
    )
    expect(closeButton).toBeUndefined()
  })
})

// 8. Settings and Sign Out
describe('Settings and Sign Out', () => {
  beforeEach(() => {
    ;(useSession as jest.Mock).mockReturnValue(adminSession)
  })

  it('always shows a Sign Out button at the bottom of the sidebar', () => {
    renderSidebar()
    expect(screen.getByText('Sign Out')).toBeInTheDocument()
  })

  it('Sign Out button is rendered for staff users too', () => {
    ;(useSession as jest.Mock).mockReturnValue(staffSession)
    ;(usePathname as jest.Mock).mockReturnValue('/user/dashboard')
    renderSidebar()
    expect(screen.getByText('Sign Out')).toBeInTheDocument()
  })
})
