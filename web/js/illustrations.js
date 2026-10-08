/**
 * Themed animated SVG hero illustrations for each page and game.
 *
 * Designed to make each mathematical world instantly recognizable, charming,
 * and visually rich for kids. Each illustration is responsive, uses vibrant
 * colors with soft shadows and gradients, and has gentle animations that
 * pause when prefers-reduced-motion is active.
 */

let uidCounter = 0;
const uid = (prefix = "ill") => `${prefix}_${(++uidCounter).toString(16)}`;

function animWrap(id, keyframes, extraCss = "") {
  return `<style>
    #${id} .anim-float { animation: ${id}_float 3s ease-in-out infinite alternate; }
    #${id} .anim-float-rev { animation: ${id}_float_rev 3.2s ease-in-out infinite alternate; }
    #${id} .anim-pulse { animation: ${id}_pulse 2s ease-in-out infinite alternate; }
    #${id} .anim-spin { animation: ${id}_spin 8s linear infinite; }
    #${id} .anim-spin-slow { animation: ${id}_spin 14s linear infinite; }
    #${id} .anim-blink { animation: ${id}_blink 4s infinite; }
    #${id} .anim-sparkle { animation: ${id}_sparkle 1.8s ease-in-out infinite alternate; }
    #${id} .anim-bob { animation: ${id}_bob 2.4s ease-in-out infinite alternate; }
    #${id} .anim-wiggle { animation: ${id}_wiggle 2.5s ease-in-out infinite alternate; }
    ${keyframes}
    @keyframes ${id}_float { 0% { transform: translateY(0px); } 100% { transform: translateY(-7px); } }
    @keyframes ${id}_float_rev { 0% { transform: translateY(0px); } 100% { transform: translateY(6px); } }
    @keyframes ${id}_pulse { 0% { transform: scale(1); opacity: 0.9; } 100% { transform: scale(1.08); opacity: 1; } }
    @keyframes ${id}_spin { 100% { transform: rotate(360deg); } }
    @keyframes ${id}_blink { 0%, 92%, 100% { transform: scaleY(1); } 96% { transform: scaleY(0.1); } }
    @keyframes ${id}_sparkle { 0% { transform: scale(0.6) rotate(0deg); opacity: 0.4; } 100% { transform: scale(1.15) rotate(45deg); opacity: 1; } }
    @keyframes ${id}_bob { 0% { transform: translateY(0px) rotate(-2deg); } 100% { transform: translateY(-5px) rotate(2deg); } }
    @keyframes ${id}_wiggle { 0% { transform: rotate(-5deg); } 100% { transform: rotate(5deg); } }
    ${extraCss}
    @media (prefers-reduced-motion: reduce) {
      #${id} * { animation: none !important; }
    }
  </style>`;
}

/** 👾 Tafel Monster: Space alien monster in UFO with multiplication rays & stars */
export function tafelIllustration() {
  const id = uid("tafel");
  return `<svg id="${id}" class="kmg-hero-svg" viewBox="0 0 160 160" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Tafel Monster">
    <defs>
      <radialGradient id="${id}_glow" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#b388ff" stop-opacity="0.6"/>
        <stop offset="100%" stop-color="#7c4dff" stop-opacity="0"/>
      </radialGradient>
      <linearGradient id="${id}_beam" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#00e676" stop-opacity="0.45"/>
        <stop offset="100%" stop-color="#00e676" stop-opacity="0"/>
      </linearGradient>
      <linearGradient id="${id}_body" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#b388ff"/>
        <stop offset="100%" stop-color="#651fff"/>
      </linearGradient>
      <linearGradient id="${id}_saucer" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#eceff1"/>
        <stop offset="50%" stop-color="#b0bec5"/>
        <stop offset="100%" stop-color="#78909c"/>
      </linearGradient>
    </defs>
    ${animWrap(id, `
      @keyframes ${id}_beamGlow { 0% { opacity: 0.3; } 100% { opacity: 0.8; } }
      #${id} .beam { animation: ${id}_beamGlow 1.8s ease-in-out infinite alternate; }
    `)}
    <!-- Space background stars -->
    <circle cx="20" cy="28" r="2.5" fill="#ffe57f" class="anim-sparkle" style="transform-origin:20px 28px;"/>
    <circle cx="142" cy="35" r="3" fill="#80d8ff" class="anim-sparkle" style="transform-origin:142px 35px; animation-delay:0.6s;"/>
    <circle cx="25" cy="125" r="2" fill="#ffd180" class="anim-sparkle" style="transform-origin:25px 125px; animation-delay:1.1s;"/>
    <circle cx="138" cy="120" r="2.5" fill="#b9f6ca" class="anim-sparkle" style="transform-origin:138px 120px; animation-delay:0.3s;"/>
    <!-- Multiplication floating badge -->
    <g class="anim-float-rev" style="transform-origin:130px 65px;">
      <circle cx="132" cy="70" r="14" fill="#ff7043" stroke="#fff" stroke-width="2"/>
      <text x="132" y="76" font-size="16" font-weight="900" fill="#fff" text-anchor="middle" font-family="sans-serif">×</text>
    </g>
    <!-- Division floating badge -->
    <g class="anim-float" style="transform-origin:28px 75px; animation-delay:0.8s;">
      <circle cx="28" cy="80" r="12" fill="#42a5f5" stroke="#fff" stroke-width="2"/>
      <text x="28" y="85" font-size="14" font-weight="900" fill="#fff" text-anchor="middle" font-family="sans-serif">÷</text>
    </g>
    <!-- Tractor beam -->
    <polygon points="65,105 95,105 125,152 35,152" fill="url(#${id}_beam)" class="beam"/>
    <!-- Floating Alien + UFO -->
    <g class="anim-bob" style="transform-origin:80px 80px;">
      <!-- Alien Monster -->
      <!-- Tentacles / arms -->
      <path d="M 52,65 Q 40,55 45,46 Q 50,42 54,54" fill="none" stroke="#7c4dff" stroke-width="5" stroke-linecap="round"/>
      <path d="M 108,65 Q 120,55 115,46 Q 110,42 106,54" fill="none" stroke="#7c4dff" stroke-width="5" stroke-linecap="round"/>
      <!-- Monster Body (cute rounded head) -->
      <ellipse cx="80" cy="58" rx="28" ry="24" fill="url(#${id}_body)"/>
      <!-- Antennas -->
      <line x1="72" y1="36" x2="64" y2="22" stroke="#651fff" stroke-width="3" stroke-linecap="round"/>
      <circle cx="63" cy="20" r="5" fill="#ffd600" class="anim-pulse" style="transform-origin:63px 20px;"/>
      <line x1="88" y1="36" x2="96" y2="22" stroke="#651fff" stroke-width="3" stroke-linecap="round"/>
      <circle cx="97" cy="20" r="5" fill="#00e676" class="anim-pulse" style="transform-origin:97px 20px; animation-delay:0.5s;"/>
      <!-- Three Cute Eyes -->
      <!-- Center big eye -->
      <circle cx="80" cy="52" r="9" fill="#ffffff"/>
      <circle cx="81" cy="52" r="5" fill="#263238" class="anim-blink" style="transform-origin:80px 52px;"/>
      <circle cx="83" cy="50" r="2" fill="#ffffff"/>
      <!-- Left eye -->
      <circle cx="65" cy="54" r="6" fill="#ffffff"/>
      <circle cx="66" cy="54" r="3.5" fill="#263238"/>
      <circle cx="67" cy="53" r="1.5" fill="#ffffff"/>
      <!-- Right eye -->
      <circle cx="95" cy="54" r="6" fill="#ffffff"/>
      <circle cx="94" cy="54" r="3.5" fill="#263238"/>
      <circle cx="93" cy="53" r="1.5" fill="#ffffff"/>
      <!-- Cheerful monster smile -->
      <path d="M 72,66 Q 80,74 88,66" fill="none" stroke="#311b92" stroke-width="2.8" stroke-linecap="round"/>
      <!-- Cute monster tooth -->
      <polygon points="78,67 82,67 80,71" fill="#ffffff"/>
      <!-- Cheeks blush -->
      <circle cx="62" cy="64" r="4" fill="#ff4081" opacity="0.6"/>
      <circle cx="98" cy="64" r="4" fill="#ff4081" opacity="0.6"/>
      <!-- UFO Glass Dome -->
      <ellipse cx="80" cy="70" rx="34" ry="22" fill="#e0f7fa" opacity="0.45" stroke="#80deea" stroke-width="1.5"/>
      <!-- Flying saucer body -->
      <ellipse cx="80" cy="85" rx="55" ry="18" fill="url(#${id}_saucer)" stroke="#546e7a" stroke-width="2"/>
      <ellipse cx="80" cy="82" rx="44" ry="12" fill="#cfd8dc"/>
      <!-- Saucer flashing colored lights -->
      <circle cx="42" cy="87" r="3.5" fill="#ff1744" class="anim-pulse" style="transform-origin:42px 87px;"/>
      <circle cx="60" cy="91" r="3.5" fill="#ffd600" class="anim-pulse" style="transform-origin:60px 91px; animation-delay:0.3s;"/>
      <circle cx="80" cy="92" r="4" fill="#00e676" class="anim-pulse" style="transform-origin:80px 92px; animation-delay:0.6s;"/>
      <circle cx="100" cy="91" r="3.5" fill="#00b0ff" class="anim-pulse" style="transform-origin:100px 91px; animation-delay:0.9s;"/>
      <circle cx="118" cy="87" r="3.5" fill="#d500f9" class="anim-pulse" style="transform-origin:118px 87px; animation-delay:1.2s;"/>
      <!-- Saucer thruster pod -->
      <ellipse cx="80" cy="98" rx="22" ry="7" fill="#37474f"/>
      <ellipse cx="80" cy="100" rx="14" ry="4" fill="#ffab00" class="anim-pulse" style="transform-origin:80px 100px;"/>
    </g>
  </svg>`;
}

/** 🍕 Breuken Baas: Master chef spinning a delicious cheesy pizza with fractions */
export function breukenIllustration() {
  const id = uid("breuk");
  return `<svg id="${id}" class="kmg-hero-svg" viewBox="0 0 160 160" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Breuken Baas">
    <defs>
      <radialGradient id="${id}_crust" cx="50%" cy="50%" r="50%">
        <stop offset="70%" stop-color="#ffd54f"/>
        <stop offset="95%" stop-color="#ffb300"/>
        <stop offset="100%" stop-color="#e65100"/>
      </radialGradient>
      <radialGradient id="${id}_cheese" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#fff9c4"/>
        <stop offset="75%" stop-color="#fff176"/>
        <stop offset="100%" stop-color="#fbc02d"/>
      </radialGradient>
    </defs>
    ${animWrap(id, `
      @keyframes ${id}_steam { 0% { transform: translateY(0px) scaleX(1); opacity: 0; } 50% { opacity: 0.7; } 100% { transform: translateY(-16px) scaleX(1.4); opacity: 0; } }
      #${id} .steam1 { animation: ${id}_steam 2.2s ease-out infinite; }
      #${id} .steam2 { animation: ${id}_steam 2.5s ease-out 0.8s infinite; }
      #${id} .steam3 { animation: ${id}_steam 2.0s ease-out 1.4s infinite; }
    `)}
    <!-- Steam rising -->
    <path d="M 68,34 Q 73,24 67,14" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" class="steam1" opacity="0.6"/>
    <path d="M 82,30 Q 88,20 81,10" fill="none" stroke="#fff" stroke-width="2.8" stroke-linecap="round" class="steam2" opacity="0.7"/>
    <path d="M 96,35 Q 92,25 98,16" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" class="steam3" opacity="0.6"/>
    <!-- Floating fraction tags -->
    <g class="anim-float" style="transform-origin:25px 40px;">
      <rect x="12" y="28" width="30" height="24" rx="8" fill="#4caf50" stroke="#fff" stroke-width="2"/>
      <text x="27" y="44" font-size="12" font-weight="900" fill="#fff" text-anchor="middle" font-family="sans-serif">½</text>
    </g>
    <g class="anim-float-rev" style="transform-origin:135px 35px; animation-delay:0.7s;">
      <rect x="120" y="24" width="30" height="24" rx="8" fill="#ff7043" stroke="#fff" stroke-width="2"/>
      <text x="135" y="40" font-size="12" font-weight="900" fill="#fff" text-anchor="middle" font-family="sans-serif">¾</text>
    </g>
    <!-- Pizza Chef Mascot & Pizza -->
    <g class="anim-bob" style="transform-origin:80px 95px;">
      <!-- Chef body / apron -->
      <path d="M 45,150 L 115,150 L 105,120 L 55,120 Z" fill="#e53935"/>
      <rect x="62" y="125" width="36" height="25" rx="4" fill="#ffffff"/>
      <!-- Chef Face -->
      <circle cx="80" cy="105" r="22" fill="#ffe0b2"/>
      <!-- Big Chef Moustache -->
      <path d="M 80,110 C 72,106 62,110 60,116 C 68,118 76,114 80,111 C 84,114 92,118 100,116 C 98,110 88,106 80,110 Z" fill="#5d4037"/>
      <!-- Cheerful eyes & blush -->
      <circle cx="71" cy="102" r="2.5" fill="#3e2723"/>
      <circle cx="89" cy="102" r="2.5" fill="#3e2723"/>
      <circle cx="65" cy="107" r="3.5" fill="#ff8a80" opacity="0.6"/>
      <circle cx="95" cy="107" r="3.5" fill="#ff8a80" opacity="0.6"/>
      <!-- Chef Hat -->
      <path d="M 64,88 L 96,88 L 98,82 C 104,82 108,76 104,70 C 108,62 100,54 92,56 C 88,48 72,48 68,56 C 60,54 52,62 56,70 C 52,76 56,82 62,82 Z" fill="#ffffff" stroke="#cfd8dc" stroke-width="1.5"/>
      <rect x="64" y="82" width="32" height="7" fill="#e53935"/>
      <!-- Spinning Pizza Dish -->
      <g style="transform-origin:80px 48px;" class="anim-wiggle">
        <!-- Crust -->
        <circle cx="80" cy="48" r="36" fill="url(#${id}_crust)" stroke="#d84315" stroke-width="3"/>
        <!-- Cheese -->
        <circle cx="80" cy="48" r="30" fill="url(#${id}_cheese)"/>
        <!-- Slices dividers (4 equal quarters) -->
        <line x1="80" y1="18" x2="80" y2="78" stroke="#d84315" stroke-width="2" stroke-dasharray="2 1"/>
        <line x1="50" y1="48" x2="110" y2="48" stroke="#d84315" stroke-width="2" stroke-dasharray="2 1"/>
        <!-- Pepperonis -->
        <circle cx="68" cy="38" r="5" fill="#d32f2f"/>
        <circle cx="67" cy="37" r="1.5" fill="#ffcdd2"/>
        <circle cx="92" cy="38" r="5" fill="#d32f2f"/>
        <circle cx="91" cy="37" r="1.5" fill="#ffcdd2"/>
        <circle cx="70" cy="58" r="5" fill="#d32f2f"/>
        <circle cx="69" cy="57" r="1.5" fill="#ffcdd2"/>
        <circle cx="92" cy="58" r="5" fill="#d32f2f"/>
        <circle cx="91" cy="57" r="1.5" fill="#ffcdd2"/>
        <!-- Basil leaves -->
        <ellipse cx="80" cy="48" rx="4" ry="2" fill="#43a047" transform="rotate(30 80 48)"/>
        <ellipse cx="82" cy="36" rx="3" ry="1.8" fill="#43a047" transform="rotate(-40 82 36)"/>
      </g>
    </g>
  </svg>`;
}

/** 📏 Meten is Weten: Builder hard hat, extending tape measure & animated clock */
export function metenIllustration() {
  const id = uid("meten");
  return `<svg id="${id}" class="kmg-hero-svg" viewBox="0 0 160 160" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Meten is Weten">
    <defs>
      <linearGradient id="${id}_hat" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#fff176"/>
        <stop offset="40%" stop-color="#fbc02d"/>
        <stop offset="100%" stop-color="#f57f17"/>
      </linearGradient>
      <linearGradient id="${id}_tape" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#ffe082"/>
        <stop offset="100%" stop-color="#ffd54f"/>
      </linearGradient>
    </defs>
    ${animWrap(id, `
      @keyframes ${id}_extend { 0% { width: 55px; } 50% { width: 95px; } 100% { width: 55px; } }
      #${id} .tape-rect { animation: ${id}_extend 3.5s ease-in-out infinite; }
      @keyframes ${id}_clockHand { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
      #${id} .clock-minute { animation: ${id}_clockHand 6s linear infinite; }
    `)}
    <!-- Background metric blueprint grid marks -->
    <line x1="20" y1="140" x2="140" y2="140" stroke="#cfd8dc" stroke-width="2"/>
    <line x1="20" y1="135" x2="20" y2="145" stroke="#90a4ae" stroke-width="2"/>
    <line x1="50" y1="137" x2="50" y2="143" stroke="#90a4ae" stroke-width="1.5"/>
    <line x1="80" y1="135" x2="80" y2="145" stroke="#90a4ae" stroke-width="2"/>
    <line x1="110" y1="137" x2="110" y2="143" stroke="#90a4ae" stroke-width="1.5"/>
    <line x1="140" y1="135" x2="140" y2="145" stroke="#90a4ae" stroke-width="2"/>
    <!-- Floating animated clock -->
    <g class="anim-float" style="transform-origin:130px 42px;">
      <circle cx="128" cy="40" r="22" fill="#ffffff" stroke="#0288d1" stroke-width="3"/>
      <circle cx="128" cy="40" r="19" fill="#e1f5fe"/>
      <!-- Clock markers -->
      <line x1="128" y1="24" x2="128" y2="28" stroke="#0277bd" stroke-width="2"/>
      <line x1="128" y1="52" x2="128" y2="56" stroke="#0277bd" stroke-width="2"/>
      <line x1="112" y1="40" x2="116" y2="40" stroke="#0277bd" stroke-width="2"/>
      <line x1="140" y1="40" x2="144" y2="40" stroke="#0277bd" stroke-width="2"/>
      <!-- Clock hands -->
      <line x1="128" y1="40" x2="135" y2="40" stroke="#d32f2f" stroke-width="2.5" stroke-linecap="round"/>
      <g style="transform-origin:128px 40px;" class="clock-minute">
        <line x1="128" y1="40" x2="128" y2="27" stroke="#0288d1" stroke-width="2" stroke-linecap="round"/>
      </g>
      <circle cx="128" cy="40" r="2.5" fill="#01579b"/>
    </g>
    <!-- Builder Hardhat with animated tools -->
    <g class="anim-bob" style="transform-origin:65px 75px;">
      <!-- Hard hat dome -->
      <path d="M 35,80 C 35,50 95,50 95,80 Z" fill="url(#${id}_hat)" stroke="#f57f17" stroke-width="2.5"/>
      <path d="M 60,50 L 70,50 L 70,80 L 60,80 Z" fill="#fff9c4" opacity="0.4"/>
      <!-- Hard hat brim -->
      <ellipse cx="65" cy="80" rx="42" ry="8" fill="#fbc02d" stroke="#f57f17" stroke-width="2"/>
      <!-- Safety Light / Badge on hat -->
      <circle cx="65" cy="62" r="7" fill="#ffffff" stroke="#f57f17" stroke-width="2"/>
      <circle cx="65" cy="62" r="4" fill="#00e676" class="anim-pulse" style="transform-origin:65px 62px;"/>
      <!-- Cheerful builder smiley beneath -->
      <circle cx="52" cy="94" r="2.5" fill="#3e2723"/>
      <circle cx="78" cy="94" r="2.5" fill="#3e2723"/>
      <path d="M 58,102 Q 65,108 72,102" fill="none" stroke="#3e2723" stroke-width="2.5" stroke-linecap="round"/>
    </g>
    <!-- Tape Measure Tool extending back and forth -->
    <g class="anim-float-rev" style="transform-origin:35px 115px;">
      <!-- The yellow tape extending out -->
      <rect x="42" y="112" width="80" height="14" rx="2" fill="url(#${id}_tape)" stroke="#f57f17" stroke-width="1.5" class="tape-rect"/>
      <!-- Tape tick marks -->
      <line x1="52" y1="112" x2="52" y2="120" stroke="#e65100" stroke-width="1"/>
      <line x1="62" y1="112" x2="62" y2="123" stroke="#e65100" stroke-width="1.5"/>
      <line x1="72" y1="112" x2="72" y2="120" stroke="#e65100" stroke-width="1"/>
      <line x1="82" y1="112" x2="82" y2="123" stroke="#e65100" stroke-width="1.5"/>
      <line x1="92" y1="112" x2="92" y2="120" stroke="#e65100" stroke-width="1"/>
      <line x1="102" y1="112" x2="102" y2="123" stroke="#e65100" stroke-width="1.5"/>
      <line x1="112" y1="112" x2="112" y2="120" stroke="#e65100" stroke-width="1"/>
      <!-- Tape body / casing -->
      <rect x="18" y="102" width="34" height="34" rx="8" fill="#e53935" stroke="#b71c1c" stroke-width="2.5"/>
      <circle cx="35" cy="119" r="8" fill="#424242"/>
      <circle cx="35" cy="119" r="4" fill="#eeeeee"/>
    </g>
  </svg>`;
}

/** 💯 Procenten Puzzel: Pirate adventure ship with treasure chest of % gold coins */
export function procentenIllustration() {
  const id = uid("proc");
  return `<svg id="${id}" class="kmg-hero-svg" viewBox="0 0 160 160" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Procenten Puzzel">
    <defs>
      <linearGradient id="${id}_sea" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#42a5f5"/>
        <stop offset="100%" stop-color="#1565c0"/>
      </linearGradient>
    </defs>
    ${animWrap(id, `
      @keyframes ${id}_wave { 0% { transform: translateX(0); } 100% { transform: translateX(-24px); } }
      #${id} .waves { animation: ${id}_wave 3s linear infinite; }
      @keyframes ${id}_shipRock { 0% { transform: rotate(-5deg) translateY(0); } 100% { transform: rotate(5deg) translateY(-4px); } }
      #${id} .pirate-ship { animation: ${id}_shipRock 2.8s ease-in-out infinite alternate; }
    `)}
    <!-- Golden % Coin floating up -->
    <g class="anim-float" style="transform-origin:130px 45px;">
      <circle cx="128" cy="42" r="16" fill="#ffd700" stroke="#ff8f00" stroke-width="2.5"/>
      <circle cx="128" cy="42" r="13" fill="#ffe082"/>
      <text x="128" y="48" font-size="14" font-weight="900" fill="#e65100" text-anchor="middle" font-family="sans-serif">%</text>
    </g>
    <!-- Pirate Ship on rolling sea -->
    <g class="pirate-ship" style="transform-origin:75px 105px;">
      <!-- Ship hull -->
      <path d="M 35,92 L 115,92 Q 105,116 75,116 Q 45,116 35,92 Z" fill="#5d4037" stroke="#3e2723" stroke-width="2.5"/>
      <!-- Wooden hull stripes -->
      <path d="M 40,100 Q 75,108 110,100" fill="none" stroke="#8d6e63" stroke-width="2"/>
      <!-- Mast -->
      <line x1="75" y1="92" x2="75" y2="28" stroke="#3e2723" stroke-width="4" stroke-linecap="round"/>
      <!-- Sails with % emblem -->
      <path d="M 75,34 Q 105,44 75,60 Q 95,47 75,34 Z" fill="#ffffff" stroke="#cfd8dc" stroke-width="1.5"/>
      <path d="M 75,62 Q 112,74 75,90 Q 100,76 75,62 Z" fill="#ffffff" stroke="#cfd8dc" stroke-width="1.5"/>
      <!-- Pirate Skull / % Jolly Roger Flag -->
      <path d="M 75,26 L 50,34 L 75,42 Z" fill="#212121"/>
      <text x="64" y="37" font-size="9" font-weight="900" fill="#ffeb3b" text-anchor="middle" font-family="sans-serif">%</text>
      <!-- Crow's nest -->
      <rect x="71" y="44" width="8" height="6" fill="#4e342e"/>
    </g>
    <!-- Rolling Ocean Waves -->
    <g class="waves">
      <path d="M -20,118 Q 0,110 20,118 Q 40,126 60,118 Q 80,110 100,118 Q 120,126 140,118 Q 160,110 180,118 L 180,160 L -20,160 Z" fill="url(#${id}_sea)" opacity="0.8"/>
      <path d="M -10,126 Q 10,120 30,126 Q 50,132 70,126 Q 90,120 110,126 Q 130,132 150,126 Q 170,120 190,126 L 190,160 L -10,160 Z" fill="#0d47a1"/>
    </g>
    <!-- Treasure Chest on left -->
    <g class="anim-bounce" style="transform-origin:25px 125px;">
      <rect x="12" y="118" width="26" height="18" rx="3" fill="#ff8f00" stroke="#e65100" stroke-width="2"/>
      <path d="M 12,118 Q 25,110 38,118 Z" fill="#ffa000" stroke="#e65100" stroke-width="2"/>
      <circle cx="25" cy="125" r="2.5" fill="#ffd54f"/>
    </g>
  </svg>`;
}

/** 🕵️ Het X-Mysterie: Detective with magnifying glass, golden footsteps & mystery folder */
export function algebraIllustration() {
  const id = uid("alg");
  return `<svg id="${id}" class="kmg-hero-svg" viewBox="0 0 160 160" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Het X-Mysterie">
    <defs>
      <linearGradient id="${id}_glass" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#e0f7fa" stop-opacity="0.8"/>
        <stop offset="100%" stop-color="#80deea" stop-opacity="0.3"/>
      </linearGradient>
    </defs>
    ${animWrap(id, `
      @keyframes ${id}_scan { 0% { transform: translate(0, 0) rotate(-15deg); } 50% { transform: translate(12px, -8px) rotate(5deg); } 100% { transform: translate(0, 0) rotate(-15deg); } }
      #${id} .magnifier { animation: ${id}_scan 4s ease-in-out infinite; }
    `)}
    <!-- Detective Secret Dossier / Folder -->
    <g class="anim-float-rev" style="transform-origin:75px 85px;">
      <path d="M 30,55 L 75,55 L 85,65 L 125,65 L 125,125 L 30,125 Z" fill="#ffb74d" stroke="#e65100" stroke-width="2.5"/>
      <rect x="38" y="70" width="80" height="46" rx="4" fill="#fff8e1"/>
      <line x1="45" y1="80" x2="105" y2="80" stroke="#b0bec5" stroke-width="2" stroke-linecap="round"/>
      <line x1="45" y1="92" x2="85" y2="92" stroke="#b0bec5" stroke-width="2" stroke-linecap="round"/>
      <line x1="45" y1="104" x2="95" y2="104" stroke="#b0bec5" stroke-width="2" stroke-linecap="round"/>
      <!-- Big red TOP SECRET stamp / X -->
      <circle cx="98" cy="94" r="14" fill="#ffebee" stroke="#d32f2f" stroke-width="2"/>
      <text x="98" y="100" font-size="18" font-weight="900" fill="#d32f2f" text-anchor="middle" font-family="sans-serif">x</text>
    </g>
    <!-- Mysterious glowing footsteps -->
    <ellipse cx="38" cy="140" rx="5" ry="3" fill="#ffb300" opacity="0.6" transform="rotate(-20 38 140)"/>
    <ellipse cx="60" cy="135" rx="5" ry="3" fill="#ffb300" opacity="0.7" transform="rotate(15 60 135)"/>
    <ellipse cx="85" cy="142" rx="5" ry="3" fill="#ffb300" opacity="0.8" transform="rotate(-10 85 142)"/>
    <!-- Question mark floating clue -->
    <g class="anim-sparkle" style="transform-origin:135px 40px;">
      <circle cx="132" cy="40" r="14" fill="#7e57c2" stroke="#fff" stroke-width="2"/>
      <text x="132" y="46" font-size="16" font-weight="900" fill="#fff" text-anchor="middle" font-family="sans-serif">?</text>
    </g>
    <!-- Floating Magnifying Glass scanning over 'x' -->
    <g class="magnifier" style="transform-origin:75px 65px;">
      <!-- Handle -->
      <line x1="85" y1="78" x2="118" y2="115" stroke="#4e342e" stroke-width="9" stroke-linecap="round"/>
      <line x1="85" y1="78" x2="118" y2="115" stroke="#ffb300" stroke-width="3" stroke-linecap="round"/>
      <!-- Glass Rim -->
      <circle cx="68" cy="60" r="28" fill="url(#${id}_glass)" stroke="#ffb300" stroke-width="5"/>
      <circle cx="68" cy="60" r="26" fill="none" stroke="#fff" stroke-width="2" opacity="0.8"/>
      <!-- Glare highlight -->
      <path d="M 52,48 A 20,20 0 0 1 78,42" fill="none" stroke="#ffffff" stroke-width="3" stroke-linecap="round"/>
      <!-- The mysterious 'x' inside glass magnified -->
      <text x="68" y="68" font-size="26" font-weight="900" fill="#311b92" text-anchor="middle" font-family="sans-serif">x</text>
    </g>
  </svg>`;
}

/** 📐 Meetkunde Meesters: 3D isometric cube, drafting compass & triangle */
export function meetkundeIllustration() {
  const id = uid("geom");
  return `<svg id="${id}" class="kmg-hero-svg" viewBox="0 0 160 160" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Meetkunde Meesters">
    ${animWrap(id, `
      @keyframes ${id}_compass { 0% { transform: rotate(-10deg); } 100% { transform: rotate(15deg); } }
      #${id} .compass { animation: ${id}_compass 3s ease-in-out infinite alternate; }
    `)}
    <!-- Golden Geometric Triangle with right angle -->
    <polygon points="25,130 90,130 25,65" fill="#e8f5e9" stroke="#43a047" stroke-width="2.5"/>
    <rect x="25" y="118" width="12" height="12" fill="none" stroke="#2e7d32" stroke-width="2"/>
    <circle cx="31" cy="124" r="2" fill="#2e7d32"/>
    <!-- Isometric 3D Cube assembling -->
    <g class="anim-float" style="transform-origin:110px 95px;">
      <!-- Top face -->
      <polygon points="110,65 135,78 110,91 85,78" fill="#42a5f5" stroke="#1565c0" stroke-width="2"/>
      <!-- Left face -->
      <polygon points="85,78 110,91 110,122 85,109" fill="#1e88e5" stroke="#1565c0" stroke-width="2"/>
      <!-- Right face -->
      <polygon points="110,91 135,78 135,109 110,122" fill="#1565c0" stroke="#0d47a1" stroke-width="2"/>
      <!-- Floating area formula badge -->
      <circle cx="132" cy="55" r="13" fill="#ff7043" stroke="#fff" stroke-width="2"/>
      <text x="132" y="60" font-size="11" font-weight="900" fill="#fff" text-anchor="middle" font-family="sans-serif">m²</text>
    </g>
    <!-- Drafting Compass Tool swinging -->
    <g class="compass" style="transform-origin:60px 25px;">
      <circle cx="60" cy="25" r="5" fill="#f57f17"/>
      <!-- Left leg (needle) -->
      <line x1="60" y1="25" x2="42" y2="85" stroke="#78909c" stroke-width="4" stroke-linecap="round"/>
      <line x1="42" y1="85" x2="38" y2="95" stroke="#37474f" stroke-width="2" stroke-linecap="round"/>
      <!-- Right leg (pencil) -->
      <line x1="60" y1="25" x2="78" y2="85" stroke="#78909c" stroke-width="4" stroke-linecap="round"/>
      <polygon points="75,85 81,85 79,96" fill="#e53935"/>
      <polygon points="77,93 81,93 79,96" fill="#212121"/>
      <!-- Compass hinge arc -->
      <path d="M 49,55 Q 60,62 71,55" fill="none" stroke="#f57f17" stroke-width="2.5"/>
    </g>
  </svg>`;
}

/** 🚗 Verhoudingen & Snelheid: Sports race car with speed lines & checkered flag */
export function verhoudingenIllustration() {
  const id = uid("verh");
  return `<svg id="${id}" class="kmg-hero-svg" viewBox="0 0 160 160" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Verhoudingen en Snelheid">
    ${animWrap(id, `
      @keyframes ${id}_speedLine { 0% { transform: translateX(20px); opacity: 0; } 50% { opacity: 1; } 100% { transform: translateX(-30px); opacity: 0; } }
      #${id} .spd1 { animation: ${id}_speedLine 1.2s linear infinite; }
      #${id} .spd2 { animation: ${id}_speedLine 1.5s linear 0.4s infinite; }
      #${id} .spd3 { animation: ${id}_speedLine 1.1s linear 0.7s infinite; }
      @keyframes ${id}_wheelSpin { 100% { transform: rotate(360deg); } }
      #${id} .wheel { animation: ${id}_wheelSpin 1s linear infinite; }
    `)}
    <!-- Speed motion trails in background -->
    <line x1="145" y1="65" x2="110" y2="65" stroke="#ff7043" stroke-width="3" stroke-linecap="round" class="spd1"/>
    <line x1="155" y1="85" x2="125" y2="85" stroke="#42a5f5" stroke-width="2.5" stroke-linecap="round" class="spd2"/>
    <line x1="140" y1="105" x2="115" y2="105" stroke="#ffd54f" stroke-width="3" stroke-linecap="round" class="spd3"/>
    <!-- Checkered Victory Flag waving on top -->
    <g class="anim-wiggle" style="transform-origin:130px 30px;">
      <line x1="130" y1="20" x2="130" y2="65" stroke="#5d4037" stroke-width="3" stroke-linecap="round"/>
      <rect x="130" y="22" width="8" height="6" fill="#212121"/>
      <rect x="138" y="22" width="8" height="6" fill="#ffffff"/>
      <rect x="130" y="28" width="8" height="6" fill="#ffffff"/>
      <rect x="138" y="28" width="8" height="6" fill="#212121"/>
      <rect x="130" y="34" width="8" height="6" fill="#212121"/>
      <rect x="138" y="34" width="8" height="6" fill="#ffffff"/>
    </g>
    <!-- Speed / km/h badge -->
    <g class="anim-float" style="transform-origin:30px 42px;">
      <rect x="14" y="30" width="46" height="22" rx="6" fill="#2e7d32" stroke="#fff" stroke-width="1.5"/>
      <text x="37" y="45" font-size="10" font-weight="900" fill="#fff" text-anchor="middle" font-family="sans-serif">km/u ⚡</text>
    </g>
    <!-- Sleek Red Race Car -->
    <g class="anim-bob" style="transform-origin:75px 105px;">
      <!-- Car Body -->
      <path d="M 20,105 Q 30,85 55,80 L 95,80 Q 125,85 138,105 Z" fill="#e53935" stroke="#b71c1c" stroke-width="2"/>
      <!-- Cockpit & windshield -->
      <path d="M 52,80 L 68,62 L 95,62 L 102,80 Z" fill="#80deea" stroke="#00838f" stroke-width="2"/>
      <!-- Driver helmet with eyes -->
      <circle cx="80" cy="72" r="8" fill="#ffd54f"/>
      <rect x="74" y="69" width="12" height="4" rx="2" fill="#212121"/>
      <!-- Racing spoiler -->
      <polygon points="18,85 30,85 26,98 16,98" fill="#b71c1c"/>
      <!-- Front bumper -->
      <rect x="134" y="100" width="6" height="8" rx="2" fill="#ffd54f"/>
      <!-- Wheels (rotating) -->
      <!-- Left wheel -->
      <g style="transform-origin:45px 112px;" class="wheel">
        <circle cx="45" cy="112" r="14" fill="#37474f" stroke="#212121" stroke-width="2"/>
        <circle cx="45" cy="112" r="6" fill="#cfd8dc"/>
        <line x1="45" y1="102" x2="45" y2="122" stroke="#90a4ae" stroke-width="1.5"/>
        <line x1="35" y1="112" x2="55" y2="112" stroke="#90a4ae" stroke-width="1.5"/>
      </g>
      <!-- Right wheel -->
      <g style="transform-origin:110px 112px;" class="wheel">
        <circle cx="110" cy="112" r="14" fill="#37474f" stroke="#212121" stroke-width="2"/>
        <circle cx="110" cy="112" r="6" fill="#cfd8dc"/>
        <line x1="110" y1="102" x2="110" y2="122" stroke="#90a4ae" stroke-width="1.5"/>
        <line x1="100" y1="112" x2="120" y2="112" stroke="#90a4ae" stroke-width="1.5"/>
      </g>
    </g>
  </svg>`;
}

/** 🔢 Getallen Universum: Planetary rings, orbiting moon, negative & positive numbers */
export function getallenIllustration() {
  const id = uid("univ");
  return `<svg id="${id}" class="kmg-hero-svg" viewBox="0 0 160 160" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Getallen Universum">
    <defs>
      <radialGradient id="${id}_planet" cx="35%" cy="35%" r="65%">
        <stop offset="0%" stop-color="#80d8ff"/>
        <stop offset="60%" stop-color="#0288d1"/>
        <stop offset="100%" stop-color="#01579b"/>
      </radialGradient>
    </defs>
    ${animWrap(id, `
      @keyframes ${id}_orbit { 0% { transform: rotate(0deg) translateX(55px) rotate(0deg); } 100% { transform: rotate(360deg) translateX(55px) rotate(-360deg); } }
      #${id} .moon { animation: ${id}_orbit 8s linear infinite; }
    `)}
    <!-- Background cosmos stars -->
    <circle cx="25" cy="30" r="2.5" fill="#ffe57f" class="anim-sparkle" style="transform-origin:25px 30px;"/>
    <circle cx="140" cy="40" r="3" fill="#b388ff" class="anim-sparkle" style="transform-origin:140px 40px; animation-delay:0.8s;"/>
    <circle cx="20" cy="130" r="2" fill="#80d8ff" class="anim-sparkle" style="transform-origin:20px 130px; animation-delay:1.4s;"/>
    <!-- Floating negative integer crystal -5 -->
    <g class="anim-float" style="transform-origin:28px 75px;">
      <polygon points="28,60 40,75 28,90 16,75" fill="#ef5350" stroke="#fff" stroke-width="2"/>
      <text x="28" y="79" font-size="12" font-weight="900" fill="#fff" text-anchor="middle" font-family="sans-serif">-5</text>
    </g>
    <!-- Floating positive integer crystal +10 -->
    <g class="anim-float-rev" style="transform-origin:132px 85px;">
      <polygon points="132,70 144,85 132,100 120,85" fill="#66bb6a" stroke="#fff" stroke-width="2"/>
      <text x="132" y="89" font-size="11" font-weight="900" fill="#fff" text-anchor="middle" font-family="sans-serif">+10</text>
    </g>
    <!-- Main Planet with Saturn rings -->
    <g class="anim-bob" style="transform-origin:80px 80px;">
      <!-- Back of ring -->
      <ellipse cx="80" cy="80" rx="64" ry="18" fill="none" stroke="#ffd54f" stroke-width="7" opacity="0.6" stroke-dasharray="160 160" transform="rotate(-20 80 80)"/>
      <!-- Planet Sphere -->
      <circle cx="80" cy="80" r="34" fill="url(#${id}_planet)"/>
      <!-- Planet atmosphere cloud bands -->
      <path d="M 52,72 Q 80,82 108,72" fill="none" stroke="#b3e5fc" stroke-width="3" opacity="0.5"/>
      <path d="M 55,88 Q 80,98 105,88" fill="none" stroke="#b3e5fc" stroke-width="2.5" opacity="0.4"/>
      <!-- Cute planet face -->
      <circle cx="72" cy="78" r="3" fill="#ffffff"/>
      <circle cx="88" cy="78" r="3" fill="#ffffff"/>
      <circle cx="73" cy="78" r="1.5" fill="#01579b"/>
      <circle cx="89" cy="78" r="1.5" fill="#01579b"/>
      <path d="M 76,86 Q 80,90 84,86" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round"/>
      <!-- Front of ring -->
      <ellipse cx="80" cy="80" rx="64" ry="18" fill="none" stroke="#ffe082" stroke-width="7" stroke-dasharray="0 160 160 0" transform="rotate(-20 80 80)"/>
      <!-- Orbiting little moon -->
      <g style="transform-origin:80px 80px;" class="moon">
        <circle cx="80" cy="80" r="8" fill="#ffd54f" stroke="#ffb300" stroke-width="2"/>
      </g>
    </g>
  </svg>`;
}

/** ⚡ Bliksemronde: Energetic storm cloud with lightning bolts & gold stopwatch */
export function bliksemIllustration() {
  const id = uid("blik");
  return `<svg id="${id}" class="kmg-hero-svg" viewBox="0 0 160 160" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Bliksemronde">
    <defs>
      <linearGradient id="${id}_bolt" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#fff59d"/>
        <stop offset="50%" stop-color="#ffd600"/>
        <stop offset="100%" stop-color="#ff6d00"/>
      </linearGradient>
    </defs>
    ${animWrap(id, `
      @keyframes ${id}_flash { 0%, 100% { opacity: 0.9; transform: scale(1); } 50% { opacity: 1; transform: scale(1.1); filter: drop-shadow(0 0 8px #ffd600); } }
      #${id} .bolt { animation: ${id}_flash 1s ease-in-out infinite; }
      @keyframes ${id}_sweep { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
      #${id} .timer-hand { animation: ${id}_sweep 3s linear infinite; }
    `)}
    <!-- Sparkles -->
    <circle cx="22" cy="45" r="3" fill="#ffd600" class="anim-sparkle" style="transform-origin:22px 45px;"/>
    <circle cx="138" cy="45" r="3.5" fill="#00e5ff" class="anim-sparkle" style="transform-origin:138px 45px; animation-delay:0.5s;"/>
    <!-- Golden Stopwatch on right -->
    <g class="anim-float-rev" style="transform-origin:125px 95px;">
      <!-- Watch top button -->
      <rect x="122" y="70" width="6" height="5" fill="#f57f17"/>
      <!-- Watch ring -->
      <circle cx="125" cy="95" r="22" fill="#ffd54f" stroke="#f57f17" stroke-width="2.5"/>
      <circle cx="125" cy="95" r="17" fill="#ffffff"/>
      <!-- Ticking Hand -->
      <g style="transform-origin:125px 95px;" class="timer-hand">
        <line x1="125" y1="95" x2="125" y2="82" stroke="#d50000" stroke-width="2" stroke-linecap="round"/>
      </g>
      <circle cx="125" cy="95" r="2.5" fill="#f57f17"/>
      <text x="125" y="107" font-size="8" font-weight="900" fill="#f57f17" text-anchor="middle" font-family="sans-serif">60s</text>
    </g>
    <!-- Friendly Electric Storm Cloud -->
    <g class="anim-bob" style="transform-origin:70px 65px;">
      <!-- Cloud puffs -->
      <path d="M 35,75 C 20,75 20,55 35,50 C 35,32 55,30 65,40 C 75,25 100,28 105,45 C 120,45 125,65 110,75 Z" fill="#90caf9" stroke="#1976d2" stroke-width="2.5"/>
      <!-- Cloud Face -->
      <circle cx="58" cy="56" r="3" fill="#0d47a1"/>
      <circle cx="82" cy="56" r="3" fill="#0d47a1"/>
      <circle cx="59" cy="55" r="1" fill="#ffffff"/>
      <circle cx="83" cy="55" r="1" fill="#ffffff"/>
      <path d="M 66,64 Q 70,68 74,64" fill="none" stroke="#0d47a1" stroke-width="2.5" stroke-linecap="round"/>
      <!-- Cheeks -->
      <circle cx="50" cy="62" r="4" fill="#42a5f5" opacity="0.6"/>
      <circle cx="90" cy="62" r="4" fill="#42a5f5" opacity="0.6"/>
    </g>
    <!-- Giant Glowing Lightning Bolt -->
    <polygon points="72,65 52,105 70,105 56,145 98,92 78,92 90,65" fill="url(#${id}_bolt)" stroke="#f57f17" stroke-width="2" class="bolt" style="transform-origin:72px 105px;"/>
  </svg>`;
}

/** 🧠 Logica Lab: Beaker bubbling with colorful potion, DNA helix & rotating gears */
export function logicaIllustration() {
  const id = uid("log");
  return `<svg id="${id}" class="kmg-hero-svg" viewBox="0 0 160 160" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Logica Lab">
    <defs>
      <linearGradient id="${id}_potion" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#e040fb"/>
        <stop offset="100%" stop-color="#7c4dff"/>
      </linearGradient>
    </defs>
    ${animWrap(id, `
      @keyframes ${id}_bubble { 0% { transform: translateY(0px); opacity: 0; } 50% { opacity: 0.9; } 100% { transform: translateY(-28px); opacity: 0; } }
      #${id} .b1 { animation: ${id}_bubble 2.2s ease-out infinite; }
      #${id} .b2 { animation: ${id}_bubble 1.8s ease-out 0.6s infinite; }
      #${id} .b3 { animation: ${id}_bubble 2.5s ease-out 1.2s infinite; }
    `)}
    <!-- Rotating mechanical gear in background -->
    <g class="anim-spin-slow" style="transform-origin:125px 45px;">
      <circle cx="125" cy="45" r="18" fill="#ffd54f" stroke="#ff8f00" stroke-width="2.5"/>
      <circle cx="125" cy="45" r="8" fill="#ffffff" stroke="#ff8f00" stroke-width="2"/>
      <rect x="122" y="23" width="6" height="6" fill="#ff8f00"/>
      <rect x="122" y="61" width="6" height="6" fill="#ff8f00"/>
      <rect x="103" y="42" width="6" height="6" fill="#ff8f00"/>
      <rect x="141" y="42" width="6" height="6" fill="#ff8f00"/>
    </g>
    <!-- Glowing lightbulb thought badge -->
    <g class="anim-sparkle" style="transform-origin:32px 42px;">
      <circle cx="32" cy="42" r="16" fill="#ffeb3b" stroke="#fbc02d" stroke-width="2"/>
      <text x="32" y="48" font-size="16" text-anchor="middle">💡</text>
    </g>
    <!-- Science Flask -->
    <g class="anim-bob" style="transform-origin:80px 105px;">
      <!-- Flask neck -->
      <rect x="70" y="45" width="20" height="30" fill="#e0f7fa" stroke="#00acc1" stroke-width="2" opacity="0.85"/>
      <ellipse cx="80" cy="45" rx="13" ry="4" fill="#b2ebf2" stroke="#00acc1" stroke-width="2"/>
      <!-- Flask body triangle -->
      <polygon points="70,75 35,135 125,135 90,75" fill="#e0f7fa" stroke="#00acc1" stroke-width="2.5" opacity="0.85"/>
      <!-- Glowing potion inside -->
      <polygon points="62,90 40,132 120,132 98,90" fill="url(#${id}_potion)"/>
      <ellipse cx="80" cy="90" rx="18" ry="5" fill="#ea80fc"/>
      <!-- Rising bubbles -->
      <circle cx="72" cy="115" r="4" fill="#ffffff" class="b1"/>
      <circle cx="86" cy="110" r="3.5" fill="#ffffff" class="b2"/>
      <circle cx="78" cy="98" r="5" fill="#ffffff" class="b3"/>
      <!-- Friendly face on flask -->
      <circle cx="72" cy="120" r="2.5" fill="#ffffff"/>
      <circle cx="88" cy="120" r="2.5" fill="#ffffff"/>
      <path d="M 76,126 Q 80,130 84,126" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round"/>
    </g>
  </svg>`;
}

/** 🔐 Code Kraker: Secret spy vault with spinning dial, lasers & LED status */
export function codeIllustration() {
  const id = uid("code");
  return `<svg id="${id}" class="kmg-hero-svg" viewBox="0 0 160 160" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Code Kraker">
    <defs>
      <linearGradient id="${id}_safe" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#78909c"/>
        <stop offset="100%" stop-color="#37474f"/>
      </linearGradient>
    </defs>
    ${animWrap(id, `
      @keyframes ${id}_laser { 0% { transform: translateY(0px); opacity: 0.3; } 50% { opacity: 0.8; } 100% { transform: translateY(55px); opacity: 0.3; } }
      #${id} .laser { animation: ${id}_laser 2.5s ease-in-out infinite; }
      @keyframes ${id}_dial { 0% { transform: rotate(0deg); } 40% { transform: rotate(120deg); } 70% { transform: rotate(-60deg); } 100% { transform: rotate(360deg); } }
      #${id} .dial { animation: ${id}_dial 5s cubic-bezier(0.4, 0, 0.2, 1) infinite; }
    `)}
    <!-- High-tech Heavy Safe Door -->
    <g class="anim-bob" style="transform-origin:80px 80px;">
      <!-- Vault Outer Body -->
      <rect x="25" y="25" width="110" height="110" rx="18" fill="url(#${id}_safe)" stroke="#263238" stroke-width="4"/>
      <!-- Safe inner door frame -->
      <rect x="35" y="35" width="90" height="90" rx="12" fill="#455a64" stroke="#263238" stroke-width="2"/>
      <!-- Status LEDs on top -->
      <circle cx="50" cy="46" r="3.5" fill="#00e676" class="anim-pulse" style="transform-origin:50px 46px;"/>
      <circle cx="62" cy="46" r="3.5" fill="#ffd600" class="anim-pulse" style="transform-origin:62px 46px; animation-delay:0.3s;"/>
      <circle cx="74" cy="46" r="3.5" fill="#00e5ff" class="anim-pulse" style="transform-origin:74px 46px; animation-delay:0.6s;"/>
      <!-- Digital code screen -->
      <rect x="88" y="41" width="30" height="12" rx="3" fill="#1b5e20"/>
      <text x="103" y="50" font-size="8" font-weight="900" fill="#69f0ae" text-anchor="middle" font-family="monospace">***</text>
      <!-- Scanning laser beam -->
      <line x1="38" y1="60" x2="122" y2="60" stroke="#00e676" stroke-width="2" class="laser"/>
      <!-- Central Vault Combination Dial -->
      <circle cx="80" cy="85" r="28" fill="#cfd8dc" stroke="#263238" stroke-width="3"/>
      <circle cx="80" cy="85" r="22" fill="#eceff1"/>
      <g style="transform-origin:80px 85px;" class="dial">
        <!-- Dial notches -->
        <circle cx="80" cy="85" r="16" fill="#37474f"/>
        <line x1="80" y1="65" x2="80" y2="69" stroke="#d50000" stroke-width="2.5"/>
        <line x1="80" y1="101" x2="80" y2="105" stroke="#ffffff" stroke-width="2"/>
        <line x1="60" y1="85" x2="64" y2="85" stroke="#ffffff" stroke-width="2"/>
        <line x1="96" y1="85" x2="100" y2="85" stroke="#ffffff" stroke-width="2"/>
        <!-- Dial center handle -->
        <circle cx="80" cy="85" r="6" fill="#ffab00"/>
        <line x1="80" y1="85" x2="80" y2="73" stroke="#ffab00" stroke-width="3" stroke-linecap="round"/>
      </g>
    </g>
  </svg>`;
}

/** 🎯 Getallenjacht: Arcade radar bullseye with pulse rings & target arrow */
export function jachtIllustration() {
  const id = uid("jacht");
  return `<svg id="${id}" class="kmg-hero-svg" viewBox="0 0 160 160" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Getallenjacht">
    ${animWrap(id, `
      @keyframes ${id}_crosshair { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
      #${id} .crosshair { animation: ${id}_crosshair 7s linear infinite; }
      @keyframes ${id}_targetPulse { 0% { transform: scale(0.96); } 100% { transform: scale(1.04); } }
      #${id} .pulse-ring { animation: ${id}_targetPulse 1.8s ease-in-out infinite alternate; }
    `)}
    <!-- Sparkles -->
    <circle cx="25" cy="35" r="3" fill="#ffd600" class="anim-sparkle" style="transform-origin:25px 35px;"/>
    <circle cx="135" cy="35" r="3" fill="#ff4081" class="anim-sparkle" style="transform-origin:135px 35px; animation-delay:0.8s;"/>
    <!-- Concentric Target Bullseye -->
    <g class="pulse-ring" style="transform-origin:80px 80px;">
      <!-- Outer red ring -->
      <circle cx="80" cy="80" r="54" fill="#ef5350" stroke="#b71c1c" stroke-width="3"/>
      <!-- White ring -->
      <circle cx="80" cy="80" r="42" fill="#ffffff" stroke="#ef5350" stroke-width="2"/>
      <!-- Blue ring -->
      <circle cx="80" cy="80" r="30" fill="#42a5f5" stroke="#1565c0" stroke-width="2"/>
      <!-- Gold bullseye center -->
      <circle cx="80" cy="80" r="16" fill="#ffd54f" stroke="#ff8f00" stroke-width="2.5"/>
      <circle cx="80" cy="80" r="7" fill="#ff6f00"/>
    </g>
    <!-- Radar crosshair overlay rotating -->
    <g style="transform-origin:80px 80px;" class="crosshair">
      <line x1="80" y1="20" x2="80" y2="140" stroke="#00e5ff" stroke-width="1.5" stroke-dasharray="4 4" opacity="0.75"/>
      <line x1="20" y1="80" x2="140" y2="80" stroke="#00e5ff" stroke-width="1.5" stroke-dasharray="4 4" opacity="0.75"/>
      <circle cx="80" cy="80" r="58" fill="none" stroke="#00e5ff" stroke-width="1.5" opacity="0.5"/>
    </g>
    <!-- Arrow striking the bullseye center -->
    <g class="anim-wiggle" style="transform-origin:80px 80px;">
      <line x1="125" y1="35" x2="84" y2="76" stroke="#4e342e" stroke-width="4" stroke-linecap="round"/>
      <!-- Arrow fletching feathers -->
      <polygon points="125,35 138,30 133,40" fill="#ff1744"/>
      <polygon points="125,35 120,22 130,27" fill="#2979ff"/>
    </g>
  </svg>`;
}

/** 🏁 Racewedstrijd: two rockets racing toward a waving checkered flag */
export function competeIllustration() {
  const id = uid("race");
  return `<svg id="${id}" class="kmg-hero-svg" viewBox="0 0 160 160" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Racewedstrijd">
    ${animWrap(id, `
      @keyframes ${id}_dash1 { 0% { transform: translateX(0px); } 100% { transform: translateX(6px); } }
      @keyframes ${id}_dash2 { 0% { transform: translateX(0px); } 100% { transform: translateX(-6px); } }
      #${id} .racer-a { animation: ${id}_dash1 0.7s ease-in-out infinite alternate; }
      #${id} .racer-b { animation: ${id}_dash2 0.7s ease-in-out infinite alternate; animation-delay: 0.15s; }
      @keyframes ${id}_flagwave { 0% { transform: skewY(-4deg); } 100% { transform: skewY(6deg); } }
      #${id} .flag { animation: ${id}_flagwave 1.4s ease-in-out infinite alternate; transform-origin: 128px 30px; }
    `)}
    <!-- Sparkles -->
    <circle cx="20" cy="30" r="3" fill="#ffd600" class="anim-sparkle" style="transform-origin:20px 30px;"/>
    <circle cx="30" cy="130" r="2.5" fill="#00e5ff" class="anim-sparkle" style="transform-origin:30px 130px; animation-delay:0.6s;"/>
    <!-- Finish line -->
    <g>
      <rect x="10" y="118" width="140" height="10" fill="#ffffff" stroke="#3e2723" stroke-width="2"/>
      ${[0, 1, 2, 3, 4, 5, 6].map((i) => `<rect x="${10 + i * 20}" y="118" width="10" height="10" fill="${i % 2 === 0 ? "#3e2723" : "#ffffff"}"/>`).join("")}
    </g>
    <!-- Flag pole and waving checkered pennant -->
    <line x1="128" y1="18" x2="128" y2="118" stroke="#8d6e63" stroke-width="4" stroke-linecap="round"/>
    <g class="flag">
      <path d="M 128,18 L 156,26 L 128,38 Z" fill="#ffffff" stroke="#3e2723" stroke-width="1.5"/>
      <path d="M 128,20 L 134,23 L 128,26 Z M 138,25 L 144,28 L 138,31 Z M 128,30 L 134,33 L 128,36 Z" fill="#3e2723"/>
    </g>
    <!-- Stopwatch, ticking -->
    <g class="anim-bob" style="transform-origin:34px 78px;">
      <rect x="31" y="56" width="6" height="5" fill="#f57f17"/>
      <circle cx="34" cy="80" r="17" fill="#ffd54f" stroke="#f57f17" stroke-width="2.5"/>
      <circle cx="34" cy="80" r="13" fill="#ffffff"/>
      <line x1="34" y1="80" x2="34" y2="70" stroke="#d50000" stroke-width="2" stroke-linecap="round" class="anim-spin-slow" style="transform-origin:34px 80px;"/>
      <circle cx="34" cy="80" r="2" fill="#f57f17"/>
    </g>
    <!-- Two racers speeding toward the flag, each leaving a motion trail -->
    <g class="racer-a" style="transform-origin:80px 70px;">
      <line x1="42" y1="70" x2="64" y2="70" stroke="#ef5350" stroke-width="3" stroke-linecap="round" opacity="0.55"/>
      <line x1="48" y1="76" x2="66" y2="76" stroke="#ef5350" stroke-width="2.5" stroke-linecap="round" opacity="0.4"/>
      <path d="M 68,60 L 96,68 L 68,80 L 76,68 Z" fill="#ef5350" stroke="#b71c1c" stroke-width="2" stroke-linejoin="round"/>
      <circle cx="80" cy="68" r="5" fill="#ffffff"/>
      <text x="80" y="71" font-size="6" font-weight="900" fill="#b71c1c" text-anchor="middle" font-family="sans-serif">1</text>
    </g>
    <g class="racer-b" style="transform-origin:78px 98px;">
      <line x1="40" y1="98" x2="60" y2="98" stroke="#42a5f5" stroke-width="3" stroke-linecap="round" opacity="0.55"/>
      <line x1="46" y1="104" x2="62" y2="104" stroke="#42a5f5" stroke-width="2.5" stroke-linecap="round" opacity="0.4"/>
      <path d="M 64,88 L 92,96 L 64,108 L 72,96 Z" fill="#42a5f5" stroke="#1565c0" stroke-width="2" stroke-linejoin="round"/>
      <circle cx="76" cy="96" r="5" fill="#ffffff"/>
      <text x="76" y="99" font-size="6" font-weight="900" fill="#1565c0" text-anchor="middle" font-family="sans-serif">2</text>
    </g>
  </svg>`;
}

/** 📖 Uitleg Concepten: Enchanted math grimoire / encyclopedia with floating runes */
export function uitlegIllustration() {
  const id = uid("uitl");
  return `<svg id="${id}" class="kmg-hero-svg" viewBox="0 0 160 160" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Uitleg Concepten">
    ${animWrap(id, `
      @keyframes ${id}_glow { 0% { opacity: 0.4; } 100% { opacity: 0.9; } }
      #${id} .glow { animation: ${id}_glow 2s ease-in-out infinite alternate; }
    `)}
    <!-- Sparkles -->
    <circle cx="30" cy="30" r="3" fill="#ffe082" class="anim-sparkle" style="transform-origin:30px 30px;"/>
    <circle cx="130" cy="30" r="3" fill="#80d8ff" class="anim-sparkle" style="transform-origin:130px 30px; animation-delay:0.5s;"/>
    <!-- Floating mathematical symbols rising from book -->
    <g class="anim-float" style="transform-origin:45px 45px;">
      <circle cx="45" cy="45" r="13" fill="#ab47bc" stroke="#fff" stroke-width="2"/>
      <text x="45" y="50" font-size="14" font-weight="900" fill="#fff" text-anchor="middle" font-family="sans-serif">π</text>
    </g>
    <g class="anim-float-rev" style="transform-origin:115px 45px; animation-delay:0.8s;">
      <circle cx="115" cy="45" r="13" fill="#26a69a" stroke="#fff" stroke-width="2"/>
      <text x="115" y="50" font-size="14" font-weight="900" fill="#fff" text-anchor="middle" font-family="sans-serif">∑</text>
    </g>
    <!-- Open Magic Book -->
    <g class="anim-bob" style="transform-origin:80px 100px;">
      <!-- Book spine & cover -->
      <path d="M 80,128 C 60,124 35,130 18,135 L 18,75 C 35,70 60,64 80,68 C 100,64 125,70 142,75 L 142,135 C 125,130 100,124 80,128 Z" fill="#5d4037" stroke="#3e2723" stroke-width="3"/>
      <!-- Pages -->
      <path d="M 80,124 C 62,120 38,126 22,130 L 22,72 C 38,68 62,62 80,66 C 98,62 122,68 138,72 L 138,130 C 122,126 98,120 80,124 Z" fill="#fffde7"/>
      <!-- Left Page Content -->
      <line x1="32" y1="84" x2="70" y2="84" stroke="#795548" stroke-width="2" stroke-linecap="round"/>
      <line x1="32" y1="94" x2="65" y2="94" stroke="#795548" stroke-width="2" stroke-linecap="round"/>
      <line x1="32" y1="104" x2="68" y2="104" stroke="#795548" stroke-width="2" stroke-linecap="round"/>
      <line x1="32" y1="114" x2="55" y2="114" stroke="#795548" stroke-width="2" stroke-linecap="round"/>
      <!-- Right Page Content: Diagram & math -->
      <circle cx="108" cy="94" r="14" fill="#e1f5fe" stroke="#0288d1" stroke-width="1.5"/>
      <text x="108" y="98" font-size="11" font-weight="900" fill="#0288d1" text-anchor="middle" font-family="sans-serif">½ = 50%</text>
      <line x1="90" y1="116" x2="128" y2="116" stroke="#795548" stroke-width="2" stroke-linecap="round"/>
      <!-- Golden ribbon bookmark -->
      <path d="M 80,66 L 80,138 L 85,132 L 90,138 L 90,66 Z" fill="#ffb300"/>
    </g>
  </svg>`;
}

/** 📊 Ouder Dashboard: Championship trophy cup, rising growth chart & star */
export function dashboardIllustration() {
  const id = uid("dash");
  return `<svg id="${id}" class="kmg-hero-svg" viewBox="0 0 160 160" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Ouder Dashboard">
    <defs>
      <linearGradient id="${id}_cup" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#fff176"/>
        <stop offset="60%" stop-color="#ffd54f"/>
        <stop offset="100%" stop-color="#ff8f00"/>
      </linearGradient>
    </defs>
    ${animWrap(id, `
      @keyframes ${id}_chartGrow { 0% { transform: scaleY(0.4); } 100% { transform: scaleY(1); } }
      #${id} .bar1 { transform-origin: 32px 135px; animation: ${id}_chartGrow 2s ease-in-out infinite alternate; }
      #${id} .bar2 { transform-origin: 46px 135px; animation: ${id}_chartGrow 2.4s ease-in-out 0.3s infinite alternate; }
      #${id} .bar3 { transform-origin: 120px 135px; animation: ${id}_chartGrow 2.2s ease-in-out 0.6s infinite alternate; }
    `)}
    <!-- Sparkles -->
    <circle cx="35" cy="30" r="3" fill="#ffd700" class="anim-sparkle" style="transform-origin:35px 30px;"/>
    <circle cx="125" cy="30" r="3.5" fill="#4caf50" class="anim-sparkle" style="transform-origin:125px 30px; animation-delay:0.7s;"/>
    <!-- Growth Chart Bars in background -->
    <rect x="24" y="90" width="12" height="45" rx="3" fill="#81c784" class="bar1"/>
    <rect x="40" y="70" width="12" height="65" rx="3" fill="#4caf50" class="bar2"/>
    <rect x="114" y="60" width="12" height="75" rx="3" fill="#42a5f5" class="bar3"/>
    <!-- Grand Gold Champion Trophy -->
    <g class="anim-bob" style="transform-origin:80px 85px;">
      <!-- Trophy Base -->
      <rect x="58" y="125" width="44" height="12" rx="3" fill="#5d4037" stroke="#3e2723" stroke-width="2"/>
      <rect x="64" y="117" width="32" height="8" rx="2" fill="#8d6e63"/>
      <!-- Trophy stem -->
      <rect x="75" y="98" width="10" height="20" fill="url(#${id}_cup)" stroke="#ff8f00" stroke-width="2"/>
      <!-- Trophy Handles -->
      <path d="M 55,55 C 35,55 35,85 58,85" fill="none" stroke="#ffa000" stroke-width="4.5" stroke-linecap="round"/>
      <path d="M 105,55 C 125,55 125,85 102,85" fill="none" stroke="#ffa000" stroke-width="4.5" stroke-linecap="round"/>
      <!-- Trophy Cup Bowl -->
      <path d="M 52,45 L 108,45 L 100,90 Q 80,105 60,90 Z" fill="url(#${id}_cup)" stroke="#ff8f00" stroke-width="2.5"/>
      <!-- Embossed star on cup -->
      <polygon points="80,56 83,64 91,64 85,69 87,77 80,72 73,77 75,69 69,64 77,64" fill="#ffffff" stroke="#ffa000" stroke-width="1.5" class="anim-sparkle" style="transform-origin:80px 66px;"/>
    </g>
  </svg>`;
}

/** 🎮 Home / Arcade: Happy math gaming mascot with dice, floating badges & stars */
export function homeIllustration() {
  const id = uid("home");
  return `<svg id="${id}" class="kmg-hero-svg" viewBox="0 0 160 160" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Reken Spelletjes">
    <defs>
      <radialGradient id="${id}_star" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#fff59d"/>
        <stop offset="60%" stop-color="#ffd54f"/>
        <stop offset="100%" stop-color="#ffb300"/>
      </radialGradient>
    </defs>
    ${animWrap(id, `
      @keyframes ${id}_rockit { 0% { transform: translate(0,0) rotate(-5deg); } 100% { transform: translate(5px,-6px) rotate(5deg); } }
      #${id} .rocket { animation: ${id}_rockit 2.2s ease-in-out infinite alternate; }
    `)}
    <!-- Sparkles -->
    <circle cx="20" cy="30" r="3" fill="#ffe57f" class="anim-sparkle" style="transform-origin:20px 30px;"/>
    <circle cx="140" cy="30" r="3" fill="#80d8ff" class="anim-sparkle" style="transform-origin:140px 30px; animation-delay:0.6s;"/>
    <!-- Floating Gamepad on left -->
    <g class="anim-float" style="transform-origin:32px 55px;">
      <rect x="15" y="44" width="34" height="22" rx="7" fill="#ab47bc" stroke="#fff" stroke-width="2"/>
      <!-- D-pad -->
      <polygon points="24,51 26,51 26,49 28,49 28,51 30,51 30,53 28,53 28,55 26,55 26,53 24,53" fill="#ffffff"/>
      <!-- Buttons -->
      <circle cx="39" cy="51" r="2" fill="#ffd54f"/>
      <circle cx="43" cy="55" r="2" fill="#00e676"/>
    </g>
    <!-- Floating Space Rocket on right -->
    <g class="rocket" style="transform-origin:130px 65px;">
      <path d="M 125,50 Q 138,40 142,55 L 138,72 L 122,68 Z" fill="#ef5350" stroke="#b71c1c" stroke-width="1.5"/>
      <circle cx="132" cy="58" r="3.5" fill="#e0f7fa" stroke="#00838f" stroke-width="1"/>
      <polygon points="120,68 114,75 125,74" fill="#ff9800"/>
    </g>
    <!-- Big Happy Mascot Star -->
    <g class="anim-bob" style="transform-origin:80px 88px;">
      <!-- Star body -->
      <polygon points="80,42 92,68 120,70 98,90 105,118 80,102 55,118 62,90 40,70 68,68" fill="url(#${id}_star)" stroke="#ff8f00" stroke-width="3"/>
      <!-- Cute Star Face -->
      <!-- Left Eye -->
      <ellipse cx="71" cy="78" rx="3.5" ry="5" fill="#3e2723"/>
      <circle cx="72" cy="76" r="1.5" fill="#ffffff"/>
      <!-- Right Eye -->
      <ellipse cx="89" cy="78" rx="3.5" ry="5" fill="#3e2723"/>
      <circle cx="90" cy="76" r="1.5" fill="#ffffff"/>
      <!-- Rosy Cheeks -->
      <circle cx="65" cy="85" r="4" fill="#ff5252" opacity="0.6"/>
      <circle cx="95" cy="85" r="4" fill="#ff5252" opacity="0.6"/>
      <!-- Big Happy Smile -->
      <path d="M 74,86 Q 80,94 86,86" fill="none" stroke="#3e2723" stroke-width="3" stroke-linecap="round"/>
      <!-- Confetti stars around -->
      <circle cx="80" cy="132" r="3" fill="#ff4081"/>
      <circle cx="60" cy="135" r="2.5" fill="#4caf50"/>
      <circle cx="100" cy="135" r="2.5" fill="#42a5f5"/>
    </g>
  </svg>`;
}

/** 🎁 Beloningswinkel: Treasure chest popping with gold coins, beside a gift box */
export function rewardsIllustration() {
  const id = uid("rew");
  return `<svg id="${id}" class="kmg-hero-svg" viewBox="0 0 160 160" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Beloningswinkel">
    <defs>
      <linearGradient id="${id}_gold" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#fff59d"/>
        <stop offset="50%" stop-color="#ffd54f"/>
        <stop offset="100%" stop-color="#ff8f00"/>
      </linearGradient>
      <linearGradient id="${id}_wood" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#8d6e63"/>
        <stop offset="100%" stop-color="#5d4037"/>
      </linearGradient>
    </defs>
    ${animWrap(id, `
      @keyframes ${id}_coinPop { 0% { transform: translateY(0) rotate(0deg); opacity: 0; } 30% { opacity: 1; } 100% { transform: translateY(-30px) rotate(180deg); opacity: 0; } }
      #${id} .coin1 { animation: ${id}_coinPop 2.4s ease-out infinite; }
      #${id} .coin2 { animation: ${id}_coinPop 2.8s ease-out 0.7s infinite; }
      #${id} .coin3 { animation: ${id}_coinPop 2.2s ease-out 1.3s infinite; }
      @keyframes ${id}_lidOpen { 0%, 100% { transform: rotate(-16deg); } 50% { transform: rotate(-24deg); } }
      #${id} .lid { animation: ${id}_lidOpen 3s ease-in-out infinite; }
    `)}
    <!-- Sparkles -->
    <circle cx="24" cy="28" r="2.5" fill="#ffe57f" class="anim-sparkle" style="transform-origin:24px 28px;"/>
    <circle cx="140" cy="40" r="3" fill="#ff8a80" class="anim-sparkle" style="transform-origin:140px 40px; animation-delay:0.6s;"/>
    <circle cx="132" cy="122" r="2" fill="#80d8ff" class="anim-sparkle" style="transform-origin:132px 122px; animation-delay:1.1s;"/>
    <!-- Wrapped gift box, floating on the right -->
    <g class="anim-float-rev" style="transform-origin:122px 108px;">
      <rect x="98" y="92" width="48" height="36" rx="4" fill="#ef5350" stroke="#b71c1c" stroke-width="2.5"/>
      <rect x="98" y="104" width="48" height="10" fill="#ffee58"/>
      <rect x="117" y="92" width="10" height="36" fill="#ffee58"/>
      <path d="M 122,92 C 108,92 108,78 118,78 C 122,78 122,88 122,92 Z" fill="#ffca28" stroke="#ff8f00" stroke-width="1.5"/>
      <path d="M 122,92 C 136,92 136,78 126,78 C 122,78 122,88 122,92 Z" fill="#ffca28" stroke="#ff8f00" stroke-width="1.5"/>
    </g>
    <!-- Floating star badge -->
    <g class="anim-float" style="transform-origin:28px 100px;">
      <circle cx="28" cy="100" r="13" fill="#ab47bc" stroke="#fff" stroke-width="2"/>
      <text x="28" y="106" font-size="14" text-anchor="middle">⭐</text>
    </g>
    <!-- Coins popping up above the chest -->
    <circle cx="70" cy="70" r="7" fill="url(#${id}_gold)" stroke="#ff8f00" stroke-width="1.5" class="coin1"/>
    <circle cx="86" cy="65" r="6" fill="url(#${id}_gold)" stroke="#ff8f00" stroke-width="1.5" class="coin2"/>
    <circle cx="58" cy="60" r="5.5" fill="url(#${id}_gold)" stroke="#ff8f00" stroke-width="1.5" class="coin3"/>
    <!-- Treasure chest -->
    <g class="anim-bob" style="transform-origin:75px 110px;">
      <!-- Chest base -->
      <rect x="35" y="95" width="80" height="40" rx="6" fill="url(#${id}_wood)" stroke="#3e2723" stroke-width="3"/>
      <rect x="35" y="95" width="80" height="10" fill="#a1887f"/>
      <!-- Coins spilling inside -->
      <circle cx="55" cy="98" r="6" fill="url(#${id}_gold)" stroke="#ff8f00" stroke-width="1.5"/>
      <circle cx="70" cy="96" r="6" fill="url(#${id}_gold)" stroke="#ff8f00" stroke-width="1.5"/>
      <circle cx="85" cy="98" r="6" fill="url(#${id}_gold)" stroke="#ff8f00" stroke-width="1.5"/>
      <circle cx="98" cy="96" r="6" fill="url(#${id}_gold)" stroke="#ff8f00" stroke-width="1.5"/>
      <!-- Metal clasp -->
      <rect x="68" y="90" width="14" height="16" rx="3" fill="#ffd54f" stroke="#ff8f00" stroke-width="2"/>
      <circle cx="75" cy="98" r="2.5" fill="#ff8f00"/>
      <!-- Chest lid, swinging open -->
      <path d="M 35,95 Q 35,60 75,60 Q 115,60 115,95 Z" fill="url(#${id}_wood)" stroke="#3e2723" stroke-width="3" class="lid" style="transform-origin:75px 95px;"/>
    </g>
  </svg>`;
}

/** 🔍 Leesdetective: an open book with a magnifying glass sweeping over the lines */
export function lezenIllustration() {
  const id = uid("lez");
  return `<svg id="${id}" class="kmg-hero-svg" viewBox="0 0 160 160" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Leesdetective">
    ${animWrap(id, `
      @keyframes ${id}_scan { 0% { transform: translate(0px, 0px); } 50% { transform: translate(34px, 14px); } 100% { transform: translate(0px, 0px); } }
      #${id} .glass { animation: ${id}_scan 4s ease-in-out infinite; }
    `)}
    <circle cx="28" cy="30" r="3" fill="#ffd600" class="anim-sparkle" style="transform-origin:28px 30px;"/>
    <circle cx="134" cy="36" r="3.5" fill="#00e5ff" class="anim-sparkle" style="transform-origin:134px 36px; animation-delay:0.6s;"/>
    <g class="anim-float" style="transform-origin:80px 100px;">
      <path d="M 18,52 Q 48,40 78,54 L 78,132 Q 48,118 18,130 Z" fill="#fff8e1" stroke="#6d4c41" stroke-width="3"/>
      <path d="M 142,52 Q 112,40 82,54 L 82,132 Q 112,118 142,130 Z" fill="#fffde7" stroke="#6d4c41" stroke-width="3"/>
      <rect x="77" y="52" width="6" height="82" rx="2" fill="#8d6e63"/>
      <g stroke="#a1887f" stroke-width="3" stroke-linecap="round">
        <line x1="28" y1="68" x2="68" y2="72"/><line x1="28" y1="80" x2="68" y2="84"/><line x1="28" y1="92" x2="62" y2="96"/><line x1="28" y1="104" x2="68" y2="108"/>
        <line x1="92" y1="72" x2="132" y2="68"/><line x1="92" y1="84" x2="132" y2="80"/><line x1="92" y1="96" x2="126" y2="92"/><line x1="92" y1="108" x2="132" y2="104"/>
      </g>
    </g>
    <g class="glass">
      <circle cx="58" cy="78" r="20" fill="rgba(129,212,250,0.35)" stroke="#37474f" stroke-width="5"/>
      <line x1="72" y1="92" x2="92" y2="112" stroke="#5d4037" stroke-width="8" stroke-linecap="round"/>
      <path d="M 48,70 Q 52,64 60,64" fill="none" stroke="#ffffff" stroke-width="3" stroke-linecap="round"/>
    </g>
  </svg>`;
}

/** 🧙 Woordenschat Wizard: a friendly wizard with letters floating out of a wand */
export function woordenIllustration() {
  const id = uid("woo");
  return `<svg id="${id}" class="kmg-hero-svg" viewBox="0 0 160 160" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Woordenschat Wizard">
    ${animWrap(id, `
      @keyframes ${id}_rise { 0% { transform: translateY(8px); opacity: 0; } 30% { opacity: 1; } 100% { transform: translateY(-26px); opacity: 0; } }
      #${id} .letter { animation: ${id}_rise 2.8s ease-in infinite; }
    `)}
    <g class="anim-bob" style="transform-origin:70px 110px;">
      <path d="M 40,140 L 62,86 L 84,140 Z" fill="#5e35b1" stroke="#311b92" stroke-width="3"/>
      <circle cx="62" cy="78" r="16" fill="#ffe0b2" stroke="#6d4c41" stroke-width="2.5"/>
      <path d="M 44,70 L 62,24 L 80,70 Z" fill="#7e57c2" stroke="#311b92" stroke-width="3"/>
      <circle cx="62" cy="40" r="3" fill="#ffd600"/>
      <path d="M 50,86 Q 62,112 74,86" fill="#eceff1" stroke="#b0bec5" stroke-width="2"/>
      <circle cx="56" cy="76" r="2.4" fill="#3e2723"/><circle cx="68" cy="76" r="2.4" fill="#3e2723"/>
      <line x1="82" y1="104" x2="112" y2="78" stroke="#8d6e63" stroke-width="5" stroke-linecap="round"/>
      <circle cx="114" cy="76" r="5" fill="#ffd600" class="anim-pulse" style="transform-origin:114px 76px;"/>
    </g>
    <g font-family="sans-serif" font-weight="900" font-size="18">
      <text x="116" y="60" fill="#e91e63" class="letter">A</text>
      <text x="132" y="50" fill="#03a9f4" class="letter" style="animation-delay:0.9s;">b</text>
      <text x="104" y="46" fill="#4caf50" class="letter" style="animation-delay:1.8s;">?</text>
    </g>
  </svg>`;
}

/** 🌪️ Spellingstorm: a swirling tornado picking up letter tiles */
export function spellingIllustration() {
  const id = uid("spe");
  return `<svg id="${id}" class="kmg-hero-svg" viewBox="0 0 160 160" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Spellingstorm">
    ${animWrap(id, `
      @keyframes ${id}_sway { 0% { transform: skewX(-6deg); } 100% { transform: skewX(6deg); } }
      #${id} .twister { animation: ${id}_sway 1.6s ease-in-out infinite alternate; }
      @keyframes ${id}_orbit { 0% { transform: rotate(0deg) translateX(46px) rotate(0deg); } 100% { transform: rotate(360deg) translateX(46px) rotate(-360deg); } }
      #${id} .tile { animation: ${id}_orbit 5s linear infinite; }
    `)}
    <g class="twister" style="transform-origin:80px 140px;">
      <path d="M 36,30 Q 80,18 124,30 Q 110,52 70,50 Q 102,62 108,74 Q 80,86 62,80 Q 90,94 92,104 Q 78,116 72,112 Q 86,124 82,138" fill="none" stroke="#90a4ae" stroke-width="10" stroke-linecap="round"/>
      <path d="M 40,32 Q 80,22 120,32" fill="none" stroke="#cfd8dc" stroke-width="5" stroke-linecap="round"/>
    </g>
    <g style="transform-origin:80px 80px;">
      <g class="tile" style="transform-origin:80px 80px;"><rect x="70" y="70" width="20" height="20" rx="4" fill="#ffca28" stroke="#f57f17" stroke-width="2"/><text x="80" y="85" text-anchor="middle" font-size="13" font-weight="900" fill="#5d4037" font-family="sans-serif">d</text></g>
      <g class="tile" style="transform-origin:80px 80px; animation-delay:-1.7s;"><rect x="70" y="70" width="20" height="20" rx="4" fill="#81d4fa" stroke="#0277bd" stroke-width="2"/><text x="80" y="85" text-anchor="middle" font-size="13" font-weight="900" fill="#01579b" font-family="sans-serif">t</text></g>
      <g class="tile" style="transform-origin:80px 80px; animation-delay:-3.4s;"><rect x="70" y="70" width="20" height="20" rx="4" fill="#a5d6a7" stroke="#2e7d32" stroke-width="2"/><text x="80" y="85" text-anchor="middle" font-size="12" font-weight="900" fill="#1b5e20" font-family="sans-serif">ij</text></g>
    </g>
  </svg>`;
}

/** 🐦 Fladdervogel: a round bird flapping between two green gates */
export function vliegIllustration() {
  const id = uid("vli");
  return `<svg id="${id}" class="kmg-hero-svg" viewBox="0 0 160 160" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Fladdervogel">
    ${animWrap(id, `
      @keyframes ${id}_flap { 0% { transform: rotate(-25deg); } 100% { transform: rotate(20deg); } }
      #${id} .wing { animation: ${id}_flap 0.35s ease-in-out infinite alternate; }
      @keyframes ${id}_hover { 0% { transform: translateY(6px); } 100% { transform: translateY(-8px); } }
      #${id} .bird { animation: ${id}_hover 1.1s ease-in-out infinite alternate; }
    `)}
    <rect x="18" y="12" width="26" height="46" rx="5" fill="#66bb6a" stroke="#1b5e20" stroke-width="3"/>
    <rect x="18" y="98" width="26" height="50" rx="5" fill="#66bb6a" stroke="#1b5e20" stroke-width="3"/>
    <rect x="118" y="12" width="26" height="62" rx="5" fill="#66bb6a" stroke="#1b5e20" stroke-width="3"/>
    <rect x="118" y="114" width="26" height="34" rx="5" fill="#66bb6a" stroke="#1b5e20" stroke-width="3"/>
    <g class="bird" style="transform-origin:80px 78px;">
      <ellipse cx="80" cy="78" rx="22" ry="19" fill="#ff7043" stroke="#e64a19" stroke-width="3"/>
      <ellipse cx="83" cy="86" rx="12" ry="7" fill="#ffccbc"/>
      <g class="wing" style="transform-origin:72px 78px;"><ellipse cx="66" cy="78" rx="12" ry="7" fill="#ffb300" stroke="#ff8f00" stroke-width="2"/></g>
      <circle cx="90" cy="71" r="6" fill="#ffffff"/><circle cx="92" cy="71" r="3" fill="#212121"/>
      <path d="M 100,76 L 114,80 L 100,86 Z" fill="#ffb300" stroke="#ff8f00" stroke-width="1.5"/>
    </g>
  </svg>`;
}

/** 🦸 Sprongheld: a hero jumping up into a glowing question block */
export function sprongIllustration() {
  const id = uid("spr");
  return `<svg id="${id}" class="kmg-hero-svg" viewBox="0 0 160 160" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Sprongheld">
    ${animWrap(id, `
      @keyframes ${id}_jump { 0%, 100% { transform: translateY(0px); } 45% { transform: translateY(-34px); } }
      #${id} .hero { animation: ${id}_jump 1.4s ease-in-out infinite; }
      @keyframes ${id}_bump { 0%, 38%, 60%, 100% { transform: translateY(0px); } 47% { transform: translateY(-7px); } }
      #${id} .block { animation: ${id}_bump 1.4s ease-in-out infinite; }
      @keyframes ${id}_coin { 0%, 42% { transform: translateY(0px); opacity: 0; } 50% { opacity: 1; } 80% { transform: translateY(-26px); opacity: 0; } 100% { opacity: 0; } }
      #${id} .coin { animation: ${id}_coin 1.4s ease-out infinite; }
    `)}
    <rect x="0" y="136" width="160" height="24" fill="#a1664a"/>
    <rect x="0" y="132" width="160" height="7" fill="#66bb6a"/>
    <circle cx="80" cy="22" r="8" fill="#ffd54f" stroke="#f57f17" stroke-width="2" class="coin"/>
    <g class="block" style="transform-origin:80px 44px;">
      <rect x="60" y="30" width="40" height="30" rx="5" fill="#ffb300" stroke="#e65100" stroke-width="3"/>
      <text x="80" y="53" text-anchor="middle" font-size="20" font-weight="900" fill="#5d4037" font-family="sans-serif">?</text>
    </g>
    <g class="hero" style="transform-origin:80px 110px;">
      <path d="M 66,100 Q 58,118 62,128 L 98,128 Q 102,118 94,100 Z" fill="#e53935" opacity="0.85"/>
      <rect x="68" y="96" width="24" height="26" rx="7" fill="#1e88e5" stroke="#0d47a1" stroke-width="2.5"/>
      <circle cx="80" cy="86" r="12" fill="#ffe0b2" stroke="#6d4c41" stroke-width="2"/>
      <circle cx="76" cy="85" r="1.8" fill="#3e2723"/><circle cx="84" cy="85" r="1.8" fill="#3e2723"/>
      <path d="M 76,90 Q 80,93 84,90" fill="none" stroke="#3e2723" stroke-width="1.6" stroke-linecap="round"/>
      <line x1="92" y1="100" x2="100" y2="84" stroke="#1e88e5" stroke-width="6" stroke-linecap="round"/>
      <rect x="70" y="120" width="7" height="10" rx="2" fill="#37474f"/><rect x="83" y="120" width="7" height="10" rx="2" fill="#37474f"/>
    </g>
  </svg>`;
}

/** 🍪 Leerhapjes: a cookie with a bite out of it, and a little lesson card */
export function leerhapjesIllustration() {
  const id = uid("hap");
  return `<svg id="${id}" class="kmg-hero-svg" viewBox="0 0 160 160" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Leerhapjes">
    ${animWrap(id, "")}
    <g class="anim-float-rev" style="transform-origin:112px 60px;">
      <rect x="88" y="26" width="52" height="66" rx="8" fill="#ffffff" stroke="#8d6e63" stroke-width="3" transform="rotate(8 114 59)"/>
      <g transform="rotate(8 114 59)" stroke="#bcaaa4" stroke-width="3" stroke-linecap="round">
        <line x1="98" y1="42" x2="130" y2="42"/><line x1="98" y1="54" x2="126" y2="54"/><line x1="98" y1="66" x2="130" y2="66"/>
      </g>
      <text x="118" y="86" text-anchor="middle" font-size="16" transform="rotate(8 114 59)">⭐</text>
    </g>
    <g class="anim-bob" style="transform-origin:64px 104px;">
      <path d="M 64,56 A 44,44 0 1 0 104,90 A 10,10 0 0 1 96,78 A 10,10 0 0 1 86,66 A 10,10 0 0 1 76,58 A 10,10 0 0 1 64,56 Z" fill="#d7a86e" stroke="#8d5a2b" stroke-width="3"/>
      <circle cx="48" cy="92" r="5" fill="#5d4037"/><circle cx="70" cy="112" r="5" fill="#5d4037"/><circle cx="44" cy="120" r="4" fill="#5d4037"/><circle cx="80" cy="92" r="4" fill="#5d4037"/><circle cx="60" cy="76" r="4" fill="#5d4037"/>
    </g>
    <circle cx="24" cy="36" r="3" fill="#ffd600" class="anim-sparkle" style="transform-origin:24px 36px;"/>
  </svg>`;
}

/** 🌋 Lavatoren: a hero on a brick tower, lava bubbling below */
export function torenIllustration() {
  const id = uid("tor");
  return `<svg id="${id}" class="kmg-hero-svg" viewBox="0 0 160 160" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Lavatoren">
    ${animWrap(id, `
      @keyframes ${id}_hop { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-14px); } }
      #${id} .hero { animation: ${id}_hop 1.3s ease-in-out infinite; }
      @keyframes ${id}_lava { 0% { transform: translateY(0px); } 100% { transform: translateY(-5px); } }
      #${id} .lava { animation: ${id}_lava 1.6s ease-in-out infinite alternate; }
    `)}
    <rect x="0" y="0" width="160" height="160" rx="18" fill="#3f2a6b" opacity="0.15"/>
    <g>
      <rect x="18" y="104" width="44" height="12" rx="3" fill="#42a5f5" stroke="#1565c0" stroke-width="2.5"/>
      <rect x="92" y="72" width="44" height="12" rx="3" fill="#ab47bc" stroke="#6a1b9a" stroke-width="2.5"/>
      <rect x="40" y="40" width="44" height="12" rx="3" fill="#26a69a" stroke="#00695c" stroke-width="2.5"/>
      <circle cx="26" cy="102" r="3" fill="#42a5f5" stroke="#1565c0" stroke-width="1.5"/><circle cx="40" cy="102" r="3" fill="#42a5f5" stroke="#1565c0" stroke-width="1.5"/><circle cx="54" cy="102" r="3" fill="#42a5f5" stroke="#1565c0" stroke-width="1.5"/>
      <line x1="126" y1="72" x2="126" y2="50" stroke="#eceff1" stroke-width="3"/>
      <path d="M 126,50 L 110,55 L 126,60 Z" fill="#43a047"/>
      <text x="62" y="30" text-anchor="middle" font-size="18">🏆</text>
    </g>
    <g class="hero" style="transform-origin:40px 100px;">
      <rect x="32" y="80" width="16" height="16" rx="5" fill="#ff7043" stroke="#e64a19" stroke-width="2"/>
      <circle cx="40" cy="72" r="9" fill="#ffe0b2" stroke="#6d4c41" stroke-width="2"/>
      <circle cx="37" cy="71" r="1.5" fill="#3e2723"/><circle cx="43" cy="71" r="1.5" fill="#3e2723"/>
      <rect x="34" y="96" width="5" height="8" fill="#37474f"/><rect x="41" y="96" width="5" height="8" fill="#37474f"/>
    </g>
    <g class="lava">
      <path d="M 0,138 Q 20,128 40,138 T 80,138 T 120,138 T 160,138 L 160,170 L 0,170 Z" fill="#ff7043"/>
      <path d="M 0,146 Q 20,138 40,146 T 80,146 T 120,146 T 160,146 L 160,170 L 0,170 Z" fill="#e53935"/>
      <circle cx="30" cy="150" r="4" fill="#ffca28"/><circle cx="104" cy="152" r="3" fill="#ffca28"/>
    </g>
  </svg>`;
}

/** 🏎️ Turbokart: a kart racing down a road towards a chequered flag */
export function kartIllustration() {
  const id = uid("krt");
  return `<svg id="${id}" class="kmg-hero-svg" viewBox="0 0 160 160" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Turbokart">
    ${animWrap(id, `
      @keyframes ${id}_zoom { 0%, 100% { transform: translateX(-3px); } 50% { transform: translateX(3px); } }
      #${id} .kart { animation: ${id}_zoom 0.6s ease-in-out infinite; }
      @keyframes ${id}_flame { 0% { transform: scaleY(0.7); } 100% { transform: scaleY(1.2); } }
      #${id} .flame { animation: ${id}_flame 0.15s linear infinite alternate; transform-origin: 80px 130px; }
    `)}
    <path d="M 60,40 L 100,40 L 150,160 L 10,160 Z" fill="#757575"/>
    <path d="M 55,40 L 60,40 L 10,160 L 0,160 Z" fill="#e53935"/>
    <path d="M 100,40 L 105,40 L 160,160 L 150,160 Z" fill="#e53935"/>
    <path d="M 79,50 L 81,50 L 83,72 L 77,72 Z" fill="#fff" opacity="0.8"/>
    <path d="M 78,84 L 82,84 L 84,104 L 76,104 Z" fill="#fff" opacity="0.8"/>
    <g>
      <rect x="60" y="22" width="40" height="18" fill="#212121"/>
      <rect x="60" y="22" width="10" height="9" fill="#fafafa"/><rect x="80" y="22" width="10" height="9" fill="#fafafa"/>
      <rect x="70" y="31" width="10" height="9" fill="#fafafa"/><rect x="90" y="31" width="10" height="9" fill="#fafafa"/>
      <rect x="56" y="14" width="4" height="30" fill="#8d6e63"/><rect x="100" y="14" width="4" height="30" fill="#8d6e63"/>
    </g>
    <g class="flame"><path d="M 68,132 L 72,150 L 76,132 Z" fill="#ff9100"/><path d="M 84,132 L 88,150 L 92,132 Z" fill="#ff9100"/></g>
    <g class="kart">
      <rect x="46" y="112" width="14" height="20" rx="4" fill="#212121"/>
      <rect x="100" y="112" width="14" height="20" rx="4" fill="#212121"/>
      <rect x="54" y="104" width="52" height="28" rx="9" fill="#ff7043" stroke="#e64a19" stroke-width="2.5"/>
      <circle cx="80" cy="96" r="11" fill="#ffe0b2" stroke="#6d4c41" stroke-width="2"/>
      <path d="M 69,92 Q 80,80 91,92 Z" fill="#1e88e5"/>
      <circle cx="76" cy="97" r="1.6" fill="#3e2723"/><circle cx="84" cy="97" r="1.6" fill="#3e2723"/>
      <text x="80" y="125" text-anchor="middle" font-size="12" font-weight="900" fill="#fff" font-family="sans-serif">1</text>
    </g>
    <text x="130" y="36" text-anchor="middle" font-size="20" class="anim-sparkle" style="transform-origin:130px 30px;">⭐</text>
  </svg>`;
}

/** 🧩 Rekendoku: a small cage puzzle with a pencil */
export function dokuIllustration() {
  const id = uid("dok");
  return `<svg id="${id}" class="kmg-hero-svg" viewBox="0 0 160 160" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Rekendoku">
    ${animWrap(id, "")}
    <g class="anim-float" style="transform-origin:78px 80px;">
      <rect x="22" y="22" width="112" height="112" rx="8" fill="#ffffff" stroke="#5d4037" stroke-width="4"/>
      <g stroke="#bcaaa4" stroke-width="1.5">
        <line x1="50" y1="22" x2="50" y2="134"/><line x1="78" y1="22" x2="78" y2="134"/><line x1="106" y1="22" x2="106" y2="134"/>
        <line x1="22" y1="50" x2="134" y2="50"/><line x1="22" y1="78" x2="134" y2="78"/><line x1="22" y1="106" x2="134" y2="106"/>
      </g>
      <g stroke="#5d4037" stroke-width="4" stroke-linecap="round">
        <line x1="78" y1="22" x2="78" y2="50"/><line x1="22" y1="78" x2="78" y2="78"/><line x1="106" y1="50" x2="106" y2="106"/>
        <line x1="50" y1="106" x2="106" y2="106"/><line x1="78" y1="50" x2="134" y2="50"/>
      </g>
      <g font-family="sans-serif" font-weight="800" fill="#e64a19" font-size="9">
        <text x="26" y="32">7+</text><text x="82" y="32">2−</text><text x="26" y="88">12×</text><text x="110" y="60">3:</text>
      </g>
      <g font-family="sans-serif" font-weight="900" fill="#3e2723" font-size="18" text-anchor="middle">
        <text x="36" y="43">3</text><text x="64" y="43">4</text><text x="92" y="43">1</text><text x="120" y="43">2</text>
        <text x="36" y="99" class="anim-pulse" style="transform-origin:36px 93px;" fill="#2e7d32">4</text>
      </g>
      <rect x="22" y="78" width="28" height="28" fill="#fff59d" opacity="0.5"/>
    </g>
    <g class="anim-wiggle" style="transform-origin:128px 130px;">
      <rect x="118" y="96" width="10" height="40" rx="2" fill="#ffb300" stroke="#e65100" stroke-width="2" transform="rotate(35 123 116)"/>
    </g>
  </svg>`;
}

/** ♟️ Tafeltactiek: a board of products with two clips and a line of four */
export function tactiekIllustration() {
  const id = uid("tac");
  return `<svg id="${id}" class="kmg-hero-svg" viewBox="0 0 160 160" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Tafeltactiek">
    ${animWrap(id, "")}
    <rect x="18" y="16" width="124" height="96" rx="10" fill="#fff8e1" stroke="#8d6e63" stroke-width="3"/>
    <g font-family="sans-serif" font-weight="800" font-size="11" fill="#5d4037" text-anchor="middle">
      ${[[12, 14, 15, 16], [18, 20, 21, 24], [25, 27, 28, 30]]
        .map((row, r) => row.map((n, c) => `<text x="${38 + c * 28}" y="${40 + r * 28}">${n}</text>`).join(""))
        .join("")}
    </g>
    <g class="anim-pulse" style="transform-origin:80px 64px;">
      <circle cx="38" cy="36" r="11" fill="#ff7043" opacity="0.35"/><circle cx="66" cy="64" r="11" fill="#ff7043" opacity="0.35"/>
      <circle cx="94" cy="92" r="11" fill="#ff7043" opacity="0.35"/>
    </g>
    <circle cx="122" cy="36" r="11" fill="#7e57c2" opacity="0.35"/><circle cx="94" cy="36" r="11" fill="#7e57c2" opacity="0.35"/>
    <rect x="18" y="122" width="124" height="22" rx="8" fill="#eceff1" stroke="#90a4ae" stroke-width="2"/>
    <g font-family="sans-serif" font-weight="800" font-size="11" fill="#455a64" text-anchor="middle">
      ${[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n, i) => `<text x="${28 + i * 13}" y="137">${n}</text>`).join("")}
    </g>
    <g class="anim-bob" style="transform-origin:67px 120px;"><path d="M 63,112 L 71,112 L 71,124 Q 67,130 63,124 Z" fill="#ffb300" stroke="#e65100" stroke-width="1.5"/></g>
    <g class="anim-bob" style="transform-origin:106px 120px;"><path d="M 102,112 L 110,112 L 110,124 Q 106,130 102,124 Z" fill="#26a69a" stroke="#00695c" stroke-width="1.5"/></g>
    <text x="140" y="112" font-size="16">🤖</text>
  </svg>`;
}

/** 🎡 Pretparkbaas: a Ferris wheel turning over a little park */
export function parkIllustration() {
  const id = uid("prk");
  return `<svg id="${id}" class="kmg-hero-svg" viewBox="0 0 160 160" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Pretparkbaas">
    ${animWrap(id, "")}
    <rect x="0" y="118" width="160" height="42" rx="6" fill="#81c784"/>
    <path d="M 0,128 Q 80,116 160,128" fill="none" stroke="#fff59d" stroke-width="6" stroke-linecap="round"/>
    <line x1="70" y1="112" x2="60" y2="122" stroke="#6d4c41" stroke-width="4"/><line x1="70" y1="112" x2="80" y2="122" stroke="#6d4c41" stroke-width="4"/>
    <g class="anim-spin-slow" style="transform-origin:70px 64px;">
      <circle cx="70" cy="64" r="46" fill="none" stroke="#ab47bc" stroke-width="4"/>
      <circle cx="70" cy="64" r="6" fill="#6a1b9a"/>
      ${[0, 45, 90, 135, 180, 225, 270, 315]
        .map((a) => {
          const x = 70 + 46 * Math.cos((a * Math.PI) / 180);
          const y = 64 + 46 * Math.sin((a * Math.PI) / 180);
          const colors = ["#ef5350", "#ffca28", "#42a5f5", "#66bb6a"];
          return `<line x1="70" y1="64" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" stroke="#ce93d8" stroke-width="2"/><circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="7" fill="${colors[(a / 45) % 4]}" stroke="#5d4037" stroke-width="1.5"/>`;
        })
        .join("")}
    </g>
    <g class="anim-float" style="transform-origin:130px 100px;">
      <path d="M 116,118 L 130,86 L 144,118 Z" fill="#ef5350" stroke="#b71c1c" stroke-width="2"/>
      <path d="M 123,118 L 130,98 L 137,118 Z" fill="#fff"/>
      <line x1="130" y1="86" x2="130" y2="76" stroke="#5d4037" stroke-width="2"/><path d="M 130,76 L 140,79 L 130,82 Z" fill="#ffca28"/>
    </g>
    <text x="20" y="146" font-size="16">🍭</text><text x="100" y="152" font-size="14">🧒</text>
    <text x="124" y="30" font-size="18" class="anim-sparkle" style="transform-origin:132px 24px;">💰</text>
  </svg>`;
}

/** 🌟 Sterrenpad: a winding road of stars up to a gift */
export function sterrenpadIllustration() {
  const id = uid("str");
  return `<svg id="${id}" class="kmg-hero-svg" viewBox="0 0 160 160" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Sterrenpad">
    ${animWrap(id, "")}
    <path d="M 20,150 C 70,140 20,110 80,100 S 140,70 90,50 S 60,24 120,18" fill="none" stroke="#ffe082" stroke-width="12" stroke-linecap="round"/>
    <path d="M 20,150 C 70,140 20,110 80,100 S 140,70 90,50 S 60,24 120,18" fill="none" stroke="#ffb300" stroke-width="2" stroke-dasharray="4 7"/>
    ${[
      [30, 146],
      [58, 116],
      [104, 90],
      [98, 54],
      [80, 34],
    ]
      .map(([x, y], i) => `<text x="${x}" y="${y}" text-anchor="middle" font-size="${14 + i * 2}" class="anim-sparkle" style="transform-origin:${x}px ${y - 6}px; animation-delay:${i * 0.25}s">⭐</text>`)
      .join("")}
    <g class="anim-bob" style="transform-origin:124px 20px;"><text x="126" y="28" text-anchor="middle" font-size="26">🎁</text></g>
    <g class="anim-float" style="transform-origin:50px 128px;"><text x="46" y="136" text-anchor="middle" font-size="22">🧗</text></g>
  </svg>`;
}


/** 🎲 Telduel: a staircase of counting steps, the safe ones lit, a flag on top and a die */
export function duelIllustration() {
  const id = uid("due");
  return `<svg id="${id}" class="kmg-hero-svg" viewBox="0 0 160 160" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Telduel">
    ${animWrap(id, `
      @keyframes ${id}_tumble { 0% { transform: rotate(-12deg) translateY(0); } 50% { transform: rotate(10deg) translateY(-6px); } 100% { transform: rotate(-12deg) translateY(0); } }
      #${id} .die { animation: ${id}_tumble 2.6s ease-in-out infinite; transform-origin: 128px 52px; }
    `)}
    <g stroke="#5d4037" stroke-width="3" stroke-linejoin="round">
      <rect x="14" y="120" width="26" height="26" fill="#ffe0b2"/>
      <rect x="40" y="104" width="26" height="42" fill="#c8e6c9"/>
      <rect x="66" y="88" width="26" height="58" fill="#ffe0b2"/>
      <rect x="92" y="72" width="26" height="74" fill="#c8e6c9"/>
      <rect x="118" y="56" width="26" height="90" fill="#ffe0b2"/>
    </g>
    <g font-family="sans-serif" font-weight="900" font-size="14" fill="#3e2723" text-anchor="middle">
      <text x="27" y="138">2</text><text x="53" y="130">6</text><text x="79" y="122">9</text><text x="105" y="114">10</text>
    </g>
    <g class="anim-sparkle" style="transform-origin:53px 98px;"><text x="53" y="100" text-anchor="middle" font-size="16">✨</text></g>
    <g class="anim-sparkle" style="transform-origin:105px 66px;"><text x="105" y="68" text-anchor="middle" font-size="16">✨</text></g>
    <g class="anim-bob" style="transform-origin:131px 40px;"><text x="131" y="48" text-anchor="middle" font-size="26">🏁</text></g>
    <g class="die">
      <rect x="22" y="30" width="34" height="34" rx="8" fill="#ffffff" stroke="#5d4037" stroke-width="3"/>
      <circle cx="32" cy="40" r="3.5" fill="#e64a19"/><circle cx="46" cy="54" r="3.5" fill="#e64a19"/><circle cx="39" cy="47" r="3.5" fill="#e64a19"/>
    </g>
    <text x="74" y="62" font-size="22" class="anim-float" style="transform-origin:74px 52px;">🤖</text>
  </svg>`;
}

/** ⚖️ Weegpuzzel: a balance scale with fruit that gently settles */
export function weegIllustration() {
  const id = uid("wee");
  return `<svg id="${id}" class="kmg-hero-svg" viewBox="0 0 160 160" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Weegpuzzel">
    ${animWrap(id, `
      @keyframes ${id}_rock { 0% { transform: rotate(-6deg); } 50% { transform: rotate(5deg); } 100% { transform: rotate(-6deg); } }
      #${id} .beam { animation: ${id}_rock 4s ease-in-out infinite; transform-origin: 80px 46px; }
    `)}
    <polygon points="62,146 98,146 88,132 72,132" fill="#5d4037"/>
    <line x1="80" y1="46" x2="80" y2="136" stroke="#5d4037" stroke-width="6" stroke-linecap="round"/>
    <g class="beam">
      <line x1="26" y1="46" x2="134" y2="46" stroke="#5d4037" stroke-width="7" stroke-linecap="round"/>
      <circle cx="80" cy="46" r="8" fill="#ffb74d" stroke="#5d4037" stroke-width="3"/>
      <g>
        <line x1="34" y1="46" x2="12" y2="96" stroke="#5d4037" stroke-width="2"/><line x1="34" y1="46" x2="56" y2="96" stroke="#5d4037" stroke-width="2"/>
        <path d="M 10 96 Q 34 120 58 96 Z" fill="#ffb74d" stroke="#5d4037" stroke-width="3" stroke-linejoin="round"/>
        <text x="20" y="94" font-size="24">🍎</text><text x="34" y="94" font-size="24">🍎</text>
      </g>
      <g>
        <line x1="126" y1="46" x2="104" y2="96" stroke="#5d4037" stroke-width="2"/><line x1="126" y1="46" x2="148" y2="96" stroke="#5d4037" stroke-width="2"/>
        <path d="M 102 96 Q 126 120 150 96 Z" fill="#ffb74d" stroke="#5d4037" stroke-width="3" stroke-linejoin="round"/>
        <rect x="108" y="76" width="34" height="20" rx="5" fill="#cfd8dc" stroke="#5d4037" stroke-width="2"/>
        <text x="125" y="91" text-anchor="middle" font-size="12" font-weight="900" fill="#3e2723" font-family="sans-serif">12 g</text>
      </g>
    </g>
    <text x="126" y="30" text-anchor="middle" font-size="22" class="anim-sparkle" style="transform-origin:126px 24px;">❓</text>
  </svg>`;
}

/** 🧮 Kapotte Rekenmachine: a calculator with most keys dimmed and a spanner */
export function machineIllustration() {
  const id = uid("mac");
  return `<svg id="${id}" class="kmg-hero-svg" viewBox="0 0 160 160" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Kapotte Rekenmachine">
    ${animWrap(id, `
      @keyframes ${id}_blink { 0%, 55%, 100% { opacity: 1; } 60%, 70% { opacity: 0.25; } }
      #${id} .digits { animation: ${id}_blink 3.4s steps(1, end) infinite; }
    `)}
    <g class="anim-float" style="transform-origin:78px 80px;">
      <rect x="32" y="14" width="96" height="132" rx="12" fill="#ffab91" stroke="#5d4037" stroke-width="4"/>
      <rect x="42" y="24" width="76" height="30" rx="6" fill="#dcedc8" stroke="#5d4037" stroke-width="3"/>
      <text class="digits" x="112" y="47" text-anchor="end" font-family="monospace" font-weight="900" font-size="22" fill="#33691e">42</text>
      <g stroke="#5d4037" stroke-width="2.5">
        <rect x="42" y="64" width="22" height="20" rx="5" fill="#fff"/><rect x="68" y="64" width="22" height="20" rx="5" fill="#d7ccc8" opacity="0.6"/><rect x="94" y="64" width="22" height="20" rx="5" fill="#fff"/>
        <rect x="42" y="90" width="22" height="20" rx="5" fill="#d7ccc8" opacity="0.6"/><rect x="68" y="90" width="22" height="20" rx="5" fill="#fff"/><rect x="94" y="90" width="22" height="20" rx="5" fill="#d7ccc8" opacity="0.6"/>
        <rect x="42" y="116" width="22" height="20" rx="5" fill="#d7ccc8" opacity="0.6"/><rect x="68" y="116" width="22" height="20" rx="5" fill="#d7ccc8" opacity="0.6"/><rect x="94" y="116" width="22" height="20" rx="5" fill="#ffe082"/>
      </g>
      <g font-family="sans-serif" font-weight="900" font-size="13" fill="#3e2723" text-anchor="middle">
        <text x="53" y="79">+9</text><text x="105" y="79">×2</text><text x="79" y="105">−3</text><text x="105" y="131">🎯</text>
      </g>
    </g>
    <g class="anim-wiggle" style="transform-origin:132px 120px;"><text x="132" y="134" text-anchor="middle" font-size="30">🔧</text></g>
    <text x="22" y="40" font-size="18" class="anim-sparkle" style="transform-origin:22px 34px;">⭐</text>
  </svg>`;
}

/** 🧱 Getallenbouwer: number cards snapping together into a bigger one */
export function bouwIllustration() {
  const id = uid("bou");
  return `<svg id="${id}" class="kmg-hero-svg" viewBox="0 0 160 160" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Getallenbouwer">
    ${animWrap(id, `
      @keyframes ${id}_drop { 0% { transform: translateY(-9px); } 55%, 100% { transform: translateY(0); } }
      #${id} .c1 { animation: ${id}_drop 2.6s ease-in-out infinite; }
      #${id} .c2 { animation: ${id}_drop 2.6s ease-in-out 0.25s infinite; }
    `)}
    <g stroke="#5d4037" stroke-width="3.5" stroke-linejoin="round" font-family="sans-serif" font-weight="900" text-anchor="middle">
      <g class="c1"><rect x="14" y="28" width="44" height="52" rx="8" fill="#fff59d"/><text x="36" y="64" font-size="30" fill="#3e2723" stroke="none">6</text></g>
      <g class="c2"><rect x="102" y="28" width="44" height="52" rx="8" fill="#b3e5fc"/><text x="124" y="64" font-size="30" fill="#3e2723" stroke="none">4</text></g>
      <text x="80" y="62" font-size="30" fill="#e64a19" stroke="none" class="anim-pulse" style="transform-origin:80px 54px;">×</text>
    </g>
    <path d="M 36 88 Q 36 104 70 108 M 124 88 Q 124 104 90 108" fill="none" stroke="#5d4037" stroke-width="3" stroke-linecap="round" stroke-dasharray="2 6"/>
    <g class="anim-float" style="transform-origin:80px 126px;">
      <rect x="44" y="100" width="72" height="50" rx="10" fill="#c8e6c9" stroke="#5d4037" stroke-width="4"/>
      <text x="80" y="137" text-anchor="middle" font-family="sans-serif" font-weight="900" font-size="30" fill="#1b5e20">24</text>
    </g>
    <text x="140" y="104" font-size="20" class="anim-sparkle" style="transform-origin:140px 98px;">✨</text>
  </svg>`;
}

/** Map of gameKey -> illustration generator function */
const ILLUSTRATIONS = {
  tafel: tafelIllustration,
  breuken: breukenIllustration,
  meten: metenIllustration,
  procenten: procentenIllustration,
  algebra: algebraIllustration,
  meetkunde: meetkundeIllustration,
  verhoudingen: verhoudingenIllustration,
  getallen: getallenIllustration,
  bliksem: bliksemIllustration,
  logica: logicaIllustration,
  code: codeIllustration,
  jacht: jachtIllustration,
  lezen: lezenIllustration,
  woorden: woordenIllustration,
  spelling: spellingIllustration,
  vlieg: vliegIllustration,
  sprong: sprongIllustration,
  toren: torenIllustration,
  kart: kartIllustration,
  doku: dokuIllustration,
  tactiek: tactiekIllustration,
  park: parkIllustration,
  duel: duelIllustration,
  weeg: weegIllustration,
  machine: machineIllustration,
  bouw: bouwIllustration,
  sterrenpad: sterrenpadIllustration,
  leerhapjes: leerhapjesIllustration,
  compete: competeIllustration,
  uitleg: uitlegIllustration,
  dashboard: dashboardIllustration,
  home: homeIllustration,
  rewards: rewardsIllustration,
};

/** Get the animated SVG string for a page/game key */
export function getGameIllustration(key) {
  const fn = ILLUSTRATIONS[key] || homeIllustration;
  return fn();
}
