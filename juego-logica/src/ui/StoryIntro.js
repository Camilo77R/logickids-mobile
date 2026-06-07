/**
 * StoryIntro - Cinematic comic-style intro for the story mode.
 */

const STYLE_ID = 'story-intro-styles';

function ensureStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const s = document.createElement('style');
  s.id = STYLE_ID;
  s.textContent = `
    .story-intro-overlay {
      position: fixed; inset: 0; z-index: 2147483647;
      display: flex; align-items: center; justify-content: center;
      font-family: 'Outfit', 'Inter', sans-serif;
    }
    .story-intro-overlay.hidden { display: none; }
    .story-panel {
      position: relative; width: 100%; height: 100vh;
      display: flex; flex-direction: column;
      align-items: center; justify-content: center;
      text-align: center;
      background-size: cover; background-position: center;
      animation: storyFadeIn 0.8s ease;
    }
    .story-panel::before {
      content: ''; position: absolute; inset: 0;
      background: linear-gradient(180deg, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.3) 50%, rgba(0,0,0,0.7) 100%);
    }
    @keyframes storyFadeIn {
      0% { opacity: 0; }
      100% { opacity: 1; }
    }
    .story-content {
      position: relative; z-index: 1;
      max-width: 640px; width: 90%;
      padding: 40px 30px;
    }
    .story-chapter {
      font-size: 0.7rem; letter-spacing: 5px;
      color: #00ffff; text-transform: uppercase;
      margin-bottom: 20px;
      text-shadow: 0 0 20px rgba(0,0,0,0.8);
    }
    .story-title {
      font-size: 2.4rem; font-weight: 900;
      color: #fff; margin-bottom: 20px;
      text-shadow: 0 0 40px rgba(0,0,0,0.9), 0 0 20px rgba(0,255,255,0.3);
    }
    .story-text {
      font-size: 1.1rem; line-height: 1.9;
      color: rgba(255,255,255,0.85);
      margin-bottom: 35px;
      text-shadow: 0 0 20px rgba(0,0,0,0.8);
    }
    .story-highlight {
      color: #ffde6e; font-weight: 700;
    }
    .story-continue {
      background: rgba(0,255,255,0.15);
      border: 2px solid #00ffff;
      border-radius: 50px;
      color: #fff;
      font-family: 'Outfit', sans-serif;
      font-size: 1rem; font-weight: 700;
      padding: 14px 48px;
      cursor: pointer;
      letter-spacing: 3px;
      transition: all 0.3s;
      text-transform: uppercase;
      backdrop-filter: blur(4px);
      box-shadow: 0 0 30px rgba(0,255,255,0.15);
    }
    .story-continue:hover {
      background: rgba(0,255,255,0.3);
      box-shadow: 0 0 50px rgba(0,255,255,0.3);
      transform: scale(1.03);
    }
    .story-progress {
      position: absolute; bottom: 40px; left: 50%; transform: translateX(-50%);
      display: flex; gap: 10px; z-index: 1;
    }
    .story-dot {
      width: 10px; height: 10px; border-radius: 50%;
      background: rgba(255,255,255,0.25);
      transition: all 0.3s;
      border: 1px solid rgba(255,255,255,0.1);
    }
    .story-dot.active { background: #00ffff; box-shadow: 0 0 15px #00ffff; border-color: #00ffff; }
  `;
  document.head.appendChild(s);
}

const CHAPTERS = [
  {
    chapter: 'Capítulo 1',
    image: '/images/story/story-1.jpg',
    title: 'El mundo está en peligro',
    text: 'El espacio, las cocinas, los jardines, las lunas heladas y las obras de la galaxia están amenazados. <span class="story-highlight">Basura cósmica, plantas con sed, rescates y más</span> necesitan ayuda urgentemente. ¡Tú eres la única esperanza!',
  },
  {
    chapter: 'Capítulo 2',
    image: '/images/story/story-2.jpg',
    title: 'Tu robot te necesita',
    text: 'El Dr. Cables te entrega un robot por misión. Cada robot tiene piezas únicas que tú deberás elegir y ensamblar <span class="story-highlight">en el orden correcto</span>. Piensa bien qué pieza va primero, y protege el mundo.',
  },
];

export class StoryIntro {
  constructor(container) {
    ensureStyles();
    this.container = container;
    this._overlay = null;
    this._currentStep = 0;
  }

  async play() {
    // Preload all chapter images before showing
    await Promise.all(CHAPTERS.map((ch) => {
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = resolve;
        img.onerror = resolve;
        img.src = ch.image;
      });
    }));

    return new Promise((resolve) => {
      this._currentStep = 0;
      this._overlay = document.createElement('div');
      this._overlay.className = 'story-intro-overlay';
      this.container.appendChild(this._overlay);
      this._renderStep(resolve);
    });
  }

  _renderStep(resolve) {
    const ch = CHAPTERS[this._currentStep];
    const dots = CHAPTERS.map((_, i) =>
      `<span class="story-dot${i === this._currentStep ? ' active' : ''}"></span>`
    ).join('');

    this._overlay.innerHTML = `
      <div class="story-panel" style="background-image: url('${ch.image}');">
        <div class="story-content">
          <div class="story-chapter">${ch.chapter}</div>
          <div class="story-title">${ch.title}</div>
          <div class="story-text">${ch.text}</div>
          <button class="story-continue" id="story-btn">
            ${this._currentStep < CHAPTERS.length - 1 ? 'Continuar' : '¡Comenzar!'}
          </button>
        </div>
        <div class="story-progress">${dots}</div>
      </div>
    `;

    const btn = this._overlay.querySelector('#story-btn');
    btn.addEventListener('click', () => {
      this._currentStep++;
      if (this._currentStep >= CHAPTERS.length) {
        this._overlay.remove();
        this._overlay = null;
        resolve();
      } else {
        this._renderStep(resolve);
      }
    });
  }

  dispose() {
    if (this._overlay) {
      this._overlay.remove();
      this._overlay = null;
    }
    // Also remove the injected <style> tag so no stale CSS rules linger
    // in the document head. Without this, the .story-intro-overlay
    // rules (z-index 2147483647) stay applied to any future element
    // that happens to match the selector.
    const style = document.getElementById(STYLE_ID);
    if (style) style.remove();
  }
}
