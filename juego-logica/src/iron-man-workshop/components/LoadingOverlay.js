/**
 * @fileoverview Cinematic loading overlay with JARVIS-style aesthetics.
 *
 * Creates a DOM-based overlay with:
 * - Rotating holographic rings
 * - Incrementing percentage counter
 * - System initialization text
 * - Premium blurry glass/hologram effects
 */

export class LoadingOverlay {
  
  
  
  

  constructor(container) {
    this.container = container;
    this.overlay = document.createElement('div');
    this.percentageText = document.createElement('div');
    this.subText = document.createElement('div');

    this.setupStyles();
    this.createDOM();
  }

   setupStyles() {
    const styleId = 'iron-man-loading-styles';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = `
        @keyframes spin-cw {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes spin-ccw {
          0% { transform: rotate(360deg); }
          100% { transform: rotate(0deg); }
        }
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
        
        .im-loading-overlay {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0, 0, 0, 0.2); /* Very subtle tint */
          display: flex;
          flex-direction: column;
          justify-content: flex-start; /* Move from center to top */
          padding-top: 20%; /* Custom offset from top */
          align-items: center;
          z-index: 1000;
          font-family: 'Segoe UI', 'Roboto', sans-serif;
          pointer-events: none;
        }
        
        .im-spinner-container {
          position: relative;
          width: 120px;
          height: 120px;
          margin-bottom: 20px;
        }
        
        .im-spinner-ring {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          border-radius: 50%;
          border: 2px solid transparent;
          border-top-color: #00ffff;
          border-left-color: rgba(0, 255, 255, 0.3);
          box-shadow: 0 0 10px rgba(0, 255, 255, 0.5);
        }
        
        .im-spinner-ring:nth-child(1) {
          animation: spin-cw 2s linear infinite;
        }
        
        .im-spinner-ring:nth-child(2) {
          width: 70%;
          height: 70%;
          top: 15%;
          left: 15%;
          border: 2px solid transparent;
          border-bottom-color: #0088ff;
          border-right-color: rgba(0, 136, 255, 0.3);
          animation: spin-ccw 1.5s linear infinite;
        }
        
        .im-percentage {
          font-size: 32px;
          font-weight: bold;
          color: #00ffff;
          text-shadow: 0 0 10px rgba(0, 255, 255, 0.8);
          letter-spacing: 2px;
        }
        
        .im-subtext {
          margin-top: 10px;
          font-size: 14px;
          color: rgba(0, 255, 255, 0.7);
          letter-spacing: 3px;
          text-transform: uppercase;
          animation: blink 2s infinite;
        }
      `;
      document.head.appendChild(style);
    }
  }

   createDOM() {
    this.overlay.className = 'im-loading-overlay';

    // Spinner Rings
    const spinnerContainer = document.createElement('div');
    spinnerContainer.className = 'im-spinner-container';

    const ring1 = document.createElement('div');
    ring1.className = 'im-spinner-ring';

    const ring2 = document.createElement('div');
    ring2.className = 'im-spinner-ring';

    spinnerContainer.appendChild(ring1);
    spinnerContainer.appendChild(ring2);

    // Text
    this.percentageText.className = 'im-percentage';
    this.percentageText.innerText = '0%';

    this.subText.className = 'im-subtext';
    this.subText.innerText = 'Initializing Systems...';

    this.overlay.appendChild(spinnerContainer);
    this.overlay.appendChild(this.percentageText);
    this.overlay.appendChild(this.subText);

    this.container.appendChild(this.overlay);
  }

  /**
   * Starts the loading sequence using both requestAnimationFrame and setInterval.
   * setInterval guarantees progress even if the browser throttles rAF (e.g. when
   * the tab is backgrounded or the GPU is under heavy load on mobile).
   * @param durationMs Duration in milliseconds (default 1000)
   * @returns Promise that resolves when loading is complete
   */
  startLoading(durationMs = 1000) {
    return new Promise((resolve) => {
      const startTime = performance.now();
      let resolved = false;

      const finish = () => {
        if (resolved) return;
        resolved = true;
        clearInterval(intervalId);
        if (this.percentageText) this.percentageText.innerText = '100%';
        if (this.subText) this.subText.innerText = 'System Online';
        setTimeout(() => {
          this.hide();
          resolve();
        }, 200);
      };

      const tick = () => {
        const elapsed = performance.now() - startTime;
        const progress = Math.min(elapsed / durationMs, 1);
        if (this.percentageText) {
          this.percentageText.innerText = `${Math.floor(progress * 100)}%`;
        }
        if (progress >= 1) finish();
      };

      // setInterval drives progress reliably even when rAF is throttled on mobile
      const intervalId = setInterval(tick, 50);
      tick();
    });
  }

  hide() {
    if (!this.overlay) return;
    // Fade out
    this.overlay.style.transition = 'opacity 0.5s ease-out';
    this.overlay.style.opacity = '0';

    // Remove from DOM after fade
    setTimeout(() => {
      if (this.overlay && this.overlay.parentNode) {
        this.overlay.parentNode.removeChild(this.overlay);
      }
    }, 500);
  }

  dispose() {
    if (this.overlay && this.overlay.parentNode) {
      this.overlay.parentNode.removeChild(this.overlay);
    }
    this.overlay = null;
    this.percentageText = null;
    this.subText = null;
    this.container = null;
  }
}
