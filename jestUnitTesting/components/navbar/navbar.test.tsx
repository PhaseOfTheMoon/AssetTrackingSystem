/** *
 * Tests for the top navigation bar component.
 *
 * What the Navbar does:
 *  - Shows the Swinburne logo that links to the user's role-appropriate dashboard
 *  - Hamburger button toggles the sidebar open/closed (state lives in the parent layout)
 *  - Profile avatar button opens a dropdown showing the user's name, email, links to
 *    Profile page, and a Sign Out button
 *  - Dropdown closes automatically when the user navigates to a new page
 *  - On mobile (<768 px): opening the sidebar closes the profile dropdown, and vice-versa
 *  - A semi-transparent overlay covers the page when the sidebar is open on mobile
 *  - Session fallbacks: missing name → "User", missing email → "No email available",
 *    missing avatar → SVG initials generated from the user's name
 *  - Pressing Escape closes the profile dropdown (WAI-ARIA requirement)
 *  - Clicking anywhere outside the dropdown closes it
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { act } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Navbar from '@/components/navbar/navbar'

// Mock all external dependencies so tests are isolated and fast
jest.mock('next/navigation', () => ({
  usePathname: jest.fn(),
  useRouter: jest.fn(),
}))

jest.mock('next-auth/react', () => ({
  useSession: jest.fn(),
}))

// LogoutButton only needs to render a recognisable button in the dropdown
jest.mock('@/components/logoutButton', () =>
  function MockLogoutButton({ className, text }: { className: string; text: string }) {
    return <button className={className}>{text}</button>
  }
)

// Sidebar is imported dynamically; a lightweight stub is enough here.
// Sidebar behaviour is covered in sidebar.test.tsx.
jest.mock('@/components/navbar/sidebar', () => ({
  __esModule: true,
  default: function MockSidebar({ isOpen }: { isOpen: boolean }) {
    return <div data-testid="sidebar">{isOpen ? 'Sidebar Open' : 'Sidebar Closed'}</div>
  },
}))

// next/dynamic passes through the mock above without SSR complications
jest.mock('next/dynamic', () => (fn: () => Promise<{ default: React.ComponentType }>) => {
  // Return a wrapper that calls the loader synchronously in tests
  let Component: React.ComponentType | null = null
  fn().then((mod) => { Component = mod.default })
  return function DynamicComponent(props: Record<string, unknown>) {
    return Component ? <Component {...props} /> : null
  }
})

// Device screen widths for testing responsive behaviour
const DESKTOP_WIDTH = 1024
const MOBILE_WIDTH  = 500

/** Set window.innerWidth and fire a resize event so components pick up the change */
function setViewportWidth(width: number) {
  Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: width })
  window.dispatchEvent(new Event('resize'))
}

/** Render the navbar and wait for all effects to settle */
async function renderNavbar(props: { sidebarOpen?: boolean } = {}) {
  const mockSetSidebarOpen = jest.fn()
  let rerender!: ReturnType<typeof render>['rerender']

  await act(async () => {
    const result = render(
      <Navbar sidebarOpen={props.sidebarOpen ?? false} setSidebarOpen={mockSetSidebarOpen} />
    )
    rerender = result.rerender
  })

  return { mockSetSidebarOpen, rerender }
}

// Click the profile avatar button to open the dropdown 
async function openProfileDropdown() {
  // The profile button is the second button; first is the hamburger
  const profileButton = screen.getAllByRole('button')[1]
  await act(async () => { fireEvent.click(profileButton) })
  return profileButton
}

// Test setup
const mockRouterPush = jest.fn()

const authenticatedSession = {
  user: {
    name: 'Test User',
    email: 'test@example.com',
    image: '/avatar.png',
    role: 'staff',
  },
}

const adminSession = {
  user: {
    name: 'Admin User',
    email: 'admin@example.com',
    image: '/avatar.png',
    role: 'admin',
  },
}

beforeEach(() => {
  jest.clearAllMocks()

  ;(usePathname as jest.Mock).mockReturnValue('/user/dashboard')
  ;(useRouter as jest.Mock).mockReturnValue({ push: mockRouterPush })
  ;(useSession as jest.Mock).mockReturnValue({ data: authenticatedSession })

  // Default to desktop width
  setViewportWidth(DESKTOP_WIDTH)
})

// 1. Layout and branding
describe('Layout and branding', () => {
  it('displays the Swinburne logo', async () => {
    await renderNavbar()
    expect(screen.getByAltText('Swinburne Logo')).toBeInTheDocument()
  })

  it('logo links to /user/dashboard for staff users', async () => {
    // Business rule: staff role → user dashboard; admin role → admin dashboard.
    // This prevents staff from accidentally landing on admin pages via the logo.
    await renderNavbar()
    const logoLink = screen.getByAltText('Swinburne Logo').closest('a')
    expect(logoLink).toHaveAttribute('href', '/user/dashboard')
  })

  it('logo links to /admin/dashboard for admin users', async () => {
    ;(useSession as jest.Mock).mockReturnValue({ data: adminSession })
    await renderNavbar()
    const logoLink = screen.getByAltText('Swinburne Logo').closest('a')
    expect(logoLink).toHaveAttribute('href', '/admin/dashboard')
  })

  it('renders the profile avatar image when a session image is provided', async () => {
    await renderNavbar()
    // The avatar img uses the user's name as part of its alt text
    const avatars = screen.getAllByAltText("Test User's profile picture")
    expect(avatars.length).toBeGreaterThanOrEqual(1)
  })
})

// 2. Sidebar toggle (hamburger button)
describe('Sidebar toggle', () => {
  it('calls setSidebarOpen(true) when the hamburger button is clicked on a closed sidebar', async () => {
    const { mockSetSidebarOpen } = await renderNavbar({ sidebarOpen: false })
    const hamburger = screen.getByLabelText('Toggle sidebar')

    await act(async () => { fireEvent.click(hamburger) })

    expect(mockSetSidebarOpen).toHaveBeenCalledWith(true)
  })

  it('calls setSidebarOpen(false) when the hamburger button is clicked on an open sidebar', async () => {
    const { mockSetSidebarOpen } = await renderNavbar({ sidebarOpen: true })
    const hamburger = screen.getByLabelText('Toggle sidebar')

    await act(async () => { fireEvent.click(hamburger) })

    expect(mockSetSidebarOpen).toHaveBeenCalledWith(false)
  })
})

// 3. Profile dropdown: open / close
describe('Profile dropdown', () => {
  it('is hidden by default so the user sees a clean navbar on page load', async () => {
    await renderNavbar()
    // The dropdown contains "Profile" as a menu item label
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })

  it('becomes visible when the profile avatar is clicked', async () => {
    await renderNavbar()
    await openProfileDropdown()
    expect(screen.getByRole('menu', { name: 'User profile menu' })).toBeInTheDocument()
  })

  it('shows Profile link, and Sign Out in the dropdown', async () => {
    // These are the three actions a user expects in a profile menu
    await renderNavbar()
    await openProfileDropdown()

    expect(screen.getByText('Profile')).toBeInTheDocument()
    expect(screen.getByText('Sign Out')).toBeInTheDocument()
  })

  it("displays the signed-in user's name and email in the dropdown header", async () => {
    await renderNavbar()
    await openProfileDropdown()

    expect(screen.getByText('Test User')).toBeInTheDocument()
    expect(screen.getByText('test@example.com')).toBeInTheDocument()
  })

  it('closes when the profile avatar is clicked a second time (toggle)', async () => {
    await renderNavbar()
    const profileButton = await openProfileDropdown()

    await act(async () => { fireEvent.click(profileButton) })

    await waitFor(() => {
      expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    })
  })

  it('closes when the user presses Escape (WAI-ARIA keyboard requirement)', async () => {
    // Users who navigate by keyboard must be able to close any opened menu with Escape.
    await renderNavbar()
    await openProfileDropdown()

    await act(async () => {
      fireEvent.keyDown(document, { key: 'Escape' })
    })

    await waitFor(() => {
      expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    })
  })

  it('closes when the user clicks anywhere outside the dropdown', async () => {
    await renderNavbar()
    await openProfileDropdown()

    await act(async () => {
      fireEvent.mouseDown(document.body)
    })

    await waitFor(() => {
      expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    })
  })

  it('navigates to /profile and closes the dropdown when Profile is clicked', async () => {
    await renderNavbar()
    await openProfileDropdown()

    await act(async () => {
      fireEvent.click(screen.getByText('Profile'))
    })

    expect(mockRouterPush).toHaveBeenCalledWith('/profile')

    await waitFor(() => {
      expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    })
  })
})

// 4. Session fallbacks – graceful degradation when session data is missing
describe('Session fallbacks', () => {
  it('shows "User" as the display name when the session contains no name', async () => {
    // Prevents the UI from showing undefined or a blank space when Microsoft OAuth
    // does not return a display name.
    ;(useSession as jest.Mock).mockReturnValue({ data: null })
    await renderNavbar()
    await openProfileDropdown()

    expect(screen.getByText('User')).toBeInTheDocument()
  })

  it('shows "No email available" when the session contains no email', async () => {
    ;(useSession as jest.Mock).mockReturnValue({ data: null })
    await renderNavbar()
    await openProfileDropdown()

    expect(screen.getByText('No email available')).toBeInTheDocument()
  })

  it('generates an initials avatar (SVG data URI) when the session has no image', async () => {
    const sessionWithoutImage = {
      user: { name: 'Test User', email: 'test@example.com', role: 'staff', image: null },
    }
    ;(useSession as jest.Mock).mockReturnValue({ data: sessionWithoutImage })

    await renderNavbar()

    // The generated avatar is an inline SVG encoded as a data URI
    const avatarImgs = screen.getAllByAltText("Test User's profile picture")
    expect(avatarImgs[0]).toHaveAttribute('src', expect.stringContaining('data:image/svg+xml'))
  })
})

// 5. Route change behaviour
describe('Route change behaviour', () => {
  it('closes the profile dropdown automatically when the user navigates to a new page', async () => {
    // Prevents the dropdown from remaining open as a ghost overlay after navigation.
    let rerender!: ReturnType<typeof render>['rerender']
    ;(usePathname as jest.Mock).mockReturnValue('/user/dashboard')

    await act(async () => {
      const result = render(
        <Navbar sidebarOpen={false} setSidebarOpen={jest.fn()} />
      )
      rerender = result.rerender
    })

    await openProfileDropdown()
    expect(screen.getByRole('menu')).toBeInTheDocument()

    // Simulate the user navigating to a different page
    ;(usePathname as jest.Mock).mockReturnValue('/profile')

    await act(async () => {
      rerender(<Navbar sidebarOpen={false} setSidebarOpen={jest.fn()} />)
    })

    await waitFor(() => {
      expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    })
  })

  it('does not close the dropdown when the pathname stays the same (no navigation)', async () => {
    // Guard against false positives: the dropdown must stay open during re-renders
    // that don't change the route.
    let rerender!: ReturnType<typeof render>['rerender']

    await act(async () => {
      const result = render(
        <Navbar sidebarOpen={false} setSidebarOpen={jest.fn()} />
      )
      rerender = result.rerender
    })

    await openProfileDropdown()
    expect(screen.getByRole('menu')).toBeInTheDocument()

    // Re-render without changing the pathname
    await act(async () => {
      rerender(<Navbar sidebarOpen={false} setSidebarOpen={jest.fn()} />)
    })

    expect(screen.getByRole('menu')).toBeInTheDocument()
  })
})

// 6. Mobile behaviour
describe('Mobile behaviour (<768px)', () => {
  beforeEach(() => {
    // Switch to a mobile-width viewport before each test in this group
    setViewportWidth(MOBILE_WIDTH)
  })

  it('renders a semi-transparent overlay when the sidebar is open on mobile', async () => {
    // The overlay prevents accidental interaction with the page content while
    // the sidebar is open; clicking it closes the sidebar.
    await renderNavbar({ sidebarOpen: true })

    const overlay = document.querySelector('.fixed.inset-0.z-30')
    expect(overlay).toBeInTheDocument()
  })

  it('does not render the overlay when the sidebar is closed on mobile', async () => {
    await renderNavbar({ sidebarOpen: false })
    expect(document.querySelector('.fixed.inset-0.z-30')).not.toBeInTheDocument()
  })

  it('does not render the overlay on desktop even when the sidebar is open', async () => {
    // The overlay is a mobile-only concern
    setViewportWidth(DESKTOP_WIDTH)
    await renderNavbar({ sidebarOpen: true })
    expect(document.querySelector('.fixed.inset-0.z-30')).not.toBeInTheDocument()
  })

  it('calls setSidebarOpen(false) when the mobile overlay is clicked', async () => {
    const { mockSetSidebarOpen } = await renderNavbar({ sidebarOpen: true })
    const overlay = document.querySelector('.fixed.inset-0.z-30') as HTMLElement

    await act(async () => { fireEvent.click(overlay) })

    expect(mockSetSidebarOpen).toHaveBeenCalledWith(false)
  })

  it('closes the sidebar when the profile dropdown is opened on mobile', async () => {
    // On mobile, only one panel (sidebar or dropdown) should be visible at a time
    // to avoid an overcrowded, unusable screen.
    const { mockSetSidebarOpen } = await renderNavbar({ sidebarOpen: true })
    await openProfileDropdown()

    expect(mockSetSidebarOpen).toHaveBeenCalledWith(false)
  })

  it('closes the profile dropdown when the sidebar is opened on mobile', async () => {
    // Mirror of the previous test – sidebar opening should also close the dropdown.
    await renderNavbar({ sidebarOpen: false })
    await openProfileDropdown()

    // Now toggle the sidebar open
    const hamburger = screen.getByLabelText('Toggle sidebar')
    await act(async () => { fireEvent.click(hamburger) })

    await waitFor(() => {
      expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    })
  })
})
