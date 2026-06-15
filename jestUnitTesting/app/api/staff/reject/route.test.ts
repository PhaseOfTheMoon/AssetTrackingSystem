/**
 * @jest-environment node
 */

/**
 * @file route.test.ts
 * @description Tests for POST /api/staff/reject
 *
 * Business context:
 *   An admin reviews a pending staff registration and rejects it.
 *   Rejection changes the staff record's status from 'pending' to 'rejected',
 *   which permanently blocks the staff member from logging in until an admin
 *   manually re-approves them.
 *
 *   This mirrors /api/staff/approve exactly in structure — the only difference
 *   is the target status value ('rejected' vs 'approved').  Both are tested
 *   separately so a regression in one does not hide a bug in the other.
 *
 * Business rules tested:
 *   1. Only admins can reject staff registrations.
 *   2. Request body must contain only staff_id — Zod .strict() rejects extras.
 *      Prevents sending { role: 'staff' } or { status: 'approved' } alongside.
 *   3. Successful rejection sets status='rejected' and updates updated_dt.
 *   4. Returns 404 when the staff record does not exist.
 *   5. DB errors return 500 with no internal messages in the response body.
 *   6. staff_id length is capped at 20 chars matching the DB VARCHAR(20) column.
 *
 * Regression coverage:
 *   - role is 'admin' | 'staff', NEVER 'user' — role check uses 'admin' string.
 *   - Error message is never leaked to the client response body.
 */

import { NextRequest } from 'next/server'
import { POST } from '@/app/api/staff/reject/route'

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
const rejectedRow = {
  staff_id: 'STAFF-003',
  name: 'Carol Pending',
  email: 'carol@swinburne.edu.au',
  status: 'rejected',
  updated_dt: '2026-06-01T10:00:00Z',
}

function makeRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/staff/reject', {
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
describe('POST /api/staff/reject', () => {
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

  it('returns 403 when a non-admin staff member attempts to reject a registration', async () => {
    // Regression (CLAUDE.md §15): role value is 'staff' not 'user' — guard uses 'admin' check
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

  it('returns 400 when staff_id exceeds the 20-character VARCHAR limit', async () => {
    mockValidateSession.mockResolvedValueOnce({ authorized: true, session: {} })

    const res = await POST(makeRequest({ staff_id: 'S'.repeat(21) }))
    expect(res.status).toBe(400)
  })

  it('rejects extra fields to prevent privilege escalation via the reject endpoint', async () => {
    // Security: must not allow { staff_id, status: 'approved' } to slip through
    mockValidateSession.mockResolvedValueOnce({ authorized: true, session: {} })

    const res = await POST(makeRequest({ staff_id: 'STAFF-003', status: 'approved', role: 'admin' }))
    const json = await res.json()

    expect(res.status).toBe(400)
    expect(json.error).toMatch(/invalid input/i)
  })

  // --- Successful rejection ------------------------------------------------

  it('sets the staff status to "rejected" and returns the updated record', async () => {
    mockValidateSession.mockResolvedValueOnce({ authorized: true, session: {} })
    mockSingle.mockResolvedValueOnce({ data: rejectedRow, error: null })

    const res = await POST(makeRequest({ staff_id: 'STAFF-003' }))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.staff.status).toBe('rejected')
    expect(json.message).toMatch(/rejected successfully/i)
  })

  it('updates only the targeted staff record using the provided staff_id', async () => {
    mockValidateSession.mockResolvedValueOnce({ authorized: true, session: {} })
    mockSingle.mockResolvedValueOnce({ data: rejectedRow, error: null })

    await POST(makeRequest({ staff_id: 'STAFF-003' }))

    expect(mockEq).toHaveBeenCalledWith('staff_id', 'STAFF-003')
  })

  it('sets status="rejected" (not "approved") in the database update', async () => {
    // Explicit check: reject must write 'rejected', not 'approved' — must not be copy-pasted from approve
    mockValidateSession.mockResolvedValueOnce({ authorized: true, session: {} })
    mockSingle.mockResolvedValueOnce({ data: rejectedRow, error: null })

    await POST(makeRequest({ staff_id: 'STAFF-003' }))

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'rejected',
        updated_dt: expect.any(String),
      })
    )
  })

  it('sets updated_dt when rejecting so the audit trail is accurate', async () => {
    mockValidateSession.mockResolvedValueOnce({ authorized: true, session: {} })
    mockSingle.mockResolvedValueOnce({ data: rejectedRow, error: null })

    await POST(makeRequest({ staff_id: 'STAFF-003' }))

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ updated_dt: expect.any(String) })
    )
  })

  // --- Not found -----------------------------------------------------------

  it('returns 404 when the staff_id does not exist in the database', async () => {
    mockValidateSession.mockResolvedValueOnce({ authorized: true, session: {} })
    mockSingle.mockResolvedValueOnce({ data: null, error: null })

    const res = await POST(makeRequest({ staff_id: 'STAFF-GHOST' }))
    const json = await res.json()

    expect(res.status).toBe(404)
    expect(json.error).toMatch(/not found/i)
  })

  // --- Error handling ------------------------------------------------------

  it('returns 500 without exposing internal DB error messages to the client', async () => {
    mockValidateSession.mockResolvedValueOnce({ authorized: true, session: {} })
    mockSingle.mockResolvedValueOnce({
      data: null,
      error: { message: 'update violates foreign key constraint "staff_department_fkey"' },
    })

    const res = await POST(makeRequest({ staff_id: 'STAFF-003' }))
    const json = await res.json()

    expect(res.status).toBe(500)
    expect(json.error).toMatch(/failed to reject/i)
    expect(JSON.stringify(json)).not.toContain('foreign key constraint')
    expect(JSON.stringify(json)).not.toContain('staff_department_fkey')
  })
})