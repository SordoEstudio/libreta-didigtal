import { describe, it, expect } from 'vitest'
import { ok, created, noContent, Err } from '@/lib/api'

async function json(res: Response) {
  return res.json()
}

describe('ok()', () => {
  it('returns status 200', () => {
    const res = ok({ id: '1' })
    expect(res.status).toBe(200)
  })

  it('wraps data in { data }', async () => {
    const res = ok({ id: '1', name: 'test' })
    const body = await json(res)
    expect(body.data).toEqual({ id: '1', name: 'test' })
  })

  it('includes meta when provided', async () => {
    const res = ok([1, 2, 3], { total: 3, page: 1 })
    const body = await json(res)
    expect(body.meta).toEqual({ total: 3, page: 1 })
  })

  it('omits meta when not provided', async () => {
    const res = ok({ id: '1' })
    const body = await json(res)
    expect(body.meta).toBeUndefined()
  })
})

describe('created()', () => {
  it('returns status 201', () => {
    const res = created({ id: 'new' })
    expect(res.status).toBe(201)
  })

  it('wraps data in { data }', async () => {
    const res = created({ id: 'new' })
    const body = await json(res)
    expect(body.data).toEqual({ id: 'new' })
  })
})

describe('noContent()', () => {
  it('returns status 204', () => {
    const res = noContent()
    expect(res.status).toBe(204)
  })
})

describe('Err.*', () => {
  it('unauthorized() returns 401', () => {
    expect(Err.unauthorized().status).toBe(401)
  })

  it('forbidden() returns 403', () => {
    expect(Err.forbidden().status).toBe(403)
  })

  it('notFound() returns 404', () => {
    expect(Err.notFound().status).toBe(404)
  })

  it('validation() returns 422', () => {
    expect(Err.validation('bad input').status).toBe(422)
  })

  it('conflict() returns 409', () => {
    expect(Err.conflict('already exists').status).toBe(409)
  })

  it('server() returns 500', () => {
    expect(Err.server().status).toBe(500)
  })

  it('error response has { error: { code, message } }', async () => {
    const res = Err.unauthorized()
    const body = await json(res)
    expect(body.error).toHaveProperty('code', 'UNAUTHORIZED')
    expect(body.error).toHaveProperty('message')
  })

  it('validation() includes provided message', async () => {
    const res = Err.validation('campo requerido')
    const body = await json(res)
    expect(body.error.message).toBe('campo requerido')
  })
})
