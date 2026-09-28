'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Loader2, Plus } from 'lucide-react'
import { toast } from 'sonner'

const ROLES = [
  { value: 'admin', label: 'Admin' },
  { value: 'docente', label: 'Docente' },
  { value: 'responsable', label: 'Responsable' },
]

interface Props {
  instId: string
}

export default function NuevoUsuarioSheet({ instId }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [rol, setRol] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const res = await fetch(`/api/v1/instituciones/${instId}/usuarios`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre, email, rol, send_invite: true }),
    })

    const json = await res.json()
    setLoading(false)

    if (!res.ok) {
      toast.error(json.error?.message ?? 'Error al crear usuario')
      return
    }

    toast.success(`Usuario "${nombre}" agregado. Se envió email de bienvenida.`)
    setOpen(false)
    setNombre('')
    setEmail('')
    setRol('')
    router.refresh()
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus data-icon="inline-start" />
        Nuevo usuario
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Nuevo usuario</SheetTitle>
          </SheetHeader>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-6 px-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="us-nombre">Nombre *</Label>
              <Input
                id="us-nombre"
                value={nombre}
                onChange={e => setNombre(e.target.value)}
                placeholder="Ej: María González"
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="us-email">Email *</Label>
              <Input
                id="us-email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="usuario@ejemplo.com"
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="us-rol">Rol *</Label>
              <Select value={rol} onValueChange={v => setRol(v ?? '')}>
                <SelectTrigger id="us-rol">
                  <SelectValue placeholder="Seleccionar rol..." />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map(r => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <p className="text-xs text-muted-foreground">
              Se creará una cuenta y se enviará un email de bienvenida.
            </p>

            <Button type="submit" disabled={loading || !nombre || !email || !rol} className="mt-2">
              {loading && <Loader2 data-icon="inline-start" className="animate-spin" />}
              {loading ? 'Creando...' : 'Crear usuario'}
            </Button>
          </form>
        </SheetContent>
      </Sheet>
    </>
  )
}
