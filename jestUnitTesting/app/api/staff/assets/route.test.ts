/**
 * @jest-environment node
 */

/**
 * @file route.test.ts
 * @description Tests for POST /api/staff/assets
 *
 * Business context:
 *   Returns all physical assets currently assigned to a specific staff member.
 *   Used in staff profile views and assignment management UIs.
 *   The route JOINs StaffAsset → Asset so the caller receives full asset
 *   details (name, model, condition, category) in a single request — not just
 *   foreign key IDs.
 *
 * Business rules tested:
 *   1. Any authenticated user can call this endpoint — not admin-only.
 *      Staff need to view their own assigned assets on the user dashboard.
 *   2. staffId is required in the request body — missing it returns 400.
 *   3. Returns the full asset details via the JOIN — not just asset_id.
 *   4. Results are ordered by created_dt descending (most recently assigned first).
 *   5. Returns an empty array (not null) when the staff member has no assets.
 *   6. DB errors return 500 with no internal detail in the response body.
 *
 * Security rules:
 *   - validateSession() with NO role argument — any authenticated user allowed.
 *   - Error messages must never expose DB internals.
 */

import { NextRequest } from 'next/server'
import { POST } from '@/app/api/staff/assets/route'

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
// Fixtures — meaningful domain data, not generic "test" strings
// ---------------------------------------------------------------------------
const staffId = 'STAFF-004'

const assignedAssets = [
  {
    id: 'SA-001',
    staff_id: staffId,
    asset_id: 'ICT-LAPTOP-001',
    created_dt: '2026-02-10T08:00:00Z',
    asset: {
      asset_id: 'ICT-LAPTOP-001',
      name: 'Lenovo ThinkPad T480',
      model: 'ThinkPad T480',
      description: 'Staff laptop for daily use',
      condition: 'In-use',
      category: 'Laptop',
    },
  },
  {
    id: 'SA-002',
    staff_id: staffId,
    asset_id: 'ICT-CHAIR-003',
    created_dt: '2026-01-15T09:00:00Z',
    asset: {
      asset_id: 'ICT-CHAIR-003',
      name: 'Ergonomic Office Chair',
      model: 'Herman Miller Aeron',
      description: null,
      condition: 'In-use',
      category: 'Furniture',
    },
  },
]

function makeRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/staff/assets', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('POST /api/staff/assets', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockEq.mockReturnValue({ order: mockOrder })
    mockSelect.mockReturnValue({ eq: mockEq })
    mockFrom.mockReturnValue({ select: mockSelect })
  })

  // --- Authentication: any authenticated user, not admin-only --------------

  it('returns 401 when the request has no valid session', async () => {
    mockValidateSession.mockResolvedValueOnce({
      authorized: false,
      response: new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 }),
    })

    const res = await POST(makeRequest({ staffId }))
    expect(res.status).toBe(401)
  })

  it('calls validateSession with NO role requirement — any authenticated user can view their assets', async () => {
    // Business rule: staff can see their own assigned assets, not just admins
    mockValidateSession.mockResolvedValueOnce({ authorized: true, session: {} })
    mockOrder.mockResolvedValueOnce({ data: assignedAssets, error: null })

    await POST(makeRequest({ staffId }))

    // Must be called with no argument (or undefined) — NOT 'admin'
    expect(mockValidateSession).toHaveBeenCalledWith()
  })

  // --- Input validation ----------------------------------------------------

  it('returns 400 when staffId is missing from the request body', async () => {
    mockValidateSession.mockResolvedValueOnce({ authorized: true, session: {} })

    const res = await POST(makeRequest({}))
    const json = await res.json()

    expect(res.status).toBe(400)
    expect(json.error).toMatch(/staff id is required/i)
  })

  it('returns 400 when staffId is an empty string', async () => {
    mockValidateSession.mockResolvedValueOnce({ authorized: true, session: {} })

    const res = await POST(makeRequest({ staffId: '' }))
    const json = await res.json()

    expect(res.status).toBe(400)
    expect(json.error).toMatch(/staff id is required/i)
  })

  // --- Successful query ----------------------------------------------------

  it('queries StaffAsset table filtered by the provided staffId', async () => {
    mockValidateSession.mockResolvedValueOnce({ authorized: true, session: {} })
    mockOrder.mockResolvedValueOnce({ data: assignedAssets, error: null })

    await POST(makeRequest({ staffId }))

    expect(mockFrom).toHaveBeenCalledWith('StaffAsset')
    expect(mockEq).toHaveBeenCalledWith('staff_id', staffId)
  })

  it('includes full asset details in the SELECT (JOIN) — not just the foreign key', async () => {
    // Business rule: callers need name, model, condition, category — not just asset_id
    mockValidateSession.mockResolvedValueOnce({ authorized: true, session: {} })
    mockOrder.mockResolvedValueOnce({ data: assignedAssets, error: null })

    await POST(makeRequest({ staffId }))

    // The select string must include the nested asset join
    expect(mockSelect).toHaveBeenCalledWith(
      expect.stringContaining('asset:asset_id')
    )
  })

  it('returns assigned assets ordered by created_dt descending (most recent assignment first)', async () => {
    mockValidateSession.mockResolvedValueOnce({ authorized: true, session: {} })
    mockOrder.mockResolvedValueOnce({ data: assignedAssets, error: null })

    await POST(makeRequest({ staffId }))

    expect(mockOrder).toHaveBeenCalledWith('created_dt', { ascending: false })
  })

  it('returns success=true with the asset list when assets are found', async () => {
    mockValidateSession.mockResolvedValueOnce({ authorized: true, session: {} })
    mockOrder.mockResolvedValueOnce({ data: assignedAssets, error: null })

    const res = await POST(makeRequest({ staffId }))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.assets).toHaveLength(2)
    // Verify full asset detail is present in the response
    expect(json.assets[0].asset.name).toBe('Lenovo ThinkPad T480')
    expect(json.assets[0].asset.condition).toBe('In-use')
  })

  // --- Edge cases ----------------------------------------------------------

  it('returns an empty array (not null) when the staff member has no assigned assets', async () => {
    // Business rule: callers must be able to safely call .length without null checking
    mockValidateSession.mockResolvedValueOnce({ authorized: true, session: {} })
    mockOrder.mockResolvedValueOnce({ data: null, error: null })

    const res = await POST(makeRequest({ staffId }))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.assets).toEqual([])
    expect(Array.isArray(json.assets)).toBe(true)
  })

  // --- Error handling ------------------------------------------------------

  it('returns 500 without exposing internal DB error messages', async () => {
    // Security (CLAUDE.md §10, §13): error.message must NEVER reach the client
    mockValidateSession.mockResolvedValueOnce({ authorized: true, session: {} })
    mockOrder.mockResolvedValueOnce({
      data: null,
      error: { message: 'FATAL: password authentication failed for user postgres' },
    })

    const res = await POST(makeRequest({ staffId }))
    const json = await res.json()

    expect(res.status).toBe(500)
    expect(json.error).toMatch(/failed to fetch assets/i)
    expect(JSON.stringify(json)).not.toContain('password authentication failed')
    expect(JSON.stringify(json)).not.toContain('postgres')
  })
})