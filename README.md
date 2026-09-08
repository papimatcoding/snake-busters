# Snake Busters

Prototipo de action-roguelite cooperativo: forma un equipo de Snake Busters, entra en zonas infestadas y persigue serpientes mutantes sector a sector. El combate actual sigue siendo individual, pero la estructura de producto ya está preparada alrededor de expediciones, progresión de mundo y squads de hasta tres jugadores.

## Estado actual — 0.5.0 · 8 septiembre 2026

**Iteración de maquinaria y combate provisional.** El arte sigue congelado como placeholder. Esta versión da personalidad mecánica al básico y a la definitiva de Volt, unifica la interfaz por idioma y empieza a convertir Toxic Sewers en encuentros con reglas propias en runtime.

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

Las **12 pruebas** cubren continuidad del recorrido, colisiones rápidas, explosiones recursivas, pausa, Tridente Tesla de tres rayos, carga de definitiva sólo con básicos, AOE apuntable, munición, persistencia de build, mutaciones, historial, reglas distintas por sector y victoria completa con tres columnas de upgrades. La simulación usa pasos fijos de 1/120 s y colisión barrida.

Con la 0.5, las tres estrategias automatizadas completan los cinco sectores en aproximadamente **70–74 segundos**, incluyendo reglas de encuentro, Tridente Tesla y definitiva AOE. Sigue siendo sólo una comprobación de viabilidad y **no representa balance humano final**.

## Decisiones de diseño

1. En esta versión el retroceso se concentra en **romper** segmentos. Un impacto normal causa daño y arco, pero no empuja: así se evita bloquear indefinidamente la serpiente manteniendo el disparo.
2. El retroceso por rotura está limitado y la serpiente acelera con el tiempo.
3. Encuentros y mutaciones son deterministas en esta primera implementación para probar maquinaria. La run guarda sus IDs, así que después podrán existir bifurcaciones, elecciones y generación sin mezclar presentación con simulación.
4. La puntuación suma daño efectivo, 100 puntos por rotura multiplicados hasta ×8 y bonificación por terminar cada oleada antes de 90 segundos.
5. **Arte congelado:** personajes, criaturas y escenarios actuales son placeholders. No invertir en arte final hasta que expediciones, encuentros, progresión y kits estén asentados.
6. La partida es individual. No existen rivales simulados presentados como personas, matchmaking, cuentas, ranked ni ventajas persistentes.

## Próximo paso al retomar

Seguir construyendo **maquinaria antes de personajes**. La siguiente iteración debería centrarse en **rutas y bifurcaciones**, encuentros que cambien objetivo (Nest/Hunt/Split real), una transición de mutación más clara y un Greenfang Alpha con lógica de boss más profunda. No crear un segundo Buster todavía; Volt sigue siendo la implementación de referencia.

Pendiente:

- Probar la 0.5 completa en escritorio y móvil: Tridente Tesla, carga de definitiva sólo con básicos, AOE de Q, idioma y reglas de sector.
- Afinar duración, carga de ultimate, dificultad y retroceso después de jugar; la simulación automática no representa balance humano.
- Mantener cualquier Buster futuro bloqueado hasta que el contrato basic/ability/ultimate y las upgrades genéricas estén asentados.
- Diseñar el cooperativo real de 1–3 jugadores: sincronización, escalado que cambie situaciones (no sólo HP), party y servidor autoritativo. Ranked puede existir después, pero ya no es el eje principal del producto.
- Dar comportamiento propio a cada tipo de encuentro, añadir bifurcaciones/eventos y convertir el sector 5 en el primer boss real.
- Arte definitivo, más recorridos y tipos de segmento después de validar el núcleo.

**Mantener este README actualizado en cada cambio funcional**, con lo completado, cómo probarlo y el siguiente paso. Conservar la separación entre simulación y presentación para poder añadir nuevos Busters y un servidor más adelante.
