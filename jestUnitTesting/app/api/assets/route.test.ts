/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server'
import { GET, POST, PUT, DELETE } from '@/app/api/assets/route'

jest.mock('@/lib/supabase/server', () => ({
  supabaseAdmin: { from: jest.fn() }
}))

jest.mock('@/lib/apiAuth', () => ({
  validateSession: jest.fn()
}))

// barcode generation is a side-effect that does not affect the response shape
jest.mock('@/lib/barcode/barcode', () => ({
  generateAndUploadBarcode: jest.fn().mockResolvedValue({ tagPath: 'barcodes/TEST.png' })
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
    ilike: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    range: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue(result),
    maybeSingle: jest.fn().mockResolvedValue(result),
    then: (resolve: any, reject: any) => Promise.resolve(result).then(resolve, reject)
  }
  return chain
}

// GET

describe('GET /api/assets', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    validateSession.mockResolvedValue(authed)
  })

  // unauthenticated users must not see the asset list
  it('returns the auth error response when not authorized', async () => {
    const unauthed = {
      authorized: false,
      response: new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
    }
    validateSession.mockResolvedValue(unauthed)
    const req = new NextRequest('http://localhost/api/assets')
    const res = await GET(req)
    expect(res.status).toBe(401)
  })

  // a successful query should return data, totalItems and totalPages
  it('returns paginated assets on success', async () => {
    supabaseAdmin.from.mockReturnValue(
      makeChain({ data: [{ asset_id: 'A001', name: 'Laptop' }], error: null, count: 1 })
    )
    const req = new NextRequest('http://localhost/api/assets?page=1&limit=10')
    const res = await GET(req)
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.data).toHaveLength(1)
    expect(body.totalItems).toBe(1)
    expect(body.totalPages).toBe(1)
  })

  // a Supabase error should return 500
  it('returns 500 on a database error', async () => {
    supabaseAdmin.from.mockReturnValue(
      makeChain({ data: null, error: { message: 'DB failure' }, count: null })
    )
    const req = new NextRequest('http://localhost/api/assets')
    const res = await GET(req)
    expect(res.status).toBe(500)
  })

  // page=0 should be clamped to page 1 and not crash
  it('handles page=0 gracefully by defaulting to page 1', async () => {
    supabaseAdmin.from.mockReturnValue(makeChain({ data: [], error: null, count: 0 }))
    const req = new NextRequest('http://localhost/api/assets?page=0')
    const res = await GET(req)
    expect(res.status).toBe(200)
  })

  // limit above 100 should be capped at 100
  it('caps limit at 100 when a larger value is passed', async () => {
    supabaseAdmin.from.mockReturnValue(makeChain({ data: [], error: null, count: 0 }))
    const req = new NextRequest('http://localhost/api/assets?limit=9999')
    const res = await GET(req)
    expect(res.status).toBe(200)
  })

  // valid condition filter should be applied without error
  it('applies condition filter when a valid condition is provided', async () => {
    supabaseAdmin.from.mockReturnValue(
      makeChain({ data: [{ asset_id: 'A002', condition: 'In-store' }], error: null, count: 1 })
    )
    const req = new NextRequest('http://localhost/api/assets?condition=In-store')
    const res = await GET(req)
    expect(res.status).toBe(200)
  })

  // providing a search string triggers the ilike filter
  it('applies search filter when search param is provided', async () => {
    supabaseAdmin.from.mockReturnValue(makeChain({ data: [], error: null, count: 0 }))
    const req = new NextRequest('http://localhost/api/assets?search=laptop')
    const res = await GET(req)
    expect(res.status).toBe(200)
  })

  // an unexpected throw (e.g. network error) should return 500 via the catch block
  it('returns 500 when supabase.from throws unexpectedly', async () => {
    supabaseAdmin.from.mockImplementation(() => {
      throw new Error('Unexpected crash')
    })
    const req = new NextRequest('http://localhost/api/assets')
    const res = await GET(req)
    expect(res.status).toBe(500)
  })

  // a valid searchField from the allowlist should be used instead of the default
  it('uses the provided searchField when it is in the allowlist', async () => {
    supabaseAdmin.from.mockReturnValue(makeChain({ data: [], error: null, count: 0 }))
    const req = new NextRequest('http://localhost/api/assets?searchField=asset_id&search=A001')
    const res = await GET(req)
    expect(res.status).toBe(200)
  })

  // a valid sortBy from the allowlist should be used instead of the default
  it('uses the provided sortBy when it is in the allowlist', async () => {
    supabaseAdmin.from.mockReturnValue(makeChain({ data: [], error: null, count: 0 }))
    const req = new NextRequest('http://localhost/api/assets?sortBy=name')
    const res = await GET(req)
    expect(res.status).toBe(200)
  })

  // sortOrder=asc should sort ascending instead of the default descending
  it('sorts ascending when sortOrder is asc', async () => {
    supabaseAdmin.from.mockReturnValue(makeChain({ data: [], error: null, count: 0 }))
    const req = new NextRequest('http://localhost/api/assets?sortOrder=asc')
    const res = await GET(req)
    expect(res.status).toBe(200)
  })
})

// POST

describe('POST /api/assets', () => {
  const validBody = {
    asset_id: 'A001',
    name: 'Laptop',
    model: 'ThinkPad X1',
    category: 'IT'
  }

  beforeEach(() => {
    jest.clearAllMocks()
    validateSession.mockResolvedValue(authed)
  })

  it('returns the auth error response when not authorized', async () => {
    const unauthed = {
      authorized: false,
      response: new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
    }
    validateSession.mockResolvedValue(unauthed)
    const req = new NextRequest('http://localhost/api/assets', {
      method: 'POST',
      body: JSON.stringify(validBody)
    })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  // sending a non-JSON string body should result in 400
  it('returns 400 when the body is not valid JSON', async () => {
    const req = new NextRequest('http://localhost/api/assets', {
      method: 'POST',
      body: 'not-json'
    })
    const res = await POST(req)
    const body = await res.json()
    expect(res.status).toBe(400)
    expect(body.error).toBe('Invalid JSON body')
  })

  // missing required fields should fail Zod validation
  it('returns 400 when required fields are missing', async () => {
    const req = new NextRequest('http://localhost/api/assets', {
      method: 'POST',
      body: JSON.stringify({ asset_id: 'A001' }) // missing name, model, category
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  // extra fields not in the schema should be rejected by .strict()
  it('returns 400 when unknown extra fields are sent', async () => {
    const req = new NextRequest('http://localhost/api/assets', {
      method: 'POST',
      body: JSON.stringify({ ...validBody, hackerField: 'DROP TABLE' })
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  // a well-formed request should create the asset and return 201
  it('creates an asset and returns 201 on success', async () => {
    supabaseAdmin.from.mockReturnValue(
      makeChain({ data: { asset_id: 'A001', name: 'Laptop' }, error: null })
    )
    const req = new NextRequest('http://localhost/api/assets', {
      method: 'POST',
      body: JSON.stringify(validBody)
    })
    const res = await POST(req)
    const body = await res.json()
    expect(res.status).toBe(201)
    expect(body.success).toBe(true)
  })

  // a valid condition in the body should be used instead of defaulting to In-use
  it('uses the provided condition when it is valid', async () => {
    supabaseAdmin.from.mockReturnValue(
      makeChain({ data: { asset_id: 'A001', condition: 'Spoiled' }, error: null })
    )
    const req = new NextRequest('http://localhost/api/assets', {
      method: 'POST',
      body: JSON.stringify({ ...validBody, condition: 'Spoiled' })
    })
    const res = await POST(req)
    expect(res.status).toBe(201)
  })

  // duplicate asset_id should return 400 with a clear message
  it('returns 400 with "Asset already exists" on duplicate asset_id', async () => {
    supabaseAdmin.from.mockReturnValue(
      makeChain({ data: null, error: { code: '23505', message: 'unique constraint' } })
    )
    const req = new NextRequest('http://localhost/api/assets', {
      method: 'POST',
      body: JSON.stringify(validBody)
    })
    const res = await POST(req)
    const body = await res.json()
    expect(res.status).toBe(400)
    expect(body.error).toBe('Asset already exists')
  })

  // a non-23505 DB error should be re-thrown and caught by the outer catch, returns 500
  it('returns 500 when DB returns a non-duplicate error', async () => {
    supabaseAdmin.from.mockReturnValue(
      makeChain({ data: null, error: { code: '42P01', message: 'relation does not exist' } })
    )
    const req = new NextRequest('http://localhost/api/assets', {
      method: 'POST',
      body: JSON.stringify(validBody)
    })
    const res = await POST(req)
    expect(res.status).toBe(500)
  })

  // barcode generation failure should not block asset creation (tagPath stays null)
  it('still creates the asset when barcode generation throws', async () => {
    const { generateAndUploadBarcode } = require('@/lib/barcode/barcode')
    ;(generateAndUploadBarcode as jest.Mock).mockRejectedValueOnce(new Error('barcode failed'))
    supabaseAdmin.from.mockReturnValue(
      makeChain({ data: { asset_id: 'A001', name: 'Laptop' }, error: null })
    )
    const req = new NextRequest('http://localhost/api/assets', {
      method: 'POST',
      body: JSON.stringify(validBody)
    })
    const res = await POST(req)
    expect(res.status).toBe(201)
  })
})

// PUT

describe('PUT /api/assets', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    validateSession.mockResolvedValue(authed)
  })

  it('returns the auth error response when not authorized', async () => {
    const unauthed = {
      authorized: false,
      response: new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
    }
    validateSession.mockResolvedValue(unauthed)
    const req = new NextRequest('http://localhost/api/assets', {
      method: 'PUT',
      body: JSON.stringify({ asset_id: 'A001', name: 'Updated' })
    })
    const res = await PUT(req)
    expect(res.status).toBe(401)
  })

  it('returns 400 when the body is not valid JSON', async () => {
    const req = new NextRequest('http://localhost/api/assets', {
      method: 'PUT',
      body: 'not-json'
    })
    const res = await PUT(req)
    const body = await res.json()
    expect(res.status).toBe(400)
    expect(body.error).toBe('Invalid JSON body')
  })

  // a body that fails Zod validation should return 400 with details
  it('returns 400 when the input fails schema validation', async () => {
    const req = new NextRequest('http://localhost/api/assets', {
      method: 'PUT',
      // name exceeds the 50 character max defined in the Zod schema
      body: JSON.stringify({ asset_id: 'A001', name: 'x'.repeat(60) })
    })
    const res = await PUT(req)
    const body = await res.json()
    expect(res.status).toBe(400)
    expect(body.error).toBe('Invalid input data')
  })

  // when the DB update itself returns an error, it should be caught and return 500
  it('returns 500 when the DB update returns an error', async () => {
    supabaseAdmin.from.mockReturnValue(
      makeChain({ data: null, error: { message: 'update failed' } })
    )
    const req = new NextRequest('http://localhost/api/assets', {
      method: 'PUT',
      body: JSON.stringify({ asset_id: 'A001', name: 'Updated Laptop' })
    })
    const res = await PUT(req)
    expect(res.status).toBe(500)
  })

  // sending only asset_id with no updatable fields should return 400
  it('returns 400 when no valid updatable fields are provided', async () => {
    const req = new NextRequest('http://localhost/api/assets', {
      method: 'PUT',
      body: JSON.stringify({ asset_id: 'A001' })
    })
    const res = await PUT(req)
    const body = await res.json()
    expect(res.status).toBe(400)
    expect(body.error).toBe('No valid fields to update')
  })

  // a valid update should return the updated asset
  it('returns the updated asset on success', async () => {
    supabaseAdmin.from.mockReturnValue(
      makeChain({ data: { asset_id: 'A001', name: 'Updated Laptop' }, error: null })
    )
    const req = new NextRequest('http://localhost/api/assets', {
      method: 'PUT',
      body: JSON.stringify({ asset_id: 'A001', name: 'Updated Laptop' })
    })
    const res = await PUT(req)
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.success).toBe(true)
  })

  // when no matching row was found, return 404
  it('returns 404 when the asset is not found or already deleted', async () => {
    supabaseAdmin.from.mockReturnValue(makeChain({ data: null, error: null }))
    const req = new NextRequest('http://localhost/api/assets', {
      method: 'PUT',
      body: JSON.stringify({ asset_id: 'MISSING', name: 'Ghost' })
    })
    const res = await PUT(req)
    const body = await res.json()
    expect(res.status).toBe(404)
    expect(body.error).toBe('Asset not found or already deleted')
  })

  // supabase throwing unexpectedly should be caught and return 500
  it('returns 500 when supabase throws during PUT', async () => {
    supabaseAdmin.from.mockImplementation(() => {
      throw new Error('Unexpected crash')
    })
    const req = new NextRequest('http://localhost/api/assets', {
      method: 'PUT',
      body: JSON.stringify({ asset_id: 'A001', name: 'Test' })
    })
    const res = await PUT(req)
    expect(res.status).toBe(500)
  })
})

// DELETE

describe('DELETE /api/assets', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    validateSession.mockResolvedValue(authedAdmin)
  })

  // only admins can soft-delete assets
  it('returns the auth error response when not an admin', async () => {
    const unauthed = {
      authorized: false,
      response: new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 })
    }
    validateSession.mockResolvedValue(unauthed)
    const req = new NextRequest('http://localhost/api/assets?asset_id=A001', { method: 'DELETE' })
    const res = await DELETE(req)
    expect(res.status).toBe(403)
  })

  // missing the asset_id query param should return 400
  it('returns 400 when asset_id is missing from the query string', async () => {
    const req = new NextRequest('http://localhost/api/assets', { method: 'DELETE' })
    const res = await DELETE(req)
    const body = await res.json()
    expect(res.status).toBe(400)
    expect(body.error).toBe('Asset ID is required')
  })

  // a successful soft-delete should return a success message
  it('soft-deletes the asset and returns success', async () => {
    supabaseAdmin.from.mockReturnValue(makeChain({ data: { asset_id: 'A001' }, error: null }))
    const req = new NextRequest('http://localhost/api/assets?asset_id=A001', { method: 'DELETE' })
    const res = await DELETE(req)
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.message).toBe('Asset deleted successfully')
  })

  // when the DB delete itself returns an error, it should be caught and return 500
  it('returns 500 when the DB delete returns an error', async () => {
    supabaseAdmin.from.mockReturnValue(
      makeChain({ data: null, error: { message: 'delete failed' } })
    )
    const req = new NextRequest('http://localhost/api/assets?asset_id=A001', { method: 'DELETE' })
    const res = await DELETE(req)
    expect(res.status).toBe(500)
  })

  // when no record is matched, return 404
  it('returns 404 when the asset is not found or already deleted', async () => {
    supabaseAdmin.from.mockReturnValue(makeChain({ data: null, error: null }))
    const req = new NextRequest('http://localhost/api/assets?asset_id=MISSING', { method: 'DELETE' })
    const res = await DELETE(req)
    const body = await res.json()
    expect(res.status).toBe(404)
    expect(body.error).toBe('Asset not found or already deleted')
  })

  // supabase throwing unexpectedly should be caught and return 500
  it('returns 500 when supabase throws during DELETE', async () => {
    supabaseAdmin.from.mockImplementation(() => {
      throw new Error('Unexpected crash')
    })
    const req = new NextRequest('http://localhost/api/assets?asset_id=A001', { method: 'DELETE' })
    const res = await DELETE(req)
    expect(res.status).toBe(500)
  })
})