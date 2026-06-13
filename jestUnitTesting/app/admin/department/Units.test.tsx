/**
 * Unit tests for the DepartmentPage
 *
 * This page is responsible for:
 *   - Restricting access to administrators only
 *   - Rendering the generic DynamicPage component
 *   - Supplying the correct Department configuration
 *   - Managing department-related UI behaviour
 *
 * What we cover:
 *   - Access control and authorization checks
 *   - Rendering behaviour for administrators
 *   - Configuration passed into DynamicPage
 *   - Search field configuration
 *   - Table column configuration
 *   - QR modal visibility behaviour
 */

import { render, screen } from '@testing-library/react'
import DepartmentPage from '@/app/(app)/admin/department/units/page';

const mockUseAdminAccess = jest.fn()
const mockDynamicPage = jest.fn()

/**
 * Mock admin authorization hook.
 * Allows each test to simulate different
 * permission scenarios.
 */
jest.mock('@/hooks/useAdminAccess', () => ({
  useAdminAccess: () => mockUseAdminAccess()
}))

/**
 * Mock DynamicPage.
 * Records props passed into the component
 * so configuration can be verified.
 */
jest.mock('@/components/dynamicPage', () => ({
  __esModule: true,
  default: (props: any) => {
    mockDynamicPage(props)

    return <div data-testid="dynamic-page">DynamicPage</div>
  }
}))

/**
 * Mock QR code modal component.
 * Real implementation is unnecessary for
 * configuration and rendering tests.
 */
jest.mock('@/components/ui/idCodeModal', () => ({
  __esModule: true,
  default: () => <div data-testid="id-code-modal">Modal</div>
}))

/**
 * Mock Supabase storage URL generation.
 * Used by the department QR code preview feature.
 */
jest.mock('@/lib/supabase/client', () => ({
  supabase: {
    storage: {
      from: () => ({
        getPublicUrl: () => ({
          data: {
            publicUrl: 'https://example.com/qr.png'
          }
        })
      })
    }
  }
}))

describe('DepartmentPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  /**
   * Access-control tests.
   * Verifies that only administrators
   * are allowed to view the page.
   */
  describe('Access Control', () => {
    it('renders nothing while loading permissions', () => {
      mockUseAdminAccess.mockReturnValue({
        isLoading: true,
        isAdmin: false
      })

      const { container } = render(<DepartmentPage />)

      expect(container.firstChild).toBeNull()
    })

    it('renders nothing for non-admin users', () => {
      mockUseAdminAccess.mockReturnValue({
        isLoading: false,
        isAdmin: false
      })

      const { container } = render(<DepartmentPage />)

      expect(container.firstChild).toBeNull()
    })

    it('renders DynamicPage for administrators', () => {
      mockUseAdminAccess.mockReturnValue({
        isLoading: false,
        isAdmin: true
      })

      render(<DepartmentPage />)

      expect(
        screen.getByTestId('dynamic-page')
      ).toBeInTheDocument()
    })
  })

  /**
   * Configuration tests.
   * Ensures the page passes the correct
   * department settings into DynamicPage.
   */
  describe('Configuration', () => {
    it('passes department configuration to DynamicPage', () => {
      mockUseAdminAccess.mockReturnValue({
        isLoading: false,
        isAdmin: true
      })

      render(<DepartmentPage />)

      const config = mockDynamicPage.mock.calls[0][0].config

      expect(config.entityName).toBe('department')
      expect(config.apiEndpoint).toBe('/api/department')
      expect(config.primaryKey).toBe('department_id')
      expect(config.pageTitle).toBe('Departments')
      expect(config.addUrl).toBe('/admin/department/addDepartment')
      expect(config.editUrl).toBe('/admin/department/editDepartment')
    })

    /**
     * Business rule:
     * Users must be able to search departments
     * by both department ID and department name.
     */
    it('contains expected search fields', () => {
      mockUseAdminAccess.mockReturnValue({
        isLoading: false,
        isAdmin: true
      })

      render(<DepartmentPage />)

      const config = mockDynamicPage.mock.calls[0][0].config

      expect(config.searchFields).toHaveLength(2)

      expect(config.searchFields[0].key)
        .toBe('department_id')

      expect(config.searchFields[1].key)
        .toBe('name')
    })

    /**
     * Business rule:
     * Department table must expose key
     * department information including
     * identifiers and QR tag references.
     */
    it('contains expected table columns', () => {
      mockUseAdminAccess.mockReturnValue({
        isLoading: false,
        isAdmin: true
      })

      render(<DepartmentPage />)

      const config = mockDynamicPage.mock.calls[0][0].config

      expect(config.columns.length)
        .toBeGreaterThan(0)

      expect(
        config.columns.some(
          (column: any) =>
            column.key === 'department_id'
        )
      ).toBe(true)

      expect(
        config.columns.some(
          (column: any) =>
            column.key === 'tag_path'
        )
      ).toBe(true)
    })
  })

  /**
   * Modal behaviour tests.
   * Ensures QR modal visibility follows
   * expected user interaction rules.
   */
  describe('Modal Behaviour', () => {
    /**
     * Business rule:
     * QR modal should remain hidden
     * until explicitly opened by the user.
     */
    it('does not display modal initially', () => {
      mockUseAdminAccess.mockReturnValue({
        isLoading: false,
        isAdmin: true
      })

      render(<DepartmentPage />)

      expect(
        screen.queryByTestId('id-code-modal')
      ).not.toBeInTheDocument()
    })
  })
})
