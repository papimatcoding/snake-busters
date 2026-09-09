# Snake Busters

Prototipo de action-roguelite para móvil. La dirección actual es **vertical / portrait**, con controles táctiles pensados desde móvil y combate inmediato. Seguimos desarrollándolo como HTML/CSS/JS estático para iterar rápido en navegador; si la dirección funciona, el siguiente salto será empaquetarlo como app Android para Play Store.

## Estado actual — 0.9.3 · 9 septiembre 2026

### Hotfix 0.9.3 — navegación robusta + cache busting

- La navegación deja de depender de que `dist/mobile.js` llegue a ejecutarse correctamente.
- `dist/index.html` incluye ahora `[hidden]{display:none!important}` directamente en el `<head>`, por lo que las pantallas ocultas no pueden volver a apilarse aunque falle la capa táctil.
- CSS y JS se cargan con `?v=0.9.3` para evitar que GitHub Pages o el navegador reutilicen una copia vieja después de un deploy.
- La pantalla inicial muestra **BUILD 0.9.3** de forma fija para identificar con certeza qué versión está probando el teléfono.
- El workflow anterior de Pages sí terminó correctamente; el texto “VERSIÓN 0.8” era un literal antiguo del frontend y no indicaba qué commit estaba desplegado.
- No se cambian mecánicas ni motor en este hotfix.

### Mobile portrait — segunda pasada de UI

- La cruceta se elimina por completo.
- El movimiento pasa a un **joystick táctil inferior izquierdo**.
- El ataque básico pasa a un **joystick de ataque/apuntado inferior derecho**: arrastrar fija dirección y mantenerlo activo dispara, inspirado en controles twin-stick de juegos móviles de acción.
- **Sobrecarga** y **Tormenta** son controles apuntables: arrastras para elegir dirección/objetivo y se lanzan al soltar.
- Los medidores reales de cooldown y carga se mantienen debajo de la capa táctil de las habilidades.
- La arena ya no se toca para apuntar; así se separan claramente los dos pulgares.
- La UI de combate se reorganiza como un cockpit inferior: movimiento a la izquierda, ataque a la derecha y habilidades agrupadas encima del pulgar derecho.
- HUD, títulos y textos secundarios se reducen para dar prioridad a la arena y a los controles.
- Inicio, lobby y mapa de brote tienen overrides móviles para caber en una sola pantalla sin scroll.
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

- `dist/index.html`: shell de pantallas, regla crítica de `hidden`, build visible y versionado de assets.
- `dist/style.css`: estilos base existentes.
- `dist/mobile.css`: layout portrait y compactación completa de UI móvil.
- `dist/engine.js`: simulación independiente del navegador.
- `dist/game.js`: render Canvas, entrada base, audio y UI.
- `dist/mobile.js`: capa twin-stick móvil.
- `tests/engine.test.mjs`: pruebas de la simulación.
- `.github/workflows/pages.yml`: validación/deploy de Pages.

`dist/` es código fuente escrito a mano y debe permanecer versionado.

## Validación

Comandos previstos:

```sh
node --test tests/engine.test.mjs
npm run check
```

La lógica de `engine.js` no se ha modificado en esta pasada. El entorno del asistente no ha podido ejecutar una validación local completa contra el repositorio, por lo que **no se afirma que los tests hayan pasado localmente**. GitHub Pages y el test manual en teléfono real siguen siendo la validación práctica de esta iteración.

## Decisiones de diseño actuales

1. Snake Busters se trata ya como producto móvil vertical, no como un juego de PC encajado en teléfono.
2. Los controles deben poder usarse con dos pulgares sin tocar la arena durante combate normal.
3. Ninguna pantalla principal debe requerir scroll en un teléfono vertical razonable; si falta espacio se elimina información secundaria antes de superponer o reducir legibilidad.
4. Mantener el motor independiente del DOM para facilitar una futura migración a Android/nativo u otro runtime.
5. No rehacer todavía la geometría interna 1200×740 hasta validar que la nueva ergonomía twin-stick es la correcta.
6. Mantener Volt y Greenfang como placeholders funcionales mientras cerramos controles, pacing y bucle de run.

## Próximo paso al retomar

**Probar la build 0.9.3 en móvil real empezando por el flujo completo `inicio → lobby → mapa → desplegar`.** La pantalla inicial debe mostrar `BUILD 0.9.3`. Si ese recorrido es estable, evaluar:

- comodidad y tamaño del joystick izquierdo,
- precisión del joystick de ataque,
- si disparar al mantener el joystick derecho se siente natural,
- colocación de Sobrecarga y Tormenta,
- posibles cortes o solapes restantes,
- tamaño útil de la arena,
- si el siguiente gran paso debe ser convertir el recorrido de Greenfang a geometría portrait nativa.
