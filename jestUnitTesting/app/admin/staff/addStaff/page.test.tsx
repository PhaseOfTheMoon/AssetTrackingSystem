// Commented by Irene
import { render, screen } from '@testing-library/react'
import AddStaffPage from '@/app/(app)/admin/staff/addStaff/page'
import { useAdminAccess } from '@/hooks/useAdminAccess'

// fake out the admin hook so we control what it returns in each test
jest.mock('@/hooks/useAdminAccess', () => ({
  useAdminAccess: jest.fn(),
}))

// fake out the router so we don't get navigation errors
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}))

// replace the real DynamicAdd with a simple version that dumps the config as text
// so we can easily check what was passed into it
jest.mock('@/components/dynamicAdd', () => {
  return function MockDynamicAdd({ config }: any) {
    return (
      <div data-testid="dynamic-add">
        <h1>{config.pageTitle}</h1>
        <div data-testid="config">{JSON.stringify(config)}</div>
      </div>
    )
  }
})

describe('AddStaffPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  // page should show nothing while still checking if user is admin
  it('renders nothing while admin access is loading', () => {
    ;(useAdminAccess as jest.Mock).mockReturnValue({ isLoading: true, isAdmin: false })
    const { container } = render(<AddStaffPage />)
    expect(container.firstChild).toBeNull()
  })

  // non-admin users shouldn't be able to add staff
  it('renders nothing when the user is not an admin', () => {
    ;(useAdminAccess as jest.Mock).mockReturnValue({ isLoading: false, isAdmin: false })
    const { container } = render(<AddStaffPage />)
    expect(container.firstChild).toBeNull()
  })

  // admin users should see the add form
  it('renders the DynamicAdd form when the user is an admin', () => {
    ;(useAdminAccess as jest.Mock).mockReturnValue({ isLoading: false, isAdmin: true })
    render(<AddStaffPage />)
    expect(screen.getByTestId('dynamic-add')).toBeInTheDocument()
  })

  // check the page heading says "Add Staff"
  it('shows the correct page title', () => {
    ;(useAdminAccess as jest.Mock).mockReturnValue({ isLoading: false, isAdmin: true })
    render(<AddStaffPage />)
    expect(screen.getByText('Add Staff')).toBeInTheDocument()
  })

  // make sure the config points to the right entity, API route, and ID field
  it('passes the correct entity name, API endpoint, and primary key', () => {
    ;(useAdminAccess as jest.Mock).mockReturnValue({ isLoading: false, isAdmin: true })
    render(<AddStaffPage />)
    const config = JSON.parse(screen.getByTestId('config').textContent || '{}')
    expect(config.entityName).toBe('staff')
    expect(config.apiEndpoint).toBe('/api/staff')
    expect(config.primaryKey).toBe('staff_id')
  })

  // cancel/back should bring user back to the staff list
  it('sets the back URL to the staff list page', () => {
    ;(useAdminAccess as jest.Mock).mockReturnValue({ isLoading: false, isAdmin: true })
    render(<AddStaffPage />)
    const config = JSON.parse(screen.getByTestId('config').textContent || '{}')
    expect(config.backUrl).toBe('/admin/staff/list')
  })

  // the form should have exactly 5 fields
  it('includes exactly 5 form fields', () => {
    ;(useAdminAccess as jest.Mock).mockReturnValue({ isLoading: false, isAdmin: true })
    render(<AddStaffPage />)
    const config = JSON.parse(screen.getByTestId('config').textContent || '{}')
    expect(config.formFields).toHaveLength(5)
  })

  // check all expected form field keys are there
  it('includes all required field keys', () => {
    ;(useAdminAccess as jest.Mock).mockReturnValue({ isLoading: false, isAdmin: true })
    render(<AddStaffPage />)
    const config = JSON.parse(screen.getByTestId('config').textContent || '{}')
    const keys = config.formFields.map((f: any) => f.key)
    expect(keys).toEqual(
      expect.arrayContaining(['staff_id', 'name', 'email', 'mobile_no', 'department_id'])
    )
  })

  // every field must be filled in before submitting
  it('marks every field as required', () => {
    ;(useAdminAccess as jest.Mock).mockReturnValue({ isLoading: false, isAdmin: true })
    render(<AddStaffPage />)
    const config = JSON.parse(screen.getByTestId('config').textContent || '{}')
    config.formFields.forEach((field: any) => {
      expect(field.required).toBe(true)
    })
  })

  // the staff_id placeholder should remind the user to enter digits only
  it('includes a digits-only hint in the staff_id placeholder', () => {
    ;(useAdminAccess as jest.Mock).mockReturnValue({ isLoading: false, isAdmin: true })
    render(<AddStaffPage />)
    const config = JSON.parse(screen.getByTestId('config').textContent || '{}')
    const staffIdField = config.formFields.find((f: any) => f.key === 'staff_id')
    expect(staffIdField.placeholder).toContain('digits only')
  })

  // department should be a dropdown, not a plain text box
  it('sets department_id as a dropdown select field', () => {
    ;(useAdminAccess as jest.Mock).mockReturnValue({ isLoading: false, isAdmin: true })
    render(<AddStaffPage />)
    const config = JSON.parse(screen.getByTestId('config').textContent || '{}')
    const deptField = config.formFields.find((f: any) => f.key === 'department_id')
    expect(deptField.type).toBe('select')
  })
})
