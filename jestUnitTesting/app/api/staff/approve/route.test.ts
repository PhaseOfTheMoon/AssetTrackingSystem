/**
 * @jest-environment node
 */

/**
 * @file route.test.ts
 * @description Tests for POST /api/staff/approve
 *
 * Business context:
 *   An admin reviews a pending staff registration and approves it.
 *   Approval changes the staff record's status from 'pending' to 'approved',
 *   which then allows the staff member to log in via Microsoft OAuth.
 *
 * Business rules tested:
 *   1. Only admins can approve staff — non-admin and unauthenticated are rejected.
 *   2. Request body must contain only staff_id — Zod .strict() rejects extra fields.
 *      This blocks attempts to set role/status via the approve endpoint.
 *   3. Successful approval updates status to 'approved' and updates updated_dt.
 *   4. Returns 404 when the staff record does not exist.
 *   5. DB errors return a generic 500 — no internal messages in the response.
 *   6. staff_id length is validated (max 20 chars) matching the DB column.
 */

import { NextRequest } from 'next/server'
import { POST } from '@/app/api/staff/approve/route'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
const mockValidateSession = jest.fn()
jest.mock('@/lib/apiAuth', () => ({
  validateSession: (...args: unknown[]) => mockValidateSession(...args),
}))

const mockSingle = jest.fn()
const mockSelect = jest.fn().mockReturnThis()
const mockUpdate = jest.fn().mockReturnThis()
const mockEq = jest.fn().mockReturnThis()
const mockFrom = jest.fn()

jest.mock('@/lib/supabase/server', () => ({
  supabaseAdmin: { from: (...args: unknown[]) => mockFrom(...args) },
}))

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const approvedRow = {
  staff_id: 'STAFF-003',
  name: 'Carol Pending',
  email: 'carol@swinburne.edu.au',
  status: 'approved',
  updated_dt: '2026-06-01T10:00:00Z',
}

function makeRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/staff/approve', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function setupChain() {
  const chain = { update: mockUpdate, eq: mockEq, select: mockSelect, single: mockSingle }
  mockUpdate.mockReturnValue(chain)
  mockEq.mockReturnValue(chain)
  mockSelect.mockReturnValue(chain)
  mockFrom.mockReturnValue(chain)
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('POST /api/staff/approve', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    setupChain()
  })

  // --- Authentication & authorisation --------------------------------------

  it('returns 401 when there is no valid session', async () => {
    mockValidateSession.mockResolvedValueOnce({
      authorized: false,
      response: new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 }),
    })

    const res = await POST(makeRequest({ staff_id: 'STAFF-003' }))

    expect(res.status).toBe(401)
    expect(mockValidateSession).toHaveBeenCalledWith('admin')
  })

  it('returns 403 when a non-admin staff member tries to approve a registration', async () => {
    mockValidateSession.mockResolvedValueOnce({
      authorized: false,
      response: new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 }),
    })

    const res = await POST(makeRequest({ staff_id: 'STAFF-003' }))
    expect(res.status).toBe(403)
  })

  // --- Input validation ----------------------------------------------------

  it('returns 400 when staff_id is missing from the request body', async () => {
    mockValidateSession.mockResolvedValueOnce({ authorized: true, session: {} })

    const res = await POST(makeRequest({}))
    const json = await res.json()

    expect(res.status).toBe(400)
    expect(json.error).toMatch(/invalid input/i)
  })

  it('returns 400 when staff_id exceeds 20 characters', async () => {
    mockValidateSession.mockResolvedValueOnce({ authorized: true, session: {} })

    const res = await POST(makeRequest({ staff_id: 'S'.repeat(21) }))
    expect(res.status).toBe(400)
  })

  it('rejects extra fields to block privilege escalation via the approve endpoint', async () => {
    // Security: someone must not be able to also set role='admin' or status='approved'
    // through this endpoint — Zod .strict() must catch it
    mockValidateSession.mockResolvedValueOnce({ authorized: true, session: {} })

    const res = await POST(makeRequest({ staff_id: 'STAFF-003', role: 'admin', status: 'approved' }))
    const json = await res.json()

    expect(res.status).toBe(400)
    expect(json.error).toMatch(/invalid input/i)
  })

  // --- Successful approval -------------------------------------------------

  it('sets the staff status to "approved" and returns the updated record', async () => {
    mockValidateSession.mockResolvedValueOnce({ authorized: true, session: {} })
    mockSingle.mockResolvedValueOnce({ data: approvedRow, error: null })

    const res = await POST(makeRequest({ staff_id: 'STAFF-003' }))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.staff.status).toBe('approved')
    expect(json.staff.staff_id).toBe('STAFF-003')
    expect(json.message).toMatch(/approved successfully/i)
  })

  it('updates the staff record using the correct staff_id (does not update other records)', async () => {
    mockValidateSession.mockResolvedValueOnce({ authorized: true, session: {} })
    mockSingle.mockResolvedValueOnce({ data: approvedRow, error: null })

    await POST(makeRequest({ staff_id: 'STAFF-003' }))

    expect(mockEq).toHaveBeenCalledWith('staff_id', 'STAFF-003')
  })

  it('sets updated_dt timestamp when approving the record', async () => {
    mockValidateSession.mockResolvedValueOnce({ authorized: true, session: {} })
    mockSingle.mockResolvedValueOnce({ data: approvedRow, error: null })

    await POST(makeRequest({ staff_id: 'STAFF-003' }))

    // The update payload must include an updated_dt timestamp
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'approved',
        updated_dt: expect.any(String),
      })
    )
  })

  // --- Not found -----------------------------------------------------------

  it('returns 404 when the staff_id does not exist in the database', async () => {
    mockValidateSession.mockResolvedValueOnce({ authorized: true, session: {} })
    // Supabase returns null data with no error when .single() finds nothing
    mockSingle.mockResolvedValueOnce({ data: null, error: null })

    const res = await POST(makeRequest({ staff_id: 'STAFF-GHOST' }))
    const json = await res.json()

    expect(res.status).toBe(404)
    expect(json.error).toMatch(/not found/i)
  })

  // --- DB errors -----------------------------------------------------------

  it('returns 500 without exposing internal DB error messages', async () => {
    mockValidateSession.mockResolvedValueOnce({ authorized: true, session: {} })
    mockSingle.mockResolvedValueOnce({
      data: null,
      error: { message: 'connection pool exhausted: internal details' },
    })

    const res = await POST(makeRequest({ staff_id: 'STAFF-003' }))
    const json = await res.json()

    expect(res.status).toBe(500)
    expect(json.error).toMatch(/failed to approve/i)
    expect(JSON.stringify(json)).not.toContain('connection pool exhausted')
    expect(JSON.stringify(json)).not.toContain('internal details')
  })
})