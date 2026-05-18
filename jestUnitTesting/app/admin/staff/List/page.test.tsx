import { render, screen } from '@testing-library/react'
import StaffListPage from '@/app/(app)/admin/staff/list/page'
import { useAdminAccess } from '@/hooks/useAdminAccess'

// mock admin hook so we control access state per test
jest.mock('@/hooks/useAdminAccess', () => ({
  useAdminAccess: jest.fn(),
}))

// stops the router from throwing in test environment
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}))

// swap DynamicPage for a simple stub that serialises config to text
// makes it easy to assert what the page passes down
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

  it('renders nothing while admin access is loading', () => {
    ;(useAdminAccess as jest.Mock).mockReturnValue({ isLoading: true, isAdmin: false })
    const { container } = render(<StaffListPage />)
    expect(container.firstChild).toBeNull()
  })

  it('renders nothing when the user is not an admin', () => {
    ;(useAdminAccess as jest.Mock).mockReturnValue({ isLoading: false, isAdmin: false })
    const { container } = render(<StaffListPage />)
    expect(container.firstChild).toBeNull()
  })

  describe('when the user is an admin', () => {
    let config: any

    // render once and grab the config before each test — avoids repeating setup
    beforeEach(() => {
      ;(useAdminAccess as jest.Mock).mockReturnValue({ isLoading: false, isAdmin: true })
      render(<StaffListPage />)
      config = JSON.parse(screen.getByTestId('config').textContent || '{}')
    })

    it('renders the staff list page with the correct title', () => {
      expect(screen.getByTestId('dynamic-page')).toBeInTheDocument()
      expect(screen.getByText('Staff')).toBeInTheDocument()
    })

    it('points to the correct entity, API endpoint, and primary key', () => {
      expect(config.entityName).toBe('staff')
      expect(config.apiEndpoint).toBe('/api/staff')
      expect(config.primaryKey).toBe('staff_id')
    })

    it('sets correct add and edit page URLs and shows the add button', () => {
      expect(config.addUrl).toBe('/admin/staff/addStaff')
      expect(config.editUrl).toBe('/admin/staff/editStaff')
      expect(config.showAddButton).toBe(true)
    })

    it('table has 6 columns covering all required fields', () => {
      expect(config.columns).toHaveLength(6)
      const keys = config.columns.map((c: any) => c.key)
      expect(keys).toEqual(
        expect.arrayContaining(['staff_id', 'name', 'email', 'mobile_no', 'department', 'created_dt'])
      )
    })

    it('form has 5 fields covering all staff attributes', () => {
      expect(config.formFields).toHaveLength(5)
      const keys = config.formFields.map((f: any) => f.key)
      expect(keys).toEqual(
        expect.arrayContaining(['staff_id', 'name', 'email', 'mobile_no', 'department_id'])
      )
    })

    // department needs a dropdown not a plain text box
    it('department_id is rendered as a select dropdown', () => {
      const deptField = config.formFields.find((f: any) => f.key === 'department_id')
      expect(deptField.type).toBe('select')
    })

    it('provides 2 search fields for staff_id and name, sorted newest first', () => {
      expect(config.searchFields).toHaveLength(2)
      const searchKeys = config.searchFields.map((f: any) => f.key)
      expect(searchKeys).toEqual(expect.arrayContaining(['staff_id', 'name']))
      expect(config.defaultSortBy).toBe('created_dt')
    })
  })
})
