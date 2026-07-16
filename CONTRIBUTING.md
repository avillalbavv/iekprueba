# Contribuir

Este repositorio sostiene herramientas que pueden contener datos académicos personales. Los cambios
deben priorizar compatibilidad, trazabilidad y claridad.

## Flujo recomendado

1. Crear una rama desde `main`.
2. Limitar cada cambio a un objetivo verificable.
3. No modificar datos académicos sin una fuente identificable.
4. Añadir o actualizar pruebas cuando cambien reglas o cálculos.
5. Ejecutar antes de publicar:

```bash
npm run check
npm run format:check
```

## Convenciones

- Componentes y servicios: nombres descriptivos, sin abreviaturas innecesarias.
- Commits: `tipo: descripción breve`, por ejemplo `fix: corregir detección de secciones`.
- Migraciones: fecha y propósito en el nombre; siempre aditivas una vez aplicadas.
- Variables privadas: nunca se guardan en Git. Solo las claves públicas previstas van en
  `.env.example`.
- Datos faltantes: mostrar un estado pendiente; no completar valores por inferencia.

## Cambios sensibles

Requieren revisión específica:

- autenticación y sincronización;
- políticas RLS o funciones `security definer`;
- importación y publicación de horarios;
- fórmulas de notas o asistencia;
- migraciones de datos locales;
- permisos administrativos.
