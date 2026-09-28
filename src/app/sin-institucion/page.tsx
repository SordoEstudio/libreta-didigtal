export default function SinInstitucionPage() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="max-w-md text-center space-y-4 p-8">
        <h1 className="text-xl font-semibold">Cuenta no vinculada</h1>
        <p className="text-gray-600">
          Tu cuenta no está vinculada a ninguna institución todavía.
          Contactá al administrador de tu institución para que te agregue al sistema.
        </p>
        <a href="/login" className="text-blue-600 text-sm">Volver al inicio</a>
      </div>
    </div>
  )
}
