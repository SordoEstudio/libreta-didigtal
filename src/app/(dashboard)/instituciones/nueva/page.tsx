import { requireSession, isSuperadmin } from '@/lib/auth'
import { redirect } from 'next/navigation'
import NuevaInstitucionForm from './nueva-institucion-form'

export default async function NuevaInstitucionPage() {
  const session = await requireSession()
  if (!isSuperadmin(session)) redirect('/dashboard')

  return (
    <div className="max-w-xl flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Nueva institución</h1>
        <p className="text-sm text-muted-foreground">Completá los datos para registrar una institución nueva.</p>
      </div>
      <NuevaInstitucionForm />
    </div>
  )
}
