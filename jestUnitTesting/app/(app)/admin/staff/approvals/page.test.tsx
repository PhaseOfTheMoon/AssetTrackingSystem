// Commented by Irene
import { render, screen, fireEvent, act } from '@testing-library/react'
import ApprovalsPage from '@/app/(app)/admin/staff/approvals/page'
import { useAdminAccess } from '@/hooks/useAdminAccess'

jest.mock('@/hooks/useAdminAccess', () => ({
  useAdminAccess: jest.fn()
}))

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  useSearchParams: jest.fn(() => ({ get: jest.fn() })),
  usePathname: jest.fn()
}))

jest.mock('@heroicons/react/24/outline', () => ({
  ClockIcon: () => <svg />,
  CheckIcon: () => <svg />,
  XMarkIcon: () => <svg />
}))

global.fetch = jest.fn()
global.confirm = jest.fn()
global.alert = jest.fn()

// updated mock: renders action buttons and column cells so the callbacks are exercised
jest.mock('@/components/dynamicPage', () => {
  return function MockDynamicPage({ config }: any) {
    const sampleRow = { staff_id: 'S001', name: 'Test User' }
    const mockRefresh = jest.fn()
    return (
      <div data-testid="dynamic-page">
        <h1>{config.pageTitle}</h1>
        <div data-testid="config">{JSON.stringify(config)}</div>

        {/* render each custom action button so onClick and show callbacks are testable */}
        {config.customActions?.map((action: any) => (
          <div key={action.label}>
            <span data-testid={`show-${action.label.toLowerCase()}-pending`}>
              {String(action.show(sampleRow, 'pending'))}
            </span>
            <span data-testid={`show-${action.label.toLowerCase()}-approved`}>
              {String(action.show(sampleRow, 'approved'))}
            </span>
            <button
              data-testid={`action-${action.label.toLowerCase()}`}
              onClick={() => action.onClick(sampleRow, mockRefresh)}
            >
              {action.label}
            </button>
          </div>
        ))}

        {/* render column cells with sample data so render callbacks are exercised */}
        {config.columns?.filter((col: any) => col.render).map((col: any) => (
          <div key={col.key} data-testid={`cell-${col.key}`}>
            {col.render('2024-01-15T10:30:00.000Z', sampleRow)}
          </div>
        ))}
      </div>
    )
  }
})

const adminAccess = { isLoading: false, isAdmin: true }

describe('ApprovalsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  // Access control

  it('renders nothing while admin access is loading', () => {
    ;(useAdminAccess as jest.Mock).mockReturnValue({ isLoading: true, isAdmin: false })
    const { container } = render(<ApprovalsPage />)
    expect(container.firstChild).toBeNull()
  })

  it('renders nothing when the user is not an admin', () => {
    ;(useAdminAccess as jest.Mock).mockReturnValue({ isLoading: false, isAdmin: false })
    const { container } = render(<ApprovalsPage />)
    expect(container.firstChild).toBeNull()
  })

  it('renders the DynamicPage when the user is an admin', () => {
    ;(useAdminAccess as jest.Mock).mockReturnValue(adminAccess)
    render(<ApprovalsPage />)
    expect(screen.getByTestId('dynamic-page')).toBeInTheDocument()
  })

  // Config

  it('shows the correct page title', () => {
    ;(useAdminAccess as jest.Mock).mockReturnValue(adminAccess)
    render(<ApprovalsPage />)
    expect(screen.getByText('Staff Registration Approvals')).toBeInTheDocument()
  })

  it('passes the correct API endpoint and primary key', () => {
    ;(useAdminAccess as jest.Mock).mockReturnValue(adminAccess)
    render(<ApprovalsPage />)
    const config = JSON.parse(screen.getByTestId('config').textContent || '{}')
    expect(config.apiEndpoint).toBe('/api/staff/approvals')
    expect(config.primaryKey).toBe('staff_id')
  })

  it('includes Pending, Approved and Rejected tabs', () => {
    ;(useAdminAccess as jest.Mock).mockReturnValue(adminAccess)
    render(<ApprovalsPage />)
    const config = JSON.parse(screen.getByTestId('config').textContent || '{}')
    const labels = config.tabsConfig.map((t: any) => t.label)
    expect(labels).toContain('Pending')
    expect(labels).toContain('Approved')
    expect(labels).toContain('Rejected')
  })

  it('has showAddButton set to false', () => {
    ;(useAdminAccess as jest.Mock).mockReturnValue(adminAccess)
    render(<ApprovalsPage />)
    const config = JSON.parse(screen.getByTestId('config').textContent || '{}')
    expect(config.showAddButton).toBe(false)
  })

  it('includes all required columns', () => {
    ;(useAdminAccess as jest.Mock).mockReturnValue(adminAccess)
    render(<ApprovalsPage />)
    const config = JSON.parse(screen.getByTestId('config').textContent || '{}')
    const keys = config.columns.map((c: any) => c.key)
    expect(keys).toEqual(
      expect.arrayContaining(['staff_id', 'name', 'email', 'mobile_no', 'department_id', 'created_dt'])
    )
  })

  // formatDate (created_dt column render)

  it('renders a formatted date in the created_dt column', () => {
    ;(useAdminAccess as jest.Mock).mockReturnValue(adminAccess)
    render(<ApprovalsPage />)
    // the mock calls col.render('2024-01-15T10:30:00.000Z', row)
    // formatDate should convert this to a human-readable string
    const cell = screen.getByTestId('cell-created_dt')
    expect(cell.textContent).not.toBe('')
    expect(cell.textContent).toMatch(/2024/)
  })

  // handleApprove

  // when user confirms and fetch succeeds, the API is called
  it('calls POST /api/staff/approve when Approve is clicked and user confirms', async () => {
    ;(useAdminAccess as jest.Mock).mockReturnValue(adminAccess)
    ;(global.confirm as jest.Mock).mockReturnValue(true)
    ;(global.fetch as jest.Mock).mockResolvedValue({ ok: true })

    render(<ApprovalsPage />)
    await act(async () => {
      fireEvent.click(screen.getByTestId('action-approve'))
    })

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/staff/approve',
      expect.objectContaining({ method: 'POST' })
    )
  })

  // when user cancels the confirm dialog, fetch must not be called
  it('does not call fetch when user cancels the Approve confirmation', async () => {
    ;(useAdminAccess as jest.Mock).mockReturnValue(adminAccess)
    ;(global.confirm as jest.Mock).mockReturnValue(false)

    render(<ApprovalsPage />)
    await act(async () => {
      fireEvent.click(screen.getByTestId('action-approve'))
    })

    expect(global.fetch).not.toHaveBeenCalled()
  })

  // when the API returns an error, alert is shown
  it('shows an alert when the approve API call fails', async () => {
    ;(useAdminAccess as jest.Mock).mockReturnValue(adminAccess)
    ;(global.confirm as jest.Mock).mockReturnValue(true)
    ;(global.fetch as jest.Mock).mockResolvedValue({ ok: false })

    render(<ApprovalsPage />)
    await act(async () => {
      fireEvent.click(screen.getByTestId('action-approve'))
    })

    expect(global.alert).toHaveBeenCalledWith('Failed to approve staff member')
  })

  // handleReject

  it('calls POST /api/staff/reject when Reject is clicked and user confirms', async () => {
    ;(useAdminAccess as jest.Mock).mockReturnValue(adminAccess)
    ;(global.confirm as jest.Mock).mockReturnValue(true)
    ;(global.fetch as jest.Mock).mockResolvedValue({ ok: true })

    render(<ApprovalsPage />)
    await act(async () => {
      fireEvent.click(screen.getByTestId('action-reject'))
    })

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/staff/reject',
      expect.objectContaining({ method: 'POST' })
    )
  })

  it('does not call fetch when user cancels the Reject confirmation', async () => {
    ;(useAdminAccess as jest.Mock).mockReturnValue(adminAccess)
    ;(global.confirm as jest.Mock).mockReturnValue(false)

    render(<ApprovalsPage />)
    await act(async () => {
      fireEvent.click(screen.getByTestId('action-reject'))
    })

    expect(global.fetch).not.toHaveBeenCalled()
  })

  // show callbacks

  // Approve and Reject actions should only be visible on the Pending tab
  it('shows Approve and Reject actions only on the pending tab', () => {
    ;(useAdminAccess as jest.Mock).mockReturnValue(adminAccess)
    render(<ApprovalsPage />)
    expect(screen.getByTestId('show-approve-pending').textContent).toBe('true')
    expect(screen.getByTestId('show-approve-approved').textContent).toBe('false')
    expect(screen.getByTestId('show-reject-pending').textContent).toBe('true')
    expect(screen.getByTestId('show-reject-approved').textContent).toBe('false')
  })

  it('shows an alert when the reject API call fails', async () => {
    ;(useAdminAccess as jest.Mock).mockReturnValue(adminAccess)
    ;(global.confirm as jest.Mock).mockReturnValue(true)
    ;(global.fetch as jest.Mock).mockResolvedValue({ ok: false })

    render(<ApprovalsPage />)
    await act(async () => {
      fireEvent.click(screen.getByTestId('action-reject'))
    })

    expect(global.alert).toHaveBeenCalledWith('Failed to reject staff member')
  })
})