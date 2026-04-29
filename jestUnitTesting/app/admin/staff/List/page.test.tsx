// Commented by Irene
import { render, screen } from '@testing-library/react'
import StaffListPage from '@/app/(app)/admin/staff/list/page'
import { useAdminAccess } from '@/hooks/useAdminAccess'

// fake out the admin hook so we control what it returns in each test
jest.mock('@/hooks/useAdminAccess', () => ({
  useAdminAccess: jest.fn(),
}))

// fake out the router so we don't get navigation errors
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}))

// replace the real DynamicPage with a simple version that dumps the config as text
// so we can easily check what was passed into it
jest.mock('@/components/dynamicPage', () => {
  return function MockDynamicPage({ config }: any) {
    return (
      <div data-testid="dynamic-page">
        <h1>{config.pageTitle}</h1>
        <div data-testid="config">{JSON.stringify(config)}</div>
      </div>
    )
  }
})

describe('StaffListPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  // page should show nothing while still checking if user is admin
  it('renders nothing while admin access is loading', () => {
    ;(useAdminAccess as jest.Mock).mockReturnValue({ isLoading: true, isAdmin: false })
    const { container } = render(<StaffListPage />)
    expect(container.firstChild).toBeNull()
  })

  // non-admin users shouldn't see this page at all
  it('renders nothing when the user is not an admin', () => {
    ;(useAdminAccess as jest.Mock).mockReturnValue({ isLoading: false, isAdmin: false })
    const { container } = render(<StaffListPage />)
    expect(container.firstChild).toBeNull()
  })

  // admin users should see the staff list
  it('renders DynamicPage when the user is an admin', () => {
    ;(useAdminAccess as jest.Mock).mockReturnValue({ isLoading: false, isAdmin: true })
    render(<StaffListPage />)
    expect(screen.getByTestId('dynamic-page')).toBeInTheDocument()
  })

  // check the page heading shows "Staff"
  it('shows the correct page title', () => {
    ;(useAdminAccess as jest.Mock).mockReturnValue({ isLoading: false, isAdmin: true })
    render(<StaffListPage />)
    expect(screen.getByText('Staff')).toBeInTheDocument()
  })

  // make sure the config points to the right entity, API route, and ID field
  it('passes the correct entity name, API endpoint, and primary key', () => {
    ;(useAdminAccess as jest.Mock).mockReturnValue({ isLoading: false, isAdmin: true })
    render(<StaffListPage />)
    const config = JSON.parse(screen.getByTestId('config').textContent || '{}')
    expect(config.entityName).toBe('staff')
    expect(config.apiEndpoint).toBe('/api/staff')
    expect(config.primaryKey).toBe('staff_id')
  })

  // "Add Staff" button should link to the right page
  it('sets the add URL to the add staff page', () => {
    ;(useAdminAccess as jest.Mock).mockReturnValue({ isLoading: false, isAdmin: true })
    render(<StaffListPage />)
    const config = JSON.parse(screen.getByTestId('config').textContent || '{}')
    expect(config.addUrl).toBe('/admin/staff/addStaff')
  })

  // clicking edit on a row should go to the right page
  it('sets the edit URL to the edit staff page', () => {
    ;(useAdminAccess as jest.Mock).mockReturnValue({ isLoading: false, isAdmin: true })
    render(<StaffListPage />)
    const config = JSON.parse(screen.getByTestId('config').textContent || '{}')
    expect(config.editUrl).toBe('/admin/staff/editStaff')
  })

  // the "Add" button should be visible on this page
  it('enables the add button', () => {
    ;(useAdminAccess as jest.Mock).mockReturnValue({ isLoading: false, isAdmin: true })
    render(<StaffListPage />)
    const config = JSON.parse(screen.getByTestId('config').textContent || '{}')
    expect(config.showAddButton).toBe(true)
  })

  // table should have exactly 6 columns
  it('includes exactly 6 table columns', () => {
    ;(useAdminAccess as jest.Mock).mockReturnValue({ isLoading: false, isAdmin: true })
    render(<StaffListPage />)
    const config = JSON.parse(screen.getByTestId('config').textContent || '{}')
    expect(config.columns).toHaveLength(6)
  })

  // check all expected column keys are present
  it('includes all required column keys', () => {
    ;(useAdminAccess as jest.Mock).mockReturnValue({ isLoading: false, isAdmin: true })
    render(<StaffListPage />)
    const config = JSON.parse(screen.getByTestId('config').textContent || '{}')
    const keys = config.columns.map((c: any) => c.key)
    expect(keys).toEqual(
      expect.arrayContaining(['staff_id', 'name', 'email', 'mobile_no', 'department', 'created_dt'])
    )
  })

  // the edit/add form should have exactly 5 fields
  it('includes exactly 5 form fields', () => {
    ;(useAdminAccess as jest.Mock).mockReturnValue({ isLoading: false, isAdmin: true })
    render(<StaffListPage />)
    const config = JSON.parse(screen.getByTestId('config').textContent || '{}')
    expect(config.formFields).toHaveLength(5)
  })

  // check all expected form field keys are there
  it('includes all required form field keys', () => {
    ;(useAdminAccess as jest.Mock).mockReturnValue({ isLoading: false, isAdmin: true })
    render(<StaffListPage />)
    const config = JSON.parse(screen.getByTestId('config').textContent || '{}')
    const keys = config.formFields.map((f: any) => f.key)
    expect(keys).toEqual(
      expect.arrayContaining(['staff_id', 'name', 'email', 'mobile_no', 'department_id'])
    )
  })

  // department should be a dropdown, not a plain text box
  it('sets department_id as a dropdown select field', () => {
    ;(useAdminAccess as jest.Mock).mockReturnValue({ isLoading: false, isAdmin: true })
    render(<StaffListPage />)
    const config = JSON.parse(screen.getByTestId('config').textContent || '{}')
    const deptField = config.formFields.find((f: any) => f.key === 'department_id')
    expect(deptField.type).toBe('select')
  })

  // there should be 2 search boxes: one for staff ID, one for name
  it('includes 2 search fields covering staff_id and name', () => {
    ;(useAdminAccess as jest.Mock).mockReturnValue({ isLoading: false, isAdmin: true })
    render(<StaffListPage />)
    const config = JSON.parse(screen.getByTestId('config').textContent || '{}')
    expect(config.searchFields).toHaveLength(2)
    const searchKeys = config.searchFields.map((f: any) => f.key)
    expect(searchKeys).toEqual(expect.arrayContaining(['staff_id', 'name']))
  })

  // newest staff should appear at the top by default
  it('sorts by created_dt by default', () => {
    ;(useAdminAccess as jest.Mock).mockReturnValue({ isLoading: false, isAdmin: true })
    render(<StaffListPage />)
    const config = JSON.parse(screen.getByTestId('config').textContent || '{}')
    expect(config.defaultSortBy).toBe('created_dt')
  })
})
