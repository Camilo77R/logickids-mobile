 function _nullishCoalesce(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return rhsFn(); } } function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }







const MODE_MESSAGES = {
  'iron-man-workshop': 'Activa la cámara para los controles gestuales holográficos',
};

export class CameraPermissionBanner {constructor() { CameraPermissionBanner.prototype.__init.call(this);CameraPermissionBanner.prototype.__init2.call(this);CameraPermissionBanner.prototype.__init3.call(this);CameraPermissionBanner.prototype.__init4.call(this); }
   __init() {this.element = null}
   __init2() {this.styleElement = null}
   __init3() {this.currentMode = null}
   __init4() {this.onCameraEnabled = null}

   static  __initStatic() {this.STORAGE_KEY_PREFIX = 'gesture-lab-camera-banner-dismissed-'}

  /**
   * Show the banner for a specific mode
   * @param mode The interaction mode
   * @param onCameraEnabled Optional callback when camera is successfully enabled
   */
  show(mode, onCameraEnabled) {
    this.onCameraEnabled = _nullishCoalesce(onCameraEnabled, () => ( null));
    const storageKey = CameraPermissionBanner.STORAGE_KEY_PREFIX + mode;

    // Don't show if already dismissed for this mode in this session
    if (sessionStorage.getItem(storageKey) === 'true') {
      return;
    }

    // If already showing for this mode, do nothing
    if (this.element && this.currentMode === mode) {
      return;
    }

    // If showing for a different mode, update the message
    if (this.element && this.currentMode !== mode) {
      this.updateMessage(mode);
      this.currentMode = mode;
      return;
    }

    this.currentMode = mode;
    this.createDOM(mode);
  }

  /**
   * Hide the banner
   */
  hide() {
    if (this.element) {
      this.element.classList.add('camera-banner--hiding');

      setTimeout(() => {
        if (_optionalChain([this, 'access', _ => _.element, 'optionalAccess', _2 => _2.parentNode])) {
          this.element.parentNode.removeChild(this.element);
        }
        this.element = null;
      }, 300);
    }
    this.currentMode = null;
  }

  /**
   * Dismiss the banner for the current mode (stores in session)
   */
  dismiss() {
    if (this.currentMode) {
      const storageKey = CameraPermissionBanner.STORAGE_KEY_PREFIX + this.currentMode;
      sessionStorage.setItem(storageKey, 'true');
    }
    this.hide();
  }

  /**
   * Dispose of the component
   */
  dispose() {
    if (_optionalChain([this, 'access', _3 => _3.element, 'optionalAccess', _4 => _4.parentNode])) {
      this.element.parentNode.removeChild(this.element);
    }
    this.element = null;

    if (_optionalChain([this, 'access', _5 => _5.styleElement, 'optionalAccess', _6 => _6.parentNode])) {
      this.styleElement.parentNode.removeChild(this.styleElement);
    }
    this.styleElement = null;
    this.currentMode = null;
  }

   updateMessage(mode) {
    if (!this.element) return;
    const textEl = this.element.querySelector('.camera-banner__text');
    if (textEl) {
      textEl.textContent = MODE_MESSAGES[mode];
    }
  }

   createDOM(mode) {
    this.element = document.createElement('div');
    this.element.className = 'camera-banner';
    this.element.setAttribute('role', 'alert');
    this.element.setAttribute('aria-live', 'polite');

    const message = MODE_MESSAGES[mode];

    this.element.innerHTML = `
      <div class="camera-banner__content">
        <svg class="camera-banner__icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M23 7l-7 5 7 5V7z"/>
          <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
        </svg>
        <span class="camera-banner__text">${message}</span>
        <button class="camera-banner__enable" aria-label="Activar Cámara">Activar</button>
        <button class="camera-banner__close" aria-label="Cerrar">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/>
          </svg>
        </button>
      </div>
    `;

    // Attach enable button handler
    const enableBtn = this.element.querySelector('.camera-banner__enable');
    if (enableBtn) {
      enableBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.requestCameraPermission();
      });
    }

    // Attach close button handler
    const closeBtn = this.element.querySelector('.camera-banner__close');
    if (closeBtn) {
      closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.dismiss();
      });
    }

    this.injectStyles();
    document.body.appendChild(this.element);

    // Trigger entrance animation
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        _optionalChain([this, 'access', _7 => _7.element, 'optionalAccess', _8 => _8.classList, 'access', _9 => _9.add, 'call', _10 => _10('camera-banner--visible')]);
      });
    });
  }

  /**
   * Request camera permission via getUserMedia
   */
   async requestCameraPermission() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      // Stop the stream immediately - we just needed to trigger the permission
      stream.getTracks().forEach((track) => track.stop());
      // Permission granted - hide banner and notify
      this.hide();
      _optionalChain([this, 'access', _11 => _11.onCameraEnabled, 'optionalCall', _12 => _12()]);
    } catch (e2) {
      // Permission denied or error - update banner to show settings hint
      this.showSettingsHint();
    }
  }

  /**
   * Update banner to show hint about browser settings
   */
   showSettingsHint() {
    if (!this.element) return;
    const textEl = this.element.querySelector('.camera-banner__text');
    const enableBtn = this.element.querySelector('.camera-banner__enable');
    if (textEl) {
      textEl.textContent = 'Cámara bloqueada. Por favor, verifica la barra de direcciones o la configuración del navegador.';
    }
    if (enableBtn) {
      (enableBtn ).style.display = 'none';
    }
  }

   injectStyles() {
    const styleId = 'camera-permission-banner-styles';
    if (document.getElementById(styleId)) return;

    this.styleElement = document.createElement('style');
    this.styleElement.id = styleId;
    this.styleElement.textContent = `
      .camera-banner {
        position: fixed;
        top: 80px;
        left: 0;
        right: 0;
        z-index: 99998;
        display: flex;
        justify-content: center;
        pointer-events: none;
        transform: translateY(-30px);
        opacity: 0;
        transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.3s ease;
      }

      .camera-banner--visible {
        transform: translateY(0);
        opacity: 1;
      }

      .camera-banner--hiding {
        transform: translateY(-30px);
        opacity: 0;
      }

      .camera-banner__content {
        pointer-events: auto;
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px 20px;
        background: linear-gradient(135deg, rgba(20, 30, 48, 0.95) 0%, rgba(36, 59, 85, 0.95) 100%);
        backdrop-filter: blur(16px);
        -webkit-backdrop-filter: blur(16px);
        border: 1px solid rgba(0, 200, 255, 0.25);
        border-radius: 14px;
        box-shadow: 
          0 10px 40px -10px rgba(0, 150, 255, 0.3),
          0 0 0 1px rgba(255, 255, 255, 0.05),
          inset 0 1px 0 rgba(255, 255, 255, 0.1);
        max-width: 90vw;
      }

      .camera-banner__icon {
        color: rgba(0, 200, 255, 0.9);
        flex-shrink: 0;
      }

      .camera-banner__text {
        font-family: 'Nunito', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        font-size: 0.9rem;
        font-weight: 500;
        color: rgba(255, 255, 255, 0.95);
        line-height: 1.4;
        letter-spacing: 0.01em;
      }

      .camera-banner__enable {
        padding: 6px 14px;
        background: rgba(0, 200, 255, 0.2);
        border: 1px solid rgba(0, 200, 255, 0.4);
        border-radius: 8px;
        color: rgba(0, 220, 255, 1);
        font-family: 'Nunito', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        font-size: 0.8rem;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s ease;
        flex-shrink: 0;
      }

      .camera-banner__enable:hover {
        background: rgba(0, 200, 255, 0.35);
        border-color: rgba(0, 200, 255, 0.6);
        color: #fff;
      }

      .camera-banner__enable:active {
        transform: scale(0.97);
      }

      .camera-banner__close {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 26px;
        height: 26px;
        padding: 0;
        background: rgba(255, 255, 255, 0.1);
        border: none;
        border-radius: 50%;
        color: rgba(255, 255, 255, 0.7);
        cursor: pointer;
        transition: all 0.2s ease;
        flex-shrink: 0;
      }

      .camera-banner__close:hover {
        background: rgba(255, 255, 255, 0.2);
        color: #fff;
        transform: scale(1.05);
      }

      .camera-banner__close:active {
        transform: scale(0.95);
      }

      .camera-banner__close:focus {
        outline: none;
        box-shadow: 0 0 0 2px rgba(0, 200, 255, 0.5);
      }

      @media (max-width: 600px) {
        .camera-banner {
          top: 70px;
        }
        
        .camera-banner__content {
          padding: 10px 16px;
          gap: 10px;
          margin: 0 12px;
        }

        .camera-banner__text {
          font-size: 0.8rem;
        }

        .camera-banner__icon {
          width: 18px;
          height: 18px;
        }
      }
    `;
    document.head.appendChild(this.styleElement);
  }
} CameraPermissionBanner.__initStatic();
