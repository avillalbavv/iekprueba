# Registro de cambios

## 2026-07-12

- Añadidos Radar Académico, Generador de semestre y Planificador de estudio.
- Añadidos buscador global, notificaciones y soporte PWA.
- Añadido panel administrativo con roles seguros y auditoría.
- Ampliada la sincronización para planes de estudio, notificaciones y preferencias nuevas.
- Añadida migración SQL aditiva con RLS y funciones administrativas.
- Conservadas rutas, identidad visual, autenticación y datos académicos existentes.
- Integrado el generador de semestre como modo asistido dentro de Planificador IEK.
- Renombrado Radar Académico a Mi Semestre y unificado su encabezado con el estilo visual de las calculadoras.
- Simplificado el inicio para mostrar únicamente cuatro accesos prioritarios, con portada institucional centrada.
- Reducidos el menú Explorar y el footer para evitar enlaces repetidos y saturación visual.
- Aplicado formato circular al logo y añadido favicon SVG circular.
- Añadidas páginas de Privacidad y Términos de uso.
- Restauradas todas las páginas y herramientas en la navegación; la simplificación se limita al footer.
- Restaurado el bloque de contacto y redes en el footer sin volver a listar todas las páginas.
- Sustituido el favicon SVG por un PNG circular con transparencia real.
- Simplificados visualmente el contacto del footer y el aviso orientativo de las mallas.
- Diferenciadas explícitamente las vistas de grafo y tabla para Malla 2008 y Malla 2026.
- Completado el panel con gestión de avisos, calendario, exámenes, recursos y versiones de horarios.
- Añadida notificación al sincronizar cuando la Delegación publica una nueva versión del Excel/CSV de horarios.
- Reparados los permisos del panel administrativo para avisos, eventos, exámenes, recursos y archivos de horarios.
- Añadida validación de Excel/CSV, limpieza de archivos huérfanos y mensajes visibles de éxito o error en todas las acciones administrativas.
- Conectados los eventos, exámenes y recursos publicados desde el panel con sus respectivas páginas públicas.
- Añadida la acción de publicación para eventos y recursos, manteniendo los borradores fuera de la vista estudiantil.
- Separadas las operaciones administrativas de alta y edición, y reconstruidas las políticas de escritura mediante la migración 005.
- Ordenados los avisos por tipo y, dentro de cada tipo, desde la publicación más reciente a la más antigua.
- Adaptado el centro de notificaciones a pantallas móviles, con cierre exterior, botón de cierre y soporte para Escape.
- Corregida la detección de oferta para variantes de nombres del Excel y reforzada la preferencia de turno del generador de horarios.
