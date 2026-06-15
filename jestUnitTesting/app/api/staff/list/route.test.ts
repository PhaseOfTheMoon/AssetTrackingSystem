/**
 * @jest-environment node
 */

/**
 * @file route.test.ts
 * @description Tests for GET /api/staff/list
 *
 * Business context:
 *   Returns all approved staff members for use in admin-facing UIs such as
 *   asset assignment dropdowns and staff management tables.  This endpoint
 *   intentionally returns only approved staff — pending or rejected staff
 *   are not operational and must not appear in operational UI lists.
 *
 *   This is distinct from /api/staff/approved (which is also admin-only and
 *   returns approved staff) — /list may have different pagination or field
 *   selection requirements. Both are tested independently.
 *
 * Business rules tested:
 *   1. Only admins can access the staff list.
 *   2. Returns only approved staff — status='approved' filter is required.
 *   3. Results ordered by created_dt descending.
 *   4. Returns an empty array (not null) when no approved staff exist.
 *   5. Returns success=true with staff array on success.
 *   6. DB errors return 500 with no internal detail.
 */

import { GET } from '@/app/api/staff/list/route'

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
    department_id: 'ENG',
    status: 'approved',
    role: 'staff',
    created_dt: '2026-01-05T09:00:00Z',
  },
  {
    staff_id: 'STAFF-007',
    name: 'Grace Approved',
    email: 'grace@swinburne.edu.au',
    department_id: 'ICT',
    status: 'approved',
    role: 'staff',
    created_dt: '2026-01-03T08:00:00Z',
  },
]

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('GET /api/staff/list', () => {
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

  it('returns 403 when a non-admin staff member requests the staff list', async () => {
    mockValidateSession.mockResolvedValueOnce({
      authorized: false,
      response: new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 }),
    })

    const res = await GET()
    expect(res.status).toBe(403)
  })

  // --- Business logic: status filter ---------------------------------------

  it('queries only staff with status="approved" — pending and rejected staff must be excluded', async () => {
    // Business rule: only operational (approved) staff should appear in assignment dropdowns
    mockValidateSession.mockResolvedValueOnce({ authorized: true, session: {} })
    mockOrder.mockResolvedValueOnce({ data: approvedStaffList, error: null })

    await GET()

    expect(mockFrom).toHaveBeenCalledWith('Staff')
    expect(mockEq).toHaveBeenCalledWith('status', 'approved')
  })

  it('returns success=true with the approved staff array', async () => {
    mockValidateSession.mockResolvedValueOnce({ authorized: true, session: {} })
    mockOrder.mockResolvedValueOnce({ data: approvedStaffList, error: null })

    const res = await GET()
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.staff).toHaveLength(2)
    expect(json.staff[0].staff_id).toBe('STAFF-004')
  })

  it('orders results by created_dt descending so the newest staff appear first', async () => {
    mockValidateSession.mockResolvedValueOnce({ authorized: true, session: {} })
    mockOrder.mockResolvedValueOnce({ data: approvedStaffList, error: null })

    await GET()

    expect(mockOrder).toHaveBeenCalledWith('created_dt', { ascending: false })
  })

  // --- Edge cases ----------------------------------------------------------

  it('returns an empty array (not null) when no approved staff members exist yet', async () => {
    // Defensive: early in a deployment, no staff may be approved yet
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

  it('returns 500 without leaking internal DB error messages', async () => {
    mockValidateSession.mockResolvedValueOnce({ authorized: true, session: {} })
    mockOrder.mockResolvedValueOnce({
      data: null,
      error: { message: 'SSL SYSCALL error: EOF detected (internal)' },
    })

    const res = await GET()
    const json = await res.json()

    expect(res.status).toBe(500)
    expect(json.error).toMatch(/failed to fetch staff list/i)
    expect(JSON.stringify(json)).not.toContain('SSL SYSCALL')
    expect(JSON.stringify(json)).not.toContain('EOF detected')
  })
})