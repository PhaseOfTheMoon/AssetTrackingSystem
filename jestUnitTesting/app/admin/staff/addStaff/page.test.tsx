import { render, screen } from '@testing-library/react'
import AddStaffPage from '@/app/(app)/admin/staff/addStaff/page'
import { useAdminAccess } from '@/hooks/useAdminAccess'

// mock admin hook so we control access state per test
jest.mock('@/hooks/useAdminAccess', () => ({
  useAdminAccess: jest.fn(),
}))

// stops the router from throwing in test environment
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}))

// swap DynamicAdd for a stub that serialises config to text
// makes it easy to assert what values the page passes down
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

  it('renders nothing while admin access is loading', () => {
    ;(useAdminAccess as jest.Mock).mockReturnValue({ isLoading: true, isAdmin: false })
    const { container } = render(<AddStaffPage />)
    expect(container.firstChild).toBeNull()
  })

  it('renders nothing when the user is not an admin', () => {
    ;(useAdminAccess as jest.Mock).mockReturnValue({ isLoading: false, isAdmin: false })
    const { container } = render(<AddStaffPage />)
    expect(container.firstChild).toBeNull()
  })

  describe('when the user is an admin', () => {
    let config: any

    // render once and grab the config before each test — avoids repeating setup
    beforeEach(() => {
      ;(useAdminAccess as jest.Mock).mockReturnValue({ isLoading: false, isAdmin: true })
      render(<AddStaffPage />)
      config = JSON.parse(screen.getByTestId('config').textContent || '{}')
    })

    it('renders the add form with the correct page title', () => {
      expect(screen.getByTestId('dynamic-add')).toBeInTheDocument()
      expect(screen.getByText('Add Staff')).toBeInTheDocument()
    })

    it('points to the correct entity, API endpoint, and primary key', () => {
      expect(config.entityName).toBe('staff')
      expect(config.apiEndpoint).toBe('/api/staff')
      expect(config.primaryKey).toBe('staff_id')
    })

    it('back URL returns the user to the staff list', () => {
      expect(config.backUrl).toBe('/admin/staff/list')
    })

    // all 5 fields must be present and marked required before form can submit
    it('form has 5 fields — all required — covering all staff attributes', () => {
      expect(config.formFields).toHaveLength(5)
      const keys = config.formFields.map((f: any) => f.key)
      expect(keys).toEqual(
        expect.arrayContaining(['staff_id', 'name', 'email', 'mobile_no', 'department_id'])
      )
      config.formFields.forEach((field: any) => {
        expect(field.required).toBe(true)
      })
    })

    // staff ID only accepts numbers, placeholder should hint that
    it('staff_id placeholder includes a digits-only hint', () => {
      const staffIdField = config.formFields.find((f: any) => f.key === 'staff_id')
      expect(staffIdField.placeholder).toContain('digits only')
    })

    // department needs a dropdown not a plain text box
    it('department_id is rendered as a select dropdown', () => {
      const deptField = config.formFields.find((f: any) => f.key === 'department_id')
      expect(deptField.type).toBe('select')
    })
  })
})
