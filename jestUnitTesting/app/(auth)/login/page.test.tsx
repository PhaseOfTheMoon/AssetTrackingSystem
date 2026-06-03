import { render, screen } from '@testing-library/react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/ui/toast'
import LoginPage from '@/app/(auth)/login/page'

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

describe('LoginPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue({ replace: jest.fn() })
    ;(useToast as jest.Mock).mockReturnValue({ showToast: jest.fn() })
    ;(useSession as jest.Mock).mockReturnValue({ data: null, status: 'unauthenticated' })
  })

  /** page.tsx is an async server component wrapper that renders LoginClient */
  it('renders LoginClient inside the page', async () => {
    const page = await LoginPage()
    render(page)

    expect(screen.getByText('Asset Tracking System')).toBeInTheDocument()
    expect(screen.getByText('Sign in with Microsoft')).toBeInTheDocument()
  })

  /** metadata export should have the correct page title */
  it('exports the correct page title in metadata', async () => {
    const mod = await import('@/app/(auth)/login/page')
    expect(mod.metadata).toEqual({
      title: 'Sign In - Asset Tracking System',
    })
  })
})
