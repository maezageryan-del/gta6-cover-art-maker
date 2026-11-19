/* Sunset Strip Cover Studio — cover rendering engine.
   Original code for the make.fun gta6-cover-art-01 bounty.
   Renders a multi-panel GTA-style poster cover onto a <canvas>:
   6 layouts, 6 gradient-map grades, halftone comic shading and a
   thick-outline caption with a hard drop shadow. No network use. */

(function () {
  'use strict';

  /* ------------------------------------------------------------------ */
  /* Layouts: each returns panel rects as fractions of the canvas.      */
  /* ------------------------------------------------------------------ */

  var LAYOUTS = [
    {
      id: 'hero-strip',
      name: 'Hero + Strip',
      desc: 'One big hero panel, two stacked on the side',
      panels: function () {
        return [
          { x: 0, y: 0, w: 0.62, h: 1 },
          { x: 0.62, y: 0, w: 0.38, h: 0.5 },
          { x: 0.62, y: 0.5, w: 0.38, h: 0.5 },
        ];
      },
    },
    {
      id: 'comic-4',
      name: 'Comic 4-Panel',
      desc: 'Staggered four-panel comic page',
      panels: function () {
        return [
          { x: 0, y: 0, w: 0.5, h: 0.55 },
          { x: 0.5, y: 0, w: 0.5, h: 0.45 },
          { x: 0, y: 0.55, w: 0.5, h: 0.45 },
          { x: 0.5, y: 0.45, w: 0.5, h: 0.55 },
        ];
      },
    },
    {
      id: 'triptych',
      name: 'Triptych',
      desc: 'Three tall vertical panels',
      panels: function () {
        return [
          { x: 0, y: 0, w: 1 / 3, h: 1 },
          { x: 1 / 3, y: 0, w: 1 / 3, h: 1 },
          { x: 2 / 3, y: 0, w: 1 / 3, h: 1 },
        ];
      },
    },
    {
      id: 'grid-2x2',
      name: '2 x 2 Grid',
      desc: 'Four equal panels',
      panels: function () {
        return [
          { x: 0, y: 0, w: 0.5, h: 0.5 },
          { x: 0.5, y: 0, w: 0.5, h: 0.5 },
          { x: 0, y: 0.5, w: 0.5, h: 0.5 },
          { x: 0.5, y: 0.5, w: 0.5, h: 0.5 },
        ];
      },
    },
    {
      id: 'duo-split',
      name: 'Duo Split',
      desc: 'Two halves, side by side',
      panels: function () {
        return [
          { x: 0, y: 0, w: 0.5, h: 1 },
          { x: 0.5, y: 0, w: 0.5, h: 1 },
        ];
      },
    },
    {
      id: 'full-bleed',
      name: 'Full-Bleed Hero',
      desc: 'One photo, edge to edge',
      panels: function () {
        return [{ x: 0, y: 0, w: 1, h: 1 }];
      },
    },
  ];

  /* ------------------------------------------------------------------ */
  /* Grades: gradient maps (shadow -> midtone -> highlight).             */
  /* ------------------------------------------------------------------ */

  var GRADES = [
    {
      id: 'vice-sunset',
      name: 'Vice Sunset',
      desc: 'Purple shadows, coral mids, golden light',
      shadow: [42, 10, 61],
      mid: [232, 93, 61],
      high: [255, 209, 102],
      swatch: 'linear-gradient(135deg,#2a0a3d,#e85d3d 55%,#ffd166)',
    },
    {
      id: 'neon-nights',
      name: 'Neon Nights',
      desc: 'Deep blue shadows, magenta mids, cyan light',
      shadow: [11, 16, 53],
      mid: [192, 38, 211],
      high: [103, 232, 249],
      swatch: 'linear-gradient(135deg,#0b1035,#c026d3 55%,#67e8f9)',
    },
    {
      id: 'palm-dusk',
      name: 'Palm Dusk',
      desc: 'Teal-green dusk with warm terracotta light',
      shadow: [20, 32, 31],
      mid: [224, 120, 86],
      high: [247, 232, 201],
      swatch: 'linear-gradient(135deg,#14201f,#e07856 55%,#f7e8c9)',
    },
    {
      id: 'heat-haze',
      name: 'Heat Haze',
      desc: 'Smouldering reds under a pale hot sky',
      shadow: [61, 12, 12],
      mid: [217, 56, 30],
      high: [255, 224, 138],
      swatch: 'linear-gradient(135deg,#3d0c0c,#d9381e 55%,#ffe08a)',
    },
    {
      id: 'noir',
      name: 'Noir',
      desc: 'Pure black-and-white comic ink',
      shadow: [10, 10, 10],
      mid: [107, 107, 107],
      high: [245, 245, 245],
      swatch: 'linear-gradient(135deg,#0a0a0a,#6b6b6b 55%,#f5f5f5)',
    },
    {
      id: 'bubblegum',
      name: 'Bubblegum',
      desc: 'Hot pink shadows, icy cyan highlights',
      shadow: [43, 10, 46],
      mid: [255, 93, 162],
      high: [165, 243, 252],
      swatch: 'linear-gradient(135deg,#2b0a2e,#ff5da2 55%,#a5f3fc)',
    },
  ];

  var SIZES = [
    { id: '1080x1080', name: 'Square', w: 1080, h: 1080 },
    { id: '1080x1350', name: 'Portrait', w: 1080, h: 1350 },
    { id: '1920x1080', name: 'Landscape', w: 1920, h: 1080 },
  ];

  /* ------------------------------------------------------------------ */
  /* Gradient-map lookup tables (cached per grade).                      */
  /* ------------------------------------------------------------------ */

  var lutCache = {};

  function hexLerp(a, b, t) {
    return a + (b - a) * t;
  }

  function gradeLut(grade) {
    if (lutCache[grade.id]) return lutCache[grade.id];
    var r = new Uint8Array(256);
    var g = new Uint8Array(256);
    var b = new Uint8Array(256);
    for (var i = 0; i < 256; i++) {
      var t = i / 255;
      var lo, hi, f;
      if (t < 0.5) {
        lo = grade.shadow;
        hi = grade.mid;
        f = t / 0.5;
      } else {
        lo = grade.mid;
        hi = grade.high;
        f = (t - 0.5) / 0.5;
      }
      r[i] = Math.round(hexLerp(lo[0], hi[0], f));
      g[i] = Math.round(hexLerp(lo[1], hi[1], f));
      b[i] = Math.round(hexLerp(lo[2], hi[2], f));
    }
    var lut = { r: r, g: g, b: b };
    lutCache[grade.id] = lut;
    return lut;
  }

  /* Apply the gradient map to an ImageData in place. The mapped colour
     is blended 58% over the original so photos stay recognisable. */
  function applyGrade(imgData, grade) {
    var lut = gradeLut(grade);
    var d = imgData.data;
    for (var i = 0; i < d.length; i += 4) {
      var lum = (0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]) | 0;
      // Gentle S-curve for a punchier comic contrast.
      lum = Math.max(0, Math.min(255, ((lum - 128) * 1.08 + 128) | 0));
      d[i] = d[i] * 0.42 + lut.r[lum] * 0.58;
      d[i + 1] = d[i + 1] * 0.42 + lut.g[lum] * 0.58;
      d[i + 2] = d[i + 2] * 0.42 + lut.b[lum] * 0.58;
    }
  }

  /* ------------------------------------------------------------------ */
  /* Halftone comic dots.                                                */
  /* ------------------------------------------------------------------ */

  var dotPattern = null;

  function halftonePattern() {
    if (dotPattern) return dotPattern;
    var c = document.createElement('canvas');
    c.width = 9;
    c.height = 9;
    var x = c.getContext('2d');
    x.fillStyle = '#000';
    x.beginPath();
    x.arc(4.5, 4.5, 1.7, 0, Math.PI * 2);
    x.fill();
    dotPattern = c;
    return c;
  }

  function paintHalftone(ctx, w, h, alpha) {
    var pat = ctx.createPattern(halftonePattern(), 'repeat');
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = pat;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }

  /* ------------------------------------------------------------------ */
  /* Panel drawing.                                                      */
  /* ------------------------------------------------------------------ */

  function drawPhotoCover(ctx, img, x, y, w, h, crop) {
    var iw = img.naturalWidth || img.width;
    var ih = img.naturalHeight || img.height;
    if (!iw || !ih) return;
    var zoom = crop && crop.zoom ? crop.zoom : 1;
    var ox = crop && crop.ox !== undefined ? crop.ox : 0.5;
    var oy = crop && crop.oy !== undefined ? crop.oy : 0.5;
    var scale = Math.max(w / iw, h / ih) * zoom;
    var dw = iw * scale;
    var dh = ih * scale;
    var dx = x + (w - dw) * ox;
    var dy = y + (h - dh) * oy;
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();
    ctx.drawImage(img, dx, dy, dw, dh);
    ctx.restore();
  }

  /* A flat sunset-gradient placeholder for empty panels, so the cover
     always looks finished even before a photo is added. */
  function drawPlaceholder(ctx, x, y, w, h, grade, seed) {
    var g = ctx.createLinearGradient(x, y, x + w, y + h);
    var s = grade.shadow;
    var m = grade.mid;
    var hi = grade.high;
    g.addColorStop(0, 'rgb(' + hi[0] + ',' + hi[1] + ',' + hi[2] + ')');
    g.addColorStop(0.55, 'rgb(' + m[0] + ',' + m[1] + ',' + m[2] + ')');
    g.addColorStop(1, 'rgb(' + s[0] + ',' + s[1] + ',' + s[2] + ')');
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();
    ctx.fillStyle = g;
    ctx.fillRect(x, y, w, h);
    // Sun disc + dark ground band for a finished look.
    var cx = x + w * (0.3 + 0.4 * ((seed % 3) / 2));
    var cy = y + h * 0.42;
    var r = Math.min(w, h) * 0.22;
    ctx.fillStyle = 'rgba(255,246,220,0.9)';
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(20,8,24,0.85)';
    ctx.fillRect(x, y + h * 0.78, w, h * 0.22);
    ctx.restore();
  }

  /* ------------------------------------------------------------------ */
  /* Caption: Anton, uppercase, thick dark outline, hard drop shadow.   */
  /* ------------------------------------------------------------------ */

  function drawCaption(ctx, w, h, caption, subcaption) {
    if (!caption && !subcaption) return;
    var pad = w * 0.045;
    var baseY = h * 0.94;

    // Legibility scrim across the bottom of the cover.
    var scrim = ctx.createLinearGradient(0, h * 0.62, 0, h);
    scrim.addColorStop(0, 'rgba(10,4,14,0)');
    scrim.addColorStop(1, 'rgba(10,4,14,0.62)');
    ctx.fillStyle = scrim;
    ctx.fillRect(0, h * 0.62, w, h * 0.38);

    ctx.save();
    ctx.translate(pad, baseY);
    ctx.rotate(-0.022); // a slight comic tilt

    if (caption) {
      var size = Math.round(h * 0.105);
      ctx.font = size + 'px Anton, "Arial Black", sans-serif';
      ctx.textBaseline = 'alphabetic';
      ctx.textAlign = 'left';
      var text = caption.toUpperCase();
      // Hard drop shadow (no blur — comic style).
      ctx.fillStyle = '#160818';
      ctx.fillText(text, size * 0.045, size * 0.055);
      // Thick dark outline, then white fill.
      ctx.lineJoin = 'round';
      ctx.lineWidth = Math.max(3, size * 0.13);
      ctx.strokeStyle = '#160818';
      ctx.strokeText(text, 0, 0);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(text, 0, 0);
    }

    if (subcaption) {
      var sub = Math.round(h * 0.026);
      ctx.font = '700 ' + sub + 'px Inter, Arial, sans-serif';
      try {
        ctx.letterSpacing = Math.round(sub * 0.32) + 'px';
      } catch (e) {
        /* letterSpacing unsupported — plain text is fine */
      }
      ctx.textBaseline = 'alphabetic';
      ctx.textAlign = 'left';
      var subY = -Math.round(h * 0.105) - Math.round(h * 0.018);
      ctx.fillStyle = '#160818';
      ctx.fillText(subcaption.toUpperCase(), 2, subY + 2);
      ctx.fillStyle = '#ffd166';
      ctx.fillText(subcaption.toUpperCase(), 0, subY);
      try {
        ctx.letterSpacing = '0px';
      } catch (e) {
        /* ignore */
      }
    }
    ctx.restore();
  }

  /* ------------------------------------------------------------------ */
  /* Main render.                                                        */
  /* state: { layout, grade, caption, subcaption, photos[4],            */
  /*          panelPhotos[panelIdx] -> photo slot,                      */
  /*          panelCrops[panelIdx] -> { zoom, ox, oy } }               */
  /* opts:  { width, height } — the canvas is resized to these.         */
  /* ------------------------------------------------------------------ */

  function layoutById(id) {
    for (var i = 0; i < LAYOUTS.length; i++) {
      if (LAYOUTS[i].id === id) return LAYOUTS[i];
    }
    return LAYOUTS[0];
  }

  function gradeById(id) {
    for (var i = 0; i < GRADES.length; i++) {
      if (GRADES[i].id === id) return GRADES[i];
    }
    return GRADES[0];
  }

  function sizeById(id) {
    for (var i = 0; i < SIZES.length; i++) {
      if (SIZES[i].id === id) return SIZES[i];
    }
    return SIZES[2];
  }

  function renderCover(canvas, state, opts) {
    var w = opts.width;
    var h = opts.height;
    canvas.width = w;
    canvas.height = h;
    var ctx = canvas.getContext('2d');
    var layout = layoutById(state.layout);
    var grade = gradeById(state.grade);
    var rects = layout.panels();
    var gutter = Math.max(3, Math.round(w * 0.006));

    // Warm off-white comic gutters.
    ctx.fillStyle = '#fdf6ec';
    ctx.fillRect(0, 0, w, h);

    // Draw each panel onto its own offscreen canvas so the grade
    // applies to the photo only, not the gutters or caption.
    for (var p = 0; p < rects.length; p++) {
      var r = rects[p];
      var px = Math.round(r.x * w) + gutter;
      var py = Math.round(r.y * h) + gutter;
      var pw = Math.round(r.w * w) - gutter * 2;
      var ph = Math.round(r.h * h) - gutter * 2;
      if (pw <= 0 || ph <= 0) continue;

      var off = document.createElement('canvas');
      off.width = pw;
      off.height = ph;
      var ox = off.getContext('2d');
      var slot = state.panelPhotos ? state.panelPhotos[p] : 0;
      var img = state.photos && state.photos[slot] ? state.photos[slot] : null;
      if (img) {
        var crop = state.panelCrops ? state.panelCrops[p] : null;
        drawPhotoCover(ox, img, 0, 0, pw, ph, crop);
      } else {
        drawPlaceholder(ox, 0, 0, pw, ph, grade, p);
      }
      var data = ox.getImageData(0, 0, pw, ph);
      applyGrade(data, grade);
      ox.putImageData(data, 0, 0);
      ctx.drawImage(off, px, py);

      // Comic panel frame: white inner line, dark outer line.
      ctx.lineWidth = Math.max(2, Math.round(w * 0.002));
      ctx.strokeStyle = '#fdf6ec';
      ctx.strokeRect(px + 1, py + 1, pw - 2, ph - 2);
      ctx.lineWidth = Math.max(2, Math.round(w * 0.0025));
      ctx.strokeStyle = '#160818';
      ctx.strokeRect(px, py, pw, ph);
    }

    // Halftone comic dots over the whole cover, light touch.
    paintHalftone(ctx, w, h, 0.1);

    // Soft vignette to pull the eye to the middle.
    var vig = ctx.createRadialGradient(
      w / 2, h / 2, Math.min(w, h) * 0.35,
      w / 2, h / 2, Math.max(w, h) * 0.75
    );
    vig.addColorStop(0, 'rgba(10,4,14,0)');
    vig.addColorStop(1, 'rgba(10,4,14,0.28)');
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, w, h);

    drawCaption(ctx, w, h, state.caption, state.subcaption);
    return canvas;
  }

  /* Hit-test a point (in canvas pixels) against the current layout. */
  function panelAt(state, width, height, x, y) {
    var rects = layoutById(state.layout).panels();
    for (var i = rects.length - 1; i >= 0; i--) {
      var r = rects[i];
      if (
        x >= r.x * width && x < (r.x + r.w) * width &&
        y >= r.y * height && y < (r.y + r.h) * height
      ) {
        return i;
      }
    }
    return 0;
  }

  window.Cover = {
    LAYOUTS: LAYOUTS,
    GRADES: GRADES,
    SIZES: SIZES,
    layoutById: layoutById,
    gradeById: gradeById,
    sizeById: sizeById,
    renderCover: renderCover,
    panelAt: panelAt,
  };
})();
