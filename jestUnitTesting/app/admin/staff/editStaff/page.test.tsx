import { render, screen } from '@testing-library/react'
import EditStaffPage from '@/app/(app)/admin/staff/editStaff/[id]/page'
import { useAdminAccess } from '@/hooks/useAdminAccess'
import { useParams } from 'next/navigation'

// mock admin hook so we control access state per test
jest.mock('@/hooks/useAdminAccess', () => ({
  useAdminAccess: jest.fn(),
}))

// stops the router from throwing; also mocks useParams for the [id] route
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  useParams: jest.fn(),
}))

// swap DynamicEdit for a stub that serialises config and recordId to text
// makes it easy to assert what the page passes down
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
  const mockUseParams = useParams as jest.Mock

  // default to editing staff S001 before each test
  beforeEach(() => {
    jest.clearAllMocks()
    mockUseParams.mockReturnValue({ id: 'S001' })
  })

  it('renders nothing while admin access is loading', () => {
    ;(useAdminAccess as jest.Mock).mockReturnValue({ isLoading: true, isAdmin: false })
    const { container } = render(<EditStaffPage />)
    expect(container.firstChild).toBeNull()
  })

  it('renders nothing when the user is not an admin', () => {
    ;(useAdminAccess as jest.Mock).mockReturnValue({ isLoading: false, isAdmin: false })
    const { container } = render(<EditStaffPage />)
    expect(container.firstChild).toBeNull()
  })

  // Next.js sometimes returns params as an array — page should use the first value
  it('uses the first value when URL params returns an array', () => {
    mockUseParams.mockReturnValue({ id: ['S002', 'S003'] })
    ;(useAdminAccess as jest.Mock).mockReturnValue({ isLoading: false, isAdmin: true })
    render(<EditStaffPage />)
    expect(screen.getByTestId('record-id')).toHaveTextContent('S002')
  })

  describe('when the user is an admin editing staff S001', () => {
    let config: any

    // render once and grab config before each test — avoids repeating setup
    beforeEach(() => {
      ;(useAdminAccess as jest.Mock).mockReturnValue({ isLoading: false, isAdmin: true })
      render(<EditStaffPage />)
      config = JSON.parse(screen.getByTestId('config').textContent || '{}')
    })

    it('renders the edit form with the correct page title', () => {
      expect(screen.getByTestId('dynamic-edit')).toBeInTheDocument()
      expect(screen.getByText('Edit Staff')).toBeInTheDocument()
    })

    it('passes the staff ID from the URL to the form', () => {
      expect(screen.getByTestId('record-id')).toHaveTextContent('S001')
    })

    it('points to the correct entity, API endpoint, and primary key', () => {
      expect(config.entityName).toBe('staff')
      expect(config.apiEndpoint).toBe('/api/staff')
      expect(config.primaryKey).toBe('staff_id')
    })

    it('back URL returns the user to the staff list', () => {
      expect(config.backUrl).toBe('/admin/staff/list')
    })

    // staff_id should be locked — it was set at creation and must not change
    it('form has 5 fields with correct keys and staff_id locked as non-editable', () => {
      expect(config.formFields).toHaveLength(5)
      const keys = config.formFields.map((f: any) => f.key)
      expect(keys).toEqual(
        expect.arrayContaining(['staff_id', 'name', 'email', 'mobile_no', 'department_id'])
      )
      const staffIdField = config.formFields.find((f: any) => f.key === 'staff_id')
      expect(staffIdField.disabled).toBe(true)
    })

    // department needs a dropdown not a plain text box
    it('department_id is rendered as a select dropdown', () => {
      const deptField = config.formFields.find((f: any) => f.key === 'department_id')
      expect(deptField.type).toBe('select')
    })
  })
})
