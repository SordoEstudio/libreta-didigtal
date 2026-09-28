'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Save, Loader2 } from 'lucide-react'

interface Alumno {
  id: string
  nombre: string
}

interface NotaExistente {
  id: string
  alumno_id: string
  valor_numerico: number | null
  valor_literal: string | null
  observacion: string | null
}

interface NotasEditorProps {
  evaluacionId: string
  alumnos: Alumno[]
  notasExistentes: NotaExistente[]
  slug: string
}

export function NotasEditor({ evaluacionId, alumnos, notasExistentes, slug }: NotasEditorProps) {
  const notaMap = new Map(notasExistentes.map(n => [n.alumno_id, n]))

  const [valores, setValores] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {}
    for (const alumno of alumnos) {
      const nota = notaMap.get(alumno.id)
      init[alumno.id] = nota?.valor_numerico?.toString() ?? nota?.valor_literal ?? ''
    }
    return init
  })

  const [isPending, startTransition] = useTransition()

  function handleChange(alumnoId: string, value: string) {
    setValores(prev => ({ ...prev, [alumnoId]: value }))
  }

  async function handleSave() {
    startTransition(async () => {
      const notas = alumnos.map(a => ({
        alumno_id: a.id,
        valor_numerico: valores[a.id] !== '' ? parseFloat(valores[a.id]) : null,
        valor_literal: null,
      }))

      const res = await fetch(`/api/v1/notas/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ evaluacion_id: evaluacionId, notas }),
      })

      if (res.ok) {
        const data = await res.json()
        toast.success(`${data.data.upserted} notas guardadas`)
      } else {
        const err = await res.json().catch(() => ({}))
        toast.error(err?.error?.message ?? 'Error al guardar')
      }
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Alumno</TableHead>
              <TableHead className="w-32">Nota</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {alumnos.map(alumno => (
              <TableRow key={alumno.id}>
                <TableCell className="font-medium">{alumno.nombre}</TableCell>
                <TableCell>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="—"
                    value={valores[alumno.id] ?? ''}
                    onChange={e => handleChange(alumno.id, e.target.value)}
                    className="w-24"
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isPending}>
          {isPending ? <Loader2 data-icon="inline-start" className="animate-spin" /> : <Save data-icon="inline-start" />}
          {isPending ? 'Guardando...' : 'Guardar notas'}
        </Button>
      </div>
    </div>
  )
}
