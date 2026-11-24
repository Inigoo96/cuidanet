/* Pruebas de humo en navegador real para la integración continua.
   Sirve la web con un servidor mínimo propio y comprueba lo esencial en varios tamaños:
   sin errores de consola ni de red (incluidas violaciones de la CSP), sin desbordes horizontales,
   GSAP cargado, escena con scroll funcionando (avanza y retrocede), tarjetas que giran,
   formulario con validación amable, barras azules desactivadas y alternativas sin JS / movimiento reducido.
   Requiere Chrome: variable CHROME_PATH o el Chrome estándar del sistema. */
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, resolve, dirname, extname, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const TIPOS = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.json': 'application/json' };

const servidor = http.createServer(async (req, res) => {
  try {
    let ruta = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (ruta.endsWith('/')) ruta += 'index.html';
    const archivo = normalize(join(RAIZ, ruta));
    if (!archivo.startsWith(RAIZ)) { res.writeHead(403).end(); return; } // nada fuera de la carpeta del proyecto
    const datos = await readFile(archivo);
    res.writeHead(200, { 'Content-Type': TIPOS[extname(archivo)] || 'application/octet-stream', 'X-Content-Type-Options': 'nosniff' }).end(datos);
  } catch { res.writeHead(404).end('no encontrado'); }
});
await new Promise((ok) => servidor.listen(0, '127.0.0.1', ok));
const BASE = `http://127.0.0.1:${servidor.address().port}`;

const candidatos = [process.env.CHROME_PATH, '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium', 'C:/Program Files/Google/Chrome/Application/chrome.exe'].filter(Boolean);
const chrome = candidatos.find((c) => existsSync(c));
if (!chrome) { console.error('No se encontró Chrome (defina CHROME_PATH).'); process.exit(2); }
const navegador = await chromium.launch({ executablePath: chrome });

const fallos = [];
let comprobaciones = 0;
const ok = (cond, msg) => { comprobaciones++; if (!cond) fallos.push(msg); };

async function abrir(opciones, url = '/') {
  const ctx = await navegador.newContext(opciones);
  const p = await ctx.newPage();
  const problemas = [];
  // (el aviso willReadFrequently lo provoca la propia prueba al leer píxeles del canvas; no es de la web)
  p.on('console', (m) => { if (['error', 'warning'].includes(m.type()) && !m.text().includes('willReadFrequently')) problemas.push(`consola: ${m.text()}`); });
  p.on('pageerror', (e) => problemas.push(`error JS: ${e.message}`));
  p.on('response', (r) => { if (r.status() >= 400) problemas.push(`HTTP ${r.status()} ${r.url()}`); });
  await p.goto(BASE + url);
  await p.waitForTimeout(2200);
  return { p, ctx, problemas };
}
const alPuntoDeLaEscena = async (p, f) => {
  await p.evaluate((f) => { const e = document.querySelector('.escena__pista'); window.scrollTo({ top: e.getBoundingClientRect().top + scrollY + f * (e.offsetHeight - innerHeight), behavior: 'instant' }); }, f);
  await p.waitForTimeout(1600);
};
const huellaLienzo = (p) => p.evaluate(() => { const c = document.querySelector('.escena__lienzo'); const d = c.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, c.width, c.height).data; let h = 0; for (let i = 0; i < d.length; i += 97) h = (h * 31 + d[i]) | 0; return h; });

/* ---- Tamaños: sin errores y sin desbordes ---- */
for (const [nombre, vp, movil] of [['móvil 320', { width: 320, height: 568 }, true], ['móvil 390', { width: 390, height: 844 }, true], ['tablet', { width: 768, height: 1024 }, true], ['escritorio', { width: 1440, height: 900 }, false]]) {
  const { p, ctx, problemas } = await abrir({ viewport: vp, hasTouch: movil, isMobile: movil });
  ok(problemas.length === 0, `${nombre}: ${problemas.slice(0, 3).join(' | ')}`);
  ok(await p.evaluate(() => document.documentElement.scrollWidth - innerWidth) <= 0, `${nombre}: desborde horizontal`);
  ok(await p.evaluate(() => innerWidth) === vp.width, `${nombre}: la página ensancha el área visible (algo desborda)`);
  ok(await p.$eval('h1', (e) => getComputedStyle(e).opacity) === '1', `${nombre}: el título no es visible`);
  // El texto de cada etapa del inicio debe caber en pantalla
  for (const f of [0, 0.45, 0.9]) {
    await alPuntoDeLaEscena(p, f);
    const cabe = await p.evaluate(() => { const c = document.querySelector('.cabecera').getBoundingClientRect().bottom; const v = [...document.querySelectorAll('.etapa')].find((e) => getComputedStyle(e).visibility === 'visible'); if (!v) return false; const r = v.getBoundingClientRect(); return r.top >= c - 2 && r.bottom <= innerHeight + 1; });
    ok(cabe, `${nombre}: el texto del inicio no cabe en pantalla (progreso ${f})`);
  }
  await ctx.close();
}

/* ---- Escritorio: animaciones y comportamiento ---- */
{
  const { p, ctx, problemas } = await abrir({ viewport: { width: 1440, height: 900 } });
  ok(await p.evaluate(() => typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined'), 'GSAP/ScrollTrigger no cargan');
  ok(await p.evaluate(() => document.querySelector('.escena').classList.contains('escena--viva')), 'la escena con scroll no se activa');
  const h = {};
  for (const f of [0, 0.3, 0.55, 0.8]) { await alPuntoDeLaEscena(p, f); h[f] = await huellaLienzo(p); }
  ok(new Set(Object.values(h)).size === 4, 'la escena no cambia de fotograma al hacer scroll');
  await alPuntoDeLaEscena(p, 0.55);
  ok(await huellaLienzo(p) === h[0.55], 'al subir, la escena no retrocede al mismo fotograma');
  const barras = await p.evaluate(() => [getComputedStyle(document.querySelector('.progreso')).display, getComputedStyle(document.querySelector('.escena__barra')).display]);
  ok(barras.every((d) => d === 'none'), 'las barras azules de progreso deberían estar desactivadas');

  // Tarjeta de producto que gira (botón y pulsación sobre la tarjeta), sin girar al pulsar un enlace
  await p.evaluate(() => document.getElementById('proyectos').scrollIntoView({ behavior: 'instant' })); await p.evaluate(() => scrollBy(0, 240)); await p.waitForTimeout(2200);
  const girada = () => p.evaluate(() => document.querySelector('[data-girar="abrir"]').getAttribute('aria-expanded') === 'true');
  await p.locator('[data-girar="abrir"]').first().click(); await p.waitForTimeout(1300);
  ok(await girada(), '«Ver más» no gira la tarjeta');
  ok(await p.evaluate(() => document.querySelector('.producto__frente').inert), 'la cara oculta debe quedar inerte');
  await p.locator('.producto__dorso .extra').first().click(); await p.waitForTimeout(1300);
  ok(!(await girada()), 'pulsar sobre el dorso no devuelve la tarjeta');
  await p.locator('.producto__frente .producto__cuerpo h3').first().click(); await p.waitForTimeout(1300);
  ok(await girada(), 'pulsar sobre la tarjeta no la gira');

  // Formulario: mensajes amables
  await p.evaluate(() => document.getElementById('contacto').scrollIntoView({ behavior: 'instant' })); await p.waitForTimeout(1500);
  await p.click('#formulario button[type=submit]'); await p.waitForTimeout(500);
  const errs = await p.$$eval('.error', (e) => e.map((x) => x.textContent).filter(Boolean));
  ok(errs.length === 4, `el formulario vacío debería mostrar 4 avisos y muestra ${errs.length}`);
  ok(await p.evaluate(() => document.activeElement.id) === 'nombre', 'el foco debería ir al primer campo con error');
  ok(problemas.length === 0, `escritorio: ${problemas.slice(0, 3).join(' | ')}`);
  await ctx.close();
}

/* ---- Alternativas: movimiento reducido y sin JavaScript ---- */
for (const [nombre, o] of [['movimiento reducido', { reducedMotion: 'reduce' }], ['sin JavaScript', { javaScriptEnabled: false }]]) {
  const { p, ctx, problemas } = await abrir({ viewport: { width: 1440, height: 900 }, ...o });
  ok(!(await p.evaluate(() => document.querySelector('.escena').classList.contains('escena--viva'))), `${nombre}: la escena no debería animarse`);
  ok(await p.$eval('h1', (e) => getComputedStyle(e).opacity) === '1', `${nombre}: el título debe verse`);
  ok((await p.$$eval('.revela', (e) => [...new Set(e.map((x) => getComputedStyle(x).opacity))])).join() === '1', `${nombre}: hay contenido oculto`);
  ok(problemas.length === 0, `${nombre}: ${problemas.slice(0, 3).join(' | ')}`);
  await ctx.close();
}

/* ---- Otras páginas ---- */
for (const url of ['/privacidad.html', '/aviso-legal.html', '/cookies.html', '/equipo/marcos.html', '/equipo/andrew.html', '/equipo/inigo.html']) {
  const { ctx, problemas } = await abrir({ viewport: { width: 1280, height: 800 } }, url);
  ok(problemas.length === 0, `${url}: ${problemas.slice(0, 3).join(' | ')}`);
  await ctx.close();
}

await navegador.close();
servidor.close();
const enGitHub = process.env.GITHUB_ACTIONS === 'true';
for (const f of fallos) console.log(enGitHub ? `::error::${f}` : `FALLO  ${f}`);
console.log(`\nPruebas de humo: ${comprobaciones - fallos.length}/${comprobaciones} correctas.`);
process.exit(fallos.length ? 1 : 0);
