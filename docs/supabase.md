# Configuración de Supabase

Supabase proporciona autenticación, sincronización, contenido administrativo, archivos y políticas
de acceso. Las herramientas mantienen una copia local para continuidad y uso sin conexión.

## Variables públicas

Copiá `.env.example` como `.env.local`:

```env
VITE_SUPABASE_URL=https://TU-PROYECTO.supabase.co
VITE_SUPABASE_ANON_KEY=TU_CLAVE_PUBLICA_ANON
```

La clave anónima puede estar en el navegador porque la autorización real se aplica mediante RLS. No
uses `SUPABASE_SERVICE_ROLE_KEY` en el frontend.

## Migraciones

Respaldá la base y ejecutá en SQL Editor, respetando este orden:

1. `202607120001_auth_and_user_state.sql`
2. `202607120002_platform_modules.sql`
3. `202607120003_schedule_revisions_and_permissions.sql`
4. `202607120004_admin_panel_reliability.sql`
5. `202607120005_admin_write_policy_repair.sql`
6. `202607160001_schedule_dataset_publication.sql`
7. `202607160002_contact_messages.sql`

Después de aplicar cambios de esquema, podés forzar la recarga de PostgREST con:

```sql
notify pgrst, 'reload schema';
```

Las migraciones crean, entre otras entidades:

- perfiles y roles administrativos;
- estado académico sincronizado y copias de respaldo;
- avisos, eventos, exámenes, recursos y reportes;
- planes y sesiones de estudio;
- notificaciones y semestres archivados;
- revisiones versionadas de horarios;
- mensajes de contacto con límite anti-spam y bandeja administrativa;
- funciones administrativas y registro de auditoría.

## Autenticación

En **Authentication → URL Configuration** configurá:

- Site URL: dirección pública de la aplicación.
- Redirect URLs:
  - `http://localhost:5173/cuenta`
  - `https://TU-DOMINIO/cuenta`

En producción se recomienda confirmar el correo antes del primer inicio de sesión.

## Primer superadministrador

1. Registrar la cuenta desde `/cuenta`.
2. Confirmar el correo.
3. Ejecutar una sola vez, reemplazando el correo:

```sql
insert into public.user_roles (user_id, role, assigned_by)
select id, 'superadmin', id
from auth.users
where lower(email) = lower('ADMIN@CORREO.COM')
on conflict (user_id) do update
set role = 'superadmin',
    is_active = true,
    revoked_at = null;
```

Después, los roles se administran desde `/admin` en **Usuarios y permisos**. No se usan listas de
correos escritas en el frontend.

## Comprobación del panel

Con cuentas separadas de estudiante y administrador:

1. Confirmar que el estudiante no accede al panel ni a las tablas administrativas.
2. Crear, editar y publicar un aviso.
3. Crear y publicar un evento, examen y recurso.
4. Subir un XLSX o CSV válido en **Horarios**.
5. Verificar que la revisión activa llegue al Planificador, Dónde rindo y calendario.
6. Revocar el rol administrativo y comprobar que el acceso desaparezca al instante.
7. Revisar que las operaciones anteriores estén en auditoría.
8. Enviar un mensaje desde `/contacto` y comprobar que aparezca en **Mensajes**.

## Sincronización personal

Al iniciar sesión se comparan los datos locales y remotos por herramienta. Antes de combinar estados
se crean respaldos, se conserva la versión más reciente y no se sobrescriben conflictos de forma
silenciosa.

Se sincronizan materias, secciones, asistencia, notas, promedio, énfasis, progreso de mallas, planes
de estudio y notificaciones personales. El tema visual permanece local.
