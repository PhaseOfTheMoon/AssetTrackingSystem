/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server'
import { GET, PUT } from '@/app/api/assets/[id]/route'

jest.mock('@/lib/supabase/server', () => ({
  supabaseAdmin: { from: jest.fn() }
}))

jest.mock('@/lib/apiAuth', () => ({
  validateSession: jest.fn()
}))

const { supabaseAdmin } = require('@/lib/supabase/server')
const { validateSession } = require('@/lib/apiAuth')

const authed = { authorized: true, session: { user: { staffId: 'S001' } } }
const authedAdmin = { authorized: true, session: { user: { staffId: 'ADMIN01', role: 'admin' } } }

function makeChain(result: any) {
  const chain: any = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    is: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue(result),
    then: (resolve: any, reject: any) => Promise.resolve(result).then(resolve, reject)
  }
  return chain
}

// wraps the [id] params as Next.js App Router expects them
function makeParams(id: string) {
  return { params: Promise.resolve({ id }) }
}

describe('GET /api/assets/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    validateSession.mockResolvedValue(authed)
  })

  // unauthenticated users must not see individual assets
  it('returns the auth error response when not authorized', async () => {
    const unauthed = {
      authorized: false,
      response: new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
    }
    validateSession.mockResolvedValue(unauthed)
    const req = new NextRequest('http://localhost/api/assets/A001')
    const res = await GET(req, makeParams('A001'))
    expect(res.status).toBe(401)
  })

  // a valid ID should return the asset with its joined location and department
  it('returns the asset when found', async () => {
    supabaseAdmin.from.mockReturnValue(
      makeChain({ data: { asset_id: 'A001', name: 'Laptop' }, error: null })
    )
    const req = new NextRequest('http://localhost/api/assets/A001')
    const res = await GET(req, makeParams('A001'))
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.data.asset_id).toBe('A001')
  })

  // a database error should return 400
  it('returns 400 when Supabase returns an error', async () => {
    supabaseAdmin.from.mockReturnValue(
      makeChain({ data: null, error: { message: 'No rows found' } })
    )
    const req = new NextRequest('http://localhost/api/assets/MISSING')
    const res = await GET(req, makeParams('MISSING'))
    const body = await res.json()
    expect(res.status).toBe(400)
    expect(body.success).toBe(false)
  })

  // an unexpected throw should be caught and return 500
  it('returns 500 when supabase throws during GET', async () => {
    supabaseAdmin.from.mockImplementation(() => {
      throw new Error('Unexpected crash')
    })
    const req = new NextRequest('http://localhost/api/assets/A001')
    const res = await GET(req, makeParams('A001'))
    expect(res.status).toBe(500)
  })
})

describe('PUT /api/assets/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  // only admins can update individual assets
  it('returns the auth error response when not an admin', async () => {
    const unauthed = {
      authorized: false,
      response: new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 })
    }
    validateSession.mockResolvedValue(unauthed)
    const req = new NextRequest('http://localhost/api/assets/A001', {
      method: 'PUT',
      body: JSON.stringify({ name: 'Updated Laptop' }),
      headers: { 'Content-Type': 'application/json' }
    })
    const res = await PUT(req, makeParams('A001'))
    expect(res.status).toBe(403)
  })

  // a valid update body should return the updated asset
  it('returns the updated asset on success', async () => {
    validateSession.mockResolvedValue(authedAdmin)
    supabaseAdmin.from.mockReturnValue(
      makeChain({ data: { asset_id: 'A001', name: 'Updated Laptop' }, error: null })
    )
    const req = new NextRequest('http://localhost/api/assets/A001', {
      method: 'PUT',
      body: JSON.stringify({ name: 'Updated Laptop' }),
      headers: { 'Content-Type': 'application/json' }
    })
    const res = await PUT(req, makeParams('A001'))
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.data.name).toBe('Updated Laptop')
  })

  // a Supabase error during update should return 400
  it('returns 400 when Supabase returns an error', async () => {
    validateSession.mockResolvedValue(authedAdmin)
    supabaseAdmin.from.mockReturnValue(
      makeChain({ data: null, error: { message: 'Update failed' } })
    )
    const req = new NextRequest('http://localhost/api/assets/A001', {
      method: 'PUT',
      body: JSON.stringify({ name: 'Bad Update' }),
      headers: { 'Content-Type': 'application/json' }
    })
    const res = await PUT(req, makeParams('A001'))
    const body = await res.json()
    expect(res.status).toBe(400)
    expect(body.success).toBe(false)
  })

  // an unexpected crash should return 500
  it('returns 500 on an unexpected error', async () => {
    validateSession.mockResolvedValue(authedAdmin)
    supabaseAdmin.from.mockImplementation(() => {
      throw new Error('Unexpected crash')
    })
    const req = new NextRequest('http://localhost/api/assets/A001', {
      method: 'PUT',
      body: JSON.stringify({ name: 'Crash Test' }),
      headers: { 'Content-Type': 'application/json' }
    })
    const res = await PUT(req, makeParams('A001'))
    expect(res.status).toBe(500)
  })
})
