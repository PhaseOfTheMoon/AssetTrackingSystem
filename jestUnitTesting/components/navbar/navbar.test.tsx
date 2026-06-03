import { render, screen, fireEvent, act } from '@testing-library/react'
import Navbar from '@/components/navbar/navbar'

jest.mock('next/navigation', () => ({
  usePathname: jest.fn(),
  useRouter: jest.fn(() => ({ push: jest.fn() }))
}))

jest.mock('next-auth/react', () => ({ useSession: jest.fn() }))

jest.mock('next/image', () => {
  return function MockImage({ alt, ...props }: any) {
    return <img alt={alt} {...props} />
  }
})

jest.mock('next/link', () => {
  return function MockLink({ href, children }: any) {
    return <a href={href}>{children}</a>
  }
})

jest.mock('next/dynamic', () => () => {
  return function MockSidebar({ isOpen }: any) {
    return isOpen ? <div data-testid="sidebar">Sidebar</div> : null
  }
})

jest.mock('@heroicons/react/24/outline', () => ({
  UserCircleIcon: () => <svg data-testid="user-icon" />,
  Bars3Icon: () => <svg data-testid="bars-icon" />
}))

jest.mock('@/components/logoutButton', () => {
  return function MockLogoutButton({ text }: any) {
    return <button>{text}</button>
  }
})

const { useSession } = require('next-auth/react')
const { usePathname } = require('next/navigation')

const mockSetSidebarOpen = jest.fn()

const adminSession = {
  data: { user: { name: 'Irene CHIN', email: 'irene@swin.edu.my', role: 'admin', image: null } }
}

describe('Navbar', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    usePathname.mockReturnValue('/admin/dashboard')
    useSession.mockReturnValue(adminSession)
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 1024 })
  })

  // Basic rendering

  it('renders the Swinburne logo', async () => {
    await act(async () => {
      render(<Navbar sidebarOpen={false} setSidebarOpen={mockSetSidebarOpen} />)
    })
    expect(screen.getByAltText('Swinburne Logo')).toBeInTheDocument()
  })

  it('renders the hamburger toggle button', async () => {
    await act(async () => {
      render(<Navbar sidebarOpen={false} setSidebarOpen={mockSetSidebarOpen} />)
    })
    expect(screen.getByLabelText('Toggle sidebar')).toBeInTheDocument()
  })

  // Sidebar toggle

  it('calls setSidebarOpen when the hamburger button is clicked', async () => {
    await act(async () => {
      render(<Navbar sidebarOpen={false} setSidebarOpen={mockSetSidebarOpen} />)
    })
    fireEvent.click(screen.getByLabelText('Toggle sidebar'))
    expect(mockSetSidebarOpen).toHaveBeenCalledWith(true)
  })

  // Profile dropdown

  it('opens the profile dropdown when the avatar button is clicked', async () => {
    await act(async () => {
      render(<Navbar sidebarOpen={false} setSidebarOpen={mockSetSidebarOpen} />)
    })
    const avatarBtn = screen.getAllByRole('button')[1]
    await act(async () => {
      fireEvent.click(avatarBtn)
    })
    expect(screen.getByRole('menu')).toBeInTheDocument()
  })

  it('shows the user name and email inside the dropdown', async () => {
    await act(async () => {
      render(<Navbar sidebarOpen={false} setSidebarOpen={mockSetSidebarOpen} />)
    })
    const avatarBtn = screen.getAllByRole('button')[1]
    await act(async () => {
      fireEvent.click(avatarBtn)
    })
    expect(screen.getByText('Irene CHIN')).toBeInTheDocument()
    expect(screen.getByText('irene@swin.edu.my')).toBeInTheDocument()
  })

  it('shows Profile and Sign Out options inside the dropdown', async () => {
    await act(async () => {
      render(<Navbar sidebarOpen={false} setSidebarOpen={mockSetSidebarOpen} />)
    })
    const avatarBtn = screen.getAllByRole('button')[1]
    await act(async () => {
      fireEvent.click(avatarBtn)
    })
    expect(screen.getByText('Profile')).toBeInTheDocument()
    expect(screen.getByText('Sign Out')).toBeInTheDocument()
  })

  // clicking the avatar again closes the dropdown
  it('closes the profile dropdown when the avatar is clicked a second time', async () => {
    await act(async () => {
      render(<Navbar sidebarOpen={false} setSidebarOpen={mockSetSidebarOpen} />)
    })
    const avatarBtn = screen.getAllByRole('button')[1]
    await act(async () => { fireEvent.click(avatarBtn) })
    expect(screen.getByRole('menu')).toBeInTheDocument()
    await act(async () => { fireEvent.click(avatarBtn) })
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })

  // pressing Escape should close the dropdown
  it('closes the profile dropdown when Escape is pressed', async () => {
    await act(async () => {
      render(<Navbar sidebarOpen={false} setSidebarOpen={mockSetSidebarOpen} />)
    })
    const avatarBtn = screen.getAllByRole('button')[1]
    await act(async () => { fireEvent.click(avatarBtn) })
    expect(screen.getByRole('menu')).toBeInTheDocument()
    await act(async () => { fireEvent.keyDown(document, { key: 'Escape' }) })
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })

  // Session fallback

  it('shows "User" and "No email available" when session has no user data', async () => {
    useSession.mockReturnValue({ data: null })
    await act(async () => {
      render(<Navbar sidebarOpen={false} setSidebarOpen={mockSetSidebarOpen} />)
    })
    const avatarBtn = screen.getAllByRole('button')[1]
    await act(async () => { fireEvent.click(avatarBtn) })
    expect(screen.getByText('User')).toBeInTheDocument()
    expect(screen.getByText('No email available')).toBeInTheDocument()
  })

  // Mobile overlay

  it('shows the mobile overlay when the sidebar is open on a mobile viewport', async () => {
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 500 })
    await act(async () => {
      render(<Navbar sidebarOpen={true} setSidebarOpen={mockSetSidebarOpen} />)
    })
    expect(document.querySelector('.bg-black.bg-opacity-50')).toBeInTheDocument()
  })

  it('does not show the overlay on desktop even when sidebar is open', async () => {
    await act(async () => {
      render(<Navbar sidebarOpen={true} setSidebarOpen={mockSetSidebarOpen} />)
    })
    expect(document.querySelector('.bg-black.bg-opacity-50')).not.toBeInTheDocument()
  })

  // Click outside closes dropdown

  it('closes the profile dropdown when clicking outside it', async () => {
    await act(async () => {
      render(<Navbar sidebarOpen={false} setSidebarOpen={mockSetSidebarOpen} />)
    })
    const avatarBtn = screen.getAllByRole('button')[1]
    await act(async () => { fireEvent.click(avatarBtn) })
    expect(screen.getByRole('menu')).toBeInTheDocument()

    await act(async () => { fireEvent.mouseDown(document.body) })
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })

  // Mobile navigation closes sidebar

  it('closes the sidebar on mobile when navigating to a new page', async () => {
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 500 })
    let rerender: any
    await act(async () => {
      const result = render(<Navbar sidebarOpen={true} setSidebarOpen={mockSetSidebarOpen} />)
      rerender = result.rerender
    })
    usePathname.mockReturnValue('/profile')
    await act(async () => {
      rerender(<Navbar sidebarOpen={true} setSidebarOpen={mockSetSidebarOpen} />)
    })
    expect(mockSetSidebarOpen).toHaveBeenCalledWith(false)
  })
})
