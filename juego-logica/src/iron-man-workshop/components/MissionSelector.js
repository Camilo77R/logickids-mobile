/**
 * @fileoverview Mission selection overlay for RobotLab.
 *
 * Shows 3 mission cards. The child picks one. The selector calls
 * onSelect(missionId) and resolves the promise. The overlay is
 * dismissed after a selection is made.
 *
 * Each card includes a stylized SVG preview of the robot the kid will
 * build, colored with the mission's part overrides. Gives a clear
 * "this is what you're making" preview before they commit.
 *
 * Styled as a kid-friendly full-screen panel with large touchable cards.
 *
 * @module iron-man-workshop/components/MissionSelector
 */

import { MISSION_LIST, getMission, applyPartOverrides } from '../data/Missions';
import { getRobotBlueprint } from '../data/RobotBlueprints';

export class MissionSelector {
  constructor() {
    this.element = null;
    this._onSelect = null;
  }

  show(onSelect) {
    this._onSelect = onSelect;
    if (this.element) this._teardown();
    this._createDOM();
    document.body.appendChild(this.element);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (this.element) this.element.classList.add('ms--visible');
      });
    });
  }

  hide() {
    if (!this.element) return;
    this.element.classList.remove('ms--visible');
    this.element.classList.add('ms--hiding');
    setTimeout(() => this._teardown(), 350);
  }

  _teardown() {
    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }
    this.element = null;
  }

  _createDOM() {
    const root = document.createElement('div');
    root.className = 'ms';
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-label', 'Selector de misiones');

    let cardsHtml = '';
    for (const m of MISSION_LIST) {
      cardsHtml += `
        <button class="ms__card" data-id="${m.id}" style="--accent:${m.color};">
          <div class="ms__icon">${m.icon}</div>
          <div class="ms__name">${m.name}</div>
          ${this._renderRobotPreview(m.id)}
          <div class="ms__parts-hint">${this._getPartSummary(m.id)}</div>
          <div class="ms__desc">${m.description}</div>
        </button>
      `;
    }

    root.innerHTML = `
      <div class="ms__panel">
        <div class="ms__title">Elige tu misión</div>
        <div class="ms__subtitle">El Dr. Cables necesita tu ayuda</div>
        <div class="ms__grid">${cardsHtml}</div>
      </div>
    `;

    root.querySelectorAll('.ms__card').forEach((btn) => {
      btn.addEventListener('click', (ev) => {
        const id = btn.dataset.id;
        console.log('[MissionSelector] card clicked:', id);
        // Hide FIRST so the user immediately sees the assembly scene,
        // even if the callback throws. The selector overlay is dark
        // (rgba(0,8,24,0.92)) and was the previous "black screen".
        this.hide();
        if (this._onSelect) {
          try {
            this._onSelect(id);
          } catch (err) {
            console.error('[MissionSelector] _onSelect callback threw:', err);
          }
        }
      });
    });

    this._injectStyles();
    this.element = root;
  }

  _injectStyles() {
    if (document.getElementById('mission-selector-styles')) return;
    const style = document.createElement('style');
    style.id = 'mission-selector-styles';
    style.textContent = `
      .ms {
        position: fixed;
        inset: 0;
        z-index: 100000;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(0, 8, 24, 0.92);
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
        opacity: 0;
        transition: opacity 0.3s ease;
        font-family: 'Nunito', system-ui, -apple-system, sans-serif;
        padding: 16px;
      }
      .ms--visible { opacity: 1; }
      .ms--hiding { opacity: 0; pointer-events: none; }
      .ms__panel {
        max-width: 820px;
        width: 100%;
        text-align: center;
        color: #fff;
      }
      .ms__title {
        font-size: clamp(24px, 5vw, 40px);
        font-weight: 800;
        letter-spacing: 0.02em;
        margin-bottom: 4px;
        text-shadow: 0 0 16px rgba(0, 220, 255, 0.6);
      }
      .ms__subtitle {
        font-size: clamp(13px, 3vw, 18px);
        color: rgba(255, 255, 255, 0.7);
        margin-bottom: 24px;
      }
      .ms__grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
        gap: 16px;
      }
      .ms__card {
        background: linear-gradient(160deg, rgba(0, 30, 60, 0.9), rgba(0, 10, 30, 0.9));
        border: 2px solid var(--accent, #00d4ff);
        border-radius: 18px;
        padding: 16px 14px 18px;
        color: #fff;
        cursor: pointer;
        font-family: inherit;
        text-align: center;
        transition: transform 0.15s ease, box-shadow 0.15s ease, background 0.15s ease;
        box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.04) inset, 0 4px 16px rgba(0, 0, 0, 0.5);
        display: flex;
        flex-direction: column;
        align-items: center;
        /* Mobile-safe: explicit pointer events + no text-select. On
           iOS Safari, long-pressing a button can start a text selection
           that swallows the click. -webkit-touch-callout:none also
           suppresses the iOS preview popup. */
        pointer-events: auto;
        user-select: none;
        -webkit-user-select: none;
        -webkit-touch-callout: none;
        touch-action: manipulation;
      }
      .ms__card:hover, .ms__card:focus {
        transform: translateY(-2px) scale(1.02);
        background: linear-gradient(160deg, rgba(0, 50, 90, 0.95), rgba(0, 20, 50, 0.95));
        box-shadow: 0 8px 28px rgba(0, 0, 0, 0.6), 0 0 24px var(--accent, #00d4ff);
        outline: none;
      }
      .ms__card:active { transform: scale(0.98); }
      .ms__icon { font-size: 44px; line-height: 1; margin-bottom: 6px; }
      .ms__name { font-size: 17px; font-weight: 800; margin-bottom: 8px; }
      .ms__desc { font-size: 12px; color: rgba(255, 255, 255, 0.75); line-height: 1.3; margin-top: 6px; }
      .ms__preview {
        width: 130px;
        height: 150px;
        margin: 6px 0 4px;
        display: block;
        filter: drop-shadow(0 4px 12px var(--accent, rgba(0, 220, 255, 0.5)));
        transition: transform 0.4s ease;
        animation: ms-float 3.5s ease-in-out infinite;
        /* The SVG preview is purely visual — clicks must reach the
           enclosing <button>. Without this, the SVG and its animated
           transform can swallow pointer events on some browsers
           (especially Safari mobile), making the card "do nothing" on
           tap. */
        pointer-events: none;
        -webkit-tap-highlight-color: transparent;
      }
      @keyframes ms-float {
        0%, 100% { transform: translateY(0); }
        50%      { transform: translateY(-4px); }
      }
      .ms__card:hover .ms__preview {
        transform: scale(1.08) translateY(-4px);
        animation: none;
      }
      .ms__parts-hint {
        font-size: 10px;
        color: rgba(255, 255, 255, 0.55);
        letter-spacing: 0.05em;
        text-transform: uppercase;
        margin-top: 2px;
        font-weight: 700;
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * Render a small SVG preview of the robot the kid will build in this
   * mission. Uses the mission's part overrides to color each body part
   * (head, torso, arms, legs). Lightweight: pure SVG, no WebGL, no
   * 3D model loading. The kid gets a clear "this is what I'm making"
   * preview before they tap a card.
   */
  _renderRobotPreview(missionId) {
    const mission = getMission(missionId);
    if (!mission) return '';
    const blueprint = getRobotBlueprint(mission.targetLevel);
    if (!blueprint) return '';
    const final = applyPartOverrides(blueprint, mission.id);
    const colorOf = (id, fallback) => {
      const p = final.parts.find(pp => pp.id === id);
      const hex = p ? p.color : fallback;
      return '#' + hex.toString(16).padStart(6, '0');
    };
    // Use the mission's accent color for the visor/eyes
    const headColor = colorOf('head', 0x00ffff);
    const torsoColor = colorOf('torso', 0x00ccff);
    const armColor = colorOf('arm_left', 0x00aaff);
    const legColor = colorOf('leg_left', 0x0088dd);
    // Pick a brighter highlight for the eyes
    const eyeColor = mission.color || '#ffffff';
    return `
      <svg class="ms__preview" viewBox="0 0 100 130" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <defs>
          <linearGradient id="bg-${missionId}" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="rgba(0,0,0,0)" />
            <stop offset="100%" stop-color="${eyeColor}33" />
          </linearGradient>
          <linearGradient id="head-${missionId}" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="${headColor}" stop-opacity="1" />
            <stop offset="100%" stop-color="${headColor}" stop-opacity="0.6" />
          </linearGradient>
        </defs>
        <!-- Floor glow -->
        <ellipse cx="50" cy="125" rx="32" ry="4" fill="${eyeColor}" fill-opacity="0.35" />
        <!-- Legs -->
        <rect x="35" y="85" width="12" height="38" rx="2" fill="${legColor}" />
        <rect x="53" y="85" width="12" height="38" rx="2" fill="${legColor}" />
        <!-- Arms -->
        <rect x="14" y="50" width="10" height="36" rx="2" fill="${armColor}" />
        <rect x="76" y="50" width="10" height="36" rx="2" fill="${armColor}" />
        <!-- Torso -->
        <rect x="28" y="42" width="44" height="46" rx="4" fill="${torsoColor}" />
        <!-- Torso chest detail -->
        <circle cx="50" cy="62" r="5" fill="${eyeColor}" fill-opacity="0.8" />
        <circle cx="50" cy="62" r="2" fill="#fff" />
        <!-- Head -->
        <rect x="32" y="10" width="36" height="32" rx="5" fill="url(#head-${missionId})" />
        <!-- Visor / eyes -->
        <rect x="36" y="20" width="28" height="8" rx="2" fill="${eyeColor}" fill-opacity="0.9" />
        <!-- Antenna -->
        <line x1="50" y1="10" x2="50" y2="4" stroke="${headColor}" stroke-width="1.5" />
        <circle cx="50" cy="3" r="1.5" fill="${eyeColor}" />
      </svg>
    `;
  }

  /**
   * Returns a short summary of the parts the mission provides, e.g.
   * "6 PIEZAS". Helps the kid know roughly how big the build is.
   */
  _getPartSummary(missionId) {
    const mission = getMission(missionId);
    if (!mission) return '';
    const blueprint = getRobotBlueprint(mission.targetLevel);
    if (!blueprint) return '';
    return `${blueprint.parts.length} PIEZAS · NIVEL ${mission.targetLevel}`;
  }

  dispose() {
    this._teardown();
  }
}
