/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server'
import { GET } from '@/app/api/check/route'

jest.mock('@/lib/supabase/server', () => ({
  supabaseAdmin: { from: jest.fn() }
}))

jest.mock('@/lib/apiAuth', () => ({
  validateSession: jest.fn()
}))

const { supabaseAdmin } = require('@/lib/supabase/server')
const { validateSession } = require('@/lib/apiAuth')

const authed = { authorized: true, session: { user: { staffId: 'S001' } } }

// builds a thenable Supabase chain that resolves to the given result
function makeChain(result: any) {
  const chain: any = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    is: jest.fn().mockReturnThis(),
    maybeSingle: jest.fn().mockResolvedValue(result),
    then: (resolve: any, reject: any) => Promise.resolve(result).then(resolve, reject)
  }
  return chain
}

function makeRequest(params: Record<string, string>) {
  const url = new URL('http://localhost/api/check')
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
  return new NextRequest(url.toString())
}

describe('GET /api/check', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    validateSession.mockResolvedValue(authed)
  })

  // unauthenticated users must be blocked
  it('returns the auth error response when not authorized', async () => {
    const unauthed = {
      authorized: false,
      response: new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
    }
    validateSession.mockResolvedValue(unauthed)
    const req = makeRequest({ table: 'Asset', id: 'A001' })
    const res = await GET(req)
    expect(res.status).toBe(401)
  })

  // table name not in the allowlist should be rejected
  it('returns 400 when the table name is not allowed', async () => {
    const req = makeRequest({ table: 'Users', id: 'U001' })
    const res = await GET(req)
    const body = await res.json()
    expect(res.status).toBe(400)
    expect(body.error).toBe('Invalid query parameters')
  })

  // id is required, missing it should give 400
  it('returns 400 when id is missing', async () => {
    const req = makeRequest({ table: 'Asset' })
    const res = await GET(req)
    expect(res.status).toBe(400)
  })

  // id with special characters (spaces, slashes) should be rejected
  it('returns 400 when id contains invalid characters', async () => {
    const req = makeRequest({ table: 'Asset', id: 'bad id!' })
    const res = await GET(req)
    expect(res.status).toBe(400)
  })

  // when the record exists, the API should say so
  it('returns { exists: true } when the Asset record is found', async () => {
    supabaseAdmin.from.mockReturnValue(makeChain({ data: { asset_id: 'A001' }, error: null }))
    const req = makeRequest({ table: 'Asset', id: 'A001' })
    const res = await GET(req)
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.exists).toBe(true)
  })

  // when no record is found, exists should be false
  it('returns { exists: false } when the Asset record is not found', async () => {
    supabaseAdmin.from.mockReturnValue(makeChain({ data: null, error: null }))
    const req = makeRequest({ table: 'Asset', id: 'MISSING' })
    const res = await GET(req)
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.exists).toBe(false)
  })

  // should also work for Location table
  it('returns { exists: true } for a Location record', async () => {
    supabaseAdmin.from.mockReturnValue(makeChain({ data: { location_id: 'L001' }, error: null }))
    const req = makeRequest({ table: 'Location', id: 'L001' })
    const res = await GET(req)
    const body = await res.json()
    expect(body.exists).toBe(true)
  })

  // should also work for Department table
  it('returns { exists: true } for a Department record', async () => {
    supabaseAdmin.from.mockReturnValue(makeChain({ data: { department_id: 'IT' }, error: null }))
    const req = makeRequest({ table: 'Department', id: 'IT' })
    const res = await GET(req)
    const body = await res.json()
    expect(body.exists).toBe(true)
  })

  // database failure should return 500
  it('returns 500 on a Supabase error', async () => {
    supabaseAdmin.from.mockReturnValue(makeChain({ data: null, error: { message: 'DB error' } }))
    const req = makeRequest({ table: 'Asset', id: 'A001' })
    const res = await GET(req)
    expect(res.status).toBe(500)
  })

  // an unexpected throw should be caught by the outer catch block and return 500
  it('returns 500 when supabase throws unexpectedly', async () => {
    supabaseAdmin.from.mockImplementation(() => {
      throw new Error('Unexpected crash')
    })
    const req = makeRequest({ table: 'Asset', id: 'A001' })
    const res = await GET(req)
    expect(res.status).toBe(500)
  })
})