# Snake Busters

Prototipo de action-roguelite cooperativo: forma un equipo de Snake Busters, entra en zonas infestadas y persigue serpientes mutantes sector a sector. El combate actual sigue siendo individual, pero la estructura de producto ya está preparada alrededor de expediciones, progresión de mundo y squads de hasta tres jugadores.

## Estado actual — 0.7.0 · 8 septiembre 2026

**Iteración de estabilidad + encuentros.** Se corrige el breakpoint que trataba ~771 px como móvil, se elimina todo el falso arte de Greenfang de menús, Pages queda bloqueado por un smoke test real de Chrome y Toxic Sewers incorpora Split de dos ramas y Hunt cronometrado.

- **Fix 700–900 px:** el breakpoint móvil baja a 680 px. Una ventana de ~771 px se trata como escritorio compacto, evitando el layout gigante/descuadrado visto en pruebas.
- **Cero arte falso de Greenfang en menús:** se eliminan la serpiente CSS del inicio y la cabeza circular del mapa. El inicio usa ahora un terminal tipográfico y el mapa un identificador `GF`; GitHub no contiene referencias SVG.
- **Smoke test de navegador:** el workflow de Pages arranca el servidor, abre Chrome headless con `?smoke=1`, entra automáticamente a partida y exige estado `playing`. El smoke también verifica que el canvas tenga al menos 300×250 px visibles y segmentos renderizables antes de desplegar.
- **Split real:** el sector 3 usa dos ramas con cabezas independientes, velocidades ligeramente distintas y posiciones separadas. Básicos encadenados, Sobrecarga y explosiones respetan la rama y no saltan artificialmente a la otra.
- **Hunt:** el sector 4 deja de ser una simple oleada. Hay que infligir **1320 de daño en 20 s** antes de que Greenfang escape. Alcanzar el daño completa el sector aunque quede cuerpo; agotar el tiempo provoca derrota por fuga.
- **HUD contextual:** el panel superior derecho muestra el objetivo del encuentro: mutaciones, ramas de Split, nidos, progreso/tiempo de Hunt o fase del boss.
- **UI 0.6 rehecha desde cero:** `style.css` deja de acumular capas antiguas y pasa a una sola jerarquía para inicio, HQ, mapa, partida, overlays y móvil. El dock de combate vive dentro de la arena y la zona de Volt se desplaza ligeramente para no solaparse.
- **Pantalla inicial:** se elimina la falsa escena de personaje/serpiente y se sustituye por una composición de briefing + escáner de amenaza, más limpia y honesta con el estado de prototipo.
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
- **Reglas reales por sector:** Drain Gate es baseline; Filter Hall refuerza segmentos periódicamente; Split Pipe regenera cuerpo una vez al caer por debajo del 60 %; The Sump activa pulsos tóxicos que ralentizan movimiento y recarga; Greenfang Alpha entra en fases y acelera/regenera cuerpo.
- **Estado de run:** cada expedición guarda outbreak, sector actual, encuentros superados, historial, build y mutaciones de Greenfang. Reiniciar o abandonar crea una run limpia.
- **Encuentros por sector:** Toxic Sewers contiene cinco definiciones independientes (Drain Gate, Filter Hall, Split Pipe, The Sump y Greenfang Alpha) con longitud, HP, velocidad, aceleración, blindados y explosivos propios. Por ahora comparten geometría de circuito.
- **Greenfang persistente:** al superar los cuatro primeros sectores acumula `Escamas blindadas`, `Glándulas inestables`, `Sobrecrecimiento` y `Frenesí alfa`. Las mutaciones alteran los encuentros siguientes y quedan registradas en el historial.
- **Arquitectura de Busters:** `BUSTERS` define un kit genérico con tres ranuras separadas: **basic**, **ability** y **ultimate**. Volt es la primera implementación.
- **Ultimate:** Tormenta de núcleo persiste entre sectores, se carga únicamente con básicos y se activa con **Q** sobre un AOE apuntado.
- **Habilidad:** Sobrecarga tiene cooldown propio y se activa con **E**. Espacio sigue funcionando temporalmente como compatibilidad.
- **HUD de combate reducido:** durante la acción sólo quedan sector, núcleo, mutaciones, munición, habilidad y ultimate. Puntuación, récord, daño, nombre/rol, build y leyenda salen del HUD principal.
- **Inicio:** splash independiente con identidad de marca, Greenfang y Volt como protagonistas; el combate ya no hace de menú principal.
- **HQ / lobby:** Volt aparece como personaje central en una base de contención. Existen espacios definidos para Busters, Locker, tienda y Social, además de una party visual de **1/3**.
- **Outbreak Map:** primer mundo, **Toxic Sewers**, con Greenfang como serpiente objetivo y una ruta visual de cinco sectores. En la 0.3 la run actual representa esos cinco sectores.
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

Las **14 pruebas** cubren continuidad del recorrido, colisiones, explosiones, pausa, Tridente Tesla, definitiva, rutas, nidos, Split con ramas aisladas, Hunt completado/fallado, mutaciones, boss y runs completas. La simulación usa pasos fijos de 1/120 s y colisión barrida.

Simulación 0.7: **ruta segura ~72 s / 3 ultis**, **ruta infestada ~86 s / 3 ultis**, **sin ultimate ~74 s**, **ruta infestada a menor APM ~91 s / 4 ultis**. Sólo básicos pierde en el sector 5. Hunt se resuelve en ~7–11 s en políticas activas y Split infestado ronda ~33 s. Esto es una comprobación de viabilidad, no balance humano final.

## Decisiones de diseño

1. En esta versión el retroceso se concentra en **romper** segmentos. Un impacto normal causa daño y arco, pero no empuja: así se evita bloquear indefinidamente la serpiente manteniendo el disparo.
2. El retroceso por rotura está limitado y la serpiente acelera con el tiempo.
3. Encuentros y mutaciones son deterministas en esta primera implementación para probar maquinaria. La run guarda sus IDs, así que después podrán existir bifurcaciones, elecciones y generación sin mezclar presentación con simulación.
4. La puntuación suma daño efectivo, 100 puntos por rotura multiplicados hasta ×8 y bonificación por terminar cada oleada antes de 90 segundos.
5. **Arte congelado:** personajes, criaturas y escenarios actuales son placeholders. No invertir en arte final hasta que expediciones, encuentros, progresión y kits estén asentados.
6. La partida es individual. No existen rivales simulados presentados como personas, matchmaking, cuentas, ranked ni ventajas persistentes.

## Próximo paso al retomar

Seguir construyendo **maquinaria antes de personajes**. La siguiente iteración debería profundizar Greenfang Alpha con ataques/patrones propios, añadir una segunda bifurcación y empezar el esqueleto cooperativo 1–3 jugadores. Mantener Volt como Buster de referencia.

Pendiente:

- Probar la 0.7 especialmente en anchos 700–900 px, Split dual, Hunt, ruta infestada y visibilidad/interacción del canvas.
- Afinar duración, carga de ultimate, dificultad y retroceso después de jugar; la simulación automática no representa balance humano.
- Mantener cualquier Buster futuro bloqueado hasta que el contrato basic/ability/ultimate y las upgrades genéricas estén asentados.
- Diseñar el cooperativo real de 1–3 jugadores: sincronización, escalado que cambie situaciones (no sólo HP), party y servidor autoritativo. Ranked puede existir después, pero ya no es el eje principal del producto.
- Añadir más bifurcaciones, Hunt/Split real y convertir el sector 5 en un boss con ataques/patrones propios.
- Arte definitivo, más recorridos y tipos de segmento después de validar el núcleo.

**Mantener este README actualizado en cada cambio funcional**, con lo completado, cómo probarlo y el siguiente paso. Conservar la separación entre simulación y presentación para poder añadir nuevos Busters y un servidor más adelante.
