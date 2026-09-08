import { createGame, startGame, update, activateAbility, activateUltimate, chooseUpgrade, getEncounter, MUTATIONS, pathAt, PATH_LENGTH, UPGRADES, WIDTH, HEIGHT, STEP, clamp } from './engine.js';

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
try {
  best = Number(localStorage.getItem('snake-busters:best:v1')) || 0;
  bestSector = Number(localStorage.getItem('snake-busters:toxic-sewers:best-sector:v1')) || 0;
  language = localStorage.getItem('snake-busters:lang:v1') || 'es';
} catch {}

const I18N = {
  es: {
    'title.kicker':'EQUIPO DE CONTENCIÓN // VERSIÓN 0.5','title.line1':'ELLAS MUTAN.','title.line2':'NOSOTROS MÁS.','title.sub':'Entra en zonas infestadas, crea una combinación distinta en cada expedición y llega más lejos con tu escuadrón.','title.enter':'ENTRAR A LA BASE','title.local':'PROTOTIPO · TODO EL PROGRESO ACTUAL ES LOCAL','title.unit':'UNIDAD DE RESPUESTA',
    'profile.rank':'NIVEL 1 · RECLUTA','nav.busters':'BUSTERS','nav.custom':'PERSONALIZAR','nav.cosmetics':'COSMÉTICOS','nav.shop':'TIENDA','nav.social':'SOCIAL','nav.party':'ESCUADRÓN','common.soon':'PRÓXIMAMENTE','common.play':'JUGAR','common.baseBack':'← BASE','common.start':'INICIO','common.locked':'BLOQUEADO',
    'hq.response1':'CONTROL DE','hq.response2':'BROTES','hq.active':'BROTE ACTIVO','hq.best':'MEJOR SECTOR','hq.threat':'AMENAZA','hq.low':'BAJA','hq.outbreak':'BROTE 01','hq.artPending':'ARTE DE PERSONAJE PENDIENTE','hq.selected':'BUSTER SELECCIONADO',
    'party.squad':'ESCUADRÓN','party.invite':'+ INVITAR','party.you':'TÚ','party.ready':'LISTO','party.target':'OBJETIVO COOPERATIVO','party.note':'La versión actual sigue siendo jugable en solitario. El escuadrón real se conectará sobre esta estructura.',
    'map.title':'MAPA DEL BROTE','map.world':'MUNDO 01 // SUBCIUDAD DE SABADELL','map.target':'OBJETIVO','map.class':'SERPIENTE ADAPTATIVA · CLASE C',
    'world.name':'ALCANTARILLAS TÓXICAS','world.toxic':'ALCANTARILLAS','world.sewers':'TÓXICAS','world.infestation':'INFESTACIÓN GREENFANG',
    'mut.venomous':'VENENOSA','mut.splitter':'DIVISORA','mut.unstable':'INESTABLE',
    'enc.drain':'COMPUERTA DE DRENAJE','enc.filter':'SALA DE FILTROS','enc.split':'TUBERÍA BIFURCADA','enc.sump':'EL SUMIDERO','enc.alpha':'GREENFANG ALFA',
    'deploy.title':'DESPLIEGUE','deploy.run':'EXPEDICIÓN','deploy.runText':'5 sectores · mejoras entre encuentros · la combinación se reinicia al abandonar.',
    'combat.basic':'TRIDENTE TESLA','combat.ability':'HABILIDAD','combat.ultimate':'DEFINITIVA','combat.storm':'TORMENTA',
    'status.ready':'LISTA','status.safe':'SEGURO','status.warn':'ALERTA','status.danger':'PELIGRO','status.noMut':'SIN MUTACIONES',
    'sound.off':'Sonido: no','sound.on':'Sonido: sí','pause':'Pausa','continue':'Continuar',
    'toast.busters':'Volt es el Buster de referencia. El diseño final de personajes llegará después de cerrar los sistemas.','toast.locker':'Personalización preparada para aspectos, efectos, banners y gestos.','toast.shop':'La tienda todavía no tiene economía ni compras.','toast.social':'El escuadrón de 3 está preparado visualmente. El multijugador real vendrá después.'
  },
  en: {
    'title.kicker':'CONTAINMENT CREW // BUILD 0.5','title.line1':'THEY MUTATE.','title.line2':'WE HIT HARDER.','title.sub':'Enter infested zones, build a different loadout every expedition and push farther with your squad.','title.enter':'ENTER HQ','title.local':'PROTOTYPE · CURRENT PROGRESS IS LOCAL ONLY','title.unit':'RESPONSE UNIT',
    'profile.rank':'LEVEL 1 · RECRUIT','nav.busters':'BUSTERS','nav.custom':'CUSTOMIZE','nav.cosmetics':'COSMETICS','nav.shop':'SHOP','nav.social':'SOCIAL','nav.party':'SQUAD','common.soon':'COMING SOON','common.play':'PLAY','common.baseBack':'← HQ','common.start':'START','common.locked':'LOCKED',
    'hq.response1':'OUTBREAK','hq.response2':'CONTROL','hq.active':'ACTIVE OUTBREAK','hq.best':'BEST SECTOR','hq.threat':'THREAT','hq.low':'LOW','hq.outbreak':'OUTBREAK 01','hq.artPending':'CHARACTER ART PENDING','hq.selected':'SELECTED BUSTER',
    'party.squad':'SQUAD','party.invite':'+ INVITE','party.you':'YOU','party.ready':'READY','party.target':'CO-OP TARGET','party.note':'The current build is still playable solo. Real squad play will plug into this structure later.',
    'map.title':'OUTBREAK MAP','map.world':'WORLD 01 // SABADELL UNDERCITY','map.target':'TARGET','map.class':'ADAPTIVE SERPENT · CLASS C',
    'world.name':'TOXIC SEWERS','world.toxic':'TOXIC','world.sewers':'SEWERS','world.infestation':'GREENFANG INFESTATION',
    'mut.venomous':'VENOMOUS','mut.splitter':'SPLITTER','mut.unstable':'UNSTABLE',
    'enc.drain':'DRAIN GATE','enc.filter':'FILTER HALL','enc.split':'SPLIT PIPE','enc.sump':'THE SUMP','enc.alpha':'GREENFANG ALPHA',
    'deploy.title':'DEPLOYMENT','deploy.run':'EXPEDITION','deploy.runText':'5 sectors · upgrades between encounters · the build resets when you leave.',
    'combat.basic':'TESLA TRIDENT','combat.ability':'ABILITY','combat.ultimate':'ULTIMATE','combat.storm':'STORM',
    'status.ready':'READY','status.safe':'SAFE','status.warn':'WARNING','status.danger':'DANGER','status.noMut':'NO MUTATIONS',
    'sound.off':'Sound: off','sound.on':'Sound: on','pause':'Pause','continue':'Continue',
    'toast.busters':'Volt is the reference Buster. Final character design comes after the systems are locked.','toast.locker':'Customization is reserved for skins, effects, banners and emotes.','toast.shop':'The shop has no economy or purchases yet.','toast.social':'The 3-player squad shell is ready. Real multiplayer comes later.'
  }
};
const t = key => I18N[language]?.[key] ?? I18N.es[key] ?? key;
const ENCOUNTER_KEYS = {'drain-gate':'enc.drain','filter-hall':'enc.filter','split-pipe':'enc.split','the-sump':'enc.sump','greenfang-alpha':'enc.alpha'};
function encounterName(encounter = state.encounter) { return t(ENCOUNTER_KEYS[encounter?.id] || 'enc.drain'); }
function applyLanguage() {
  document.documentElement.lang = language;
  document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
  document.querySelectorAll('[data-lang-toggle]').forEach(btn => { btn.textContent = language === 'es' ? 'EN' : 'ES'; });
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
    if (e.type === 'break') {
      burst(e.x, e.y, colors[e.kind], e.kind === 'volatile' ? 30 : 18);
      rings.push({ x: e.x, y: e.y, life: .45, color: colors[e.kind], explosive: e.kind === 'volatile' });
      labels.push({ x: e.x, y: e.y - 25, text: e.combo > 1 ? `×${Math.min(e.combo, 8)} CADENA` : '+100', life: .85, color: e.combo > 1 ? '#fff0ac' : '#c1fb60' });
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
  track(); ctx.strokeStyle = '#06101a'; ctx.lineWidth = 68; ctx.stroke();
  track(); ctx.strokeStyle = '#425868'; ctx.lineWidth = 56; ctx.stroke();
  track(); ctx.strokeStyle = '#152a38'; ctx.lineWidth = 49; ctx.stroke();
  track(); ctx.strokeStyle = '#2f4b5c'; ctx.lineWidth = 2; ctx.setLineDash([2, 11]); ctx.stroke(); ctx.setLineDash([]);

  for (let d = 85; d < PATH_LENGTH - 70; d += 175) {
    const p = pathAt(d); ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.a);
    ctx.strokeStyle = '#547284'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-7, -6); ctx.lineTo(1, 0); ctx.lineTo(-7, 6); ctx.stroke(); ctx.restore();
  }

  ctx.textAlign = 'center'; ctx.fillStyle = '#7797a8'; ctx.font = '800 10px ui-monospace, monospace'; ctx.fillText('ENTRADA', 130, 86);
  const remaining = clamp(100 * (1 - state.head / PATH_LENGTH), 0, 100);
  const danger = remaining < 22;
  const p = pathAt(PATH_LENGTH);
  ctx.save(); ctx.translate(p.x, p.y);
  ctx.shadowColor = danger ? '#ff6d62' : '#73dafa'; ctx.shadowBlur = danger ? 18 + pulse * 12 : 10;
  ctx.strokeStyle = danger ? '#ff796d' : '#75cde2'; ctx.lineWidth = 4; circle(0, 0, 37); ctx.stroke();
  ctx.rotate(reduceMotion ? 0 : t * .4); polygon(0, 0, 25, 6); ctx.fillStyle = danger ? '#3f2629' : '#193746'; ctx.fill(); ctx.stroke();
  ctx.rotate(reduceMotion ? 0 : -t * .8); polygon(0, 0, 14, 4, Math.PI / 4); ctx.fillStyle = danger ? '#ff8b75' : '#b9f5ff'; ctx.fill();
  ctx.restore();
  ctx.fillStyle = danger ? '#ff8c7f' : '#a2eaf4'; ctx.font = '900 11px ui-monospace, monospace'; ctx.fillText('NÚCLEO', p.x, p.y - 54);

  if (danger && state.phase === 'playing') {
    ctx.strokeStyle = `rgba(255,105,89,${.20 + pulse * .22})`; ctx.lineWidth = 7; ctx.strokeRect(4, 4, WIDTH - 8, HEIGHT - 8);
  }
}
function drawSnake(t) {
  for (let i = state.segments.length - 1; i >= 0; i--) {
    const s = state.segments[i]; if (s.d < 0) continue;
    const color = colors[s.type], hpRatio = Math.max(0, s.hp / s.maxHp);
    const hovered = Math.hypot(pointer.x - s.x, pointer.y - s.y) < 58;
    const wobble = reduceMotion ? 0 : Math.sin(t * 4 + s.id * .8) * 1.2;

    ctx.save(); ctx.translate(s.x, s.y + wobble); ctx.rotate(s.a);
    ctx.shadowColor = 'rgba(0,0,0,.65)'; ctx.shadowBlur = 10; ctx.shadowOffsetY = 6;
    polygon(0, 0, 25, s.type === 'armor' ? 8 : 6); ctx.fillStyle = '#06121a'; ctx.fill();
    ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;

    polygon(0, 0, 22, s.type === 'armor' ? 8 : 6);
    ctx.fillStyle = s.flash > 0 ? '#f4ffff' : s.type === 'normal' ? '#547f35' : s.type === 'armor' ? '#435b99' : '#9a4a38';
    ctx.fill(); ctx.strokeStyle = color; ctx.lineWidth = 2.5; ctx.stroke();

    if (s.type === 'armor') {
      ctx.strokeStyle = '#b9c9ff'; ctx.lineWidth = 2;
      line(-7, -7, 4, -7); line(-9, 0, 7, 0); line(-7, 7, 4, 7);
      ctx.fillStyle = '#d8e1ff'; circle(-12, 0, 2.2); ctx.fill();
    } else if (s.type === 'volatile') {
      ctx.fillStyle = '#ffc18f'; polygon(-1, 0, 10 + Math.sin(t * 8 + s.id) * 1.5, 3); ctx.fill();
      ctx.strokeStyle = '#ffe0af'; ctx.lineWidth = 2; line(-10, -7, 8, 7); line(-10, 7, 8, -7);
    } else {
      ctx.fillStyle = '#d4ff8f'; circle(-3, 0, 5); ctx.fill();
      ctx.fillStyle = '#31551f'; circle(-3, 0, 2); ctx.fill();
    }

    if (i === 0) {
      ctx.fillStyle = '#f7fff1'; circle(10, -8, 4.3); ctx.fill(); circle(10, 8, 4.3); ctx.fill();
      ctx.fillStyle = '#17211a'; circle(12, -8, 1.8); ctx.fill(); circle(12, 8, 1.8); ctx.fill();
      ctx.strokeStyle = '#efffda'; ctx.lineWidth = 2; line(18, -4, 25, 0); line(25, 0, 18, 4);
    }
    ctx.restore();

    const barW = 42, barX = s.x - barW / 2, barY = s.y - 35;
    ctx.fillStyle = 'rgba(3,10,16,.86)'; ctx.fillRect(barX - 2, barY - 2, barW + 4, 7);
    ctx.fillStyle = hpRatio < .3 ? '#ff7d72' : color; ctx.fillRect(barX, barY, barW * hpRatio, 3);
    if (hovered || hpRatio < .999 || i === 0) {
      ctx.textAlign = 'center'; ctx.font = '800 9px ui-monospace, monospace'; ctx.fillStyle = '#d9e8ef';
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
  drawBackground(t); drawSnake(t); drawPlayer(t);
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
    circle(r.x, r.y, r.aoe ? r.radius * (1 + (1 - r.life / .62) * .08) : (1 - r.life / .45) * (r.explosive ? 95 : 50) + 10);
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
  panel(`<span class="run-tag">${t('world.name')} · SECTOR ${state.run.sector}</span><p class="eyebrow">${help ? (es ? 'CONTROLES' : 'CONTROLS') : (es ? 'EXPEDICIÓN EN PAUSA' : 'EXPEDITION PAUSED')}</p><h2>${help ? (es ? 'Kit de combate.' : 'Combat kit.') : encounterName()}</h2><ul class="rules"><li><b>WASD / ${es ? 'flechas' : 'arrows'}:</b> ${es ? 'movimiento' : 'movement'}.</li><li><b>${es ? 'Clic mantenido' : 'Hold click'}:</b> ${es ? 'Tridente Tesla: una carga dispara tres rayos.' : 'Tesla Trident: one ammo charge fires three bolts.'}</li><li><b>E:</b> ${es ? 'Sobrecarga, habilidad con enfriamiento.' : 'Overload, cooldown ability.'}</li><li><b>Q:</b> ${es ? 'apunta un área y descarga Tormenta. Sólo los básicos cargan la definitiva.' : 'aim an area and unleash Storm. Only basic attacks charge the ultimate.'}</li><li><b>${es ? 'Azul' : 'Blue'}:</b> ${es ? 'blindado' : 'armored'}. <b>${es ? 'Naranja' : 'Orange'}:</b> ${es ? 'explosivo' : 'explosive'}.</li></ul><div class="pause-actions"><button id="resume" class="primary">${es ? 'SEGUIR' : 'RESUME'} <span>↗</span></button><button id="retreat" class="secondary">${es ? 'ABANDONAR A LA BASE' : 'RETURN TO HQ'}</button></div>`);
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
    panel(`<span class="run-tag">SECTOR ${state.run.sector} ${es ? 'LIMPIO' : 'CLEARED'}</span><p class="eyebrow">${es ? 'COMBINACIÓN DE EXPEDICIÓN' : 'EXPEDITION BUILD'}</p><h2>${es ? 'Elige tu mejora.' : 'Choose your upgrade.'}</h2><p class="intro">${es ? 'Tu combinación persiste hasta que termine la expedición.' : 'Your build persists until the expedition ends.'}${mutation ? ` Greenfang: <b>${mutationName}</b> — ${mutationText}` : ''}</p><div class="upgrade-grid">${state.choices.map((id, i) => { const u = UPGRADES.find(u => u.id === id); return `<button class="upgrade-card" data-upgrade="${id}"><span class="symbol" aria-hidden="true">${u.icon}</span><strong>${u.name}</strong><p>${u.text}</p><small>${es ? 'ELEGIR' : 'CHOOSE'} · ${i + 1}</small></button>`; }).join('')}</div>`);
    document.querySelectorAll('[data-upgrade]').forEach(b => b.onclick = () => select(b.dataset.upgrade));
  }
  if (['won', 'lost'].includes(state.phase)) {
    const won = state.phase === 'won';
    const es = language === 'es';
    panel(`<span class="run-tag">${es ? 'BROTE 01' : 'OUTBREAK 01'} · ${t('world.name')}</span><p class="eyebrow">${won ? (es ? 'GREENFANG CONTENIDA' : 'GREENFANG CONTAINED') : (es ? 'CONTENCIÓN FALLIDA' : 'CONTAINMENT FAILED')}</p><h2>${won ? (es ? 'Expedición completa.<br>Por ahora.' : 'Expedition complete.<br>For now.') : (es ? 'Greenfang rompió<br>la línea.' : 'Greenfang broke<br>the line.')}</h2><div class="results"><div><small>${es ? 'PUNTUACIÓN' : 'SCORE'}</small><strong>${format(state.score)}</strong></div><div><small>${es ? 'MEJOR CADENA' : 'BEST CHAIN'}</small><strong>×${Math.min(8, state.maxCombo)}</strong></div><div><small>${es ? 'SECTORES' : 'SECTORS'}</small><strong>${won ? 5 : Math.max(0, state.wave - 1)} / 5</strong></div></div><p class="intro">${state.kills} ${es ? 'segmentos destruidos' : 'segments destroyed'} · ${Math.floor(state.time / 60)}:${String(Math.floor(state.time % 60)).padStart(2, '0')} · ${Math.round(state.hits / Math.max(1, state.shots) * 100)} %</p><div class="result-actions"><button id="again" class="primary">${es ? 'REINTENTAR' : 'RETRY'} <span>↗</span></button><button id="return-hq" class="secondary">${es ? 'VOLVER A LA BASE' : 'RETURN TO HQ'}</button></div>`);
    $('again').onclick = restart; $('return-hq').onclick = () => leaveRun('lobby-screen');
  }
}
function syncHUD() {
  $('wave').innerHTML = `${String(state.run.sector).padStart(2, '0')} <small>/ 05</small>`;
  $('encounter-name').textContent = encounterName().toUpperCase();
  $('mutation-count').textContent = state.run.mutations.length ? (language === 'es' ? `${state.run.mutations.length} MUTACIÓN${state.run.mutations.length === 1 ? '' : 'ES'}` : `${state.run.mutations.length} MUTATION${state.run.mutations.length === 1 ? '' : 'S'}`) : t('status.noMut');
  const remaining = clamp(100 * (1 - state.head / PATH_LENGTH), 0, 100);
  $('distance').textContent = language === 'es' ? `${Math.ceil(remaining)} % DE MARGEN` : `${Math.ceil(remaining)} % MARGIN`;
  $('danger').value = remaining;
  const coreStatus = $('core-status');
  coreStatus.textContent = remaining > 45 ? t('status.safe') : remaining > 20 ? t('status.warn') : t('status.danger');
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
  $('cooldown').textContent = state.abilityCooldown > 0 ? `${state.abilityCooldown.toFixed(1)} s` : t('status.ready');
  $('ability-meter').style.width = `${100 * (1 - state.abilityCooldown / state.buster.ability.cooldown)}%`;

  const ultMax = state.buster.ultimate.chargeMax, ultPct = clamp(100 * state.ultimateCharge / ultMax, 0, 100);
  $('ultimate').disabled = state.phase !== 'playing' || state.ultimateCharge < ultMax;
  $('ultimate-status').textContent = state.ultimateCharge >= ultMax ? t('status.ready') : `${Math.floor(ultPct)} %`;
  $('ultimate-meter').style.width = `${ultPct}%`;
  $('pause').disabled = !['playing', 'paused'].includes(state.phase);
  $('pause').innerHTML = state.phase === 'paused' ? `${t('continue')} <kbd>P</kbd>` : `${t('pause')} <kbd>P</kbd>`;
}
function select(id) {
  if (!chooseUpgrade(state, id)) return;
  resetInput(); accumulator = 0; syncUI(); canvas.focus({ preventScroll: true });
}
function toWorld(e) {
  const r = canvas.getBoundingClientRect(), scale = Math.min(r.width / WIDTH, r.height / HEIGHT);
  return { x: clamp((e.clientX - r.left - (r.width - WIDTH * scale) / 2) / scale, 0, WIDTH), y: clamp((e.clientY - r.top - (r.height - HEIGHT * scale) / 2) / scale, 0, HEIGHT) };
}
canvas.addEventListener('pointermove', e => { pointer = toWorld(e); });
canvas.addEventListener('pointerdown', e => {
  if (state.phase !== 'playing' || (e.pointerType === 'mouse' && e.button !== 0)) return;
  e.preventDefault(); canvas.focus({ preventScroll: true }); pointer = toWorld(e); shooting = true; canvas.setPointerCapture(e.pointerId);
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
  lobbyToast(t(keys[feature] || 'common.soon'));
});
document.querySelectorAll('[data-lang-toggle]').forEach(button => button.onclick = toggleLanguage);
$('pause').onclick = () => state.phase === 'paused' ? resume() : pause();
$('ability').onclick = () => { state.aim = { ...pointer }; activateAbility(state); canvas.focus({ preventScroll: true }); };
$('ultimate').onclick = () => { state.aim = { ...pointer }; activateUltimate(state); canvas.focus({ preventScroll: true }); };
$('sound').onclick = () => { sound = !sound; $('sound').textContent = t(sound ? 'sound.on' : 'sound.off'); $('sound').setAttribute('aria-pressed', String(sound)); if (sound) tone(550, .1); };
$('help').onclick = () => { if (state.phase === 'playing' || state.phase === 'paused') pause(true); else announce(language === 'es' ? 'WASD · CLIC · E HABILIDAD · Q DEFINITIVA' : 'WASD · CLICK · E ABILITY · Q ULTIMATE'); };
applyLanguage();
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
  if (announcementTime > 0) { announcementTime -= dt; if (announcementTime <= 0) $('announce').classList.remove('show'); }
  if (lobbyToastTime > 0) { lobbyToastTime -= dt; if (lobbyToastTime <= 0) $('lobby-toast')?.classList.remove('show'); }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
