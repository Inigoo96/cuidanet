/* Genera la secuencia de fotogramas WebP de la escena cinemática.
   Uso (desde esta carpeta):   npm install   y luego   npm run generar
   Requiere Google Chrome instalado (ruta en CHROME_PATH o la habitual de Windows).
   Herramienta de desarrollo: NO forma parte de la web publicada. */
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright-core');

const CHROME = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const SALIDA = path.resolve(__dirname, '../../assets/frames');
const CONJUNTOS = [
  { nombre: 'lg', w: 1280, h: 720, calidad: 0.86 }, // escritorio
  { nombre: 'sm', w: 640, h: 360, calidad: 0.8 }    // móvil y ahorro de datos
];
const FOTOGRAMAS = Number(process.env.FOTOGRAMAS || 120);

(async () => {
  const navegador = await chromium.launch({ executablePath: CHROME });
  const pagina = await navegador.newPage();
  await pagina.setContent(fs.readFileSync(path.join(__dirname, 'escena.html'), 'utf8'));
  const guardar = (url, destino) => fs.writeFileSync(destino, Buffer.from(url.split(',')[1], 'base64'));

  for (const c of CONJUNTOS) {
    fs.mkdirSync(path.join(SALIDA, c.nombre), { recursive: true });
    let bytes = 0;
    for (let i = 0; i < FOTOGRAMAS; i++) {
      const t = i / (FOTOGRAMAS - 1);
      const url = await pagina.evaluate(([t, w, h, q]) => window.render(t, w, h, q), [t, c.w, c.h, c.calidad]);
      const destino = path.join(SALIDA, c.nombre, `f${String(i + 1).padStart(3, '0')}.webp`);
      guardar(url, destino); bytes += fs.statSync(destino).size;
    }
    console.log(`${c.nombre}: ${FOTOGRAMAS} fotogramas, ${(bytes / 1048576).toFixed(2)} MB`);
  }
  // Póster: imagen fija para sin JS, movimiento reducido y carga inicial
  const poster = await pagina.evaluate(() => window.render(0.93, 1280, 720, 0.8));
  guardar(poster, path.join(SALIDA, 'poster.webp'));
  await navegador.close();
})();
