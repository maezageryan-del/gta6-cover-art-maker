/* Sunset Strip Cover Studio — screenshot scenes.
   Original code for the make.fun gta6-cover-art-01 bounty.
   Reads ?shot=cover|editor&photo=&caption=&layout=&grade=&size= and
   paints that scene, then sets window.__shotReady = true once the
   cover is painted (fonts loaded, photo loaded). Used only to take
   the entry's screenshots; the normal app ignores these params. */

(function () {
  'use strict';

  var SAMPLE_FILES = {
    'duo-sunset': 'samples/duo-sunset.jpg',
    'neon-rider': 'samples/neon-rider.jpg',
    boulevard: 'samples/boulevard.jpg',
    pier: 'samples/pier.jpg',
  };

  function params() {
    var out = {};
    var q = new URLSearchParams(window.location.search);
    q.forEach(function (v, k) {
      out[k] = v;
    });
    return out;
  }

  function sampleFile(name) {
    if (!name) return null;
    if (SAMPLE_FILES[name]) return SAMPLE_FILES[name];
    if (/^[a-z0-9_-]+\.jpg$/i.test(name)) return 'samples/' + name;
    return null;
  }

  function ready() {
    window.__shotReady = true;
  }

  function run() {
    var p = params();
    if (!p.shot) return;
    var st = window.Studio.state;

    if (p.layout) st.layout = p.layout;
    if (p.grade) st.grade = p.grade;
    if (p.size) st.size = p.size;
    if (p.caption !== undefined) st.caption = p.caption;
    if (p.subcaption !== undefined) st.subcaption = p.subcaption;

    var photoFile = sampleFile(p.photo) || 'samples/duo-sunset.jpg';
    var secondFile = sampleFile(p.photo2) || 'samples/neon-rider.jpg';

    function paint() {
      // In cover mode the canvas fills the whole viewport: the
      // screenshot IS the exported cover.
      if (p.shot === 'cover') {
        document.body.classList.add('shot-cover');
        var canvas = document.getElementById('cover-canvas');
        var size = Cover.sizeById(st.size);
        // Portrait photo in a landscape panel: favour the top of the
        // photo (faces sit there) instead of a dead-centre crop.
        var rects = Cover.layoutById(st.layout).panels();
        rects.forEach(function (r, i) {
          var slot = st.panelPhotos[i] || 0;
          var img = st.photos[slot];
          if (!img) return;
          var iw = img.naturalWidth || img.width;
          var ih = img.naturalHeight || img.height;
          if (ih > iw && r.w * size.w > r.h * size.h) {
            st.panelCrops[i] = { zoom: 1, ox: 0.5, oy: 0.22 };
          }
        });
        var w = window.innerWidth;
        var h = window.innerHeight;
        // Keep the cover's own aspect: fit it inside the viewport.
        var scale = Math.min(w / size.w, h / size.h);
        var cw = Math.round(size.w * scale);
        var ch = Math.round(size.h * scale);
        canvas.style.width = cw + 'px';
        canvas.style.height = ch + 'px';
        Cover.renderCover(canvas, st, { width: cw, height: ch });
      } else {
        window.Studio.render();
      }
      ready();
    }

    function afterFonts(fn) {
      if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(function () {
          setTimeout(fn, 60);
        });
      } else {
        setTimeout(fn, 120);
      }
    }

    Promise.all([
      window.Studio.loadImage(photoFile),
      window.Studio.loadImage(secondFile),
    ])
      .then(function (imgs) {
        window.Studio.setPhoto(0, imgs[0], 'Sample 1');
        window.Studio.setPhoto(1, imgs[1], 'Sample 2');
        st.panelPhotos = [0, 1, 0, 1];
        if (p.shot === 'editor') {
          window.Studio.setStatus(
            'Editor scene — sample photos loaded. Pick a layout, grade and caption, then export.'
          );
        }
        afterFonts(paint);
      })
      .catch(function () {
        afterFonts(paint);
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      setTimeout(run, 30);
    });
  } else {
    setTimeout(run, 30);
  }
})();
