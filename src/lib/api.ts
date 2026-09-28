import { NextResponse } from 'next/server'

export function ok<T>(data: T, meta?: Record<string, unknown>) {
  return NextResponse.json({ data, ...(meta && { meta }) })
}

export function created<T>(data: T) {
  return NextResponse.json({ data }, { status: 201 })
}

export function noContent() {
  return new NextResponse(null, { status: 204 })
}

function apiError(code: string, message: string, status: number) {
  return NextResponse.json({ error: { code, message } }, { status })
}

export const Err = {
  unauthorized: () => apiError('UNAUTHORIZED', 'Sin sesión válida', 401),
  forbidden: () => apiError('FORBIDDEN', 'Sin permisos para este recurso', 403),
  notFound: (msg = 'Recurso no encontrado') => apiError('NOT_FOUND', msg, 404),
  validation: (msg: string) => apiError('VALIDATION_ERROR', msg, 422),
  conflict: (msg: string) => apiError('CONFLICT', msg, 409),
  server: (msg = 'Error interno') => apiError('SERVER_ERROR', msg, 500),
}
