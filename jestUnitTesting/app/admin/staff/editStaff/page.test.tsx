// Commented by Irene
import { render, screen } from '@testing-library/react'
import EditStaffPage from '@/app/(app)/admin/staff/editStaff/[id]/page'
import { useAdminAccess } from '@/hooks/useAdminAccess'

// fake out the admin hook so we control what it returns in each test
jest.mock('@/hooks/useAdminAccess', () => ({
  useAdminAccess: jest.fn(),
}))

// fake out the router and params so we don't get navigation errors
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  useParams: jest.fn(),
}))

// replace the real DynamicEdit with a simple version that dumps the config and recordId as text
// so we can easily check what was passed into it
jest.mock('@/components/dynamicEdit', () => {
  return function MockDynamicEdit({ config, recordId }: any) {
    return (
      <div data-testid="dynamic-edit">
        <h1>{config.pageTitle}</h1>
        <div data-testid="record-id">{recordId}</div>
        <div data-testid="config">{JSON.stringify(config)}</div>
      </div>
    )
  }
})

describe('EditStaffPage', () => {
  const mockUseParams = require('next/navigation').useParams

  beforeEach(() => {
    jest.clearAllMocks()
    // default URL param — pretend we're editing staff S001
    mockUseParams.mockReturnValue({ id: 'S001' })
  })

  // page should show nothing while still checking if user is admin
  it('renders nothing while admin access is loading', () => {
    ;(useAdminAccess as jest.Mock).mockReturnValue({ isLoading: true, isAdmin: false })
    const { container } = render(<EditStaffPage />)
    expect(container.firstChild).toBeNull()
  })

  // non-admin users shouldn't be able to edit staff
  it('renders nothing when the user is not an admin', () => {
    ;(useAdminAccess as jest.Mock).mockReturnValue({ isLoading: false, isAdmin: false })
    const { container } = render(<EditStaffPage />)
    expect(container.firstChild).toBeNull()
  })

  // admin users should see the edit form
  it('renders the DynamicEdit form when the user is an admin', () => {
    ;(useAdminAccess as jest.Mock).mockReturnValue({ isLoading: false, isAdmin: true })
    render(<EditStaffPage />)
    expect(screen.getByTestId('dynamic-edit')).toBeInTheDocument()
  })

  // check the page heading says "Edit Staff"
  it('shows the correct page title', () => {
    ;(useAdminAccess as jest.Mock).mockReturnValue({ isLoading: false, isAdmin: true })
    render(<EditStaffPage />)
    expect(screen.getByText('Edit Staff')).toBeInTheDocument()
  })

  // the staff ID from the URL should be passed down to the form
  it('passes the staff ID from the URL params to the form', () => {
    ;(useAdminAccess as jest.Mock).mockReturnValue({ isLoading: false, isAdmin: true })
    render(<EditStaffPage />)
    expect(screen.getByTestId('record-id')).toHaveTextContent('S001')
  })

  // Next.js can return params as an array — we should pick the first value
  it('uses the first item when URL params returns an array', () => {
    mockUseParams.mockReturnValue({ id: ['S002', 'S003'] })
    ;(useAdminAccess as jest.Mock).mockReturnValue({ isLoading: false, isAdmin: true })
    render(<EditStaffPage />)
    expect(screen.getByTestId('record-id')).toHaveTextContent('S002')
  })

  // make sure the config points to the right entity, API route, and ID field
  it('passes the correct entity name, API endpoint, and primary key', () => {
    ;(useAdminAccess as jest.Mock).mockReturnValue({ isLoading: false, isAdmin: true })
    render(<EditStaffPage />)
    const config = JSON.parse(screen.getByTestId('config').textContent || '{}')
    expect(config.entityName).toBe('staff')
    expect(config.apiEndpoint).toBe('/api/staff')
    expect(config.primaryKey).toBe('staff_id')
  })

  // cancel/back should bring user back to the staff list
  it('sets the back URL to the staff list page', () => {
    ;(useAdminAccess as jest.Mock).mockReturnValue({ isLoading: false, isAdmin: true })
    render(<EditStaffPage />)
    const config = JSON.parse(screen.getByTestId('config').textContent || '{}')
    expect(config.backUrl).toBe('/admin/staff/list')
  })

  // staff_id shouldn't be editable — it was set when the staff was created
  it('disables the staff_id field so it cannot be changed after creation', () => {
    ;(useAdminAccess as jest.Mock).mockReturnValue({ isLoading: false, isAdmin: true })
    render(<EditStaffPage />)
    const config = JSON.parse(screen.getByTestId('config').textContent || '{}')
    const staffIdField = config.formFields.find((f: any) => f.key === 'staff_id')
    expect(staffIdField.disabled).toBe(true)
  })

  // the edit form should have exactly 5 fields
  it('includes exactly 5 form fields', () => {
    ;(useAdminAccess as jest.Mock).mockReturnValue({ isLoading: false, isAdmin: true })
    render(<EditStaffPage />)
    const config = JSON.parse(screen.getByTestId('config').textContent || '{}')
    expect(config.formFields).toHaveLength(5)
  })

  // check all expected form field keys are there
  it('includes all required field keys', () => {
    ;(useAdminAccess as jest.Mock).mockReturnValue({ isLoading: false, isAdmin: true })
    render(<EditStaffPage />)
    const config = JSON.parse(screen.getByTestId('config').textContent || '{}')
    const keys = config.formFields.map((f: any) => f.key)
    expect(keys).toEqual(
      expect.arrayContaining(['staff_id', 'name', 'email', 'mobile_no', 'department_id'])
    )
  })

  // department should be a dropdown, not a plain text box
  it('sets department_id as a dropdown select field', () => {
    ;(useAdminAccess as jest.Mock).mockReturnValue({ isLoading: false, isAdmin: true })
    render(<EditStaffPage />)
    const config = JSON.parse(screen.getByTestId('config').textContent || '{}')
    const deptField = config.formFields.find((f: any) => f.key === 'department_id')
    expect(deptField.type).toBe('select')
  })
})
