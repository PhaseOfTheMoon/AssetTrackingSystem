/**
 * @jest-environment node
 */

/**
 * @file route.test.ts
 * @description Tests for GET /api/staff/rejected
 *
 * Business context:
 *   Returns all staff registrations that an admin has rejected.
 *   Used to populate the "Rejected" tab on the Staff Approvals page.
 *   Admins can review rejected records and re-approve them if circumstances change.
 *
 *   Caching is disabled (force-dynamic, revalidate=0) because the admin needs
 *   to see real-time state — a stale count could cause confusion if a rejection
 *   was just actioned.
 *
 * Business rules tested:
 *   1. Only admins can view the rejected staff list.
 *   2. Returns only staff with status='rejected' — pending/approved are excluded.
 *   3. Results ordered by created_dt descending (most recently rejected first).
 *   4. Returns an empty array (not null) when no rejections exist.
 *   5. Caching disabled via force-dynamic and revalidate=0 exports.
 *   6. DB errors return 500 with no internal message.
 */

import { GET } from '@/app/api/staff/rejected/route'
import * as rejectedRoute from '@/app/api/staff/rejected/route'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
const mockValidateSession = jest.fn()
jest.mock('@/lib/apiAuth', () => ({
  validateSession: (...args: unknown[]) => mockValidateSession(...args),
}))

const mockOrder = jest.fn()
const mockEq = jest.fn().mockReturnValue({ order: mockOrder })
const mockSelect = jest.fn().mockReturnValue({ eq: mockEq })
const mockFrom = jest.fn().mockReturnValue({ select: mockSelect })

jest.mock('@/lib/supabase/server', () => ({
  supabaseAdmin: { from: (...args: unknown[]) => mockFrom(...args) },
}))

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
const rejectedStaffList = [
  {
    staff_id: 'STAFF-005',
    name: 'Eve Rejected',
    email: 'eve@swinburne.edu.au',
    mobile_no: '0434567890',
    department_id: 'HR',
    microsoft_user_id: null,
    status: 'rejected',
    role: null,
    created_dt: '2026-01-08T11:00:00Z',
    updated_dt: '2026-01-09T12:00:00Z',
  },
  {
    staff_id: 'STAFF-006',
    name: 'Frank Rejected',
    email: 'frank@swinburne.edu.au',
    mobile_no: '0445678901',
    department_id: 'FIN',
    microsoft_user_id: null,
    status: 'rejected',
    role: null,
    created_dt: '2026-01-07T10:00:00Z',
    updated_dt: '2026-01-08T11:00:00Z',
  },
]

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('GET /api/staff/rejected', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockEq.mockReturnValue({ order: mockOrder })
    mockSelect.mockReturnValue({ eq: mockEq })
    mockFrom.mockReturnValue({ select: mockSelect })
  })

  // --- Caching configuration -----------------------------------------------

  it('exports dynamic="force-dynamic" so admins always see the current rejected list', () => {
    expect(rejectedRoute.dynamic).toBe('force-dynamic')
  })

  it('exports revalidate=0 to prevent Next.js from caching rejected staff results', () => {
    expect(rejectedRoute.revalidate).toBe(0)
  })

  // --- Authentication & authorisation --------------------------------------

  it('returns 401 when the request has no valid session', async () => {
    mockValidateSession.mockResolvedValueOnce({
      authorized: false,
      response: new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 }),
    })

    const res = await GET()
    expect(res.status).toBe(401)
    expect(mockValidateSession).toHaveBeenCalledWith('admin')
  })

  it('returns 403 when a non-admin staff member tries to view rejected registrations', async () => {
    mockValidateSession.mockResolvedValueOnce({
      authorized: false,
      response: new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 }),
    })

    const res = await GET()
    expect(res.status).toBe(403)
  })

  // --- Business logic: status filter ---------------------------------------

  it('queries only staff with status="rejected" — pending and approved staff are excluded', async () => {
    mockValidateSession.mockResolvedValueOnce({ authorized: true, session: {} })
    mockOrder.mockResolvedValueOnce({ data: rejectedStaffList, error: null })

    await GET()

    expect(mockFrom).toHaveBeenCalledWith('Staff')
    // Critical: must filter 'rejected', not 'pending' or 'approved'
    expect(mockEq).toHaveBeenCalledWith('status', 'rejected')
  })

  it('returns the rejected staff list with success=true', async () => {
    mockValidateSession.mockResolvedValueOnce({ authorized: true, session: {} })
    mockOrder.mockResolvedValueOnce({ data: rejectedStaffList, error: null })

    const res = await GET()
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.staff).toHaveLength(2)
    expect(json.staff[0].status).toBe('rejected')
  })

  it('orders results by created_dt descending so the most recently rejected staff appear first', async () => {
    mockValidateSession.mockResolvedValueOnce({ authorized: true, session: {} })
    mockOrder.mockResolvedValueOnce({ data: rejectedStaffList, error: null })

    await GET()

    expect(mockOrder).toHaveBeenCalledWith('created_dt', { ascending: false })
  })

  // --- Edge cases ----------------------------------------------------------

  it('returns an empty array (not null) when no staff have been rejected', async () => {
    mockValidateSession.mockResolvedValueOnce({ authorized: true, session: {} })
    mockOrder.mockResolvedValueOnce({ data: null, error: null })

    const res = await GET()
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.staff).toEqual([])
    expect(Array.isArray(json.staff)).toBe(true)
  })

  // --- Error handling ------------------------------------------------------

  it('returns 500 without leaking internal DB error messages to the client', async () => {
    mockValidateSession.mockResolvedValueOnce({ authorized: true, session: {} })
    mockOrder.mockResolvedValueOnce({
      data: null,
      error: { message: 'could not serialize access due to concurrent update' },
    })

    const res = await GET()
    const json = await res.json()

    expect(res.status).toBe(500)
    expect(json.error).toMatch(/failed to fetch rejected staff/i)
    expect(JSON.stringify(json)).not.toContain('serialize access')
    expect(JSON.stringify(json)).not.toContain('concurrent update')
  })
})