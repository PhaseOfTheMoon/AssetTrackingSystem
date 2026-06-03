// Commented by Irene
import { render, screen } from '@testing-library/react'
import StaffListPage from '@/app/(app)/admin/staff/list/page'
import { useAdminAccess } from '@/hooks/useAdminAccess'

jest.mock('@/hooks/useAdminAccess', () => ({
  useAdminAccess: jest.fn()
}))

jest.mock('next/navigation', () => ({
  useRouter: jest.fn()
}))

// updated mock: renders column cells so render callbacks are exercised in tests
jest.mock('@/components/dynamicPage', () => {
  return function MockDynamicPage({ config }: any) {
    const sampleRow = { staff_id: 'S001', department: { name: 'IT Department' } }
    const nullDeptRow = { staff_id: 'S002', department: null }
    return (
      <div data-testid="dynamic-page">
        <h1>{config.pageTitle}</h1>
        <div data-testid="config">{JSON.stringify(config)}</div>

        {/* render column cells with sample data so render callbacks are exercised */}
        {config.columns?.filter((col: any) => col.render).map((col: any) => (
          <div key={col.key} data-testid={`cell-${col.key}`}>
            {col.render('S001', sampleRow)}
          </div>
        ))}

        {/* render department column with null dept to cover the N/A branch */}
        <div data-testid="cell-department-null">
          {config.columns?.find((col: any) => col.key === 'department')
            ?.render(null, nullDeptRow)}
        </div>

        {/* render created_dt with a real date string */}
        <div data-testid="cell-created_dt-date">
          {config.columns?.find((col: any) => col.key === 'created_dt')
            ?.render('2024-03-15T08:00:00.000Z', sampleRow)}
        </div>
      </div>
    )
  }
})

const adminAccess = { isLoading: false, isAdmin: true }

describe('StaffListPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  // Access control

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

  it('renders DynamicPage when the user is an admin', () => {
    ;(useAdminAccess as jest.Mock).mockReturnValue(adminAccess)
    render(<StaffListPage />)
    expect(screen.getByTestId('dynamic-page')).toBeInTheDocument()
  })

  // Config

  it('shows the correct page title', () => {
    ;(useAdminAccess as jest.Mock).mockReturnValue(adminAccess)
    render(<StaffListPage />)
    expect(screen.getByText('Staff')).toBeInTheDocument()
  })

  it('passes the correct entity name, API endpoint, and primary key', () => {
    ;(useAdminAccess as jest.Mock).mockReturnValue(adminAccess)
    render(<StaffListPage />)
    const config = JSON.parse(screen.getByTestId('config').textContent || '{}')
    expect(config.entityName).toBe('staff')
    expect(config.apiEndpoint).toBe('/api/staff')
    expect(config.primaryKey).toBe('staff_id')
  })

  it('sets the add URL to the add staff page', () => {
    ;(useAdminAccess as jest.Mock).mockReturnValue(adminAccess)
    render(<StaffListPage />)
    const config = JSON.parse(screen.getByTestId('config').textContent || '{}')
    expect(config.addUrl).toBe('/admin/staff/addStaff')
  })

  it('sets the edit URL to the edit staff page', () => {
    ;(useAdminAccess as jest.Mock).mockReturnValue(adminAccess)
    render(<StaffListPage />)
    const config = JSON.parse(screen.getByTestId('config').textContent || '{}')
    expect(config.editUrl).toBe('/admin/staff/editStaff')
  })

  it('enables the add button', () => {
    ;(useAdminAccess as jest.Mock).mockReturnValue(adminAccess)
    render(<StaffListPage />)
    const config = JSON.parse(screen.getByTestId('config').textContent || '{}')
    expect(config.showAddButton).toBe(true)
  })

  it('includes exactly 6 table columns', () => {
    ;(useAdminAccess as jest.Mock).mockReturnValue(adminAccess)
    render(<StaffListPage />)
    const config = JSON.parse(screen.getByTestId('config').textContent || '{}')
    expect(config.columns).toHaveLength(6)
  })

  it('includes all required column keys', () => {
    ;(useAdminAccess as jest.Mock).mockReturnValue(adminAccess)
    render(<StaffListPage />)
    const config = JSON.parse(screen.getByTestId('config').textContent || '{}')
    const keys = config.columns.map((c: any) => c.key)
    expect(keys).toEqual(
      expect.arrayContaining(['staff_id', 'name', 'email', 'mobile_no', 'department', 'created_dt'])
    )
  })

  it('includes exactly 5 form fields', () => {
    ;(useAdminAccess as jest.Mock).mockReturnValue(adminAccess)
    render(<StaffListPage />)
    const config = JSON.parse(screen.getByTestId('config').textContent || '{}')
    expect(config.formFields).toHaveLength(5)
  })

  it('sets department_id as a dropdown select field', () => {
    ;(useAdminAccess as jest.Mock).mockReturnValue(adminAccess)
    render(<StaffListPage />)
    const config = JSON.parse(screen.getByTestId('config').textContent || '{}')
    const deptField = config.formFields.find((f: any) => f.key === 'department_id')
    expect(deptField.type).toBe('select')
  })

  it('sorts by created_dt by default', () => {
    ;(useAdminAccess as jest.Mock).mockReturnValue(adminAccess)
    render(<StaffListPage />)
    const config = JSON.parse(screen.getByTestId('config').textContent || '{}')
    expect(config.defaultSortBy).toBe('created_dt')
  })

  // Column render functions

  // staff_id column renders the value inside a span
  it('renders the staff_id value as text', () => {
    ;(useAdminAccess as jest.Mock).mockReturnValue(adminAccess)
    render(<StaffListPage />)
    expect(screen.getByTestId('cell-staff_id').textContent).toBe('S001')
  })

  // department column shows the department name when it exists
  it('renders the department name when department object is present', () => {
    ;(useAdminAccess as jest.Mock).mockReturnValue(adminAccess)
    render(<StaffListPage />)
    expect(screen.getByTestId('cell-department').textContent).toBe('IT Department')
  })

  // department column shows N/A when department is null
  it('renders N/A when department is null', () => {
    ;(useAdminAccess as jest.Mock).mockReturnValue(adminAccess)
    render(<StaffListPage />)
    expect(screen.getByTestId('cell-department-null').textContent).toBe('N/A')
  })

  // created_dt column renders a formatted date string
  it('renders a formatted date in the created_dt column', () => {
    ;(useAdminAccess as jest.Mock).mockReturnValue(adminAccess)
    render(<StaffListPage />)
    const cell = screen.getByTestId('cell-created_dt-date')
    expect(cell.textContent).toMatch(/\d{2}\/\d{2}\/\d{4}/)
  })
})
