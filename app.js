
/* ============================================================
   The Pheasant Invitational — App JS
   ============================================================ */

(function () {
  'use strict';

  // ---------- Configuration ----------
  var SPONSOR_OPEN_DATE  = new Date('2026-06-05T17:00:00Z'); // June 5, 10 AM PDT
  var SPONSOR_CLOSE_DATE = new Date('2026-06-11T06:59:00Z'); // June 10, 11:59 PM PDT
  var REG_OPEN_DATE      = new Date('2026-06-12T17:00:00Z'); // June 12, 10 AM PDT
  // Show Leaderboard/Pairings nav links during event week only.
  // Update these each year to match the tournament dates.
  var TOURNAMENT_NAV_START = new Date('2026-09-16T07:00:00Z'); // Sept 16, day before event
  var TOURNAMENT_NAV_END   = new Date('2026-12-31T23:59:59Z'); // end of year
  var APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzv1eGhaOCn-Yb_zdtfeVFfDQMCfO_rFp7UJ_NU6xdVNXOuJoalxAHLGn150jFSFoYVHQ/exec';
  var MAX_LOGO_SIZE = 5 * 1024 * 1024; // 5 MB
  var PRANK_ENABLED = new Date() >= new Date('2027-05-01T07:00:00Z'); // auto-enable May 1, 2027
  var ALLOWED_LOGO_TYPES = ['image/png', 'image/jpeg', 'image/svg+xml', 'application/pdf'];

  // ---------- Tournament-week nav links ----------
  var now = new Date();
  if (now >= TOURNAMENT_NAV_START && now <= TOURNAMENT_NAV_END) {
    document.querySelectorAll('.tournament-nav-item').forEach(function(el) {
      el.style.display = 'list-item';
    });
  }

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
    var sponsorOpen   = now >= SPONSOR_OPEN_DATE;
    var sponsorClosed = now >= SPONSOR_CLOSE_DATE;
    var openOpen      = now >= REG_OPEN_DATE;

    sponsorBtns.forEach(function(btn) {
      if (!btn) return;
      if (sponsorClosed) {
        // Sponsor window closed — hide entirely
        btn.style.display = 'none';
      } else if (sponsorOpen && !sponsorClosed) {
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
    // Set timer to zeros
    if (sponsorElements.days) sponsorElements.days.textContent = '00';
    if (sponsorElements.hours) sponsorElements.hours.textContent = '00';
    if (sponsorElements.minutes) sponsorElements.minutes.textContent = '00';
    if (sponsorElements.seconds) sponsorElements.seconds.textContent = '00';
    // Show refresh prompt
    var prompt = document.getElementById('sponsorRefreshPrompt');
    if (prompt) prompt.style.display = 'block';
    updateFormVisibility();
  }

  function onOpenExpired() {
    openExpired = true;
    var titleEl = document.getElementById('openCountdownTitle');
    if (titleEl) titleEl.textContent = 'Open Registration Is Open!';
    // Set timer to zeros
    if (openElements.days) openElements.days.textContent = '00';
    if (openElements.hours) openElements.hours.textContent = '00';
    if (openElements.minutes) openElements.minutes.textContent = '00';
    if (openElements.seconds) openElements.seconds.textContent = '00';
    // Show refresh prompt
    var prompt = document.getElementById('openRefreshPrompt');
    if (prompt) prompt.style.display = 'block';
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

  // Auto-reload when a registration window opens (for users already on the page)
  var nextOpen = null;
  var loadedAt = new Date();
  if (loadedAt < SPONSOR_OPEN_DATE) nextOpen = SPONSOR_OPEN_DATE;
  else if (loadedAt < REG_OPEN_DATE) nextOpen = REG_OPEN_DATE;
  if (nextOpen) {
    var msUntilOpen = nextOpen - loadedAt;
    if (msUntilOpen < 86400000) {
      setTimeout(function () { location.reload(); }, msUntilOpen + 500);
    }
  }

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
    var sponsorOpen   = now >= SPONSOR_OPEN_DATE;
    var sponsorClosed = now >= SPONSOR_CLOSE_DATE;
    var openOpen      = now >= REG_OPEN_DATE;

    // Status messages
    if (formStatusSponsor) formStatusSponsor.style.display = sponsorOpen ? 'none' : 'block';
    if (formStatusOpen) formStatusOpen.style.display = openOpen ? 'none' : 'block';

    // Prep card: show until open registration is live
    if (prepCard) prepCard.style.display = openOpen ? 'none' : 'block';

    // If no registration window is currently active, hide form and tabs
    var sponsorActive = sponsorOpen && !sponsorClosed;
    if (!sponsorActive && !openOpen) {
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
    // Hole Sponsor tab: only available between June 5 and June 10 11:59 PM
    if (tabSponsor) {
      var sponsorTabOpen = sponsorOpen && !sponsorClosed;
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
    } else if (currentMode === 'sponsor' && (!sponsorOpen || sponsorClosed)) {
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

  // ---------- Success + Prank helpers ----------
  function showRealSuccess(mode) {
    if (formSuccess) {
      var successMsg = document.getElementById('successMessage');
      if (successMsg) {
        successMsg.textContent = mode === 'sponsor'
          ? 'Your hole sponsor registration has been logged and date-stamped. Please note that submission does not guarantee a spot — the opportunity is limited to 18 sponsorships. The committee will contact you regarding acceptance, hole assignment, and logo placement. You will receive a confirmation email shortly — if you don’t see it within a few minutes, please check your spam folder.'
          : 'Your registration has been logged and date-stamped. Registration does not guarantee a spot — accepted registrations will follow the process outlined above. You will receive a confirmation email shortly — if you don’t see it within a few minutes, please check your spam folder.';
      }
      formSuccess.style.display = 'block';
      formSuccess.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  function showPrank(onDone) {
    var riddles = [
      { q: 'What has hands but can’t clap?', a: 'a clock' },
      { q: 'What building has the most stories?', a: 'a library' },
      { q: 'What can you catch but not throw?', a: 'a cold' },
      { q: 'What has a head and a tail but no body?', a: 'a coin' },
      { q: 'What goes up but never comes down?', a: 'your age' }
    ];
    var riddle = riddles[Math.floor(Math.random() * riddles.length)];
    var secondsLeft = 10;

    var overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.8);z-index:9999;display:flex;align-items:center;justify-content:center;';

    var box = document.createElement('div');
    box.style.cssText = 'background:#fff;border-radius:12px;padding:40px 36px;max-width:440px;width:90%;text-align:center;font-family:Raleway,sans-serif;';

    var icon = document.createElement('div');
    icon.style.cssText = 'font-size:44px;margin-bottom:12px;';
    icon.textContent = '⚠️';

    var title = document.createElement('h3');
    title.style.cssText = 'font-family:Playfair Display,serif;font-size:22px;color:#c0392b;margin-bottom:8px;';
    title.textContent = 'Security Verification Required';

    var subtitle = document.createElement('p');
    subtitle.style.cssText = 'font-size:14px;color:#666;margin-bottom:20px;';
    subtitle.textContent = 'To prevent bot registrations, answer the following to confirm your spot:';

    var question = document.createElement('p');
    question.style.cssText = 'font-size:18px;font-weight:700;color:#1a3a2a;margin-bottom:20px;font-style:italic;';
    question.textContent = riddle.q;

    var input = document.createElement('input');
    input.type = 'text';
    input.placeholder = 'Type your answer...';
    input.style.cssText = 'width:100%;padding:12px 16px;font-size:16px;border:2px solid #ddd;border-radius:8px;font-family:Raleway,sans-serif;box-sizing:border-box;margin-bottom:16px;text-align:center;';

    var timer = document.createElement('div');
    timer.style.cssText = 'font-size:32px;font-weight:700;color:#c0392b;margin-bottom:12px;font-family:Playfair Display,serif;';
    timer.textContent = '0:' + String(secondsLeft).padStart(2, '0');

    var warning = document.createElement('p');
    warning.style.cssText = 'font-size:13px;color:#c0392b;font-weight:600;';
    warning.textContent = 'Registration will be canceled if time expires.';

    var submitBtn = document.createElement('button');
    submitBtn.style.cssText = 'padding:12px 28px;background:#1a3a2a;color:#fff;border:none;border-radius:8px;font-size:15px;font-weight:600;cursor:pointer;font-family:Raleway,sans-serif;margin-top:8px;';
    submitBtn.textContent = 'Submit Answer';

    submitBtn.addEventListener('click', function () {
      input.style.borderColor = '#c0392b';
      input.value = '';
      input.placeholder = 'Incorrect — try again!';
    });

    box.appendChild(icon);
    box.appendChild(title);
    box.appendChild(subtitle);
    box.appendChild(question);
    box.appendChild(input);
    box.appendChild(submitBtn);
    box.appendChild(timer);
    box.appendChild(warning);
    overlay.appendChild(box);
    document.body.appendChild(overlay);
    input.focus();

    var interval = setInterval(function () {
      secondsLeft--;
      timer.textContent = '0:' + String(secondsLeft).padStart(2, '0');
      if (secondsLeft <= 3) {
        timer.style.fontSize = '38px';
        box.style.borderColor = '#c0392b';
        box.style.border = '2px solid #c0392b';
      }
      if (secondsLeft <= 0) {
        clearInterval(interval);
        icon.textContent = '😂';
        title.textContent = 'Just Kidding!';
        title.style.color = '#1a3a2a';
        subtitle.textContent = '';
        question.style.cssText = 'font-size:16px;color:#333;margin-bottom:20px;line-height:1.6;font-style:normal;font-weight:400;';
        question.textContent = 'Relax \u2014 your registration was saved the moment you hit Submit. You\u2019re all set. The answer was "' + riddle.a + '," by the way.';
        input.style.display = 'none';
        submitBtn.style.display = 'none';
        timer.style.display = 'none';
        warning.style.display = 'none';
        var closeBtn = document.createElement('button');
        closeBtn.style.cssText = 'padding:14px 32px;background:#1a3a2a;color:#fff;border:none;border-radius:8px;font-size:16px;font-weight:600;cursor:pointer;font-family:Raleway,sans-serif;';
        closeBtn.textContent = 'Got It';
        closeBtn.addEventListener('click', function () {
          document.body.removeChild(overlay);
          onDone();
        });
        box.appendChild(closeBtn);
      }
    }, 1000);
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
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify(formData),
        redirect: 'follow'
      })
      .then(function (response) {
        if (!response.ok) throw new Error('Server returned ' + response.status);
        return response.json();
      })
      .then(function (result) {
        if (result.status !== 'success') throw new Error(result.message || 'Registration failed');
        regForm.style.display = 'none';
        if (regTypeTabs) regTypeTabs.style.display = 'none';

        if (PRANK_ENABLED && currentMode === 'open') {
          showPrank(function () { showRealSuccess('open'); });
        } else {
          showRealSuccess(currentMode);
        }
      })
      .catch(function (err) {
        console.error('Submission error:', err);
        regForm.style.display = 'none';
        if (formError) {
          var errorMsg = document.getElementById('errorMessage');
          if (errorMsg) errorMsg.textContent = 'Something went wrong: ' + err.message + '. Please try again or contact the committee directly.';
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

  // Take full JS control — cancel CSS animation so it can't override our opacity
  var line = el.closest('.hero-anniversary-line');
  if (line) {
    line.classList.add('js-controlled');
    line.style.opacity = '0';
  }
  el.textContent = '1';

  // Fade entire line in when counting starts
  setTimeout(function () {
    if (line) {
      line.style.transition = 'opacity 0.3s ease';
      line.style.opacity = '1';
    }
    var target = 65;
    var duration = 1200;
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
  }, 1150);
})();

// ---------- Hero Title Shimmer (runs once, ~2s after title slides in) ----------
(function () {
  var title = document.querySelector('.hero-title');
  if (!title) return;
  // title finishes sliding in at ~1.35s; wait 1 full second after = 2350ms
  setTimeout(function () {
    title.classList.add('shimmer-once');
  }, 2350);
})();
