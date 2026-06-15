/**
 * @jest-environment node
 */

/**
 * @file route.test.ts
 * @description Tests for POST /api/staff/add
 * 
 * Business context
 *  Admins pre-register staff members before they log in for the first time.
 *  The record is created with status='pending' and microsoft_user_id=null.
 *  Microsoft ID is captured automatically on first OAuth login (not here).
 * 
 * Business rules tested:
 *   1. Only admins can add staff — non-admin and unauthenticated are rejected.
 *   2. All five required fields must be present and within length limits.
 *   3. email must be a valid email format (Zod .email()).
 *   4. Extra / unexpected fields are rejected (Zod .strict()).
 *      Prevents privilege escalation: { role: 'admin' } or { status: 'approved' }.
 *   5. Duplicate staff_id returns 409 Conflict (DB error code 23505).
 *   6. DB failures return a generic 500 — error.message is NEVER sent to client.
 *   7. microsoft_user_id is left null on creation — filled on first login.
 *   8. Input sanitisation: URLs (https://) and injection characters are rejected
 *      in ID and name fields to prevent XSS and log-injection vectors.
 * 
 * Security rules:
 *  - validateSession('admin') guards the route.
 *  - Zod .strict() blocks mass-assignment attacks.
 *  - Internal DB error messages must NEVER reach the HTTP response body.
 *  - staff_id must not accept URLs or special characters (primary key safety).
 */

import { NextRequest } from "next/server"
import { POST } from '@/app/api/staff/add/route'

// --------------------------------------------------------
// Mock actions
//---------------------------------------------------------
const mockValidateSession = jest.fn()
jest.mock('@/lib/apiAuth', () => ({
  validateSession: (...args: unknown[]) => mockValidateSession(...args),
}))
 
const mockSingle = jest.fn()
const mockSelect = jest.fn()
const mockInsert = jest.fn()
const mockFrom = jest.fn()
 
jest.mock('@/lib/supabase/server', () => ({
  supabaseAdmin: { from: (...args: unknown[]) => mockFrom(...args) },
}))

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
const validNewStaffBody = {
  staff_id: '104407891',
  name: 'Jeff Bezos',
  email: 'jeff@swinburne.edu.my',
  mobile_no: '0117854321',
  department_id: 'ICT',
}

const createdStaffRow = {
  ...validNewStaffBody,
  microsoft_user_id: null,
  status: 'pending',
  role: null,
  created_dt: '2026-06-01T08:00:00Z',
  updated_dt: '2026-06-01T08:00:00Z',
}

function makeRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/staff/add', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function setupChain() {
  const chain = { insert: mockInsert, select: mockSelect, single: mockSingle }
  mockInsert.mockReturnValue(chain)
  mockSelect.mockReturnValue(chain)
  mockFrom.mockReturnValue(chain)
}

function setupSupabaseSuccess() {
  setupChain()
  mockSingle.mockResolvedValueOnce({ data: createdStaffRow, error: null })
}

function setupSupabaseError(code?: string, message = 'DB error') {
  setupChain()
  mockSingle.mockResolvedValueOnce({ data: null, error: { code, message } })
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('POST /api/staff/add', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })
 
  // --- Authentication & authorisation --------------------------------------
 
  it('returns 401 when the request has no valid session', async () => {
    // Arrange
    mockValidateSession.mockResolvedValueOnce({
      authorized: false,
      response: new Response(JSON.stringify({ error: 'Unauthorized - Please log in' }), { status: 401 }),
    })
 
    // Act
    const res = await POST(makeRequest(validNewStaffBody))
 
    // Assert
    expect(res.status).toBe(401)
    // validateSession must always be called with 'admin' — non-admins cannot pre-register staff
    expect(mockValidateSession).toHaveBeenCalledWith('admin')
  })
 
  it('returns 403 when a non-admin staff member tries to add a new staff record', async () => {
    // Business rule: only admins can pre-register staff in the system
    mockValidateSession.mockResolvedValueOnce({
      authorized: false,
      response: new Response(JSON.stringify({ error: 'Forbidden - admin role required' }), { status: 403 }),
    })
 
    const res = await POST(makeRequest(validNewStaffBody))
    expect(res.status).toBe(403)
  })
 
  // --- Input validation (Zod schema) ---------------------------------------
 
  it('returns 400 when staff_id is missing from the request body', async () => {
    mockValidateSession.mockResolvedValueOnce({ authorized: true, session: {} })
    const { staff_id: _removed, ...bodyWithoutId } = validNewStaffBody
 
    // Act
    const res = await POST(makeRequest(bodyWithoutId))
    const json = await res.json()
 
    // Assert
    expect(res.status).toBe(400)
    expect(json.error).toMatch(/invalid input/i)
  })
 
  it('returns 400 when name is missing from the request body', async () => {
    mockValidateSession.mockResolvedValueOnce({ authorized: true, session: {} })
    const { name: _removed, ...body } = validNewStaffBody
 
    const res = await POST(makeRequest(body))
    expect(res.status).toBe(400)
  })
 
  it('returns 400 when email is missing from the request body', async () => {
    mockValidateSession.mockResolvedValueOnce({ authorized: true, session: {} })
    const { email: _removed, ...body } = validNewStaffBody
 
    const res = await POST(makeRequest(body))
    expect(res.status).toBe(400)
  })
 
  it('returns 400 when email is not a valid email address format', async () => {
    // Business rule: must be a valid email — typos must be caught at the API boundary
    mockValidateSession.mockResolvedValueOnce({ authorized: true, session: {} })
 
    const res = await POST(makeRequest({ ...validNewStaffBody, email: 'not-an-email' }))
    const json = await res.json()
 
    expect(res.status).toBe(400)
    expect(json.error).toMatch(/invalid input/i)
  })
 
  it('returns 400 when email contains a bare @ with no domain', async () => {
    mockValidateSession.mockResolvedValueOnce({ authorized: true, session: {} })
 
    const res = await POST(makeRequest({ ...validNewStaffBody, email: 'jeff@' }))
    expect(res.status).toBe(400)
  })
 
  it('returns 400 when staff_id exceeds the 20-character VARCHAR(20) limit', async () => {
    // DB column is VARCHAR(20) — enforce at the API layer for a meaningful error
    mockValidateSession.mockResolvedValueOnce({ authorized: true, session: {} })
 
    const res = await POST(makeRequest({ ...validNewStaffBody, staff_id: 'S'.repeat(21) }))
    expect(res.status).toBe(400)
  })
 
  it('returns 400 when name exceeds the 100-character limit', async () => {
    mockValidateSession.mockResolvedValueOnce({ authorized: true, session: {} })
 
    const res = await POST(makeRequest({ ...validNewStaffBody, name: 'N'.repeat(101) }))
    expect(res.status).toBe(400)
  })
 
  it('returns 400 when mobile_no exceeds the 20-character limit', async () => {
    mockValidateSession.mockResolvedValueOnce({ authorized: true, session: {} })
 
    const res = await POST(makeRequest({ ...validNewStaffBody, mobile_no: '0'.repeat(21) }))
    expect(res.status).toBe(400)
  })
 
  it('returns 400 when department_id exceeds the 50-character limit', async () => {
    mockValidateSession.mockResolvedValueOnce({ authorized: true, session: {} })
 
    const res = await POST(makeRequest({ ...validNewStaffBody, department_id: 'D'.repeat(51) }))
    expect(res.status).toBe(400)
  })
 
  // --- Input sanitisation: injection characters in ID fields ---------------
 
  it('returns 400 when staff_id contains a URL (https://) — primary keys must be plain identifiers', async () => {
    // Security: URLs in primary key fields are an injection and log-poisoning vector.
    // staff_id is stored as a FK in StaffAsset, AuditLog etc — it must be clean.
    mockValidateSession.mockResolvedValueOnce({ authorized: true, session: {} })
 
    const res = await POST(makeRequest({ ...validNewStaffBody, staff_id: 'https://evil.com' }))
    expect(res.status).toBe(400)
  })
 
  it('returns 400 when staff_id contains a path traversal sequence (../)', async () => {
    mockValidateSession.mockResolvedValueOnce({ authorized: true, session: {} })
 
    const res = await POST(makeRequest({ ...validNewStaffBody, staff_id: '../etc/passwd' }))
    expect(res.status).toBe(400)
  })
 
  it('returns 400 when staff_id contains a script injection attempt', async () => {
    mockValidateSession.mockResolvedValueOnce({ authorized: true, session: {} })
 
    const res = await POST(makeRequest({ ...validNewStaffBody, staff_id: '<script>alert(1)</script>' }))
    expect(res.status).toBe(400)
  })
 
  it('returns 400 when department_id contains a URL (https://) — FK fields must be plain identifiers', async () => {
    // department_id is a FK reference — injecting a URL here could poison audit logs
    mockValidateSession.mockResolvedValueOnce({ authorized: true, session: {} })
 
    const res = await POST(makeRequest({ ...validNewStaffBody, department_id: 'https://evil.com/dept' }))
    expect(res.status).toBe(400)
  })
 
  it('returns 400 when name contains an HTML script tag (XSS prevention)', async () => {
    // Staff names are rendered in UI — script tags must be blocked at input
    mockValidateSession.mockResolvedValueOnce({ authorized: true, session: {} })
 
    const res = await POST(makeRequest({ ...validNewStaffBody, name: '<script>alert("xss")</script>' }))
    expect(res.status).toBe(400)
  })
 
  // --- Mass-assignment / privilege escalation ------------------------------
 
  it('rejects extra / unexpected fields to prevent privilege escalation', async () => {
    // Security: Zod .strict() blocks { role: 'admin' } or { status: 'approved' }
    // from being smuggled into the DB insert alongside valid fields
    mockValidateSession.mockResolvedValueOnce({ authorized: true, session: {} })
 
    const maliciousBody = { ...validNewStaffBody, role: 'admin', status: 'approved' }
    const res = await POST(makeRequest(maliciousBody))
 
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toMatch(/invalid input/i)
  })
 
  it('rejects a body that includes microsoft_user_id — this field is system-managed only', async () => {
    // microsoft_user_id is captured server-side on first OAuth login, never accepted from the client
    mockValidateSession.mockResolvedValueOnce({ authorized: true, session: {} })
 
    const res = await POST(makeRequest({ ...validNewStaffBody, microsoft_user_id: 'hacked-aad-id' }))
    expect(res.status).toBe(400)
  })
 
  // --- Successful creation -------------------------------------------------
 
  it('creates a new staff record and returns 200 with the created data', async () => {
    mockValidateSession.mockResolvedValueOnce({ authorized: true, session: {} })
    setupSupabaseSuccess()
 
    const res = await POST(makeRequest(validNewStaffBody))
    const json = await res.json()
 
    expect(res.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.staff.staff_id).toBe('104407891')
    expect(json.staff.name).toBe('Jeff Bezos')
  })
 
  it('inserts into the Staff table with the correct field values', async () => {
    mockValidateSession.mockResolvedValueOnce({ authorized: true, session: {} })
    setupSupabaseSuccess()
 
    await POST(makeRequest(validNewStaffBody))
 
    expect(mockFrom).toHaveBeenCalledWith('Staff')
    expect(mockInsert).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          staff_id: '104407891',
          name: 'Jeff Bezos',
          email: 'jeff@swinburne.edu.my',
          microsoft_user_id: null,
        }),
      ])
    )
  })
 
  it('creates the staff record with microsoft_user_id=null (it is captured on first OAuth login)', async () => {
    // Business rule: microsoft_user_id is null at creation — filled automatically on first login
    // via POST /api/staff/get-by-email
    mockValidateSession.mockResolvedValueOnce({ authorized: true, session: {} })
    setupSupabaseSuccess()
 
    const res = await POST(makeRequest(validNewStaffBody))
    const json = await res.json()
 
    expect(json.staff.microsoft_user_id).toBeNull()
  })
 
  // --- Conflict & DB errors ------------------------------------------------
 
  it('returns 409 Conflict when the staff_id already exists in the database', async () => {
    // PostgreSQL error code 23505 = unique key violation
    mockValidateSession.mockResolvedValueOnce({ authorized: true, session: {} })
    setupSupabaseError('23505', 'duplicate key value violates unique constraint')
 
    const res = await POST(makeRequest(validNewStaffBody))
    const json = await res.json()
 
    expect(res.status).toBe(409)
    expect(json.error).toMatch(/staff id already exists/i)
  })
 
  it('returns 500 for unexpected DB errors without leaking the internal error message', async () => {
    // Security (CLAUDE.md §10, §13): error.message must NEVER be returned to the client
    mockValidateSession.mockResolvedValueOnce({ authorized: true, session: {} })
    setupSupabaseError(undefined, 'connection refused: internal db details')
 
    const res = await POST(makeRequest(validNewStaffBody))
    const json = await res.json()
 
    expect(res.status).toBe(500)
    expect(json.error).toMatch(/failed to add staff member/i)
    expect(JSON.stringify(json)).not.toContain('connection refused')
    expect(JSON.stringify(json)).not.toContain('internal db details')
  })
 
  it('returns 500 when the request body is not valid JSON', async () => {
    mockValidateSession.mockResolvedValueOnce({ authorized: true, session: {} })
 
    const badRequest = new NextRequest('http://localhost/api/staff/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'not json {{{',
    })
 
    const res = await POST(badRequest)
    expect(res.status).toBe(500)
  })
})