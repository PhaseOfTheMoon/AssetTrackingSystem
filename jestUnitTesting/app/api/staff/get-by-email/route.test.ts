/**
 * @jest-environment node
 */

/**
 * @file route.test.ts
 * @description Tests for POST /api/staff/get-by-email
 *
 * Business context:
 *   Called during Microsoft OAuth login to look up whether the authenticating
 *   user's email exists as a pre-registered staff record.  This is the primary
 *   mechanism that links a Microsoft identity to a Swinburne staff account.
 *
 *   Registration flow:
 *     1. Admin pre-registers staff via /api/staff/add (status='pending', microsoft_user_id=null)
 *     2. Staff member signs in with Microsoft OAuth
 *     3. THIS endpoint is called with the email from OAuth
 *     4. If found + approved + no microsoft_user_id → capture the ID (first login)
 *     5. The staff member's status gates what happens next:
 *        - 'pending', login blocked, message returned explaining why
 *        - 'rejected', login blocked, message returned
 *        - 'approved', login succeeds
 *
 * Business rules tested:
 *   1. Any authenticated user can call this — used during login flow.
 *   2. email is required — missing it returns 400.
 *   3. Staff not found returns { staff: null } with a helpful message (NOT 404).
 *      The caller (auth.ts) decides what to do with a missing staff record.
 *   4. Pending staff: returns success=false with message='pending'.
 *   5. Rejected staff: returns success=false with message='rejected'.
 *   6. Approved staff on first login: microsoftUserId is captured and staff is returned.
 *   7. Approved staff on subsequent logins: staff returned as-is.
 *   8. Unknown/invalid status: returns error, not a crash.
 *   9. DB errors return 500 with no internal message.
 *
 * Security rules:
 *   - microsoftUserId is captured server-side only — never trusted from client.
 *   - Error messages are generic — no DB internals exposed.
 */

import { NextRequest } from 'next/server'
import { POST } from '@/app/api/staff/get-by-email/route'

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
const TEST_EMAIL = 'david@swinburne.edu.au'
const MICROSOFT_ID = 'aad-david-00112233'

const approvedStaffNoMicrosoftId = {
  staff_id: 'STAFF-004',
  name: 'David Approved',
  email: TEST_EMAIL,
  mobile_no: '0423456789',
  department_id: 'ENG',
  microsoft_user_id: null, // First login — ID not yet captured
  status: 'approved',
  role: 'staff',
}

const approvedStaffWithMicrosoftId = {
  ...approvedStaffNoMicrosoftId,
  microsoft_user_id: MICROSOFT_ID, // Subsequent login
}

const pendingStaff = {
  staff_id: 'STAFF-003',
  name: 'Carol Pending',
  email: 'carol@swinburne.edu.au',
  status: 'pending',
  microsoft_user_id: null,
}

const rejectedStaff = {
  staff_id: 'STAFF-005',
  name: 'Eve Rejected',
  email: 'eve@swinburne.edu.au',
  status: 'rejected',
  microsoft_user_id: null,
}

function makeRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/staff/get-by-email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function setupChain() {
  const chain = { select: mockSelect, update: mockUpdate, eq: mockEq, single: mockSingle }
  mockSelect.mockReturnValue(chain)
  mockUpdate.mockReturnValue(chain)
  mockEq.mockReturnValue(chain)
  mockFrom.mockReturnValue(chain)
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('POST /api/staff/get-by-email', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    setupChain()
    mockValidateSession.mockResolvedValue({ authorized: true, session: {} })
  })

  // --- Authentication ------------------------------------------------------

  it('returns 401 when the request has no valid session', async () => {
    mockValidateSession.mockResolvedValueOnce({
      authorized: false,
      response: new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 }),
    })

    const res = await POST(makeRequest({ email: TEST_EMAIL }))
    expect(res.status).toBe(401)
  })

  it('calls validateSession with no role — this endpoint is used during login, not admin-only', async () => {
    mockSingle.mockResolvedValueOnce({ data: approvedStaffWithMicrosoftId, error: null })

    await POST(makeRequest({ email: TEST_EMAIL }))

    expect(mockValidateSession).toHaveBeenCalledWith()
  })

  // --- Input validation ----------------------------------------------------

  it('returns 400 when email is missing from the request body', async () => {
    const res = await POST(makeRequest({ microsoftUserId: MICROSOFT_ID }))
    const json = await res.json()

    expect(res.status).toBe(400)
    expect(json.error).toMatch(/email is required/i)
  })

  it('returns 400 when email is an empty string', async () => {
    const res = await POST(makeRequest({ email: '' }))
    const json = await res.json()

    expect(res.status).toBe(400)
    expect(json.error).toMatch(/email is required/i)
  })

  // --- Staff not found -----------------------------------------------------

  it('returns { staff: null } with a helpful message when no staff record matches the email', async () => {
    // Business rule: "not found" is not an error — it means the person needs to register
    // The auth callback uses this to decide whether to show the registration page
    mockSingle.mockResolvedValueOnce({
      data: null,
      error: { code: 'PGRST116', message: 'no rows returned' }, // Supabase not-found code
    })

    const res = await POST(makeRequest({ email: 'unknown@swinburne.edu.au' }))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.staff).toBeNull()
    expect(json.message).toMatch(/needs registration/i)
  })

  // --- Pending status ------------------------------------------------------

  it('blocks login and returns success=false with message="pending" for pending staff', async () => {
    // Business rule: pending staff cannot log in until an admin approves them
    mockSingle.mockResolvedValueOnce({ data: pendingStaff, error: null })

    const res = await POST(makeRequest({ email: 'carol@swinburne.edu.au' }))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.success).toBe(false)
    expect(json.message).toBe('pending')
    expect(json.staff).toBeNull()
    // The error message must explain what to do — not just say "no"
    expect(json.error).toMatch(/pending admin approval/i)
  })

  // --- Rejected status -----------------------------------------------------

  it('blocks login and returns success=false with message="rejected" for rejected staff', async () => {
    // Business rule: rejected staff must contact the administrator to resolve
    mockSingle.mockResolvedValueOnce({ data: rejectedStaff, error: null })

    const res = await POST(makeRequest({ email: 'eve@swinburne.edu.au' }))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.success).toBe(false)
    expect(json.message).toBe('rejected')
    expect(json.staff).toBeNull()
    expect(json.error).toMatch(/contact administrator/i)
  })

  // --- First login: capture Microsoft ID -----------------------------------

  it('captures microsoftUserId on first login when staff is approved but has no microsoft_user_id', async () => {
    // Business rule: microsoft_user_id is null after pre-registration.
    // On first OAuth login, we store the ID so future lookups can use get-by-microsoft-id.
    // First call: lookup by email returns staff with microsoft_user_id=null
    mockSingle.mockResolvedValueOnce({ data: approvedStaffNoMicrosoftId, error: null })
    // Second call: update microsoft_user_id, then .select().single() returns updated row
    const updatedRow = { ...approvedStaffNoMicrosoftId, microsoft_user_id: MICROSOFT_ID }
    mockSingle.mockResolvedValueOnce({ data: updatedRow, error: null })

    const res = await POST(makeRequest({ email: TEST_EMAIL, microsoftUserId: MICROSOFT_ID }))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.staff.microsoft_user_id).toBe(MICROSOFT_ID)
    expect(json.message).toMatch(/first login/i)
    // Verify the update was called
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ microsoft_user_id: MICROSOFT_ID })
    )
  })

  it('continues with original staff data if the microsoft_user_id update fails on first login', async () => {
    // Resilience rule: a failed update must not block the user from logging in
    mockSingle.mockResolvedValueOnce({ data: approvedStaffNoMicrosoftId, error: null })
    // Update fails
    mockSingle.mockResolvedValueOnce({ data: null, error: { message: 'update failed' } })

    const res = await POST(makeRequest({ email: TEST_EMAIL, microsoftUserId: MICROSOFT_ID }))
    const json = await res.json()

    // Must still succeed — graceful degradation
    expect(res.status).toBe(200)
    expect(json.success).toBe(true)
  })

  // --- Subsequent logins ---------------------------------------------------

  it('returns the existing approved staff record on subsequent logins without re-capturing microsoft_user_id', async () => {
    // Staff already has their microsoft_user_id from first login — no update needed
    mockSingle.mockResolvedValueOnce({ data: approvedStaffWithMicrosoftId, error: null })

    const res = await POST(makeRequest({ email: TEST_EMAIL, microsoftUserId: MICROSOFT_ID }))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.staff.staff_id).toBe('STAFF-004')
    // The update must NOT be called since microsoft_user_id is already set
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  // --- Unknown status ------------------------------------------------------

  it('returns an error response for a staff record with an unrecognised status value', async () => {
    // Defensive: the DB should enforce valid statuses, but the route handles unexpected values
    const unknownStatusStaff = { ...approvedStaffNoMicrosoftId, status: 'suspended' }
    mockSingle.mockResolvedValueOnce({ data: unknownStatusStaff, error: null })

    const res = await POST(makeRequest({ email: TEST_EMAIL }))
    const json = await res.json()

    expect(json.success).toBe(false)
    expect(json.error).toMatch(/invalid account status/i)
  })

  // --- Error handling ------------------------------------------------------

  it('returns 500 without leaking internal DB messages for unexpected errors', async () => {
    mockSingle.mockResolvedValueOnce({
      data: null,
      error: { code: 'XX000', message: 'deadlock detected: transaction 4521' },
    })

    const res = await POST(makeRequest({ email: TEST_EMAIL }))
    const json = await res.json()

    expect(res.status).toBe(500)
    expect(json.error).toMatch(/failed to fetch staff/i)
    expect(JSON.stringify(json)).not.toContain('deadlock detected')
    expect(JSON.stringify(json)).not.toContain('transaction 4521')
  })
})