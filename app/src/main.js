/* Sunset Strip Cover Studio — editor UI.
   Original code for the make.fun gta6-cover-art-01 bounty.
   Wires the controls (photos, layouts, grades, caption, export) to the
   Cover renderer. Photos are read locally with FileReader and never
   leave the machine. No network use. */

(function () {
  'use strict';

  var SAMPLES = [
    { file: 'samples/duo-sunset.jpg', name: 'Duo at Sunset' },
    { file: 'samples/neon-rider.jpg', name: 'Neon Rider' },
    { file: 'samples/boulevard.jpg', name: 'Boulevard' },
    { file: 'samples/pier.jpg', name: 'Pier' },
  ];

  var MAX_PHOTOS = 4;

  var state = {
    layout: 'hero-strip',
    grade: 'vice-sunset',
    size: '1920x1080',
    caption: 'SUNSET STRIP',
    subcaption: 'A COVER STORY IN NEON',
    photos: [null, null, null, null],
    photoNames: ['', '', '', ''],
    panelPhotos: [0, 0, 0, 0],
    panelCrops: [
      { zoom: 1, ox: 0.5, oy: 0.5 },
      { zoom: 1, ox: 0.5, oy: 0.5 },
      { zoom: 1, ox: 0.5, oy: 0.5 },
      { zoom: 1, ox: 0.5, oy: 0.5 },
    ],
    activePanel: 0,
  };

  var canvas, ctx, statusEl;
  var renderQueued = false;

  function $(id) {
    return document.getElementById(id);
  }

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined) n.textContent = text;
    return n;
  }

  /* ------------------------------------------------------------------ */
  /* Rendering                                                           */
  /* ------------------------------------------------------------------ */

  function previewSize() {
    var size = Cover.sizeById(state.size);
    var box = $('preview-box');
    var availW = Math.max(320, box.clientWidth - 8);
    var availH = Math.max(240, box.clientHeight - 8);
    var scale = Math.min(availW / size.w, availH / size.h, 1);
    return {
      w: Math.max(160, Math.round(size.w * scale)),
      h: Math.max(160, Math.round(size.h * scale)),
    };
  }

  function render() {
    if (!canvas) return;
    var s = previewSize();
    Cover.renderCover(canvas, state, { width: s.w, height: s.h });
    drawActiveOutline();
    updatePanelLabel();
  }

  function queueRender() {
    if (renderQueued) return;
    renderQueued = true;
    requestAnimationFrame(function () {
      renderQueued = false;
      render();
    });
  }

  function drawActiveOutline() {
    // Never draw editor chrome over a cover screenshot scene.
    if (document.body.classList.contains('shot-cover')) return;
    var rects = Cover.layoutById(state.layout).panels();
    if (state.activePanel >= rects.length) return;
    var r = rects[state.activePanel];
    var w = canvas.width;
    var h = canvas.height;
    var gutter = Math.max(3, Math.round(w * 0.006));
    ctx.save();
    ctx.setLineDash([10, 6]);
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#22d3ee';
    ctx.strokeRect(
      Math.round(r.x * w) + gutter + 3,
      Math.round(r.y * h) + gutter + 3,
      Math.round(r.w * w) - gutter * 2 - 6,
      Math.round(r.h * h) - gutter * 2 - 6
    );
    ctx.restore();
  }

  function updatePanelLabel() {
    var rects = Cover.layoutById(state.layout).panels();
    var n = rects.length;
    $('panel-label').textContent =
      'Panel ' + (state.activePanel + 1) + ' of ' + n +
      ' — click a panel in the preview, or drag it to reposition its photo';
    var slot = state.panelPhotos[state.activePanel] || 0;
    var zoom = $('zoom');
    zoom.value = String((state.panelCrops[state.activePanel].zoom || 1) * 100);
    $('zoom-val').textContent = Math.round(state.panelCrops[state.activePanel].zoom * 100) + '%';
    var btns = document.querySelectorAll('#panel-photo-btns button');
    for (var i = 0; i < btns.length; i++) {
      btns[i].classList.toggle('on', i === slot);
    }
  }

  /* ------------------------------------------------------------------ */
  /* Photos                                                              */
  /* ------------------------------------------------------------------ */

  function loadImage(src) {
    return new Promise(function (resolve, reject) {
      var img = new Image();
      img.onload = function () {
        resolve(img);
      };
      img.onerror = function () {
        reject(new Error('Could not load image'));
      };
      img.src = src;
    });
  }

  function setPhoto(slot, img, name) {
    state.photos[slot] = img;
    state.photoNames[slot] = name || ('Photo ' + (slot + 1));
    renderPhotoSlots();
    queueRender();
  }

  function firstEmptySlot() {
    for (var i = 0; i < MAX_PHOTOS; i++) {
      if (!state.photos[i]) return i;
    }
    return 0;
  }

  function loadSample(index) {
    var s = SAMPLES[index];
    var slot = firstEmptySlot();
    loadImage(s.file)
      .then(function (img) {
        setPhoto(slot, img, s.name);
        setStatus('Loaded sample “' + s.name + '” into photo slot ' + (slot + 1) + '.');
      })
      .catch(function () {
        setStatus('Could not load sample “' + s.name + '”.');
      });
  }

  function handleUpload(files) {
    var list = Array.prototype.slice.call(files || []);
    list.slice(0, MAX_PHOTOS).forEach(function (file) {
      if (!/^image\//.test(file.type)) return;
      var reader = new FileReader();
      reader.onload = function () {
        loadImage(reader.result)
          .then(function (img) {
            setPhoto(firstEmptySlot(), img, file.name);
          })
          .catch(function () {
            setStatus('Could not read “' + file.name + '”.');
          });
      };
      reader.readAsDataURL(file);
    });
    if (list.length) {
      setStatus('Reading ' + Math.min(list.length, MAX_PHOTOS) + ' photo(s) — they stay on this machine.');
    }
  }

  function renderPhotoSlots() {
    var wrap = $('photo-slots');
    wrap.innerHTML = '';
    for (var i = 0; i < MAX_PHOTOS; i++) {
      (function (slot) {
        var b = el('button', 'slot' + (state.photos[slot] ? ' filled' : ''));
        if (state.photos[slot]) {
          var thumb = document.createElement('img');
          thumb.src = state.photos[slot].src;
          thumb.alt = state.photoNames[slot];
          b.appendChild(thumb);
          b.appendChild(el('span', 'slot-name', state.photoNames[slot]));
        } else {
          b.appendChild(el('span', 'slot-empty', '+' + ' Photo ' + (slot + 1)));
        }
        b.addEventListener('click', function () {
          $('file-input').click();
        });
        wrap.appendChild(b);
      })(i);
    }
  }

  function renderSampleRow() {
    var wrap = $('sample-row');
    wrap.innerHTML = '';
    SAMPLES.forEach(function (s, i) {
      var b = el('button', 'sample-btn');
      var img = document.createElement('img');
      img.src = s.file;
      img.alt = s.name;
      img.loading = 'lazy';
      b.appendChild(img);
      b.appendChild(el('span', null, s.name));
      b.addEventListener('click', function () {
        loadSample(i);
      });
      wrap.appendChild(b);
    });
  }

  /* ------------------------------------------------------------------ */
  /* Controls                                                            */
  /* ------------------------------------------------------------------ */

  function buildLayoutButtons() {
    var wrap = $('layout-btns');
    wrap.innerHTML = '';
    Cover.LAYOUTS.forEach(function (l) {
      var b = el('button', 'layout-btn' + (l.id === state.layout ? ' on' : ''));
      b.title = l.desc;
      var mini = el('span', 'mini-layout mini-' + l.id);
      var rects = l.panels();
      rects.forEach(function (r) {
        var cell = el('span', 'mini-cell');
        cell.style.left = r.x * 100 + '%';
        cell.style.top = r.y * 100 + '%';
        cell.style.width = r.w * 100 + '%';
        cell.style.height = r.h * 100 + '%';
        mini.appendChild(cell);
      });
      b.appendChild(mini);
      b.appendChild(el('span', 'btn-name', l.name));
      b.addEventListener('click', function () {
        state.layout = l.id;
        state.activePanel = 0;
        document.querySelectorAll('#layout-btns .layout-btn').forEach(function (n) {
          n.classList.remove('on');
        });
        b.classList.add('on');
        queueRender();
      });
      wrap.appendChild(b);
    });
  }

  function buildGradeButtons() {
    var wrap = $('grade-btns');
    wrap.innerHTML = '';
    Cover.GRADES.forEach(function (g) {
      var b = el('button', 'grade-btn' + (g.id === state.grade ? ' on' : ''));
      b.title = g.desc;
      var sw = el('span', 'swatch');
      sw.style.background = g.swatch;
      b.appendChild(sw);
      b.appendChild(el('span', 'btn-name', g.name));
      b.addEventListener('click', function () {
        state.grade = g.id;
        document.querySelectorAll('#grade-btns .grade-btn').forEach(function (n) {
          n.classList.remove('on');
        });
        b.classList.add('on');
        queueRender();
      });
      wrap.appendChild(b);
    });
  }

  function buildSizeButtons() {
    var wrap = $('size-btns');
    wrap.innerHTML = '';
    Cover.SIZES.forEach(function (s) {
      var b = el(
        'button',
        'size-btn' + (s.id === state.size ? ' on' : ''),
        s.name + ' · ' + s.w + '×' + s.h
      );
      b.addEventListener('click', function () {
        state.size = s.id;
        document.querySelectorAll('#size-btns .size-btn').forEach(function (n) {
          n.classList.remove('on');
        });
        b.classList.add('on');
        queueRender();
      });
      wrap.appendChild(b);
    });
  }

  function buildPanelPhotoButtons() {
    var wrap = $('panel-photo-btns');
    wrap.innerHTML = '';
    for (var i = 0; i < MAX_PHOTOS; i++) {
      (function (slot) {
        var b = el('button', 'panel-photo-btn', 'Photo ' + (slot + 1));
        b.addEventListener('click', function () {
          state.panelPhotos[state.activePanel] = slot;
          queueRender();
        });
        wrap.appendChild(b);
      })(i);
    }
  }

  /* ------------------------------------------------------------------ */
  /* Export                                                              */
  /* ------------------------------------------------------------------ */

  function exportCover() {
    var size = Cover.sizeById(state.size);
    var off = document.createElement('canvas');
    Cover.renderCover(off, state, { width: size.w, height: size.h });
    setStatus('Exporting ' + size.w + '×' + size.h + ' PNG…');
    off.toBlob(function (blob) {
      if (!blob) {
        setStatus('Export did not work in this browser — try again.');
        return;
      }
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = 'sunset-strip-cover-' + size.w + 'x' + size.h + '.png';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(function () {
        URL.revokeObjectURL(url);
      }, 4000);
      setStatus(
        'Exported ' + size.w + '×' + size.h + ' PNG (' +
        Math.round(blob.size / 1024) + ' KB). Share it anywhere.'
      );
    }, 'image/png');
  }

  /* ------------------------------------------------------------------ */
  /* Drag to reposition the active panel's photo.                        */
  /* ------------------------------------------------------------------ */

  function canvasPos(e) {
    var rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (canvas.width / rect.width),
      y: (e.clientY - rect.top) * (canvas.height / rect.height),
    };
  }

  function bindDrag() {
    var dragging = null;
    canvas.addEventListener('pointerdown', function (e) {
      var p = canvasPos(e);
      var panel = Cover.panelAt(state, canvas.width, canvas.height, p.x, p.y);
      state.activePanel = panel;
      dragging = { panel: panel, x: p.x, y: p.y, moved: false };
      canvas.setPointerCapture(e.pointerId);
      queueRender();
    });
    canvas.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      var p = canvasPos(e);
      var dx = p.x - dragging.x;
      var dy = p.y - dragging.y;
      if (Math.abs(dx) + Math.abs(dy) > 2) dragging.moved = true;
      if (!dragging.moved) return;
      var crop = state.panelCrops[dragging.panel];
      var rects = Cover.layoutById(state.layout).panels();
      var r = rects[dragging.panel];
      var pw = r.w * canvas.width;
      var ph = r.h * canvas.height;
      crop.ox = clamp(crop.ox + dx / pw, -0.5, 1.5);
      crop.oy = clamp(crop.oy + dy / ph, -0.5, 1.5);
      dragging.x = p.x;
      dragging.y = p.y;
      queueRender();
    });
    canvas.addEventListener('pointerup', function () {
      dragging = null;
    });
    canvas.addEventListener('pointercancel', function () {
      dragging = null;
    });
  }

  function clamp(v, lo, hi) {
    return Math.max(lo, Math.min(hi, v));
  }

  /* ------------------------------------------------------------------ */
  /* Status + boot                                                       */
  /* ------------------------------------------------------------------ */

  function setStatus(msg) {
    if (statusEl) statusEl.textContent = msg;
  }

  function boot() {
    canvas = $('cover-canvas');
    ctx = canvas.getContext('2d');
    statusEl = $('status');

    buildLayoutButtons();
    buildGradeButtons();
    buildSizeButtons();
    buildPanelPhotoButtons();
    renderPhotoSlots();
    renderSampleRow();

    $('caption-input').value = state.caption;
    $('caption-input').addEventListener('input', function (e) {
      state.caption = e.target.value;
      queueRender();
    });
    $('subcaption-input').value = state.subcaption;
    $('subcaption-input').addEventListener('input', function (e) {
      state.subcaption = e.target.value;
      queueRender();
    });

    $('file-input').addEventListener('change', function (e) {
      handleUpload(e.target.files);
      e.target.value = '';
    });
    $('upload-btn').addEventListener('click', function () {
      $('file-input').click();
    });

    $('zoom').addEventListener('input', function (e) {
      var crop = state.panelCrops[state.activePanel];
      crop.zoom = clamp(Number(e.target.value) / 100, 1, 3);
      $('zoom-val').textContent = Math.round(crop.zoom * 100) + '%';
      queueRender();
    });
    $('reset-crop').addEventListener('click', function () {
      state.panelCrops[state.activePanel] = { zoom: 1, ox: 0.5, oy: 0.5 };
      queueRender();
    });
    $('export-btn').addEventListener('click', exportCover);
    $('shuffle-btn').addEventListener('click', function () {
      var layouts = Cover.LAYOUTS;
      var grades = Cover.GRADES;
      state.layout =
        layouts[Math.floor(Math.random() * layouts.length)].id;
      state.grade = grades[Math.floor(Math.random() * grades.length)].id;
      state.activePanel = 0;
      buildLayoutButtons();
      buildGradeButtons();
      queueRender();
      setStatus('Surprise me: new layout + grade. Export when you like it.');
    });

    window.addEventListener('resize', queueRender);
    bindDrag();

    // Load two sample photos by default so the first paint is a cover.
    Promise.all([loadImage(SAMPLES[0].file), loadImage(SAMPLES[1].file)])
      .then(function (imgs) {
        setPhoto(0, imgs[0], SAMPLES[0].name);
        setPhoto(1, imgs[1], SAMPLES[1].name);
        state.panelPhotos = [0, 1, 0, 1];
        setStatus('Ready — two sample photos loaded. Add your own, pick a layout and grade, then export.');
      })
      .catch(function () {
        setStatus('Ready — add a photo to start.');
      })
      .finally(function () {
        render();
      });

    // First paint even before the samples arrive.
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(queueRender);
    }
    render();
  }

  // Public handle for shots.js (screenshot scenes) and debugging.
  window.Studio = {
    state: state,
    SAMPLES: SAMPLES,
    render: render,
    queueRender: queueRender,
    setPhoto: setPhoto,
    loadImage: loadImage,
    loadSample: loadSample,
    setStatus: setStatus,
    exportCover: exportCover,
    boot: boot,
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
