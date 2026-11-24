/* ==========================================================================
   CUIDANET — JavaScript de la web.
   Las animaciones usan GSAP + ScrollTrigger (js/vendor, versión fijada y autoalojada).
   Todo es mejora progresiva: sin JS, o si GSAP no carga, la web se ve completa y funciona.
   Con `prefers-reduced-motion`, no se anima nada.

   Qué hace:
     1. Revelados al hacer scroll: tarjetas que entran en 3D y títulos cuyas letras suben o bajan.
     2. INICIO: hero + escena «Cómo vigilamos» en una sola línea de tiempo dirigida por el scroll
        (secuencia de imágenes en un canvas; el título se dispersa letra a letra).
     3. Efectos de ratón: cursor con estela, tarjetas (luz, inclinación 3D, hover) y botones magnéticos.
     4. Tarjetas de producto que giran, cifras que cuentan, carrusel y formulario.
   ========================================================================== */
(() => {
  'use strict';

  /* ---------- INTERRUPTOR de las barras azules de progreso ----------
     Decisión del equipo: DESACTIVADAS (no se ven). Para reactivarlas, poner true:
     se activan la barra de lectura de arriba y la barra de la escena. */
  const ACTIVAR_BARRAS_PROGRESO = false;

  const reducirMovimiento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  // Los efectos de ratón solo tienen sentido con puntero preciso (no en táctiles)
  const hayRaton = window.matchMedia('(pointer: fine) and (hover: hover)').matches;
  const ahorroDatos = Boolean(navigator.connection && navigator.connection.saveData);
  const hayGsap = typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';
  const animar = hayGsap && !reducirMovimiento; // GSAP solo si se admite movimiento
  const efectosRaton = animar && hayRaton;

  /* Separa un texto en palabras y letras (cada letra es un <span>) para animarlas una a una.
     El lector de pantalla sigue leyendo el texto completo gracias a aria-label. */
  const dividirLetras = (el) => {
    const texto = el.textContent.trim();
    el.setAttribute('aria-label', texto);
    el.textContent = '';
    texto.split(' ').forEach((palabra, i, todas) => {
      const pal = document.createElement('span');
      pal.className = 'pal';
      pal.setAttribute('aria-hidden', 'true');
      Array.from(palabra).forEach((letra) => {
        const ch = document.createElement('span');
        ch.className = 'ch';
        ch.textContent = letra;
        pal.appendChild(ch);
      });
      el.appendChild(pal);
      if (i < todas.length - 1) el.appendChild(document.createTextNode(' '));
    });
    return Array.from(el.querySelectorAll('.ch'));
  };
  // Las letras pares vienen de arriba y las impares de abajo (o al revés al salir)
  const desdeArriba = (k) => (k % 2 ? 70 : -70);

  if (hayGsap) {
    gsap.registerPlugin(ScrollTrigger);
    ScrollTrigger.config({ ignoreMobileResize: true }); // la barra del móvil no debe recalcular todo
  }
  if (ACTIVAR_BARRAS_PROGRESO) document.documentElement.classList.add('con-barras');

  /* ---------- Barra de progreso de lectura (desactivada por el interruptor) ---------- */
  const barra = document.querySelector('.progreso');
  if (ACTIVAR_BARRAS_PROGRESO && barra) {
    if (hayGsap) {
      gsap.fromTo(barra, { scaleX: 0 }, { scaleX: 1, ease: 'none', scrollTrigger: { start: 0, end: 'max', scrub: true } });
    } else {
      window.addEventListener('scroll', () => {
        const total = document.documentElement.scrollHeight - window.innerHeight;
        barra.style.transform = `scaleX(${total > 0 ? Math.min(1, window.scrollY / total) : 0})`;
      }, { passive: true });
    }
  }

  /* ---------- Cabecera: se compacta al bajar ---------- */
  const cabecera = document.querySelector('.cabecera');
  if (cabecera) {
    const marcar = () => cabecera.classList.toggle('cabecera--compacta', window.scrollY > 30);
    window.addEventListener('scroll', marcar, { passive: true });
    marcar();
  }

  /* ---------- Menú: marca el apartado que se está viendo ---------- */
  const enlacesMenu = Array.from(document.querySelectorAll('.menu a[href^="#"]'));
  if (enlacesMenu.length && 'IntersectionObserver' in window) {
    const porId = new Map(enlacesMenu.map((a) => [a.getAttribute('href').slice(1), a]));
    const observador = new IntersectionObserver((entradas) => {
      entradas.forEach((entrada) => {
        if (!entrada.isIntersecting) return;
        enlacesMenu.forEach((a) => a.removeAttribute('aria-current'));
        const enlace = porId.get(entrada.target.id);
        if (enlace) enlace.setAttribute('aria-current', 'true');
      });
    }, { rootMargin: '-40% 0px -55% 0px' });
    porId.forEach((_, id) => {
      const seccion = document.getElementById(id);
      if (seccion) observador.observe(seccion);
    });
  }

  /* ==========================================================================
     1. REVELADOS (GSAP + ScrollTrigger)
     ========================================================================== */
  if (animar) {
    // Revelados. Las tarjetas "se componen" con suavidad: la tarjeta aparece con un ligero ascenso y,
    // un instante después, su contenido va llegando por orden (icono, título, texto, enlace).
    gsap.utils.toArray('.revela').forEach((el) => {
      const retraso = (Number(el.dataset.d) || 0) * 0.1;
      const disparador = { trigger: el, start: 'top 90%', once: true };
      if (!el.hasAttribute('data-inclinar')) {
        gsap.from(el, { opacity: 0, y: 34, duration: 0.8, ease: 'power2.out', delay: retraso, scrollTrigger: disparador });
        return;
      }
      const interior = el.matches('[data-flip]') ? el.querySelector('.producto__frente')
        : (el.querySelector(':scope > .miembro__enlace') || el);
      const piezas = Array.from(interior.children).filter((c) => !c.classList.contains('servicio__fx'));
      gsap.timeline({ scrollTrigger: disparador, delay: retraso })
        .from(el, { opacity: 0, y: 26, scale: 0.97, duration: 0.9, ease: 'power3.out' }, 0)
        .from(piezas, { opacity: 0, y: 14, duration: 0.6, ease: 'power2.out', stagger: 0.07 }, 0.18);
    });

    // Títulos de sección: las letras suben o bajan al entrar
    gsap.utils.toArray('.seccion__cabeza h2').forEach((titulo) => {
      const letras = dividirLetras(titulo);
      gsap.from(letras, {
        opacity: 0, y: (k) => desdeArriba(k) * 0.6, duration: 0.8, ease: 'power3.out', stagger: { amount: 0.45 },
        scrollTrigger: { trigger: titulo, start: 'top 88%', once: true }
      });
    });

    // Parallax suave de los resplandores decorativos
    gsap.utils.toArray('.resplandor').forEach((el) => {
      gsap.fromTo(el, { y: -70 }, { y: 70, ease: 'none', scrollTrigger: { trigger: el.parentElement, start: 'top bottom', end: 'bottom top', scrub: true } });
    });

    // Paisaje de cierre: al llegar, amanece. Cada capa se mueve a distinta velocidad (parallax),
    // las estrellas se apagan, las ventanas de la ciudad se encienden y se forma la cúpula protectora.
    const paisaje = document.querySelector('.paisaje');
    if (paisaje) {
      const uno = (sel) => paisaje.querySelector(sel);
      const todos = (sel) => paisaje.querySelectorAll(sel);
      gsap.from(dividirLetras(uno('.paisaje__lema')), {
        opacity: 0, y: (k) => desdeArriba(k) * 0.7, duration: 0.9, ease: 'power3.out', stagger: { amount: 0.7 },
        scrollTrigger: { trigger: paisaje, start: 'top 70%', once: true }
      });
      gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: { trigger: paisaje, start: 'top 92%', end: 'bottom 68%', scrub: 0.7 }
      })
        .fromTo(uno('.paisaje__sol'), { yPercent: 38, opacity: 0.15 }, { yPercent: 0, opacity: 1 }, 0)
        .fromTo(todos('.estr'), { opacity: 0.9 }, { opacity: 0.12, stagger: { amount: 0.4, from: 'random' } }, 0)
        .fromTo(uno('.capa-lejos'), { y: 70 }, { y: 0 }, 0)
        .fromTo(uno('.capa-cerca'), { y: 100 }, { y: 0 }, 0)
        .fromTo(uno('.capa-ciudad'), { y: 150 }, { y: 0 }, 0)
        .fromTo(uno('.capa-suelo'), { y: 50 }, { y: 0 }, 0)
        .fromTo(todos('.vent'), { opacity: 0 }, { opacity: 0.85, stagger: { amount: 0.5, from: 'random' } }, 0.35)
        .fromTo(uno('.paisaje__domo'), { opacity: 0, scale: 0.75, svgOrigin: '800 560' }, { opacity: 1, scale: 1, svgOrigin: '800 560' }, 0.5);
    }

    // Cifras: cuentan hasta su valor al aparecer
    gsap.utils.toArray('[data-valor]').forEach((el) => {
      const meta = Number(el.dataset.valor);
      const estado = { n: 0 };
      const escribir = () => { el.textContent = `${el.dataset.prefijo || ''}${Math.round(estado.n)}${el.dataset.sufijo || ''}`; };
      escribir();
      gsap.to(estado, { n: meta, duration: 1.3, ease: 'power3.out', onUpdate: escribir, scrollTrigger: { trigger: el, start: 'top 88%', once: true } });
    });
  }

  /* ==========================================================================
     2. INICIO: hero + escena «Cómo vigilamos» en una sola línea de tiempo
     La sección es alta y su marco queda fijo (position: sticky, scroll NATIVO).
     Una línea de tiempo de GSAP, ligada al scroll (scrub), mueve a la vez:
       · el fotograma de la secuencia de imágenes (canvas),
       · la salida del hero (las letras se dispersan: unas suben y otras bajan),
       · la entrada y salida de cada paso, también letra a letra.
     Al subir, todo se reproduce al revés.
     ========================================================================== */
  const escena = document.querySelector('[data-escena]');
  if (escena && animar && !ahorroDatos) {
    const total = Number(escena.dataset.total) || 120;
    const base = escena.dataset.frames;
    const conjunto = window.innerWidth < 768 ? 'sm' : 'lg'; // fotogramas ligeros en móvil
    const pista = escena.querySelector('.escena__pista');
    const lienzo = escena.querySelector('.escena__lienzo');
    const poster = escena.querySelector('.escena__poster');
    const ctx = lienzo.getContext('2d', { alpha: false });
    const heroEl = escena.querySelector('.etapa--hero');
    const pasos = Array.from(escena.querySelectorAll('.paso'));
    const indice = Array.from(escena.querySelectorAll('.escena__indice li'));
    const etapas = [heroEl, ...pasos];
    const listas = new Array(total);   // imágenes ya cargadas
    const estado = { fotograma: 0 };   // lo mueve GSAP
    let iniciado = false;              // un <canvas> nuevo ya mide 300 px: no sirve para saber si hay imagen
    let ultimo = -1;
    let etapaActual = -1;

    const pintar = () => {
      if (!iniciado) return;
      const ideal = Math.round(estado.fotograma);
      // Si el fotograma exacto aún no ha llegado, se usa el más cercano ya cargado
      let idx = -1;
      for (let d = 0; d < total && idx < 0; d++) {
        if (listas[ideal - d]) idx = ideal - d;
        else if (listas[ideal + d]) idx = ideal + d;
      }
      if (idx < 0 || idx === ultimo) return;
      ctx.drawImage(listas[idx], 0, 0, lienzo.width, lienzo.height);
      ultimo = idx;
    };

    // Carga progresiva: primero fotogramas separados (para poder moverse ya) y luego el resto
    const orden = [];
    [16, 8, 4, 2, 1].forEach((paso) => {
      for (let i = 0; i < total; i += paso) if (!orden.includes(i)) orden.push(i);
    });
    let siguiente = 0;
    const cargarSiguiente = () => {
      if (siguiente >= orden.length) return;
      const i = orden[siguiente++];
      const img = new Image();
      img.decoding = 'async';
      img.onload = () => {
        listas[i] = img;
        if (!iniciado) { // el primer fotograma fija el tamaño y muestra el lienzo
          iniciado = true;
          lienzo.width = img.naturalWidth;
          lienzo.height = img.naturalHeight;
          lienzo.hidden = false;
          if (poster) poster.style.visibility = 'hidden';
        }
        ultimo = -1;
        pintar();
        cargarSiguiente();
      };
      img.onerror = cargarSiguiente; // si falla uno, se sigue con el resto
      img.src = `${base}/${conjunto}/f${String(i + 1).padStart(3, '0')}.webp`;
    };

    // Letras de cada título y "resto" de cada etapa (etiquetas, textos y botones)
    const letras = etapas.map((el) => dividirLetras(el.querySelector('[data-letras]')));
    const resto = etapas.map((el) => Array.from(el.children).filter((c) => !c.hasAttribute('data-letras')));

    escena.classList.add('escena--viva');
    for (let k = 0; k < 4; k++) cargarSiguiente(); // 4 descargas a la vez

    // Entrada del hero al cargar la página (con el tiempo, no con el scroll)
    gsap.from(letras[0], { opacity: 0, y: desdeArriba, duration: 1, ease: 'power3.out', stagger: { amount: 0.55 }, delay: 0.25 });
    gsap.from(resto[0], { opacity: 0, y: 26, duration: 0.8, ease: 'power3.out', stagger: 0.1, delay: 0.75 });

    // Reparto del recorrido: [hero, paso 1, paso 2, paso 3, paso 4]; coincide con los momentos de la escena
    const limites = [0, 0.14, 0.34, 0.54, 0.78, 1];
    const tl = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: { trigger: pista, start: 'top top', end: 'bottom bottom', scrub: 0.6 }
    });

    // El fotograma recorre toda la secuencia de principio a fin
    tl.to(estado, {
      fotograma: total - 1, duration: 1, ease: 'none',
      onUpdate: () => {
        pintar();
        const p = estado.fotograma / (total - 1);
        escena.style.setProperty('--p', p.toFixed(4)); // para la barra de la escena (si se activa)
        const e = limites.findIndex((v, i) => p >= v && p < limites[i + 1]);
        if (e !== etapaActual) {
          etapaActual = e;
          indice.forEach((el, k) => el.toggleAttribute('data-activo', k === e - 1));
        }
      }
    }, 0);

    etapas.forEach((el, i) => {
      const a = limites[i];
      const b = limites[i + 1];
      if (i > 0) { // entrada: las letras llegan desde arriba y desde abajo, y luego el resto
        tl.fromTo(el, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.001 }, a + 0.004);
        tl.fromTo(letras[i], { opacity: 0, y: desdeArriba }, { opacity: 1, y: 0, duration: 0.05, ease: 'power3.out', stagger: { amount: 0.05 } }, a + 0.004);
        tl.fromTo(resto[i], { opacity: 0, y: 26 }, { opacity: 1, y: 0, duration: 0.05, ease: 'power3.out', stagger: 0.012 }, a + 0.03);
      }
      if (i < etapas.length - 1) { // salida: las letras se dispersan hacia el lado contrario
        tl.fromTo(letras[i], { opacity: 1, y: 0 }, { opacity: 0, y: (k) => -desdeArriba(k) * 1.1, duration: 0.035, ease: 'power2.in', stagger: { amount: 0.03 }, immediateRender: false }, b - 0.075);
        tl.fromTo(resto[i], { opacity: 1, y: 0 }, { opacity: 0, y: -24, duration: 0.03, ease: 'power2.in', immediateRender: false }, b - 0.06);
        tl.to(el, { autoAlpha: 0, duration: 0.001 }, b - 0.006);
      }
    });

    // La escena reacciona al ratón: se desplaza un poco en sentido contrario (profundidad)
    if (efectosRaton) {
      gsap.set(lienzo, { scale: 1.06 });
      const mx = gsap.quickTo(lienzo, 'x', { duration: 0.9, ease: 'power3.out' });
      const my = gsap.quickTo(lienzo, 'y', { duration: 0.9, ease: 'power3.out' });
      escena.addEventListener('pointermove', (e) => {
        mx((e.clientX / window.innerWidth - 0.5) * -26);
        my((e.clientY / window.innerHeight - 0.5) * -16);
      }, { passive: true });
    }
  }

  /* ==========================================================================
     3. EFECTOS DE RATÓN (solo pointer: fine y con movimiento permitido)
     ========================================================================== */
  if (efectosRaton) {
    // 3a. Tarjetas: foco de luz, inclinación 3D y animación de entrada/salida
    // (las caras de una tarjeta que gira se mueven con su contenedor, no por separado)
    const objetivos = Array.from(document.querySelectorAll('.tarjeta, [data-inclinar]'))
      .filter((el) => el.hasAttribute('data-inclinar') || !el.closest('[data-inclinar]'));
    objetivos.forEach((tarjeta) => {
      const inclinar = tarjeta.hasAttribute('data-inclinar');
      const servicio = tarjeta.classList.contains('servicio');
      let rotX; let rotY; let miraX; let miraY;

      if (inclinar) {
        gsap.set(tarjeta, { transformPerspective: 1000 });
        rotX = gsap.quickTo(tarjeta, 'rotationX', { duration: 0.45, ease: 'power3.out' });
        rotY = gsap.quickTo(tarjeta, 'rotationY', { duration: 0.45, ease: 'power3.out' });
      }

      // Icono de los servicios: el ojo sigue al cursor
      const icono = tarjeta.querySelector('.servicio__icono');
      const pupila = tarjeta.querySelector('.ico-pupila');
      if (pupila) {
        miraX = gsap.quickTo(pupila, 'x', { duration: 0.25, ease: 'power3.out' });
        miraY = gsap.quickTo(pupila, 'y', { duration: 0.25, ease: 'power3.out' });
      }

      tarjeta.addEventListener('pointermove', (e) => {
        const caja = tarjeta.getBoundingClientRect();
        const x = e.clientX - caja.left;
        const y = e.clientY - caja.top;
        tarjeta.style.setProperty('--x', `${x}px`);
        tarjeta.style.setProperty('--y', `${y}px`);
        if (inclinar) {
          rotY(((x / caja.width) - 0.5) * 2 * 5);
          rotX(-(((y / caja.height) - 0.5) * 2) * 4);
        }
        if (pupila && icono) {
          const c = icono.getBoundingClientRect();
          const dx = e.clientX - (c.left + c.width / 2);
          const dy = e.clientY - (c.top + c.height / 2);
          const largo = Math.max(1, Math.hypot(dx, dy));
          const k = Math.min(1, largo / 120) / largo;
          miraX(dx * k * 2.4);
          miraY(dy * k * 1.8);
        }
      });

      // Sube un poco al entrar y vuelve a su sitio al salir
      if (inclinar && !servicio) {
        tarjeta.addEventListener('pointerenter', () => gsap.to(tarjeta, { y: -6, duration: 0.35, ease: 'power3.out', overwrite: 'auto' }));
      }
      tarjeta.addEventListener('pointerleave', () => {
        if (inclinar) {
          rotX(0); rotY(0);
          if (!servicio) gsap.to(tarjeta, { y: 0, duration: 0.5, ease: 'power3.out', overwrite: 'auto' });
        }
        if (miraX) { miraX(0); miraY(0); }
      });
    });

    // 3b. Servicios: línea de tiempo de hover (se reproduce al entrar y se rebobina al salir)
    document.querySelectorAll('.servicio').forEach((tarjeta) => {
      const icono = tarjeta.querySelector('.servicio__icono');
      const linea = tarjeta.querySelector('.servicio__linea');
      const barrido = tarjeta.querySelector('.fx__barrido');
      const enlace = tarjeta.querySelector('.servicio__enlace');
      gsap.set(linea, { scaleX: 0.25, transformOrigin: '0 50%' });
      gsap.set(enlace, { autoAlpha: 0, y: 10 });
      gsap.set(barrido, { yPercent: -110, opacity: 0 });

      const tl = gsap.timeline({ paused: true, defaults: { ease: 'power3.out' } })
        .to(tarjeta, { y: -6, duration: 0.35 }, 0)
        .to(icono, { y: -3, scale: 1.06, backgroundColor: 'rgba(46,139,255,0.2)', boxShadow: '0 0 34px -4px rgba(46,139,255,0.45)', duration: 0.35 }, 0)
        .to(linea, { scaleX: 1, duration: 0.5 }, 0)
        .to(enlace, { autoAlpha: 1, y: 0, duration: 0.4 }, 0.1)
        .fromTo(barrido, { yPercent: -110 }, { yPercent: 240, duration: 1.1, ease: 'power1.inOut' }, 0)
        .to(barrido, { opacity: 1, duration: 0.15, ease: 'none' }, 0)
        .to(barrido, { opacity: 0, duration: 0.5, ease: 'none' }, 0.6);

      const entrar = () => tl.timeScale(1).play();
      const salir = () => tl.timeScale(1.8).reverse();
      tarjeta.addEventListener('pointerenter', entrar);
      tarjeta.addEventListener('pointerleave', salir);
      tarjeta.addEventListener('focusin', entrar);   // con teclado también se despliega
      tarjeta.addEventListener('focusout', salir);
    });

    // 3c. Botones magnéticos: se acercan unos píxeles al cursor cuando está cerca
    const magneticos = Array.from(document.querySelectorAll('[data-magnetico]'));
    if (magneticos.length) {
      magneticos.forEach((b) => gsap.set(b, { '--tx': '0px', '--ty': '0px' }));
      document.addEventListener('pointermove', (e) => {
        magneticos.forEach((b) => {
          const c = b.getBoundingClientRect();
          const dx = e.clientX - (c.left + c.width / 2);
          const dy = e.clientY - (c.top + c.height / 2);
          const cerca = Math.hypot(dx, dy) < Math.max(c.width, c.height) * 0.9;
          gsap.to(b, {
            '--tx': cerca ? `${Math.max(-8, Math.min(8, dx * 0.18)).toFixed(1)}px` : '0px',
            '--ty': cerca ? `${Math.max(-6, Math.min(6, dy * 0.25)).toFixed(1)}px` : '0px',
            duration: 0.3, ease: 'power3.out', overwrite: 'auto'
          });
        });
      }, { passive: true });
    }

    // 3d. Cursor con estela: un anillo que sigue al ratón con retraso y crece sobre lo que se puede pulsar
    const anillo = document.createElement('div');
    const punto = document.createElement('div');
    anillo.className = 'cursor';
    punto.className = 'cursor__punto';
    [anillo, punto].forEach((el) => { el.setAttribute('aria-hidden', 'true'); document.body.appendChild(el); });
    gsap.set([anillo, punto], { xPercent: -50, yPercent: -50, opacity: 0 });
    const ax = gsap.quickTo(anillo, 'x', { duration: 0.5, ease: 'power3.out' });
    const ay = gsap.quickTo(anillo, 'y', { duration: 0.5, ease: 'power3.out' });
    const px = gsap.quickTo(punto, 'x', { duration: 0.08, ease: 'none' });
    const py = gsap.quickTo(punto, 'y', { duration: 0.08, ease: 'none' });
    let visible = false;
    let grande = false;
    document.addEventListener('pointermove', (e) => {
      ax(e.clientX); ay(e.clientY); px(e.clientX); py(e.clientY);
      if (!visible) { visible = true; gsap.to([anillo, punto], { opacity: 1, duration: 0.3, overwrite: 'auto' }); }
      const sobre = e.target instanceof Element && Boolean(e.target.closest('a, button, summary, input, textarea, label'));
      if (sobre !== grande) { grande = sobre; gsap.to(anillo, { scale: sobre ? 1.8 : 1, duration: 0.3, ease: 'power3.out', overwrite: 'auto' }); }
    }, { passive: true });
    document.documentElement.addEventListener('mouseleave', () => { visible = false; gsap.to([anillo, punto], { opacity: 0, duration: 0.3, overwrite: 'auto' }); });
  }

  /* ==========================================================================
     TARJETAS DE PRODUCTO QUE GIRAN
     «Ver más» da la vuelta a la tarjeta (rotación 3D) y muestra el dorso con el detalle;
     «Volver» la gira de nuevo. La cara que no se ve queda inerte (sin foco ni lectura).
     Sin JS, las dos caras se muestran una tras otra y no hace falta pulsar nada.
     ========================================================================== */
  document.querySelectorAll('[data-flip]').forEach((tarjeta) => {
    const giro = tarjeta.querySelector('.flip__giro');
    const frente = tarjeta.querySelector('.producto__frente');
    const dorso = tarjeta.querySelector('.producto__dorso');
    const abrir = tarjeta.querySelector('[data-girar="abrir"]');
    const cerrar = tarjeta.querySelector('[data-girar="cerrar"]');
    if (!giro || !frente || !dorso || !abrir || !cerrar) return;

    tarjeta.classList.add('flip--activo');
    const fijar = (girada) => {
      frente.inert = girada;
      dorso.inert = !girada;
      abrir.setAttribute('aria-expanded', String(girada));
    };
    fijar(false);

    const girar = (girada) => {
      fijar(girada);
      if (animar) {
        // Gira con un pequeño "salto" hacia delante a mitad de camino, para dar sensación de objeto físico
        gsap.timeline()
          .to(giro, { rotationY: girada ? 180 : 0, duration: 0.95, ease: 'power3.inOut' }, 0)
          .to(giro, { scale: 1.05, z: 60, duration: 0.45, ease: 'power2.out', yoyo: true, repeat: 1 }, 0);
      } else if (hayGsap) {
        gsap.set(giro, { rotationY: girada ? 180 : 0 });
      } else {
        giro.style.transform = girada ? 'rotateY(180deg)' : '';
      }
      (girada ? cerrar : abrir).focus({ preventScroll: true });
    };
    abrir.addEventListener('click', (e) => { e.stopPropagation(); girar(true); });
    cerrar.addEventListener('click', (e) => { e.stopPropagation(); girar(false); });
    // También gira al pulsar en cualquier parte de la tarjeta (menos en enlaces y botones, ni al seleccionar texto)
    giro.addEventListener('click', (e) => {
      if (e.target instanceof Element && e.target.closest('a, button')) return;
      if (String(window.getSelection && window.getSelection()).length) return;
      girar(dorso.inert); // si el dorso está inerte, se ve el frente: toca girar hacia el dorso
    });
  });

  // Al terminar de cargar (imágenes, fuentes), ScrollTrigger recalcula posiciones
  if (hayGsap) window.addEventListener('load', () => ScrollTrigger.refresh());

  /* ==========================================================================
     4. CARRUSEL DE PROYECTOS
     ========================================================================== */
  document.querySelectorAll('[data-carrusel]').forEach((marco) => {
    const galeria = marco.querySelector('.galeria');
    const mando = marco.querySelector('.galeria-mando');
    if (!galeria || !mando) return;
    mando.hidden = false; // sin JS los botones no se muestran
    mando.addEventListener('click', (e) => {
      const boton = e.target instanceof Element ? e.target.closest('[data-dir]') : null;
      if (!boton) return;
      const dir = Number(boton.dataset.dir) || 1;
      const tarjeta = galeria.firstElementChild;
      const paso = tarjeta ? tarjeta.getBoundingClientRect().width + 20 : galeria.clientWidth * 0.8;
      galeria.scrollBy({ left: dir * paso, behavior: reducirMovimiento ? 'auto' : 'smooth' });
    });
  });

  /* ==========================================================================
     5. FORMULARIO DE CONTACTO
     ========================================================================== */
  const formulario = document.getElementById('formulario');
  if (formulario) {
    // Con JS validamos nosotros (mensajes amables); sin JS manda la validación nativa
    formulario.noValidate = true;

    const estadoForm = document.getElementById('estado-formulario');
    const correoValido = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

    // Elimina caracteres de control y espacios sobrantes. `multilinea` conserva los saltos de línea.
    const sanear = (texto, multilinea = false) => {
      let t = String(texto).normalize('NFC').replace(/\r\n?/g, '\n');
      t = multilinea
        ? t.replace(/[\u0000-\u0009\u000B-\u001F\u007F]/g, '').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n')
        : t.replace(/[\u0000-\u001F\u007F]/g, ' ').replace(/\s+/g, ' ');
      return t.trim();
    };

    const marcarError = (campo, mensaje) => {
      const control = campo.querySelector('input, textarea');
      const aviso = campo.querySelector('.error');
      if (!control || !aviso) return;
      if (mensaje) {
        campo.setAttribute('data-error', '');
        control.setAttribute('aria-invalid', 'true');
        aviso.textContent = mensaje;
      } else {
        campo.removeAttribute('data-error');
        control.removeAttribute('aria-invalid');
        aviso.textContent = '';
      }
    };

    // Reglas: devuelven el mensaje de error o '' si todo está bien
    const reglas = {
      nombre: (v) => (v ? '' : 'Cuéntenos cómo se llama para poder dirigirnos a usted.'),
      email: (v) => {
        if (!v) return 'Necesitamos su correo para poder responderle.';
        return correoValido.test(v) && v.length <= 120
          ? ''
          : 'Parece que falta algo en el correo. Compruebe que tiene la forma nombre@empresa.es.';
      },
      mensaje: (v) => {
        if (!v) return 'Cuéntenos brevemente qué web o app quiere proteger.';
        return v.length >= 10 ? '' : 'Con un par de líneas nos basta para empezar.';
      },
      consentimiento: (marcada) => (marcada ? '' : 'Para poder responderle, necesitamos que acepte el tratamiento de sus datos.')
    };

    const leer = (nombre) => {
      const control = formulario.elements[nombre];
      if (nombre === 'consentimiento') return control.checked;
      return sanear(control.value, nombre === 'mensaje');
    };

    const validarCampo = (nombre) => {
      const control = formulario.elements[nombre];
      const campo = control.closest('.campo');
      const mensaje = reglas[nombre](leer(nombre));
      marcarError(campo, mensaje);
      return mensaje === '';
    };

    // Al salir del campo se avisa; al escribir se quita el aviso en cuanto está bien
    Object.keys(reglas).forEach((nombre) => {
      const control = formulario.elements[nombre];
      if (!control) return;
      control.addEventListener('blur', () => { if (control.value || nombre === 'consentimiento') validarCampo(nombre); });
      control.addEventListener(nombre === 'consentimiento' ? 'change' : 'input', () => {
        if (control.closest('.campo').hasAttribute('data-error')) validarCampo(nombre);
      });
    });

    formulario.addEventListener('submit', (e) => {
      e.preventDefault();
      estadoForm.textContent = '';
      const invalidos = Object.keys(reglas).filter((n) => !validarCampo(n));
      if (invalidos.length) {
        formulario.elements[invalidos[0]].focus();
        estadoForm.textContent = 'Revise, por favor, los campos marcados.';
        return;
      }

      // Mientras no haya servidor, se prepara un correo con los datos ya saneados.
      // (La validación real tendrá que repetirse en el servidor.)
      const destino = (formulario.getAttribute('action') || '').replace(/^mailto:/i, '');
      const cuerpo = [
        `Nombre: ${leer('nombre')}`,
        `Correo: ${leer('email')}`,
        `Empresa: ${sanear(formulario.elements.empresa.value) || '(no indicada)'}`,
        '',
        leer('mensaje')
      ].join('\n');
      const enlace = `mailto:${destino}?subject=${encodeURIComponent('Solicitud de análisis')}&body=${encodeURIComponent(cuerpo)}`;
      estadoForm.textContent = `Abriendo su programa de correo. Si no se abre, escríbanos directamente a ${destino}.`;
      window.location.href = enlace;
    });
  }
})();
