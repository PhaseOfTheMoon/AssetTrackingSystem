/**
 * @jest-environment node
 */

/**
 * @file route.test.ts
 * @description Tests for POST /api/staff/get-by-microsoft-id
 *
 * Business context:
 *   Called during Microsoft OAuth login as a fast lookup path.
 *   Once a staff member has logged in once (microsoft_user_id captured via
 *   get-by-email), every subsequent login uses this endpoint instead, because
 *   looking up by microsoft_user_id is faster and doesn't depend on the email
 *   address being unchanged.
 *
 *   This endpoint is intentionally simpler than get-by-email:
 *   - No status checking (the microsoft_user_id is only set on approved+first-login staff)
 *   - No microsoft_user_id update (it is already set)
 *   - Just a straight lookup — found or not found
 *
 * Business rules tested:
 *   1. Any authenticated user can call this endpoint — used during login flow.
 *   2. microsoftUserId is required in the request body.
 *   3. Staff not found returns { staff: null } with a "needs registration" message.
 *      This is NOT a 404 — the auth callback decides what to do.
 *   4. Found staff is returned with full data.
 *   5. DB errors return 500 with no internal detail.
 *
 * Security rules:
 *   - The microsoftUserId is trusted only because it comes from the NextAuth
 *     JWT callback (server-side) — it is never taken from client-supplied cookies.
 *   - Error messages must never expose DB internals.
 */

import { NextRequest } from 'next/server'
import { POST } from '@/app/api/staff/get-by-microsoft-id/route'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
const mockValidateSession = jest.fn()
jest.mock('@/lib/apiAuth', () => ({
  validateSession: (...args: unknown[]) => mockValidateSession(...args),
}))

const mockSingle = jest.fn()
const mockEq = jest.fn().mockReturnThis()
const mockSelect = jest.fn().mockReturnThis()
const mockFrom = jest.fn()

jest.mock('@/lib/supabase/server', () => ({
  supabaseAdmin: { from: (...args: unknown[]) => mockFrom(...args) },
}))

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
const MICROSOFT_ID = 'aad-david-00112233'

const staffRow = {
  staff_id: 'STAFF-004',
  name: 'David Approved',
  email: 'david@swinburne.edu.au',
  mobile_no: '0423456789',
  department_id: 'ENG',
  microsoft_user_id: MICROSOFT_ID,
  status: 'approved',
  role: 'staff',
  created_dt: '2026-01-05T09:00:00Z',
  updated_dt: '2026-01-06T10:00:00Z',
}

function makeRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/staff/get-by-microsoft-id', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function setupChain() {
  const chain = { select: mockSelect, eq: mockEq, single: mockSingle }
  mockSelect.mockReturnValue(chain)
  mockEq.mockReturnValue(chain)
  mockFrom.mockReturnValue(chain)
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('POST /api/staff/get-by-microsoft-id', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    setupChain()
    mockValidateSession.mockResolvedValue({ authorized: true, session: {} })
  })

  // --- Authentication ------------------------------------------------------

  it('returns 401 when there is no valid session', async () => {
    mockValidateSession.mockResolvedValueOnce({
      authorized: false,
      response: new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 }),
    })

    const res = await POST(makeRequest({ microsoftUserId: MICROSOFT_ID }))
    expect(res.status).toBe(401)
  })

  it('calls validateSession with no role — this endpoint is used during login, not admin-only', async () => {
    mockSingle.mockResolvedValueOnce({ data: staffRow, error: null })

    await POST(makeRequest({ microsoftUserId: MICROSOFT_ID }))

    expect(mockValidateSession).toHaveBeenCalledWith()
  })

  // --- Input validation ----------------------------------------------------

  it('returns 400 when microsoftUserId is missing from the request body', async () => {
    const res = await POST(makeRequest({}))
    const json = await res.json()

    expect(res.status).toBe(400)
    expect(json.error).toMatch(/microsoft user id is required/i)
  })

  it('returns 400 when microsoftUserId is an empty string', async () => {
    const res = await POST(makeRequest({ microsoftUserId: '' }))
    const json = await res.json()

    expect(res.status).toBe(400)
    expect(json.error).toMatch(/microsoft user id is required/i)
  })

  // --- Staff not found -----------------------------------------------------

  it('returns { staff: null } when no staff record has this Microsoft ID', async () => {
    // Business rule: not found is a normal state — it means the user logged in with
    // Microsoft but has no linked staff account yet (needs to use get-by-email flow)
    mockSingle.mockResolvedValueOnce({
      data: null,
      error: { code: 'PGRST116', message: 'no rows returned' },
    })

    const res = await POST(makeRequest({ microsoftUserId: 'unknown-aad-id' }))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.staff).toBeNull()
    expect(json.message).toMatch(/needs registration/i)
  })

  // --- Successful lookup ---------------------------------------------------

  it('returns the staff record when a matching microsoft_user_id is found', async () => {
    mockSingle.mockResolvedValueOnce({ data: staffRow, error: null })

    const res = await POST(makeRequest({ microsoftUserId: MICROSOFT_ID }))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.staff.staff_id).toBe('STAFF-004')
    expect(json.staff.microsoft_user_id).toBe(MICROSOFT_ID)
  })

  it('queries the Staff table using the microsoft_user_id column', async () => {
    mockSingle.mockResolvedValueOnce({ data: staffRow, error: null })

    await POST(makeRequest({ microsoftUserId: MICROSOFT_ID }))

    expect(mockFrom).toHaveBeenCalledWith('Staff')
    expect(mockEq).toHaveBeenCalledWith('microsoft_user_id', MICROSOFT_ID)
  })

  // --- Injection / malicious input -----------------------------------------

  it('passes microsoftUserId through parameterised query — not concatenated into SQL', async () => {
    // Security: Supabase client always uses parameterised queries, but we verify
    // the value is passed directly to .eq() and not modified/interpolated
    const suspiciousId = "'; DROP TABLE Staff; --"
    mockSingle.mockResolvedValueOnce({
      data: null,
      error: { code: 'PGRST116', message: 'no rows' },
    })

    const res = await POST(makeRequest({ microsoftUserId: suspiciousId }))

    // The value goes into .eq() unchanged — Supabase handles parameterisation
    expect(mockEq).toHaveBeenCalledWith('microsoft_user_id', suspiciousId)
    // Response must not expose any error detail
    expect(res.status).toBe(200)
    expect((await res.json()).staff).toBeNull()
  })

  // --- Error handling ------------------------------------------------------

  it('returns 500 without exposing internal DB error messages', async () => {
    mockSingle.mockResolvedValueOnce({
      data: null,
      error: { code: 'XX000', message: 'could not connect to database server: no route to host' },
    })

    const res = await POST(makeRequest({ microsoftUserId: MICROSOFT_ID }))
    const json = await res.json()

    expect(res.status).toBe(500)
    expect(json.error).toMatch(/failed to fetch staff/i)
    expect(JSON.stringify(json)).not.toContain('no route to host')
    expect(JSON.stringify(json)).not.toContain('database server')
  })
})