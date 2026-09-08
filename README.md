# Snake Busters

Prototipo de action-roguelite cooperativo: forma un equipo de Snake Busters, entra en zonas infestadas y persigue serpientes mutantes sector a sector. El combate actual sigue siendo individual, pero la estructura de producto ya está preparada alrededor de expediciones, progresión de mundo y squads de hasta tres jugadores.

## Estado actual — 0.3.0 · 8 septiembre 2026

**Primera iteración de producto.** Snake Busters deja de abrir directamente en el combate: ahora existe un flujo completo **inicio → HQ/lobby → mapa de outbreak → expedición**. La meta es construir desde aquí la identidad, progresión y futura experiencia cooperativa sin saturar la pantalla de juego.

- **Inicio:** splash independiente con identidad de marca, Greenfang y Volt como protagonistas; el combate ya no hace de menú principal.
- **HQ / lobby:** Volt aparece como personaje central en una base de contención. Existen espacios definidos para Busters, Locker, tienda y Social, además de una party visual de **1/3**.
- **Outbreak Map:** primer mundo, **Toxic Sewers**, con Greenfang como serpiente objetivo y una ruta visual de cinco sectores. En la 0.3 la run actual representa esos cinco sectores.
- **Progresión local inicial:** se guarda la mayor profundidad alcanzada en Toxic Sewers y se refleja en el lobby. Es sólo una semilla de progresión; todavía no hay economía ni power progression persistente.
- **Volt:** movimiento libre dentro de la zona inferior, disparos dirigidos y un arco pasivo al vecino más próximo en la cadena. Su silueta in-game ya se lee como un personaje/Buster en vez de una torreta geométrica.
- **Munición:** Volt dispone de **3 cargas**, al estilo de un blaster por slots. Cada disparo gasta una carga y las cargas se recuperan secuencialmente (0,52 s base). Mantener clic permite burst hasta vaciar el cargador, pero ya no existe fuego infinito.
- **Sobrecarga:** apunta con la mira y pulsa Espacio; golpea al segmento más cercano a la mira y a sus vecinos. Recarga base: 9 segundos. Ignora la reducción de daño directo del blindaje.
- **Tres segmentos:** estándar, blindado (más vida y 25 % de reducción de disparos directos) y explosivo (daña a sus vecinos al romperse).
- **Cinco oleadas**, 90 segmentos en total, con vida, longitud y velocidad crecientes.
- **Seis mejoras**, tres opciones entre oleadas, cuatro elecciones por partida. Se acumulan cuando reaparecen y se reinician al comenzar otra partida. `Gatillo iónico` ahora acelera la recarga de munición y ligeramente la cadencia.
- Roturas con retroceso, partículas, sonido sintetizado opcional y multiplicador de puntos hasta ×8 al romper en menos de 1,65 segundos.
- **Feedback de combate:** el HUD muestra munición, progreso de recarga y daño actual; los impactos enseñan daño flotante y los segmentos muestran barra de vida con HP numérico al recibir daño, ser apuntados o ser la cabeza.
- **Legibilidad del núcleo:** el HUD diferencia SEGURO / ALERTA / PELIGRO según el margen restante y el núcleo reacciona visualmente cuando la serpiente se acerca.
- **Layout de escritorio:** la arena se adapta a la altura disponible para que HUD, arena y loadout quepan dentro del viewport en resoluciones normales, en lugar de obligar a perder interfaz por debajo de la pantalla.
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

Las pruebas cubren continuidad del recorrido, colisiones rápidas, explosiones recursivas sin bajas duplicadas, derrota por inacción, pausa, blindaje, **las tres cargas y su recarga**, selección de mejoras, reinicio y victoria con tres combinaciones de mejoras. La simulación usa pasos fijos de 1/120 s; los proyectiles usan colisión barrida para no atravesar segmentos entre pasos.

Tras el rebalance de munición, las tres estrategias automatizadas completan el circuito en aproximadamente **102–109 segundos** de combate. Son puntería automatizada: **no demuestran que el equilibrio sea correcto para jugadores reales**. La duración y dificultad requieren pruebas de Mateo. Esta entrega tiene comprobación estática y de lógica; aún no tiene una revisión visual o una prueba manual de navegador documentada.

## Decisiones de diseño

1. En esta versión el retroceso se concentra en **romper** segmentos. Un impacto normal causa daño y arco, pero no empuja: así se evita bloquear indefinidamente la serpiente manteniendo el disparo.
2. El retroceso por rotura está limitado y la serpiente acelera con el tiempo.
3. Oleadas y ofertas de mejoras son iguales en cada intento; solo los efectos visuales usan azar. No se promete determinismo de partidas grabadas ni sincronización multijugador.
4. La puntuación suma daño efectivo, 100 puntos por rotura multiplicados hasta ×8 y bonificación por terminar cada oleada antes de 90 segundos.
5. Diseño geométrico provisional dibujado en Canvas, sin recursos externos, anuncios ni compras.
6. La partida es individual. No existen rivales simulados presentados como personas, matchmaking, cuentas, ranked ni ventajas persistentes.

## Próximo paso al retomar

Pedir a Mateo feedback del **flujo 0.3 completo**: **¿el inicio vende el juego?, ¿el HQ tiene la personalidad correcta?, ¿se entiende Toxic Sewers y la idea de progresar por sectores?, ¿qué sobra o falta en el lobby?, ¿la partida queda suficientemente limpia al estar separada del metajuego?** A partir de ahí decidir si la 0.4 debe priorizar contenido del primer outbreak, un segundo Buster o el primer prototipo cooperativo.

Pendiente:

- Probar la 0.3 completa en escritorio y móvil, especialmente ajuste del HQ y del mapa a distintas relaciones de aspecto.
- Afinar duración, dificultad, retroceso y combinaciones tras jugar.
- Añadir Breach y Fang cuando Volt funcione como referencia.
- Diseñar el cooperativo real de 1–3 jugadores: sincronización, escalado que cambie situaciones (no sólo HP), party y servidor autoritativo. Ranked puede existir después, pero ya no es el eje principal del producto.
- Convertir Greenfang en una criatura persistente que mute entre sectores, añadir bifurcaciones/eventos y crear el primer boss real del outbreak.
- Arte definitivo, más recorridos y tipos de segmento después de validar el núcleo.

**Mantener este README actualizado en cada cambio funcional**, con lo completado, cómo probarlo y el siguiente paso. Conservar la separación entre simulación y presentación para poder añadir nuevos Busters y un servidor más adelante.
