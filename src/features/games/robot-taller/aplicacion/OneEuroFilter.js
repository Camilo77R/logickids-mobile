class LowPassFilter {
  constructor() {
    this._lastValue = 0;
    this._alpha = 1.0;
    this._initialized = false;
  }

  filter(value, alpha) {
    if (!this._initialized) {
      this._lastValue = value;
      this._initialized = true;
    } else {
      this._lastValue = alpha * value + (1 - alpha) * this._lastValue;
    }
    return this._lastValue;
  }

  reset() {
    this._lastValue = 0;
    this._initialized = false;
  }
}

export class OneEuroFilter {
  constructor(minCutoff = 1.0, beta = 0.0, dCutoff = 1.0) {
    this._minCutoff = minCutoff;
    this._beta = beta;
    this._dCutoff = dCutoff;
    this._xFilter = new LowPassFilter();
    this._dxFilter = new LowPassFilter();
    this._lastTime = null;
  }

  _alpha(cutoff, dt) {
    const tau = 1.0 / (2 * Math.PI * cutoff);
    return 1.0 / (1.0 + tau / dt);
  }

  filter(value, timestamp) {
    if (this._lastTime === null) {
      this._lastTime = timestamp;
      return this._xFilter.filter(value, 1.0);
    }

    let dt = timestamp - this._lastTime;
    this._lastTime = timestamp;

    if (dt <= 0) return this._xFilter._lastValue;

    const dx = (value - this._xFilter._lastValue) / dt;
    const edx = this._dxFilter.filter(dx, this._alpha(this._dCutoff, dt));
    const cutoff = this._minCutoff + this._beta * Math.abs(edx);
    return this._xFilter.filter(value, this._alpha(cutoff, dt));
  }

  reset() {
    this._lastTime = null;
    this._xFilter.reset();
    this._dxFilter.reset();
  }
}

export class CursorOneEuroFilter {
  constructor(minCutoff = 0.8, beta = 0.3, dCutoff = 1.0) {
    this.filterX = new OneEuroFilter(minCutoff, beta, dCutoff);
    this.filterY = new OneEuroFilter(minCutoff, beta, dCutoff);
  }

  filter(x, y, timestamp) {
    return {
      x: this.filterX.filter(x, timestamp),
      y: this.filterY.filter(y, timestamp),
    };
  }

  reset() {
    this.filterX.reset();
    this.filterY.reset();
  }
}
