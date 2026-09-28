import { describe, it, expect } from 'vitest'
import { isSuperadmin, hasRole, hasAnyRole } from '@/lib/auth'
import type { SessionUser } from '@/lib/auth'

function makeSession(memberships: Array<{ institucion_id: string; rol: string }>): SessionUser {
  return {
    auth_id: 'test-auth-id',
    email: 'test@example.com',
    persona_id: 'test-persona-id',
    nombre: 'Test User',
    sin_institucion: false,
    memberships: memberships as SessionUser['memberships'],
  }
}

describe('isSuperadmin', () => {
  it('returns true when user has superadmin role', () => {
    const session = makeSession([{ institucion_id: 'inst-1', rol: 'superadmin' }])
    expect(isSuperadmin(session)).toBe(true)
  })

  it('returns false when user has no superadmin role', () => {
    const session = makeSession([{ institucion_id: 'inst-1', rol: 'admin' }])
    expect(isSuperadmin(session)).toBe(false)
  })

  it('returns false when user has no memberships', () => {
    const session = makeSession([])
    expect(isSuperadmin(session)).toBe(false)
  })
})

describe('hasRole', () => {
  it('returns true when user has the specified role in the institution', () => {
    const session = makeSession([{ institucion_id: 'inst-1', rol: 'admin' }])
    expect(hasRole(session, 'inst-1', 'admin')).toBe(true)
  })

  it('returns false when user has a different role', () => {
    const session = makeSession([{ institucion_id: 'inst-1', rol: 'docente' }])
    expect(hasRole(session, 'inst-1', 'admin')).toBe(false)
  })

  it('returns false when user is in a different institution', () => {
    const session = makeSession([{ institucion_id: 'inst-2', rol: 'admin' }])
    expect(hasRole(session, 'inst-1', 'admin')).toBe(false)
  })

  it('returns false when user has no memberships', () => {
    const session = makeSession([])
    expect(hasRole(session, 'inst-1', 'admin')).toBe(false)
  })
})

describe('hasAnyRole', () => {
  it('returns true when user has at least one of the roles', () => {
    const session = makeSession([{ institucion_id: 'inst-1', rol: 'docente' }])
    expect(hasAnyRole(session, 'inst-1', ['admin', 'docente'])).toBe(true)
  })

  it('returns true when user has the first role', () => {
    const session = makeSession([{ institucion_id: 'inst-1', rol: 'admin' }])
    expect(hasAnyRole(session, 'inst-1', ['admin', 'docente'])).toBe(true)
  })

  it('returns false when user has none of the roles', () => {
    const session = makeSession([{ institucion_id: 'inst-1', rol: 'responsable' }])
    expect(hasAnyRole(session, 'inst-1', ['admin', 'docente'])).toBe(false)
  })

  it('returns false when institution does not match', () => {
    const session = makeSession([{ institucion_id: 'inst-2', rol: 'admin' }])
    expect(hasAnyRole(session, 'inst-1', ['admin', 'docente'])).toBe(false)
  })
})
