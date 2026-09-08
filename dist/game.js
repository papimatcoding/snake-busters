import { createGame, startGame, update, activateAbility, activateUltimate, chooseUpgrade, chooseRoute, getEncounter, MUTATIONS, ROUTES, pathAt, pathAtLane, PATH_LENGTH, UPGRADES, WIDTH, HEIGHT, STEP, clamp } from './engine.js';

const $ = id => document.getElementById(id);
const canvas = $('game'), ctx = canvas.getContext('2d');
const dpr = Math.min(window.devicePixelRatio || 1, 2);
canvas.width = WIDTH * dpr; canvas.height = HEIGHT * dpr;
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const colors = { normal: '#c1fb60', armor: '#8cabff', volatile: '#ff9875' };
let state = createGame(), last = 0, accumulator = 0, shown = 'ready', best = 0, bestSector = 0;
let particles = [], arcs = [], labels = [], rings = [], shake = 0, announcementTime = 0, lobbyToastTime = 0;
let pointer = { x: 600, y: 330 }, shooting = false, keys = new Set(), touchMoves = new Map();
let sound = false, audioContext, language = 'es';
let runtimeError = '';
window.addEventListener('error', event => {
  runtimeError = String(event.error?.message || event.message || 'runtime error');
  document.body.dataset.runtimeError = runtimeError;
});
window.addEventListener('unhandledrejection', event => {
  runtimeError = String(event.reason?.message || event.reason || 'unhandled rejection');
  document.body.dataset.runtimeError = runtimeError;
});
try {
  best = Number(localStorage.getItem('snake-busters:best:v1')) || 0;
  bestSector = Number(localStorage.getItem('snake-busters:toxic-sewers:best-sector:v1')) || 0;
  language = localStorage.getItem('snake-busters:lang:v1') || 'es';
} catch {}

const I18N = {
  es: {
    'title.kicker':'EQUIPO DE CONTENCIÓN // VERSIÓN 0.7','title.line1':'ELLAS MUTAN.','title.line2':'NOSOTROS MÁS.','title.sub':'Entra en zonas infestadas, crea una combinación distinta en cada expedición y llega más lejos con tu escuadrón.','title.enter':'ENTRAR A LA BASE','title.local':'PROTOTIPO · TODO EL PROGRESO ACTUAL ES LOCAL','title.unit':'UNIDAD DE RESPUESTA','title.scan':'REGISTRO DE AMENAZA','title.target':'OBJETIVO','title.state':'ESTADO','title.mutating':'MUTANDO','title.classified':'SEÑAL BIOLÓGICA INESTABLE','title.noVisual':'VISUAL BLOQUEADO · DATOS DE CAMPO INCOMPLETOS',
    'profile.rank':'NIVEL 1 · RECLUTA','nav.busters':'BUSTERS','nav.custom':'PERSONALIZAR','nav.cosmetics':'COSMÉTICOS','nav.shop':'TIENDA','nav.social':'SOCIAL','nav.party':'ESCUADRÓN','common.soon':'PRÓXIMAMENTE','common.play':'JUGAR','common.baseBack':'← BASE','common.start':'INICIO','common.locked':'BLOQUEADO',
    'hq.response1':'CONTROL DE','hq.response2':'BROTES','hq.active':'BROTE ACTIVO','hq.best':'MEJOR SECTOR','hq.threat':'AMENAZA','hq.low':'BAJA','hq.outbreak':'BROTE 01','hq.artPending':'ARTE DE PERSONAJE PENDIENTE','hq.selected':'BUSTER SELECCIONADO','hq.quote':'“Si brilla, conduce. Si conduce, revienta.”',
    'party.squad':'ESCUADRÓN','party.invite':'+ INVITAR','party.you':'TÚ','party.ready':'LISTO','party.target':'OBJETIVO COOPERATIVO','party.note':'La versión actual sigue siendo jugable en solitario. El escuadrón real se conectará sobre esta estructura.','party.mate':'COMPAÑERO','party.inviteShort':'INVITAR',
    'map.title':'MAPA DEL BROTE','map.world':'MUNDO 01 // SUBCIUDAD DE SABADELL','map.target':'OBJETIVO','map.class':'SERPIENTE ADAPTATIVA · CLASE C','map.desc':'Algo enorme está creciendo bajo la ciudad. Cada sector que limpias empuja a la criatura más adentro del nido. No esperes que llegue igual al siguiente.',
    'world.name':'ALCANTARILLAS TÓXICAS','world.toxic':'ALCANTARILLAS','world.sewers':'TÓXICAS','world.infestation':'INFESTACIÓN GREENFANG',
    'mut.venomous':'VENENOSA','mut.splitter':'DIVISORA','mut.unstable':'INESTABLE',
    'enc.drain':'COMPUERTA DE DRENAJE','enc.filter':'SALA DE FILTROS','enc.split':'TUBERÍA BIFURCADA','enc.sump':'EL SUMIDERO','enc.alpha':'GREENFANG ALFA','enc.alphaTag':'ALFA',
    'deploy.title':'DESPLIEGUE','deploy.run':'EXPEDICIÓN','deploy.runText':'5 sectores · mejoras entre encuentros · la combinación se reinicia al abandonar.','deploy.sector':'SECTOR 01','deploy.objective':'OBJETIVO','deploy.objectiveText':'Evita que Greenfang alcance el núcleo de contención.','deploy.go':'DESPLEGAR','deploy.note':'Los encuentros ya incluyen bifurcaciones, objetivos secundarios, Split de dos ramas y Hunt cronometrado.',
    'combat.basic':'TRIDENTE TESLA','combat.ability':'HABILIDAD','combat.overload':'SOBRECARGA','combat.ultimate':'DEFINITIVA','combat.storm':'TORMENTA','arena.entry':'ENTRADA','arena.core':'NÚCLEO',
    'status.ready':'LISTA','status.safe':'SEGURO','status.warn':'ALERTA','status.danger':'PELIGRO','status.noMut':'SIN MUTACIONES',
    'sound.off':'Sonido: no','sound.on':'Sonido: sí','pause':'Pausa','continue':'Continuar',
    'toast.busters':'Volt es el Buster de referencia. El diseño final de personajes llegará después de cerrar los sistemas.','toast.locker':'Personalización preparada para aspectos, efectos, banners y gestos.','toast.shop':'La tienda todavía no tiene economía ni compras.','toast.social':'El escuadrón de 3 está preparado visualmente. El multijugador real vendrá después.'
  },
  en: {
    'title.kicker':'CONTAINMENT CREW // BUILD 0.7','title.line1':'THEY MUTATE.','title.line2':'WE HIT HARDER.','title.sub':'Enter infested zones, build a different loadout every expedition and push farther with your squad.','title.enter':'ENTER HQ','title.local':'PROTOTYPE · CURRENT PROGRESS IS LOCAL ONLY','title.unit':'RESPONSE UNIT','title.scan':'THREAT LOG','title.target':'TARGET','title.state':'STATUS','title.mutating':'MUTATING','title.classified':'UNSTABLE BIOLOGICAL SIGNAL','title.noVisual':'VISUAL LOCKED · FIELD DATA INCOMPLETE',
    'profile.rank':'LEVEL 1 · RECRUIT','nav.busters':'BUSTERS','nav.custom':'CUSTOMIZE','nav.cosmetics':'COSMETICS','nav.shop':'SHOP','nav.social':'SOCIAL','nav.party':'SQUAD','common.soon':'COMING SOON','common.play':'PLAY','common.baseBack':'← HQ','common.start':'START','common.locked':'LOCKED',
    'hq.response1':'OUTBREAK','hq.response2':'CONTROL','hq.active':'ACTIVE OUTBREAK','hq.best':'BEST SECTOR','hq.threat':'THREAT','hq.low':'LOW','hq.outbreak':'OUTBREAK 01','hq.artPending':'CHARACTER ART PENDING','hq.selected':'SELECTED BUSTER','hq.quote':'“If it glows, it conducts. If it conducts, it blows.”',
    'party.squad':'SQUAD','party.invite':'+ INVITE','party.you':'YOU','party.ready':'READY','party.target':'CO-OP TARGET','party.note':'The current build is still playable solo. Real squad play will plug into this structure later.','party.mate':'TEAMMATE','party.inviteShort':'INVITE',
    'map.title':'OUTBREAK MAP','map.world':'WORLD 01 // SABADELL UNDERCITY','map.target':'TARGET','map.class':'ADAPTIVE SERPENT · CLASS C','map.desc':'Something huge is growing beneath the city. Every cleared sector drives the creature deeper into the nest. Do not expect it to return unchanged.',
    'world.name':'TOXIC SEWERS','world.toxic':'TOXIC','world.sewers':'SEWERS','world.infestation':'GREENFANG INFESTATION',
    'mut.venomous':'VENOMOUS','mut.splitter':'SPLITTER','mut.unstable':'UNSTABLE',
    'enc.drain':'DRAIN GATE','enc.filter':'FILTER HALL','enc.split':'SPLIT PIPE','enc.sump':'THE SUMP','enc.alpha':'GREENFANG ALPHA','enc.alphaTag':'ALPHA',
    'deploy.title':'DEPLOYMENT','deploy.run':'EXPEDITION','deploy.runText':'5 sectors · upgrades between encounters · the build resets when you leave.','deploy.sector':'SECTOR 01','deploy.objective':'OBJECTIVE','deploy.objectiveText':'Stop Greenfang from reaching the containment core.','deploy.go':'DEPLOY','deploy.note':'Encounters now include route forks, secondary objectives, dual-branch Split and a timed Hunt.',
    'combat.basic':'TESLA TRIDENT','combat.ability':'ABILITY','combat.overload':'OVERLOAD','combat.ultimate':'ULTIMATE','combat.storm':'STORM','arena.entry':'ENTRY','arena.core':'CORE',
    'status.ready':'READY','status.safe':'SAFE','status.warn':'WARNING','status.danger':'DANGER','status.noMut':'NO MUTATIONS',
    'sound.off':'Sound: off','sound.on':'Sound: on','pause':'Pause','continue':'Continue',
    'toast.busters':'Volt is the reference Buster. Final character design comes after the systems are locked.','toast.locker':'Customization is reserved for skins, effects, banners and emotes.','toast.shop':'The shop has no economy or purchases yet.','toast.social':'The 3-player squad shell is ready. Real multiplayer comes later.'
  }
};
const tr = key => I18N[language]?.[key] ?? I18N.es[key] ?? key;
const ENCOUNTER_KEYS = {'drain-gate':'enc.drain','filter-hall':'enc.filter','split-pipe':'enc.split','the-sump':'enc.sump','greenfang-alpha':'enc.alpha'};
function encounterName(encounter = state.encounter) { return tr(ENCOUNTER_KEYS[encounter?.id] || 'enc.drain'); }
const UPGRADE_EN = {
  chain: ['Double Arc', 'Each Tesla Trident bolt jumps to one additional neighbor.'],
  power: ['High Voltage', '+25% damage to all three basic bolts.'],
  rapid: ['Fast Coil', 'Ammo reloads 20% faster and the Trident fires 12% faster.'],
  blast: ['Reactive Rupture', 'Every break deals 16 damage to adjacent segments.'],
  pulse: ['Capacitor', 'The ability recharges 25% faster and hits two additional targets.'],
  force: ['Shockwave', 'Breaks push 60% harder and the ability deals +25% damage.'],
};
function upgradeCopy(u) {
  if (language === 'es') return { name: u.name, text: u.text };
  const translated = UPGRADE_EN[u.id];
  return { name: translated?.[0] || u.name, text: translated?.[1] || u.text };
}
function applyLanguage() {
  document.documentElement.lang = language;
  document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = tr(el.dataset.i18n); });
  document.querySelectorAll('[data-lang-toggle]').forEach(btn => { btn.textContent = language === 'es' ? 'EN' : 'ES'; });
  if ($('sound')) $('sound').textContent = tr(sound ? 'sound.on' : 'sound.off');
  syncHUD();
}
function toggleLanguage() {
  language = language === 'es' ? 'en' : 'es';
  try { localStorage.setItem('snake-busters:lang:v1', language); } catch {}
  applyLanguage();
  shown = '';
  syncUI();
}

function goScreen(id) {
  document.querySelectorAll('.app-screen').forEach(screen => { screen.hidden = screen.id !== id; });
  document.body.dataset.screen = id;
  resetInput();
  window.scrollTo(0, 0);
}
function syncLobbyProgress() {
  const bestEl = $('lobby-best-sector');
  if (bestEl) bestEl.textContent = bestSector ? `${String(bestSector).padStart(2, '0')} / 05` : '—';
  const pips = $('lobby-sector-pips');
  if (pips) [...pips.children].forEach((pip, i) => pip.classList.toggle('cleared', i < bestSector));
}
function lobbyToast(text) {
  const toast = $('lobby-toast'); if (!toast) return;
  toast.textContent = text; toast.classList.add('show'); lobbyToastTime = 2.3;
}
function leaveRun(destination = 'lobby-screen') {
  state = createGame(); state.phase = 'ready'; particles = []; arcs = []; rings = []; labels = []; accumulator = 0; shown = 'ready';
  $('overlay').hidden = true; syncLobbyProgress(); goScreen(destination);
}
function deploy() { goScreen('game-screen'); restart(); }
syncLobbyProgress();
function format(n) { return Math.round(n).toString().padStart(6, '0'); }
function tone(frequency, duration, volume = .035, type = 'sine') {
  if (!sound) return;
  try {
    audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
    if (audioContext.state === 'suspended') audioContext.resume().catch(() => {});
    const o = audioContext.createOscillator(), g = audioContext.createGain();
    o.type = type; o.frequency.setValueAtTime(frequency, audioContext.currentTime);
    o.frequency.exponentialRampToValueAtTime(Math.max(40, frequency * .45), audioContext.currentTime + duration);
    g.gain.setValueAtTime(volume, audioContext.currentTime);
    g.gain.exponentialRampToValueAtTime(.001, audioContext.currentTime + duration);
    o.connect(g); g.connect(audioContext.destination); o.start(); o.stop(audioContext.currentTime + duration);
  } catch { sound = false; $('sound').textContent = language === 'es' ? 'Sonido no disponible' : 'Sound unavailable'; }
}
function resetInput() { shooting = false; keys.clear(); touchMoves.clear(); }
function announce(text) { $('announce').textContent = text; $('announce').classList.add('show'); announcementTime = 2; }
function burst(x, y, color, count = 15) {
  for (let i = 0; i < (reduceMotion ? 4 : count); i++) {
    const a = Math.random() * Math.PI * 2, speed = 40 + Math.random() * 210;
    particles.push({ x, y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, life: .3 + Math.random() * .4, color });
  }
  if (particles.length > 450) particles.splice(0, particles.length - 450);
}
function events() {
  for (const e of state.events) {
    if (e.type === 'shot') tone(390, .055, .014, 'triangle');
    if (e.type === 'reload' && e.ammo === state.buster.basic.ammoMax) tone(610, .045, .009, 'sine');
    if (e.type === 'hit') { burst(e.x, e.y, '#d8f3ff', 2); labels.push({ x: e.x, y: e.y - 19, text: `-${Math.max(1, Math.round(e.amount))}`, life: .42, color: e.source === 'ability' ? '#fff0a8' : e.source === 'ultimate' ? '#d8b8ff' : e.source === 'explosion' ? '#ffb08e' : '#eaf9ff', small: true }); }
    if (e.type === 'arc') arcs.push({ ...e, life: e.big ? .28 : .1 });
    if (e.type === 'pulse') { shake = reduceMotion ? 0 : 7; tone(150, .32, .06, 'sawtooth'); }
    if (e.type === 'ultimate-zone') rings.push({ x: e.x, y: e.y, life: .62, color: '#ad91ff', aoe: true, radius: e.radius });
    if (e.type === 'ultimate-bolt') burst(e.x, e.y, '#d8c8ff', 10);
    if (e.type === 'ultimate') { shake = reduceMotion ? 0 : 10; tone(95, .5, .065, 'sawtooth'); announce(language === 'es' ? 'TORMENTA DE NÚCLEO' : 'CORE STORM'); }
    if (e.type === 'wave') announce(`${language === 'es' ? 'SECTOR' : 'SECTOR'} ${e.wave} / 5 · ${encounterName()}`);
    if (e.type === 'reinforce') announce(language === 'es' ? `PRESIÓN DE FILTROS · +${e.count} BLINDADOS` : `FILTER PRESSURE · +${e.count} ARMORED`);
    if (e.type === 'split') announce(language === 'es' ? `TUBERÍA BIFURCADA · +${e.count} SEGMENTOS` : `SPLIT PIPE · +${e.count} SEGMENTS`);
    if (e.type === 'sludge') announce(language === 'es' ? 'PULSO DE LODO TÓXICO' : 'TOXIC SLUDGE PULSE');
    if (e.type === 'alpha-phase') announce(language === 'es' ? `GREENFANG ALFA · FASE ${e.phase + 1}` : `GREENFANG ALPHA · PHASE ${e.phase + 1}`);
    if (e.type === 'venom-telegraph') tone(210, .08, .018, 'triangle');
    if (e.type === 'venom-active') { rings.push({ x:e.x, y:e.y, life:.34, color:'#b7ed6d', venom:true, radius:e.radius }); tone(110, .18, .025, 'sawtooth'); }
    if (e.type === 'venom-hit') { shake = reduceMotion ? 0 : 6; burst(e.x, e.y, '#b7ed6d', 16); labels.push({ x:e.x, y:e.y-24, text:language === 'es' ? 'VENENO' : 'VENOM', life:.65, color:'#dfff9b' }); }
    if (e.type === 'hunt-complete') announce(language === 'es' ? 'CAZA COMPLETADA · GREENFANG REPELIDA' : 'HUNT COMPLETE · GREENFANG DRIVEN OFF');
    if (e.type === 'hunt-escaped') announce(language === 'es' ? 'GREENFANG HA ESCAPADO' : 'GREENFANG ESCAPED');
    if (e.type === 'objective-hit') { burst(e.x, e.y, '#b9e973', 3); labels.push({ x:e.x, y:e.y-24, text:`-${Math.max(1,Math.round(e.amount))}`, life:.42, color:'#dfffa4', small:true }); }
    if (e.type === 'objective-break') { burst(e.x, e.y, '#c5f76e', 24); rings.push({ x:e.x, y:e.y, life:.48, color:'#c5f76e' }); announce(language === 'es' ? 'NIDO DESTRUIDO' : 'NEST DESTROYED'); }
    if (e.type === 'route-reward') announce(language === 'es' ? `+ ${e.salvage} MUESTRA DE MUTACIÓN` : `+ ${e.salvage} MUTATION SAMPLE`);
    if (e.type === 'break') {
      burst(e.x, e.y, colors[e.kind], e.kind === 'volatile' ? 30 : 18);
      rings.push({ x: e.x, y: e.y, life: .45, color: colors[e.kind], explosive: e.kind === 'volatile' });
      labels.push({ x: e.x, y: e.y - 25, text: e.combo > 1 ? `×${Math.min(e.combo, 8)} ${language === 'es' ? 'CADENA' : 'CHAIN'}` : '+100', life: .85, color: e.combo > 1 ? '#fff0ac' : '#c1fb60' });
      shake = reduceMotion ? 0 : Math.min(9, 3 + e.combo); tone(170 + e.combo * 90, .15, .045, 'triangle');
    }
    if (e.type === 'clear') {
      bestSector = Math.max(bestSector, e.sector || state.run.sector);
      try { localStorage.setItem('snake-busters:toxic-sewers:best-sector:v1', String(bestSector)); } catch {}
      syncLobbyProgress();
    }
    if (e.type === 'end') {
      if (state.score > best) { best = state.score; try { localStorage.setItem('snake-busters:best:v1', String(best)); } catch {} }
      tone(state.phase === 'won' ? 820 : 90, .6, .06);
    }
  }
  state.events.length = 0;
}
function polygon(x, y, radius, sides, rotation = 0) {
  ctx.beginPath();
  for (let i = 0; i < sides; i++) { const a = rotation + Math.PI * 2 * i / sides; const px = x + Math.cos(a) * radius, py = y + Math.sin(a) * radius; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
  ctx.closePath();
}
function line(ax, ay, bx, by) { ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke(); }
function circle(x, y, r) { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); }
function track() {
  ctx.beginPath();
  for (let d = 0; d < PATH_LENGTH; d += 8) { const p = pathAt(d); d ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y); }
  const end = pathAt(PATH_LENGTH); ctx.lineTo(end.x, end.y);
}
function trackLane(lane, totalLanes) {
  ctx.beginPath();
  for (let d = 0; d < PATH_LENGTH; d += 8) {
    const p = pathAtLane(d, lane, totalLanes);
    d ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y);
  }
  const end = pathAtLane(PATH_LENGTH, lane, totalLanes);
  ctx.lineTo(end.x, end.y);
}
function drawBackground(t) {
  const pulse = reduceMotion ? 0 : Math.sin(t * 1.8) * .5 + .5;
  const bg = ctx.createLinearGradient(0, 0, 0, HEIGHT);
  bg.addColorStop(0, '#102333'); bg.addColorStop(1, '#07111c');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, WIDTH, HEIGHT);

  ctx.strokeStyle = 'rgba(86,139,168,.10)'; ctx.lineWidth = 1;
  for (let x = 0; x < WIDTH; x += 48) line(x, 0, x, HEIGHT);
  for (let y = 0; y < HEIGHT; y += 48) line(0, y, WIDTH, y);

  ctx.fillStyle = '#13283a'; ctx.fillRect(20, 582, 1160, 141);
  ctx.fillStyle = 'rgba(115,218,250,.055)'; ctx.fillRect(20, 582, 1160, 7);
  ctx.strokeStyle = '#3b6175'; ctx.setLineDash([7, 11]); line(25, 585, 1175, 585); ctx.setLineDash([]);

  ctx.font = '800 11px ui-monospace, monospace'; ctx.fillStyle = '#80a8bd'; ctx.textAlign = 'left';
  ctx.fillText(language === 'es' ? 'ZONA BUSTER' : 'BUSTER ZONE', 40, 614);
  ctx.fillText(`${encounterName().toUpperCase()} // ${state.encounter?.kind?.toUpperCase() || 'CONTAINMENT'}`, 40, 40);
  ctx.textAlign = 'right'; ctx.fillStyle = '#5e8499'; ctx.fillText(`SECTOR ${String(state.run.sector).padStart(2, '0')}`, 1160, 40);

  ctx.lineCap = 'round';
  const lanes = state.encounterState?.splitLanes || 1;
  if (lanes > 1) {
    for (let lane = 0; lane < lanes; lane++) {
      trackLane(lane, lanes); ctx.strokeStyle = '#06101a'; ctx.lineWidth = 42; ctx.stroke();
      trackLane(lane, lanes); ctx.strokeStyle = lane === 0 ? '#183041' : '#263842'; ctx.lineWidth = 34; ctx.stroke();
      trackLane(lane, lanes); ctx.strokeStyle = '#426271'; ctx.lineWidth = 1.5; ctx.setLineDash([2, 10]); ctx.stroke(); ctx.setLineDash([]);
    }
  } else {
    track(); ctx.strokeStyle = '#06101a'; ctx.lineWidth = 68; ctx.stroke();
    track(); ctx.strokeStyle = '#425868'; ctx.lineWidth = 56; ctx.stroke();
    track(); ctx.strokeStyle = '#152a38'; ctx.lineWidth = 49; ctx.stroke();
    track(); ctx.strokeStyle = '#2f4b5c'; ctx.lineWidth = 2; ctx.setLineDash([2, 11]); ctx.stroke(); ctx.setLineDash([]);
  }

  for (let d = 85; d < PATH_LENGTH - 70; d += 175) {
    const p = pathAt(d); ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.a);
    ctx.strokeStyle = '#547284'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-7, -6); ctx.lineTo(1, 0); ctx.lineTo(-7, 6); ctx.stroke(); ctx.restore();
  }

  ctx.textAlign = 'center'; ctx.fillStyle = '#7797a8'; ctx.font = '800 10px ui-monospace, monospace'; ctx.fillText(tr('arena.entry'), 130, 86);
  const remaining = clamp(100 * (1 - state.head / PATH_LENGTH), 0, 100);
  const danger = remaining < 22;
  const p = pathAt(PATH_LENGTH);
  ctx.save(); ctx.translate(p.x, p.y);
  ctx.shadowColor = danger ? '#ff6d62' : '#73dafa'; ctx.shadowBlur = danger ? 18 + pulse * 12 : 10;
  ctx.strokeStyle = danger ? '#ff796d' : '#75cde2'; ctx.lineWidth = 4; circle(0, 0, 37); ctx.stroke();
  ctx.rotate(reduceMotion ? 0 : t * .4); polygon(0, 0, 25, 6); ctx.fillStyle = danger ? '#3f2629' : '#193746'; ctx.fill(); ctx.stroke();
  ctx.rotate(reduceMotion ? 0 : -t * .8); polygon(0, 0, 14, 4, Math.PI / 4); ctx.fillStyle = danger ? '#ff8b75' : '#b9f5ff'; ctx.fill();
  ctx.restore();
  ctx.fillStyle = danger ? '#ff8c7f' : '#a2eaf4'; ctx.font = '900 11px ui-monospace, monospace'; ctx.fillText(tr('arena.core'), p.x, p.y - 54);

  if (danger && state.phase === 'playing') {
    ctx.strokeStyle = `rgba(255,105,89,${.20 + pulse * .22})`; ctx.lineWidth = 7; ctx.strokeRect(4, 4, WIDTH - 8, HEIGHT - 8);
  }
}
function drawHazards(t) {
  for (const hazard of state.hazards || []) {
    if (hazard.type !== 'venom-strike') continue;
    const telegraphing = hazard.telegraph > 0;
    const pulse = reduceMotion ? 0 : Math.sin(t * 12 + hazard.id) * 2;
    ctx.save();
    ctx.translate(hazard.x, hazard.y);
    ctx.setLineDash(telegraphing ? [8, 6] : []);
    ctx.lineWidth = telegraphing ? 2 : 4;
    ctx.strokeStyle = telegraphing ? 'rgba(191,239,111,.8)' : '#c9ff78';
    ctx.fillStyle = telegraphing ? 'rgba(171,222,92,.06)' : 'rgba(171,222,92,.22)';
    circle(0, 0, hazard.radius + pulse);
    ctx.fill(); ctx.stroke();
    ctx.setLineDash([]);
    if (!telegraphing) {
      ctx.fillStyle = 'rgba(202,255,121,.28)';
      for (const [x,y,r] of [[-18,-8,6],[9,-15,5],[18,9,7],[-7,18,4]]) { circle(x,y,r+pulse*.1); ctx.fill(); }
    }
    ctx.restore();
  }
}

function drawObjectives(t) {
  for (const obj of state.objectives || []) {
    if (obj.type !== 'nest') continue;
    const hpRatio = Math.max(0, obj.hp / obj.maxHp);
    const pulse = reduceMotion ? 0 : Math.sin(t * 5 + obj.x * .01) * 2;
    ctx.save(); ctx.translate(obj.x, obj.y);
    ctx.shadowColor = 'rgba(153,205,83,.38)'; ctx.shadowBlur = 18;
    ctx.fillStyle = obj.flash > 0 ? '#f6ffdd' : '#253b22';
    ctx.beginPath(); ctx.ellipse(0, 3, 31 + pulse, 24 + pulse * .5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = '#789b4d'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = '#516f38';
    for (const [x,y,r] of [[-11,-2,8],[4,-8,9],[12,6,7],[-3,9,6]]) { circle(x,y,r); ctx.fill(); }
    ctx.fillStyle = '#d9f79d'; circle(4,-8,3.2); ctx.fill();
    ctx.restore();

    const w=46,x=obj.x-w/2,y=obj.y-34;
    ctx.fillStyle='rgba(3,10,16,.86)';ctx.fillRect(x-2,y-2,w+4,6);
    ctx.fillStyle=hpRatio<.3?'#ff7d72':'#a9d766';ctx.fillRect(x,y,w*hpRatio,2);
  }
}

function drawSnake(t) {
  const visible = state.segments.filter(seg => seg.d >= 0);
  if (!visible.length) return;

  // Draw one continuous silhouette per lane/branch.
  const lanes = state.encounterState?.splitLanes || 1;
  const laneFirstIds = new Set();
  for (let lane = 0; lane < lanes; lane++) {
    const branch = state.segments.filter(seg => (seg.lane || 0) === lane && seg.d >= 0);
    if (!branch.length) continue;
    laneFirstIds.add(branch[0].id);
    const tailToHead = [...branch].reverse();
    ctx.save();
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath();
    tailToHead.forEach((seg, i) => i ? ctx.lineTo(seg.x, seg.y) : ctx.moveTo(seg.x, seg.y));
    ctx.strokeStyle = 'rgba(2,9,11,.78)'; ctx.lineWidth = lanes > 1 ? 40 : 48; ctx.stroke();
    ctx.strokeStyle = lane === 1 && lanes > 1 ? '#486934' : '#3d5f2e'; ctx.lineWidth = lanes > 1 ? 31 : 38; ctx.stroke();
    ctx.strokeStyle = 'rgba(147,190,79,.26)'; ctx.lineWidth = 4; ctx.stroke();
    ctx.restore();
  }

  for (let i = visible.length - 1; i >= 0; i--) {
    const s = visible[i];
    const originalIndex = state.segments.indexOf(s);
    const isHead = laneFirstIds.has(s.id);
    const color = colors[s.type], hpRatio = Math.max(0, s.hp / s.maxHp);
    const hovered = Math.hypot(pointer.x - s.x, pointer.y - s.y) < 52;
    const damaged = hpRatio < .999;
    const wobble = reduceMotion ? 0 : Math.sin(t * 4.4 + s.id * .72) * .9;

    ctx.save();
    ctx.translate(s.x, s.y + wobble);
    ctx.rotate(s.a);

    if (isHead) {
      // Head: elongated and directional, with a readable jaw/snout.
      ctx.shadowColor = 'rgba(0,0,0,.48)'; ctx.shadowBlur = 12; ctx.shadowOffsetY = 5;
      ctx.fillStyle = s.flash > 0 ? '#f3fff1' : '#557638';
      ctx.beginPath(); ctx.ellipse(4, 0, 34, 25, 0, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
      ctx.strokeStyle = '#8bb84f'; ctx.lineWidth = 3; ctx.stroke();

      ctx.fillStyle = '#719545';
      ctx.beginPath(); ctx.ellipse(20, 0, 22, 17, 0, 0, Math.PI * 2); ctx.fill();

      ctx.fillStyle = '#f3ffd5';
      ctx.beginPath(); ctx.ellipse(17, -9, 5.5, 4.5, -.2, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(17, 9, 5.5, 4.5, .2, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#172018';
      circle(19.5, -9, 2.2); ctx.fill(); circle(19.5, 9, 2.2); ctx.fill();

      ctx.strokeStyle = '#1b2719'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(24, -2); ctx.quadraticCurveTo(33, 0, 24, 3); ctx.stroke();
      ctx.strokeStyle = '#d7ef8e'; ctx.lineWidth = 1.5;
      line(34, 0, 43, -4); line(34, 0, 43, 4);
    } else {
      // Overlapping scales sit on top of the continuous body.
      const scalePulse = s.type === 'volatile' && !reduceMotion ? Math.sin(t * 7 + s.id) * 1.4 : 0;
      ctx.fillStyle = s.flash > 0 ? '#f4ffff' : s.type === 'armor' ? '#48639a' : s.type === 'volatile' ? '#a35440' : '#557637';
      ctx.strokeStyle = s.type === 'armor' ? '#9fb7ff' : s.type === 'volatile' ? '#ff9a78' : '#79a846';
      ctx.lineWidth = s.type === 'armor' ? 2.5 : 1.6;
      ctx.beginPath();
      ctx.ellipse(0, 0, s.type === 'volatile' ? 23 + scalePulse : 22, s.type === 'volatile' ? 20 + scalePulse : 18, 0, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();

      if (s.type === 'armor') {
        ctx.fillStyle = '#6179b4';
        ctx.strokeStyle = '#b7c8ff'; ctx.lineWidth = 1.5;
        for (const x of [-10, 2]) {
          ctx.beginPath();
          ctx.moveTo(x - 5, -11); ctx.lineTo(x + 7, -8); ctx.lineTo(x + 7, 8); ctx.lineTo(x - 5, 11); ctx.closePath();
          ctx.fill(); ctx.stroke();
        }
      } else if (s.type === 'volatile') {
        ctx.fillStyle = '#ffc08c';
        circle(2, 0, 7 + scalePulse * .45); ctx.fill();
        ctx.strokeStyle = '#ffe0aa'; ctx.lineWidth = 1.5;
        line(-10, -8, -3, -2); line(-10, 8, -3, 2);
      } else {
        ctx.strokeStyle = 'rgba(212,255,143,.35)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(-3, 0, 10, -.8, .8); ctx.stroke();
      }
    }
    ctx.restore();

    if (hovered || damaged || isHead) {
      const barW = isHead ? 54 : 40;
      const barX = s.x - barW / 2, barY = s.y - (isHead ? 40 : 32);
      ctx.fillStyle = 'rgba(3,10,16,.88)'; ctx.fillRect(barX - 2, barY - 2, barW + 4, 6);
      ctx.fillStyle = hpRatio < .3 ? '#ff7d72' : color; ctx.fillRect(barX, barY, barW * hpRatio, 2);
      ctx.textAlign = 'center'; ctx.font = '800 8px ui-monospace, monospace'; ctx.fillStyle = '#d9e8ef';
      ctx.fillText(`${Math.ceil(s.hp)} / ${Math.ceil(s.maxHp)}`, s.x, barY - 5);
    }
  }
}
function drawPlayer(t) {
  const p = state.player, a = Math.atan2(pointer.y - p.y, pointer.x - p.x);
  const bob = reduceMotion ? 0 : Math.sin(t * 5.5) * 1.8;
  const charged = state.ammo > 0;

  ctx.save(); ctx.translate(p.x, p.y + bob);
  ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.ellipse(0, 24, 29, 10, 0, 0, Math.PI * 2); ctx.fill();

  ctx.shadowColor = charged ? '#73dafa' : '#314b59'; ctx.shadowBlur = charged ? 14 : 4;
  ctx.fillStyle = '#1d3a50'; circle(0, 0, 25); ctx.fill();
  ctx.shadowBlur = 0; ctx.strokeStyle = '#75d9f3'; ctx.lineWidth = 3; circle(0, 0, 25); ctx.stroke();

  ctx.fillStyle = '#2c536d'; circle(-19, 4, 9); ctx.fill(); circle(19, 4, 9); ctx.fill();
  ctx.fillStyle = '#0b1722'; ctx.fillRect(-13, -12, 26, 19);
  ctx.strokeStyle = '#69bdd5'; ctx.lineWidth = 2; ctx.strokeRect(-13, -12, 26, 19);
  ctx.fillStyle = charged ? '#c9fbff' : '#6c8290'; ctx.fillRect(-8, -7, 5, 5); ctx.fillRect(3, -7, 5, 5);
  ctx.fillStyle = '#c1fb60'; ctx.fillRect(-6, 11, 12, 4);

  ctx.save(); ctx.rotate(a);
  ctx.fillStyle = '#31556b'; ctx.fillRect(10, -9, 24, 18);
  ctx.strokeStyle = '#83d9f0'; ctx.lineWidth = 2; ctx.strokeRect(10, -9, 24, 18);
  ctx.fillStyle = charged ? '#c1fb60' : '#5f7168'; ctx.fillRect(31, -6, 12, 12);
  ctx.fillStyle = '#eaffbd'; ctx.fillRect(40, -3, 8, 6);
  ctx.restore();

  if (charged && !reduceMotion) {
    ctx.strokeStyle = '#a9f6ff'; ctx.lineWidth = 1.5;
    const spark = Math.sin(t * 18) * 4;
    line(-29, -5, -34, -11 + spark); line(-34, -11 + spark, -30, -17);
  }

  ctx.textAlign = 'center'; ctx.font = '900 10px ui-monospace, monospace'; ctx.fillStyle = '#d9f7ff'; ctx.fillText('VOLT', 0, 39);
  ctx.restore();

  if (state.phase === 'playing') {
    ctx.strokeStyle = state.ammo > 0 ? '#9beafa' : '#ff9c82'; ctx.lineWidth = 1.5; circle(pointer.x, pointer.y, 10); ctx.stroke();
    line(pointer.x - 16, pointer.y, pointer.x - 7, pointer.y); line(pointer.x + 7, pointer.y, pointer.x + 16, pointer.y);
    line(pointer.x, pointer.y - 16, pointer.x, pointer.y - 7); line(pointer.x, pointer.y + 7, pointer.x, pointer.y + 16);
  }
}
function render(t, dt) {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, WIDTH, HEIGHT);
  ctx.save(); if (shake > .1) { ctx.translate(Math.sin(t * 89) * shake, Math.cos(t * 107) * shake * .5); shake *= Math.exp(-dt * 18); }
  drawBackground(t); drawHazards(t); drawObjectives(t); drawSnake(t); drawPlayer(t);
  ctx.lineWidth = 3; ctx.strokeStyle = '#d5ff8d'; ctx.shadowColor = '#baff70'; ctx.shadowBlur = 8;
  for (const b of state.bullets) {
    const len = Math.hypot(b.vx, b.vy) || 1, nx = -b.vy / len, ny = b.vx / len;
    const tx = b.x - b.vx * .016, ty = b.y - b.vy * .016;
    ctx.beginPath(); ctx.moveTo(b.x, b.y);
    ctx.lineTo((b.x + tx) / 2 + nx * (b.fork - 1) * 3, (b.y + ty) / 2 + ny * (b.fork - 1) * 3);
    ctx.lineTo(tx, ty); ctx.stroke();
  }
  ctx.shadowBlur = 0;
  for (const a of arcs) {
    ctx.globalAlpha = Math.min(1, a.life * 8); ctx.strokeStyle = a.big ? '#e4ffb4' : '#87e0fb'; ctx.lineWidth = a.big ? 4 : 1.5;
    ctx.beginPath(); ctx.moveTo(a.x, a.y); for (let i = 1; i < 6; i++) { const k = i / 6, wiggle = Math.sin(i * 13 + t * 30) * (a.big ? 13 : 6); ctx.lineTo(a.x + (a.tx - a.x) * k + wiggle, a.y + (a.ty - a.y) * k - wiggle); } ctx.lineTo(a.tx, a.ty); ctx.stroke(); a.life -= dt;
  }
  for (const p of particles) { p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; ctx.globalAlpha = Math.min(1, p.life * 3); ctx.fillStyle = p.color; ctx.fillRect(p.x - 2, p.y - 2, 4, 4); }
  for (const r of rings) {
    r.life -= dt; ctx.globalAlpha = Math.max(0, r.life * 2); ctx.strokeStyle = r.color; ctx.lineWidth = r.aoe ? 3 : 2;
    circle(r.x, r.y, r.aoe ? r.radius * (1 + (1 - r.life / .62) * .08) : r.venom ? r.radius * (1 + (1 - r.life / .34) * .08) : (1 - r.life / .45) * (r.explosive ? 95 : 50) + 10);
    ctx.stroke();
  }
  ctx.textAlign = 'center'; ctx.font = 'bold 15px ui-monospace, monospace';
  for (const l of labels) { l.life -= dt; l.y -= dt * (l.small ? 24 : 32); ctx.globalAlpha = Math.max(0, Math.min(1, l.life * 3)); ctx.fillStyle = l.color; ctx.font = l.small ? '800 11px ui-monospace, monospace' : 'bold 15px ui-monospace, monospace'; ctx.fillText(l.text, l.x, l.y); }
  ctx.globalAlpha = 1;
  particles = particles.filter(p => p.life > 0); arcs = arcs.filter(a => a.life > 0); rings = rings.filter(r => r.life > 0); labels = labels.filter(l => l.life > 0);
  if (state.combo >= 2 && state.phase === 'playing') { ctx.textAlign = 'center'; ctx.fillStyle = '#d8ff9a'; ctx.font = '900 30px ui-monospace, monospace'; ctx.fillText(`×${Math.min(state.combo, 8)}`, 600, 435); ctx.fillStyle = '#8ba781'; ctx.font = '11px ui-monospace, monospace'; ctx.fillText(language === 'es' ? 'ROTURAS EN CADENA' : 'CHAIN BREAKS', 600, 455); }
  if (state.phase === 'playing' && state.ultimateCharge >= state.buster.ultimate.chargeMax) {
    ctx.save(); ctx.globalAlpha = .72; ctx.strokeStyle = '#b79cff'; ctx.lineWidth = 2; ctx.setLineDash([8, 7]); circle(pointer.x, pointer.y, state.buster.ultimate.radius); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(173,145,255,.055)'; circle(pointer.x, pointer.y, state.buster.ultimate.radius); ctx.fill(); ctx.restore();
  }
  ctx.restore();
}
function panel(html) { $('panel').innerHTML = html; $('overlay').hidden = false; resetInput(); $('panel').querySelector('button')?.focus({ preventScroll: true }); }
function restart() {
  state = createGame(); startGame(state); particles = []; arcs = []; rings = []; labels = []; accumulator = 0;
  pointer = { x: 600, y: 330 }; resetInput(); shown = ''; syncUI(); canvas.focus({ preventScroll: true });
}
function resume() { state.phase = 'playing'; shown = ''; accumulator = 0; resetInput(); syncUI(); canvas.focus({ preventScroll: true }); }
function pause(help = false) {
  if (!['playing', 'paused'].includes(state.phase)) return;
  state.phase = 'paused'; shown = 'paused';
  const es = language === 'es';
  panel(`<span class="run-tag">${tr('world.name')} · SECTOR ${state.run.sector}</span><p class="eyebrow">${help ? (es ? 'CONTROLES' : 'CONTROLS') : (es ? 'EXPEDICIÓN EN PAUSA' : 'EXPEDITION PAUSED')}</p><h2>${help ? (es ? 'Kit de combate.' : 'Combat kit.') : encounterName()}</h2><ul class="rules"><li><b>WASD / ${es ? 'flechas' : 'arrows'}:</b> ${es ? 'movimiento' : 'movement'}.</li><li><b>${es ? 'Clic mantenido' : 'Hold click'}:</b> ${es ? 'Tridente Tesla: una carga dispara tres rayos.' : 'Tesla Trident: one ammo charge fires three bolts.'}</li><li><b>E:</b> ${es ? 'Sobrecarga, habilidad con enfriamiento.' : 'Overload, cooldown ability.'}</li><li><b>Q:</b> ${es ? 'apunta un área y descarga Tormenta. Sólo los básicos cargan la definitiva.' : 'aim an area and unleash Storm. Only basic attacks charge the ultimate.'}</li><li><b>${es ? 'Azul' : 'Blue'}:</b> ${es ? 'blindado' : 'armored'}. <b>${es ? 'Naranja' : 'Orange'}:</b> ${es ? 'explosivo' : 'explosive'}.</li></ul><div class="pause-actions"><button id="resume" class="primary">${es ? 'SEGUIR' : 'RESUME'} <span>↗</span></button><button id="retreat" class="secondary">${es ? 'ABANDONAR A LA BASE' : 'RETURN TO HQ'}</button></div>`);
  $('resume').onclick = resume; $('retreat').onclick = () => leaveRun('lobby-screen'); syncHUD();
}
function syncUI() {
  syncHUD();
  if (shown === state.phase) return;
  shown = state.phase;
  if (state.phase === 'playing') { $('overlay').hidden = true; return; }
  if (state.phase === 'upgrade') {
    const mutationId = getEncounter(state).mutationAfter, mutation = mutationId ? MUTATIONS[mutationId] : null;
    const es = language === 'es';
    const mutationName = mutation ? (es ? mutation.name : ({'plated-scales':'Plated Scales','unstable-glands':'Unstable Glands','overgrowth':'Overgrowth','frenzy':'Alpha Frenzy'}[mutation.id] || mutation.name)) : '';
    const mutationText = mutation ? (es ? mutation.text : ({'plated-scales':'Greenfang develops more armor and extra resistance.','unstable-glands':'More explosive segments appear and rupture harder.','overgrowth':'Greenfang regrows more body between sectors.','frenzy':'The creature advances faster near the nest.'}[mutation.id] || mutation.text)) : '';
    panel(`<span class="run-tag">SECTOR ${state.run.sector} ${es ? 'LIMPIO' : 'CLEARED'}</span><p class="eyebrow">${es ? 'COMBINACIÓN DE EXPEDICIÓN' : 'EXPEDITION BUILD'}</p><h2>${es ? 'Elige tu mejora.' : 'Choose your upgrade.'}</h2><p class="intro">${es ? 'Tu combinación persiste hasta que termine la expedición.' : 'Your build persists until the expedition ends.'}${mutation ? ` Greenfang: <b>${mutationName}</b> — ${mutationText}` : ''}</p><div class="upgrade-grid">${state.choices.map((id, i) => { const u = UPGRADES.find(u => u.id === id), copy = upgradeCopy(u); return `<button class="upgrade-card" data-upgrade="${id}"><span class="symbol" aria-hidden="true">${u.icon}</span><strong>${copy.name}</strong><p>${copy.text}</p><small>${es ? 'ELEGIR' : 'CHOOSE'} · ${i + 1}</small></button>`; }).join('')}</div>`);
    document.querySelectorAll('[data-upgrade]').forEach(b => b.onclick = () => select(b.dataset.upgrade));
  }
  if (state.phase === 'route') {
    const es = language === 'es';
    const cards = state.run.routeChoices.map(id => {
      const route = ROUTES[id];
      const risky = route.risk === 'danger';
      const name = es ? route.name : (id === 'maintenance' ? 'Maintenance Duct' : 'Infested Nest');
      const text = es ? route.text : (id === 'maintenance'
        ? 'Stable route: Greenfang advances 10% slower in the next sector.'
        : 'More body, health and speed plus 3 nests. Clear it to recover 1 mutation sample.');
      return `<button class="route-card ${risky ? 'danger-route' : 'safe-route'}" data-route="${id}"><span>${risky ? '!' : '✓'}</span><div><small>${risky ? (es?'RIESGO ALTO':'HIGH RISK') : (es?'RUTA ESTABLE':'STABLE ROUTE')}</small><strong>${name}</strong><p>${text}</p></div></button>`;
    }).join('');
    panel(`<span class="run-tag">${es?'BIFURCACIÓN DE EXPEDICIÓN':'EXPEDITION FORK'}</span><p class="eyebrow">${es?'ELIGE EL SIGUIENTE CONDUCTO':'CHOOSE THE NEXT PATH'}</p><h2>${es?'¿Seguro o infestado?':'Safe or infested?'}</h2><p class="intro">${es?'La decisión modifica el siguiente sector y queda guardada en esta run.':'This decision changes the next sector and persists for this run.'}</p><div class="route-grid">${cards}</div>`);
    document.querySelectorAll('[data-route]').forEach(b => b.onclick = () => selectRoute(b.dataset.route));
  }

  if (['won', 'lost'].includes(state.phase)) {
    const won = state.phase === 'won';
    const es = language === 'es';
    panel(`<span class="run-tag">${es ? 'BROTE 01' : 'OUTBREAK 01'} · ${tr('world.name')}</span><p class="eyebrow">${won ? (es ? 'GREENFANG CONTENIDA' : 'GREENFANG CONTAINED') : (es ? 'CONTENCIÓN FALLIDA' : 'CONTAINMENT FAILED')}</p><h2>${won ? (es ? 'Expedición completa.<br>Por ahora.' : 'Expedition complete.<br>For now.') : (es ? 'Greenfang rompió<br>la línea.' : 'Greenfang broke<br>the line.')}</h2><div class="results"><div><small>${es ? 'PUNTUACIÓN' : 'SCORE'}</small><strong>${format(state.score)}</strong></div><div><small>${es ? 'MEJOR CADENA' : 'BEST CHAIN'}</small><strong>×${Math.min(8, state.maxCombo)}</strong></div><div><small>${es ? 'SECTORES' : 'SECTORS'}</small><strong>${won ? 5 : Math.max(0, state.wave - 1)} / 5</strong></div></div>${state.run.salvage ? `<div class="run-loot"><span>◆</span><div><small>${es ? 'MUESTRAS DE MUTACIÓN' : 'MUTATION SAMPLES'}</small><strong>+${state.run.salvage}</strong></div></div>` : ''}<p class="intro">${state.kills} ${es ? 'segmentos destruidos' : 'segments destroyed'} · ${Math.floor(state.time / 60)}:${String(Math.floor(state.time % 60)).padStart(2, '0')} · ${Math.round(state.hits / Math.max(1, state.shots * state.buster.basic.projectiles) * 100)} %</p><div class="result-actions"><button id="again" class="primary">${es ? 'REINTENTAR' : 'RETRY'} <span>↗</span></button><button id="return-hq" class="secondary">${es ? 'VOLVER A LA BASE' : 'RETURN TO HQ'}</button></div>`);
    $('again').onclick = restart; $('return-hq').onclick = () => leaveRun('lobby-screen');
  }
}
function syncHUD() {
  $('wave').innerHTML = `${String(state.run.sector).padStart(2, '0')} <small>/ 05</small>`;
  $('encounter-name').textContent = encounterName().toUpperCase();
  const objectiveLabel = $('objective-label'), objectiveValue = $('objective-value');
  if (state.encounter?.rule === 'hunt-escape') {
    objectiveLabel.textContent = language === 'es' ? 'CAZA' : 'HUNT';
    objectiveValue.textContent = `${Math.round(state.encounterState.huntDamage)} / ${Math.round(state.encounterState.huntTarget)} · ${Math.ceil(state.encounterState.huntTimer)}s`;
  } else if ((state.encounterState?.splitLanes || 1) > 1) {
    objectiveLabel.textContent = language === 'es' ? 'DIVISIÓN' : 'SPLIT';
    const lanes = state.encounterState.splitLanes;
    const alive = new Set(state.segments.filter(s => s.d >= 0).map(s => s.lane || 0)).size;
    objectiveValue.textContent = language === 'es' ? `${alive} / ${lanes} RAMAS` : `${alive} / ${lanes} BRANCHES`;
  } else if ((state.objectives?.length || 0) > 0) {
    objectiveLabel.textContent = language === 'es' ? 'NIDOS' : 'NESTS';
    objectiveValue.textContent = String(state.objectives.length);
  } else if (state.encounter?.rule === 'alpha-phases') {
    objectiveLabel.textContent = 'GREENFANG';
    objectiveValue.textContent = language === 'es' ? `FASE ${(state.encounterState.alphaPhase || 0) + 1}` : `PHASE ${(state.encounterState.alphaPhase || 0) + 1}`;
  } else {
    objectiveLabel.textContent = 'GREENFANG';
    objectiveValue.textContent = state.run.mutations.length
      ? (language === 'es' ? `${state.run.mutations.length} MUTACIÓN${state.run.mutations.length === 1 ? '' : 'ES'}` : `${state.run.mutations.length} MUTATION${state.run.mutations.length === 1 ? '' : 'S'}`)
      : tr('status.noMut');
  }
  const remaining = clamp(100 * (1 - state.head / PATH_LENGTH), 0, 100);
  $('distance').textContent = language === 'es' ? `${Math.ceil(remaining)} % DE MARGEN` : `${Math.ceil(remaining)} % MARGIN`;
  $('danger').value = remaining;
  const coreStatus = $('core-status');
  coreStatus.textContent = remaining > 45 ? tr('status.safe') : remaining > 20 ? tr('status.warn') : tr('status.danger');
  coreStatus.dataset.state = remaining > 45 ? 'safe' : remaining > 20 ? 'warn' : 'danger';

  const ammo = $('ammo'), ammoCells = [...ammo.children];
  ammoCells.forEach((cell, i) => {
    const filled = i < state.ammo;
    cell.classList.toggle('empty', !filled);
    cell.style.setProperty('--reload', !filled && i === state.ammo && state.ammoTimer > 0 ? `${100 * (1 - state.ammoTimer / state.buster.basic.ammoReload)}%` : '0%');
  });
  ammo.setAttribute('aria-label', `${state.ammo} de ${state.buster.basic.ammoMax} cargas disponibles`);
  $('ammo-text').textContent = `${state.ammo} / ${state.buster.basic.ammoMax}`;

  $('ability').disabled = state.phase !== 'playing' || state.abilityCooldown > 0;
  $('cooldown').textContent = state.abilityCooldown > 0 ? `${state.abilityCooldown.toFixed(1)} s` : tr('status.ready');
  $('ability-meter').style.width = `${100 * (1 - state.abilityCooldown / state.buster.ability.cooldown)}%`;

  const ultMax = state.buster.ultimate.chargeMax, ultPct = clamp(100 * state.ultimateCharge / ultMax, 0, 100);
  $('ultimate').disabled = state.phase !== 'playing' || state.ultimateCharge < ultMax;
  $('ultimate-status').textContent = state.ultimateCharge >= ultMax ? tr('status.ready') : `${Math.floor(ultPct)} %`;
  $('ultimate-meter').style.width = `${ultPct}%`;
  $('pause').disabled = !['playing', 'paused'].includes(state.phase);
  $('pause').innerHTML = state.phase === 'paused' ? `${tr('continue')} <kbd>P</kbd>` : `${tr('pause')} <kbd>P</kbd>`;
}
function select(id) {
  if (!chooseUpgrade(state, id)) return;
  resetInput(); accumulator = 0; syncUI(); canvas.focus({ preventScroll: true });
}
function selectRoute(id) {
  if (!chooseRoute(state, id)) return;
  resetInput(); accumulator = 0; shown = ''; syncUI(); canvas.focus({ preventScroll: true });
}
function toWorld(e) {
  const r = canvas.getBoundingClientRect(), scale = Math.min(r.width / WIDTH, r.height / HEIGHT);
  return { x: clamp((e.clientX - r.left - (r.width - WIDTH * scale) / 2) / scale, 0, WIDTH), y: clamp((e.clientY - r.top - (r.height - HEIGHT * scale) / 2) / scale, 0, HEIGHT) };
}
canvas.addEventListener('pointermove', e => { pointer = toWorld(e); });
canvas.addEventListener('pointerdown', e => {
  if (state.phase !== 'playing' || (e.pointerType === 'mouse' && e.button !== 0)) return;
  e.preventDefault(); canvas.focus({ preventScroll: true }); pointer = toWorld(e); shooting = true;
  try { canvas.setPointerCapture(e.pointerId); } catch {}
});
canvas.addEventListener('pointerup', () => { shooting = false; });
canvas.addEventListener('pointercancel', () => { shooting = false; });
canvas.addEventListener('lostpointercapture', () => { shooting = false; });
canvas.addEventListener('contextmenu', e => e.preventDefault());
document.querySelectorAll('[data-move]').forEach(b => {
  b.addEventListener('pointerdown', e => { e.preventDefault(); touchMoves.set(e.pointerId, b.dataset.move); b.setPointerCapture(e.pointerId); });
  for (const event of ['pointerup', 'pointercancel', 'lostpointercapture']) b.addEventListener(event, e => touchMoves.delete(e.pointerId));
});
window.addEventListener('keydown', e => {
  if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space'].includes(e.code) && ['playing', 'paused'].includes(state.phase)) e.preventDefault();
  if (e.repeat) return;
  keys.add(e.code);
  if (e.code === 'KeyP' || e.code === 'Escape') { if (state.phase === 'playing') pause(); else if (state.phase === 'paused') resume(); }
  if ((e.code === 'KeyE' || e.code === 'Space') && state.phase === 'playing') { state.aim = { ...pointer }; activateAbility(state); }
  if (e.code === 'KeyQ' && state.phase === 'playing') { state.aim = { ...pointer }; activateUltimate(state); }
  if (state.phase === 'upgrade' && /^Digit[123]$/.test(e.code)) select(state.choices[Number(e.code.slice(-1)) - 1]);
});
window.addEventListener('keyup', e => keys.delete(e.code));
window.addEventListener('blur', () => { resetInput(); if (state.phase === 'playing') pause(); });
document.addEventListener('visibilitychange', () => { if (document.hidden) { resetInput(); if (state.phase === 'playing') pause(); } });
$('title-enter').onclick = () => goScreen('lobby-screen');
$('lobby-home').onclick = () => goScreen('title-screen');
$('lobby-play').onclick = () => goScreen('outbreak-screen');
$('outbreak-back').onclick = () => goScreen('lobby-screen');
$('outbreak-deploy').onclick = deploy;
$('game-hq').onclick = () => leaveRun('lobby-screen');
document.querySelectorAll('[data-feature]').forEach(button => button.onclick = () => {
  const feature = button.dataset.feature;
  const keys = { busters:'toast.busters', locker:'toast.locker', shop:'toast.shop', social:'toast.social' };
  lobbyToast(tr(keys[feature] || 'common.soon'));
});
document.querySelectorAll('[data-lang-toggle]').forEach(button => button.onclick = toggleLanguage);
$('pause').onclick = () => state.phase === 'paused' ? resume() : pause();
$('ability').onclick = () => { state.aim = { ...pointer }; activateAbility(state); canvas.focus({ preventScroll: true }); };
$('ultimate').onclick = () => { state.aim = { ...pointer }; activateUltimate(state); canvas.focus({ preventScroll: true }); };
$('sound').onclick = () => { sound = !sound; $('sound').textContent = tr(sound ? 'sound.on' : 'sound.off'); $('sound').setAttribute('aria-pressed', String(sound)); if (sound) tone(550, .1); };
$('help').onclick = () => { if (state.phase === 'playing' || state.phase === 'paused') pause(true); else announce(language === 'es' ? 'WASD · CLIC · E HABILIDAD · Q DEFINITIVA' : 'WASD · CLICK · E ABILITY · Q ULTIMATE'); };
applyLanguage();

const smokeMode = new URLSearchParams(location.search).has('smoke');
let smokeStartX = 0;
if (smokeMode) {
  try {
    $('title-enter').click();
    $('lobby-play').click();
    $('outbreak-deploy').click();
    smokeStartX = state.player.x;
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyD', bubbles: true }));
    $('ability').click();
    const rect = canvas.getBoundingClientRect();
    canvas.dispatchEvent(new PointerEvent('pointerdown', {
      bubbles: true,
      pointerId: 77,
      pointerType: 'mouse',
      button: 0,
      clientX: rect.left + rect.width * .5,
      clientY: rect.top + rect.height * .35,
    }));
    document.body.dataset.smoke = 'pending';
  } catch (error) {
    document.body.dataset.smoke = 'error';
    document.body.dataset.smokeError = String(error?.message || error);
  }
}
function frame(now) {
  const dt = Math.min(.05, (now - (last || now)) / 1000); last = now;
  if (state.phase === 'playing') {
    accumulator += dt;
    const moves = new Set(touchMoves.values());
    const input = {
      x: Number(keys.has('KeyD') || keys.has('ArrowRight') || moves.has('right')) - Number(keys.has('KeyA') || keys.has('ArrowLeft') || moves.has('left')),
      y: Number(keys.has('KeyS') || keys.has('ArrowDown') || moves.has('down')) - Number(keys.has('KeyW') || keys.has('ArrowUp') || moves.has('up')),
      fire: shooting, aim: pointer,
    };
    while (accumulator >= STEP) { update(state, STEP, input); accumulator -= STEP; if (state.phase !== 'playing') { accumulator = 0; break; } }
  } else accumulator = 0;
  events(); syncUI(); render(now / 1000, state.phase === 'paused' ? 0 : dt);
  if (smokeMode) {
    const rect = canvas.getBoundingClientRect();
    const visible = rect.width >= 300 && rect.height >= 220 && getComputedStyle(canvas).visibility !== 'hidden' && getComputedStyle(canvas).display !== 'none';
    const interactive = state.player.x > smokeStartX + .5 && state.abilityCooldown > 0 && state.shots > 0;
    const rows = [
      document.querySelector('.game-topbar').getBoundingClientRect(),
      document.querySelector('.game-statusbar').getBoundingClientRect(),
      document.querySelector('.game-arena').getBoundingClientRect(),
      document.querySelector('.game-kitbar').getBoundingClientRect(),
    ];
    const separated = rows.every((r, i) => i === rows.length - 1 || r.bottom <= rows[i + 1].top + .5);
    const horizontalRows = ['.game-topbar', '.game-statusbar', '.game-kitbar'].map(selector => {
      const children = [...document.querySelector(selector).children].filter(el => getComputedStyle(el).display !== 'none');
      const rects = children.map(el => el.getBoundingClientRect());
      return rects.every((r, i) => i === rects.length - 1 || r.right <= rects[i + 1].left + .5);
    });
    const horizontalClean = horizontalRows.every(Boolean);
    const inViewport = rows.every(r => r.top >= -1 && r.bottom <= innerHeight + 1 && r.left >= -1 && r.right <= innerWidth + 1);
    const clean = !runtimeError;
    document.body.dataset.smoke = state.phase === 'playing' && visible && interactive && separated && horizontalClean && inViewport && clean && state.segments.length > 0 ? 'playing' : 'layout-error';
    document.body.dataset.smokeCanvas = `${Math.round(rect.width)}x${Math.round(rect.height)}`;
    document.body.dataset.smokeSegments = String(state.segments.length);
    document.body.dataset.smokeInteractive = interactive ? 'yes' : 'no';
    document.body.dataset.smokeSeparated = separated ? 'yes' : 'no';
    document.body.dataset.smokeHorizontal = horizontalClean ? 'yes' : 'no';
    document.body.dataset.smokeViewport = inViewport ? 'yes' : 'no';
    document.body.dataset.smokeRuntime = clean ? 'clean' : runtimeError;
  }
  if (announcementTime > 0) { announcementTime -= dt; if (announcementTime <= 0) $('announce').classList.remove('show'); }
  if (lobbyToastTime > 0) { lobbyToastTime -= dt; if (lobbyToastTime <= 0) $('lobby-toast')?.classList.remove('show'); }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
