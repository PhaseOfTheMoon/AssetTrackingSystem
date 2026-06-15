/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server'
import { GET, POST } from '@/app/api/scanner/route'

jest.mock('@/lib/supabase/server', () => ({
  supabaseAdmin: { from: jest.fn() }
}))

jest.mock('@/lib/apiAuth', () => ({
  validateSession: jest.fn()
}))

const { supabaseAdmin } = require('@/lib/supabase/server')
const { validateSession } = require('@/lib/apiAuth')

const authed = { authorized: true, session: { user: { staffId: 'S001' } } }

function makeChain(result: any) {
  const chain: any = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    is: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue(result),
    maybeSingle: jest.fn().mockResolvedValue(result),
    then: (resolve: any, reject: any) => Promise.resolve(result).then(resolve, reject)
  }
  return chain
}

function makePostRequest(body: object) {
  return new NextRequest('http://localhost/api/scanner', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' }
  })
}

// GET

describe('GET /api/scanner', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    validateSession.mockResolvedValue(authed)
  })

  // unauthenticated users must not use the scanner
  it('returns the auth error response when not authorized', async () => {
    const unauthed = {
      authorized: false,
      response: new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
    }
    validateSession.mockResolvedValue(unauthed)
    const req = new NextRequest(
      'http://localhost/api/scanner?table=Asset&idColumn=asset_id&scannedCode=A001'
    )
    const res = await GET(req)
    expect(res.status).toBe(401)
  })

  // missing or invalid query params should return 400
  it('returns 400 when query parameters are invalid', async () => {
    const req = new NextRequest('http://localhost/api/scanner?table=Unknown&idColumn=bad')
    const res = await GET(req)
    const body = await res.json()
    expect(res.status).toBe(400)
    expect(body.error).toBe('Invalid request parameters')
  })

  // a valid scan should return the matched record
  it('returns the scanned record on success', async () => {
    supabaseAdmin.from.mockReturnValue(
      makeChain({ data: { asset_id: 'A001', name: 'Laptop' }, error: null })
    )
    const req = new NextRequest(
      'http://localhost/api/scanner?table=Asset&idColumn=asset_id&scannedCode=A001'
    )
    const res = await GET(req)
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.data.asset_id).toBe('A001')
  })

  // when the scanned code is not found, data should be null but still succeed
  it('returns success with null data when the record is not found', async () => {
    supabaseAdmin.from.mockReturnValue(makeChain({ data: null, error: null }))
    const req = new NextRequest(
      'http://localhost/api/scanner?table=Asset&idColumn=asset_id&scannedCode=MISSING'
    )
    const res = await GET(req)
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.data).toBeNull()
  })

  // a database error should return 500
  it('returns 500 on a database error', async () => {
    supabaseAdmin.from.mockReturnValue(makeChain({ data: null, error: { message: 'DB error' } }))
    const req = new NextRequest(
      'http://localhost/api/scanner?table=Asset&idColumn=asset_id&scannedCode=A001'
    )
    const res = await GET(req)
    expect(res.status).toBe(500)
  })
})

// POST

describe('POST /api/scanner', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    validateSession.mockResolvedValue(authed)
  })

  // unauthenticated users must not use the scanner
  it('returns the auth error response when not authorized', async () => {
    const unauthed = {
      authorized: false,
      response: new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
    }
    validateSession.mockResolvedValue(unauthed)
    const req = makePostRequest({ action: 'count_staff_assets', staffId: 'S001' })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  // wrong Content-Type should return 415
  it('returns 415 when Content-Type is not application/json', async () => {
    const req = new NextRequest('http://localhost/api/scanner', {
      method: 'POST',
      body: 'plain text',
      headers: { 'Content-Type': 'text/plain' }
    })
    const res = await POST(req)
    const body = await res.json()
    expect(res.status).toBe(415)
    expect(body.error).toBe('Content-Type must be application/json')
  })

  // malformed JSON should return 400
  it('returns 400 when the body is not valid JSON', async () => {
    const req = new NextRequest('http://localhost/api/scanner', {
      method: 'POST',
      body: 'not-json',
      headers: { 'Content-Type': 'application/json' }
    })
    const res = await POST(req)
    const body = await res.json()
    expect(res.status).toBe(400)
    expect(body.error).toBe('Invalid JSON body')
  })

  // an action that doesn't match any known operation should return 400
  it('returns 400 for an unknown action', async () => {
    const req = makePostRequest({ action: 'do_something_weird' })
    const res = await POST(req)
    const body = await res.json()
    expect(res.status).toBe(400)
    expect(body.error).toBe('Unknown action')
  })

  // count_staff_assets

  it('returns the asset count for a staff member', async () => {
    supabaseAdmin.from.mockReturnValue(makeChain({ count: 3, error: null }))
    const req = makePostRequest({ action: 'count_staff_assets', staffId: 'S001' })
    const res = await POST(req)
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.count).toBe(3)
  })

  it('returns 400 when count_staff_assets is missing staffId', async () => {
    const req = makePostRequest({ action: 'count_staff_assets' })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  // check_asset_assignment

  it('returns assignment data for an asset', async () => {
    supabaseAdmin.from.mockReturnValue(
      makeChain({ data: [{ id: 'SA001', staff_id: 'S001', asset_id: 'A001' }], error: null })
    )
    const req = makePostRequest({ action: 'check_asset_assignment', assetId: 'A001' })
    const res = await POST(req)
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.data).toHaveLength(1)
  })

  it('returns 400 when check_asset_assignment is missing assetId', async () => {
    const req = makePostRequest({ action: 'check_asset_assignment' })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  // assign

  it('assigns an asset to a staff member and returns success', async () => {
    supabaseAdmin.from.mockReturnValue(makeChain({ error: null }))
    const req = makePostRequest({ action: 'assign', staffId: 'S001', assetId: 'A001' })
    const res = await POST(req)
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.success).toBe(true)
  })

  it('returns 400 when assign is missing required fields', async () => {
    const req = makePostRequest({ action: 'assign', staffId: 'S001' }) // missing assetId
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  // unassign

  it('unassigns an asset by assignment ID and returns success', async () => {
    supabaseAdmin.from.mockReturnValue(makeChain({ error: null }))
    const req = makePostRequest({ action: 'unassign', assignmentId: 'SA001' })
    const res = await POST(req)
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.success).toBe(true)
  })

  it('returns 400 when unassign is missing assignmentId', async () => {
    const req = makePostRequest({ action: 'unassign' })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  // tag_asset

  it('tags an asset to a location and returns success', async () => {
    supabaseAdmin.from.mockReturnValue(makeChain({ error: null }))
    const req = makePostRequest({
      action: 'tag_asset',
      assetId: 'A001',
      field: 'location_id',
      value: 'L001'
    })
    const res = await POST(req)
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.success).toBe(true)
  })

  it('tags an asset to a department and returns success', async () => {
    supabaseAdmin.from.mockReturnValue(makeChain({ error: null }))
    const req = makePostRequest({
      action: 'tag_asset',
      assetId: 'A001',
      field: 'department_id',
      value: 'IT'
    })
    const res = await POST(req)
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.success).toBe(true)
  })

  it('returns 400 when tag_asset uses a disallowed field', async () => {
    const req = makePostRequest({
      action: 'tag_asset',
      assetId: 'A001',
      field: 'name', // not allowed
      value: 'Hacked'
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  // create_asset

  it('creates a new asset and returns success', async () => {
    supabaseAdmin.from.mockReturnValue(makeChain({ error: null }))
    const req = makePostRequest({
      action: 'create_asset',
      asset_id: 'A999',
      name: 'New Laptop',
      condition: 'In-use',
      category: 'IT',
      model: 'X1'
    })
    const res = await POST(req)
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.success).toBe(true)
  })

  it('returns 400 when create_asset is missing required fields', async () => {
    const req = makePostRequest({
      action: 'create_asset',
      asset_id: 'A999'
      // missing name, condition, category, model
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  // DB error branches

  it('returns 500 when count_staff_assets DB call fails', async () => {
    supabaseAdmin.from.mockReturnValue(makeChain({ count: null, error: { message: 'DB error' } }))
    const req = makePostRequest({ action: 'count_staff_assets', staffId: 'S001' })
    const res = await POST(req)
    expect(res.status).toBe(500)
  })

  it('returns 500 when check_asset_assignment DB call fails', async () => {
    supabaseAdmin.from.mockReturnValue(makeChain({ data: null, error: { message: 'DB error' } }))
    const req = makePostRequest({ action: 'check_asset_assignment', assetId: 'A001' })
    const res = await POST(req)
    expect(res.status).toBe(500)
  })

  it('returns 500 when assign DB call fails', async () => {
    supabaseAdmin.from.mockReturnValue(makeChain({ error: { message: 'DB error' } }))
    const req = makePostRequest({ action: 'assign', staffId: 'S001', assetId: 'A001' })
    const res = await POST(req)
    expect(res.status).toBe(500)
  })

  it('returns 500 when unassign DB call fails', async () => {
    supabaseAdmin.from.mockReturnValue(makeChain({ error: { message: 'DB error' } }))
    const req = makePostRequest({ action: 'unassign', assignmentId: 'SA001' })
    const res = await POST(req)
    expect(res.status).toBe(500)
  })

  it('returns 500 when tag_asset DB call fails', async () => {
    supabaseAdmin.from.mockReturnValue(makeChain({ error: { message: 'DB error' } }))
    const req = makePostRequest({
      action: 'tag_asset',
      assetId: 'A001',
      field: 'location_id',
      value: 'L001'
    })
    const res = await POST(req)
    expect(res.status).toBe(500)
  })

  it('returns 500 when create_asset DB call fails', async () => {
    supabaseAdmin.from.mockReturnValue(makeChain({ error: { message: 'DB error' } }))
    const req = makePostRequest({
      action: 'create_asset',
      asset_id: 'A999',
      name: 'Laptop',
      condition: 'In-use',
      category: 'IT',
      model: 'X1'
    })
    const res = await POST(req)
    expect(res.status).toBe(500)
  })
})