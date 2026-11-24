# Cuidanet

Web de presentación de **Cuidanet**, ciberseguridad para pymes y grandes empresas: detectamos vulnerabilidades en sus webs y apps y las defendemos en tiempo real, sin que necesiten un departamento de seguridad propio.

Sitio estático (HTML, CSS y JavaScript propios) con animaciones de [GSAP](https://gsap.com) autoalojado. Sin proceso de compilación.

## Probarla en local

```
python -m http.server 8080
```

y abrir <http://localhost:8080>.

## Documentación

- [LEEME.md](LEEME.md): estructura, animaciones, datos de ejemplo, adaptación a dispositivos y cabeceras de seguridad del hosting.
- [Brief.md](Brief.md): fuente de verdad del negocio.
- [CLAUDE.md](CLAUDE.md): guía de trabajo del equipo (voz de marca, reglas de contenido y de desarrollo).

## Integración continua

Cada pull request pasa por `.github/workflows/ci.yml`:

- Reglas del proyecto: política de seguridad de contenido, sin recursos de terceros, sin secretos, integridad de GSAP, enlaces internos y presupuesto de peso.
- HTML válido.
- Pruebas de humo en Chrome: móvil, tablet y escritorio, escena con scroll, tarjetas que giran, formulario, y versiones sin JavaScript y con movimiento reducido.
- Auditoría de dependencias.

En local, desde `herramientas/ci`: `npm ci` y luego `npm run todo`.

## Estado

Primera entrega. Hay datos **provisionales** marcados como `EJEMPLO` y `[PENDIENTE]` que deben sustituirse antes de publicar; la CI avisa de cuántos quedan. Los textos legales son borradores pendientes de revisión profesional.
