# Snake Busters

Prototipo arcade de supervivencia: controla un Buster, dispara a una serpiente segmentada y evita que llegue al núcleo. Destruir segmentos provoca retroceso; las explosiones y los arcos permiten encadenar roturas. Las mejoras se eligen dentro de cada partida.

## Estado actual — 0.1.0 · 8 septiembre 2026

**Primera versión jugable.** El objetivo es validar el control, el impacto de las roturas y las combinaciones de mejoras antes de desarrollar el competitivo.

- **Volt:** movimiento libre dentro de la zona inferior, disparos dirigidos y un arco pasivo al vecino más próximo en la cadena.
- **Sobrecarga:** apunta con la mira y pulsa Espacio; golpea al segmento más cercano a la mira y a sus vecinos. Recarga base: 9 segundos. Ignora la reducción de daño directo del blindaje.
- **Tres segmentos:** estándar, blindado (más vida y 25 % de reducción de disparos directos) y explosivo (daña a sus vecinos al romperse).
- **Cinco oleadas**, 90 segmentos en total, con vida, longitud y velocidad crecientes.
- **Seis mejoras**, tres opciones entre oleadas, cuatro elecciones por partida. Se acumulan cuando reaparecen y se reinician al comenzar otra partida.
- Roturas con retroceso, partículas, sonido sintetizado opcional y multiplicador de puntos hasta ×8 al romper en menos de 1,65 segundos.
- Pausa manual y automática al cambiar de pestaña o perder el foco, derrota, victoria y reinicio completo.
- Controles táctiles básicos: mantener el dedo para apuntar/disparar, botones de movimiento y Sobrecarga.
- Récord **local al navegador**, con clave versionada; no es un ranking online.

## Probar localmente

Requiere Node.js 20 o posterior. **No hay dependencias ni hace falta instalar paquetes.**

```sh
git clone https://github.com/papimatcoding/snake-busters.git
cd snake-busters
node server.mjs
```

Abrir `http://localhost:3000`. También se puede usar `npm start`. No abrir `index.html` mediante `file://`: los módulos ES necesitan un servidor HTTP.

| Acción | PC | Móvil |
| --- | --- | --- |
| Mover | WASD / flechas | Botones inferiores |
| Apuntar y disparar | Ratón + clic izquierdo mantenido | Mantener el dedo sobre el objetivo |
| Sobrecarga | Espacio / botón | Botón Sobrecarga |
| Pausa | P / Escape / botón | Botón Pausa |
| Elegir mejora | Clic / 1, 2, 3 | Tocar una carta |

## Código

- `dist/index.html`: interfaz y pantalla inicial.
- `dist/style.css`: presentación adaptable y estados de interfaz.
- `dist/engine.js`: simulación independiente del navegador, recorrido, colisiones, daño, oleadas y mejoras.
- `dist/game.js`: entrada de usuario, Canvas 2D, efectos, audio e interfaz.
- `server.mjs`: servidor estático local sin dependencias.
- `tests/engine.test.mjs`: pruebas de lógica y simulación completa.
- `.openai/hosting.json`: identidad del despliegue Sites y directorio público. Reutilizar su `project_id`; no crear otro Site al actualizar este proyecto.

`dist/` contiene **fuentes estáticas escritas a mano**, no archivos generados. Se versiona entero y no necesita compilación. No editar copias en otro directorio. GitHub es el origen del proyecto; la copia de despliegue de Sites se sincroniza desde el mismo checkout.

## Validación

```sh
node --test tests/engine.test.mjs
npm run check
```

Las pruebas cubren continuidad del recorrido, colisiones rápidas, explosiones recursivas sin bajas duplicadas, derrota por inacción, pausa, blindaje, recarga, selección de mejoras, reinicio y victoria con tres combinaciones de mejoras. La simulación usa pasos fijos de 1/120 s; los proyectiles usan colisión barrida para no atravesar segmentos entre pasos.

Las tres estrategias automatizadas completan el circuito en aproximadamente 67–77 segundos de combate. Son puntería automatizada: **no demuestran que el equilibrio sea correcto para jugadores reales**. La duración y dificultad requieren pruebas de Mateo. Esta entrega tiene comprobación estática y de lógica; aún no tiene una revisión visual o una prueba manual de navegador documentada.

## Decisiones de diseño

1. En esta versión el retroceso se concentra en **romper** segmentos. Un impacto normal causa daño y arco, pero no empuja: así se evita bloquear indefinidamente la serpiente manteniendo el disparo.
2. El retroceso por rotura está limitado y la serpiente acelera con el tiempo.
3. Oleadas y ofertas de mejoras son iguales en cada intento; solo los efectos visuales usan azar. No se promete determinismo de partidas grabadas ni sincronización multijugador.
4. La puntuación suma daño efectivo, 100 puntos por rotura multiplicados hasta ×8 y bonificación por terminar cada oleada antes de 90 segundos.
5. Diseño geométrico provisional dibujado en Canvas, sin recursos externos, anuncios ni compras.
6. La partida es individual. No existen rivales simulados presentados como personas, matchmaking, cuentas, ranked ni ventajas persistentes.

## Próximo paso al retomar

Pedir a Mateo feedback de una partida: **¿se siente bien disparar?, ¿se entiende la Sobrecarga?, ¿romper empuja lo suficiente?, ¿dónde se vuelve fácil o injusto?** Ajustar estos aspectos antes de ampliar el contenido.

Pendiente:

- Probar en navegador real de escritorio y móvil; ajustar legibilidad y controles táctiles (la arena mantiene proporciones horizontales).
- Afinar duración, dificultad, retroceso y combinaciones tras jugar.
- Añadir Breach y Fang cuando Volt funcione como referencia.
- Evaluar desafíos comparables y después duelos paralelos. El competitivo requerirá servidor autoritativo, validación de puntuaciones, resolución de empates, reglas comunes y protección frente a manipulación; no confiar en el cliente ni en `localStorage`.
- Arte definitivo, más recorridos y tipos de segmento después de validar el núcleo.

**Mantener este README actualizado en cada cambio funcional**, con lo completado, cómo probarlo y el siguiente paso. Conservar la separación entre simulación y presentación para poder añadir nuevos Busters y un servidor más adelante.
