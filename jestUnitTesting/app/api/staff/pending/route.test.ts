/**
 * @jest-environment node
 */

/**
 * @file route.test.ts
 * @description Tests for GET /api/staff/pending
 *
 * Business context:
 *   Returns all staff registrations awaiting admin review.
 *   This is the primary data source for the "Pending" tab on the admin's
 *   Staff Approvals page.  Admins review these records and either approve
 *   or reject them via /api/staff/approve and /api/staff/reject.
 *
 *   Time-sensitive: pending registrations accumulate until actioned.
 *   Results are ordered newest-first so recent submissions are reviewed first.
 *
 * Business rules tested:
 *   1. Only admins can view pending registrations.
 *   2. Returns only staff with status='pending' — approved/rejected excluded.
 *   3. Results ordered by created_dt descending (most recent submissions first).
 *   4. Returns an empty array (not null) when the pending queue is empty.
 *   5. Caching is disabled (force-dynamic, revalidate=0) so the admin always
 *      sees the current state — tested by confirming the export constants exist.
 *   6. DB errors return 500 with no internal message in the response body.
 */

import { GET } from '@/app/api/staff/pending/route'
// Verify the cache-disabling exports exist
import * as pendingRoute from '@/app/api/staff/pending/route'

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
const pendingRegistrations = [
  {
    staff_id: 'STAFF-008',
    name: 'Henry New',
    email: 'henry@swinburne.edu.au',
    mobile_no: '0401111222',
    department_id: 'MKTG',
    microsoft_user_id: null,
    status: 'pending',
    role: null,
    created_dt: '2026-06-10T14:00:00Z',
    updated_dt: '2026-06-10T14:00:00Z',
  },
  {
    staff_id: 'STAFF-003',
    name: 'Carol Pending',
    email: 'carol@swinburne.edu.au',
    mobile_no: '0412345678',
    department_id: 'ICT',
    microsoft_user_id: null,
    status: 'pending',
    role: null,
    created_dt: '2026-01-10T08:00:00Z',
    updated_dt: '2026-01-10T08:00:00Z',
  },
]

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('GET /api/staff/pending', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockEq.mockReturnValue({ order: mockOrder })
    mockSelect.mockReturnValue({ eq: mockEq })
    mockFrom.mockReturnValue({ select: mockSelect })
  })

  // --- Caching configuration -----------------------------------------------

  it('exports dynamic="force-dynamic" to prevent stale pending counts being shown to admins', () => {
    // Business rule: admins must always see live data — a cached "0 pending" could
    // mean a registration sits unreviewed for hours
    expect(pendingRoute.dynamic).toBe('force-dynamic')
  })

  it('exports revalidate=0 to ensure every request hits the database', () => {
    expect(pendingRoute.revalidate).toBe(0)
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

  it('returns 403 when a non-admin staff member tries to view the pending queue', async () => {
    mockValidateSession.mockResolvedValueOnce({
      authorized: false,
      response: new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 }),
    })

    const res = await GET()
    expect(res.status).toBe(403)
  })

  // --- Business logic: status filter ---------------------------------------

  it('queries only staff with status="pending" — approved and rejected staff excluded', async () => {
    mockValidateSession.mockResolvedValueOnce({ authorized: true, session: {} })
    mockOrder.mockResolvedValueOnce({ data: pendingRegistrations, error: null })

    await GET()

    expect(mockFrom).toHaveBeenCalledWith('Staff')
    expect(mockEq).toHaveBeenCalledWith('status', 'pending')
  })

  it('returns all pending staff records with success=true', async () => {
    mockValidateSession.mockResolvedValueOnce({ authorized: true, session: {} })
    mockOrder.mockResolvedValueOnce({ data: pendingRegistrations, error: null })

    const res = await GET()
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.staff).toHaveLength(2)
    expect(json.staff[0].status).toBe('pending')
    expect(json.staff[1].status).toBe('pending')
  })

  it('orders results by created_dt descending so newest submissions appear first for review', async () => {
    mockValidateSession.mockResolvedValueOnce({ authorized: true, session: {} })
    mockOrder.mockResolvedValueOnce({ data: pendingRegistrations, error: null })

    await GET()

    expect(mockOrder).toHaveBeenCalledWith('created_dt', { ascending: false })
  })

  // --- Edge cases ----------------------------------------------------------

  it('returns an empty array (not null) when the pending queue is empty', async () => {
    // Happy state: no pending registrations awaiting review
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

  it('returns 500 without leaking DB error details when the query fails', async () => {
    mockValidateSession.mockResolvedValueOnce({ authorized: true, session: {} })
    mockOrder.mockResolvedValueOnce({
      data: null,
      error: { message: 'relation "Staff" does not exist at character 8' },
    })

    const res = await GET()
    const json = await res.json()

    expect(res.status).toBe(500)
    expect(json.error).toMatch(/failed to fetch pending/i)
    expect(JSON.stringify(json)).not.toContain('relation "Staff"')
    expect(JSON.stringify(json)).not.toContain('character 8')
  })
})