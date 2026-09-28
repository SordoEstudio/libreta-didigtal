import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { AlertCircle } from 'lucide-react'

export default function AuthErrorPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-4">
      <div className="flex flex-col items-center gap-3 text-center">
        <AlertCircle className="size-12 text-destructive" />
        <h1 className="text-2xl font-semibold">Error de autenticación</h1>
        <p className="text-muted-foreground max-w-sm">
          No se pudo completar el inicio de sesión. El enlace puede haber expirado o ser inválido.
        </p>
      </div>
      <Button render={<Link href="/login" />}>
        Volver al login
      </Button>
    </div>
  )
}
