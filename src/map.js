class FieldMap {
  constructor(canvasId, areaId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx    = this.canvas.getContext('2d');
    this.area   = document.getElementById(areaId);

    this.panX   = 0;
    this.panY   = 0;
    this.scale  = 1;

    this.isDragging = false;
    this.lastX = 0;
    this.lastY = 0;
    this.animFrame = null;

    this.activeModule = 'all';

    /* pin bounce: Map<pin object → animation start timestamp> */
    this._bouncingPins  = new Map();
    this._bounceLooping = false;

    /* pick-location mode */
    this.pickMode   = false;
    this.previewPin = null; /* { x, y } world coords */

    /* Pointer image for pick-mode preview */
    this._pointerImg = new Image();
    this._pointerImg.src = 'src/pointer.svg';

    /* Pre-render SVG pin images per colour */
    this._pinImages = {};
    [
      '#10b981', /* contacts */
      '#8b5cf6', /* accounts */
      '#f59e0b', /* deals    */
      '#3b82f6', /* leads    */
      '#ef4444', /* preview / pick mode */
      '#9ca3af', /* fallback */
    ].forEach(color => {
      const img = new Image();
      img.src = this._makePinSvg(color);
      this._pinImages[color] = img;
    });

    this._bindEvents();
    this._observeResize();
  }

  /* ── Build a data-URL SVG with `color` applied to the recordpoint shape ── */
  _makePinSvg(color) {
    const svg = [
      '<svg width="24" height="35" viewBox="0 0 24 35" fill="none" xmlns="http://www.w3.org/2000/svg">',
      '<path d="M24 12.2857C24 21.1429 13.1163 34.2857 12 34.2857C10.8837 34.2857 0 20.8571 0 12.2857C0 5.5005 5.37258 0 12 0C18.6274 0 24 5.5005 24 12.2857Z" fill="white"/>',
      `<path d="M12 6C15.3137 6 18 8.68629 18 12C18 15.3137 15.3137 18 12 18C8.68629 18 6 15.3137 6 12C6 8.68629 8.68629 6 12 6Z" fill="${color}"/>`,
      `<path fill-rule="evenodd" clip-rule="evenodd" d="M12 0C18.6274 0 24 5.50092 24 12.2861L23.9922 12.7041C23.6622 21.5505 13.0988 34.2861 12 34.2861L11.9404 34.2764C10.5681 33.8739 0.332732 21.1376 0.0078125 12.6914L0 12.2861C0 5.50092 5.37258 3.29809e-07 12 0ZM12 2C6.52126 2 2 6.56087 2 12.2861C2.00009 14.0473 2.57062 16.2105 3.56152 18.5635C4.54131 20.8899 5.87423 23.2669 7.26172 25.415C8.64784 27.561 10.0623 29.4384 11.1816 30.7627C11.489 31.1263 11.7677 31.4392 12.0107 31.7002C12.2509 31.4465 12.5263 31.1426 12.8291 30.79C13.9463 29.4894 15.3583 27.6413 16.7422 25.5156C18.1275 23.3881 19.459 21.0236 20.4375 18.6875C21.4254 16.3289 21.9999 14.1261 22 12.2861C22 6.56087 17.4787 2 12 2Z" fill="${color}"/>`,
      '</svg>',
    ].join('');
    return 'data:image/svg+xml,' + encodeURIComponent(svg);
  }

  /* ── Module colour lookup ── */
  _colorForPin(p) {
    return {
      contacts: '#10b981',
      accounts: '#8b5cf6',
      deals:    '#f59e0b',
      leads:    '#3b82f6',
    }[p.module.toLowerCase()] || p.color || '#9ca3af';
  }

  setModule(module) {
    this.activeModule = module;
    this.draw();
  }

  /* Multi-select: pass an array of module keys (empty = show all) */
  setModules(arr) {
    this._activeModules = arr;
    this.draw();
  }

  _visiblePins() {
    const pins = this._visiblePinsOverride || PINS;
    if (this._activeModules && this._activeModules.length > 0) {
      return pins.filter(p => this._activeModules.includes(p.module.toLowerCase()));
    }
    return pins;
  }

  resize() {
    this.canvas.width  = this.area.offsetWidth;
    this.canvas.height = this.area.offsetHeight;
    this.draw();
  }

  /* ── Pick mode ── */
  enterPickMode() {
    this.pickMode   = true;
    this.previewPin = null;
    this.canvas.classList.add('pick-mode');
    this.draw();
  }

  exitPickMode() {
    this.pickMode   = false;
    this.previewPin = null;
    this.canvas.classList.remove('pick-mode');
    this.draw();
  }

  setPreviewPin(wx, wy) {
    this.previewPin = { x: wx, y: wy };
    this.draw();
  }

  clearPreviewPin() {
    this.previewPin = null;
    this.draw();
  }

  /* ── Bounce animation ── */
  startPinBounce(pin) {
    this._bouncingPins.set(pin, performance.now());
    if (!this._bounceLooping) {
      this._bounceLooping = true;
      this._bounceLoop();
    }
  }

  _bounceLoop() {
    const now = performance.now();
    this._bouncingPins.forEach((t0, pin) => {
      if (now - t0 >= 900) this._bouncingPins.delete(pin);
    });
    this.draw();
    if (this._bouncingPins.size > 0) {
      requestAnimationFrame(() => this._bounceLoop());
    } else {
      this._bounceLooping = false;
    }
  }

  /* Returns world-unit Y offset (negative = above resting position) */
  _bounceY(t) {
    if (t < 0.42) return -55 * (1 - t / 0.42) ** 2;
    if (t < 0.62) return -18 * Math.sin(((t - 0.42) / 0.20) * Math.PI);
    if (t < 0.78) return  -6 * Math.sin(((t - 0.62) / 0.16) * Math.PI);
    if (t < 0.90) return  -2 * Math.sin(((t - 0.78) / 0.12) * Math.PI);
    return 0;
  }

  /* ── Render ── */
  draw() {
    const { ctx, canvas } = this;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(this.panX, this.panY);
    ctx.scale(this.scale, this.scale);

    this._drawBackground();
    this._drawBlocks();
    this._drawWater();
    this._drawRoads();
    this._drawPins();

    ctx.restore();
  }

  _drawBackground() {
    const { ctx, canvas } = this;
    ctx.fillStyle = '#e8e0d4';
    ctx.fillRect(-this.panX / this.scale, -this.panY / this.scale,
                  canvas.width / this.scale, canvas.height / this.scale);
  }

  _drawBlocks() {
    const { ctx } = this;
    BLOCKS.forEach(b => {
      ctx.fillStyle = '#f5f0e8'; ctx.strokeStyle = '#d4cdc0';
      ctx.lineWidth = 0.5 / this.scale;
      ctx.beginPath(); ctx.rect(b.x, b.y, b.w, b.h); ctx.fill(); ctx.stroke();
    });
  }

  _drawWater() {
    const { ctx } = this;
    WATER.forEach(poly => {
      ctx.beginPath(); ctx.moveTo(poly[0][0], poly[0][1]);
      poly.slice(1).forEach(p => ctx.lineTo(p[0], p[1]));
      ctx.closePath(); ctx.fillStyle = '#93c5fd'; ctx.fill();
    });
  }

  _drawRoads() {
    const { ctx } = this;
    ROADS.forEach(r => {
      ctx.beginPath(); ctx.moveTo(r.path[0][0], r.path[0][1]);
      r.path.slice(1).forEach(p => ctx.lineTo(p[0], p[1]));
      ctx.strokeStyle = '#fff'; ctx.lineWidth = (r.w || 3) / this.scale; ctx.stroke();
      ctx.strokeStyle = '#e5e0d8'; ctx.lineWidth = 0.5 / this.scale; ctx.stroke();
    });
  }

  _drawPins() {
    const now = performance.now();
    const DURATION = 900;

    /* Dim existing pins while in pick mode */
    if (this.pickMode) this.ctx.globalAlpha = 0.25;

    this._visiblePins().forEach(p => {
      let yOff = 0;
      if (this._bouncingPins.has(p)) {
        const t = Math.min((now - this._bouncingPins.get(p)) / DURATION, 1);
        yOff = this._bounceY(t);
      }
      this._drawSinglePin(p.x, p.y, this._colorForPin(p), yOff, false);
    });

    if (this.pickMode) this.ctx.globalAlpha = 1;

    /* Pointer.png preview pin — fixed at chosen location */
    if (this.pickMode && this.previewPin) {
      this._drawPointerPin(this.previewPin.x, this.previewPin.y);
    }
  }

  /* SVG dimensions: 24 × 35 — tip at bottom-centre (12, 34.3) */
  _drawSinglePin(wx, wy, color, yOff, isPreview) {
    const { ctx } = this;

    /* constant 28 screen-pixel width regardless of zoom */
    const pinW = 28 / this.scale;
    const pinH = pinW * (35 / 24);

    /* Tip position (animated during bounce) */
    const tipY = wy + yOff;

    /* Shadow at ground level — squishes and fades as pin rises */
    const rise   = Math.abs(yOff) / 55;
    const sAlpha = Math.max(0.06, 0.18 * (1 - rise));
    const sScaleX = Math.max(0.25, 1 - rise * 0.7);
    ctx.save();
    ctx.translate(wx, wy);
    ctx.scale(sScaleX, 0.15);
    ctx.beginPath();
    ctx.arc(0, 0, pinW * 0.5, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(0,0,0,${sAlpha})`;
    ctx.fill();
    ctx.restore();

    /* Draw SVG pin: tip = bottom of image → top = tipY - pinH */
    const img = this._pinImages[color] || this._pinImages['#9ca3af'];
    if (img && img.complete) {
      ctx.drawImage(img, wx - pinW / 2, tipY - pinH, pinW, pinH);
    }

    /* Pulsing halo on the red preview pin */
    if (isPreview) {
      /* Circle centre in SVG coords: y=12 of 35 from top */
      const circY = tipY - pinH + pinH * (12 / 35);
      ctx.beginPath();
      ctx.arc(wx, circY, pinW * 0.72, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(239,68,68,0.45)';
      ctx.lineWidth   = 2 / this.scale;
      ctx.stroke();
    }
  }

  /* Draw pointer.png at world pos (wx, wy) at a constant 20×42 screen pixels.
     Hotspot of the image is at (10, 40) — tip of the pin stem. */
  _drawPointerPin(wx, wy) {
    const img = this._pointerImg;
    if (!img || !img.complete) return;
    const w = 20 / this.scale;
    const h = 42 / this.scale;
    this.ctx.drawImage(img, wx - 10 / this.scale, wy - 40 / this.scale, w, h);
  }

  _clamp() {
    this.panX = Math.max(-800 * this.scale + 80, Math.min(100, this.panX));
    this.panY = Math.max(-640 * this.scale + 80, Math.min(100, this.panY));
  }

  screenToWorld(sx, sy) {
    return [(sx - this.panX) / this.scale, (sy - this.panY) / this.scale];
  }

  worldToScreen(wx, wy) {
    return [wx * this.scale + this.panX, wy * this.scale + this.panY];
  }

  pinAtScreen(mx, my) {
    const [wx, wy] = this.screenToWorld(mx, my);
    const pinW = 28 / this.scale;
    const pinH = pinW * (35 / 24);
    return this._visiblePins().find(p =>
      wx >= p.x - pinW / 2 && wx <= p.x + pinW / 2 &&
      wy <= p.y && wy >= p.y - pinH
    ) || null;
  }

  zoom(factor, cx, cy) {
    const [wx, wy] = this.screenToWorld(cx, cy);
    this.scale = Math.max(0.4, Math.min(5, this.scale * factor));
    this.panX  = cx - wx * this.scale;
    this.panY  = cy - wy * this.scale;
    this._clamp();
    this.draw();
  }

  pan(dx, dy) {
    this.panX += dx;
    this.panY += dy;
    this._clamp();
    cancelAnimationFrame(this.animFrame);
    this.animFrame = requestAnimationFrame(() => this.draw());
  }

  _bindEvents() {
    const canvas = this.canvas;

    canvas.addEventListener('mousedown', e => {
      this.isDragging = true;
      this.lastX = e.clientX; this.lastY = e.clientY;
      canvas.classList.add('dragging');
    });
    window.addEventListener('mouseup', () => {
      this.isDragging = false;
      canvas.classList.remove('dragging');
    });
    window.addEventListener('mousemove', e => {
      if (this.isDragging) {
        this.pan(e.clientX - this.lastX, e.clientY - this.lastY);
        this.lastX = e.clientX; this.lastY = e.clientY;
      }
    });
    canvas.addEventListener('wheel', e => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      this.zoom(e.deltaY > 0 ? 0.85 : 1.18, e.clientX - rect.left, e.clientY - rect.top);
    }, { passive: false });
    canvas.addEventListener('touchstart', e => {
      if (e.touches.length === 1) {
        this.isDragging = true;
        this.lastX = e.touches[0].clientX; this.lastY = e.touches[0].clientY;
      }
    }, { passive: true });
    canvas.addEventListener('touchmove', e => {
      if (this.isDragging && e.touches.length === 1) {
        this.pan(e.touches[0].clientX - this.lastX, e.touches[0].clientY - this.lastY);
        this.lastX = e.touches[0].clientX; this.lastY = e.touches[0].clientY;
      }
    }, { passive: true });
    canvas.addEventListener('touchend', () => { this.isDragging = false; });
  }

  _observeResize() {
    new ResizeObserver(() => this.resize()).observe(this.area);
  }
}
