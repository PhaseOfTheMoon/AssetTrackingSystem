import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { useSession, signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/ui/toast'
import LoginClient from '@/app/(auth)/login/loginClient'

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}))

jest.mock('next-auth/react', () => ({
  useSession: jest.fn(),
  signIn: jest.fn(),
}))

jest.mock('@/components/ui/Toast', () => ({
  useToast: jest.fn(),
}))

describe('LoginClient', () => {
  const mockReplace = jest.fn()
  const mockShowToast = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue({ replace: mockReplace })
    ;(useToast as jest.Mock).mockReturnValue({ showToast: mockShowToast })
    sessionStorage.clear()

    Object.defineProperty(window, 'location', {
      writable: true,
      value: { search: '' },
    })
  })

  /** check main ui elements show up for unauthenticated user */
  it('renders the login page for unauthenticated users', () => {
    (useSession as jest.Mock).mockReturnValue({ data: null, status: 'unauthenticated' })

    render(<LoginClient />)

    expect(screen.getByText('Asset Tracking System')).toBeInTheDocument()
    expect(screen.getByText('Sign in with Microsoft')).toBeInTheDocument()
    expect(screen.getByText('Register for Access')).toBeInTheDocument()
  })

  /** while nextauth is checking the session, show spinner not the button */
  it('shows loading spinner when session is still loading', () => {
    (useSession as jest.Mock).mockReturnValue({ data: null, status: 'loading' })

    render(<LoginClient />)

    expect(screen.getByText('Loading...')).toBeInTheDocument()
    expect(screen.queryByText('Sign in with Microsoft')).not.toBeInTheDocument()
  })

  /** register link must point to /register */
  it('renders the register link pointing to /register', () => {
    (useSession as jest.Mock).mockReturnValue({ data: null, status: 'unauthenticated' })

    render(<LoginClient />)

    const link = screen.getByText('Register for Access')
    expect(link.closest('a')).toHaveAttribute('href', '/register')
  })

  /** clicking microsoft button should call signIn with azure-ad */
  it('calls signIn with azure-ad when the button is clicked', () => {
    (useSession as jest.Mock).mockReturnValue({ data: null, status: 'unauthenticated' })

    render(<LoginClient />)

    fireEvent.click(screen.getByText('Sign in with Microsoft'))

    expect(signIn).toHaveBeenCalledWith('azure-ad', { callbackUrl: undefined })
  })

  /** if there is a callbackUrl in the url, pass it to signIn */
  it('passes callbackUrl to signIn when present in query string', () => {
    (useSession as jest.Mock).mockReturnValue({ data: null, status: 'unauthenticated' })

    Object.defineProperty(window, 'location', {
      writable: true,
      value: { search: '?callbackUrl=/scan/location/E404' },
    })

    render(<LoginClient />)

    fireEvent.click(screen.getByText('Sign in with Microsoft'))

    expect(signIn).toHaveBeenCalledWith('azure-ad', { callbackUrl: '/scan/location/E404' })
  })

  /** admin role should go to /admin/dashboard */
  it('redirects admin to /admin/dashboard after login', async () => {
    (useSession as jest.Mock).mockReturnValue({
      data: { user: { name: 'Admin', email: 'admin@swin.edu.my', role: 'admin' } },
      status: 'authenticated',
    })

    await act(async () => { render(<LoginClient />) })

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/admin/dashboard')
    })
  })

  /** staff role should go to /user/dashboard */
  it('redirects staff to /user/dashboard after login', async () => {
    (useSession as jest.Mock).mockReturnValue({
      data: { user: { name: 'Staff', email: 'staff@swin.edu.my', role: 'staff' } },
      status: 'authenticated',
    })

    await act(async () => { render(<LoginClient />) })

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/user/dashboard')
    })
  })

  /** loginSuccess flag must be set in sessionStorage so dashboard can show welcome toast */
  it('sets loginSuccess in sessionStorage before redirecting', async () => {
    (useSession as jest.Mock).mockReturnValue({
      data: { user: { name: 'Admin', email: 'admin@swin.edu.my', role: 'admin' } },
      status: 'authenticated',
    })

    await act(async () => { render(<LoginClient />) })

    await waitFor(() => {
      expect(sessionStorage.getItem('loginSuccess')).toBe('true')
    })
  })

  /** unauthenticated users should not be redirected */
  it('does not redirect when user is not authenticated', () => {
    (useSession as jest.Mock).mockReturnValue({ data: null, status: 'unauthenticated' })

    render(<LoginClient />)

    expect(mockReplace).not.toHaveBeenCalled()
  })

  /** useRef guard prevents redirect from firing more than once on re-render */
  it('does not redirect a second time on re-render', async () => {
    (useSession as jest.Mock).mockReturnValue({
      data: { user: { name: 'Admin', email: 'admin@swin.edu.my', role: 'admin' } },
      status: 'authenticated',
    })

    const { rerender } = await act(async () => render(<LoginClient />))

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledTimes(1)
    })

    await act(async () => { rerender(<LoginClient />) })

    expect(mockReplace).toHaveBeenCalledTimes(1)
  })

  /** pending accounts get a warning toast and should not be redirected */
  it('shows warning toast for pending accounts and does not redirect', async () => {
    (useSession as jest.Mock).mockReturnValue({
      data: { user: { name: 'Pending', email: 'pending@swin.edu.my', role: 'pending' } },
      status: 'authenticated',
    })

    await act(async () => { render(<LoginClient />) })

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith(
        'Your account is pending admin approval',
        'warning'
      )
    })

    expect(mockReplace).not.toHaveBeenCalled()
  })

  /** rejected accounts get an error toast and should not be redirected */
  it('shows error toast for rejected accounts and does not redirect', async () => {
    (useSession as jest.Mock).mockReturnValue({
      data: { user: { name: 'Rejected', email: 'rejected@swin.edu.my', role: 'rejected' } },
      status: 'authenticated',
    })

    await act(async () => { render(<LoginClient />) })

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith(
        'Your account has been rejected',
        'error'
      )
    })

    expect(mockReplace).not.toHaveBeenCalled()
  })

  /** unregistered accounts get a warning toast telling them to register */
  it('shows warning toast for unregistered accounts and does not redirect', async () => {
    (useSession as jest.Mock).mockReturnValue({
      data: { user: { name: 'Unknown', email: 'unknown@swin.edu.my', role: 'unregistered' } },
      status: 'authenticated',
    })

    await act(async () => { render(<LoginClient />) })

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith(
        'Your account is not registered in the system. Please register for access',
        'warning'
      )
    })

    expect(mockReplace).not.toHaveBeenCalled()
  })
})
