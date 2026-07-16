# Despliegue en Cloudflare Pages

La aplicación se compila como SPA con Vite y publica archivos estáticos desde `dist/`.

## Requisitos

- Node.js 20.19 o superior.
- npm 10 o superior.
- Proyecto creado en Cloudflare Pages.
- Variables públicas de Supabase configuradas en producción y preview.

## Compilación local

```bash
npm ci
npm run check
```

El resultado queda en `dist/`. El archivo `public/_redirects` hace que las rutas de TanStack Router
vuelvan a `index.html` cuando se accede directamente a una URL.

## Despliegue conectado a Git

Configuración de build recomendada en Cloudflare Pages:

| Campo                | Valor           |
| -------------------- | --------------- |
| Rama de producción   | `main`          |
| Comando de build     | `npm run build` |
| Directorio de salida | `dist`          |
| Versión de Node      | `22`            |

Variables necesarias:

```env
VITE_SUPABASE_URL=https://TU-PROYECTO.supabase.co
VITE_SUPABASE_ANON_KEY=TU_CLAVE_PUBLICA_ANON
```

## GitHub Actions

El workflow `.github/workflows/deploy.yml` compila cada push a `main` y publica mediante la acción
oficial de Wrangler. El repositorio necesita estos secretos:

| Secreto                 | Contenido                                |
| ----------------------- | ---------------------------------------- |
| `CLOUDFLARE_API_TOKEN`  | Token con permiso Cloudflare Pages: Edit |
| `CLOUDFLARE_ACCOUNT_ID` | ID de la cuenta de Cloudflare            |

El nombre interno del proyecto de Cloudflare se conserva como `iek-connect-hub` para no romper el
despliegue existente; no es el nombre público del sitio.

## Verificación posterior

1. Abrir la portada y una ruta interna directamente.
2. Probar registro, confirmación de correo e inicio de sesión.
3. Confirmar sincronización en dos sesiones distintas.
4. Verificar que un estudiante no pueda abrir `/admin`.
5. Publicar un aviso de prueba con una cuenta administrativa.
6. Importar una planilla de prueba y comprobar Planificador, Dónde rindo y calendario.
7. Instalar la PWA y revisar la última información disponible sin conexión.

## Recuperación

Si una versión falla, restaurá desde Cloudflare Pages el despliegue estable anterior. No reviertas
migraciones de producción de forma destructiva: aplicá una migración correctiva nueva después de
respaldar la base.
