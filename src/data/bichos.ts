/** Manual de Nuevos Ingresantes, basado exclusivamente en fuentes oficiales FP-UNA. */

export type BichoCategoria =
  "primeros-pasos" | "inscripcion" | "reglamento" | "evaluacion" | "tramite" | "servicio";

export const CATEGORIA_LABEL: Record<BichoCategoria, string> = {
  "primeros-pasos": "Primeros pasos",
  inscripcion: "Inscripción",
  reglamento: "Reglamento 2026",
  evaluacion: "Evaluaciones",
  tramite: "Trámites",
  servicio: "Servicios",
};

export const CATEGORIA_COLOR: Record<BichoCategoria, string> = {
  "primeros-pasos": "#3b82f6",
  inscripcion: "#22d3ee",
  reglamento: "#a78bfa",
  evaluacion: "#34d399",
  tramite: "#fb923c",
  servicio: "#94a3b8",
};

export interface FuenteManual {
  titulo: string;
  url: string;
}

export interface Bicho {
  id: string;
  titulo: string;
  categoria: BichoCategoria;
  resumen: string;
  detalle: string;
  pasos?: string[];
  importante?: string;
  fuentes: FuenteManual[];
  verificadoEl: string;
}

const REGLAMENTO =
  "https://www.pol.una.py/wp-content/uploads/Resol.-25-15-68-00-Reglamento-Academico-de-la-FP-UNA.pdf";
const CALENDARIO = "https://www.pol.una.py/academico/calendario-academico/";
const TRAMITES = "https://www.pol.una.py/estudiantes/tramites-varios/";
const HORARIOS = "https://www.pol.una.py/academico/horarios-de-clases-y-examenes/";
const VERIFICADO = "2026-07-16";

export const BICHOS: Bicho[] = [
  {
    id: "primeros-pasos-cuenta",
    titulo: "Activá tu correo y accesos institucionales",
    categoria: "primeros-pasos",
    resumen: "El correo institucional es tu identidad para avisos, Educa y gestiones académicas.",
    detalle:
      "La FP-UNA asigna una cuenta institucional a sus estudiantes. Si no podés acceder, la Dirección TIC indica solicitar soporte con tus datos personales y académicos.",
    pasos: [
      "Revisá que tu correo institucional esté activo.",
      "Ingresá a Inscripciones de Grado y a Educa.",
      "Si falla el acceso, escribí a soporte@pol.una.py; para problemas académicos del sistema, usá soporte-acad@pol.una.py.",
    ],
    fuentes: [
      {
        titulo: "Servicios en línea FP-UNA",
        url: "https://www.pol.una.py/estudiantes/servicios-en-linea/",
      },
    ],
    verificadoEl: VERIFICADO,
  },
  {
    id: "calendario-oficial",
    titulo: "Consultá el calendario antes de cada gestión",
    categoria: "primeros-pasos",
    resumen:
      "Inscripciones, homologaciones, anulaciones, parciales y finales tienen plazos oficiales.",
    detalle:
      "El calendario académico aprobado por el Consejo Directivo define las fechas de cada periodo. La Web de la Delegación las resume, pero ante una diferencia siempre prevalece la publicación oficial vigente.",
    pasos: [
      "Revisá el calendario al inicio del periodo.",
      "Anotá apertura y cierre de los trámites que te afecten.",
      "Volvé a verificar ante recalendarizaciones o resoluciones nuevas.",
    ],
    importante:
      "Los trámites publicados para el segundo periodo 2026 cierran a las 12:00 en las fechas indicadas por FP-UNA.",
    fuentes: [{ titulo: "Calendario Académico FP-UNA", url: CALENDARIO }],
    verificadoEl: VERIFICADO,
  },
  {
    id: "inscripcion-asignaturas",
    titulo: "Inscripción ordinaria y tardía",
    categoria: "inscripcion",
    resumen:
      "La inscripción ordinaria se hace vía web; la tardía depende de cupos y se gestiona por Secretaría Académica.",
    detalle:
      "Para el segundo periodo 2026, la inscripción ordinaria está fijada del 28 al 30 de julio y la tardía del 3 al 6 de agosto. Las fechas cambian cada periodo.",
    pasos: [
      "Verificá prerrequisitos y plan académico.",
      "Armá alternativas de secciones antes de abrir el sistema.",
      "Guardá una constancia de la inscripción confirmada.",
      "Si necesitás inscripción especial o dispensa, tramitála dentro del plazo específico.",
    ],
    importante: "Estar anotado en un horario personal no equivale a estar inscripto oficialmente.",
    fuentes: [
      { titulo: "Trámites académicos de grado", url: TRAMITES },
      { titulo: "Inscripciones de Grado", url: "https://inscripciones.pol.una.py/" },
    ],
    verificadoEl: VERIFICADO,
  },
  {
    id: "reglas-inscripcion",
    titulo: "Prerrequisitos, límite y choques de horario",
    categoria: "inscripcion",
    resumen:
      "La inscripción exige correlatividades aprobadas, obligaciones al día y horarios sin superposición.",
    detalle:
      "El Art. 5 del Reglamento Académico exige prerrequisitos, devolución de materiales, aranceles al día y ausencia de sanción. Los planes aprobados desde 2025 permiten hasta 6 asignaturas; los anteriores, hasta 8, excluyendo las que ya tienen derecho a evaluación final.",
    pasos: [
      "Confirmá cuál es tu plan de estudios.",
      "Revisá correlatividades en la malla.",
      "Descartá cualquier superposición de clases o evaluaciones.",
      "Comprobá sección, turno, aula y cupo antes de confirmar.",
    ],
    importante: "El reglamento oficial no permite superposición de horarios.",
    fuentes: [{ titulo: "Reglamento Académico, arts. 3 al 5", url: REGLAMENTO }],
    verificadoEl: VERIFICADO,
  },
  {
    id: "planeamiento-asignatura",
    titulo: "Pedí el Planeamiento de cada asignatura",
    categoria: "reglamento",
    resumen:
      "Ahí deben figurar contenidos, actividades, ponderaciones, asistencia y modalidad de evaluación final.",
    detalle:
      "El docente debe presentar el Planeamiento de la Asignatura al departamento y a los estudiantes dentro de las dos primeras semanas de clase. Es el documento clave para saber cómo se evalúa la materia.",
    pasos: [
      "Guardá una copia del planeamiento.",
      "Registrá ponderaciones y fechas en la calculadora de notas.",
      "Confirmá el porcentaje de asistencia: nunca puede ser menor al 70 %.",
      "Revisá los requisitos obligatorios para tener derecho a final.",
    ],
    fuentes: [{ titulo: "Reglamento Académico, arts. 9 y 10", url: REGLAMENTO }],
    verificadoEl: VERIFICADO,
  },
  {
    id: "evaluacion-proceso",
    titulo: "Cómo se calcula el proceso: PPEP y PEP",
    categoria: "evaluacion",
    resumen:
      "Cada una de las dos etapas combina 50 % parcial y 50 % otras actividades; el PEP promedia ambas etapas.",
    detalle:
      "PPEP1 y PPEP2 se calculan con 50 % de la evaluación parcial y 50 % de las demás actividades de su etapa. Luego PEP = (PPEP1 + PPEP2) / 2. Debe haber al menos dos actividades de proceso por etapa.",
    importante:
      "Para tener derecho a evaluación final necesitás, entre otros requisitos, al menos 60 % de PEP.",
    fuentes: [{ titulo: "Reglamento Académico, arts. 12 y 13", url: REGLAMENTO }],
    verificadoEl: VERIFICADO,
  },
  {
    id: "asistencia-laboratorio",
    titulo: "Asistencia a clases y laboratorios",
    categoria: "reglamento",
    resumen:
      "El piso de asistencia a clases es 70 %; los laboratorios obligatorios requieren 100 %.",
    detalle:
      "El planeamiento puede fijar un porcentaje de asistencia, pero no menor al 70 %. En prácticas de laboratorio obligatorias se exige 100 % y puede solicitarse recuperación de hasta 30 % de las prácticas por etapa mediante el Departamento de Aprendizaje de la Carrera.",
    importante:
      "Una ausencia de laboratorio no se compensa automáticamente: la recuperación debe solicitarse y gestionarse.",
    fuentes: [{ titulo: "Reglamento Académico, arts. 9, 11 y 13", url: REGLAMENTO }],
    verificadoEl: VERIFICADO,
  },
  {
    id: "derecho-final",
    titulo: "Requisitos para rendir el examen final",
    categoria: "evaluacion",
    resumen:
      "PEP mínimo, asistencia, laboratorios y requisitos del planeamiento deben cumplirse simultáneamente.",
    detalle:
      "Se establecen dos convocatorias por periodo. Para rendir se exige PEP de al menos 60 %, estar libre de sanciones, cumplir la asistencia del planeamiento, tener 100 % de laboratorios obligatorios y completar los demás requisitos establecidos.",
    pasos: [
      "Confirmá tu derecho antes de inscribirte.",
      "Verificá fecha, hora, aula y materiales autorizados.",
      "Llegá con anticipación: faltar en el día y hora señalados hace perder esa evaluación.",
    ],
    importante:
      "Los méritos se pierden si no rendís dentro de dos periodos académicos consecutivos; tres reprobaciones obligan a recursar.",
    fuentes: [{ titulo: "Reglamento Académico, art. 13", url: REGLAMENTO }],
    verificadoEl: VERIFICADO,
  },
  {
    id: "nota-final-revision",
    titulo: "Nota final y revisión de evaluaciones",
    categoria: "evaluacion",
    resumen: "RP = 0,4 × EF + 0,6 × PEP, con mínimo de 50 % en el examen final.",
    detalle:
      "La escala oficial es: 0–59 = 1; 60–70 = 2; 71–80 = 3; 81–90 = 4; 91–100 = 5. La fracción decimal se redondea al entero superior cuando es igual o mayor a 0,5.",
    pasos: [
      "Revisá la retroalimentación del parcial en la semana siguiente.",
      "Para revisión de final, presentá la solicitud hasta dos días hábiles antes de la fecha oficial de revisión.",
      "Consultá la fecha de revisión publicada en el horario de finales.",
    ],
    fuentes: [{ titulo: "Reglamento Académico, arts. 15 y 16", url: REGLAMENTO }],
    verificadoEl: VERIFICADO,
  },
  {
    id: "homologacion",
    titulo: "Homologación de asignaturas",
    categoria: "tramite",
    resumen:
      "Solicitá el reconocimiento dentro del periodo habilitado y con documentación completa.",
    detalle:
      "La página oficial de trámites concentra el formulario, los requisitos y el seguimiento. Para el segundo periodo 2026 el plazo publicado va del 29 de junio al 17 de julio a las 12:00.",
    pasos: [
      "Compará asignaturas y programas antes de solicitar.",
      "Prepará cédula y documentos académicos exigidos.",
      "Presentá cada antecedente con los visados que correspondan.",
      "Guardá el número o comprobante y seguí el estado de la solicitud.",
    ],
    importante:
      "No supongas que una materia quedó homologada hasta que figure la resolución o actualización institucional.",
    fuentes: [{ titulo: "Solicitud y seguimiento de homologación", url: TRAMITES }],
    verificadoEl: VERIFICADO,
  },
  {
    id: "anulacion-cambio-def",
    titulo: "Anulación, cambio de sección y renuncia a DEF",
    categoria: "tramite",
    resumen: "Son gestiones distintas y cada una produce efectos académicos diferentes.",
    detalle:
      "La anulación debe solicitarse dentro de las dos primeras semanas y no puede restituirse. La renuncia al derecho a evaluación final permite volver a cursar la asignatura, pero el derecho renunciado tampoco se restituye. El cambio de sección se gestiona por el canal publicado por Grado.",
    pasos: [
      "Leé el efecto del trámite antes de enviarlo.",
      "Verificá el plazo vigente.",
      "Adjuntá lo solicitado y conservá el comprobante.",
      "Controlá posteriormente tu inscripción en el sistema.",
    ],
    fuentes: [
      { titulo: "Trámites académicos de grado", url: TRAMITES },
      { titulo: "Reglamento Académico, arts. 6 y 7", url: REGLAMENTO },
    ],
    verificadoEl: VERIFICADO,
  },
  {
    id: "gratuidad-exoneracion-deudas",
    titulo: "Gratuidad, exoneraciones y fraccionamiento",
    categoria: "tramite",
    resumen:
      "Cada beneficio tiene formulario, requisitos y periodo propio; no se concede automáticamente.",
    detalle:
      "Gratuidad, exoneraciones y fraccionamiento de deuda aparecen como procesos separados en el calendario y en la página de trámites. Consultá también los aranceles vigentes antes de pagar.",
    pasos: [
      "Identificá el beneficio que corresponde a tu situación.",
      "Reuní documentos antes de que se abra el periodo.",
      "Presentá la solicitud dentro del horario oficial.",
      "No consideres aprobado el beneficio hasta recibir confirmación.",
    ],
    fuentes: [
      { titulo: "Trámites académicos de grado", url: TRAMITES },
      { titulo: "Aranceles FP-UNA", url: "https://www.pol.una.py/academico/aranceles/" },
    ],
    verificadoEl: VERIFICADO,
  },
  {
    id: "traslado-readmision-permanencia",
    titulo: "Traslado, ingreso directo y readmisión",
    categoria: "tramite",
    resumen:
      "Ingreso directo, traslado, permanencia y readmisión tienen formularios y condiciones diferentes.",
    detalle:
      "La FP-UNA publica por separado las solicitudes de ingreso directo, traslado desde otras unidades académicas, extensión de permanencia y readmisión. No son equivalentes a una inscripción ordinaria y requieren resolución o aprobación institucional.",
    pasos: [
      "Identificá el trámite que corresponde a tu situación académica.",
      "Descargá el formulario vigente desde la página oficial.",
      "Prepará certificados y antecedentes con los visados solicitados.",
      "Presentá dentro del periodo y seguí el expediente hasta la resolución.",
    ],
    importante:
      "No inicies una cursada suponiendo que el traslado o la readmisión ya fueron aprobados.",
    fuentes: [{ titulo: "Trámites académicos de grado", url: TRAMITES }],
    verificadoEl: VERIFICADO,
  },
  {
    id: "inscripcion-especial-dispensas",
    titulo: "Inscripción especial y dispensa",
    categoria: "inscripcion",
    resumen:
      "Cuando la inscripción normal no cubre tu caso, puede existir un procedimiento especial sujeto a evaluación.",
    detalle:
      "La página oficial agrupa los procedimientos de inscripción especial y solicitud de dispensa. Presentar el pedido no garantiza su aprobación: la situación se analiza conforme al plan, los antecedentes y la normativa aplicable.",
    pasos: [
      "Intentá primero la inscripción ordinaria dentro del plazo.",
      "Leé los requisitos del formulario especial vigente.",
      "Explicá el motivo con documentación comprobable.",
      "Esperá la confirmación institucional antes de considerar inscripta la asignatura.",
    ],
    fuentes: [{ titulo: "Formularios y plazos de Grado", url: TRAMITES }],
    verificadoEl: VERIFICADO,
  },
  {
    id: "horarios-examenes-oficiales",
    titulo: "Dónde verificar horarios, aulas y exámenes",
    categoria: "servicio",
    resumen:
      "Usá el horario oficial y las actualizaciones de la Delegación; revisá nuevamente antes de salir.",
    detalle:
      "FP-UNA publica horarios de clases, parciales y finales por periodo. La Web de la Delegación organiza esos datos para tu sección, pero una recalendarización o cambio de aula debe contrastarse con la fuente oficial.",
    pasos: [
      "Guardá tu sección exacta en el planificador.",
      "Consultá el calendario personalizado de exámenes.",
      "Verificá el aula el mismo día.",
      "Reportá cualquier discrepancia a la Delegación.",
    ],
    fuentes: [{ titulo: "Horarios de clases y exámenes FP-UNA", url: HORARIOS }],
    verificadoEl: VERIFICADO,
  },
  {
    id: "biblioteca-soporte",
    titulo: "Biblioteca, internet y contactos útiles",
    categoria: "servicio",
    resumen: "El CIC ofrece recursos de información y acceso gratuito a Internet para estudiantes.",
    detalle:
      "El Centro de Información y Cultura brinda biblioteca, formación de usuarios y acceso a Internet. Para consultas generales, FP-UNA publica sus teléfonos y correos institucionales en la página de contactos.",
    pasos: [
      "Consultá el catálogo y recursos del CIC.",
      "Usá tu correo institucional al pedir soporte.",
      "Describí el problema e incluí carrera, cédula o cuenta solo por canales oficiales.",
    ],
    fuentes: [
      {
        titulo: "Centro de Información y Cultura",
        url: "https://www.pol.una.py/centro-de-informacion-y-cultura/",
      },
      { titulo: "Contactos FP-UNA", url: "https://www.pol.una.py/contactos/" },
    ],
    verificadoEl: VERIFICADO,
  },
];
