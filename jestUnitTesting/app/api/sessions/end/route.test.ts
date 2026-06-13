import { POST } from '@/app/api/sessions/end/route'

const mockCookiesSet = jest.fn()

jest.mock('next/server', () => ({
  NextResponse: {
    json: (body: any) => ({
      json: async () => body,
      cookies: { set: mockCookiesSet },
    }),
  },
}))

describe('POST /api/sessions/end', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  /** should return success true on normal logout */
  it('returns success true on logout', async () => {
    const res = await POST()
    const body = await res.json()

    expect(body.success).toBe(true)
    expect(body.message).toBe('Logged out successfully')
  })

  /** should clear the user_session cookie */
  it('clears the user_session cookie', async () => {
    await POST()

    expect(mockCookiesSet).toHaveBeenCalledWith('user_session', '', expect.objectContaining({ maxAge: 0 }))
  })

  /** even if an error occurs inside, should still return success and clear cookie */
  it('still returns success and clears cookie when an error occurs', async () => {
    mockCookiesSet.mockImplementationOnce(() => { throw new Error('cookie error') })

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation()

    const res = await POST()
    const body = await res.json()

    expect(body.success).toBe(true)
    expect(consoleSpy).toHaveBeenCalledWith('Logout error:', expect.any(Error))

    consoleSpy.mockRestore()
  })
})
