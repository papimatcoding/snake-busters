# Snake Busters

Prototipo de action-roguelite para móvil. El nuevo objetivo del proyecto es **vertical / portrait**, con controles táctiles visibles y combate inmediato. Seguimos desarrollándolo como HTML/CSS/JS estático para iterar rápido en navegador; si la dirección funciona, el siguiente salto será empaquetarlo como app Android para Play Store.

## Estado actual — 0.9.0 · 9 septiembre 2026

### Cambio de rumbo: mobile portrait

- La partida se diseña ahora para **teléfono en vertical**.
- El campo de juego ocupa la parte superior/central y los controles permanecen en una zona propia debajo.
- Se añade un **botón físico de ATAQUE** táctil. En móvil, tocar/arrastrar sobre la arena fija la mira y mantener ATAQUE dispara hacia ese punto.
- Sobrecarga y Tormenta siguen como botones independientes de habilidad y definitiva.
- El movimiento táctil conserva cuatro direcciones en una cruceta inferior.
- HUD de sector, núcleo y objetivo se compacta para retrato.
- Sonido se oculta durante combate móvil para reducir ruido visual; pausa e idioma siguen accesibles.
- El canvas conserva por ahora la simulación 1200×740 y se encaja dentro del layout vertical. Esto permite validar primero el feel del producto sin reescribir todavía recorridos, colisiones ni encuentros.
- Escritorio sigue funcionando con WASD/flechas, ratón, E y Q para depuración.
- `dist/mobile.css` contiene la adaptación portrait.
- `dist/mobile.js` separa apuntado táctil y disparo táctil sin acoplar el motor al DOM.

### Jugabilidad que se mantiene de 0.8

- Volt como Buster de referencia.
- Tridente Tesla con 3 cargas de munición y recarga secuencial.
- Sobrecarga como habilidad con cooldown.
- Tormenta de núcleo como definitiva AOE apuntable.
- Cinco sectores de Toxic Sewers.
- Greenfang con segmentos normales, blindados y explosivos.
- Split de dos ramas, Hunt cronometrado, nidos destructibles, bifurcación de ruta y Greenfang Alpha con veneno.
- Mejoras entre sectores y mutaciones persistentes durante la expedición.
- Récord/progreso local al navegador; no es un ranking online.

## Controles

| Acción | PC | Móvil vertical |
| --- | --- | --- |
| Mover | WASD / flechas | Cruceta inferior |
| Apuntar | Ratón | Tocar o arrastrar sobre la arena |
| Ataque básico | Clic mantenido | Mantener **ATACAR** |
| Habilidad | E | Botón Sobrecarga |
| Ultimate | Q | Botón Tormenta |
| Pausa | P / Escape | Botón Pausa |
| Elegir mejora | Clic / 1, 2, 3 | Tocar carta |

## Probar localmente

Requiere Node.js 20 o posterior. No hay dependencias.

```sh
git clone https://github.com/papimatcoding/snake-busters.git
cd snake-busters
node server.mjs
```

Abrir `http://localhost:3000` desde el móvil en la misma red o usar GitHub Pages cuando termine el deploy.

## Código

- `dist/index.html`: shell de pantallas y HUD.
- `dist/style.css`: estilos base existentes.
- `dist/mobile.css`: layout mobile-first en retrato.
- `dist/engine.js`: simulación independiente del navegador.
- `dist/game.js`: render Canvas, entrada base, audio y UI.
- `dist/mobile.js`: adaptación táctil de apuntado + botón de ataque.
- `tests/engine.test.mjs`: pruebas de la simulación.
- `.github/workflows/pages.yml`: validación/deploy de Pages.

`dist/` es código fuente escrito a mano y debe permanecer versionado.

## Validación

Comandos previstos:

```sh
node --test tests/engine.test.mjs
npm run check
```

En esta iteración el entorno de ejecución del asistente no pudo clonar GitHub por resolución DNS, por lo que **no se afirma una validación local que no se ha realizado**. La lógica de `engine.js` no se ha modificado; los cambios se concentran en HTML/CSS y adaptación de eventos táctiles. El workflow de Pages debe seguir siendo la segunda barrera antes de considerar el parche estable.

## Decisiones de diseño actuales

1. Validar primero si Snake Busters funciona como juego móvil vertical antes de invertir en arte final o migración nativa.
2. Mantener el motor independiente del DOM para que una futura migración a otro runtime no obligue a rehacer reglas y balance desde cero.
3. No convertir todavía el mapa interno del combate a geometría vertical. Primero se prueba ergonomía, tamaño de arena y feel; si convence, el siguiente refactor puede rediseñar el recorrido alrededor del retrato nativo.
4. Mantener Volt y Greenfang como placeholders funcionales mientras cerramos controles, pacing y bucle de run.
5. No añadir monetización, cuentas, analytics ni falso online durante el prototipo.

## Próximo paso al retomar

**Test manual en móvil real.** Jugar desde un teléfono en vertical y evaluar:

- si la arena se ve demasiado pequeña,
- si apuntar con un dedo y disparar con otro es cómodo,
- si la cruceta debe convertirse en joystick analógico,
- tamaño/posición de Ataque, Sobrecarga y Tormenta,
- cuánto espacio deben ocupar HUD y controles,
- si conviene convertir también la geometría interna del nivel a un recorrido vertical real.

A partir de ese test, hacer una segunda pasada de controles y layout antes de añadir nuevos Busters o sistemas.
