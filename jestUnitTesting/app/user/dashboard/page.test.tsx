/**
 * Unit tests for Dashboard
 *
 * This page acts as the entry dashboard for staff users.
 * It checks authentication status through useAuth and:
 *
 *   - Shows a loading screen while authentication is being checked
 *   - Renders WelcomeContent when authenticated
 *   - Navigates to the scanner page when a scan type is selected
 *
 * What we cover:
 *   - Loading state rendering
 *   - Authenticated rendering
 *   - Correct scanner navigation
 */

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import UserHome from '@/app/(app)/user/dashboard/page'
import { useAuth } from '@/hooks/useAuth'

const mockPush = jest.fn()

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush
  })
}))

jest.mock('@/hooks/useAuth', () => ({
  useAuth: jest.fn()
}))

jest.mock('@/components/scanner/welcomeContent', () => {
  return function MockWelcomeContent({
    onNavigate
  }: {
    onNavigate: (type: string) => void
  }) {
    return (
      <button
        data-testid="welcome-content"
        onClick={() => onNavigate('asset')}
      >
        Open Scanner
      </button>
    )
  }
})

describe('UserHome', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders loading state while authentication is loading', () => {
    ;(useAuth as jest.Mock).mockReturnValue({
      session: null,
      isLoading: true
    })

    render(<UserHome />)

    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })

  it('renders loading state when session is unavailable', () => {
    ;(useAuth as jest.Mock).mockReturnValue({
      session: null,
      isLoading: false
    })

    render(<UserHome />)

    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })

  it('renders WelcomeContent when authenticated', () => {
    ;(useAuth as jest.Mock).mockReturnValue({
      session: { user: { id: '1' } },
      isLoading: false
    })

    render(<UserHome />)

    expect(screen.getByTestId('welcome-content')).toBeInTheDocument()
  })

  it('navigates to scanner page when a scan type is selected', async () => {
    ;(useAuth as jest.Mock).mockReturnValue({
      session: { user: { id: '1' } },
      isLoading: false
    })

    render(<UserHome />)

    await userEvent.click(
      screen.getByTestId('welcome-content')
    )

    expect(mockPush).toHaveBeenCalledWith(
      '/user/scanner?type=asset'
    )
  })
})