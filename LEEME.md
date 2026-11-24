# Web de presentación de Cuidanet

Web estática: HTML, CSS y JS propios, sin dependencias ni scripts de terceros. Para verla basta con servir la carpeta, por ejemplo:

```
python -m http.server 8080
```

y abrir <http://localhost:8080>. (Abrir `index.html` con doble clic también sirve, pero las fuentes y la CSP se comportan mejor desde un servidor.)

## Estructura

```
index.html          Página única (inicio, servicios, proyectos, equipo, contacto)
equipo/*.html       Fichas de Marcos, Andrew e Iñigo (misma plantilla)
css/estilos.css     Todos los estilos; la paleta está en :root (pendiente de validar)
aviso-legal.html, privacidad.html, cookies.html   Borradores legales
herramientas/       Generador de fotogramas de la escena (solo desarrollo, no se publica)
js/main.js          Animaciones (GSAP), carrusel y validación del formulario
js/vendor/          GSAP y ScrollTrigger autoalojados (versión fijada)
fonts/              Syne e Inter autoalojadas (.woff2, licencia OFL)
assets/             Imágenes del equipo (-640.jpg son las versiones ligeras que usa la web), favicon y frames/ (secuencia)
```

## Animaciones: GSAP

Las animaciones usan **GSAP 3.15.1 + ScrollTrigger**, autoalojados en `js/vendor/` (sin CDN, versión fijada; licencia estándar «no charge» de GreenSock: https://gsap.com/standard-license). Pesan unos 46 KB comprimidos entre los dos. Para actualizarlos, descargar la nueva versión a esa carpeta y repetir las pruebas.

Todo es mejora progresiva: sin JS, si GSAP no carga o con `prefers-reduced-motion`, la web se ve completa y no se anima nada. Las páginas de equipo y legales no cargan GSAP.

## Inicio con scroll (hero + «Cómo vigilamos»)

Una sola sección fija (`#inicio`) con una secuencia de 120 imágenes WebP (`assets/frames/lg` en escritorio, `sm` en móvil) dibujada en un `<canvas>`. Una línea de tiempo de GSAP, ligada al scroll, mueve a la vez el fotograma, la salida del hero (las letras del título se dispersan: unas suben y otras bajan) y la entrada y salida de cada paso, también letra a letra. Al subir, todo retrocede. El scroll es el nativo; la sección queda fija con `position: sticky`.

- **Pesa** unos 2,3 MB en escritorio y 0,7 MB en móvil. Carga progresiva; el móvil solo descarga la versión ligera.
- **Alternativa:** con JS desactivado, movimiento reducido o ahorro de datos se ve una imagen fija (`poster.webp`), el hero y los cuatro pasos en lista.
- **Para cambiar la escena** (otro guion o un vídeo real): `herramientas/generar-frames/`. `escena.html` dibuja cada fotograma y `generar.cjs` los exporta. Si se parte de un vídeo propio, basta con sustituir los WebP de `assets/frames/` por los fotogramas extraídos (mismos nombres `f001.webp`… y ajustar `data-total` en `index.html`). Los límites de cada paso están en `limites` de `js/main.js`.
- Esa carpeta es solo de desarrollo: tiene su propio `package.json` (`playwright-core` fijado) y **no se publica**.

## Tarjetas y efectos

- **Todas las tarjetas** (servicios, productos, equipo) entran en 3D al hacer scroll y se inclinan hacia el cursor.
- **Productos:** «Ver más» da la vuelta a la tarjeta (rotación 3D) y muestra el dorso con el detalle; «Volver» la gira de nuevo. Sin JS se ven las dos caras una tras otra.
- **Cursor con estela**, botones magnéticos y títulos de sección con letras que suben o bajan (solo con ratón y movimiento permitido).

## Adaptación a dispositivos

Revisada en 320 × 568, 360, 390, 430, tablet vertical y horizontal, móvil en horizontal (844 × 390), 1366, 1920 y 2560 px: sin desbordes horizontales y con el texto de cada paso del inicio dentro de la pantalla. Puntos a recordar si se tocan los estilos:
- Móvil en vertical: la escena ocupa la mitad superior y el texto va debajo. En pantallas bajas (≤ 640 px de alto) se compactan los tamaños.
- Móvil en horizontal: cabecera en una sola fila y textos escalados con la altura.
- Servicios y equipo: 1 columna → 2 (con la tercera centrada) → 3. Productos: carrusel hasta 1024 px.
- Pantallas grandes (≥ 1600 px): crece el tamaño base de letra.
- Táctil: sin efectos de hover; zonas seguras (muescas) con `viewport-fit=cover`.
- Cualquier texto largo sin espacios (correos, marcadores) debe poder partirse (`overflow-wrap`), o ensanchará la página en móvil.

## Paisaje de cierre

Al final de Contacto hay un amanecer sobre una ciudad protegida por una cúpula: capas SVG (unos 15 KB, sin imágenes ni vídeo) que GSAP mueve con el scroll. Cada capa va a distinta velocidad (parallax), las estrellas se apagan, las ventanas se encienden y se forma la cúpula. El lema «Usted descanse. Nosotros vigilamos.» entra letra a letra. Sin JS, sin GSAP o con movimiento reducido se ve ya amanecido y quieto. Está escrito directamente en `index.html` (bloque «PAISAJE DE CIERRE»); sus estilos, en la sección 21 del CSS.

## Barras azules de progreso (desactivadas)

La barra de lectura de arriba y la barra de la escena están **desactivadas, no eliminadas**. Para reactivarlas: `ACTIVAR_BARRAS_PROGRESO = true` en `js/main.js`.

## Datos de ejemplo (`EJEMPLO`)

Para poder maquetar, hay datos **inventados y provisionales**: cifras, plazos, teléfono, dirección, horario, razón social, bios y textos legales. Se ven en la página con una etiqueta azul «EJEMPLO». Hay que sustituirlos por datos reales y quitar la etiqueta (clase `ejemplo`) antes de publicar. Para localizarlos: `grep -rn "ejemplo" --include=*.html .`

No se han inventado clientes, testimonios, logos ni certificaciones.

Las páginas `aviso-legal.html`, `privacidad.html` y `cookies.html` son **borradores**: deben revisarlos con un profesional legal.

## Cabeceras que debe enviar el hosting

La CSP ya va en un `<meta>`, pero estas cabeceras **no funcionan** en `<meta>` y hay que configurarlas en el servidor:

```
Strict-Transport-Security: max-age=31536000; includeSubDomains
X-Content-Type-Options: nosniff
Content-Security-Policy: (la misma del <meta>) + frame-ancestors 'none'
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
```

## Formulario de contacto

Todavía no hay servidor. Mientras tanto, el envío usa `mailto:` (abre el programa de correo del visitante). La validación y el saneado de `main.js` son solo comodidad para el usuario: **la validación real tendrá que hacerse en el servidor** cuando exista.

## Marcadores `[PENDIENTE]`

Se ven en la página con un borde punteado para que no se cuelen en producción. Búsquelos con `grep -rn PENDIENTE .`.

## Fase 2 (no incluida)

Vídeo de fondo opcional con Remotion: carpeta aparte, con su propio `package.json` y versiones fijadas, sin nada de eso dentro de la web publicada.
