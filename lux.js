/* ============================================================
   The Pheasant Invitational — "Engraved Copper" motion layer
   Hero first-light, scroll reveals, and metallic gleams.
   Pairs with lux.css. Respects prefers-reduced-motion.
   ============================================================ */
(function () {
  'use strict';

  var reduce = window.matchMedia &&
               window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------- Ambient gleam on the copper nameplate ----------
  var plate = document.querySelector('.nav-logo');
  if (plate && !reduce) plate.classList.add('gleam', 'gleam-ambient');

  // ---------- Hero "first light" — staggered entrance ----------
  // Ordered so the eye travels top→bottom; the anniversary line is left
  // to its own count-up in app.js.
  if (!reduce) {
    var seq = [
      ['.hero-subtitle', 0.10],
      ['.hero-title',    0.28],
      ['.hero-divider',  0.48],
      ['.hero-date',     0.64],
      ['.hero-tagline',  0.74],
      ['.hero-est-line', 0.84],
      ['.hero-actions',  0.96]
    ];
    seq.forEach(function (pair) {
      var el = document.querySelector(pair[0]);
      if (el) { el.style.setProperty('--d', pair[1] + 's'); el.classList.add('lux-in'); }
    });
  }

  // ---------- Scroll-reveal choreography ----------
  // Every content section below the hero rises in once.
  var sections = [].slice.call(document.querySelectorAll('.section'));
  if (reduce || !('IntersectionObserver' in window)) {
    // No motion: show everything immediately.
    sections.forEach(function (s) { s.classList.remove('reveal'); });
  } else {
    sections.forEach(function (s) { s.classList.add('reveal'); });

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add('revealed');
        io.unobserve(e.target);

        // Trophy wall: sweep a gleam across each plaque, staggered.
        var plaques = e.target.querySelectorAll('.champion-row');
        plaques.forEach(function (p, i) {
          p.classList.add('gleam');
          setTimeout(function () { p.classList.add('gleam-go'); }, 200 + i * 140);
        });
      });
    }, { threshold: 0.14, rootMargin: '0px 0px -8% 0px' });

    sections.forEach(function (s) { io.observe(s); });
  }
})();
