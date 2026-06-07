/**
 * HintComponent
 * Muestra consejos de control para el modo actual.
 */

export class HintComponent {
  
   __init() {this.element = null}
   __init2() {this.isVisible = true}

  constructor(container) {;HintComponent.prototype.__init.call(this);HintComponent.prototype.__init2.call(this);
    this.container = container;
  }

  update(
    mode


  ) {
    if (!this.element) {
      this.createDOM();
    }

    if (!this.element) return;

    const content = this.element.querySelector('.hint-content');
    if (!content) return;

    if (mode === 'iron-man-workshop') {
      content.innerHTML = `
        <div class="hint-header">
          <span class="hint-title">Guía de Control</span>
          <span class="hint-subtitle">Taller de Iron Man</span>
        </div>
        <div class="hint-list">
          <div class="hint-item">Abre la mano izquierda para desarmar la armadura</div>
          <div class="hint-item">Cierra la mano izquierda para volver a armarla</div>
          <div class="hint-item">Pellizca con la mano derecha para rotar la vista</div>
          <div class="hint-item">Apunta con el índice derecho para ver detalles de las piezas</div>
          <div class="hint-item">Presiona <kbd>R</kbd> para restablecer la posición</div>
        </div>
      `;
    }
  }

  toggle() {
    this.isVisible = !this.isVisible;
    this.updateVisibility();
  }

  show() {
    this.isVisible = true;
    this.updateVisibility();
  }

  hide() {
    this.isVisible = false;
    this.updateVisibility();
  }

   updateVisibility() {
    if (this.element) {
      const hintBox = this.element.querySelector('.hint-component-box');
      if (hintBox) {
        if (this.isVisible) {
          hintBox.classList.remove('minimized');
        } else {
          hintBox.classList.add('minimized');
        }
      }
    }
  }

   createDOM() {
    this.element = document.createElement('div');
    this.element.className = 'hint-component-layout';
    this.element.innerHTML = `
      <div class="hint-component-inner">
        <div class="hint-component-box">
          <div class="hint-content"></div>
          <div class="hint-footer">
            <span class="desktop-text">Presiona <kbd>H</kbd> para ocultar ayuda</span>
            <span class="mobile-text">Toca para ocultar ayuda</span>
          </div>
          <div class="hint-minimized-icon">H</div>
        </div>
      </div>
    `;

    const hintBox = this.element.querySelector('.hint-component-box') ;

    hintBox.addEventListener('click', (e) => {
      // expands when minimized
      if (!this.isVisible) {
        this.toggle();
        e.stopPropagation();
      }
    });

    const footer = hintBox.querySelector('.hint-footer');
    if (footer) {
      footer.addEventListener('click', (e) => {
        // minimizes when clicked
        if (this.isVisible) {
          this.toggle();
          e.stopPropagation();
        }
      });
    }

    const style = document.createElement('style');
    style.textContent = `
      .hint-component-layout {
        position: absolute;
        bottom: 0;
        left: 0;
        width: 100%;
        padding-bottom: 30px;
        z-index: 150;
        pointer-events: none;
      }

      .hint-component-inner {
        margin: 0 auto;
        padding: 0 16px;
        display: flex;
        justify-content: flex-end;
      }

      @media (min-width: 3000px) {
        .hint-component-inner {
          max-width: 1920px;
        }
      }

      .hint-component-box {
        pointer-events: auto;
        padding: 24px 12px;
        background: rgba(10, 15, 20, 0.75);
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
        color: #fff;
        font-family: 'Nunito', sans-serif;
        border-radius: 4px;
        width: 310px;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(0, 255, 255, 0.15);
        transition: all 0.6s cubic-bezier(0.2, 0.8, 0.2, 1);
        overflow: hidden;
        display: flex;
        flex-direction: column;
        position: relative;
      }

      .hint-component-box::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        width: 20px;
        height: 20px;
        border-top: 2px solid rgba(0, 255, 255, 0.6);
        border-left: 2px solid rgba(0, 255, 255, 0.6);
        pointer-events: none;
      }

      .hint-component-box::after {
        content: '';
        position: absolute;
        bottom: 0;
        right: 0;
        width: 20px;
        height: 20px;
        border-bottom: 2px solid rgba(0, 255, 255, 0.6);
        border-right: 2px solid rgba(0, 255, 255, 0.6);
        pointer-events: none;
      }

      .hint-component-box.minimized {
        width: 48px;
        height: 48px;
        max-height: 48px;
        padding: 0;
        border-radius: 50%;
        cursor: pointer;
        background: rgba(10, 15, 20, 0.9);
        border: 1px solid rgba(0, 255, 255, 0.3);
        align-items: center;
        justify-content: center;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
      }

      .hint-content, .hint-footer {
        opacity: 1;
        transition: opacity 0.4s ease 0.2s;
        width: 100%;
      }

      .hint-component-box.minimized .hint-content,
      .hint-component-box.minimized .hint-footer {
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.2s ease;
        position: absolute;
      }

      .hint-minimized-icon {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%) scale(0.8);
        font-family: 'Playfair Display', serif;
        font-size: 1.2rem;
        font-weight: 700;
        color: rgba(0, 255, 255, 0.9);
        opacity: 0;
        transition: all 0.3s ease;
        pointer-events: none;
      }

      .hint-component-box.minimized .hint-minimized-icon {
        opacity: 1;
        transform: translate(-50%, -50%) scale(1);
        transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) 0.2s;
      }

      .hint-header {
        margin-bottom: 20px;
        padding-bottom: 12px;
        border-bottom: 1px solid rgba(0, 255, 255, 0.2);
        display: flex;
        flex-direction: column;
        gap: 4px;
      }

      .hint-title {
        font-family: 'Playfair Display', serif;
        font-size: 0.9rem;
        font-weight: 700;
        color: #fff;
        letter-spacing: 0.1em;
        text-transform: uppercase;
      }

      .hint-subtitle {
        font-size: 0.7rem;
        color: rgba(0, 255, 255, 0.7);
        letter-spacing: 0.05em;
        font-weight: 600;
      }

      .hint-list {
        display: flex;
        flex-direction: column;
        gap: 10px;
      }

      .hint-item {
        font-size: 0.85rem;
        color: rgba(255, 255, 255, 0.8);
        font-weight: 400;
        line-height: 1.4;
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .hint-item::before {
        content: '';
        display: block;
        width: 5px;
        height: 5px;
        background: rgba(0, 255, 255, 0.6);
        border-radius: 50%;
        flex-shrink: 0;
      }

      .hint-footer {
        margin-top: 24px;
        padding-top: 16px;
        border-top: 1px solid rgba(255, 255, 255, 0.1);
        font-size: 0.7rem;
        color: rgba(255, 255, 255, 0.4);
        text-align: center;
        text-transform: uppercase;
        letter-spacing: 0.1em;
      }

      kbd {
        display: inline-block;
        padding: 2px 6px;
        background: rgba(255, 255, 255, 0.1);
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 4px;
        font-family: 'Nunito', sans-serif;
        font-weight: 700;
        font-size: 0.75rem;
        color: #fff;
        min-width: 18px;
        text-align: center;
        margin: 0 2px;
        box-shadow: 0 2px 0 rgba(0,0,0,0.2);
      }

      .mobile-text {
        display: none;
      }

      .desktop-text {
        display: inline;
      }

      @media (max-width: 768px) {
        .hint-component-layout {
          bottom: 0;
          padding-bottom: 0;
        }

        .hint-component-inner {
          padding: 0 6px;
          justify-content: center;
        }

        .hint-component-box {
          width: auto;
          flex: 1;
          max-width: none;
          min-width: 0;
          padding: 8px;
          font-size: 10px;
        }

        .hint-component-box.minimized {
          width: 36px;
          flex: none;
        }
        
        .desktop-text { display: none !important; }
        .mobile-text { display: inline !important; }
      }
    `;
    this.element.appendChild(style);
    this.container.appendChild(this.element);
  }
}
