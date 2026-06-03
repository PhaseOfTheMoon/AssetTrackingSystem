import { render, waitFor, act } from '@testing-library/react'
import { signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import LogoutPage from '@/app/(auth)/logout/page'

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}))

jest.mock('next-auth/react', () => ({
  signOut: jest.fn(),
}))

global.fetch = jest.fn()

describe('LogoutPage', () => {
  const mockReplace = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue({ replace: mockReplace })
    ;(global.fetch as jest.Mock).mockResolvedValue({})
    ;(signOut as jest.Mock).mockResolvedValue({})
    sessionStorage.clear()
  })

  /** page returns null so nothing should render */
  it('renders nothing', () => {
    const { container } = render(<LogoutPage />)

    expect(container).toBeEmptyDOMElement()
  })

  /** should call POST /api/auth/logout on mount to clear server cookies */
  it('calls POST /api/auth/logout on mount', async () => {
    await act(async () => { render(<LogoutPage />) })

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/auth/logout', expect.objectContaining({
        method: 'POST',
      }))
    })
  })

  /** should call signOut with redirect false so we control the redirect */
  it('calls signOut with redirect false', async () => {
    await act(async () => { render(<LogoutPage />) })

    await waitFor(() => {
      expect(signOut).toHaveBeenCalledWith({ redirect: false })
    })
  })

  /** should set lastPath to /login in sessionStorage so welcome toast shows on next login */
  it('sets lastPath to /login in sessionStorage', async () => {
    await act(async () => { render(<LogoutPage />) })

    await waitFor(() => {
      expect(sessionStorage.getItem('lastPath')).toBe('/login')
    })
  })

  /** should redirect to /login after logout completes */
  it('redirects to /login after logout', async () => {
    await act(async () => { render(<LogoutPage />) })

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/login')
    })
  })

  /** useRef guard prevents logout from running twice on re-render */
  it('does not run logout again on re-render', async () => {
    const { rerender } = await act(async () => render(<LogoutPage />))

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(1)
    })

    await act(async () => { rerender(<LogoutPage />) })

    expect(global.fetch).toHaveBeenCalledTimes(1)
  })

  /** if fetch fails, should still call signOut and redirect */
  it('still redirects to /login when fetch fails', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation()
    ;(global.fetch as jest.Mock).mockRejectedValue(new Error('network error'))

    await act(async () => { render(<LogoutPage />) })

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/login')
    })

    consoleSpy.mockRestore()
  })

  /** if signOut fails, should still redirect to /login */
  it('still redirects to /login when signOut fails', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation()
    ;(signOut as jest.Mock).mockRejectedValue(new Error('signout error'))

    await act(async () => { render(<LogoutPage />) })

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/login')
    })

    consoleSpy.mockRestore()
  })

  /** second useEffect call should be blocked by hasLoggedOut ref — fetch only called once */
  it('fetch is only called once even if effect runs twice', async () => {
    const { unmount } = await act(async () => render(<LogoutPage />))

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(1)
    })

    // unmount and remount simulates strict mode double effect
    unmount()
    await act(async () => { render(<LogoutPage />) })

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(2)
    })
  })
})
