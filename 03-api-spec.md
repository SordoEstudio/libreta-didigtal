# 03 · API Spec — Endpoints
**Libreta Digital SaaS** · Harvi Digital · v1.0

---

## Convenciones globales

### URL base
```
/api/v1/...
```

### Headers requeridos en todos los endpoints protegidos
```
Cookie: sb-access-token=<JWT>   (gestionado automáticamente por Supabase SSR)
Content-Type: application/json
```

### Formato de respuesta estándar
```typescript
// Éxito
{ "data": <payload>, "meta"?: { "total": number, "page": number } }

// Error
{ "error": { "code": string, "message": string } }
```

### Códigos de error comunes
| Código | HTTP | Descripción |
|---|---|---|
| `UNAUTHORIZED` | 401 | Sin sesión válida |
| `FORBIDDEN` | 403 | Sin permisos para este recurso |
| `NOT_FOUND` | 404 | Recurso no encontrado o de otra institución |
| `VALIDATION_ERROR` | 422 | Body inválido (detalle en `message`) |
| `CONFLICT` | 409 | Recurso ya existe (ej: email duplicado) |
| `SERVER_ERROR` | 500 | Error interno |

### Soft delete
Todos los endpoints de lista excluyen registros con `deleted_at IS NOT NULL` salvo que se indique lo contrario.

---

## 1. Instituciones

### `GET /api/v1/instituciones`
**Rol:** superadmin

Listar todas las instituciones.

**Response 200:**
```json
{
  "data": [
    {
      "id": "uuid",
      "nombre": "Instituto San Martín",
      "tipo": "escuela_secundaria",
      "slug": "instituto-san-martin",
      "activa": true,
      "created_at": "2025-06-01T00:00:00Z"
    }
  ]
}
```

---

### `POST /api/v1/instituciones`
**Rol:** superadmin

Crear nueva institución.

**Request body:**
```json
{
  "nombre": "Academia de Danza Flores",
  "tipo": "academia",
  "slug": "academia-danza-flores",
  "direccion": "Av. Corrientes 1234",
  "telefono": "011-4444-5555",
  "email": "info@danzaflores.com"
}
```

**Validaciones:**
- `nombre`: requerido, min 3 chars
- `slug`: requerido, solo letras minúsculas, números y guiones, único globalmente
- `tipo`: opcional, uno de `['escuela_primaria', 'escuela_secundaria', 'academia', 'instituto', 'club', 'otro']`

**Response 201:**
```json
{
  "data": {
    "id": "uuid",
    "nombre": "Academia de Danza Flores",
    "slug": "academia-danza-flores",
    "activa": true,
    "created_at": "2025-06-01T00:00:00Z"
  }
}
```

**Response 409** (slug duplicado):
```json
{ "error": { "code": "CONFLICT", "message": "El slug ya está en uso" } }
```

---

### `PATCH /api/v1/instituciones/:id`
**Rol:** superadmin | admin (de esa institución)

Actualizar datos de institución.

**Request body** (todos opcionales):
```json
{
  "nombre": "Academia de Danza Flores (actualizado)",
  "direccion": "Av. Santa Fe 555",
  "logo_url": "https://storage.../logo.png"
}
```

**Response 200:**
```json
{ "data": { ...institucion actualizada } }
```

---

### `DELETE /api/v1/instituciones/:id`
**Rol:** superadmin

Soft delete de institución (marca `deleted_at`, no borra datos).

**Response 204:** (sin body)

---

## 2. Años lectivos

### `GET /api/v1/instituciones/:institucion_id/años-lectivos`
**Rol:** admin | docente | responsable

**Response 200:**
```json
{
  "data": [
    {
      "id": "uuid",
      "nombre": "2026",
      "fecha_inicio": "2026-03-01",
      "fecha_fin": "2026-12-15",
      "activo": true
    }
  ]
}
```

---

### `POST /api/v1/instituciones/:institucion_id/años-lectivos`
**Rol:** superadmin | admin

**Request body:**
```json
{
  "nombre": "Ciclo 2026",
  "fecha_inicio": "2026-03-01",
  "fecha_fin": "2026-12-15",
  "activo": true
}
```

**Lógica:** si `activo: true`, desactivar el año lectivo activo anterior de la institución.

**Response 201:**
```json
{ "data": { "id": "uuid", "nombre": "Ciclo 2026", "activo": true } }
```

---

## 3. Períodos

### `GET /api/v1/instituciones/:institucion_id/periodos`
**Rol:** admin | docente | responsable

**Query params:**
- `año_lectivo_id` (requerido)

**Response 200:**
```json
{
  "data": [
    { "id": "uuid", "nombre": "1er Trimestre", "orden": 1, "fecha_inicio": "2026-03-01", "fecha_fin": "2026-06-15" },
    { "id": "uuid", "nombre": "2do Trimestre", "orden": 2, "fecha_inicio": "2026-07-01", "fecha_fin": "2026-09-30" },
    { "id": "uuid", "nombre": "3er Trimestre", "orden": 3, "fecha_inicio": "2026-10-01", "fecha_fin": "2026-12-10" }
  ]
}
```

---

### `POST /api/v1/instituciones/:institucion_id/periodos`
**Rol:** superadmin | admin

**Request body:**
```json
{
  "año_lectivo_id": "uuid",
  "nombre": "1er Trimestre",
  "orden": 1,
  "fecha_inicio": "2026-03-01",
  "fecha_fin": "2026-06-15"
}
```

**Response 201:**
```json
{ "data": { "id": "uuid", "nombre": "1er Trimestre", "orden": 1 } }
```

---

## 4. Escalas

### `GET /api/v1/instituciones/:institucion_id/escalas`
**Rol:** admin | docente

**Response 200:**
```json
{
  "data": [
    {
      "id": "uuid",
      "nombre": "Numérica 1-10",
      "tipo": "numerica",
      "min_valor": 1,
      "max_valor": 10,
      "activa": true,
      "valores": []
    },
    {
      "id": "uuid",
      "nombre": "Conceptual",
      "tipo": "literal",
      "min_valor": null,
      "max_valor": null,
      "activa": true,
      "valores": [
        { "codigo": "MB", "descripcion": "Muy Bueno", "orden": 1 },
        { "codigo": "B",  "descripcion": "Bueno",     "orden": 2 },
        { "codigo": "R",  "descripcion": "Regular",   "orden": 3 },
        { "codigo": "I",  "descripcion": "Insuficiente", "orden": 4 }
      ]
    }
  ]
}
```

---

### `POST /api/v1/instituciones/:institucion_id/escalas`
**Rol:** superadmin | admin

**Request body (numérica):**
```json
{
  "nombre": "Numérica 1-10",
  "tipo": "numerica",
  "min_valor": 1,
  "max_valor": 10
}
```

**Request body (literal):**
```json
{
  "nombre": "Conceptual MB/B/R/I",
  "tipo": "literal",
  "valores": [
    { "codigo": "MB", "descripcion": "Muy Bueno",    "orden": 1 },
    { "codigo": "B",  "descripcion": "Bueno",        "orden": 2 },
    { "codigo": "R",  "descripcion": "Regular",      "orden": 3 },
    { "codigo": "I",  "descripcion": "Insuficiente", "orden": 4 }
  ]
}
```

**Response 201:**
```json
{ "data": { "id": "uuid", ...escala con valores } }
```

---

## 5. Cursos

### `GET /api/v1/instituciones/:institucion_id/cursos`
**Rol:** admin | docente | responsable

**Query params:**
- `año_lectivo_id` (requerido)

**Response 200:**
```json
{
  "data": [
    {
      "id": "uuid",
      "nombre": "3ro A",
      "nivel": "Secundaria",
      "turno": "mañana",
      "escala_id": "uuid",
      "año_lectivo_id": "uuid"
    }
  ]
}
```

---

### `POST /api/v1/instituciones/:institucion_id/cursos`
**Rol:** admin

**Request body:**
```json
{
  "año_lectivo_id": "uuid",
  "nombre": "3ro A",
  "nivel": "Secundaria",
  "turno": "mañana",
  "escala_id": "uuid"
}
```

**Response 201:**
```json
{ "data": { "id": "uuid", "nombre": "3ro A" } }
```

---

### `PATCH /api/v1/cursos/:id`
**Rol:** admin

**Request body** (todos opcionales):
```json
{ "nombre": "3ro B", "turno": "tarde" }
```

**Response 200:** `{ "data": { ...curso actualizado } }`

---

### `DELETE /api/v1/cursos/:id`
**Rol:** admin

Soft delete. Falla si el curso tiene alumnos activos.

**Response 409:**
```json
{ "error": { "code": "CONFLICT", "message": "El curso tiene alumnos activos" } }
```

---

## 6. Materias

### `GET /api/v1/cursos/:curso_id/materias`
**Rol:** admin | docente (sus materias) | responsable

**Response 200:**
```json
{
  "data": [
    {
      "id": "uuid",
      "nombre": "Matemática",
      "escala_id": "uuid",
      "docentes": [
        { "persona_id": "uuid", "nombre": "Prof. García" }
      ]
    }
  ]
}
```

---

### `POST /api/v1/cursos/:curso_id/materias`
**Rol:** admin

**Request body:**
```json
{
  "nombre": "Matemática",
  "escala_id": "uuid",
  "docentes_ids": ["uuid-docente-1", "uuid-docente-2"]
}
```

**Response 201:**
```json
{ "data": { "id": "uuid", "nombre": "Matemática" } }
```

---

### `PATCH /api/v1/materias/:id`
**Rol:** admin

**Request body** (todos opcionales):
```json
{
  "nombre": "Matemática Avanzada",
  "escala_id": "uuid",
  "docentes_ids": ["uuid-nuevo-docente"]
}
```

**Lógica:** `docentes_ids` reemplaza la lista completa de docentes.

---

## 7. Usuarios y Membresías

### `GET /api/v1/instituciones/:institucion_id/usuarios`
**Rol:** admin

**Query params:**
- `rol`: filtrar por rol (`admin`, `docente`, `responsable`)
- `q`: búsqueda por nombre o email

**Response 200:**
```json
{
  "data": [
    {
      "persona_id": "uuid",
      "nombre": "Juan Pérez",
      "email": "juan@example.com",
      "telefono": "3414443322",
      "rol": "docente",
      "activo": true,
      "tiene_cuenta": true
    }
  ],
  "meta": { "total": 24 }
}
```

---

### `POST /api/v1/instituciones/:institucion_id/usuarios`
**Rol:** admin

Crear usuario y vincularlo a la institución con un rol.

**Request body:**
```json
{
  "nombre": "María González",
  "email": "maria@example.com",
  "telefono": "3412345678",
  "rol": "responsable"
}
```

**Lógica:**
1. Si el email ya existe en `personas` → solo crear membership
2. Si es email nuevo → crear en Supabase Auth (sin password, invitación por email) + crear persona + crear membership

**Response 201:**
```json
{
  "data": {
    "persona_id": "uuid",
    "nombre": "María González",
    "email": "maria@example.com",
    "rol": "responsable",
    "es_nuevo_usuario": true
  }
}
```

**Response 409** (ya tiene ese rol en esa institución):
```json
{ "error": { "code": "CONFLICT", "message": "El usuario ya tiene este rol en la institución" } }
```

---

### `PATCH /api/v1/instituciones/:institucion_id/usuarios/:persona_id`
**Rol:** admin

Actualizar datos o cambiar estado de membership.

**Request body:**
```json
{
  "activo": false
}
```

---

## 8. Alumnos

### `GET /api/v1/instituciones/:institucion_id/alumnos`
**Rol:** admin | docente

**Query params:**
- `curso_id`: filtrar por curso
- `q`: búsqueda por nombre
- `activo`: `true` | `false` (default: `true`)

**Response 200:**
```json
{
  "data": [
    {
      "id": "uuid",
      "nombre": "Sofía López",
      "email": "sofia@example.com",
      "curso": { "id": "uuid", "nombre": "3ro A" },
      "responsables": [
        { "persona_id": "uuid", "nombre": "Ana López", "relacion": "madre" }
      ]
    }
  ],
  "meta": { "total": 32 }
}
```

---

### `POST /api/v1/instituciones/:institucion_id/alumnos`
**Rol:** admin

**Request body:**
```json
{
  "nombre": "Sofía López",
  "email": "sofia@example.com",
  "fecha_nacimiento": "2012-05-15",
  "curso_id": "uuid",
  "responsables": [
    { "persona_id": "uuid", "relacion": "madre" },
    { "email": "padre@example.com", "nombre": "Carlos López", "relacion": "padre" }
  ]
}
```

**Lógica de responsables:**
- Si se provee `persona_id` → vincular persona existente
- Si se provee `email` sin `persona_id` → buscar o crear persona responsable

**Response 201:**
```json
{ "data": { "id": "uuid", "nombre": "Sofía López", "curso_id": "uuid" } }
```

---

### `PATCH /api/v1/alumnos/:id`
**Rol:** admin

**Request body** (todos opcionales):
```json
{
  "nombre": "Sofía López Martínez",
  "curso_id": "uuid-nuevo-curso",
  "activo": false
}
```

---

### `GET /api/v1/responsables/:persona_id/alumnos`
**Rol:** responsable (solo sus alumnos)

Alumnos vinculados a un responsable.

**Response 200:**
```json
{
  "data": [
    {
      "id": "uuid",
      "nombre": "Sofía López",
      "curso": { "nombre": "3ro A" },
      "institucion": { "nombre": "Instituto San Martín" }
    }
  ]
}
```

---

## 9. Evaluaciones

### `GET /api/v1/materias/:materia_id/evaluaciones`
**Rol:** docente (de esa materia) | admin | responsable

**Query params:**
- `periodo_id` (requerido)

**Response 200:**
```json
{
  "data": [
    { "id": "uuid", "nombre": "Parcial 1", "tipo": "parcial", "peso": 1, "orden": 1 },
    { "id": "uuid", "nombre": "TP Integradora", "tipo": "tp", "peso": 1, "orden": 2 },
    { "id": "uuid", "nombre": "Final", "tipo": "final", "peso": 2, "orden": 3 }
  ]
}
```

---

### `POST /api/v1/materias/:materia_id/evaluaciones`
**Rol:** docente (asignado a esa materia) | admin

**Request body:**
```json
{
  "periodo_id": "uuid",
  "nombre": "Parcial 1",
  "tipo": "parcial",
  "peso": 1,
  "orden": 1
}
```

**Response 201:**
```json
{ "data": { "id": "uuid", "nombre": "Parcial 1", "tipo": "parcial" } }
```

---

## 10. Notas

### `GET /api/v1/evaluaciones/:evaluacion_id/notas`
**Rol:** docente (de esa materia) | admin

Lista notas de todos los alumnos para una evaluación. Incluye alumnos sin nota.

**Response 200:**
```json
{
  "data": [
    {
      "alumno_id": "uuid",
      "alumno_nombre": "Sofía López",
      "nota": {
        "id": "uuid",
        "valor_numerico": 8,
        "valor_literal": null,
        "observacion": "Buen desempeño",
        "fecha_carga": "2026-06-10T14:30:00Z"
      }
    },
    {
      "alumno_id": "uuid",
      "alumno_nombre": "Tomás Rivas",
      "nota": null
    }
  ]
}
```

---

### `POST /api/v1/notas`
**Rol:** docente (de esa materia)

Cargar nota individual.

**Request body:**
```json
{
  "alumno_id": "uuid",
  "evaluacion_id": "uuid",
  "valor_numerico": 8,
  "valor_literal": null,
  "observacion": "Buen desempeño"
}
```

**Validaciones:**
- `evaluacion_id` debe pertenecer a una materia asignada al docente
- `alumno_id` debe pertenecer al curso de esa materia
- `valor_numerico` debe estar dentro del rango de la escala si es numérica
- `valor_literal` debe ser un código válido de la escala si es literal
- Solo uno de `valor_numerico` o `valor_literal` debe estar presente

**Response 201:**
```json
{ "data": { "id": "uuid", "alumno_id": "uuid", "valor_numerico": 8 } }
```

**Response 409** (nota ya existe para esa combinación alumno/evaluación):
```json
{ "error": { "code": "CONFLICT", "message": "Ya existe una nota para este alumno en esta evaluación. Usar PATCH para editar." } }
```

---

### `POST /api/v1/notas/bulk`
**Rol:** docente (de esa materia)

Carga masiva de notas para una evaluación (guardar tabla completa).

**Request body:**
```json
{
  "evaluacion_id": "uuid",
  "notas": [
    { "alumno_id": "uuid-1", "valor_numerico": 8, "observacion": null },
    { "alumno_id": "uuid-2", "valor_numerico": 6, "observacion": "Debe mejorar" },
    { "alumno_id": "uuid-3", "valor_numerico": null, "observacion": null }
  ]
}
```

**Lógica:**
- Si `valor_numerico` (o literal) es `null` → ignorar esa fila (no borrar nota existente)
- Si ya existe nota → actualizar (upsert)
- Si no existe → crear
- Registrar en `notas_historial` cada cambio

**Response 200:**
```json
{
  "data": {
    "guardadas": 2,
    "sin_cambios": 0,
    "omitidas": 1
  }
}
```

---

### `PATCH /api/v1/notas/:id`
**Rol:** docente (que cargó la nota) | admin

Editar nota existente.

**Request body:**
```json
{
  "valor_numerico": 9,
  "observacion": "Recuperó bien"
}
```

**Response 200:**
```json
{ "data": { "id": "uuid", "valor_numerico": 9 } }
```

---

### `GET /api/v1/notas/historial/:nota_id`
**Rol:** docente (que cargó la nota) | admin

**Response 200:**
```json
{
  "data": [
    {
      "accion": "create",
      "valor_anterior": null,
      "valor_nuevo": "8",
      "docente_nombre": "Prof. García",
      "modificado_at": "2026-06-10T14:30:00Z"
    },
    {
      "accion": "update",
      "valor_anterior": "8",
      "valor_nuevo": "9",
      "docente_nombre": "Prof. García",
      "modificado_at": "2026-06-15T10:00:00Z"
    }
  ]
}
```

---

## 11. Libreta del alumno

### `GET /api/v1/alumnos/:alumno_id/libreta`
**Rol:** responsable (de ese alumno) | admin | docente (de la institución)

Vista completa de la libreta de un alumno. Endpoint central para la vista del responsable.

**Query params:**
- `año_lectivo_id` (default: año activo)
- `periodo_id` (opcional, devuelve todos si no se especifica)

**Response 200:**
```json
{
  "data": {
    "alumno": {
      "id": "uuid",
      "nombre": "Sofía López",
      "curso": "3ro A",
      "año_lectivo": "2026"
    },
    "periodos": [
      {
        "id": "uuid",
        "nombre": "1er Trimestre",
        "orden": 1,
        "materias": [
          {
            "id": "uuid",
            "nombre": "Matemática",
            "docente": "Prof. García",
            "evaluaciones": [
              {
                "id": "uuid",
                "nombre": "Parcial 1",
                "tipo": "parcial",
                "nota": {
                  "valor_numerico": 8,
                  "valor_literal": null,
                  "observacion": "Buen desempeño",
                  "fecha_carga": "2026-06-10T14:30:00Z"
                }
              },
              {
                "id": "uuid",
                "nombre": "Final",
                "tipo": "final",
                "nota": null
              }
            ]
          },
          {
            "id": "uuid",
            "nombre": "Lengua",
            "docente": "Prof. Martínez",
            "evaluaciones": []
          }
        ]
      }
    ]
  }
}
```

---

## 12. Notificaciones

### `GET /api/v1/notificaciones`
**Rol:** cualquier usuario autenticado (ve solo las propias)

**Query params:**
- `leido`: `true` | `false`
- `limit`: default 20

**Response 200:**
```json
{
  "data": [
    {
      "id": "uuid",
      "tipo": "nueva_nota",
      "titulo": "Nueva nota de Matemática",
      "contenido": "Se cargó una nota de 8 en Parcial 1 de Matemática.",
      "metadata": { "alumno_nombre": "Sofía López", "materia": "Matemática", "valor": 8 },
      "leido": false,
      "created_at": "2026-06-10T14:35:00Z"
    }
  ],
  "meta": { "sin_leer": 3 }
}
```

---

### `PATCH /api/v1/notificaciones/:id/leer`
**Rol:** dueño de la notificación

Marcar como leída.

**Response 200:**
```json
{ "data": { "id": "uuid", "leido": true } }
```

---

### `PATCH /api/v1/notificaciones/leer-todas`
**Rol:** cualquier usuario autenticado

Marcar todas las notificaciones propias como leídas.

**Response 200:**
```json
{ "data": { "actualizadas": 3 } }
```

---

## 13. Panel Superadmin

### `GET /api/v1/superadmin/stats`
**Rol:** superadmin

Stats globales del sistema.

**Response 200:**
```json
{
  "data": {
    "instituciones_activas": 12,
    "total_alumnos": 834,
    "total_usuarios": 1240,
    "notas_cargadas_ultimo_mes": 3420
  }
}
```

---

## Consideraciones de implementación

### Notificaciones al cargar notas

El endpoint `POST /api/v1/notas` (y bulk) dispara una notificación a cada responsable del alumno al finalizar. Se hace en el mismo handler, de forma asíncrona no bloqueante:

```typescript
// Al final del handler de POST /notas
await Promise.allSettled([
  enviarNotificacionResponsables(alumno_id, materia, nota_valor),
  // allSettled para que un fallo de notificación no revierta la nota
])
```

### Validación de escala en notas

Antes de guardar una nota, validar contra la escala de la materia (o del curso si la materia no tiene escala propia):

```typescript
async function validarValorNota(
  valor_numerico: number | null,
  valor_literal: string | null,
  materia_id: string
) {
  const escala = await getEscalaForMateria(materia_id)

  if (escala.tipo === 'numerica') {
    if (!valor_numerico) throw new Error('Se requiere valor numérico')
    if (valor_numerico < escala.min_valor || valor_numerico > escala.max_valor) {
      throw new Error(`El valor debe estar entre ${escala.min_valor} y ${escala.max_valor}`)
    }
  }

  if (escala.tipo === 'literal') {
    if (!valor_literal) throw new Error('Se requiere valor literal')
    const codigosValidos = escala.valores.map(v => v.codigo)
    if (!codigosValidos.includes(valor_literal)) {
      throw new Error(`Valor inválido. Opciones: ${codigosValidos.join(', ')}`)
    }
  }
}
```

---

*Fin de la especificación de API. Ver `02-auth-spec.md` para detalles de autenticación.*
