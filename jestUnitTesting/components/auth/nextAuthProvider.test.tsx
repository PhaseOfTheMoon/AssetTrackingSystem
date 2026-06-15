import { render, screen } from '@testing-library/react'
import { NextAuthProvider } from '@/components/auth/nextAuthProvider'

// replace the real SessionProvider with a simple wrapper so we can verify
// that children are rendered inside it without needing a real NextAuth session
jest.mock('next-auth/react', () => ({
  SessionProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="session-provider">{children}</div>
  )
}))

describe('NextAuthProvider', () => {
  // children passed to the provider should appear in the DOM
  it('renders its children', () => {
    render(
      <NextAuthProvider>
        <div data-testid="child">Hello</div>
      </NextAuthProvider>
    )
    expect(screen.getByTestId('child')).toBeInTheDocument()
  })

  // the provider must wrap children in SessionProvider
  it('wraps children inside SessionProvider', () => {
    render(
      <NextAuthProvider>
        <span>content</span>
      </NextAuthProvider>
    )
    expect(screen.getByTestId('session-provider')).toBeInTheDocument()
  })

  // multiple children should all be rendered
  it('renders multiple children', () => {
    render(
      <NextAuthProvider>
        <p data-testid="first">First</p>
        <p data-testid="second">Second</p>
      </NextAuthProvider>
    )
    expect(screen.getByTestId('first')).toBeInTheDocument()
    expect(screen.getByTestId('second')).toBeInTheDocument()
  })

  // child text content should be visible inside the provider
  it('renders child text content correctly', () => {
    render(
      <NextAuthProvider>
        <span>Welcome</span>
      </NextAuthProvider>
    )
    expect(screen.getByText('Welcome')).toBeInTheDocument()
  })
})