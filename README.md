# Snake Busters

Prototipo de action-roguelite cooperativo: forma un equipo de Snake Busters, entra en zonas infestadas y persigue serpientes mutantes sector a sector. El combate actual sigue siendo individual, pero la estructura de producto ya está preparada alrededor de expediciones, progresión de mundo y squads de hasta tres jugadores.

## Estado actual — 0.8.0 · 8 septiembre 2026

**Iteración de jugabilidad real + layout estricto.** Se corrige el crash de render que hacía que el motor siguiera en `playing` mientras el canvas moría, se separan físicamente HUD/arena/kit y Greenfang Alpha recibe su primer patrón ofensivo esquivable.

- **Bug crítico de render corregido:** la función de traducción `t()` colisionaba con el parámetro temporal `t` de `drawBackground(t)`, provocando `TypeError: t is not a function` al pintar el Canvas. El helper pasa a llamarse `tr()` y el navegador vuelve a renderizar de forma continua.
- **Layout de partida sin invasiones:** barra superior, estado de encuentro, arena y kit son cuatro filas independientes del grid. Ningún HUD ni habilidad ocupa espacio dentro del canvas; sólo anuncios y modales intencionados pueden superponerse a la arena.
- **Compact desktop real:** a 771×493 inicio, lobby, mapa y partida caben sin que el contenido de una columna invada otra. El lobby mantiene visible `JUGAR` y el mapa reduce correctamente sus tres columnas.
- **CI visual y funcional:** Pages abre Chrome a **771×493**, recorre `Inicio → Lobby → Mapa → Desplegar`, mueve a Volt, activa E, dispara y comprueba canvas visible, filas separadas, columnas sin solape, viewport válido y runtime limpio. Cualquier error JS cancela el deploy.
- **Capturas de revisión:** cada workflow guarda screenshots de inicio, lobby, mapa y partida al viewport problemático para revisión visual antes de dar un parche por bueno.
- **Greenfang Alpha ataca:** el boss lanza zonas de veneno telegrafiadas. Si Volt no sale a tiempo pierde 1 carga, Sobrecarga se retrasa y queda ralentizado brevemente. El radio/cadencia escalan por fase sin añadir otra barra de vida.
- **Fix 700–900 px:** el breakpoint móvil baja a 680 px. Una ventana de ~771 px se trata como escritorio compacto, evitando el layout gigante/descuadrado visto en pruebas.
- **Cero arte falso de Greenfang en menús:** se eliminan la serpiente CSS del inicio y la cabeza circular del mapa. El inicio usa ahora un terminal tipográfico y el mapa un identificador `GF`; GitHub no contiene referencias SVG.
- **Smoke test de navegador:** además del estado `playing`, exige interacción real, ausencia de errores runtime, geometría sin solapes y canvas visible; nunca más se considera válido un motor vivo con un render roto.
- **Split real:** el sector 3 usa dos ramas con cabezas independientes, velocidades ligeramente distintas y posiciones separadas. Básicos encadenados, Sobrecarga y explosiones respetan la rama y no saltan artificialmente a la otra.
- **Hunt:** el sector 4 deja de ser una simple oleada. Hay que infligir **1320 de daño en 20 s** antes de que Greenfang escape. Alcanzar el daño completa el sector aunque quede cuerpo; agotar el tiempo provoca derrota por fuga.
- **HUD contextual:** el panel superior derecho muestra el objetivo del encuentro: mutaciones, ramas de Split, nidos, progreso/tiempo de Hunt o fase del boss.
- **UI estructurada:** `style.css` usa una jerarquía única para inicio, HQ, mapa, partida, overlays y móvil. En combate, HUD y kit viven fuera de la arena y cada bloque conserva su propio espacio.
- **Pantalla inicial:** sin dibujo provisional de criatura; usa un registro/terminal de amenaza puramente tipográfico hasta diseñar arte real.
- **Greenfang visual:** el Canvas dibuja primero un cuerpo continuo y después escamas/tipos de segmento; la cabeza es direccional y orgánica. Las barras de HP sólo aparecen al apuntar, recibir daño o en la cabeza.
- **Primera bifurcación:** después del sector 2, la expedición ofrece `Conducto de mantenimiento` o `Nido infestado`. La elección queda en `run.routeHistory` y modifica el siguiente sector.
- **Ruta segura:** el siguiente sector reduce un 10 % la velocidad de avance.
- **Ruta infestada:** añade 4 segmentos, +10 % HP, +8 % velocidad y **3 nidos destructibles**. Limpiarla concede 1 muestra de mutación en la run.
- **Objetivos no-serpiente:** el motor ya soporta objetivos destructibles independientes de los segmentos; los básicos pueden impactarlos y el sector no termina hasta limpiar cuerpo + objetivos.
- **Balance tras simulación:** la carga de Tormenta baja de `0.30` a `0.08` por daño básico y la bonificación por rotura básica de `2` a `0.75`, reduciendo la definitiva a unas 3–4 activaciones por expedición automatizada.
- **Volt placeholder en lobby:** se elimina el muñeco CSS provisional y se sustituye por una tarjeta/placeholder limpia. No diseñar personajes finales todavía.
- **Tridente Tesla:** una carga de munición dispara **3 rayos** con ligera dispersión. Sigue usando 3 cargas recargables, pero el básico deja de ser un único láser genérico.
- **Carga de definitiva:** sólo el daño derivado del **básico** (`basic` y `basic-chain`) carga la definitiva. Habilidad, definitiva y explosiones no generan carga.
- **Tormenta de núcleo:** definitiva apuntable con **Q**. El jugador elige un AOE de 145 px y descarga hasta 7 rayos desde arriba sobre segmentos dentro del área. Carga máxima 140; daño provisional 34 por rayo/segmento. No golpea objetivos fuera del círculo.
- **Idiomas:** español por defecto y selector **ES/EN** accesible desde inicio, HQ, mapa y partida. El idioma se guarda localmente y también afecta a paneles dinámicos, upgrades, estados y resultados.
- **Reglas reales por sector:** Drain Gate es baseline; Filter Hall refuerza segmentos; Split Pipe divide la amenaza en dos ramas independientes; The Sump es un Hunt de 1320 de daño en 20 s; Greenfang Alpha entra en fases, regenera cuerpo y lanza ataques de veneno.
- **Estado de run:** cada expedición guarda outbreak, sector actual, encuentros superados, historial, build y mutaciones de Greenfang. Reiniciar o abandonar crea una run limpia.
- **Encuentros por sector:** Toxic Sewers contiene cinco definiciones independientes (Drain Gate, Filter Hall, Split Pipe, The Sump y Greenfang Alpha) con longitud, HP, velocidad, aceleración, blindados y explosivos propios. Por ahora comparten geometría de circuito.
- **Greenfang persistente:** al superar los cuatro primeros sectores acumula `Escamas blindadas`, `Glándulas inestables`, `Sobrecrecimiento` y `Frenesí alfa`. Las mutaciones alteran los encuentros siguientes y quedan registradas en el historial.
- **Arquitectura de Busters:** `BUSTERS` define un kit genérico con tres ranuras separadas: **basic**, **ability** y **ultimate**. Volt es la primera implementación.
- **Ultimate:** Tormenta de núcleo persiste entre sectores, se carga únicamente con básicos y se activa con **Q** sobre un AOE apuntado.
- **Habilidad:** Sobrecarga tiene cooldown propio y se activa con **E**. Espacio sigue funcionando temporalmente como compatibilidad.
- **HUD de combate reducido:** durante la acción sólo quedan sector, núcleo, mutaciones, munición, habilidad y ultimate. Puntuación, récord, daño, nombre/rol, build y leyenda salen del HUD principal.
- **Inicio:** splash independiente con identidad de marca y registro de amenaza; el combate ya no hace de menú principal.
- **HQ / lobby:** Volt aparece como personaje central en una base de contención. Existen espacios definidos para Busters, Locker, tienda y Social, además de una party visual de **1/3**.
- **Outbreak Map:** primer mundo, **Toxic Sewers**, con cinco sectores, bifurcación tras el sector 2 y objetivos que cambian la condición de victoria.
- **Progresión local inicial:** se guarda la mayor profundidad alcanzada en Toxic Sewers y se refleja en el lobby. Es sólo una semilla de progresión; todavía no hay economía ni power progression persistente.
- **Volt:** movimiento libre dentro de la zona inferior, disparos dirigidos y un arco pasivo al vecino más próximo en la cadena. Su silueta in-game ya se lee como un personaje/Buster en vez de una torreta geométrica.
- **Munición:** Volt dispone de **3 cargas**. Cada carga dispara el Tridente Tesla (3 rayos) y se recupera secuencialmente (0,66 s base). Mantener clic permite burst hasta vaciar las cargas.
- **Sobrecarga:** apunta con la mira y pulsa E (Espacio sigue como compatibilidad temporal); golpea al segmento más cercano y a sus vecinos. Recarga base: 9 segundos.
- **Tres segmentos:** estándar, blindado (más vida y 25 % de reducción de disparos directos) y explosivo (daña a sus vecinos al romperse).
- **Cinco sectores**, con 84 segmentos en la ruta actual y configuración acumulativa por encuentro y mutaciones.
- **Seis mejoras**, tres opciones entre sectores y cuatro elecciones por expedición. Modifican el kit/build de la run y se reinician al abandonar o empezar otra.
- Roturas con retroceso, partículas, sonido sintetizado opcional y multiplicador de puntos hasta ×8 al romper en menos de 1,65 segundos.
- **Feedback de combate:** el HUD muestra núcleo, sector, mutaciones, munición, habilidad y definitiva; daño flotante y HP contextual aparecen sólo cuando aportan información.
- **Legibilidad del núcleo:** el HUD diferencia SEGURO / ALERTA / PELIGRO según el margen restante y el núcleo reacciona visualmente cuando la serpiente se acerca.
- **Layout de escritorio:** topbar, estado, arena y kit se reparten el viewport mediante grid; la arena cede tamaño antes de permitir que la interfaz se solape.
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
| Habilidad | E (Espacio también funciona temporalmente) / botón | Botón Habilidad |
| Ultimate | Q / botón | Botón Ultimate |
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

Las **15 pruebas** cubren continuidad del recorrido, colisiones, explosiones, pausa, Tridente Tesla, definitiva, rutas, nidos, Split con ramas aisladas, Hunt completado/fallado, mutaciones, veneno de Alpha y runs completas. La simulación usa pasos fijos de 1/120 s y colisión barrida.

Simulación 0.8 tras añadir veneno de Alpha: **ruta segura ~73 s / 3 ultis**, **ruta infestada ~87 s / 3 ultis**, **sin ultimate ~75 s**, **ruta infestada a menor APM ~93 s / 4 ultis**. Sólo básicos sigue perdiendo en el sector 5. El patrón de veneno obliga a moverse pero las políticas con kit completo continúan pudiendo ganar.

## Decisiones de diseño

1. En esta versión el retroceso se concentra en **romper** segmentos. Un impacto normal causa daño y arco, pero no empuja: así se evita bloquear indefinidamente la serpiente manteniendo el disparo.
2. El retroceso por rotura está limitado y la serpiente acelera con el tiempo.
3. Encuentros y mutaciones son deterministas en esta primera implementación para probar maquinaria. La run guarda sus IDs, así que después podrán existir bifurcaciones, elecciones y generación sin mezclar presentación con simulación.
4. La puntuación suma daño efectivo, 100 puntos por rotura multiplicados hasta ×8 y bonificación por terminar cada oleada antes de 90 segundos.
5. **Arte congelado:** personajes, criaturas y escenarios actuales son placeholders. No invertir en arte final hasta que expediciones, encuentros, progresión y kits estén asentados.
6. La partida es individual. No existen rivales simulados presentados como personas, matchmaking, cuentas, ranked ni ventajas persistentes.

## Próximo paso al retomar

Seguir construyendo **maquinaria antes de personajes**. La siguiente iteración puede añadir un segundo patrón a Greenfang Alpha, una segunda bifurcación y empezar el esqueleto cooperativo 1–3 jugadores. Mantener Volt como Buster de referencia.

Pendiente:

- Probar manualmente la 0.8 en navegador pese a que CI ya valida 771×493: sensación de disparo, legibilidad del letterbox, veneno de Alpha, Split y Hunt.
- Afinar duración, carga de ultimate, dificultad y retroceso después de jugar; la simulación automática no representa balance humano.
- Mantener cualquier Buster futuro bloqueado hasta que el contrato basic/ability/ultimate y las upgrades genéricas estén asentados.
- Diseñar el cooperativo real de 1–3 jugadores: sincronización, escalado que cambie situaciones (no sólo HP), party y servidor autoritativo. Ranked puede existir después, pero ya no es el eje principal del producto.
- Añadir una segunda bifurcación y un segundo patrón de boss; Hunt y Split real ya están implementados.
- Arte definitivo, más recorridos y tipos de segmento después de validar el núcleo.

**Mantener este README actualizado en cada cambio funcional**, con lo completado, cómo probarlo y el siguiente paso. Conservar la separación entre simulación y presentación para poder añadir nuevos Busters y un servidor más adelante.
