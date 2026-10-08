/* The Reading Room's visiting pets: one small pet per visit wanders along the bottom of the screen. Tap it to hear from it. */
(function () {
  'use strict';

  const shadow = '<ellipse class="shadow" cx="32" cy="61.6" rx="19" ry="2.2"/>';

  // Drawn facing right on a 64 x 64 grid with feet at the bottom.
  const ART = {
    maple: '<svg viewBox="0 0 64 64" aria-hidden="true">' + shadow +
      '<g class="leg leg-b"><rect x="17.4" y="40" width="4.6" height="20" rx="2.3" fill="#A55F28"/></g>' +
      '<g class="leg leg-a"><rect x="40.8" y="40" width="4.6" height="20" rx="2.3" fill="#A55F28"/></g>' +
      '<g class="tail"><path d="M15.5 31 L11 17.5" stroke="#2B2420" stroke-width="5.2" stroke-linecap="round"/></g>' +
      '<rect x="12" y="27" width="36" height="19" rx="8.5" fill="#C77B3B"/>' +
      '<path d="M13.2 33 Q13 26.5 20 26.3 L41 26 Q47.5 26 47.6 32 L47.4 36.5 Q30 40.5 13.4 37.2 Z" fill="#2B2420"/>' +
      '<g class="leg leg-a"><rect x="20.8" y="41" width="5" height="20.4" rx="2.5" fill="#C77B3B"/><rect x="19.6" y="58.6" width="7.2" height="3" rx="1.5" fill="#B36A2F"/></g>' +
      '<g class="leg leg-b"><rect x="43.8" y="41" width="5" height="20.4" rx="2.5" fill="#C77B3B"/><rect x="42.8" y="58.6" width="7.2" height="3" rx="1.5" fill="#B36A2F"/></g>' +
      '<g class="head">' +
        '<path d="M39 31 L40.6 15 Q41 11.2 45 11.2 L55 11.2 Q56.8 11.2 57.6 12.8 L62.6 17.4 Q63.2 18.2 63 19.4 L62.8 25 L48 26 L46 33 Z" fill="#C77B3B"/>' +
        '<path d="M39.5 29.5 L41 16.5 Q44 19.5 46.2 23 L45 31 Z" fill="#2B2420"/>' +
        '<path d="M48 24.4 L63 24 L62.6 27.6 L60.8 26.6 L59.6 29.8 L57.8 27.6 L55.8 30.8 L54.2 28 L51.8 30.6 L50.6 27.4 Z" fill="#B0672E"/>' +
        '<path d="M43.6 12 L50.4 11.6 L48.2 18.6 Z" fill="#94501F"/>' +
        '<path d="M50 15 L55 14" stroke="#8A4818" stroke-width="2.1" stroke-linecap="round"/>' +
        '<circle class="eye" cx="52.8" cy="17.3" r="1.5" fill="#1E1A18"/>' +
        '<rect x="60.4" y="16.2" width="3.6" height="3.6" rx="1.5" fill="#1E1A18"/>' +
        '<path d="M55.2 21.4 l2 .5 M57.8 21 l1.7 .7" stroke="#9E5622" stroke-width=".9" stroke-linecap="round"/>' +
      '</g></svg>',

    fig: '<svg viewBox="0 0 64 64" aria-hidden="true">' + shadow +
      '<g class="tail"><path d="M19 41 C9 40.5 5.5 32 9 21" stroke="#8C9198" stroke-width="4.6" fill="none" stroke-linecap="round"/>' +
        '<path d="M10.2 35 l3.6 -1.4 M7.6 29 l3.8 -.4 M8 23.6 l3.6 .6" stroke="#5B6067" stroke-width="2" stroke-linecap="round"/></g>' +
      '<g class="leg leg-b"><rect x="19.5" y="44" width="4.2" height="16.5" rx="2.1" fill="#70757C"/></g>' +
      '<g class="leg leg-a"><rect x="39" y="44" width="4.2" height="16.5" rx="2.1" fill="#70757C"/></g>' +
      '<ellipse cx="31" cy="42" rx="15.5" ry="8.6" fill="#8C9198"/>' +
      '<path d="M19 45 Q31 53 43 45 Q31 48.5 19 45 Z" fill="#C9CDD2"/>' +
      '<path d="M23.5 34.6 q2.2 4.4 .4 9.2 M28.6 33.6 q2.2 4.8 .4 10 M33.8 33.6 q2.2 4.8 .4 10 M39 35 q1.6 3.6 .3 7.4" stroke="#5B6067" stroke-width="2.1" fill="none" stroke-linecap="round"/>' +
      '<g class="leg leg-a"><rect x="22.6" y="45" width="4.6" height="16.4" rx="2.3" fill="#8C9198"/><ellipse cx="25.6" cy="60.6" rx="3.4" ry="1.6" fill="#C9CDD2"/></g>' +
      '<g class="leg leg-b"><rect x="36.4" y="45" width="4.6" height="16.4" rx="2.3" fill="#8C9198"/><ellipse cx="39.4" cy="60.6" rx="3.4" ry="1.6" fill="#C9CDD2"/></g>' +
      '<g class="head">' +
        '<path d="M40.6 28.5 L42 17.5 L48.2 24 Z" fill="#8C9198"/><path d="M42 26 L42.8 20.6 L46 24.6 Z" fill="#E8A9B5"/>' +
        '<path d="M47.5 23.5 L55 18 L55.4 28.5 Z" fill="#8C9198"/><path d="M50 24 L54 21 L54.2 26.5 Z" fill="#E8A9B5"/>' +
        '<circle cx="48" cy="32.6" r="9.4" fill="#8C9198"/>' +
        '<path d="M44.6 24.6 l1 3.6 M48 23.8 l0 3.8 M51.4 24.6 l-1 3.6" stroke="#5B6067" stroke-width="1.7" stroke-linecap="round"/>' +
        '<path d="M40 32 l3.2 .6 M40.4 35.6 l3 -.2" stroke="#5B6067" stroke-width="1.6" stroke-linecap="round"/>' +
        '<ellipse cx="53.2" cy="37" rx="4.6" ry="3.6" fill="#C9CDD2"/>' +
        '<g class="eye"><ellipse cx="51.4" cy="30.8" rx="2.4" ry="2.7" fill="#A6C93E"/><ellipse cx="51.9" cy="30.8" rx=".8" ry="2.2" fill="#1E1A18"/></g>' +
        '<path d="M55.6 34.4 L58 34.2 L56.9 36.2 Z" fill="#D9808F"/>' +
        '<path d="M56 37.6 L63 36 M56 38.8 L62.6 39.6" stroke="#EEF0F2" stroke-width=".7" stroke-linecap="round"/>' +
      '</g></svg>',

    bobby: '<svg viewBox="0 0 64 64" aria-hidden="true">' + shadow +
      '<path d="M21 27 L2.5 40.5 L4.6 43 L23.5 31.5 Z" fill="#222326"/>' +
      '<path d="M21.5 28.5 L6 44 L8.2 45.8 L24 32 Z" fill="#3A3C40"/>' +
      '<g class="leg leg-b"><rect x="25" y="29" width="5.4" height="13" rx="2.7" fill="#2A2B2E"/>' +
        '<path d="M27.6 41 L26.4 61" stroke="#C7A48C" stroke-width="2.2" stroke-linecap="round"/><path d="M26.4 61 L22.6 61.6 M26.4 61 L30.2 61.6" stroke="#C7A48C" stroke-width="1.6" stroke-linecap="round"/></g>' +
      '<ellipse cx="30.5" cy="25.5" rx="12.5" ry="7.4" transform="rotate(-14 30.5 25.5)" fill="#C9CED3"/>' +
      '<path d="M19.5 25 Q29 18.5 40.5 21 L37 29.5 Q27 32.5 18.5 29.5 Z" fill="#9AA1A8"/>' +
      '<path d="M18.5 29.5 L28 31.2 L21 35.4 Z" fill="#222326"/>' +
      '<g class="leg leg-a"><rect x="30.6" y="28.5" width="6.4" height="14" rx="3.2" fill="#222326"/>' +
        '<path d="M33.8 41.5 L34.6 61" stroke="#D8B59C" stroke-width="2.5" stroke-linecap="round"/><path d="M34.6 61 L39 61.6 M34.6 61 L30.6 61.6" stroke="#D8B59C" stroke-width="1.7" stroke-linecap="round"/></g>' +
      '<g class="head">' +
        '<path d="M38 23 Q43 17 44.8 12" stroke="#C9CED3" stroke-width="5.4" stroke-linecap="round" fill="none"/>' +
        '<g class="crest"><path d="M43.4 7.4 L34.6 2.6 M43 9 L33.8 6.6 M43.4 10.6 L35 10.4 M44 12 L36.6 13.8" stroke="#222326" stroke-width="1.7" stroke-linecap="round"/>' +
          '<path d="M34.6 2.6 l-1 -.5 M33.8 6.6 l-1.1 -.2 M35 10.4 l-1.1 .1 M36.6 13.8 l-1 .4" stroke="#222326" stroke-width="2.8" stroke-linecap="round"/></g>' +
        '<circle cx="46.6" cy="9.4" r="5.4" fill="#D5D9DD"/>' +
        '<ellipse cx="49" cy="9.2" rx="3.4" ry="2.8" fill="#EE6A2C"/>' +
        '<circle class="eye" cx="49.4" cy="8.7" r="1.05" fill="#1E1A18"/>' +
        '<path d="M48 7.2 L51.4 7" stroke="#1E1A18" stroke-width=".7" stroke-linecap="round"/>' +
        '<path d="M51.6 8.4 Q57.4 8.2 56.6 12.8 Q55.6 11 52 11 Z" fill="#7E8E9B"/>' +
      '</g></svg>',

    hawk: '<svg viewBox="0 0 64 64" aria-hidden="true">' +
      '<g class="pose-perch">' + shadow +
        '<path d="M27 43 L15.5 58.5 L21.4 61.4 L33 46 Z" fill="#C0532B"/>' +
        '<path d="M18 57 L21 59 M20.5 53.6 L23.6 55.6" stroke="#8E3A1C" stroke-width="1" stroke-linecap="round"/>' +
        '<ellipse cx="33" cy="35" rx="11" ry="14" fill="#F2E6CF"/>' +
        '<path d="M27 41 l1.6 1 M30.4 42.4 l1.4 1 M33.8 42.6 l1.4 .8 M37.2 41.8 l1.2 .9 M31.6 39.2 l1 .8 M35.6 39.4 l1 .8" stroke="#7A5535" stroke-width="1.5" stroke-linecap="round"/>' +
        '<path d="M24 23.5 Q19.6 38 25.4 51.5 L33.2 49.6 Q34.6 34 31 23.5 Z" fill="#6E4B2E"/>' +
        '<path d="M25.6 30 Q28 31 30.6 30 M25.2 36 Q28 37 31 36 M25.6 42 Q28.4 43 31.4 42" stroke="#8F6A45" stroke-width="1.1" fill="none" stroke-linecap="round"/>' +
        '<path d="M33.5 55.6 L32.2 61 M36.6 55.6 L37.6 61" stroke="#E7BF45" stroke-width="2" stroke-linecap="round"/>' +
        '<path d="M30 61.2 L34.4 61.2 M35.8 61.2 L40.2 61.2" stroke="#E7BF45" stroke-width="1.6" stroke-linecap="round"/>' +
        '<g class="head"><circle cx="37" cy="20" r="7.4" fill="#6E4B2E"/>' +
          '<ellipse cx="39.6" cy="23.6" rx="4.2" ry="3.2" fill="#F2E6CF"/>' +
          '<path d="M37.6 16.8 Q40 15.6 42.6 16.6" stroke="#4A301C" stroke-width="1.4" fill="none" stroke-linecap="round"/>' +
          '<circle class="eye" cx="40.2" cy="18.8" r="1.7" fill="#5A3414"/><circle cx="40.6" cy="18.4" r=".5" fill="#FFF"/>' +
          '<rect x="42.6" y="18" width="1.8" height="2.4" rx=".6" fill="#E7BF45"/>' +
          '<path d="M44 18.2 Q48.4 18.6 47.2 23.2 L44 21.4 Z" fill="#3F3F44"/></g>' +
      '</g>' +
      '<g class="pose-fly">' +
        '<g class="wing wing-far"><path d="M36 30 C33 21 29 14 22 9.5 C27 9 33 12 39 20.5 L40.6 30 Z" fill="#4E3420"/></g>' +
        '<path d="M21 31.6 L5.5 26.5 Q4 33.2 5.6 39.8 L21 35.6 Z" fill="#C0532B"/>' +
        '<path d="M8 29 L19 32 M7.6 37 L19 34.6" stroke="#8E3A1C" stroke-width=".9" stroke-linecap="round"/>' +
        '<ellipse cx="33.5" cy="33.6" rx="14" ry="5.6" fill="#F2E6CF"/>' +
        '<path d="M21 31.4 Q33 26.4 46 30.8 Q33 30.4 21 33 Z" fill="#6E4B2E"/>' +
        '<path d="M29 36.2 l1.2 .9 M32.6 36.8 l1.2 .8 M36.2 36.6 l1.1 .8" stroke="#7A5535" stroke-width="1.3" stroke-linecap="round"/>' +
        '<path d="M43 37.6 L44.2 40.6 M45 37 L46.8 39.6" stroke="#E7BF45" stroke-width="1.6" stroke-linecap="round"/>' +
        '<circle cx="48.4" cy="30.4" r="5.4" fill="#6E4B2E"/>' +
        '<ellipse cx="50" cy="33" rx="3" ry="2.2" fill="#F2E6CF"/>' +
        '<circle cx="50.6" cy="29.4" r="1.3" fill="#5A3414"/>' +
        '<rect x="52.4" y="28.8" width="1.4" height="2" rx=".5" fill="#E7BF45"/>' +
        '<path d="M53.6 29 Q57.4 29.4 56.4 33 L53.6 31.6 Z" fill="#3F3F44"/>' +
        '<g class="wing wing-near"><path d="M38 32 C35 22 28 13 15 7 C19.6 15 22.4 23 26.4 33.6 Z" fill="#6E4B2E"/>' +
          '<path d="M33.6 27.6 C31 21.6 26 15.8 19 11.4" stroke="#F2E6CF" stroke-width="2.2" fill="none" stroke-linecap="round" opacity=".7"/>' +
          '<path d="M17.4 9 L15 7" stroke="#2E1D10" stroke-width="2.6" stroke-linecap="round"/></g>' +
      '</g></svg>'
  };

  // Gerald is in the crew but doesn't visit (octopuses need a tank).
  ART.gerald = '<svg viewBox="0 0 64 64" aria-hidden="true">' +
    '<g fill="none" stroke="#8C5EAA" stroke-width="5" stroke-linecap="round">' +
      '<path d="M20 34 C12 40 10 50 16 54 C20 57 22 52 19 50"/><path d="M25 37 C22 46 22 55 28 58 C31 59 32 55 29 54"/>' +
      '<path d="M32 38 C32 47 34 55 40 57 C43 58 44 54 41 53"/><path d="M39 37 C44 44 48 52 54 52 C57 52 57 48 54 48"/>' +
      '<path d="M44 33 C52 36 58 42 58 34 C58 31 55 31 55 33"/></g>' +
    '<ellipse cx="32" cy="24" rx="16" ry="15" fill="#9B6FB8"/><ellipse cx="32" cy="35" rx="13" ry="5" fill="#9B6FB8"/>' +
    '<circle cx="25" cy="14.5" r="2" fill="#B892D0"/><circle cx="38" cy="13" r="1.6" fill="#B892D0"/><circle cx="43" cy="19" r="1.3" fill="#B892D0"/>' +
    '<ellipse cx="26.5" cy="26" rx="3.4" ry="4" fill="#FFF"/><ellipse cx="37.5" cy="26" rx="3.4" ry="4" fill="#FFF"/>' +
    '<circle cx="27.3" cy="27" r="1.7" fill="#1E1A18"/><circle cx="38.3" cy="27" r="1.7" fill="#1E1A18"/>' +
    '<g fill="none" stroke="#3A2A1A" stroke-width="1.6" transform="rotate(-9 32 26)"><circle cx="26.5" cy="26" r="5.2"/><circle cx="37.5" cy="26" r="5.2"/>' +
      '<path d="M31.7 25.5 Q32 24 32.3 25.5 M21.3 25 L17.5 23 M42.7 25 L46.5 23"/></g>' +
    '<path d="M28.5 33 Q32 35.5 35.5 33" stroke="#4A2A55" stroke-width="1.4" fill="none" stroke-linecap="round"/>' +
    '<circle cx="21.5" cy="31" r="2" fill="#E8A9C5" opacity=".7"/><circle cx="42.5" cy="31" r="2" fill="#E8A9C5" opacity=".7"/>' +
    '</svg>';

  const PETS = {
    // BB is a hand drawing (docs/img/bb.webp), so BB waddles instead of stepping and never flips around.
    bb: { img: 'img/bb.webp', w: 152, h: 210, size: 68, speed: 34, kind: 'blanket', sink: 0 },
    bobby: { art: 'bobby', size: 64, speed: 48, kind: 'secretary bird' },
    maple: { art: 'maple', size: 54, speed: 64, kind: 'Welsh terrier' },
    fig: { art: 'fig', size: 50, speed: 44, kind: 'gray tabby' },
    hawk: { art: 'hawk', size: 52, speed: 170, kind: 'red-tailed hawk', flies: true }
  };
  const ORDER = ['bb', 'bobby', 'maple', 'fig', 'hawk'];
  const KEY = 'book-dude:pet';

  let layer = null, el = null, bubble = null, pet = null, id = '';
  let x = 0, y = 0, raf = 0, timer = 0, bubbleTimer = 0, busy = false, running = false;
  let names = {}, lines = {}, recent = [];
  const still = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const rand = (a, b) => a + Math.random() * (b - a);

  // Each visit brings the next pet in line.
  function nextPet() {
    let i;
    try {
      const saved = parseInt(localStorage.getItem(KEY), 10);
      i = saved >= 0 ? saved % ORDER.length : 0;  // BB makes the first visit.
      localStorage.setItem(KEY, String((i + 1) % ORDER.length));
    } catch (e) {
      i = Math.floor(Math.random() * ORDER.length);  // Private browsing: a random pet is fine.
    }
    return ORDER[i];
  }

  // Walkers stand on the tab bar on a phone, or on the bottom of the screen when the tabs are a sidebar.
  function floor() {
    const bar = document.querySelector('.tabbar');
    const r = bar && bar.getBoundingClientRect();
    if (r && r.top > window.innerHeight * 0.5) return { y: r.top, left: 6 };
    return { y: window.innerHeight - 18, left: r && r.right < window.innerWidth * 0.5 ? r.right + 6 : 6 };
  }
  function bounds() {
    const f = floor();
    return { min: f.left, max: Math.max(f.left, window.innerWidth - pet.size - 6), ground: f.y - pet.size + (pet.sink === undefined ? 3 : pet.sink) };
  }

  function place() { el.style.transform = 'translate3d(' + Math.round(x) + 'px,' + Math.round(y) + 'px,0)'; placeBubble(); }
  function face(dir) { el.classList.toggle('left', dir < 0); }

  function move(tx, ty, arc, done) {
    cancelAnimationFrame(raf);
    const fx = x, fy = y, dist = Math.hypot(tx - fx, ty - fy);
    const dur = Math.max(300, dist / pet.speed * 1000);
    face(tx < fx ? -1 : 1);
    el.classList.add(pet.flies ? 'flying' : 'walking');
    const t0 = performance.now();
    const step = now => {
      const k = Math.min(1, (now - t0) / dur);
      const e = pet.flies ? (1 - Math.cos(Math.PI * k)) / 2 : k;
      x = fx + (tx - fx) * e;
      y = fy + (ty - fy) * e - Math.sin(Math.PI * k) * arc;
      place();
      if (k < 1) raf = requestAnimationFrame(step);
      else { el.classList.remove('walking', 'flying'); done && done(); }
    };
    raf = requestAnimationFrame(step);
  }

  function wander() {
    clearTimeout(timer);
    timer = setTimeout(() => {
      if (!running || busy || document.hidden) return wander();
      const b = bounds();
      // Somewhere new, not just a step over.
      let tx = rand(b.min, b.max);
      if (Math.abs(tx - x) < 60) tx = x < (b.min + b.max) / 2 ? Math.min(b.max, x + rand(80, 200)) : Math.max(b.min, x - rand(80, 200));
      if (pet.flies) move(tx, b.ground, rand(window.innerHeight * 0.18, window.innerHeight * 0.38), wander);
      else move(tx, b.ground, 0, wander);
    }, rand(6000, 14000));
  }

  function arrive() {
    const b = bounds();
    // With the tabs down the left side (iPad), pets come in from the right so they don't pop out of the sidebar.
    const fromLeft = b.min < 20 && Math.random() < 0.5;
    const tx = rand(b.min + (b.max - b.min) * 0.15, b.min + (b.max - b.min) * 0.85);
    if (still()) { x = tx; y = b.ground; place(); el.classList.add('here'); return; }
    if (pet.flies) {
      x = fromLeft ? -pet.size - 10 : window.innerWidth + 10;
      y = window.innerHeight * 0.2;
      place();
      el.classList.add('here');
      move(tx, b.ground, 30, wander);
    } else {
      x = fromLeft ? -pet.size - 4 : window.innerWidth + 4;
      y = b.ground;
      place();
      el.classList.add('here');
      move(tx, b.ground, 0, wander);
    }
  }

  function fill(text) {
    return String(text).replace(/\{dog\}/g, names.dog).replace(/\{cat\}/g, names.cat);
  }

  function petName() {
    const name = fill((lines[id] && lines[id].name) || '');
    return name || pet.kind.charAt(0).toUpperCase() + pet.kind.slice(1);
  }

  function say() {
    const list = (lines[id] && lines[id].lines) || [];
    if (!list.length) return;
    const options = list.map((_, i) => i).filter(i => !recent.includes(i));
    const pick = options.length ? options[Math.floor(Math.random() * options.length)] : 0;
    recent = recent.concat(pick).slice(-Math.min(4, list.length - 1));
    const who = petName();
    bubble.innerHTML = '';
    if (who) { const b = document.createElement('b'); b.textContent = who; bubble.appendChild(b); }
    bubble.appendChild(document.createTextNode(fill(list[pick])));
    bubble.hidden = false;
    placeBubble();
    clearTimeout(bubbleTimer);
    bubbleTimer = setTimeout(hideBubble, 7000);
  }
  function hideBubble() { if (bubble) bubble.hidden = true; }

  function placeBubble() {
    if (!bubble || bubble.hidden) return;
    const w = bubble.offsetWidth, h = bubble.offsetHeight;
    const left = Math.max(8, Math.min(window.innerWidth - w - 8, x + pet.size / 2 - w / 2));
    const top = Math.max(8, y - h - 8);
    bubble.style.transform = 'translate3d(' + Math.round(left) + 'px,' + Math.round(top) + 'px,0)';
    bubble.style.setProperty('--tip', Math.round(Math.max(14, Math.min(w - 14, x + pet.size / 2 - left))) + 'px');
  }

  function tapped() {
    el.classList.remove('hop');
    void el.offsetWidth;
    el.classList.add('hop');
    say();
  }

  function onResize() {
    if (!el) return;
    cancelAnimationFrame(raf);
    el.classList.remove('walking', 'flying');
    const b = bounds();
    x = Math.max(b.min, Math.min(b.max, x));
    y = b.ground;
    place();
    wander();
  }

  function start(opts) {
    if (running) return;
    opts = opts || {};
    names = { dog: opts.dog || 'Maple', cat: opts.cat || 'Fig' };
    lines = opts.lines || {};
    id = nextPet();
    pet = PETS[id];
    running = true;
    layer = document.createElement('div');
    layer.className = 'critters';
    el = document.createElement('button');
    el.type = 'button';
    el.className = 'critter critter-' + id;
    el.style.width = el.style.height = pet.size + 'px';
    const name = fill((lines[id] && lines[id].name) || '');
    el.setAttribute('aria-label', (name ? name + ' the ' + pet.kind : 'A ' + pet.kind) + ' came to visit. Tap to hear what they have to say.');
    const art = pet.img ? '<img src="' + pet.img + '" alt="" width="' + pet.w + '" height="' + pet.h + '" draggable="false">' : ART[pet.art];
    el.innerHTML = '<span class="critter-body">' + art + '</span>';
    el.addEventListener('click', tapped);
    el.addEventListener('animationend', e => { if (e.animationName === 'pet-hop') el.classList.remove('hop'); });
    bubble = document.createElement('div');
    bubble.className = 'critter-bubble';
    bubble.setAttribute('role', 'status');
    bubble.hidden = true;
    bubble.addEventListener('click', hideBubble);
    layer.appendChild(el);
    layer.appendChild(bubble);
    document.body.appendChild(layer);
    window.addEventListener('resize', onResize);
    // Let the page settle (the tab bar needs to be in place) before the pet shows up.
    setTimeout(() => { if (running) arrive(); }, 900);
  }

  function stop() {
    running = false;
    cancelAnimationFrame(raf);
    clearTimeout(timer);
    clearTimeout(bubbleTimer);
    window.removeEventListener('resize', onResize);
    if (layer) layer.remove();
    layer = el = bubble = null;
  }

  const kinds = {};
  ORDER.forEach(k => { kinds[k] = PETS[k].kind; });
  window.BookPets = { start, stop, pets: ORDER.slice(), kinds, art: ART };
})();
