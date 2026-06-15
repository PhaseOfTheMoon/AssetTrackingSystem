/**
 * @jest-environment node
 */

/**
 * @file route.test.ts
 * @description Tests for GET /api/staff/approvals
 *
 * Business context:
 *   The approvals endpoint powers the admin's Staff Management page which shows
 *   staff registrations grouped in three tabs: Pending, Approved, Rejected.
 *   Each tab badge must show accurate counts for ALL three statuses simultaneously
 *   so the admin always knows the full picture without switching tabs.
 *
 * Business rules tested:
 *   1. Only admins can access this endpoint.
 *   2. Pagination: page and limit query params control result windows.
 *      limit is capped at 100 to prevent large payload abuse.
 *   3. Status filter: defaults to 'pending' when no status param is provided.
 *   4. Search: filters by staff_id or name via case-insensitive ILIKE.
 *      Only the two allowed search fields are accepted — others are ignored.
 *   5. Sort: sortBy defaults to 'created_dt'; only whitelisted fields accepted.
 *   6. tabCounts: always returned with counts for all three statuses so the UI
 *      can update all tab badges in a single request.
 *   7. DB errors return 500 with no internal detail in the response body.
 */

import { NextRequest } from 'next/server'
import { GET } from '@/app/api/staff/approvals/route'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
const mockValidateSession = jest.fn()
jest.mock('@/lib/apiAuth', () => ({
  validateSession: (...args: unknown[]) => mockValidateSession(...args),
}))

// Define raw terminal Jest mock functions
const mockRange = jest.fn()
const mockEq = jest.fn()

// Define a dynamic proxy factory that intercepts property lookups.
// This guarantees that no matter what order fields like .order() or .ilike() are called,
// it ALWAYS returns a chainable, thenable object that resolves correctly.
const createMockQuery = () => {
  const queryObj: any = {
    select: jest.fn().mockImplementation(() => queryObj),
    eq: mockEq,
    // Change these two lines to call and track through your global spies:
    ilike: mockIlike.mockImplementation(() => queryObj),
    order: mockOrder.mockImplementation(() => queryObj),
    range: mockRange,
    then: (onFulfilled: any) => {
      if (mockRange.mock.calls.length > 0 && queryObj._isMainQuery) {
        return mockRange().then(onFulfilled)
      }
      return Promise.resolve({ data: [], error: null, count: 0 }).then(onFulfilled)
    },
    _isMainQuery: false
  }
  return queryObj
}

// Global reference hooks for verification assertions
let mainQueryChain: any
let countQueryChains: any[] = []

jest.mock('@/lib/supabase/server', () => ({
  supabaseAdmin: {
    from: jest.fn().mockImplementation(() => {
      const chain = createMockQuery()
      // Detect if this is the main query vs the tab counts based on registration order
      if (!mainQueryChain) {
        chain._isMainQuery = true
        mainQueryChain = chain
      } else {
        countQueryChains.push(chain)
      }
      return chain
    })
  }
}))

// Create clean, direct reference spies for your expect assertions
const mockOrder = jest.fn()
const mockIlike = jest.fn()

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
const pendingStaff = [
  { staff_id: 'S003', name: 'Carol Pending', email: 'carol@swin.edu.au', status: 'pending', created_dt: '2026-01-10T08:00:00Z' },
  { staff_id: 'S004', name: 'Dan Pending', email: 'dan@swin.edu.au', status: 'pending', created_dt: '2026-01-11T09:00:00Z' },
]

function makeGetRequest(params: Record<string, string> = {}): NextRequest {
  const url = new URL('http://localhost/api/staff/approvals')
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
  return new NextRequest(url.toString(), { method: 'GET' })
}

function setupApprovalsMock({
  data = pendingStaff,
  count = 2,
  pendingCount = 2,
  approvedCount = 5,
  rejectedCount = 1,
  error = null,
}: {
  data?: unknown[]
  count?: number
  pendingCount?: number
  approvedCount?: number
  rejectedCount?: number
  error?: unknown
} = {}) {
  // Main paginated list resolution hook
  mockRange.mockResolvedValue({ data, error, count })

  // Sequential Promise.all .eq() sub-query trackers
  mockEq
    .mockImplementationOnce(() => mainQueryChain) // Main query filters down on its initial .eq('status') call
    .mockResolvedValueOnce({ count: pendingCount, error: null })
    .mockResolvedValueOnce({ count: approvedCount, error: null })
    .mockResolvedValueOnce({ count: rejectedCount, error: null })
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('GET /api/staff/approvals', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mainQueryChain = null
    countQueryChains = []
    
    mockValidateSession.mockResolvedValue({ authorized: true, session: {} })
    
    // Bind your dynamic spy captures straight into our factory properties
    // setupApprovalsMock() 
  })

  // --- Authentication & authorisation --------------------------------------

  it('returns 401 when the request has no session', async () => {
    mockValidateSession.mockResolvedValueOnce({
      authorized: false,
      response: new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 }),
    })

    const res = await GET(makeGetRequest())
    expect(res.status).toBe(401)
    expect(mockValidateSession).toHaveBeenCalledWith('admin')
  })

  it('returns 403 when a non-admin staff member requests the approvals list', async () => {
    mockValidateSession.mockResolvedValueOnce({
      authorized: false,
      response: new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 }),
    })

    const res = await GET(makeGetRequest())
    expect(res.status).toBe(403)
  })

  // --- Default behaviour ---------------------------------------------------

  it('defaults to status=pending and page=1 when no query params are supplied', async () => {
    setupApprovalsMock()

    const res = await GET(makeGetRequest())
    const json = await res.json()

    expect(res.status).toBe(200)
    // Default status is 'pending'
    expect(mockEq).toHaveBeenCalledWith('status', 'pending')
    expect(json.data).toHaveLength(2)
  })

  // --- Pagination ----------------------------------------------------------

  it('returns the correct page slice based on page and limit params', async () => {
    setupApprovalsMock({ data: [pendingStaff[0]], count: 10 })

    const res = await GET(makeGetRequest({ page: '2', limit: '1', status: 'pending' }))
    const json = await res.json()

    expect(res.status).toBe(200)
    // range(1,1) = page 2 with limit 1
    expect(mockRange).toHaveBeenCalledWith(1, 1)
    expect(json.totalItems).toBe(10)
    expect(json.totalPages).toBe(10)
  })

  it('clamps limit to a maximum of 100 to prevent oversized payloads', async () => {
    setupApprovalsMock({ data: [], count: 0 })

    await GET(makeGetRequest({ page: '1', limit: '999' }))

    // limit should be capped at 100: range(0, 99)
    expect(mockRange).toHaveBeenCalledWith(0, 99)
  })

  it('treats page=0 or negative page as page=1 to prevent invalid offsets', async () => {
    setupApprovalsMock()

    await GET(makeGetRequest({ page: '0', status: 'pending' }))

    // Math.max(parseInt('0'), 1) = 1 → range(0, limit-1)
    expect(mockRange).toHaveBeenCalledWith(0, expect.any(Number))
  })

  // --- Status filter -------------------------------------------------------

  it('filters by approved status when status=approved is requested', async () => {
    setupApprovalsMock({ data: [], count: 0 })

    await GET(makeGetRequest({ status: 'approved' }))

    expect(mockEq).toHaveBeenCalledWith('status', 'approved')
  })

  it('filters by rejected status when status=rejected is requested', async () => {
    setupApprovalsMock({ data: [], count: 0 })

    await GET(makeGetRequest({ status: 'rejected' }))

    expect(mockEq).toHaveBeenCalledWith('status', 'rejected')
  })

  // --- Search --------------------------------------------------------------

  it('applies case-insensitive ILIKE search on staff_id when searchField=staff_id', async () => {
    setupApprovalsMock({ data: [pendingStaff[0]], count: 1 })

    await GET(makeGetRequest({ search: 'carol', searchField: 'staff_id', status: 'pending' }))

    expect(mockIlike).toHaveBeenCalledWith('staff_id', '%carol%')
  })

  it('applies ILIKE search on name when searchField=name', async () => {
    setupApprovalsMock({ data: [pendingStaff[0]], count: 1 })

    await GET(makeGetRequest({ search: 'carol', searchField: 'name', status: 'pending' }))

    expect(mockIlike).toHaveBeenCalledWith('name', '%carol%')
  })

  it('falls back to staff_id search field when an unrecognised searchField is provided', async () => {
    // Security: only whitelisted fields allowed to prevent SQL injection via field name
    setupApprovalsMock()

    await GET(makeGetRequest({ search: 'test', searchField: 'microsoft_user_id' }))

    expect(mockIlike).toHaveBeenCalledWith('staff_id', '%test%')
  })

  // --- Tab counts ----------------------------------------------------------
  it('always returns tabCounts for all three statuses so the UI updates every badge in one request', async () => {
    // Explicitly seed the exact numbers this test checks for!
    setupApprovalsMock({ pendingCount: 3, approvedCount: 12, rejectedCount: 2 })

    const res = await GET(makeGetRequest({ status: 'pending' }))
    const json = await res.json()

    expect(json.tabCounts).toEqual({
      pending: 3,
      approved: 12,
      rejected: 2,
    })
  })

  // --- Sorting -------------------------------------------------------------

  it('defaults sort to created_dt descending when no sortBy is specified', async () => {
    setupApprovalsMock()

    await GET(makeGetRequest({ status: 'pending' }))

    expect(mockOrder).toHaveBeenCalledWith('created_dt', { ascending: false })
  })

  it('falls back to created_dt sort when an unrecognised sortBy field is requested', async () => {
    // Security: only whitelisted sort fields to prevent SQL injection via ORDER BY
    setupApprovalsMock()

    await GET(makeGetRequest({ sortBy: 'microsoft_user_id' }))

    expect(mockOrder).toHaveBeenCalledWith('created_dt', { ascending: false })
  })

  it('sorts ascending when sortOrder=asc is specified', async () => {
    setupApprovalsMock()

    await GET(makeGetRequest({ sortBy: 'name', sortOrder: 'asc' }))

    expect(mockOrder).toHaveBeenCalledWith('name', { ascending: true })
  })

  // --- Error handling ------------------------------------------------------

  it('returns 500 without leaking DB internals when the main query fails', async () => {
    // The paginated query throws
    mockRange.mockResolvedValueOnce({ data: null, error: { message: 'db connection timeout' }, count: null })

    const res = await GET(makeGetRequest())
    const json = await res.json()

    expect(res.status).toBe(500)
    expect(json.error).toMatch(/failed to fetch staff approvals/i)
    expect(JSON.stringify(json)).not.toContain('db connection timeout')
  })
})