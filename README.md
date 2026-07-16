<p align="center">
  <img src="public/iek-favicon-circle.png" width="128" alt="Logo de Ingeniería en Electrónica FP-UNA" />
</p>

<h1 align="center">Web de la Delegación Estudiantil IEK</h1>

<p align="center">
  Información, planificación y herramientas académicas para estudiantes de Ingeniería en
  Electrónica de la Facultad Politécnica de la Universidad Nacional de Asunción.
</p>

<p align="center">
  <a href="https://github.com/avillalbavv/iekprueba/actions/workflows/deploy.yml">
    <img src="https://github.com/avillalbavv/iekprueba/actions/workflows/deploy.yml/badge.svg" alt="Estado del despliegue" />
  </a>
</p>

## Qué incluye

- Registro, inicio de sesión y sincronización entre dispositivos con Supabase.
- Planificador semanal con secciones, aulas, docentes y calendario de exámenes.
- Asistente para generar horarios según materias, turnos y día libre.
- Calculadoras de asistencia, notas y promedio general.
- Mallas curriculares, correlatividades y progreso académico.
- Calendario académico, avisos, recursos y sección **Dónde rindo**.
- **Mi Semestre**, planificador de estudio, buscador global y notificaciones.
- PWA instalable con acceso a la última información guardada.
- Panel administrativo con roles, publicación de contenido, importación de horarios y auditoría.

## Tecnologías

| Área                  | Implementación                                                  |
| --------------------- | --------------------------------------------------------------- |
| Interfaz              | React 19, TypeScript, Tailwind CSS 4 y Radix UI                 |
| Navegación            | TanStack Router                                                 |
| Datos y autenticación | Supabase Auth, PostgreSQL, Storage y RLS                        |
| Persistencia local    | Capa central de estado con compatibilidad para datos anteriores |
| Importación académica | ExcelJS para XLSX y parser propio para CSV                      |
| Despliegue            | Vite, Cloudflare Pages y GitHub Actions                         |
| Pruebas               | Node Test Runner y TypeScript estricto                          |

## Inicio rápido

Requisitos:

- Node.js 20.19 o superior.
- npm 10 o superior.
- Un proyecto de Supabase para habilitar cuentas y sincronización.

```bash
git clone https://github.com/avillalbavv/iekprueba.git
cd iekprueba
npm ci
```

Copiá `.env.example` como `.env.local` y completá las variables públicas:

```env
VITE_SUPABASE_URL=https://TU-PROYECTO.supabase.co
VITE_SUPABASE_ANON_KEY=TU_CLAVE_PUBLICA_ANON
```

Luego iniciá el entorno local:

```bash
npm run dev
```

Sin esas variables, las herramientas académicas continúan funcionando localmente, pero el login y
la sincronización remota permanecen deshabilitados.

## Comandos disponibles

| Comando                | Uso                                                      |
| ---------------------- | -------------------------------------------------------- |
| `npm run dev`          | Servidor local de desarrollo                             |
| `npm run build`        | Compilación optimizada para producción                   |
| `npm run preview`      | Vista local del build de producción                      |
| `npm test`             | Pruebas de reglas académicas, persistencia e importación |
| `npm run typecheck`    | Verificación estática de TypeScript                      |
| `npm run lint`         | Reglas de calidad de código                              |
| `npm run format:check` | Verificación del formato                                 |
| `npm run check`        | Lint, tipos, pruebas y build en una sola ejecución       |

## Estructura

```text
.
├── .github/workflows/       CI/CD para Cloudflare Pages
├── docs/                    Guías operativas y técnicas
├── public/                  Manifest, service worker e iconos PWA
├── src/
│   ├── components/          Componentes compartidos
│   ├── data/                Fuentes académicas versionadas
│   ├── lib/                 Reglas, servicios, persistencia y pruebas
│   └── routes/              Páginas de la aplicación
└── supabase/migrations/     Esquema, funciones y políticas RLS
```

La información de materias, secciones, exámenes y aulas se consume desde una fuente central. Una
publicación realizada desde el panel administrativo actualiza el conjunto activo sin duplicar datos
en cada herramienta.

## Supabase y administración

Las migraciones deben ejecutarse en orden y nunca deben reemplazarse después de haber sido aplicadas
en producción. La configuración completa, las políticas RLS y el alta inicial del superadministrador
están documentadas en [docs/supabase.md](docs/supabase.md).

No se debe incluir una clave `service_role` en el frontend, en variables `VITE_*` ni en el
repositorio.

## Despliegue

El proyecto genera una SPA en `dist/`. La guía para Cloudflare Pages, variables de entorno y
verificación posterior está en [docs/deployment.md](docs/deployment.md).

## Criterios de mantenimiento

- No inventar fechas, aulas, correlatividades ni información institucional.
- Mantener compatibilidad con los datos locales ya guardados por estudiantes.
- Validar permisos tanto en la interfaz como mediante políticas RLS.
- Añadir migraciones nuevas; no reescribir migraciones aplicadas.
- Ejecutar `npm run check` antes de publicar cambios.

Consultá [CONTRIBUTING.md](CONTRIBUTING.md) para el flujo de trabajo y
[CHANGELOG.md](CHANGELOG.md) para el historial funcional.
