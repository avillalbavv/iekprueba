# Registro de cambios

## 2026-07-16

### Planificación académica

- Integrado el asistente de horarios dentro del Planificador IEK.
- Añadidas preferencias simples y mixtas de turno, día libre y selección por semestre.
- Priorizada la inclusión de materias y la reducción de horas libres.
- Añadida revisión explícita antes de confirmar un horario.
- Incorporado calendario personal de exámenes y vista semanal detallada.

### Datos y administración

- Añadida importación validada de XLSX y CSV desde el panel administrativo.
- Adaptado el importador al formato oficial FP-UNA con hoja IEK, encabezados multinivel, clases,
  docentes, departamentos, exámenes, mesas y fechas sabatinas específicas.
- Reemplazado el criterio de asteriscos por la existencia real de horarios para determinar oferta.
- Añadida comparación entre revisiones con identificadores estables y avisos solo para secciones
  afectadas.
- Añadida eliminación protegida de versiones de horario, restauración automática y auditoría.
- Conectada la revisión activa de horarios con Planificador, Dónde rindo, calendario y asistencia.
- Reparadas políticas RLS para publicar avisos, eventos, exámenes, recursos y horarios.
- Añadidas notificaciones por cambios en la fuente académica y auditoría de operaciones.

### Experiencia

- Mejorado el modo claro, la navegación móvil y el centro de notificaciones.
- Simplificada la barra móvil: buscador, cuenta, administración y tema pasan al menú desplegable.
- Unificados los encabezados internos con breadcrumb y contexto visual accesible.
- Añadido registro con confirmación de contraseña y guía de acceso.
- Añadido recordatorio para revisar Spam o Correo no deseado en los correos de autenticación.
- Completado el Manual de Ingresantes con fuentes institucionales identificadas.
- Ajustada la asistencia para comenzar en 0 % y aumentar según los registros del estudiante.
- Separadas las revisiones de los exámenes en Mi Semestre y sus notificaciones.
- Conectada la confirmación del horario con la Calculadora de Asistencia.
- Añadido un ejemplo guiado de uso en la Calculadora de Notas.
- Conectado el formulario de Contacto con una bandeja administrativa segura en Supabase.

## 2026-07-12

- Incorporados Mi Semestre, Planificador de estudio, buscador global y PWA.
- Añadido panel administrativo con roles `superadmin`, `admin`, `editor`, `viewer` y `student`.
- Centralizada la sincronización del estado académico con Supabase.
- Añadidas páginas de privacidad y términos de uso.
- Conservadas las mallas 2008 y 2026 con sus alcances diferenciados.
