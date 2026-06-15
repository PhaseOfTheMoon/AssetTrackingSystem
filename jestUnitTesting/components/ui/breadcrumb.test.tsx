import { render, screen } from '@testing-library/react'
import Breadcrumb from '@/components/ui/breadcrumb'

jest.mock('next/navigation', () => ({
  usePathname: jest.fn()
}))

jest.mock('next/link', () => {
  return function MockLink({ href, children }: any) {
    return <a href={href}>{children}</a>
  }
})

jest.mock('@heroicons/react/24/outline', () => ({
  ChevronRightIcon: () => <svg data-testid="chevron" />,
  HomeIcon: () => <svg data-testid="home-icon" />
}))

const { usePathname } = require('next/navigation')

describe('Breadcrumb', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    usePathname.mockReturnValue('/admin/dashboard')
  })

  // renders a nav with aria-label="Breadcrumb"
  it('renders a navigation element', () => {
    render(<Breadcrumb />)
    expect(screen.getByRole('navigation', { name: 'Breadcrumb' })).toBeInTheDocument()
  })

  // custom items should override the pathname-generated ones
  it('renders custom items when provided', () => {
    const customItems = [
      { label: 'Home', href: '/admin/dashboard', isClickable: true },
      { label: 'Staff', href: '/admin/staff', isClickable: false }
    ]
    render(<Breadcrumb customItems={customItems} />)
    expect(screen.getByText('Home')).toBeInTheDocument()
    expect(screen.getByText('Staff')).toBeInTheDocument()
  })

  // first item should always be a link to the dashboard
  it('renders the first item as a link', () => {
    const customItems = [
      { label: 'Home', href: '/admin/dashboard', isClickable: true },
      { label: 'Staff', href: '/admin/staff', isClickable: false }
    ]
    render(<Breadcrumb customItems={customItems} />)
    const homeLink = screen.getByRole('link', { name: /home/i })
    expect(homeLink).toHaveAttribute('href', '/admin/dashboard')
  })

  // last item should be plain text, not a link
  it('renders the last item as plain text', () => {
    const customItems = [
      { label: 'Home', href: '/admin/dashboard', isClickable: true },
      { label: 'Staff', href: '/admin/staff', isClickable: false }
    ]
    render(<Breadcrumb customItems={customItems} />)
    const links = screen.getAllByRole('link')
    const linkTexts = links.map(l => l.textContent)
    expect(linkTexts).not.toContain('Staff')
  })

  // when no customItems, breadcrumbs are built from the current pathname
  it('generates Home breadcrumb from the pathname', () => {
    usePathname.mockReturnValue('/admin/staff')
    render(<Breadcrumb />)
    expect(screen.getByText('Home')).toBeInTheDocument()
  })

  // known path segments have a human-readable label mapping
  it('applies the label map for known segments like assetTracking', () => {
    usePathname.mockReturnValue('/admin/assetTracking')
    render(<Breadcrumb />)
    expect(screen.getByText('Asset Tracking')).toBeInTheDocument()
  })
})