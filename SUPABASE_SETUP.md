# Activar cuentas y sincronización en IEK Connect Hub

La aplicación funciona sin Supabase usando `localStorage`. Al configurar las dos variables públicas, se habilitan cuentas, sesiones persistentes y sincronización entre dispositivos.

## 1. Crear el proyecto

1. Crear un proyecto en Supabase.
2. Guardar de **Project Settings → API**:
   - Project URL.
   - Clave pública `anon` o `publishable`.
3. No copiar ni publicar la clave `service_role`.

## 2. Crear las tablas y políticas

Abrir **SQL Editor**, pegar y ejecutar:

Ejecutar, en orden:

1. `supabase/migrations/202607120001_auth_and_user_state.sql`
2. `supabase/migrations/202607120002_platform_modules.sql`
3. `supabase/migrations/202607120003_schedule_revisions_and_permissions.sql`
4. `supabase/migrations/202607120004_admin_panel_reliability.sql`
5. `supabase/migrations/202607120005_admin_write_policy_repair.sql`

La migración 004 corrige los permisos efectivos de publicación, la secuencia de
versiones y los tipos de archivo que algunos navegadores asignan a Excel/CSV. Si
el panel ya estaba instalado pero no permitía guardar o subir archivos, ejecutá
solamente la 004 y luego cerrá y volvé a iniciar sesión.

La migración crea:

- `profiles`: nombre y compatibilidad con instalaciones anteriores.
- `user_roles`: autoridad de roles administrativos.
- Tablas de avisos, calendario, exámenes, recursos, reportes y auditoría.
- Planes/sesiones de estudio, notificaciones y semestres archivados.
- Versionado de archivos de horarios y avisos automáticos cuando una nueva fuente académica es publicada.
- `user_app_state`: último estado sincronizado.
- `user_state_backups`: copias previas a mezclas entre dispositivos.
- Políticas RLS para que cada usuario solo pueda acceder a sus datos.
- Creación automática del perfil después del registro.
- Función protegida para eliminar la propia cuenta.

## 3. Configurar autenticación

En **Authentication → URL Configuration**:

- Site URL: URL pública de la web.
- Redirect URLs:
  - `http://localhost:5173/cuenta`
  - `https://TU-DOMINIO/cuenta`

En **Authentication → Providers → Email** se recomienda mantener activa la confirmación por correo en producción.

## 4. Variables locales

Copiar `.env.example` como `.env.local` y completar:

```env
VITE_SUPABASE_URL=https://TU-PROYECTO.supabase.co
VITE_SUPABASE_ANON_KEY=TU_CLAVE_PUBLICA_ANON
```

Después reiniciar `npm run dev`.

## 5. Variables en Cloudflare Pages

En **Settings → Environment variables**, crear las mismas dos variables para producción y preview. Volver a desplegar después de guardarlas.

No usar `SUPABASE_SERVICE_ROLE_KEY` en Cloudflare Pages ni en ningún archivo que llegue al navegador.

## 6. Crear el primer administrador

1. Registrar normalmente la cuenta desde `/cuenta`.
2. Confirmar el correo.
3. Ejecutar en SQL Editor, reemplazando el correo:

```sql
insert into public.user_roles(user_id, role, assigned_by)
select id, 'superadmin', id
from auth.users
where lower(email) = lower('ADMIN@CORREO.COM')
on conflict(user_id) do update
set role='superadmin', is_active=true, revoked_at=null;
```

Después, la gestión se realiza en `/admin`, sección **Usuarios y permisos**. No se requieren listas de correos en el frontend.

## 7. Datos que se sincronizan

- Materias y secciones del Planificador IEK.
- Registros de la Calculadora de Asistencia.
- Materias y notas del Promedio General.
- Borrador completo de la Calculadora de Notas.
- Énfasis seleccionado.
- Progreso separado de cada malla curricular.
- Planes de estudio y notificaciones personales.

El tema claro/oscuro permanece local. Los datos académicos también siguen guardándose localmente para que las herramientas funcionen sin conexión.

## 8. Primera migración de un estudiante

Cuando el estudiante inicia sesión por primera vez:

1. Se leen los datos existentes del dispositivo.
2. Se consulta el estado de la cuenta.
3. Se comparan fechas por cada herramienta.
4. Se crean copias si existen dos versiones diferentes.
5. Se conserva la versión más reciente de cada herramienta.
6. El resultado se guarda tanto localmente como en Supabase.

El estudiante puede sincronizar manualmente, exportar sus datos, borrar los datos académicos o eliminar completamente su cuenta desde `/cuenta`.

## 9. Verificación

```bash
npm install
npm run test:academic
npx tsc --noEmit
npm run build
```

Después de aplicar las migraciones, comprobar desde `/admin`:

1. Guardar y publicar un aviso de prueba.
2. Crear un evento y un examen.
3. Guardar un recurso.
4. Subir un XLSX o CSV menor a 10 MB en **Horarios**.
5. Confirmar que cada operación muestre un mensaje verde de éxito.

Si Supabase rechaza una operación, el panel ahora muestra si falta una migración,
si la sesión venció o si RLS bloqueó el rol.
