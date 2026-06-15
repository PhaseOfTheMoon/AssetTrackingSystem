/**
 * @jest-environment node
 */

/**
 * @file route.test.ts
 * @description Tests for POST /api/staff/update
 *
 * Business context:
 *   Allows admins to update mutable staff details: name, email, mobile_no,
 *   department_id.  Only these four fields plus staff_id (for identification)
 *   are accepted — all other fields are blocked.
 *
 *   Critical security invariant:
 *     An admin updating a staff profile must NEVER be able to change that
 *     staff member's role or status via this endpoint.  The Zod schema uses
 *     .strict() to block any field not explicitly whitelisted.  This prevents
 *     privilege escalation attacks like:
 *       POST /api/staff/update { staff_id: 'S001', role: 'admin' }
 *
 *   staff_id identifies the record to update — it is used in .eq() but is
 *   NOT itself updated (primary keys are immutable per CLAUDE.md §3).
 *
 * Business rules tested:
 *   1. Only admins can update staff records.
 *   2. staff_id is required to identify which record to update.
 *   3. All four mutable fields are individually optional — partial updates work.
 *   4. Extra fields (role, status, microsoft_user_id) are rejected by .strict().
 *   5. email must be a valid format when provided.
 *   6. Field length limits enforced at API layer (name≤100, mobile_no≤20, etc.).
 *   7. updated_dt is always set server-side on successful update.
 *   8. DB errors return 500 with no internal message in response body.
 *
 * Security rules:
 *   - Zod .strict() prevents mass-assignment privilege escalation.
 *   - Primary key (staff_id) is immutable and never written via update.
 *   - error.message must never reach the HTTP response body.
 */

import { NextRequest } from 'next/server'
import { POST } from '@/app/api/staff/update/route'

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
// Fixtures
// ---------------------------------------------------------------------------
const STAFF_ID = 'STAFF-004'

const updatedStaffRow = {
  staff_id: STAFF_ID,
  name: 'David Updated',
  email: 'david.updated@swinburne.edu.au',
  mobile_no: '0499999999',
  department_id: 'ICT',
  microsoft_user_id: 'aad-david-001',
  status: 'approved',
  role: 'staff',
  updated_dt: '2026-06-14T10:00:00Z',
}

function makeRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/staff/update', {
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
describe('POST /api/staff/update', () => {
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

    const res = await POST(makeRequest({ staff_id: STAFF_ID, name: 'New Name' }))
    expect(res.status).toBe(401)
    expect(mockValidateSession).toHaveBeenCalledWith('admin')
  })

  it('returns 403 when a non-admin staff member tries to update another staff record', async () => {
    mockValidateSession.mockResolvedValueOnce({
      authorized: false,
      response: new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 }),
    })

    const res = await POST(makeRequest({ staff_id: STAFF_ID, name: 'New Name' }))
    expect(res.status).toBe(403)
  })

  // --- Input validation ----------------------------------------------------

  it('returns 400 when staff_id is missing — cannot identify which record to update', async () => {
    mockValidateSession.mockResolvedValueOnce({ authorized: true, session: {} })

    const res = await POST(makeRequest({ name: 'New Name' }))
    const json = await res.json()

    expect(res.status).toBe(400)
    expect(json.error).toMatch(/invalid input/i)
  })

  it('returns 400 when staff_id exceeds 20 characters', async () => {
    mockValidateSession.mockResolvedValueOnce({ authorized: true, session: {} })

    const res = await POST(makeRequest({ staff_id: 'S'.repeat(21), name: 'Test' }))
    expect(res.status).toBe(400)
  })

  it('returns 400 when name exceeds 100 characters', async () => {
    mockValidateSession.mockResolvedValueOnce({ authorized: true, session: {} })

    const res = await POST(makeRequest({ staff_id: STAFF_ID, name: 'N'.repeat(101) }))
    expect(res.status).toBe(400)
  })

  it('returns 400 when email is not a valid email format', async () => {
    // Business rule: must be a valid email to prevent junk data in the directory
    mockValidateSession.mockResolvedValueOnce({ authorized: true, session: {} })

    const res = await POST(makeRequest({ staff_id: STAFF_ID, email: 'not-valid@' }))
    const json = await res.json()

    expect(res.status).toBe(400)
    expect(json.error).toMatch(/invalid input/i)
  })

  it('returns 400 when email contains a URL (https://) — must be plain email only', async () => {
    // Input sanitisation: URLs in the email field are injection vectors
    mockValidateSession.mockResolvedValueOnce({ authorized: true, session: {} })

    const res = await POST(makeRequest({ staff_id: STAFF_ID, email: 'https://evil.com/@swinburne.edu.au' }))
    expect(res.status).toBe(400)
  })

  it('returns 400 when mobile_no exceeds 20 characters', async () => {
    mockValidateSession.mockResolvedValueOnce({ authorized: true, session: {} })

    const res = await POST(makeRequest({ staff_id: STAFF_ID, mobile_no: '0'.repeat(21) }))
    expect(res.status).toBe(400)
  })

  it('returns 400 when department_id exceeds 50 characters', async () => {
    mockValidateSession.mockResolvedValueOnce({ authorized: true, session: {} })

    const res = await POST(makeRequest({ staff_id: STAFF_ID, department_id: 'D'.repeat(51) }))
    expect(res.status).toBe(400)
  })

  // --- Mass-assignment / privilege escalation prevention -------------------

  it('rejects a request that includes "role" to prevent privilege escalation to admin', async () => {
    // Critical security test: must not allow { staff_id, role: 'admin' }
    mockValidateSession.mockResolvedValueOnce({ authorized: true, session: {} })

    const res = await POST(makeRequest({ staff_id: STAFF_ID, name: 'Test', role: 'admin' }))
    const json = await res.json()

    expect(res.status).toBe(400)
    expect(json.error).toMatch(/invalid input/i)
  })

  it('rejects a request that includes "status" to prevent bypassing the approval workflow', async () => {
    // Security: cannot change status to 'approved' via the update endpoint
    mockValidateSession.mockResolvedValueOnce({ authorized: true, session: {} })

    const res = await POST(makeRequest({ staff_id: STAFF_ID, status: 'approved' }))
    const json = await res.json()

    expect(res.status).toBe(400)
    expect(json.error).toMatch(/invalid input/i)
  })

  it('rejects a request that includes "microsoft_user_id" — this field is system-managed only', async () => {
    mockValidateSession.mockResolvedValueOnce({ authorized: true, session: {} })

    const res = await POST(makeRequest({ staff_id: STAFF_ID, microsoft_user_id: 'hacked-id' }))
    const json = await res.json()

    expect(res.status).toBe(400)
    expect(json.error).toMatch(/invalid input/i)
  })

  // --- Partial updates -----------------------------------------------------

  it('allows updating only the name without requiring the other fields', async () => {
    // Business rule: all update fields are optional — partial updates must work
    mockValidateSession.mockResolvedValueOnce({ authorized: true, session: {} })
    mockSingle.mockResolvedValueOnce({ data: { ...updatedStaffRow, name: 'David Renamed' }, error: null })

    const res = await POST(makeRequest({ staff_id: STAFF_ID, name: 'David Renamed' }))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.staff.name).toBe('David Renamed')
  })

  it('allows updating only department_id (staff transfer between departments)', async () => {
    mockValidateSession.mockResolvedValueOnce({ authorized: true, session: {} })
    mockSingle.mockResolvedValueOnce({ data: { ...updatedStaffRow, department_id: 'MKTG' }, error: null })

    const res = await POST(makeRequest({ staff_id: STAFF_ID, department_id: 'MKTG' }))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.staff.department_id).toBe('MKTG')
  })

  // --- Successful full update ----------------------------------------------

  it('updates the staff record and returns success=true with the updated row', async () => {
    mockValidateSession.mockResolvedValueOnce({ authorized: true, session: {} })
    mockSingle.mockResolvedValueOnce({ data: updatedStaffRow, error: null })

    const res = await POST(makeRequest({
      staff_id: STAFF_ID,
      name: 'David Updated',
      email: 'david.updated@swinburne.edu.au',
      mobile_no: '0499999999',
      department_id: 'ICT',
    }))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.staff.name).toBe('David Updated')
    expect(json.staff.email).toBe('david.updated@swinburne.edu.au')
  })

  it('targets the correct staff record using .eq("staff_id", …)', async () => {
    mockValidateSession.mockResolvedValueOnce({ authorized: true, session: {} })
    mockSingle.mockResolvedValueOnce({ data: updatedStaffRow, error: null })

    await POST(makeRequest({ staff_id: STAFF_ID, name: 'New Name' }))

    expect(mockEq).toHaveBeenCalledWith('staff_id', STAFF_ID)
  })

  it('always sets updated_dt server-side on a successful update', async () => {
    // Business rule: timestamps are always set server-side, never client-supplied
    mockValidateSession.mockResolvedValueOnce({ authorized: true, session: {} })
    mockSingle.mockResolvedValueOnce({ data: updatedStaffRow, error: null })

    await POST(makeRequest({ staff_id: STAFF_ID, name: 'New Name' }))

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ updated_dt: expect.any(String) })
    )
  })

  it('does NOT include staff_id in the update payload — primary keys are immutable', async () => {
    // Regression (CLAUDE.md §3): primary keys must never be updated
    mockValidateSession.mockResolvedValueOnce({ authorized: true, session: {} })
    mockSingle.mockResolvedValueOnce({ data: updatedStaffRow, error: null })

    await POST(makeRequest({ staff_id: STAFF_ID, name: 'New Name' }))

    const updateCallArg = mockUpdate.mock.calls[0][0] as Record<string, unknown>
    expect(updateCallArg).not.toHaveProperty('staff_id')
  })

  // --- Error handling ------------------------------------------------------

  it('returns 500 without leaking the internal DB error message to the client', async () => {
    mockValidateSession.mockResolvedValueOnce({ authorized: true, session: {} })
    mockSingle.mockResolvedValueOnce({
      data: null,
      error: { message: 'duplicate key value violates unique constraint "staff_email_key"' },
    })

    const res = await POST(makeRequest({ staff_id: STAFF_ID, email: 'duplicate@swinburne.edu.au' }))
    const json = await res.json()

    expect(res.status).toBe(500)
    expect(json.error).toMatch(/failed to update staff member/i)
    expect(JSON.stringify(json)).not.toContain('duplicate key value')
    expect(JSON.stringify(json)).not.toContain('staff_email_key')
  })
})