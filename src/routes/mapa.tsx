/**
 * /mapa — Mapa Interactivo de Materias IEK
 *
 * v2: Selector de énfasis previo al mapa.
 * - Pantalla inicial para elegir énfasis antes de ver el mapa.
 * - Filtrado dinámico: Plan Básico (comun) + énfasis seleccionado.
 * - Persistencia en localStorage.
 * - Animaciones suaves con transiciones CSS del sitio.
 * - "Cambiar énfasis" disponible en cualquier momento.
 */

import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, Layers } from "lucide-react";
import { SiteNavbar } from "@/components/SiteNavbar";
import { SiteFooter } from "@/components/SiteFooter";
import { PageBreadcrumb, PageEyebrow } from "@/components/PageHeading";
import {
  ENFASIS_OPTIONS,
  MALLAS_ACADEMICAS,
  type EnfasisId,
  type MallaAcademicaId,
} from "@/lib/malla-curricular";
import { writeLocalState } from "@/lib/user-state";

export const Route = createFileRoute("/mapa")({ component: MapaInteractivoPage });

/* ======================================================================
   CSS ESCOPADO (solo estilos que Tailwind no cubre: grafo SVG, tabla, modal)
   ====================================================================== */
const MAPA_CSS = `
.iek-mapa-root {
  --m-white: 255,255,255;
  --m-panel: rgba(255,255,255,0.04);
  --m-panel-border: rgba(255,255,255,0.08);
  --m-text-0:#eef2ff;
  --m-text-1:#a8b3d1;
  --m-text-2:#6c7798;
  --m-input-bg: rgba(0,0,0,0.25);
  --m-accent-cyan:#22d3ee;
  --m-accent-blue:#3b82f6;
  --m-accent-gray:#8b97c2;
  --m-c-comun:#7c8db5;
  --m-c-control-industrial:#3b82f6;
  --m-c-electronica-medica:#2dd4bf;
  --m-c-mecatronica:#a78bfa;
  --m-c-teleprocesamiento:#fb923c;
  --m-ok:#34d399;
  --m-warn:#fbbf24;
  --m-lock:#64748b;
  --m-cursando:#facc15;
  line-height:1.5;
}

/* Modo claro: el mapa usaba colores fijos pensados solo para fondo oscuro
   (texto casi blanco sobre paneles casi blancos, invisibles en modo claro).
   Estas variables lo adaptan sin tocar el resto de la identidad visual. */
html.light .iek-mapa-root {
  --m-white: 15,23,42;
  --m-text-0:#141a30;
  --m-text-1:#4a5170;
  --m-text-2:#6b7290;
  --m-input-bg: rgba(15,23,42,0.05);
}

html.light .iek-mapa-selector {
  background:oklch(0.96 0.015 255 / 0.96);
  color:#141a30;
}
html.light .iek-mapa-enfasis-card {
  border-color:rgba(15,23,42,0.13);
  box-shadow:0 12px 32px -24px rgba(15,23,42,0.35);
}
html.light .iek-mapa-enfasis-card::before {
  background:linear-gradient(90deg,transparent,rgba(15,23,42,0.12),transparent);
}
html.light .iek-mapa-enfasis-card:hover {
  box-shadow:0 24px 54px -26px rgba(15,23,42,0.38);
}
html.light .iek-mapa-enfasis-bar {
  background:rgba(15,23,42,0.035);
  border-color:rgba(15,23,42,0.11);
}
html.light .iek-mapa-root .m-toolbar select option {
  background:#fff;
  color:#141a30;
}
html.light .iek-mapa-root .m-node.state-aprobada .m-nname,
html.light .iek-mapa-root .m-stat-card.ok .m-val,
html.light .iek-mapa-root .m-pill.aprobada {
  color:#047857;
}
html.light .iek-mapa-root .m-stat-card.warn .m-val,
html.light .iek-mapa-root .m-pill.cursando,
html.light .iek-mapa-root .m-disclaimer svg {
  color:#a16207;
}
html.light .iek-mapa-root .m-stat-card.lock .m-val,
html.light .iek-mapa-root .m-pill.bloqueada {
  color:#475569;
}
html.light .iek-mapa-root .m-section-title svg,
html.light .iek-mapa-root .m-req-card h4 svg {
  color:#0891b2;
}

html.light .iek-mapa-modal-overlay {
  background:rgba(15,23,42,0.28);
}
html.light .iek-mapa-modal {
  --m-modal-muted:#64748b;
  --m-modal-ok:#047857;
  --m-modal-accent:#0891b2;
  background:linear-gradient(160deg,rgba(255,255,255,0.99),rgba(241,245,249,0.99));
  border-color:rgba(15,23,42,0.14);
  box-shadow:0 24px 70px -28px rgba(15,23,42,0.45);
  color:#334155;
}
html.light .iek-mapa-modal .m-close {
  background:rgba(15,23,42,0.05);
  border-color:rgba(15,23,42,0.12);
  color:#475569;
}
html.light .iek-mapa-modal .m-close:hover {
  color:#0f172a;
  background:rgba(15,23,42,0.1);
}
html.light .iek-mapa-modal h2 { color:#141a30; }
html.light .iek-mapa-modal .m-block h5,
html.light .iek-mapa-modal .m-req-list .empty { color:#64748b; }
html.light .iek-mapa-modal .m-req-list li,
html.light .iek-mapa-modal .m-status-btn {
  background:rgba(15,23,42,0.035);
  border-color:rgba(15,23,42,0.11);
  color:#475569;
}
html.light .iek-mapa-modal .m-req-list li:hover,
html.light .iek-mapa-modal .m-status-btn:hover { background:rgba(15,23,42,0.075); }
html.light .iek-mapa-modal .m-status-btn.sel-cursando.active { color:#854d0e; }
html.light .iek-mapa-modal .m-status-btn.sel-aprobada.active { color:#047857; }
html.light .iek-mapa-modal .m-status-btn.sel-pendiente.active {
  background:rgba(100,116,139,0.16);
  color:#334155;
}
html.light .iek-mapa-modal .m-special-note { color:#92400e; }

/* Selector overlay */
.iek-mapa-selector {
  position:fixed;inset:0;z-index:150;
  overflow-y:auto;
  -webkit-overflow-scrolling:touch;
  padding:20px;
  background:oklch(0.16 0.04 260 / 0.92);
  backdrop-filter:blur(18px) saturate(140%);
  -webkit-backdrop-filter:blur(18px) saturate(140%);
  transition:opacity 0.4s ease;
  opacity:1;
}
.iek-mapa-selector.exiting { opacity:0; pointer-events:none; }
.iek-mapa-selector-card {
  transition:opacity 0.4s ease, transform 0.4s cubic-bezier(0.2,0.7,0.2,1);
  transform:scale(1) translateY(0);
  margin:auto;
  min-height:fit-content;
}
.iek-mapa-selector.exiting .iek-mapa-selector-card {
  opacity:0; transform:scale(0.95) translateY(-12px);
}

/* Tarjeta de énfasis en el selector */
.iek-mapa-enfasis-card {
  border:1px solid rgba(255,255,255,0.08);border-radius:20px;padding:20px;
  cursor:pointer;transition:transform 0.35s cubic-bezier(0.2,0.7,0.2,1),
    border-color 0.3s ease, box-shadow 0.35s ease;
  display:flex;flex-direction:column;gap:10px;text-align:left;
  background:linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02));
  backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);
  position:relative;overflow:hidden;width:100%;
}
.iek-mapa-enfasis-card::before {
  content:"";position:absolute;inset:0 0 auto 0;height:1px;
  background:linear-gradient(90deg,transparent,rgba(255,255,255,0.12),transparent);
}
.iek-mapa-enfasis-card:hover {
  transform:translateY(-6px);
  box-shadow:0 24px 60px -20px rgba(0,0,0,0.5);
}
.iek-mapa-enfasis-card:focus-visible {
  outline:2px solid var(--m-accent-cyan);outline-offset:3px;
}

/* Mapa content fade-in */
.iek-mapa-content {
  opacity:0;transition:opacity 0.5s ease 0.1s;
}
.iek-mapa-content.visible { opacity:1; }

/* Barra de énfasis activo */
.iek-mapa-enfasis-bar {
  display:flex;align-items:center;gap:12px;flex-wrap:wrap;
  margin-bottom:18px;
  padding:12px 16px;border-radius:16px;
  background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);
}

/* Graph */
.iek-mapa-root .m-graph-scroll{overflow-x:auto;padding-bottom:8px;}
.iek-mapa-root .m-semesters{display:flex;gap:18px;min-width:max-content;position:relative;padding:6px 4px 18px;}
.iek-mapa-root .m-sem-col{
  width:240px;flex-shrink:0;background:rgba(var(--m-white),0.02);
  border:1px solid rgba(var(--m-white),0.08);border-radius:16px;padding:14px;position:relative;
}
.iek-mapa-root .m-sem-col h3{
  margin:0 0 12px;font-size:14px;font-weight:700;color:var(--m-text-0);
  display:flex;align-items:center;justify-content:space-between;
  font-family:"Space Grotesk",system-ui,sans-serif;
}
.iek-mapa-root .m-sem-col h3 span{font-size:11px;color:var(--m-text-2);font-weight:500;}
.iek-mapa-root .m-sem-nodes{display:flex;flex-direction:column;gap:10px;}
.iek-mapa-root .m-node{
  background:rgba(var(--m-white),0.045);border:1px solid rgba(var(--m-white),0.08);
  border-left:4px solid #7c8db5;border-radius:12px;padding:10px 12px;
  cursor:pointer;transition:.15s ease;backdrop-filter:blur(6px);position:relative;
}
.iek-mapa-root .m-node:hover{background:rgba(var(--m-white),0.085);transform:translateX(3px);box-shadow:0 6px 18px -8px rgba(34,211,238,0.4);}
.iek-mapa-root .m-node:focus-visible{outline:2px solid #22d3ee;outline-offset:1px;}
.iek-mapa-root .m-node .m-nname{font-size:12.5px;font-weight:600;color:var(--m-text-0);display:flex;align-items:center;gap:6px;}
.iek-mapa-root .m-node .m-nmeta{font-size:10.5px;color:var(--m-text-2);margin-top:4px;display:flex;gap:6px;flex-wrap:wrap;}
.iek-mapa-root .m-node .m-badge{font-size:9.5px;padding:1px 7px;border-radius:999px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;}
.iek-mapa-root .m-node.state-aprobada{border-left-color:#34d399;}
.iek-mapa-root .m-node.state-aprobada .m-nname{color:#34d399;}
.iek-mapa-root .m-node.state-disponible{border-left-color:#3b82f6;}
.iek-mapa-root .m-node.state-bloqueada{opacity:.55;}
.iek-mapa-root .m-node.state-cursando{border-left-color:#facc15;}
.iek-mapa-root .m-node .m-lockicon{width:13px;height:13px;color:var(--m-text-2);flex-shrink:0;}
.iek-mapa-root .m-node.dim{opacity:.18;pointer-events:none;}
.iek-mapa-root svg.m-connections{position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;overflow:visible;}
.iek-mapa-root svg.m-connections path{fill:none;stroke-width:1.6;opacity:.35;}
.iek-mapa-root svg.m-connections path.active{opacity:.9;stroke-width:2.2;}

/* Toolbar */
.iek-mapa-root .m-toolbar{
  display:flex;gap:12px;flex-wrap:wrap;align-items:center;
  background:rgba(var(--m-white),0.04);border:1px solid rgba(var(--m-white),0.08);
  border-radius:16px;padding:14px 16px;margin-bottom:22px;backdrop-filter:blur(10px);
}
.iek-mapa-root .m-search-box{flex:1 1 220px;position:relative;display:flex;align-items:center;}
.iek-mapa-root .m-search-box svg{position:absolute;left:12px;width:16px;height:16px;color:var(--m-text-2);}
.iek-mapa-root .m-search-box input{
  width:100%;background:var(--m-input-bg);border:1px solid rgba(var(--m-white),0.08);
  border-radius:10px;padding:10px 12px 10px 36px;color:var(--m-text-0);font-size:14px;
}
.iek-mapa-root .m-search-box input:focus{outline:none;border-color:#22d3ee;}
.iek-mapa-root .m-toolbar select{
  background:var(--m-input-bg);border:1px solid rgba(var(--m-white),0.08);color:var(--m-text-0);
  border-radius:10px;padding:10px 12px;font-size:13.5px;cursor:pointer;
}
.iek-mapa-root .m-toolbar select:focus{outline:none;border-color:#22d3ee;}
.iek-mapa-root .m-view-toggle{display:flex;gap:6px;background:var(--m-input-bg);border-radius:10px;padding:4px;border:1px solid rgba(var(--m-white),0.08);}
.iek-mapa-root .m-view-toggle button{border:none;background:transparent;color:var(--m-text-1);font-size:13px;font-weight:600;padding:8px 14px;border-radius:8px;cursor:pointer;display:flex;align-items:center;gap:6px;transition:.15s ease;}
.iek-mapa-root .m-view-toggle button.active{background:linear-gradient(135deg,#3b82f6,#22d3ee);color:#04101f;}
.iek-mapa-root .m-btn{border:none;cursor:pointer;font-size:14px;font-weight:600;padding:10px 18px;border-radius:12px;transition:.18s ease;display:inline-flex;align-items:center;gap:8px;}
.iek-mapa-root .m-btn-ghost{background:rgba(var(--m-white),0.04);color:var(--m-text-0);border:1px solid rgba(var(--m-white),0.08);}
.iek-mapa-root .m-btn-ghost:hover{background:rgba(var(--m-white),0.09);transform:translateY(-1px);}

/* Stats */
.iek-mapa-root .m-stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:14px;margin-bottom:28px;}
.iek-mapa-root .m-stat-card{background:rgba(var(--m-white),0.04);border:1px solid rgba(var(--m-white),0.08);border-radius:16px;padding:16px 18px;}
.iek-mapa-root .m-stat-card .m-val{font-size:26px;font-weight:800;color:var(--m-text-0);}
.iek-mapa-root .m-stat-card .m-lbl{font-size:12.5px;color:var(--m-text-1);margin-top:4px;}
.iek-mapa-root .m-stat-card.ok .m-val{color:#34d399;}
.iek-mapa-root .m-stat-card.warn .m-val{color:#fbbf24;}
.iek-mapa-root .m-stat-card.lock .m-val{color:#8b97c2;}
.iek-mapa-root .m-stat-card .m-bar{height:6px;border-radius:4px;background:rgba(var(--m-white),0.08);margin-top:10px;overflow:hidden;}
.iek-mapa-root .m-stat-card .m-bar > div{height:100%;background:linear-gradient(90deg,#3b82f6,#22d3ee);border-radius:4px;}

/* Table */
.iek-mapa-root .m-table-wrap{background:rgba(var(--m-white),0.04);border:1px solid rgba(var(--m-white),0.08);border-radius:16px;overflow:hidden;}
.iek-mapa-root table{width:100%;border-collapse:collapse;font-size:13.5px;}
.iek-mapa-root thead th{text-align:left;padding:12px 14px;background:rgba(var(--m-white),0.04);font-size:11.5px;text-transform:uppercase;letter-spacing:.06em;color:var(--m-text-1);cursor:pointer;user-select:none;white-space:nowrap;position:sticky;top:0;}
.iek-mapa-root thead th:hover{color:var(--m-text-0);}
.iek-mapa-root tbody td{padding:11px 14px;border-top:1px solid rgba(var(--m-white),0.08);color:var(--m-text-1);vertical-align:top;}
.iek-mapa-root tbody tr{cursor:pointer;transition:.12s;}
.iek-mapa-root tbody tr:hover{background:rgba(var(--m-white),0.04);}
.iek-mapa-root tbody td.m-nameCell{color:var(--m-text-0);font-weight:600;}
.iek-mapa-root .m-pill{font-size:10.5px;font-weight:700;padding:3px 9px;border-radius:999px;text-transform:uppercase;letter-spacing:.04em;display:inline-flex;align-items:center;gap:4px;}
.iek-mapa-root .m-pill.aprobada{background:rgba(52,211,153,0.15);color:#34d399;}
.iek-mapa-root .m-pill.disponible{background:rgba(59,130,246,0.15);color:#3b82f6;}
.iek-mapa-root .m-pill.bloqueada{background:rgba(100,116,139,0.18);color:#8b97c2;}
.iek-mapa-root .m-pill.cursando{background:rgba(250,204,21,0.16);color:#facc15;}
.iek-mapa-root .m-enf-pill{font-size:10px;padding:2px 8px;border-radius:999px;border:1px solid rgba(var(--m-white),0.08);color:var(--m-text-1);white-space:nowrap;}

/* Legend */
.iek-mapa-root .m-legend{display:flex;flex-wrap:wrap;gap:18px;margin:16px 0 6px;font-size:12.5px;color:var(--m-text-1);}
.iek-mapa-root .m-legend .m-item{display:flex;align-items:center;gap:8px;}
.iek-mapa-root .m-legend .m-swatch{width:14px;height:14px;border-radius:4px;flex-shrink:0;}

/* Section headings */
.iek-mapa-root .m-section-title{display:flex;align-items:center;gap:10px;font-size:20px;font-weight:700;margin:36px 0 14px;color:var(--m-text-0);font-family:"Space Grotesk",system-ui,sans-serif;}
.iek-mapa-root .m-section-title svg{width:22px;height:22px;color:#22d3ee;}
.iek-mapa-root .m-section-sub{color:var(--m-text-1);font-size:13.5px;margin:-8px 0 16px;}

/* Req grid */
.iek-mapa-root .m-req-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:14px;}
.iek-mapa-root .m-req-card{background:rgba(var(--m-white),0.04);border:1px solid rgba(var(--m-white),0.08);border-radius:16px;padding:18px 20px;}
.iek-mapa-root .m-req-card h4{margin:0 0 10px;font-size:14.5px;color:var(--m-text-0);display:flex;gap:8px;align-items:center;font-family:"Space Grotesk",system-ui,sans-serif;}
.iek-mapa-root .m-req-card h4 svg{width:18px;height:18px;color:#22d3ee;}
.iek-mapa-root .m-req-card ul{margin:0;padding-left:18px;font-size:13px;color:var(--m-text-1);}
.iek-mapa-root .m-req-card li{margin-bottom:6px;}

/* Disclaimer */
.iek-mapa-root .m-disclaimer{display:inline-flex;gap:9px;align-items:center;background:rgba(251,191,36,0.05);border:1px solid rgba(251,191,36,0.20);border-radius:999px;padding:8px 13px;margin-bottom:20px;font-size:12px;color:var(--m-text-1);max-width:100%;}
.iek-mapa-root .m-disclaimer svg{flex-shrink:0;width:15px;height:15px;color:#fbbf24;}
.iek-mapa-root .m-disclaimer b{color:var(--m-text-0);}

/* Footer note */
.iek-mapa-root .m-footer-note{margin-top:50px;padding-top:24px;border-top:1px solid rgba(var(--m-white),0.08);font-size:12.5px;color:var(--m-text-2);text-align:center;}

/* Modal */
.iek-mapa-modal-overlay{position:fixed;inset:0;background:rgba(3,6,16,0.7);backdrop-filter:blur(4px);display:none;align-items:center;justify-content:center;z-index:200;padding:18px;}
.iek-mapa-modal-overlay.open{display:flex;}
.iek-mapa-modal{--m-modal-muted:#6c7798;--m-modal-ok:#34d399;--m-modal-accent:#22d3ee;width:min(520px,100%);max-height:88vh;overflow:auto;background:linear-gradient(160deg,rgba(20,28,52,0.97),rgba(10,15,30,0.98));border:1px solid rgba(255,255,255,0.08);border-radius:20px;padding:26px;box-shadow:0 20px 60px -20px rgba(0,0,0,0.7);position:relative;}
.iek-mapa-modal .m-close{position:absolute;top:18px;right:18px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.08);border-radius:10px;width:34px;height:34px;display:flex;align-items:center;justify-content:center;cursor:pointer;color:#a8b3d1;transition:.15s;}
.iek-mapa-modal .m-close:hover{color:#eef2ff;background:rgba(255,255,255,0.12);}
.iek-mapa-modal h2{margin:4px 0 4px;font-size:21px;color:#eef2ff;padding-right:40px;font-family:"Space Grotesk",system-ui,sans-serif;}
.iek-mapa-modal .m-meta-row{display:flex;gap:8px;flex-wrap:wrap;margin:10px 0 18px;}
.iek-mapa-modal .m-block{margin-bottom:16px;}
.iek-mapa-modal .m-block h5{font-size:12px;text-transform:uppercase;letter-spacing:.07em;color:#6c7798;margin:0 0 8px;display:flex;align-items:center;gap:6px;}
.iek-mapa-modal .m-block h5 svg{width:14px;height:14px;}
.iek-mapa-modal .m-req-list{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:6px;}
.iek-mapa-modal .m-req-list li{font-size:13.5px;padding:8px 12px;border-radius:10px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);display:flex;align-items:center;gap:8px;cursor:pointer;}
.iek-mapa-modal .m-req-list li:hover{background:rgba(255,255,255,0.07);}
.iek-mapa-modal .m-req-list li .m-check{width:15px;height:15px;flex-shrink:0;}
.iek-mapa-modal .m-req-list .empty{color:#6c7798;font-style:italic;background:none;border:none;cursor:default;padding:4px 0;}
.iek-mapa-modal .m-special-note{font-size:12.5px;color:#fbbf24;background:rgba(251,191,36,0.08);border:1px solid rgba(251,191,36,0.25);border-radius:10px;padding:10px 12px;margin-top:8px;}
.iek-mapa-modal .m-status-row{display:flex;gap:8px;flex-wrap:wrap;margin-top:6px;}
.iek-mapa-modal .m-status-btn{flex:1;min-width:90px;border:1px solid rgba(255,255,255,0.08);background:rgba(255,255,255,0.03);color:#a8b3d1;border-radius:10px;padding:9px 8px;font-size:12.5px;font-weight:600;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px;transition:.12s;}
.iek-mapa-modal .m-status-btn:hover{background:rgba(255,255,255,0.08);}
.iek-mapa-modal .m-status-btn.sel-pendiente.active{background:rgba(100,116,139,0.25);color:#fff;border-color:#64748b;}
.iek-mapa-modal .m-status-btn.sel-cursando.active{background:rgba(250,204,21,0.2);color:#facc15;border-color:#facc15;}
.iek-mapa-modal .m-status-btn.sel-aprobada.active{background:rgba(52,211,153,0.2);color:#34d399;border-color:#34d399;}

/* Contenedor principal — más aire lateral en todos los breakpoints */
.iek-mapa-root .m-wrap {
  max-width:1240px;
  margin:0 auto;
  padding:36px 48px 88px;
}

/* Nodo — texto largo no se corta */
.iek-mapa-root .m-node .m-nname {
  word-break:break-word;
  overflow-wrap:break-word;
  hyphens:auto;
}

/* Responsive */
@media (max-width:1280px){
  .iek-mapa-root .m-wrap { padding:32px 40px 80px; }
}
@media (max-width:1024px){
  .iek-mapa-root .m-wrap { padding:28px 32px 80px; }
}
@media (max-width:720px){
  .iek-mapa-root .m-wrap { padding:24px 20px 72px; }
  .iek-mapa-root .m-sem-col { width:200px; }
  .iek-mapa-root .m-toolbar { flex-direction:column; align-items:stretch; }
  .iek-mapa-selector { padding:16px 12px; }
  .iek-mapa-root .m-stats { grid-template-columns:repeat(auto-fit,minmax(120px,1fr)); }
}
@media (max-width:480px){
  .iek-mapa-root .m-wrap { padding:20px 16px 64px; }
  .iek-mapa-root .m-sem-col { width:185px; }
  .iek-mapa-root .m-node { padding:8px 10px; }
  .iek-mapa-root .m-node .m-nname { font-size:12px; }
  .iek-mapa-root .m-section-title { font-size:17px; }
  .iek-mapa-selector { padding:12px 10px; }
  .iek-mapa-enfasis-card { padding:14px 16px; border-radius:14px; gap:8px; }
  .iek-mapa-enfasis-card .m-icon { width:36px; height:36px; }
}
`;

/* ======================================================================
   COMPONENTE
   ====================================================================== */
const STORAGE_KEY_PROGRESO = "iek-mapa-progreso-v1";
const STORAGE_KEY_ENFASIS = "iek-mapa-enfasis-seleccionado";

function readSavedEnfasis(): EnfasisId | null {
  try {
    return (localStorage.getItem(STORAGE_KEY_ENFASIS) as EnfasisId) || null;
  } catch {
    return null;
  }
}

function MapaInteractivoPage() {
  const [mallaVersion, setMallaVersion] = useState<MallaAcademicaId>("plan-2008");
  const materiasData = MALLAS_ACADEMICAS[mallaVersion];
  /* ---- Estado del selector de énfasis ---- */
  const [selectedEnfasis, setSelectedEnfasis] = useState<EnfasisId | null>(readSavedEnfasis);
  const [selectorOpen, setSelectorOpen] = useState<boolean>(!readSavedEnfasis());
  const [selectorExiting, setSelectorExiting] = useState(false);
  const [mapVisible, setMapVisible] = useState<boolean>(!!readSavedEnfasis());

  /* ---- Refs para comunicar React ↔ JS vanilla ---- */
  const activeEnfasisRef = useRef<string>(selectedEnfasis || "");
  const rootRef = useRef<HTMLDivElement>(null);

  /* ---- Colores y label del énfasis activo ---- */
  const activeOption = ENFASIS_OPTIONS.find((e) => e.id === selectedEnfasis);

  /* ============================================================
     Seleccionar un énfasis (desde el selector o "Cambiar")
  ============================================================ */
  function handleSelectEnfasis(id: EnfasisId) {
    // 1. Guardar en localStorage
    try {
      writeLocalState(STORAGE_KEY_ENFASIS, id);
    } catch {
      /* ignore */
    }

    // 2. Actualizar React state
    setSelectedEnfasis(id);
    activeEnfasisRef.current = id;

    // 3. Animar cierre del selector
    setSelectorExiting(true);
    setTimeout(() => {
      setSelectorOpen(false);
      setSelectorExiting(false);
      setMapVisible(true);
      // 4. Decirle al JS que cambie el énfasis y re-renderice
      const w = window as typeof window & { __iekMapa?: Record<string, unknown> };
      if (w.__iekMapa?.setEnfasis) {
        (w.__iekMapa.setEnfasis as (e: string) => void)(id);
      }
    }, 380);
  }

  /* ---- Abrir selector para cambiar énfasis ---- */
  function openSelector() {
    setMapVisible(false);
    setTimeout(() => setSelectorOpen(true), 150);
  }

  /* ============================================================
     useEffect principal — lógica vanilla JS del mapa
  ============================================================ */
  useEffect(() => {
    // Inyectar CSS escopado
    const style = document.createElement("style");
    style.id = "iek-mapa-scoped-styles";
    style.textContent = MAPA_CSS;
    document.head.appendChild(style);

    /* ---- helpers ---- */
    const ENFASIS_LABEL: Record<string, string> = {
      comun: "Formación Común",
      "control-industrial": "Control Industrial",
      "electronica-medica": "Electrónica Médica",
      mecatronica: "Mecatrónica",
      teleprocesamiento: "Teleprocesamiento",
    };
    const STATUS_LABEL: Record<string, string> = {
      pendiente: "Pendiente",
      disponible: "Disponible",
      cursando: "Cursando",
      aprobada: "Aprobada",
      bloqueada: "Bloqueada",
    };
    const ENFASIS_COLORS: Record<string, string> = {
      comun: "#7c8db5",
      "control-industrial": "#3b82f6",
      "electronica-medica": "#2dd4bf",
      mecatronica: "#a78bfa",
      teleprocesamiento: "#fb923c",
    };

    const byId: Record<string, (typeof materiasData)[0]> = {};
    materiasData.forEach((m) => (byId[m.id] = m));

    const desbloqueaMap: Record<string, string[]> = {};
    materiasData.forEach((m) => (desbloqueaMap[m.id] = []));
    materiasData.forEach((m) => {
      m.requisitos.forEach((r) => {
        if (desbloqueaMap[r]) desbloqueaMap[r].push(m.id);
      });
    });

    let activeEnfasis = activeEnfasisRef.current; // sincronizado via ref
    let currentView = "graph";
    let progreso: Record<string, string> = {};
    const storageKeyProgreso = `${STORAGE_KEY_PROGRESO}:${mallaVersion}`;
    const tableSort = { key: "semestre", dir: 1 };

    function loadProgreso() {
      try {
        progreso = JSON.parse(localStorage.getItem(storageKeyProgreso) || "{}");
      } catch {
        progreso = {};
      }
    }
    function saveProgreso() {
      try {
        writeLocalState(storageKeyProgreso, JSON.stringify(progreso));
      } catch {
        /* ignore */
      }
    }

    function isAprobada(id: string) {
      return progreso[id] === "aprobada";
    }
    function isCursando(id: string) {
      return progreso[id] === "cursando";
    }
    function isDisponible(m: (typeof materiasData)[0]) {
      return !isAprobada(m.id) && m.requisitos.every(isAprobada);
    }
    function getEstado(m: (typeof materiasData)[0]) {
      if (isAprobada(m.id)) return "aprobada";
      if (isCursando(m.id)) return "cursando";
      if (isDisponible(m)) return "disponible";
      return "bloqueada";
    }

    /**
     * FILTRO PRINCIPAL: muestra Plan Básico + énfasis seleccionado.
     * Si activeEnfasis está vacío (sin selección), no muestra nada.
     */
    function materiaMatchesEnfasis(m: (typeof materiasData)[0]) {
      if (!activeEnfasis) return false;
      return m.enfasis.includes("comun") || m.enfasis.includes(activeEnfasis as EnfasisId);
    }

    function getFilteredMaterias() {
      const search =
        (document.getElementById("m-searchInput") as HTMLInputElement)?.value
          .trim()
          .toLowerCase() || "";
      const semFilter =
        (document.getElementById("m-filterSemestre") as HTMLSelectElement)?.value || "";
      const estadoFilter =
        (document.getElementById("m-filterEstado") as HTMLSelectElement)?.value || "";
      return materiasData.filter((m) => {
        if (!materiaMatchesEnfasis(m)) return false;
        if (search && !m.nombre.toLowerCase().includes(search)) return false;
        if (semFilter && String(m.semestre) !== semFilter) return false;
        if (estadoFilter && getEstado(m) !== estadoFilter) return false;
        return true;
      });
    }

    function shortEnf(e: string) {
      const map: Record<string, string> = {
        comun: "Común",
        "control-industrial": "C. Industrial",
        "electronica-medica": "E. Médica",
        mecatronica: "Mecatrónica",
        teleprocesamiento: "Teleproceso",
      };
      return map[e] || e;
    }
    function lockIconSVG() {
      return `<svg class="m-lockicon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>`;
    }

    /* ---- Leyenda ---- */
    function renderLegend() {
      const box = document.getElementById("m-legendBox");
      if (!box) return;
      box.innerHTML = "";
      const items = [
        { label: "Plan Básico (común)", color: "#7c8db5" },
        {
          label: ENFASIS_LABEL[activeEnfasis] || "Énfasis",
          color: ENFASIS_COLORS[activeEnfasis] || "#22d3ee",
        },
      ];
      items.forEach((it) => {
        const div = document.createElement("div");
        div.className = "m-item";
        div.innerHTML = `<span class="m-swatch" style="background:${it.color}"></span> ${it.label} <span style="color:var(--m-text-2)">(borde)</span>`;
        box.appendChild(div);
      });
      const sep = document.createElement("div");
      sep.style.cssText = "width:1px;background:rgba(var(--m-white),0.08);margin:0 4px";
      box.appendChild(sep);
      [
        { label: "Aprobada", color: "#34d399" },
        { label: "Disponible", color: "#3b82f6" },
        { label: "Cursando", color: "#facc15" },
        { label: "Bloqueada", color: "#64748b" },
      ].forEach((it) => {
        const div = document.createElement("div");
        div.className = "m-item";
        div.innerHTML = `<span class="m-swatch" style="background:${it.color}"></span> ${it.label}`;
        box.appendChild(div);
      });
    }

    /* ---- Filtro de semestre ---- */
    function populateSemestreFilter() {
      const sel = document.getElementById("m-filterSemestre") as HTMLSelectElement | null;
      if (!sel || sel.options.length > 1) return; // ya poblado
      for (let i = 1; i <= 10; i++) {
        const opt = document.createElement("option");
        opt.value = String(i);
        opt.textContent = "Semestre " + i;
        sel.appendChild(opt);
      }
    }

    /* ---- Grafo ---- */
    function renderGraph() {
      const container = document.getElementById("m-semestersContainer");
      if (!container) return;
      container.innerHTML = "";
      const filtered = getFilteredMaterias();
      const filteredIds = new Set(filtered.map((m) => m.id));
      const hasFilter =
        (document.getElementById("m-searchInput") as HTMLInputElement)?.value.trim() !== "" ||
        (document.getElementById("m-filterSemestre") as HTMLSelectElement)?.value !== "" ||
        (document.getElementById("m-filterEstado") as HTMLSelectElement)?.value !== "";

      for (let sem = 1; sem <= 10; sem++) {
        const materiasSem = materiasData.filter(
          (m) => m.semestre === sem && materiaMatchesEnfasis(m),
        );
        if (!materiasSem.length) continue; // omitir semestres vacíos

        const col = document.createElement("div");
        col.className = "m-sem-col";
        const h3 = document.createElement("h3");
        h3.innerHTML = `Semestre ${sem} <span>${materiasSem.length} materia${materiasSem.length === 1 ? "" : "s"}</span>`;
        col.appendChild(h3);
        const nodesWrap = document.createElement("div");
        nodesWrap.className = "m-sem-nodes";

        materiasSem.forEach((m) => {
          const estado = getEstado(m);
          const node = document.createElement("div");
          node.className = "m-node state-" + estado;
          node.dataset.id = m.id;
          node.tabIndex = 0;
          node.setAttribute("role", "button");
          node.setAttribute("aria-label", `${m.nombre} — ${STATUS_LABEL[estado]}`);
          if (estado === "bloqueada")
            node.style.borderLeftColor = ENFASIS_COLORS[activeEnfasis] || "#7c8db5";
          if (hasFilter && !filteredIds.has(m.id)) node.classList.add("dim");

          const enfBadges = m.enfasis
            .filter((e) => e !== "comun" && e === activeEnfasis)
            .map((e) => {
              const c = ENFASIS_COLORS[e] || "#7c8db5";
              return `<span class="m-badge" style="background:${c}22;color:${c}">${shortEnf(e)}</span>`;
            })
            .join("");

          node.innerHTML = `<div class="m-nname">${estado === "bloqueada" ? lockIconSVG() : ""}${m.nombre}</div>${enfBadges ? `<div class="m-nmeta">${enfBadges}</div>` : ""}`;
          node.onclick = () => openModal(m.id);
          node.onkeydown = (e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              openModal(m.id);
            }
          };
          nodesWrap.appendChild(node);
        });

        col.appendChild(nodesWrap);
        container.appendChild(col);
      }
      requestAnimationFrame(drawConnections);
    }

    function drawConnections() {
      const container = document.getElementById("m-semestersContainer");
      if (!container) return;
      container.querySelector("svg.m-connections")?.remove();
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.setAttribute("class", "m-connections");
      const cr = container.getBoundingClientRect();
      svg.setAttribute("width", String(container.scrollWidth));
      svg.setAttribute("height", String(container.scrollHeight));
      svg.style.cssText = `width:${container.scrollWidth}px;height:${container.scrollHeight}px`;

      const visibleNodes: Record<string, Element> = {};
      container.querySelectorAll(".m-node:not(.dim)").forEach((n) => {
        const id = (n as HTMLElement).dataset.id;
        if (id) visibleNodes[id] = n;
      });

      for (const id in visibleNodes) {
        const materia = byId[id];
        if (!materia) continue;
        materia.requisitos.forEach((reqId) => {
          const from = visibleNodes[reqId];
          const to = visibleNodes[id];
          if (!from || !to) return;
          const fr = from.getBoundingClientRect();
          const tr = to.getBoundingClientRect();
          const x1 = fr.right - cr.left,
            y1 = fr.top + fr.height / 2 - cr.top;
          const x2 = tr.left - cr.left,
            y2 = tr.top + tr.height / 2 - cr.top;
          const dx = Math.max(40, (x2 - x1) / 2);
          const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
          path.setAttribute("d", `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`);
          const color = isAprobada(reqId) ? "#34d399" : "#8b97c2";
          path.setAttribute("stroke", color);
          if (isAprobada(reqId) && (isAprobada(id) || isDisponible(materia)))
            path.classList.add("active");
          svg.appendChild(path);
        });
      }
      container.appendChild(svg);
    }

    /* ---- Tabla ---- */
    function renderTable() {
      const tbody = document.getElementById("m-tableBody");
      if (!tbody) return;
      tbody.innerHTML = "";
      const rows = getFilteredMaterias()
        .slice()
        .sort((a, b) => {
          let av: string | number, bv: string | number;
          switch (tableSort.key) {
            case "nombre":
              av = a.nombre;
              bv = b.nombre;
              break;
            case "enfasis":
              av = a.enfasis.join(",");
              bv = b.enfasis.join(",");
              break;
            case "estado":
              av = getEstado(a);
              bv = getEstado(b);
              break;
            default:
              av = a.semestre;
              bv = b.semestre;
          }
          if (av < bv) return -1 * tableSort.dir;
          if (av > bv) return 1 * tableSort.dir;
          return a.nombre.localeCompare(b.nombre);
        });
      rows.forEach((m) => {
        const tr = document.createElement("tr");
        const estado = getEstado(m);
        const reqNames = m.requisitos.length
          ? m.requisitos.map((r) => byId[r]?.nombre || r).join(", ")
          : m.requisitosEspeciales?.length
            ? m.requisitosEspeciales.join(", ")
            : "—";
        const unlockNames = desbloqueaMap[m.id]?.length
          ? desbloqueaMap[m.id].map((r) => byId[r]?.nombre || r).join(", ")
          : "—";
        const enfBadges = m.enfasis
          .filter((e) => e !== "comun" && e === activeEnfasis)
          .map((e) => `<span class="m-enf-pill">${shortEnf(e)}</span>`)
          .join(" ");
        tr.innerHTML = `<td>${m.semestre}</td><td class="m-nameCell">${m.nombre}</td><td>${enfBadges}</td><td>${reqNames}</td><td>${unlockNames}</td><td><span class="m-pill ${estado}">${STATUS_LABEL[estado]}</span></td>`;
        tr.onclick = () => openModal(m.id);
        tbody.appendChild(tr);
      });
    }

    /* ---- Stats ---- */
    function renderStats() {
      const scope = materiasData.filter(materiaMatchesEnfasis);
      let aprobadas = 0,
        disponibles = 0,
        bloqueadas = 0,
        cursandoN = 0,
        pendientesReq = 0,
        maxSem = 0;
      scope.forEach((m) => {
        const estado = getEstado(m);
        if (estado === "aprobada") {
          aprobadas++;
          if (m.semestre > maxSem) maxSem = m.semestre;
        } else if (estado === "disponible") {
          disponibles++;
          if (m.semestre > maxSem) maxSem = m.semestre;
        } else if (estado === "cursando") cursandoN++;
        else bloqueadas++;
        if (estado !== "aprobada")
          pendientesReq += m.requisitos.filter((r) => !isAprobada(r)).length;
      });
      const pct = scope.length ? Math.round((aprobadas / scope.length) * 100) : 0;
      const box = document.getElementById("m-statsCards");
      if (!box) return;
      box.innerHTML = "";
      [
        { val: aprobadas, lbl: "Aprobadas", cls: "ok" },
        { val: cursandoN, lbl: "Cursando", cls: "warn" },
        { val: disponibles, lbl: "Disponibles", cls: "" },
        { val: bloqueadas, lbl: "Bloqueadas", cls: "lock" },
        { val: pendientesReq, lbl: "Requisitos pendientes", cls: "" },
        { val: maxSem || "—", lbl: "Semestre más avanzado", cls: "" },
        { val: pct + "%", lbl: "Avance estimado", cls: "", bar: pct },
      ].forEach((c) => {
        const div = document.createElement("div");
        div.className = "m-stat-card " + c.cls;
        div.innerHTML =
          `<div class="m-val">${c.val}</div><div class="m-lbl">${c.lbl}</div>` +
          (c.bar !== undefined
            ? `<div class="m-bar"><div style="width:${c.bar}%"></div></div>`
            : "");
        box.appendChild(div);
      });
    }

    /* ---- Modal ---- */
    function openModal(id: string) {
      const m = byId[id];
      if (!m) return;
      const titleEl = document.getElementById("m-modalTitle");
      if (titleEl) titleEl.textContent = m.nombre;
      const metaRow = document.getElementById("m-modalMeta");
      if (metaRow) {
        metaRow.innerHTML = `<span class="m-enf-pill">Semestre ${m.semestre}</span><span class="m-enf-pill">${m.area}</span>
          ${m.enfasis
            .filter((e) => e !== "comun" && e === activeEnfasis)
            .map(
              (e) =>
                `<span class="m-enf-pill" style="border-color:${ENFASIS_COLORS[e]};color:${ENFASIS_COLORS[e]}">${ENFASIS_LABEL[e] || e}</span>`,
            )
            .join("")}
          <span class="m-pill ${getEstado(m)}">${STATUS_LABEL[getEstado(m)]}</span>`;
      }
      const reqList = document.getElementById("m-modalRequisitos");
      if (reqList) {
        reqList.innerHTML = "";
        if (!m.requisitos.length && !m.requisitosEspeciales?.length) {
          reqList.innerHTML = '<li class="empty">Sin requisitos previos.</li>';
        } else {
          m.requisitos.forEach((rid) => {
            const r = byId[rid];
            if (!r) return;
            const li = document.createElement("li");
            const ok = isAprobada(rid);
            li.innerHTML = `<svg class="m-check" viewBox="0 0 24 24" fill="none" stroke="${ok ? "var(--m-modal-ok)" : "var(--m-modal-muted)"}" stroke-width="2">${ok ? '<path d="M20 6L9 17l-5-5"/>' : '<circle cx="12" cy="12" r="9"/>'}</svg> ${r.nombre}`;
            li.onclick = () => openModal(rid);
            reqList.appendChild(li);
          });
        }
      }
      const specialBox = document.getElementById("m-modalSpecial");
      if (specialBox) {
        if (m.requisitosEspeciales?.length) {
          specialBox.style.display = "block";
          specialBox.innerHTML =
            "⚠️ Requisito especial: " +
            m.requisitosEspeciales.join(", ") +
            " — <i>Verificar en la Guía Académica oficial.</i>";
        } else {
          specialBox.style.display = "none";
        }
      }
      const unlockList = document.getElementById("m-modalDesbloquea");
      if (unlockList) {
        unlockList.innerHTML = "";
        const unlocks = desbloqueaMap[id] || [];
        if (!unlocks.length) {
          unlockList.innerHTML =
            '<li class="empty">Esta materia no es requisito de ninguna otra.</li>';
        } else {
          unlocks.forEach((uid) => {
            const u = byId[uid];
            if (!u) return;
            const li = document.createElement("li");
            li.style.display = "flex";
            li.innerHTML = `<svg class="m-check" viewBox="0 0 24 24" fill="none" stroke="var(--m-modal-accent)" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg> ${u.nombre}<span style="color:var(--m-modal-muted);margin-left:auto">Sem. ${u.semestre}</span>`;
            li.onclick = () => openModal(uid);
            unlockList.appendChild(li);
          });
        }
      }
      const statusRow = document.getElementById("m-modalStatusRow");
      if (statusRow) {
        const estado = getEstado(m);
        statusRow.innerHTML = "";
        [
          { key: "pendiente", label: "Pendiente" },
          { key: "cursando", label: "Cursando" },
          { key: "aprobada", label: "Aprobada" },
        ].forEach((o) => {
          const btn = document.createElement("button");
          const isActive =
            (o.key === "pendiente" && (estado === "disponible" || estado === "bloqueada")) ||
            estado === o.key;
          btn.className = `m-status-btn sel-${o.key}${isActive ? " active" : ""}`;
          btn.textContent = o.label;
          btn.onclick = () => {
            if (o.key === "pendiente") delete progreso[id];
            else progreso[id] = o.key;
            saveProgreso();
            renderAll();
            openModal(id);
          };
          statusRow.appendChild(btn);
        });
      }
      const overlay = document.getElementById("m-modalOverlay");
      if (overlay) overlay.classList.add("open");
    }

    function closeModal() {
      document.getElementById("m-modalOverlay")?.classList.remove("open");
    }

    /* ---- View switch ---- */
    function setView(view: string) {
      currentView = view;
      const gv = document.getElementById("m-graphView");
      const tv = document.getElementById("m-tableView");
      const bg = document.getElementById("m-btnViewGraph");
      const bt = document.getElementById("m-btnViewTable");
      if (gv) gv.style.display = view === "graph" ? "block" : "none";
      if (tv) tv.style.display = view === "table" ? "block" : "none";
      if (bg) bg.classList.toggle("active", view === "graph");
      if (bt) bt.classList.toggle("active", view === "table");
      if (view === "graph") requestAnimationFrame(drawConnections);
    }

    /* ---- renderAll ---- */
    function renderAll() {
      renderLegend();
      renderStats();
      if (currentView === "graph") renderGraph();
      else renderTable();
    }

    /* ---- Exponer funciones al scope React ---- */
    (window as typeof window & { __iekMapa?: Record<string, unknown> }).__iekMapa = {
      setEnfasis: (id: string) => {
        activeEnfasis = id;
        activeEnfasisRef.current = id;
        renderAll();
      },
      setView,
      scrollToId: (id: string) =>
        document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" }),
      closeModal,
      openModal,
    };

    /* ---- Event listeners ---- */
    const overlay = document.getElementById("m-modalOverlay");
    const onOverlayClick = (e: Event) => {
      if ((e.target as Element).id === "m-modalOverlay") closeModal();
    };
    overlay?.addEventListener("click", onOverlayClick);
    const onKeydown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeModal();
    };
    document.addEventListener("keydown", onKeydown);
    const onResize = () => {
      if (currentView === "graph") requestAnimationFrame(drawConnections);
    };
    window.addEventListener("resize", onResize);
    const onTableClick = (e: Event) => {
      const th = (e.target as Element).closest("th[data-sort]");
      if (!th) return;
      const key = (th as HTMLElement).dataset.sort || "semestre";
      if (tableSort.key === key) tableSort.dir *= -1;
      else {
        tableSort.key = key;
        tableSort.dir = 1;
      }
      renderTable();
    };
    document.addEventListener("click", onTableClick);

    const searchInput = document.getElementById("m-searchInput");
    const semestreFilter = document.getElementById("m-filterSemestre");
    const estadoFilter = document.getElementById("m-filterEstado");
    const resetButton = document.getElementById("m-btnReset");
    const onReset = () => {
      if (confirm("¿Borrar todo tu progreso guardado en este dispositivo?")) {
        progreso = {};
        saveProgreso();
        renderAll();
      }
    };
    searchInput?.addEventListener("input", renderAll);
    semestreFilter?.addEventListener("change", renderAll);
    estadoFilter?.addEventListener("change", renderAll);
    resetButton?.addEventListener("click", onReset);

    /* ---- Init ---- */
    loadProgreso();
    populateSemestreFilter();
    if (activeEnfasis) renderAll(); // solo si ya hay énfasis seleccionado

    return () => {
      style.remove();
      window.removeEventListener("resize", onResize);
      document.removeEventListener("keydown", onKeydown);
      document.removeEventListener("click", onTableClick);
      overlay?.removeEventListener("click", onOverlayClick);
      searchInput?.removeEventListener("input", renderAll);
      semestreFilter?.removeEventListener("change", renderAll);
      estadoFilter?.removeEventListener("change", renderAll);
      resetButton?.removeEventListener("click", onReset);
      delete (window as typeof window & { __iekMapa?: unknown }).__iekMapa;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mallaVersion]);

  /* Helper para llamar funciones JS desde JSX */
  const call = (fn: string, ...args: unknown[]) => {
    const w = window as typeof window & { __iekMapa?: Record<string, unknown> };
    (w.__iekMapa?.[fn] as ((...a: unknown[]) => void) | undefined)?.(...args);
  };

  return (
    <div className="min-h-screen">
      <SiteNavbar />

      {/* ===============================================================
          SELECTOR DE ÉNFASIS — overlay a pantalla completa
      =============================================================== */}
      {selectorOpen && (
        <div
          className={`iek-mapa-selector${selectorExiting ? " exiting" : ""}`}
          role="dialog"
          aria-modal="true"
          aria-label="Seleccioná tu énfasis"
        >
          <div className="iek-mapa-selector-card w-full max-w-3xl mx-auto px-1 sm:px-0">
            {/* Header */}
            <div className="text-center mb-8">
              <PageBreadcrumb current="Mapa de Materias" className="justify-center" />
              <PageEyebrow icon={Layers}>Malla y correlatividades</PageEyebrow>
              <h1 className="font-display text-3xl sm:text-4xl font-bold mt-2">
                Seleccioná tu <span className="text-gradient">énfasis</span>
              </h1>
              <p className="mt-3 text-muted-foreground text-sm sm:text-base max-w-md mx-auto">
                Elegí el énfasis para visualizar únicamente las materias del Plan Básico y las
                correspondientes a tu carrera.
              </p>
            </div>

            {/* Grid de énfasis */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {ENFASIS_OPTIONS.map(
                ({ id, label, desc, color, Icon, gradientStyle, borderHover, glowStyle }) => (
                  <button
                    key={id}
                    className={`iek-mapa-enfasis-card ${borderHover}`}
                    style={gradientStyle}
                    onClick={() => handleSelectEnfasis(id)}
                    onMouseEnter={(e) =>
                      Object.assign((e.currentTarget as HTMLElement).style, glowStyle)
                    }
                    onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.boxShadow = "")}
                    aria-label={`Seleccionar énfasis ${label}`}
                  >
                    {/* Icono */}
                    <div
                      className="w-11 h-11 rounded-xl flex items-center justify-center ring-1 ring-foreground/10"
                      style={{ background: `${color}22` }}
                    >
                      <Icon className="h-5 w-5" style={{ color }} />
                    </div>
                    {/* Texto */}
                    <div>
                      <div className="font-display font-semibold text-foreground text-base leading-tight">
                        {label}
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground leading-relaxed">
                        {desc}
                      </div>
                    </div>
                    {/* Arrow */}
                    <div className="flex items-center justify-end mt-auto pt-1">
                      <ArrowRight
                        className="h-4 w-4 text-muted-foreground transition-transform duration-300 group-hover:translate-x-1"
                        style={{ color }}
                      />
                    </div>
                  </button>
                ),
              )}
            </div>

            {/* Nota */}
            <p className="mt-6 text-center text-xs text-muted-foreground/60">
              Podés cambiar de énfasis en cualquier momento dentro del mapa.
            </p>
          </div>
        </div>
      )}

      {/* ===============================================================
          CONTENIDO DEL MAPA
      =============================================================== */}
      <main>
        <div
          ref={rootRef}
          className={`iek-mapa-root iek-mapa-content${mapVisible ? " visible" : ""}`}
        >
          <div className="m-wrap">
            <div className="mb-8 max-w-3xl">
              <PageBreadcrumb current="Mapa de Materias" />
              <PageEyebrow icon={Layers}>Malla y correlatividades</PageEyebrow>
              <h1 className="font-display text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
                Mapa de <span className="text-gradient">Materias</span>
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
                Explorá la malla, marcá tu avance y verificá qué materias se habilitan según sus
                correlatividades.
              </p>
            </div>
            <div
              className="mb-5 rounded-2xl border border-border bg-card p-2 sm:inline-flex"
              role="group"
              aria-label="Seleccionar malla académica"
            >
              {(
                [
                  ["plan-2008", "Malla 2008"],
                  ["vigente-2026", "Malla 2026 · Ingresantes 2026"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  onClick={() => setMallaVersion(id)}
                  className={`w-full rounded-xl px-4 py-2.5 text-sm font-medium transition sm:w-auto ${mallaVersion === id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-foreground/5 hover:text-foreground"}`}
                  aria-pressed={mallaVersion === id}
                >
                  {label}
                </button>
              ))}
            </div>

            <p className="mb-5 text-xs leading-relaxed text-muted-foreground">
              Malla 2026: aplicable únicamente a ingresantes del año 2026. Malla 2008: vigente para
              estudiantes pertenecientes a este plan académico.
            </p>

            {/* Barra de énfasis activo + botón Cambiar */}
            {selectedEnfasis && activeOption && (
              <div className="iek-mapa-enfasis-bar">
                <div className="flex items-center gap-2 flex-1">
                  <activeOption.Icon
                    className="h-4 w-4 flex-shrink-0"
                    style={{ color: activeOption.color }}
                  />
                  <span className="text-xs text-muted-foreground">Énfasis activo:</span>
                  <span
                    className="font-display font-semibold text-sm"
                    style={{ color: activeOption.color }}
                  >
                    {activeOption.label}
                  </span>
                  <span className="text-xs text-muted-foreground/60">+ Plan Básico</span>
                </div>
                <button
                  className="btn-premium glass inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-medium text-foreground hover:bg-foreground/10"
                  onClick={openSelector}
                  aria-label="Cambiar énfasis"
                >
                  <Layers className="h-3.5 w-3.5" />
                  Cambiar énfasis
                </button>
              </div>
            )}

            {/* Disclaimer */}
            <div className="m-disclaimer">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 9v4M12 17h.01M10.3 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.7 3.86a2 2 0 00-3.4 0z" />
              </svg>
              <div>
                <b>Referencia académica:</b>{" "}
                {mallaVersion === "plan-2008" ? "Malla 2008" : "Malla 2026 · ingresantes 2026"}.
                Verificá los trámites en canales oficiales.
              </div>
            </div>

            {/* Toolbar */}
            <div className="m-toolbar">
              <div className="m-search-box">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="7" />
                  <path d="M21 21l-4.35-4.35" />
                </svg>
                <input
                  id="m-searchInput"
                  type="text"
                  placeholder="Buscar materia..."
                  aria-label="Buscar materia"
                />
              </div>
              <select id="m-filterSemestre" aria-label="Filtrar por semestre">
                <option value="">Todos los semestres</option>
              </select>
              <select id="m-filterEstado" aria-label="Filtrar por estado">
                <option value="">Todos los estados</option>
                <option value="aprobada">Aprobada</option>
                <option value="disponible">Disponible</option>
                <option value="cursando">Cursando</option>
                <option value="bloqueada">Bloqueada</option>
              </select>
              <div className="m-view-toggle" role="group" aria-label="Cambiar vista">
                <button
                  id="m-btnViewGraph"
                  className="active"
                  onClick={() => call("setView", "graph")}
                  aria-pressed="true"
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <circle cx="6" cy="6" r="3" />
                    <circle cx="18" cy="6" r="3" />
                    <circle cx="12" cy="18" r="3" />
                    <path d="M8.5 7.5L11 16M15.5 7.5L13 16" />
                  </svg>
                  Grafo
                </button>
                <button
                  id="m-btnViewTable"
                  onClick={() => call("setView", "table")}
                  aria-pressed="false"
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <path d="M3 9h18M3 15h18M9 3v18" />
                  </svg>
                  Tabla
                </button>
              </div>
              <button
                className="m-btn m-btn-ghost"
                id="m-btnReset"
                title="Borrar progreso guardado"
                aria-label="Reiniciar progreso"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M3 12a9 9 0 109-9 9.75 9.75 0 00-6.74 2.74L3 8" />
                  <path d="M3 3v5h5" />
                </svg>
                Reiniciar progreso
              </button>
            </div>

            {/* Stats */}
            <div id="m-stats-section">
              <div className="m-section-title">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 3v18h18" />
                  <path d="M7 15l3-4 3 2 4-6" />
                </svg>
                Tu avance académico
              </div>
              <p className="m-section-sub">
                Marcá tus materias como <b>Aprobada</b> o <b>Cursando</b> para visualizar tu
                progreso.{" "}
                <span style={{ color: "var(--m-text-1)" }}>
                  Solo se guarda en este dispositivo.
                </span>
              </p>
              <div className="m-stats" id="m-statsCards"></div>
            </div>

            {/* Legend */}
            <div className="m-legend" id="m-legendBox"></div>

            {/* Graph view */}
            <div id="m-graphView">
              <div className="m-section-title">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="6" cy="6" r="3" />
                  <circle cx="18" cy="6" r="3" />
                  <circle cx="12" cy="18" r="3" />
                  <path d="M8.5 7.5L11 16M15.5 7.5L13 16" />
                </svg>
                Mapa de correlatividades ·{" "}
                {mallaVersion === "plan-2008" ? "Malla 2008" : "Malla 2026"}
              </div>
              <p className="m-section-sub">
                Clic en una materia para ver requisitos, correlativas y marcar tu estado.
              </p>
              <div className="m-graph-scroll">
                <div className="m-semesters" id="m-semestersContainer"></div>
              </div>
            </div>

            {/* Table view */}
            <div id="m-tableView" style={{ display: "none" }}>
              <div className="m-section-title">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <path d="M3 9h18M3 15h18M9 3v18" />
                </svg>
                Tabla de materias · {mallaVersion === "plan-2008" ? "Malla 2008" : "Malla 2026"}
              </div>
              <p className="m-section-sub">Tabla ordenable y filtrable de todas las materias.</p>
              <div className="m-table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th data-sort="semestre">Semestre ▾</th>
                      <th data-sort="nombre">Materia</th>
                      <th data-sort="enfasis">Énfasis</th>
                      <th>Requisitos</th>
                      <th>Desbloquea</th>
                      <th data-sort="estado">Estado</th>
                    </tr>
                  </thead>
                  <tbody id="m-tableBody"></tbody>
                </table>
              </div>
            </div>

            {/* Requisitos generales */}
            <div className="m-section-title" style={{ marginTop: "48px" }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2l3 7h7l-5.5 4.5L18 21l-6-4-6 4 1.5-7.5L2 9h7z" />
              </svg>
              Requisitos generales de titulación
            </div>
            <p className="m-section-sub">
              Información orientativa según la Guía Académica 2024 — verificar siempre en la guía
              oficial.
            </p>
            <div className="m-req-grid">
              {[
                {
                  title: "Plan de estudios",
                  body: "Aprobar todas las asignaturas del Plan de Estudios vigente del énfasis elegido.",
                  icon: "M9 11l3 3L22 4M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11",
                },
                {
                  title: "Extensión universitaria",
                  body: "Completar 30 horas de Extensión Universitaria.",
                  icon: "M22 10v6M2 10l10-5 10 5-10 5zM6 12v5c3 3 9 3 12 0v-5",
                },
                {
                  title: "Pasantía supervisada",
                  body: "Realizar una pasantía supervisada (160 h para Control Industrial; 240 h para los demás énfasis — verificar en la guía oficial).",
                  icon: "M2 7h20v14a2 2 0 01-2 2H4a2 2 0 01-2-2V7zM16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2",
                },
                {
                  title: "Trabajo de Grado",
                  body: "Aprobar el Anteproyecto (Regular 8vo. semestre) y el Proyecto / Trabajo Final de Grado.",
                  icon: "M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83",
                },
              ].map(({ title, body, icon }) => (
                <div key={title} className="m-req-card">
                  <h4>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d={icon} />
                    </svg>
                    {title}
                  </h4>
                  <ul>
                    <li>{body}</li>
                  </ul>
                </div>
              ))}
            </div>

            <div className="m-footer-note">
              Datos extraídos de la Guía Académica 2024 — Facultad Politécnica, UNA. Herramienta
              orientativa creada por la Delegación Estudiantil IEK FPUNA.
            </div>
          </div>
        </div>

        {/* Modal */}
        <div
          className="iek-mapa-modal-overlay"
          id="m-modalOverlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="m-modalTitle"
        >
          <div className="iek-mapa-modal">
            <button className="m-close" onClick={() => call("closeModal")} aria-label="Cerrar">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
            <h2 id="m-modalTitle"></h2>
            <div className="m-meta-row" id="m-modalMeta"></div>
            <div className="m-block">
              <h5>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" />
                  <path d="M7 11V7a5 5 0 0110 0v4" />
                </svg>
                Para cursar esta materia necesitás aprobar
              </h5>
              <ul className="m-req-list" id="m-modalRequisitos"></ul>
              <div className="m-special-note" id="m-modalSpecial" style={{ display: "none" }}></div>
            </div>
            <div className="m-block">
              <h5>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" fill="none" />
                  <path d="M7 11V7a5 5 0 0110 0" />
                </svg>
                Al aprobar esta materia desbloqueás
              </h5>
              <ul className="m-req-list" id="m-modalDesbloquea"></ul>
            </div>
            <div className="m-block">
              <h5>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 11l3 3L22 4M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
                </svg>
                Marcar estado
              </h5>
              <div className="m-status-row" id="m-modalStatusRow"></div>
            </div>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
