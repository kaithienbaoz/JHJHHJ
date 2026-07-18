/**
 * Default Sticker Generator
 * Generates beautiful custom vector SVG stickers representing different sentiments
 */

export const DEFAULT_STICKER_GROUPS = [
  {
    id: 'grp_sad_cry',
    name: 'SAD & CRY',
    keywords: 'sad, cry, crying, tears, sorrow, depressed, painful, upset',
    size: 280,
    images: []
  },
  {
    id: 'grp_happy_laugh',
    name: 'HAPPY & LAUGH',
    keywords: 'happy, laugh, laughing, smile, smiling, haha, glad, cheerful, joyful, fun, funny',
    size: 280,
    images: []
  },
  {
    id: 'grp_angry',
    name: 'ANGRY & FURIOUS',
    keywords: 'angry, anger, mad, furious, hate, annoyed, irritate, trigger',
    size: 280,
    images: []
  },
  {
    id: 'grp_surprised',
    name: 'SURPRISED & SHOCKED',
    keywords: 'shock, shocked, surprise, surprised, wow, amazing, unbelievable, wonder',
    size: 280,
    images: []
  },
  {
    id: 'grp_love_cute',
    name: 'LOVELY & CUTE',
    keywords: 'love, hearts, heart, cute, lovely, sweet, kiss, adorable, kisses',
    size: 280,
    images: []
  },
  {
    id: 'grp_scared',
    name: 'SCARED & ANXIOUS',
    keywords: 'scared, afraid, fear, nervous, terrified, horror, panic, help',
    size: 280,
    images: []
  },
  {
    id: 'grp_disappointed',
    name: 'DISAPPOINTED & HELPLESS',
    keywords: 'disappointed, hopeless, tired, exhausted, bored, sigh, facepalm, fail, bad',
    size: 280,
    images: []
  },
  {
    id: 'grp_thinking',
    name: 'THINKING & SUSPICIOUS',
    keywords: 'think, thinking, wonder, suspect, logic, question, ask, why, what',
    size: 280,
    images: []
  },
  {
    id: 'grp_cool_success',
    name: 'COOL & SUCCESSFUL',
    keywords: 'cool, win, winner, success, rich, gold, champion, top, yes, wow',
    size: 280,
    images: []
  },
  {
    id: 'grp_sleepy',
    name: 'SLEEPY & LAZY',
    keywords: 'sleep, sleepy, tired, lazy, yawn, night, dream',
    size: 280,
    images: []
  }
];

function svgToBase64(svgMarkup: string): string {
  const base64 = typeof window !== 'undefined' 
    ? btoa(unescape(encodeURIComponent(svgMarkup.trim())))
    : Buffer.from(svgMarkup.trim()).toString('base64');
  return `data:image/svg+xml;base64,${base64}`;
}

export function generateInitialStickersForGroup(groupId: string): Array<{ id: string, name: string, base64: string }> {
  const list: string[] = [];

  switch (groupId) {
    case 'grp_sad_cry':
      // 1. Sad Teary Face (Classic Tear)
      list.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="45" fill="#fff4cc" stroke="#cc9600" stroke-width="3"/>
        <ellipse cx="36" cy="42" rx="4" ry="6" fill="#4a3e1b"/>
        <ellipse cx="64" cy="42" rx="4" ry="6" fill="#4a3e1b"/>
        <path d="M 28,33 Q 36,31 42,35" stroke="#4a3e1b" stroke-width="3" stroke-linecap="round" fill="none"/>
        <path d="M 72,33 Q 64,31 58,35" stroke="#4a3e1b" stroke-width="3" stroke-linecap="round" fill="none"/>
        <path d="M 38,70 Q 50,57 62,70" stroke="#4a3e1b" stroke-width="4" stroke-linecap="round" fill="none"/>
        <path d="M 32,48 L 32,67 Q 32,71 35,71 Q 38,71 38,67 Z" fill="#29b6f6"/>
      </svg>`);
      // 2. Weeping Out Loud
      list.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="45" fill="#ffe082" stroke="#ffa000" stroke-width="3"/>
        <path d="M 26,45 L 34,39 L 28,34 Z" fill="#4a3e1b"/>
        <path d="M 74,45 L 66,39 L 72,34 Z" fill="#4a3e1b"/>
        <path d="M 38,58 Q 50,75 62,58 Z" fill="#8d0000" stroke="#4a3e1b" stroke-width="2.5"/>
        <path d="M 30,48 L 30,76 Q 30,81 33,81 Q 36,81 36,76 Z" fill="#00bfff"/>
        <path d="M 70,48 L 70,76 Q 70,81 73,81 Q 76,81 76,76 Z" fill="#00bfff"/>
      </svg>`);
      // 3. Frowning Shy Blush
      list.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="45" fill="#fff4cc" stroke="#cc9600" stroke-width="3"/>
        <circle cx="28" cy="50" r="12" fill="#ff8a80" opacity="0.6"/>
        <circle cx="72" cy="50" r="12" fill="#ff8a80" opacity="0.6"/>
        <ellipse cx="36" cy="42" rx="3.5" ry="5.5" fill="#4a3e1b"/>
        <ellipse cx="64" cy="42" rx="3.5" ry="5.5" fill="#4a3e1b"/>
        <circle cx="34" cy="40" r="1.5" fill="#ffffff"/>
        <circle cx="62" cy="40" r="1.5" fill="#ffffff"/>
        <path d="M 42,66 Q 50,56 58,66" stroke="#4a3e1b" stroke-width="4.5" stroke-linecap="round" fill="none"/>
        <path d="M 25,55 H 29" stroke="#4a3e1b" stroke-width="2" stroke-linecap="round"/>
        <path d="M 71,55 H 75" stroke="#4a3e1b" stroke-width="2" stroke-linecap="round"/>
      </svg>`);
      // 4. Blue Gloomy Shadow
      list.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <defs>
          <linearGradient id="gloom_grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#4fc3f7"/>
            <stop offset="55%" stop-color="#fff4cc"/>
            <stop offset="100%" stop-color="#fff4cc"/>
          </linearGradient>
        </defs>
        <circle cx="50" cy="50" r="45" fill="url(#gloom_grad)" stroke="#0288d1" stroke-width="3"/>
        <ellipse cx="32" cy="48" rx="3.5" ry="5.5" fill="#2d3748"/>
        <ellipse cx="68" cy="48" rx="3.5" ry="5.5" fill="#2d3748"/>
        <path d="M 24,38 L 36,41" stroke="#2d3748" stroke-width="3" stroke-linecap="round"/>
        <path d="M 76,38 L 64,41" stroke="#2d3748" stroke-width="3" stroke-linecap="round"/>
        <path d="M 36,73 Q 50,60 64,73" stroke="#2d3748" stroke-width="4" stroke-linecap="round" fill="none"/>
        <path d="M 32,56 C 32,56 27,62 30,65 C 33,68 35,62 35,62 Z" fill="#00bfff"/>
      </svg>`);
      // 5. Quiet Sad Whimper
      list.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="45" fill="#ffe082" stroke="#ffa000" stroke-width="3"/>
        <ellipse cx="35" cy="44" rx="3" ry="5" fill="#4a3e1b"/>
        <ellipse cx="65" cy="44" rx="3" ry="5" fill="#4a3e1b"/>
        <path d="M 42,70 Q 50,62 58,70" stroke="#4a3e1b" stroke-width="4.5" stroke-linecap="round" fill="none"/>
        <circle cx="35" cy="58" r="8.5" fill="#ff8a80" opacity="0.5"/>
        <circle cx="65" cy="58" r="8.5" fill="#ff8a80" opacity="0.5"/>
        <path d="M 65,48 L 65,60 M 62,54 H 68" stroke="#00bfff" stroke-width="2" stroke-linecap="round" opacity="0.8"/>
      </svg>`);
      break;

    case 'grp_happy_laugh':
      // 1. Joy Tears (Crying Laughing)
      list.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="45" fill="#ffe082" stroke="#ffa000" stroke-width="3"/>
        <path d="M 24,43 L 34,39 L 26,34 Z" fill="#4a3e1b"/>
        <path d="M 76,43 L 66,39 L 74,34 Z" fill="#4a3e1b"/>
        <path d="M 28,52 C 28,75 72,75 72,52 Z" fill="#8d0000"/>
        <path d="M 40,64 C 45,59 55,59 60,64 Z" fill="#ff5252"/>
        <path d="M 28,52 Q 50,52 72,52 Z" stroke="#ffffff" stroke-width="4.5" fill="#ffffff"/>
        <path d="M 16,38 Q 10,46 16,50 Q 20,46 16,38 Z" fill="#29b6f6"/>
        <path d="M 84,38 Q 90,46 84,50 Q 80,46 84,38 Z" fill="#29b6f6"/>
      </svg>`);
      // 2. Star-Studded Smile
      list.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="45" fill="#ffca28" stroke="#ff8f00" stroke-width="3"/>
        <path d="M 34,44 L 37,36 L 45,36 L 39,41 L 41,49 L 34,44 L 27,49 L 29,41 L 23,36 L 31,36 Z" fill="#ffffff"/>
        <path d="M 66,44 L 69,36 L 77,36 L 71,41 L 73,49 L 66,44 L 59,49 L 61,41 L 55,36 L 63,36 Z" fill="#ffffff"/>
        <circle cx="28" cy="56" r="8" fill="#ff5252" opacity="0.6"/>
        <circle cx="72" cy="56" r="8" fill="#ff5252" opacity="0.6"/>
        <path d="M 32,58 Q 50,78 68,58" stroke="#3e2723" stroke-width="5" stroke-linecap="round" fill="none"/>
      </svg>`);
      // 3. Playful Tongue Wink
      list.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="45" fill="#ffe082" stroke="#ffa000" stroke-width="3"/>
        <circle cx="32" cy="42" r="7.5" fill="#2d3748"/>
        <circle cx="30" cy="39" r="2" fill="#ffffff"/>
        <path d="M 58,44 Q 66,36 74,44" stroke="#2d3748" stroke-width="4.5" stroke-linecap="round" fill="none"/>
        <path d="M 40,58 Q 50,55 60,58 Q 50,78 40,58" fill="#e53935" stroke="#2d3748" stroke-width="3"/>
        <line x1="50" y1="56" x2="50" y2="68" stroke="#2d3748" stroke-width="2.5"/>
      </svg>`);
      // 4. Beaming Squinting Smile
      list.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="45" fill="#ffd54f" stroke="#ffb300" stroke-width="3"/>
        <path d="M 24,44 Q 34,32 44,44" stroke="#4a3e1b" stroke-width="4.5" stroke-linecap="round" fill="none"/>
        <path d="M 56,44 Q 66,32 76,44" stroke="#4a3e1b" stroke-width="4.5" stroke-linecap="round" fill="none"/>
        <path d="M 28,52 C 28,52 35,80 50,80 C 65,80 72,52 72,52 Z" fill="#ff5252" stroke="#4a3e1b" stroke-width="3"/>
        <path d="M 28,52 Q 50,55 72,52" stroke="#ffffff" stroke-width="5" fill="none"/>
      </svg>`);
      // 5. Contented Blush Sparkle
      list.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="45" fill="#fff4cc" stroke="#cc9600" stroke-width="3"/>
        <path d="M 26,45 Q 34,51 42,45" stroke="#4a3e1b" stroke-width="4" stroke-linecap="round" fill="none"/>
        <path d="M 58,45 Q 66,51 74,45" stroke="#4a3e1b" stroke-width="4" stroke-linecap="round" fill="none"/>
        <path d="M 38,62 Q 50,72 62,62" stroke="#4a3e1b" stroke-width="4" stroke-linecap="round" fill="none"/>
        <circle cx="24" cy="54" r="7" fill="#ff8a80" opacity="0.65"/>
        <circle cx="76" cy="54" r="7" fill="#ff8a80" opacity="0.65"/>
        <polygon points="15,22 18,28 24,28 19,32 21,38 15,34 9,38 11,32 6,28 12,28" fill="#ffd54f"/>
        <polygon points="85,22 88,28 94,28 89,32 91,38 85,34 79,38 81,32 76,28 82,28" fill="#ffd54f"/>
      </svg>`);
      break;

    case 'grp_angry':
      // 1. Red Furious Face
      list.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="45" fill="#f44336" stroke="#b71c1c" stroke-width="3"/>
        <path d="M 24,34 L 44,42" stroke="#212121" stroke-width="5" stroke-linecap="round"/>
        <path d="M 76,34 L 56,42" stroke="#212121" stroke-width="5" stroke-linecap="round"/>
        <circle cx="34" cy="48" r="4" fill="#212121"/>
        <circle cx="66" cy="48" r="4" fill="#212121"/>
        <path d="M 30,70 Q 50,54 70,70" stroke="#212121" stroke-width="5.5" stroke-linecap="round" fill="none"/>
      </svg>`);
      // 2. Steaming Nose Face
      list.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="45" fill="#ff7043" stroke="#d84315" stroke-width="3"/>
        <path d="M 22,34 L 40,38" stroke="#37474f" stroke-width="5" stroke-linecap="round"/>
        <path d="M 78,34 L 60,38" stroke="#37474f" stroke-width="5" stroke-linecap="round"/>
        <ellipse cx="32" cy="46" rx="4" ry="5" fill="#37474f"/>
        <ellipse cx="68" cy="46" rx="4" ry="5" fill="#37474f"/>
        <path d="M 32,68 H 68" stroke="#37474f" stroke-width="5.5" stroke-linecap="round"/>
        <!-- Steam plumes from nostrils -->
        <path d="M 38,58 Q 30,62 34,68" stroke="#ffffff" stroke-width="3.5" stroke-linecap="round" fill="none" opacity="0.85"/>
        <path d="M 62,58 Q 70,62 66,68" stroke="#ffffff" stroke-width="3.5" stroke-linecap="round" fill="none" opacity="0.85"/>
      </svg>`);
      // 3. Exploding Head Anger
      list.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="45" fill="#f4511e" stroke="#bf360c" stroke-width="3"/>
        <path d="M 25,32 L 42,39" stroke="#212121" stroke-width="5" stroke-linecap="round"/>
        <path d="M 75,32 L 58,39" stroke="#212121" stroke-width="5" stroke-linecap="round"/>
        <ellipse cx="33" cy="45" rx="3.5" ry="5" fill="#212121"/>
        <ellipse cx="67" cy="45" rx="3.5" ry="5" fill="#212121"/>
        <rect x="36" y="62" width="28" height="10" rx="3" fill="#212121"/>
        <line x1="42" y1="62" x2="42" y2="72" stroke="#ffffff" stroke-width="2"/>
        <line x1="50" y1="62" x2="50" y2="72" stroke="#ffffff" stroke-width="2"/>
        <line x1="58" y1="62" x2="58" y2="72" stroke="#ffffff" stroke-width="2"/>
        <!-- Explosive fire design on forehead -->
        <polygon points="50,5 58,18 42,18" fill="#ffeb3b"/>
        <polygon points="35,10 45,22 30,20" fill="#ffa726"/>
        <polygon points="65,10 70,20 55,22" fill="#ffa726"/>
      </svg>`);
      // 4. Growling Veins face
      list.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="45" fill="#d84315" stroke="#3e2723" stroke-width="3"/>
        <path d="M 26,35 L 42,42" stroke="#3e2723" stroke-width="5" stroke-linecap="round"/>
        <path d="M 74,35 L 58,42" stroke="#3e2723" stroke-width="5" stroke-linecap="round"/>
        <circle cx="34" cy="50" r="3" fill="#3e2723"/>
        <circle cx="66" cy="50" r="3" fill="#3e2723"/>
        <!-- Growl jagged mouth -->
        <path d="M 32,68 L 38,62 L 44,70 L 50,62 L 56,70 L 62,62 L 68,68" stroke="#3e2723" stroke-width="4.5" stroke-linecap="round" fill="none"/>
        <!-- Angry red cross vein on forehead -->
        <path d="M 72,16 Q 76,20 74,24 M 76,18 Q 72,21 70,25" stroke="#ff1744" stroke-width="3" stroke-linecap="round"/>
      </svg>`);
      // 5. crossed Eyes Grumpy
      list.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="45" fill="#ff7043" stroke="#8d6e63" stroke-width="3"/>
        <!-- Eyes looking extreme left side -->
        <circle cx="28" cy="46" r="4" fill="#212121"/>
        <circle cx="60" cy="46" r="4" fill="#212121"/>
        <path d="M 20,38 L 36,42" stroke="#212121" stroke-width="4.5" stroke-linecap="round"/>
        <path d="M 72,38 L 56,42" stroke="#212121" stroke-width="4.5" stroke-linecap="round"/>
        <path d="M 40,70 Q 56,58 64,72" stroke="#212121" stroke-width="4.5" stroke-linecap="round" fill="none"/>
      </svg>`);
      break;

    case 'grp_surprised':
      // 1. Shocked Gasp
      list.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="45" fill="#ffe082" stroke="#ffa000" stroke-width="3"/>
        <circle cx="34" cy="38" r="9" fill="#ffffff" stroke="#212121" stroke-width="2.5"/>
        <circle cx="66" cy="38" r="9" fill="#ffffff" stroke="#212121" stroke-width="2.5"/>
        <circle cx="34" cy="38" r="3.5" fill="#212121"/>
        <circle cx="66" cy="38" r="3.5" fill="#212121"/>
        <ellipse cx="50" cy="68" rx="11" ry="15" fill="#212121"/>
        <path d="M 24,24 Q 34,20 40,26" stroke="#212121" stroke-width="3" stroke-linecap="round" fill="none"/>
        <path d="M 76,24 Q 66,20 60,26" stroke="#212121" stroke-width="3" stroke-linecap="round" fill="none"/>
      </svg>`);
      // 2. Mind Blown
      list.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <circle cx="50" cy="55" r="40" fill="#ffe082" stroke="#ffa000" stroke-width="3"/>
        <path d="M 30,28 Q 40,21 50,28 Q 60,21 70,28" stroke="#212121" stroke-width="2.5" fill="none"/>
        <!-- Mind cloud explosion top -->
        <path d="M 32,32 C 16,32 10,16 28,4 C 22,-16 52,-20 62,4 C 75,-10 92,2 88,22 L 78,32 Z" fill="#ff7043" opacity="0.95"/>
        <ellipse cx="40" cy="66" rx="4.5" ry="6.5" fill="#212121"/>
        <ellipse cx="60" cy="66" rx="4.5" ry="6.5" fill="#212121"/>
        <path d="M 44,80 Q 50,75 56,80" stroke="#212121" stroke-width="3" fill="none" stroke-linecap="round"/>
      </svg>`);
      // 3. Sparkly Starstruck amazement
      list.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="45" fill="#fff4cc" stroke="#cc9600" stroke-width="3"/>
        <polygon points="32,22 36,34 47,34 39,41 42,52 32,45 22,52 25,41 17,34 28,34" fill="#ffd54f" stroke="#ffa000" stroke-width="1.5"/>
        <polygon points="68,22 72,34 83,34 75,41 78,52 68,45 58,52 61,41 53,34 64,34" fill="#ffd54f" stroke="#ffa000" stroke-width="1.5"/>
        <ellipse cx="50" cy="68" rx="8" ry="11" fill="#212121"/>
        <circle cx="28" cy="60" r="7" fill="#ff8a80" opacity="0.6"/>
        <circle cx="72" cy="60" r="7" fill="#ff8a80" opacity="0.6"/>
      </svg>`);
      // 4. Bulging eyes sweating
      list.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="45" fill="#e0f7fa" stroke="#00acc1" stroke-width="3"/>
        <circle cx="33" cy="40" r="11" fill="#ffffff" stroke="#006064" stroke-width="2.5"/>
        <circle cx="67" cy="40" r="11" fill="#ffffff" stroke="#006064" stroke-width="2.5"/>
        <circle cx="33" cy="40" r="4" fill="#000000"/>
        <circle cx="67" cy="40" r="4" fill="#000000"/>
        <circle cx="50" cy="68" r="9" fill="#212121"/>
        <path d="M 12,28 Q 18,36 15,44" stroke="#00bfff" stroke-width="3" fill="none" stroke-linecap="round"/>
        <path d="M 88,28 Q 82,36 85,44" stroke="#00bfff" stroke-width="3" fill="none" stroke-linecap="round"/>
      </svg>`);
      // 5. Spiral Stunned Face
      list.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="45" fill="#ffe082" stroke="#ffa000" stroke-width="3"/>
        <path d="M 24,42 C 24,30 38,30 38,42 C 38,54 24,54 24,42" stroke="#212121" stroke-width="3" fill="none"/>
        <path d="M 62,42 C 62,30 76,30 76,42 C 76,54 62,54 62,42" stroke="#212121" stroke-width="3" fill="none"/>
        <ellipse cx="50" cy="70" rx="7" ry="10" fill="#212121" stroke="#ffa000" stroke-width="1.5"/>
        <polygon points="12,14 18,20 15,22" fill="#ffd54f"/>
        <polygon points="88,14 82,20 85,22" fill="#ffd54f"/>
      </svg>`);
      break;

    case 'grp_love_cute':
      // 1. Heart Eyes
      list.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="45" fill="#fecd1a" stroke="#d5a100" stroke-width="3"/>
        <path d="M 33,46 C 33,46 25,26 12,32 C -2,38 2,62 33,80 C 64,62 68,38 54,32 C 41,26 33,46 33,46 Z" fill="#ff2e63" transform="scale(0.55) translate(18, 22)"/>
        <path d="M 33,46 C 33,46 25,26 12,32 C -2,38 2,62 33,80 C 64,62 68,38 54,32 C 41,26 33,46 33,46 Z" fill="#ff2e63" transform="scale(0.55) translate(96, 22)"/>
        <path d="M 36,68 Q 50,78 64,68" stroke="#3e2723" stroke-width="5" stroke-linecap="round" fill="none"/>
      </svg>`);
      // 2. Blowing Kiss Face
      list.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="45" fill="#fecd1a" stroke="#d5a100" stroke-width="3"/>
        <path d="M 34,44 L 24,39 L 34,34" stroke="#3e2723" stroke-width="4.5" stroke-linecap="round" fill="none"/>
        <ellipse cx="66" cy="38" rx="3" ry="5.5" fill="#3e2723"/>
        <path d="M 38,65 Q 44,61 41,56 Q 38,51 34,56 Q 30,61 38,65 Z" fill="#ff2e63" stroke="#212121" stroke-width="1.5"/>
        <!-- Mini red heart kiss floating off -->
        <path d="M 75,68 C 75,68 68,52 56,57 C 45,62 48,76 75,95 C 102,76 105,62 94,57 C 82,52 75,68 75,68 Z" fill="#ff2e63" transform="scale(0.28) translate(154, 88)"/>
      </svg>`);
      // 3. Cute Blush Catmouth \w/
      list.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="45" fill="#fffff0" stroke="#fce4ec" stroke-width="3"/>
        <circle cx="28" cy="54" r="10" fill="#f48fb1" opacity="0.6"/>
        <circle cx="72" cy="54" r="10" fill="#f48fb1" opacity="0.6"/>
        <ellipse cx="36" cy="42" rx="4" ry="6" fill="#4e342e"/>
        <ellipse cx="64" cy="42" rx="4" ry="6" fill="#4e342e"/>
        <circle cx="34" cy="39" r="1.5" fill="#ffffff"/>
        <circle cx="62" cy="39" r="1.5" fill="#ffffff"/>
        <path d="M 42,60 Q 46,65 50,60 Q 54,65 58,60" stroke="#4e342e" stroke-width="4" stroke-linecap="round" fill="none"/>
      </svg>`);
      // 4. Warm Loving Squint
      list.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="45" fill="#fff4cc" stroke="#cc9600" stroke-width="3"/>
        <path d="M 24,44 Q 34,36 44,44" stroke="#4a3e1b" stroke-width="4.5" stroke-linecap="round" fill="none"/>
        <path d="M 56,44 Q 66,36 76,44" stroke="#4a3e1b" stroke-width="4.5" stroke-linecap="round" fill="none"/>
        <path d="M 36,64 Q 50,76 64,64" stroke="#4a3e1b" stroke-width="4.5" stroke-linecap="round" fill="none"/>
        <circle cx="26" cy="54" r="7" fill="#ff8a80" opacity="0.7"/>
        <circle cx="74" cy="54" r="7" fill="#ff8a80" opacity="0.7"/>
        <!-- Small floating hearts above head -->
        <path d="M 12,25 C 12,25 9,15 2,17 C -5,20 -3,32 12,41 C 27,32 29,20 22,17 C 15,15 12,25 12,25 Z" fill="#ff4081" transform="scale(0.35) translate(40, -10)"/>
        <path d="M 12,25 C 12,25 9,15 2,17 C -5,20 -3,32 12,41 C 27,32 29,20 22,17 C 15,15 12,25 12,25 Z" fill="#ff4081" transform="scale(0.35) translate(190, -10)"/>
      </svg>`);
      // 5. Heart Blush Smile
      list.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="45" fill="#fecd1a" stroke="#d5a100" stroke-width="3"/>
        <circle cx="33" cy="40" r="5" fill="#212121"/>
        <circle cx="67" cy="40" r="5" fill="#212121"/>
        <circle cx="31" cy="38" r="1.5" fill="#ffffff"/>
        <circle cx="65" cy="38" r="1.5" fill="#ffffff"/>
        <path d="M 38,62 Q 50,72 62,62" stroke="#212121" stroke-width="4" stroke-linecap="round" fill="none"/>
        <!-- Heart-shaped blush cheeks -->
        <path d="M 15,20 C 15,20 12,12 6,14 C 2,16 3,25 15,32 C 27,25 28,16 24,14 C 18,12 15,20 15,20 Z" fill="#ff2e63" transform="scale(0.55) translate(18, 75)"/>
        <path d="M 15,20 C 15,20 12,12 6,14 C 2,16 3,25 15,32 C 27,25 28,16 24,14 C 18,12 15,20 15,20 Z" fill="#ff2e63" transform="scale(0.55) translate(108, 75)"/>
      </svg>`);
      break;

    case 'grp_scared':
      // 1. Pale Forehead Shiver
      list.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <defs>
          <linearGradient id="scared_face_grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#29b6f6"/>
            <stop offset="65%" stop-color="#ffe082"/>
            <stop offset="100%" stop-color="#ffe082"/>
          </linearGradient>
        </defs>
        <circle cx="50" cy="50" r="45" fill="url(#scared_face_grad)" stroke="#ff9800" stroke-width="3"/>
        <circle cx="34" cy="40" r="7.5" fill="#ffffff" stroke="#212121" stroke-width="2"/>
        <circle cx="66" cy="40" r="7.5" fill="#ffffff" stroke="#212121" stroke-width="2"/>
        <circle cx="34" cy="40" r="2.5" fill="#212121"/>
        <circle cx="66" cy="40" r="2.5" fill="#212121"/>
        <rect x="34" y="62" width="32" height="13" rx="4" fill="#37474f" stroke="#212121" stroke-width="2"/>
        <line x1="40" y1="62" x2="40" y2="75" stroke="#ffffff" stroke-width="1.5"/>
        <line x1="48" y1="62" x2="48" y2="75" stroke="#ffffff" stroke-width="1.5"/>
        <line x1="56" y1="62" x2="56" y2="75" stroke="#ffffff" stroke-width="1.5"/>
      </svg>`);
      // 2. Munch Screaming Face
      list.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="45" fill="#80deea" stroke="#00838f" stroke-width="3"/>
        <ellipse cx="34" cy="38" rx="8" ry="11" fill="#ffffff" stroke="#005b64" stroke-width="2"/>
        <ellipse cx="66" cy="38" rx="8" ry="11" fill="#ffffff" stroke="#005b64" stroke-width="2"/>
        <circle cx="34" cy="38" r="3.5" fill="#000000"/>
        <circle cx="66" cy="38" r="3.5" fill="#000000"/>
        <ellipse cx="50" cy="68" rx="10" ry="17" fill="#00363a"/>
        <!-- Yellow emoji hands clutching cheeks -->
        <path d="M 12,65 Q 18,48 24,56 C 26,62 18,74 12,65 Z" fill="#b2ebf2" stroke="#005b64" stroke-width="1.5"/>
        <path d="M 88,65 Q 82,48 76,56 C 74,62 82,74 88,65 Z" fill="#b2ebf2" stroke="#005b64" stroke-width="1.5"/>
      </svg>`);
      // 3. Anxious Chattering Teeth
      list.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="45" fill="#ffe082" stroke="#ffa000" stroke-width="3"/>
        <path d="M 28,34 Q 36,28 42,34" stroke="#212121" stroke-width="4" stroke-linecap="round" fill="none"/>
        <path d="M 72,34 Q 64,28 58,34" stroke="#212121" stroke-width="4" stroke-linecap="round" fill="none"/>
        <ellipse cx="35" cy="45" rx="3" ry="5.5" fill="#212121"/>
        <ellipse cx="65" cy="45" rx="3" ry="5.5" fill="#212121"/>
        <!-- Jagged shivering teeth line -->
        <path d="M 30,68 L 35,64 L 40,70 L 45,64 L 50,70 L 55,64 L 60,70 L 65,64 L 70,68" stroke="#212121" stroke-width="4" stroke-linecap="round" fill="none"/>
        <path d="M 78,28 C 78,28 73,36 73,40 C 73,44 78,46 78,46 C 78,46 83,44 83,40 C 83,36 78,28 78,28 Z" fill="#29b6f6"/>
      </svg>`);
      // 4. Peeking through Hands scaredy face
      list.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="45" fill="#ffe082" stroke="#ffa000" stroke-width="3"/>
        <ellipse cx="34" cy="40" rx="9" ry="12" fill="#ffffff" stroke="#212121" stroke-width="2.5"/>
        <ellipse cx="66" cy="40" rx="9" ry="12" fill="#ffffff" stroke="#212121" stroke-width="2.5"/>
        <circle cx="34" cy="40" r="3.5" fill="#212121"/>
        <circle cx="66" cy="40" r="3.5" fill="#212121"/>
        <path d="M 38,66 Q 50,56 62,66" stroke="#212121" stroke-width="4.5" stroke-linecap="round" fill="none"/>
        <!-- Hands peeking lines covering eyes -->
        <path d="M 15,62 L 32,44 C 36,44 38,50 36,54 Z" fill="#ffe082" stroke="#ffa000" stroke-width="2"/>
        <path d="M 85,62 L 68,44 C 64,44 62,50 64,54 Z" fill="#ffe082" stroke="#ffa000" stroke-width="2"/>
      </svg>`);
      // 5. Frozen Ice Shaking Face
      list.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="45" fill="#e0f7fa" stroke="#00acc1" stroke-width="3"/>
        <circle cx="34" cy="42" r="4" fill="#006064"/>
        <circle cx="66" cy="42" r="4" fill="#006064"/>
        <path d="M 28,32 L 38,36" stroke="#006064" stroke-width="4" stroke-linecap="round"/>
        <path d="M 72,32 L 62,36" stroke="#006064" stroke-width="4" stroke-linecap="round"/>
        <rect x="34" y="62" width="32" height="7" rx="3" fill="#006064" stroke="#00acc1" stroke-width="2" opacity="0.95"/>
        <!-- Ice crystal overlay spikes -->
        <polygon points="10,42 22,50 14,56" fill="#80deea" stroke="#00acc1" stroke-width="1"/>
        <polygon points="90,42 78,50 86,56" fill="#80deea" stroke="#00acc1" stroke-width="1"/>
      </svg>`);
      break;

    case 'grp_disappointed':
      // 1. Palm-on-Face Facepalm
      list.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="45" fill="#fff1b8" stroke="#f5b041" stroke-width="3"/>
        <ellipse cx="32" cy="42" rx="2.5" ry="4" fill="#5d4037"/>
        <path d="M 38,68 Q 50,60 62,68" stroke="#5d4037" stroke-width="3.5" stroke-linecap="round" fill="none"/>
        <ellipse cx="68" cy="45" rx="2.5" ry="4" fill="#5d4037" opacity="0.3"/>
        <!-- Facepalm hand overlaid on forehead and right eye -->
        <path d="M 52,82 L 72,44 A 6,6 0 0,0 62,36 L 48,64 Z" fill="#d7ccc8" stroke="#5d4037" stroke-width="2.5"/>
      </svg>`);
      // 2. Melting Droop Face
      list.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <path d="M 12,65 Q 16,56 22,54 Q 32,52 36,65 L 42,42 Q 52,38 68,52 Q 78,54 84,65 C 95,74 95,92 50,92 C 5,92 1,74 12,65 Z" fill="#ffe082" stroke="#ffa000" stroke-width="3"/>
        <ellipse cx="38" cy="56" rx="3.5" ry="5.5" fill="#4e342e"/>
        <ellipse cx="62" cy="56" rx="3.5" ry="5.5" fill="#4e342e"/>
        <path d="M 40,74 Q 50,68 60,74" stroke="#4e342e" stroke-width="3.5" stroke-linecap="round" fill="none"/>
      </svg>`);
      // 3. Heavy Sigh Steam
      list.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="45" fill="#ffe082" stroke="#ffa000" stroke-width="3"/>
        <path d="M 24,42 Q 32,46 40,42" stroke="#4a3e1b" stroke-width="3.5" stroke-linecap="round" fill="none"/>
        <path d="M 60,42 Q 68,46 76,42" stroke="#4a3e1b" stroke-width="3.5" stroke-linecap="round" fill="none"/>
        <circle cx="50" cy="62" r="5" fill="#212121"/>
        <!-- Steam sigh bubble -->
        <path d="M 54,64 C 54,64 64,58 70,62 C 76,66 65,74 58,68 Q 54,64 54,64" fill="#ffffff" stroke="#b0bec5" stroke-width="1.5" opacity="0.85"/>
      </svg>`);
      // 4. Exhausted Dead Eyes
      list.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="45" fill="#eee" stroke="#9e9e9e" stroke-width="3"/>
        <line x1="26" y1="42" x2="40" y2="42" stroke="#424242" stroke-width="4.5" stroke-linecap="round"/>
        <line x1="60" y1="42" x2="74" y2="42" stroke="#424242" stroke-width="4.5" stroke-linecap="round"/>
        <!-- Sad droopy tongue hanging down -->
        <path d="M 44,60 C 44,60 40,78 50,78 C 60,78 56,60 50,60" fill="#e57373" stroke="#424242" stroke-width="2.5"/>
        <path d="M 38,60 Q 50,56 62,60" stroke="#424242" stroke-width="3" fill="none"/>
        <path d="M 72,28 C 72,28 68,34 68,38 C 68,42 72,44 72,44 C 72,44 76,42 76,38 C 76,34 72,28 72,28 Z" fill="#90caf9"/>
      </svg>`);
      // 5. Grey Drooping Weariness
      list.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="45" fill="#cfd8dc" stroke="#546e7a" stroke-width="3"/>
        <ellipse cx="34" cy="44" rx="3.5" ry="5.5" fill="#37474f"/>
        <ellipse cx="66" cy="44" rx="3.5" ry="5.5" fill="#37474f"/>
        <path d="M 38,68 Q 50,58 62,68" stroke="#37474f" stroke-width="4.5" stroke-linecap="round" fill="none"/>
        <path d="M 30,52 C 30,52 26,58 28,60 Q 30,62 31,58 Z" fill="#90caf9"/>
      </svg>`);
      break;

    case 'grp_thinking':
      // 1. Thinking Chin Hand
      list.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="45" fill="#ffe082" stroke="#ffa000" stroke-width="3"/>
        <ellipse cx="34" cy="42" rx="3.5" ry="6" fill="#4e342e"/>
        <circle cx="64" cy="37" r="4.5" fill="#4e342e"/>
        <path d="M 26,26 Q 34,22 40,28" stroke="#4e342e" stroke-width="3.5" fill="none" stroke-linecap="round"/>
        <path d="M 54,23 Q 62,19 68,25" stroke="#4e342e" stroke-width="3.5" fill="none" stroke-linecap="round"/>
        <path d="M 36,65 L 64,65" stroke="#4e342e" stroke-width="4.5" stroke-linecap="round"/>
        <!-- Hand on chin representation -->
        <path d="M 44,65 L 44,78 Q 44,83 48,83 L 56,83" stroke="#bcaaa4" stroke-width="4.5" stroke-linecap="round" fill="none"/>
      </svg>`);
      // 2. Skeptical Side-Eye
      list.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="45" fill="#fff4cc" stroke="#cc9600" stroke-width="3"/>
        <ellipse cx="32" cy="45" rx="8" ry="11" fill="#ffffff" stroke="#4a3e1b" stroke-width="2.5"/>
        <ellipse cx="68" cy="45" rx="8" ry="5" fill="#ffffff" stroke="#4a3e1b" stroke-width="2.5"/>
        <!-- Pupils looking far right -->
        <circle cx="37" cy="45" r="3.5" fill="#2d3748"/>
        <circle cx="70" cy="45" r="2.5" fill="#2d3748"/>
        <line x1="22" y1="31" x2="40" y2="34" stroke="#4a3e1b" stroke-width="4" stroke-linecap="round"/>
        <line x1="74" y1="34" x2="60" y2="34" stroke="#4a3e1b" stroke-width="4" stroke-linecap="round"/>
        <line x1="34" y1="68" x2="66" y2="68" stroke="#4a3e1b" stroke-width="4.5" stroke-linecap="round"/>
      </svg>`);
      // 3. Monocle Intellectual
      list.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="45" fill="#ffe082" stroke="#ffa000" stroke-width="3"/>
        <circle cx="34" cy="42" r="5" fill="#212121"/>
        <circle cx="66" cy="42" r="7" fill="#212121"/>
        <!-- Monocle frame -->
        <circle cx="66" cy="42" r="11" fill="none" stroke="#cfd8dc" stroke-width="3.5"/>
        <line x1="77" y1="42" x2="88" y2="52" stroke="#cfd8dc" stroke-width="2.5"/>
        <path d="M 40,68 Q 50,62 60,68" stroke="#212121" stroke-width="4" stroke-linecap="round" fill="none"/>
        <path d="M 28,32 Q 36,28 42,32" stroke="#212121" stroke-width="3" stroke-linecap="round" fill="none"/>
      </svg>`);
      // 4. Spark of Inspiration (Eureka!)
      list.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="45" fill="#ffca28" stroke="#ff8f00" stroke-width="3"/>
        <circle cx="32" cy="44" r="5" fill="#212121"/>
        <circle cx="68" cy="44" r="5" fill="#212121"/>
        <path d="M 36,65 Q 50,78 64,65" stroke="#212121" stroke-width="4.5" stroke-linecap="round" fill="none"/>
        <!-- Glowing lightbulb near forehead -->
        <g transform="translate(68, 5) scale(0.28)">
          <path d="M 50,10 C 30,10 25,28 25,45 C 25,58 36,68 40,74 L 40,84 L 60,84 L 60,74 C 64,68 75,58 75,45 C 75,28 70,10 50,10 Z" fill="#ffd54f" stroke="#ffb300" stroke-width="3.5"/>
          <line x1="50" y1="28" x2="50" y2="58" stroke="#f57c00" stroke-width="4"/>
          <line x1="40" y1="43" x2="60" y2="43" stroke="#f57c00" stroke-width="4"/>
        </g>
      </svg>`);
      // 5. Confusion Swirl Head
      list.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="45" fill="#ffe082" stroke="#ffa000" stroke-width="3"/>
        <path d="M 26,44 Q 30,36 38,42" stroke="#212121" stroke-width="3.5" fill="none"/>
        <circle cx="32" cy="48" r="4" fill="#212121"/>
        <!-- Swirling spiral right eye -->
        <path d="M 66,42 C 66,35 74,35 74,42 C 74,48 68,48 68,42 C 68,39 71,39 71,42" stroke="#212121" stroke-width="2.5" fill="none"/>
        <path d="M 40,70 Q 50,62 58,70" stroke="#212121" stroke-width="4" stroke-linecap="round" fill="none"/>
        <!-- Question mark above head -->
        <text x="50" y="24" font-family="sans-serif" font-weight="900" font-size="16" fill="#673ab7">?</text>
      </svg>`);
      break;

    case 'grp_cool_success':
      // 1. Sleek Sunglasses Smirk
      list.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="45" fill="#ffca28" stroke="#ff8f00" stroke-width="3"/>
        <path d="M 22,40 L 44,40 C 44,40 44,54 33,54 C 22,54 22,40 22,40 Z" fill="#212121" stroke="#000" stroke-width="2"/>
        <path d="M 56,40 L 78,40 C 78,40 78,54 67,54 C 56,54 56,40 56,40 Z" fill="#212121" stroke="#000" stroke-width="2"/>
        <line x1="44" y1="40" x2="56" y2="40" stroke="#212121" stroke-width="4.5"/>
        <path d="M 38,68 Q 50,78 64,66" stroke="#212121" stroke-width="4" stroke-linecap="round" fill="none"/>
        <line x1="26" y1="43" x2="34" y2="47" stroke="#ffffff" stroke-width="1.5" opacity="0.8"/>
        <line x1="60" y1="43" x2="68" y2="47" stroke="#ffffff" stroke-width="1.5" opacity="0.8"/>
      </svg>`);
      // 2. Confident Wink & Spark
      list.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="45" fill="#ffe082" stroke="#ffa000" stroke-width="3"/>
        <polygon points="34,28 37,38 46,38 39,44 41,54 34,48 27,51 29,42 22,38 31,38" fill="#ffd54f" stroke="#ffa000" stroke-width="1.5"/>
        <path d="M 58,44 Q 66,35 74,44" stroke="#212121" stroke-width="4.5" stroke-linecap="round" fill="none"/>
        <path d="M 38,68 Q 50,78 64,68" stroke="#212121" stroke-width="4.5" stroke-linecap="round" fill="none"/>
        <circle cx="34" cy="56" r="6" fill="#ff5252" opacity="0.5"/>
        <circle cx="66" cy="56" r="6" fill="#ff5252" opacity="0.5"/>
      </svg>`);
      // 3. Winner Rays proud smile
      list.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <!-- Shine ray lines background -->
        <g stroke="#ffca28" stroke-width="2.5" stroke-dasharray="4,4" opacity="0.65">
          <line x1="50" y1="10" x2="50" y2="90"/>
          <line x1="10" y1="50" x2="90" y2="50"/>
          <line x1="20" y1="20" x2="80" y2="80"/>
          <line x1="20" y1="80" x2="80" y2="20"/>
        </g>
        <circle cx="50" cy="50" r="35" fill="#ffe082" stroke="#ffa000" stroke-width="3"/>
        <circle cx="40" cy="44" r="3.5" fill="#212121"/>
        <circle cx="60" cy="44" r="3.5" fill="#212121"/>
        <path d="M 38,58 Q 50,72 62,58" stroke="#212121" stroke-width="4" stroke-linecap="round" fill="none"/>
      </svg>`);
      // 4. Rich Green Dollar Face
      list.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="45" fill="#b9f6ca" stroke="#00c853" stroke-width="3"/>
        <text x="33" y="48" font-family="sans-serif" font-weight="900" font-size="20" fill="#00c853" text-anchor="middle">$</text>
        <text x="67" y="48" font-family="sans-serif" font-weight="900" font-size="20" fill="#00c853" text-anchor="middle">$</text>
        <path d="M 36,62 Q 50,72 64,62" stroke="#004d40" stroke-width="4.5" stroke-linecap="round" fill="none"/>
        <!-- Dollar bill green tongue -->
        <rect x="44" y="65" width="12" height="15" rx="2" fill="#00e676" stroke="#004d40" stroke-width="2"/>
        <text x="50" y="77" font-family="sans-serif" font-weight="900" font-size="10" fill="#004d40" text-anchor="middle">$</text>
      </svg>`);
      // 5. Smug confident grin
      list.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="45" fill="#ffe082" stroke="#ffa000" stroke-width="3"/>
        <path d="M 28,34 Q 36,28 42,32" stroke="#212121" stroke-width="4.5" stroke-linecap="round" fill="none"/>
        <path d="M 72,34 Q 64,28 58,32" stroke="#212121" stroke-width="4.5" stroke-linecap="round" fill="none"/>
        <ellipse cx="34" cy="44" rx="3.5" ry="5.5" fill="#212121"/>
        <ellipse cx="66" cy="44" rx="3.5" ry="5.5" fill="#212121"/>
        <path d="M 34,64 Q 50,74 66,58" stroke="#212121" stroke-width="4" stroke-linecap="round" fill="none"/>
      </svg>`);
      break;

    case 'grp_sleepy':
      // 1. Snore Bubble Face (zzZ)
      list.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="45" fill="#fff4cc" stroke="#cc9600" stroke-width="3"/>
        <path d="M 26,46 Q 34,50 42,46" stroke="#4a3e1b" stroke-width="3.5" fill="none" stroke-linecap="round"/>
        <path d="M 58,46 Q 66,50 74,46" stroke="#4a3e1b" stroke-width="3.5" fill="none" stroke-linecap="round"/>
        <!-- Expanding blue sleep snot bubble -->
        <circle cx="40" cy="62" r="10" fill="#80deea" stroke="#00acc1" stroke-width="1.5" opacity="0.8"/>
        <path d="M 44,58 A 4,4 0 0,1 48,62" stroke="#ffffff" stroke-width="1.5" fill="none"/>
        <text x="75" y="28" font-family="sans-serif" font-weight="900" font-size="14" fill="#673ab7">Z</text>
        <text x="85" y="20" font-family="sans-serif" font-weight="900" font-size="10" fill="#673ab7">z</text>
      </svg>`);
      // 2. Yawning Hand Cover Face
      list.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="45" fill="#ffe082" stroke="#ffa000" stroke-width="3"/>
        <path d="M 24,44 Q 32,36 36,44" stroke="#212121" stroke-width="4" stroke-linecap="round" fill="none"/>
        <path d="M 64,44 Q 68,36 76,44" stroke="#212121" stroke-width="4" stroke-linecap="round" fill="none"/>
        <circle cx="50" cy="62" r="7.5" fill="#212121"/>
        <!-- Hand covering cute small yawn -->
        <path d="M 42,75 Q 46,60 52,62 C 54,64 48,78 44,78" fill="#ffe082" stroke="#ffa000" stroke-width="2"/>
      </svg>`);
      // 3. Cozy Snooze Zzz
      list.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="45" fill="#b2dfdb" stroke="#00796b" stroke-width="3"/>
        <path d="M 24,48 Q 32,53 40,48" stroke="#004d40" stroke-width="4" stroke-linecap="round" fill="none"/>
        <path d="M 60,48 Q 68,53 76,48" stroke="#004d40" stroke-width="4" stroke-linecap="round" fill="none"/>
        <path d="M 44,65 Q 50,70 56,65" stroke="#004d40" stroke-width="3.5" stroke-linecap="round" fill="none"/>
        <circle cx="25" cy="56" r="6" fill="#80cbc4" opacity="0.6"/>
        <circle cx="75" cy="56" r="6" fill="#80cbc4" opacity="0.6"/>
        <text x="74" y="32" font-family="sans-serif" font-weight="900" font-size="16" fill="#004d40">Z</text>
        <text x="84" y="24" font-family="sans-serif" font-weight="900" font-size="12" fill="#004d40">z</text>
      </svg>`);
      // 4. Drooling Slumber Face
      list.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="45" fill="#fff4cc" stroke="#cc9600" stroke-width="3"/>
        <path d="M 24,44 Q 32,48 40,42" stroke="#4a3e1b" stroke-width="4" stroke-linecap="round" fill="none"/>
        <path d="M 60,42 Q 68,48 76,44" stroke="#4a3e1b" stroke-width="4" stroke-linecap="round" fill="none"/>
        <ellipse cx="44" cy="62" rx="4" ry="6" fill="#2d3748"/>
        <!-- Saliva drool bubble sliding down the chin -->
        <path d="M 44,66 L 44,78 C 44,81 48,81 48,78 Z" fill="#29b6f6"/>
      </svg>`);
      // 5. Heavy Fatigue Red Eyes
      list.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="45" fill="#eee" stroke="#9e9e9e" stroke-width="3"/>
        <!-- Eyes with heavy red circles underneath -->
        <circle cx="34" cy="44" r="9" fill="none" stroke="#ef5350" stroke-width="2.5"/>
        <circle cx="66" cy="44" r="9" fill="none" stroke="#ef5350" stroke-width="2.5"/>
        <line x1="28" y1="44" x2="40" y2="44" stroke="#212121" stroke-width="3"/>
        <line x1="60" y1="44" x2="72" y2="44" stroke="#212121" stroke-width="3"/>
        <path d="M 42,66 Q 50,62 58,66" stroke="#212121" stroke-width="3.5" stroke-linecap="round" fill="none"/>
        <path d="M 30,52 Q 34,50 38,52" stroke="#ef5350" stroke-width="2" fill="none"/>
        <path d="M 62,52 Q 66,50 70,52" stroke="#ef5350" stroke-width="2" fill="none"/>
      </svg>`);
      break;

    default:
      break;
  }

  return list.map((markup, sIdx) => ({
    id: `${groupId}_def_${sIdx + 1}`,
    name: `Mặc định ${sIdx + 1}`,
    base64: svgToBase64(markup)
  }));
}

export function populateDefaultStickers(stickerGroups: Array<any>): Array<any> {
  return stickerGroups.map(group => {
    const defaults = generateInitialStickersForGroup(group.id);
    const existingImages = group.images || [];
    
    // Filter out old default stickers to force using the beautiful new facial icons
    const customImages = existingImages.filter((img: any) => !img.id.includes('_def_'));
    
    // Return all beautiful faces first, then custom stickers added by user
    return {
      ...group,
      images: [...defaults, ...customImages]
    };
  });
}
