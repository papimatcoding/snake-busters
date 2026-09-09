# Snake Busters

Prototipo de action-roguelite para móvil. La dirección actual es **vertical / portrait**, con controles táctiles pensados desde móvil y combate inmediato. Seguimos desarrollándolo como HTML/CSS/JS estático para iterar rápido en navegador; si la dirección funciona, el siguiente salto será empaquetarlo como app Android para Play Store.

## Estado actual — 0.9.7 · 9 septiembre 2026

### Portrait combat foundation 0.9.7 — arena móvil nativa

- El mundo lógico deja de ser 1200×740 horizontal y pasa a **720×1120 portrait**.
- Greenfang entra desde arriba y recorre una **S vertical** hasta el núcleo de contención situado justo encima de la zona del Buster.
- Volt se mueve ahora en una zona de combate inferior amplia diseñada alrededor de los dos pulgares, no en una franja horizontal heredada de PC.
- El camino usa una curva Catmull-Rom muestreada por distancia para mantener movimiento suave y continuo de los segmentos.
- Nidos, spawn, límites de movimiento, cámara lógica, combo y decoración del escenario se recolocan al nuevo mundo vertical.
- El canvas móvil conserva la proporción 720:1120 y se centra dentro de la arena sin deformarse.
- Las mejoras quedan preparadas en dos familias visibles: **GENERAL** y **HABILIDAD**.
- Las mejoras actuales de daño/cadena/munición se clasifican como generales; Condensador y Onda de choque pasan a identificarse explícitamente como mejoras de Sobrecarga.
- Esta build todavía no introduce el gran catálogo de mejoras de habilidad: el siguiente paso será añadir efectos transformativos como Tormenta en múltiples rondas.

### Aim & Core pass 0.9.6 — apuntado fluido + núcleo con vida

- Los joysticks móviles pasan a comportamiento **flotante**: el punto donde apoyas el dedo se convierte en el origen del gesto, eliminando el salto inicial provocado por medir desde el centro fijo del botón.
- El apuntado manual añade **asistencia angular suave** hacia objetivos cercanos a la dirección elegida, sin convertir el arrastre en auto-aim completo.
- El básico mantiene `apuntar → soltar → una carga`; toque corto = auto-aim.
- **Sobrecarga** y **Tormenta** también tienen auto-aim con toque corto. Arrastrar conserva apuntado manual asistido.
- El auto-aim de Tormenta busca el grupo de segmentos con mejor concentración dentro de su AOE.
- En móvil se eliminan las mirillas permanentes de habilidad/ultimate y el círculo AOE de Tormenta cargada. El básico conserva solo una guía sutil de dirección.
- El núcleo de contención tiene ahora **100 HP persistentes durante la expedición**. Una brecha ya no termina la partida inmediatamente.
- Cada impacto al núcleo le quita vida y repele a Greenfang una distancia considerable, creando una ventana real para remontar.
- El daño de brecha aumenta ligeramente por sector y por tipo de segmento que alcanza el núcleo.
- El HUD del núcleo muestra `HP / HP máx.` y cambia de estado visual según la vida restante; el porcentaje de margen de Greenfang se mantiene como información secundaria.
- Se añade test específico para múltiples brechas y destrucción final del núcleo.
- `engine.js` también usa cache busting en esta build para garantizar que Pages cargue la nueva lógica.

### Mobile polish 0.9.6 — controles, auto-aim y mejoras

- El básico móvil deja de disparar mientras se arrastra: ahora **se apunta primero y se dispara una sola carga al soltar**.
- Un toque corto sobre el stick de ataque activa **auto-aim** hacia el objetivo cercano y dispara una carga.
- El apuntado manual se calcula desde la posición real de Volt, no desde el centro del canvas, para que la dirección del stick sea más natural.
- Se añade una guía visual de apuntado y un pequeño feedback del auto-aim.
- Movimiento, básico, Sobrecarga y Tormenta se recolocan en zonas propias del cockpit inferior; en pantallas especialmente estrechas se reduce opacidad antes de permitir que un control tape a otro.
- Los botones principales y navegación móvil reciben más profundidad, respuesta al toque y jerarquía visual.
- Las mejoras reciben rarezas visuales: **común, poco común, rara, épica y legendaria**. Por ahora la rareza es presentación y no altera probabilidades ni balance.
- Las cartas de mejora aparecen en secuencia con animación de escala/glint en lugar de mostrarse todas a la vez.
- En móvil las tres opciones se presentan en una fila compacta para mantenerlas visibles simultáneamente sin scroll.
- `BUILD 0.9.7` y `?v=0.9.7` identifican y fuerzan la carga de esta versión.

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
| Ataque básico | Clic mantenido | Arrastrar para apuntar y soltar para disparar · toque corto = auto-aim |
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
5. La geometría interna ya es portrait nativa 720×1120; cualquier encuentro nuevo debe diseñarse directamente para esa orientación.
6. Mantener Volt y Greenfang como placeholders funcionales mientras cerramos controles, pacing y bucle de run.

## Próximo paso al retomar

**Probar la build 0.9.7 en móvil real.** La pantalla inicial debe mostrar `BUILD 0.9.7`. Prioridades del test:

- comodidad y tamaño del joystick izquierdo,
- precisión del joystick de ataque,
- si el joystick flotante se siente preciso desde cualquier punto del botón,
- si la asistencia angular ayuda sin robarte el control,
- si el auto-aim de básico, Sobrecarga y Tormenta elige objetivos de forma natural,
- si 100 HP de núcleo dan margen suficiente sin volver la partida demasiado fácil,
- colocación de Sobrecarga y Tormenta,
- posibles cortes o solapes restantes,
- tamaño útil de la arena,
- si el siguiente gran paso debe ser convertir el recorrido de Greenfang a geometría portrait nativa.
