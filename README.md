# Snake Busters

Prototipo de action-roguelite para móvil. La dirección actual es **vertical / portrait**, con controles táctiles pensados desde móvil y combate inmediato. Seguimos desarrollándolo como HTML/CSS/JS estático para iterar rápido en navegador; si la dirección funciona, el siguiente salto será empaquetarlo como app Android para Play Store.

## Estado actual — 0.9.1 · 9 septiembre 2026

### Mobile portrait — segunda pasada de UI

- La cruceta se elimina por completo.
- El movimiento pasa a un **joystick táctil inferior izquierdo**.
- El ataque básico pasa a un **joystick de ataque/apuntado inferior derecho**: arrastrar fija dirección y mantenerlo activo dispara, inspirado en controles twin-stick de juegos móviles de acción.
- **Sobrecarga** y **Tormenta** se convierten también en controles apuntables: arrastras para elegir dirección/objetivo y se lanzan al soltar.
- Los medidores reales de cooldown y carga se mantienen debajo de la capa táctil de las habilidades.
- La arena ya no se toca para apuntar; así se evita mezclar movimiento de cámara/dedo con disparo y se separan claramente las dos manos.
- La UI de combate se reorganiza como un cockpit inferior: movimiento a la izquierda, ataque a la derecha y habilidades agrupadas encima del pulgar derecho.
- HUD, títulos y textos secundarios se reducen para dar prioridad a la arena y a los controles.
- Las pantallas de inicio, lobby y mapa de brote tienen overrides móviles para **caber en una sola pantalla sin scroll**. En móvil se ocultan elementos decorativos/secundarios antes que encoger indiscriminadamente todo.
- El lobby prioriza Buster + misión + botón JUGAR; panel social y decoración pesada desaparecen en retrato mientras no aporten gameplay.
- El mapa de brote compacta introducción y despliegue, manteniendo el mapa como elemento central.
- El canvas conserva por ahora la simulación interna 1200×740. La geometría real del nivel todavía no ha sido rehecha a portrait nativo.
- Escritorio continúa funcionando con WASD/flechas, ratón, E y Q para depuración.

### Jugabilidad que se mantiene

- Volt como Buster de referencia.
- Tridente Tesla con 3 cargas de munición y recarga secuencial.
- Sobrecarga como habilidad con cooldown.
- Tormenta como definitiva AOE apuntable.
- Cinco sectores de Toxic Sewers.
- Greenfang con segmentos normales, blindados y explosivos.
- Split de dos ramas, Hunt cronometrado, nidos destructibles, bifurcación de ruta y Greenfang Alpha con veneno.
- Mejoras entre sectores y mutaciones persistentes durante la expedición.
- Récord/progreso local al navegador; no es un ranking online.

## Controles

| Acción | PC | Móvil vertical |
| --- | --- | --- |
| Mover | WASD / flechas | Joystick izquierdo |
| Apuntar ataque | Ratón | Joystick derecho |
| Ataque básico | Clic mantenido | Mantener/desplazar joystick de ataque |
| Habilidad | E | Arrastrar Sobrecarga y soltar |
| Ultimate | Q | Arrastrar Tormenta y soltar |
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
- `dist/mobile.css`: layout portrait y compactación completa de UI móvil.
- `dist/engine.js`: simulación independiente del navegador.
- `dist/game.js`: render Canvas, entrada base, audio y UI.
- `dist/mobile.js`: capa twin-stick que adapta gestos táctiles a la entrada existente sin acoplar el motor al DOM.
- `tests/engine.test.mjs`: pruebas de la simulación.
- `.github/workflows/pages.yml`: validación/deploy de Pages.

`dist/` es código fuente escrito a mano y debe permanecer versionado.

## Validación

Comandos previstos:

```sh
node --test tests/engine.test.mjs
npm run check
```

La lógica de `engine.js` no se ha modificado en esta pasada. Los cambios están concentrados en `mobile.css` y `mobile.js`. El entorno del asistente no ha podido ejecutar una validación local completa contra el repositorio, por lo que **no se afirma que los tests hayan pasado localmente**. GitHub Pages y el test manual en teléfono real siguen siendo la validación práctica de esta iteración.

## Decisiones de diseño actuales

1. Snake Busters se trata ya como producto móvil vertical, no como un juego de PC encajado en teléfono.
2. Los controles deben poder usarse con dos pulgares sin tocar la arena durante combate normal.
3. Ninguna pantalla principal debe requerir scroll en un teléfono vertical razonable; si falta espacio se elimina información secundaria antes de superponer o reducir legibilidad.
4. Mantener el motor independiente del DOM para facilitar una futura migración a Android/nativo u otro runtime.
5. No rehacer todavía la geometría interna 1200×740 hasta validar que la nueva ergonomía twin-stick es la correcta.
6. Mantener Volt y Greenfang como placeholders funcionales mientras cerramos controles, pacing y bucle de run.

## Próximo paso al retomar

**Test manual de la versión twin-stick en móvil real.** Evaluar especialmente:

- comodidad y tamaño del joystick izquierdo,
- precisión del joystick de ataque,
- si disparar al mantener el joystick derecho se siente natural,
- colocación de Sobrecarga y Tormenta alrededor del pulgar derecho,
- si alguna pantalla todavía corta contenido o crea solapes,
- tamaño útil de la arena,
- si el siguiente gran paso debe ser convertir el propio nivel y recorrido de Greenfang a geometría portrait nativa.

Después de ese test, corregir ergonomía/UI antes de añadir nuevos Busters o sistemas.
