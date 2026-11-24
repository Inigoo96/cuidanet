# CLAUDE.md — Cuidanet

Guía para Claude al trabajar en este repositorio. La fuente de verdad del negocio es [Brief.md](Brief.md): si algo de aquí choca con el brief, manda el brief y hay que avisar de la discrepancia.

## Qué es Cuidanet
Empresa de ciberseguridad para pymes y grandes empresas: detecta vulnerabilidades en webs y apps y las defiende en tiempo real, sin que el cliente necesite un departamento de seguridad propio.

**Servicios** (no añadir otros sin confirmarlo):
1. Análisis de vulnerabilidades en webs/apps
2. Monitorización y defensa ante ataques
3. Cumplimiento normativo / RGPD

**Productos propios** (usar siempre estos nombres exactos):
- **Escudo en tiempo real** — monitoriza webs/apps, detecta ataques y las pone a salvo (failover/bloqueo) en segundos.
- **Auditor RGPD con IA** — analiza el nivel de cumplimiento normativo y señala qué corregir.
- **Radar de vulnerabilidades** — escaneo periódico automatizado (configuraciones débiles, puertos abiertos, librerías desactualizadas) con informe priorizado.

## Estado del proyecto
Existe la **web de presentación** (primera entrega): sitio estático en HTML, CSS y JS propios más GSAP autoalojado; sin build. Ver [LEEME.md](LEEME.md) para estructura, cabeceras de hosting y marcadores `[PENDIENTE]`.
- **Arrancar:** `python -m http.server 8080` en la raíz y abrir http://localhost:8080 (no hay instalación ni build).
- **Estructura:** `index.html`, `equipo/*.html`, `css/estilos.css` (paleta en `:root`), `js/main.js`, `fonts/` (Syne e Inter autoalojadas), `assets/`.
- **Paleta:** propuesta y aceptada por el equipo de palabra; sigue pendiente de validación formal.
- **Inicio con scroll:** hero y escena unidos en `#inicio`: secuencia de WebP en `<canvas>` dirigida por una línea de tiempo de GSAP. Generador en `herramientas/generar-frames/` (solo desarrollo, no se publica). Detalles en [LEEME.md](LEEME.md).
- **Datos `EJEMPLO`:** el equipo autorizó (24/11/2026) datos inventados y provisionales solo para maquetar, siempre con la etiqueta visible `class="ejemplo"`. Sustituir antes de publicar. Sigue prohibido inventar clientes, testimonios, certificaciones y estadísticas presentadas como reales.
- **GSAP:** el equipo decidió usarlo (24/11/2026). GSAP 3.15.1 + ScrollTrigger, autoalojados y con versión fijada en `js/vendor/` (única dependencia de la web). Todo debe seguir funcionando sin JS, sin GSAP y con `prefers-reduced-motion`.
- **Barras azules de progreso:** desactivadas por decisión del equipo (no eliminadas). Interruptor `ACTIVAR_BARRAS_PROGRESO` en `js/main.js`.
- **Fase 2 (no hecha):** vídeo de fondo con Remotion, en carpeta aparte con su propio `package.json`.
- **Cualquier otro proyecto (app, backend…):** no asumir tecnología; proponer el stack y esperar confirmación del equipo.

## Idioma y tono
- Todo el contenido de cara al cliente, en **español de España**, con tono **cercano y formal** y trato de **usted**. Para cualquier texto de cliente, usar la skill `voz-cuidanet` ([.claude/skills/voz-cuidanet/SKILL.md](.claude/skills/voz-cuidanet/SKILL.md)).
- Frases cortas, sin tecnicismos innecesarios. Si un término técnico es imprescindible (failover, RGPD, puerto abierto…), explicarlo en una línea.
- Hablar a la pyme sin asustar: nada de alarmismo, mensajes de miedo ni lenguaje frío o corporativo.
- Comentarios en código y mensajes de commit: en español, salvo que el equipo decida otra cosa.

## Identidad visual
- Colores de marca: **azul y negro**. Aún no hay códigos hex definidos; si hacen falta, proponer una paleta concreta (y definirla como variables/tokens en un único sitio) y señalar que está pendiente de validar.
- Mantener contraste accesible (WCAG AA) entre texto y fondo, sobre todo con azul sobre negro.

## Reglas de contenido (importante en una empresa de seguridad)
- **No inventar** clientes, testimonios, casos de éxito, certificaciones, cifras, precios ni estadísticas. Si un texto los necesita, dejar un marcador claro: `[PENDIENTE: dato real]`.
- **Nada de promesas absolutas**: evitar "100 % seguro", "invulnerable", "garantizamos que nunca os atacarán". Preferir "reducimos el riesgo", "detectamos en segundos", etc.
- El Auditor RGPD **no sustituye asesoramiento legal**: no presentarlo así en textos ni en la interfaz.
- Datos de ejemplo siempre ficticios y evidentes (p. ej. `empresa-ejemplo.es`); nunca dominios ni datos reales de terceros.

## Reglas de desarrollo
Somos una empresa de ciberseguridad: el código propio tiene que dar ejemplo.
- Nunca subir secretos (claves, tokens, `.env`, credenciales). Usar variables de entorno y un `.env.example` sin valores reales.
- Validar y sanear toda entrada de usuario; consultas parametrizadas; escapar salidas (XSS).
- Cabeceras de seguridad (CSP, HSTS, X-Content-Type-Options…) y HTTPS por defecto en cualquier web.
- Dependencias mínimas, con versión fijada y mantenidas (es justo lo que vendemos con el Radar).
- Formularios con datos personales: pedir solo lo necesario, informar del tratamiento y enlazar a la política de privacidad (RGPD).
- Los escáneres o herramientas de prueba solo deben apuntar a sistemas propios o con autorización explícita; nunca a objetivos de terceros.

## Equipo
Marcos (DAM, Ciber, Redes), Andrew (DAM, Redes) e Iñigo (DAM, Ciber) — los tres generalistas. No hay roles fijos: cualquiera puede tocar cualquier parte.

## Entorno
Desarrollo en Windows. Preferir comandos y scripts multiplataforma (npm scripts, etc.) frente a los que solo funcionan en una shell concreta.
