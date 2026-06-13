import { POST } from '@/app/api/auth/logout/route'

// track which cookies were set
const mockCookiesSet = jest.fn()

jest.mock('next/server', () => ({
  NextRequest: jest.fn(),
  NextResponse: {
    json: (body: any, init?: any) => ({
      json: async () => body,
      status: init?.status ?? 200,
      cookies: { set: mockCookiesSet },
    }),
  },
}))

describe('POST /api/auth/logout', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  /** should return success true and the redirect path */
  it('returns success true with redirectTo /login', async () => {
    const res = await POST({} as any)
    const body = await res.json()

    expect(body.success).toBe(true)
    expect(body.redirectTo).toBe('/login')
  })

  /** should clear the user_session cookie */
  it('clears the user_session cookie', async () => {
    await POST({} as any)

    expect(mockCookiesSet).toHaveBeenCalledWith('user_session', '', expect.objectContaining({ maxAge: 0 }))
  })

  /** should clear the nextauth session token cookie */
  it('clears the next-auth.session-token cookie', async () => {
    await POST({} as any)

    expect(mockCookiesSet).toHaveBeenCalledWith('next-auth.session-token', '', expect.objectContaining({ maxAge: 0 }))
  })

  /** should clear the secure nextauth session token cookie for production */
  it('clears the __Secure-next-auth.session-token cookie', async () => {
    await POST({} as any)

    expect(mockCookiesSet).toHaveBeenCalledWith('__Secure-next-auth.session-token', '', expect.objectContaining({ maxAge: 0 }))
  })

  /** should clear the callback url cookie */
  it('clears the next-auth.callback-url cookie', async () => {
    await POST({} as any)

    expect(mockCookiesSet).toHaveBeenCalledWith('next-auth.callback-url', '', expect.objectContaining({ maxAge: 0 }))
  })

  /** all 4 cookies should be cleared in one call */
  it('clears all 4 cookies on logout', async () => {
    await POST({} as any)

    expect(mockCookiesSet).toHaveBeenCalledTimes(4)
  })

  /** even if an error is thrown inside, should still return success and clear cookies */
  it('still returns success and clears cookies when an error occurs', async () => {
    // force an error by making cookies.set throw on first call only
    mockCookiesSet.mockImplementationOnce(() => { throw new Error('cookie error') })

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation()

    const res = await POST({} as any)
    const body = await res.json()

    expect(body.success).toBe(true)
    expect(consoleSpy).toHaveBeenCalledWith('Logout error:', expect.any(Error))

    consoleSpy.mockRestore()
  })
})
