/* Comprobaciones propias de Cuidanet para la integración continua.
   Sin dependencias: solo Node. Se ejecuta desde la raíz o desde esta carpeta.
   Falla (código 1) si se rompe una regla de seguridad o de contenido del proyecto.
   Los datos «EJEMPLO» y «PENDIENTE» solo avisan, salvo con BLOQUEAR_EJEMPLOS=1 (antes de publicar). */
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, resolve, dirname, relative, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const IGNORAR = new Set(['node_modules', '.git', '.claude', 'herramientas']);
const errores = [];
const avisos = [];
const fallo = (m) => errores.push(m);
const aviso = (m) => avisos.push(m);

/* ---------- Recorrido de archivos ---------- */
const todos = [];
(function recorrer(dir) {
  for (const nombre of readdirSync(dir)) {
    if (IGNORAR.has(nombre)) continue;
    const ruta = join(dir, nombre);
    if (statSync(ruta).isDirectory()) recorrer(ruta); else todos.push(ruta);
  }
})(RAIZ);
const rel = (r) => relative(RAIZ, r).split(sep).join('/');
const texto = (r) => readFileSync(r, 'utf8');
const html = todos.filter((r) => extname(r) === '.html');
const propios = todos.filter((r) => ['.html', '.css', '.js'].includes(extname(r)) && !rel(r).startsWith('js/vendor/'));

/* ---------- 1. Estructura y seguridad de cada HTML ---------- */
for (const r of html) {
  const t = texto(r); const n = rel(r);
  if (!/<html lang="es">/.test(t)) fallo(`${n}: falta <html lang="es">`);
  if (!/<title>[^<]{3,}<\/title>/.test(t)) fallo(`${n}: falta <title>`);
  if (!/name="viewport"/.test(t)) fallo(`${n}: falta meta viewport`);
  const csp = t.match(/http-equiv="Content-Security-Policy" content="([^"]+)"/);
  if (!csp) fallo(`${n}: falta la Content-Security-Policy`);
  else {
    if (/'unsafe-(inline|eval)'/.test(csp[1])) fallo(`${n}: la CSP no debe usar 'unsafe-inline' ni 'unsafe-eval'`);
    if (!/default-src 'none'/.test(csp[1])) fallo(`${n}: la CSP debe empezar con default-src 'none'`);
    if (/https?:\/\//.test(csp[1])) fallo(`${n}: la CSP no debe permitir orígenes externos`);
  }
  // Nada de código ni estilos "inline" (la CSP los bloquearía y es mala práctica)
  const vivo = t.replace(/<!--[\s\S]*?-->/g, ''); // los comentarios no cuentan
  if (/<script(?![^>]*\bsrc=)[^>]*>[^<]/i.test(t.replace(/<script[^>]*type="application\/ld\+json"[^>]*>[\s\S]*?<\/script>/g, ''))) fallo(`${n}: hay un <script> en línea`);
  if (/\sstyle=["']/.test(vivo)) fallo(`${n}: hay un atributo style="" (usar CSS)`);
  if (/\son[a-z]+=["']/i.test(vivo)) fallo(`${n}: hay un manejador on…= en línea`);
  // Imágenes siempre con texto alternativo
  for (const img of t.match(/<img\b[^>]*>/g) || []) if (!/\balt=/.test(img)) fallo(`${n}: <img> sin alt → ${img.slice(0, 60)}`);
  // Enlaces que abren pestaña nueva: rel seguro
  for (const a of t.match(/<a\b[^>]*target="_blank"[^>]*>/g) || []) if (!/rel="[^"]*noopener/.test(a)) fallo(`${n}: target="_blank" sin rel="noopener" → ${a.slice(0, 70)}`);
}

/* ---------- 2. Sin recursos de terceros (RGPD: no se envía la IP del visitante) ---------- */
const PERMITIDOS_EXTERNOS = [/^https:\/\/www\.linkedin\.com\/in\//, /^https:\/\/gsap\.com\//];
for (const r of propios) {
  const t = texto(r); const n = rel(r);
  for (const m of t.matchAll(/(?:src|href|action)="(https?:\/\/[^"]+)"/g)) {
    if (!PERMITIDOS_EXTERNOS.some((p) => p.test(m[1]))) fallo(`${n}: recurso o enlace externo no permitido → ${m[1]}`);
  }
  if (extname(r) !== '.html') {
    for (const m of t.matchAll(/url\(\s*['"]?(https?:\/\/[^)'"]+)/g)) fallo(`${n}: url() externa → ${m[1]}`);
    if (/@import\s+url\(\s*['"]?https?:/.test(t)) fallo(`${n}: @import externo`);
  }
  if (/fonts\.(googleapis|gstatic)\.com/.test(t)) fallo(`${n}: tipografías de Google (deben estar autoalojadas en fonts/)`);
}

/* ---------- 3. Secretos ---------- */
const SECRETOS = [
  [/AKIA[0-9A-Z]{16}/, 'clave de AWS'], [/gh[pousr]_[A-Za-z0-9]{36,}/, 'token de GitHub'],
  [/-----BEGIN (?:RSA |EC |OPENSSH |PGP )?PRIVATE KEY-----/, 'clave privada'],
  [/xox[baprs]-[A-Za-z0-9-]{10,}/, 'token de Slack'], [/AIza[0-9A-Za-z_-]{35}/, 'clave de API de Google'],
  [/(?:api[_-]?key|secret|passwd|password|token)\s*[:=]\s*["'][A-Za-z0-9/+_-]{16,}["']/i, 'posible credencial asignada']
];
const textuales = todos.filter((r) => ['.html', '.css', '.js', '.json', '.md', '.txt', '.yml', '.cjs', '.mjs', '.svg'].includes(extname(r)) && !rel(r).startsWith('js/vendor/'));
for (const r of textuales) {
  const t = texto(r);
  for (const [re, que] of SECRETOS) if (re.test(t)) fallo(`${rel(r)}: parece contener ${que}`);
}
for (const r of todos) if (/(^|\/)\.env(\..+)?$/.test(rel(r)) && !rel(r).endsWith('.env.example')) fallo(`${rel(r)}: archivo .env en el repositorio`);

/* ---------- 4. Integridad de las librerías de terceros (GSAP) ---------- */
const vend = join(RAIZ, 'js/vendor/VERSIONES.txt');
if (!existsSync(vend)) fallo('js/vendor/VERSIONES.txt: falta (versiones y huellas de las librerías)');
else {
  for (const m of texto(vend).matchAll(/^(\S+\.js)\s+sha384-(\S+)$/gm)) {
    const f = join(RAIZ, 'js/vendor', m[1]);
    if (!existsSync(f)) { fallo(`js/vendor/${m[1]}: falta`); continue; }
    const huella = createHash('sha384').update(readFileSync(f)).digest('base64');
    if (huella !== m[2]) fallo(`js/vendor/${m[1]}: la huella no coincide con VERSIONES.txt (¿archivo modificado?)`);
  }
}

/* ---------- 5. Enlaces y anclas internos ---------- */
for (const r of html) {
  const t = texto(r); const n = rel(r);
  const ids = new Set([...t.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
  for (const m of t.matchAll(/\shref="([^"]+)"/g)) {
    const h = m[1];
    if (/^(https?:|mailto:|tel:)/.test(h)) continue;
    const [archivo, ancla] = h.split('#');
    const destino = archivo ? resolve(dirname(r), archivo) : r;
    if (archivo && !existsSync(destino)) { fallo(`${n}: enlace roto → ${h}`); continue; }
    if (ancla) {
      const idsDestino = archivo ? new Set([...texto(destino).matchAll(/\sid="([^"]+)"/g)].map((x) => x[1])) : ids;
      if (!idsDestino.has(ancla)) fallo(`${n}: ancla inexistente → ${h}`);
    }
  }
  for (const m of t.matchAll(/\s(?:src|href)="((?!https?:|mailto:|data:|#)[^"]+)"/g)) {
    const archivo = m[1].split('#')[0]; if (archivo && !existsSync(resolve(dirname(r), archivo))) fallo(`${n}: recurso no encontrado → ${m[1]}`);
  }
}

/* ---------- 6. Presupuesto de peso ---------- */
const peso = (carpeta) => todos.filter((r) => rel(r).startsWith(carpeta)).reduce((a, r) => a + statSync(r).size, 0);
const PRESUPUESTO = [['assets/frames/lg/', 3.2], ['assets/frames/sm/', 1.2], ['fonts/', 0.2], ['js/vendor/', 0.2]];
for (const [carpeta, maxMB] of PRESUPUESTO) {
  const mb = peso(carpeta) / 1048576;
  if (mb > maxMB) fallo(`${carpeta}: ${mb.toFixed(2)} MB supera el presupuesto de ${maxMB} MB`);
}
for (const [archivo, maxKB] of [['js/main.js', 60], ['css/estilos.css', 140], ['index.html', 90]]) {
  const kb = statSync(join(RAIZ, archivo)).size / 1024;
  if (kb > maxKB) fallo(`${archivo}: ${kb.toFixed(0)} KB supera el presupuesto de ${maxKB} KB`);
}

/* ---------- 7. Contenido: datos provisionales (aviso, no fallo) ---------- */
let pendientes = 0; let ejemplos = 0;
for (const r of html) { const t = texto(r); pendientes += (t.match(/\[PENDIENTE/g) || []).length; ejemplos += (t.match(/class="ejemplo"/g) || []).length; }
if (pendientes || ejemplos) {
  const m = `Quedan ${pendientes} marcadores [PENDIENTE] y ${ejemplos} datos de EJEMPLO por sustituir antes de publicar la web.`;
  if (process.env.BLOQUEAR_EJEMPLOS === '1') fallo(m); else aviso(m);
}
if (/100\s?%\s?seguro|invulnerable|garantizamos que nunca/i.test(html.map(texto).join('\n'))) fallo('Hay una promesa de seguridad absoluta en los textos (prohibido por la guía de voz).');

/* ---------- Informe ---------- */
const enGitHub = process.env.GITHUB_ACTIONS === 'true';
for (const a of avisos) console.log(enGitHub ? `::warning::${a}` : `AVISO  ${a}`);
for (const e of errores) console.log(enGitHub ? `::error::${e}` : `ERROR  ${e}`);
console.log(`\nComprobaciones: ${html.length} páginas HTML, ${propios.length} archivos propios revisados.`);
if (errores.length) { console.log(`✖ ${errores.length} problema(s).`); process.exit(1); }
console.log('✔ Todo correcto.');
