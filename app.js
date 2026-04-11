
/* ============================================================
   The Pheasant Invitational — App JS
   ============================================================ */

(function () {
  'use strict';

  // ---------- Configuration ----------
  var SPONSOR_OPEN_DATE = new Date('2026-06-05T17:00:00Z'); // June 5, 10 AM PDT
  var REG_OPEN_DATE = new Date('2026-06-12T17:00:00Z');     // June 12, 10 AM PDT
  var APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzv1eGhaOCn-Yb_zdtfeVFfDQMCfO_rFp7UJ_NU6xdVNXOuJoalxAHLGn150jFSFoYVHQ/exec';
  var MAX_LOGO_SIZE = 5 * 1024 * 1024; // 5 MB
  var ALLOWED_LOGO_TYPES = ['image/png', 'image/jpeg', 'image/svg+xml', 'application/pdf'];

  // ---------- Navbar scroll effect ----------
  var navbar = document.getElementById('navbar');
  if (navbar) {
    window.addEventListener('scroll', function () {
      navbar.classList.toggle('scrolled', window.scrollY > 40);
    }, { passive: true });
  }

  // ---------- Mobile nav toggle ----------
  var navToggle = document.getElementById('navToggle');
  var navMenu = document.getElementById('navMenu');

  if (navToggle && navMenu) {
    navToggle.addEventListener('click', function () {
      navToggle.classList.toggle('active');
      navMenu.classList.toggle('open');
    });

    navMenu.querySelectorAll('.nav-link').forEach(function (link) {
      link.addEventListener('click', function () {
        navToggle.classList.remove('active');
        navMenu.classList.remove('open');
      });
    });
  }

  // ---------- Schedule day tabs ----------
  var tabBtns = document.querySelectorAll('.tab-btn');
  var scheduleDays = document.querySelectorAll('.schedule-day');

  tabBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var day = btn.getAttribute('data-day');
      tabBtns.forEach(function (b) { b.classList.remove('active'); });
      btn.classList.add('active');
      scheduleDays.forEach(function (d) {
        d.classList.remove('active');
        if (d.id === day) d.classList.add('active');
      });
    });
  });

  // ---------- Dual register button states ----------
  var sponsorBtns = [document.getElementById('heroSponsorBtn'), document.getElementById('ctaSponsorBtn')];
  var openBtns    = [document.getElementById('heroOpenBtn'),    document.getElementById('ctaOpenBtn')];

  (function updateRegBtnStates() {
    var now = new Date();
    var sponsorOpen = now >= SPONSOR_OPEN_DATE;
    var openOpen    = now >= REG_OPEN_DATE;

    sponsorBtns.forEach(function(btn) {
      if (!btn) return;
      if (openOpen) {
        // Sponsor window closed — hide entirely
        btn.style.display = 'none';
      } else if (sponsorOpen) {
        // Sponsor window active
        btn.textContent = 'Hole Sponsor Registration';
        btn.classList.remove('btn-reg-soon');
      } else {
        // Not yet open
        btn.textContent = 'Hole Sponsor Registration \u00b7 Opens June 5';
        btn.classList.add('btn-reg-soon');
      }
    });

    openBtns.forEach(function(btn) {
      if (!btn) return;
      if (openOpen) {
        btn.textContent = 'Open Registration';
        btn.classList.remove('btn-reg-soon');
      } else {
        btn.textContent = 'Open Registration \u00b7 Opens June 12';
        btn.classList.add('btn-reg-soon');
      }
    });
  })();

  // ---------- Dual Countdown Timers ----------
  var sponsorElements = {
    days: document.getElementById('sponsorDays'),
    hours: document.getElementById('sponsorHours'),
    minutes: document.getElementById('sponsorMinutes'),
    seconds: document.getElementById('sponsorSeconds')
  };

  var openElements = {
    days: document.getElementById('openDays'),
    hours: document.getElementById('openHours'),
    minutes: document.getElementById('openMinutes'),
    seconds: document.getElementById('openSeconds')
  };

  var sponsorExpired = false;
  var openExpired = false;

  function updateSingleCountdown(targetDate, elements) {
    var now = new Date();
    var diff = targetDate - now;
    if (diff <= 0) return false;

    var d = Math.floor(diff / 86400000);
    var h = Math.floor((diff % 86400000) / 3600000);
    var m = Math.floor((diff % 3600000) / 60000);
    var s = Math.floor((diff % 60000) / 1000);

    if (elements.days) elements.days.textContent = String(d).padStart(2, '0');
    if (elements.hours) elements.hours.textContent = String(h).padStart(2, '0');
    if (elements.minutes) elements.minutes.textContent = String(m).padStart(2, '0');
    if (elements.seconds) elements.seconds.textContent = String(s).padStart(2, '0');
    return true;
  }

  function onSponsorExpired() {
    sponsorExpired = true;
    var titleEl = document.getElementById('sponsorCountdownTitle');
    if (titleEl) titleEl.textContent = 'Hole Sponsor Registration Is Open!';
    var timerEl = document.getElementById('sponsorCountdownTimer');
    if (timerEl) timerEl.innerHTML = '<span class="countdown-live">Submit your team now</span>';
    var dateEl = document.getElementById('countdownSponsor');
    if (dateEl) {
      var d = dateEl.querySelector('.countdown-date');
      if (d) d.style.display = 'none';
    }
    updateFormVisibility();
  }

  function onOpenExpired() {
    openExpired = true;
    var titleEl = document.getElementById('openCountdownTitle');
    if (titleEl) titleEl.textContent = 'Registration Is Open!';
    var timerEl = document.getElementById('openCountdownTimer');
    if (timerEl) timerEl.innerHTML = '<span class="countdown-live">Submit your team now</span>';
    var dateEl = document.getElementById('countdownOpen');
    if (dateEl) {
      var d = dateEl.querySelector('.countdown-date');
      if (d) d.style.display = 'none';
    }
    updateFormVisibility();
  }

  function pulseEl(el) {
    if (!el) return;
    el.classList.remove('cd-pulse');
    void el.offsetWidth; // reflow to restart animation
    el.classList.add('cd-pulse');
  }

  function tickCountdowns() {
    if (!sponsorExpired) {
      if (!updateSingleCountdown(SPONSOR_OPEN_DATE, sponsorElements)) {
        onSponsorExpired();
      } else {
        pulseEl(sponsorElements.seconds);
      }
    }
    if (!openExpired) {
      if (!updateSingleCountdown(REG_OPEN_DATE, openElements)) {
        onOpenExpired();
      } else {
        pulseEl(openElements.seconds);
      }
    }
  }

  // Check initial state
  if (new Date() >= SPONSOR_OPEN_DATE) onSponsorExpired();
  if (new Date() >= REG_OPEN_DATE) onOpenExpired();
  tickCountdowns();
  setInterval(tickCountdowns, 1000);

  // ---------- Registration Form Visibility & Mode Switching ----------
  var regTypeTabs = document.getElementById('regTypeTabs');
  var tabSponsor = document.getElementById('tabSponsor');
  var tabOpen = document.getElementById('tabOpen');
  var regForm = document.getElementById('registrationForm');
  var sponsorFields = document.getElementById('sponsorFields');
  var registrationType = document.getElementById('registrationType');
  var formStatusSponsor = document.getElementById('formStatusSponsor');
  var formStatusOpen = document.getElementById('formStatusOpen');
  var formSuccess = document.getElementById('formSuccess');
  var formError = document.getElementById('formError');

  // Register page wrappers (register.html only)
  var regPageForm = document.getElementById('regPageForm');
  var regPageStatus = document.getElementById('regPageStatus');
  var prepCard = document.getElementById('prepCard');

  var currentMode = 'sponsor';

  function updateFormVisibility() {
    var now = new Date();
    var sponsorOpen = now >= SPONSOR_OPEN_DATE;
    var openOpen = now >= REG_OPEN_DATE;

    // Status messages
    if (formStatusSponsor) formStatusSponsor.style.display = sponsorOpen ? 'none' : 'block';
    if (formStatusOpen) formStatusOpen.style.display = openOpen ? 'none' : 'block';

    // Prep card: show until open registration is live
    if (prepCard) prepCard.style.display = openOpen ? 'none' : 'block';

    // If neither window is open, hide form and tabs
    if (!sponsorOpen && !openOpen) {
      if (regTypeTabs) regTypeTabs.style.display = 'none';
      if (regForm) regForm.style.display = 'none';
      // Register page: show closed status, hide form area
      if (regPageStatus) regPageStatus.style.display = 'block';
      if (regPageForm) regPageForm.style.display = 'none';
      return;
    }

    // Register page: hide closed status, show form area
    if (regPageStatus) regPageStatus.style.display = 'none';
    if (regPageForm) regPageForm.style.display = 'block';

    // Show tabs
    if (regTypeTabs) regTypeTabs.style.display = 'flex';

    // Enable/disable individual tabs
    // Hole Sponsor tab: only available between June 5 and June 12
    if (tabSponsor) {
      var sponsorTabOpen = sponsorOpen && !openOpen;
      tabSponsor.disabled = !sponsorTabOpen;
      tabSponsor.classList.toggle('tab-disabled', !sponsorTabOpen);
    }
    if (tabOpen) {
      tabOpen.disabled = !openOpen;
      tabOpen.classList.toggle('tab-disabled', !openOpen);
    }

    // If current mode is not yet available (or sponsor closed), switch to the available one
    if (currentMode === 'open' && !openOpen && sponsorOpen) {
      setMode('sponsor');
    } else if (currentMode === 'sponsor' && (!sponsorOpen || openOpen)) {
      setMode('open');
    }

    // Show the form
    if (regForm) regForm.style.display = 'block';
  }

  function setMode(mode) {
    currentMode = mode;
    if (registrationType) registrationType.value = mode;

    // Update tab active states
    if (tabSponsor) tabSponsor.classList.toggle('active', mode === 'sponsor');
    if (tabOpen) tabOpen.classList.toggle('active', mode === 'open');

    // Show/hide sponsor-only fields
    if (sponsorFields) sponsorFields.style.display = mode === 'sponsor' ? 'block' : 'none';

    // Update sponsor name required state
    var sponsorNameInput = document.getElementById('sponsorName');
    if (sponsorNameInput) sponsorNameInput.required = (mode === 'sponsor');

    // Clear membership warning when switching modes
    var warning = document.getElementById('membershipWarning');
    if (warning) warning.style.display = 'none';

    // Update submit button text
    var submitText = document.getElementById('submitText');
    if (submitText) {
      submitText.textContent = mode === 'sponsor'
        ? 'Submit Hole Sponsor Registration'
        : 'Submit Registration';
    }
  }

  // Tab click handlers
  if (tabSponsor) {
    tabSponsor.addEventListener('click', function () {
      if (!this.disabled) setMode('sponsor');
    });
  }
  if (tabOpen) {
    tabOpen.addEventListener('click', function () {
      if (!this.disabled) setMode('open');
    });
  }

  // Initialize form visibility
  updateFormVisibility();

  // ---------- Sponsor Membership Validation ----------
  var membershipSelect = document.getElementById('membershipLevel');
  var membershipWarning = document.getElementById('membershipWarning');

  if (membershipSelect) {
    membershipSelect.addEventListener('change', function () {
      var isNonPropEmeritus = this.value && this.value !== 'proprietary_emeritus';
      if (membershipWarning) {
        membershipWarning.style.display = (currentMode === 'sponsor' && isNonPropEmeritus) ? 'block' : 'none';
      }
    });
  }

  // ---------- Logo File Handling ----------
  var logoInput = document.getElementById('sponsorLogo');
  var logoFileNameEl = document.getElementById('logoFileName');
  var logoPreview = document.getElementById('logoPreview');
  var logoPreviewImg = document.getElementById('logoPreviewImg');
  var logoRemoveBtn = document.getElementById('logoRemoveBtn');
  var logoBase64 = null;
  var logoMimeType = null;
  var logoOriginalName = null;

  if (logoInput) {
    var chooseBtnEl = logoInput.closest('.file-upload-wrapper').querySelector('.btn-file-choose');
    if (chooseBtnEl) {
      chooseBtnEl.addEventListener('click', function () { logoInput.click(); });
    }

    logoInput.addEventListener('change', function () {
      var file = this.files[0];
      logoBase64 = null;
      logoMimeType = null;
      logoOriginalName = null;

      if (!file) {
        if (logoFileNameEl) logoFileNameEl.textContent = 'No file chosen';
        if (logoPreview) logoPreview.style.display = 'none';
        return;
      }

      // Validate type
      if (ALLOWED_LOGO_TYPES.indexOf(file.type) === -1) {
        alert('Please upload a PNG, JPG, SVG, or PDF file.');
        this.value = '';
        return;
      }

      // Validate size
      if (file.size > MAX_LOGO_SIZE) {
        alert('Logo file must be under 5 MB. Your file is ' +
              (file.size / (1024 * 1024)).toFixed(1) + ' MB.');
        this.value = '';
        return;
      }

      if (logoFileNameEl) logoFileNameEl.textContent = file.name;
      logoOriginalName = file.name;
      logoMimeType = file.type;

      var reader = new FileReader();
      reader.onload = function (e) {
        logoBase64 = e.target.result;

        // Show preview for image types (not PDF)
        if (file.type.startsWith('image/') && logoPreview && logoPreviewImg) {
          logoPreviewImg.src = logoBase64;
          logoPreview.style.display = 'flex';
        }
      };
      reader.readAsDataURL(file);
    });

    if (logoRemoveBtn) {
      logoRemoveBtn.addEventListener('click', function () {
        logoInput.value = '';
        logoBase64 = null;
        logoMimeType = null;
        logoOriginalName = null;
        if (logoFileNameEl) logoFileNameEl.textContent = 'No file chosen';
        if (logoPreview) logoPreview.style.display = 'none';
      });
    }
  }

  // ---------- Form Submission ----------
  if (regForm) {
    regForm.addEventListener('submit', function (e) {
      e.preventDefault();

      // --- Client-side validation ---
      if (currentMode === 'sponsor') {
        var sponsorNameInput = document.getElementById('sponsorName');
        if (sponsorNameInput && !sponsorNameInput.value.trim()) {
          alert('Please enter a Sponsor Company or Individual Name.');
          sponsorNameInput.focus();
          return;
        }
      }

      // Re-check time gates
      var now = new Date();
      if (currentMode === 'sponsor' && now < SPONSOR_OPEN_DATE) {
        alert('Hole Sponsor registration is not yet open.');
        return;
      }
      if (currentMode === 'open' && now < REG_OPEN_DATE) {
        alert('Open registration is not yet open.');
        return;
      }

      // --- Build payload ---
      var formData = {
        registrationType: currentMode === 'sponsor' ? 'Sponsor' : 'Open',
        memberEmail: document.getElementById('memberEmail').value.trim(),
        memberName: document.getElementById('memberName').value.trim(),
        membershipLevel: membershipSelect ? membershipSelect.value : '',
        memberGhin: document.getElementById('memberGhin').value.trim(),
        guestName: document.getElementById('guestName').value.trim(),
        guestGhin: document.getElementById('guestGhin').value.trim(),
        guestEmail: (document.getElementById('guestEmail').value || '').trim(),
        guestClub: (document.getElementById('guestClub').value || '').trim(),
        par3Contest: document.querySelector('[name="par3Contest"]').checked ? 'Yes' : 'No',
        openHorseRace: document.querySelector('[name="openHorseRace"]').checked ? 'Yes' : 'No',
        saturdayAdditionalGuests: document.getElementById('partySize').value,
        depositAcknowledged: document.querySelector('[name="depositAck"]').checked ? 'Yes' : 'No',
        sponsorName: currentMode === 'sponsor'
          ? (document.getElementById('sponsorName').value || '').trim()
          : '',
        logoBase64: currentMode === 'sponsor' ? (logoBase64 || '') : '',
        logoFileName: currentMode === 'sponsor' ? (logoOriginalName || '') : '',
        logoMimeType: currentMode === 'sponsor' ? (logoMimeType || '') : ''
      };

      // --- Show loading state ---
      var submitBtn = document.getElementById('submitBtn');
      var submitTextEl = document.getElementById('submitText');
      var submitSpinner = document.getElementById('submitSpinner');
      if (submitBtn) submitBtn.disabled = true;
      if (submitTextEl) submitTextEl.textContent = 'Submitting...';
      if (submitSpinner) submitSpinner.style.display = 'inline-block';

      // --- Send to Google Apps Script ---
      fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify(formData)
      })
      .then(function () {
        // no-cors means opaque response — show success optimistically
        regForm.style.display = 'none';
        if (regTypeTabs) regTypeTabs.style.display = 'none';
        if (formSuccess) {
          var successMsg = document.getElementById('successMessage');
          if (successMsg) {
            successMsg.textContent = currentMode === 'sponsor'
              ? 'Your hole sponsor registration has been logged and date-stamped. Please note that submission does not guarantee a spot \u2014 the opportunity is limited to 18 sponsorships. The committee will contact you regarding acceptance, hole assignment, and logo placement. You will receive a confirmation email shortly \u2014 if you don\u2019t see it within a few minutes, please check your spam folder.'
              : 'Your registration has been logged and date-stamped. Registration does not guarantee a spot \u2014 accepted registrations will follow the process outlined above. You will receive a confirmation email shortly \u2014 if you don\u2019t see it within a few minutes, please check your spam folder.';
          }
          formSuccess.style.display = 'block';
          formSuccess.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      })
      .catch(function (err) {
        console.error('Submission error:', err);
        regForm.style.display = 'none';
        if (formError) {
          formError.style.display = 'block';
          formError.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      })
      .finally(function () {
        if (submitBtn) submitBtn.disabled = false;
        if (submitTextEl) submitTextEl.textContent = currentMode === 'sponsor'
          ? 'Submit Hole Sponsor Registration' : 'Submit Registration';
        if (submitSpinner) submitSpinner.style.display = 'none';
      });
    });
  }

  // Retry button
  var retryBtn = document.getElementById('retryBtn');
  if (retryBtn) {
    retryBtn.addEventListener('click', function () {
      if (formError) formError.style.display = 'none';
      if (regTypeTabs) regTypeTabs.style.display = 'flex';
      if (regForm) regForm.style.display = 'block';
    });
  }

  // ---------- Smooth scroll for anchor links ----------
  document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
    anchor.addEventListener('click', function (e) {
      var target = document.querySelector(this.getAttribute('href'));
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });

  // ---------- Scroll Reveal (enhanced) ----------
  if ('IntersectionObserver' in window) {
    var revealObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.style.opacity = '1';
          entry.target.style.transform = 'translateY(0)';
          revealObs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

    var revealGroups = [
      { sel: '.section-header', delay: 0 },
      { sel: '.about-card', delay: 0.1 },
      { sel: '.countdown-box', delay: 0.1 },
      { sel: '.reg-date-card', delay: 0.1 },
      { sel: '.process-step', delay: 0.1 },
      { sel: '.pricing-card', delay: 0.1 },
      { sel: '.checklist-box', delay: 0 },
      { sel: '.reg-cta-box', delay: 0 },
      { sel: '.format-block', delay: 0 },
      { sel: '.scoring-item', delay: 0.08 },
      { sel: '.optional-card', delay: 0.1 },
      { sel: '.rule-card', delay: 0.08 },
      { sel: '.champion-row', delay: 0.04 },
      { sel: '.timeline-item', delay: 0.06 },
      { sel: '.bracket-round', delay: 0.08 },
    ];

    revealGroups.forEach(function (group) {
      document.querySelectorAll(group.sel).forEach(function (el, i) {
        el.style.opacity = '0';
        el.style.transform = 'translateY(22px)';
        el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        el.style.transitionDelay = Math.min(i * group.delay, 0.45) + 's';
        revealObs.observe(el);
      });
    });
  }

})();

// ---------- Hero Gold Particle Canvas ----------
(function () {
  var canvas = document.getElementById('heroParticles');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  var W, H;

  function resize() {
    W = canvas.width = canvas.offsetWidth;
    H = canvas.height = canvas.offsetHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  var NUM = 45;
  var particles = [];

  function spawnParticle(initY) {
    return {
      x: Math.random() * W,
      y: initY !== undefined ? initY : H + 10,
      startY: H + 10,  // always real spawn point so fade-in is consistent
      r: 0.8 + Math.random() * 2.5,
      vy: -(0.2 + Math.random() * 0.35),
      vx: (Math.random() - 0.5) * 0.15,
      maxOpacity: 0.08 + Math.random() * 0.28,
    };
  }

  // Pre-position across full hero so they're spread from the start
  for (var i = 0; i < NUM; i++) particles.push(spawnParticle(Math.random() * (H + 10)));

  function animateParticles() {
    ctx.clearRect(0, 0, W, H);
    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];
      p.x += p.vx;
      p.y += p.vy;

      if (p.y < -10) { particles[i] = spawnParticle(); continue; }

      // Fade in over first 80px of travel, fade out in top 15% of hero
      var traveled = p.startY - p.y;
      var fadeIn  = Math.min(traveled / 80, 1);
      var fadeOut = p.y < H * 0.15 ? (p.y / (H * 0.15)) : 1;
      var opacity = p.maxOpacity * fadeIn * fadeOut;

      // Core dot
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(184,150,62,' + opacity + ')';
      ctx.fill();

      // Soft halo
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * 3, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(184,150,62,' + (opacity * 0.15) + ')';
      ctx.fill();
    }
    requestAnimationFrame(animateParticles);
  }
  animateParticles();
})();

// ---------- Anniversary Counter (65th) ----------
(function () {
  var el = document.getElementById('annivCounter');
  if (!el) return;

  // Set to 1 immediately so "65" is never visible before counting begins
  el.textContent = '1';

  // Start after fade-in completes: 0.4s delay + 0.7s animation + small buffer
  setTimeout(function () {
    var target = 65;
    var duration = 1400;
    var start = null;
    function step(ts) {
      if (!start) start = ts;
      var progress = Math.min((ts - start) / duration, 1);
      var eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = Math.round(1 + eased * (target - 1));
      if (progress < 1) requestAnimationFrame(step);
      else el.textContent = target;
    }
    requestAnimationFrame(step);
  }, 1200);
})();
