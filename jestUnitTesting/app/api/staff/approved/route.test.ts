/**
 * @jest-environment node
 */

/**
 * @file route.test.ts
 * @description Tests for GET /api/staff/approved
 *
 * Business context:
 *   Returns all staff members whose registration has been approved by an admin.
 *   Used by admin-facing UIs to populate dropdowns, assignment forms, and reports.
 *   Rejected and pending staff must NEVER appear in this list.
 *
 * Business rules tested:
 *   1. Only admins can retrieve the approved staff list.
 *   2. Returns only staff with status='approved' — pending/rejected are excluded.
 *   3. Results are ordered by created_dt descending (newest first).
 *   4. Returns an empty array (not null/undefined) when no staff are approved.
 *   5. DB errors return 500 with no internal message in the response body.
 */

import { GET } from '@/app/api/staff/approved/route'

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
const approvedStaffList = [
  {
    staff_id: 'STAFF-004',
    name: 'David Approved',
    email: 'david@swinburne.edu.au',
    status: 'approved',
    department_id: 'ENG',
    created_dt: '2026-01-05T09:00:00Z',
  },
  {
    staff_id: 'STAFF-007',
    name: 'Grace Approved',
    email: 'grace@swinburne.edu.au',
    status: 'approved',
    department_id: 'ICT',
    created_dt: '2026-01-03T08:00:00Z',
  },
]

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('GET /api/staff/approved', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockEq.mockReturnValue({ order: mockOrder })
    mockSelect.mockReturnValue({ eq: mockEq })
    mockFrom.mockReturnValue({ select: mockSelect })
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

  it('returns 403 when a non-admin staff member requests the approved list', async () => {
    mockValidateSession.mockResolvedValueOnce({
      authorized: false,
      response: new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 }),
    })

    const res = await GET()
    expect(res.status).toBe(403)
  })

  // --- Business logic: status filter ---------------------------------------

  it('queries only staff with status="approved" — pending and rejected must be excluded', async () => {
    mockValidateSession.mockResolvedValueOnce({ authorized: true, session: {} })
    mockOrder.mockResolvedValueOnce({ data: approvedStaffList, error: null })

    await GET()

    // Critical: must filter by 'approved' — not 'pending' or 'rejected'
    expect(mockEq).toHaveBeenCalledWith('status', 'approved')
  })

  it('returns the list of approved staff with success=true', async () => {
    mockValidateSession.mockResolvedValueOnce({ authorized: true, session: {} })
    mockOrder.mockResolvedValueOnce({ data: approvedStaffList, error: null })

    const res = await GET()
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.staff).toHaveLength(2)
    expect(json.staff[0].staff_id).toBe('STAFF-004')
  })

  it('orders results by created_dt descending so the newest approvals appear first', async () => {
    mockValidateSession.mockResolvedValueOnce({ authorized: true, session: {} })
    mockOrder.mockResolvedValueOnce({ data: approvedStaffList, error: null })

    await GET()

    expect(mockOrder).toHaveBeenCalledWith('created_dt', { ascending: false })
  })

  // --- Edge cases ----------------------------------------------------------

  it('returns an empty array (not null) when no staff have been approved yet', async () => {
    // Business rule: callers should not need to null-check the staff field
    mockValidateSession.mockResolvedValueOnce({ authorized: true, session: {} })
    mockOrder.mockResolvedValueOnce({ data: null, error: null })

    const res = await GET()
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.staff).toEqual([])
    expect(Array.isArray(json.staff)).toBe(true)
  })

  // --- Error handling ------------------------------------------------------

  it('returns 500 without leaking DB error details when the query fails', async () => {
    mockValidateSession.mockResolvedValueOnce({ authorized: true, session: {} })
    mockOrder.mockResolvedValueOnce({
      data: null,
      error: { message: 'relation "Staff" does not exist: internal' },
    })

    const res = await GET()
    const json = await res.json()

    expect(res.status).toBe(500)
    expect(json.error).toMatch(/failed to fetch approved staff/i)
    expect(JSON.stringify(json)).not.toContain('relation "Staff"')
    expect(JSON.stringify(json)).not.toContain('internal')
  })
})