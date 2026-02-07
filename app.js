
/* ============================================================
   The Pheasant Invitational — App JS
   ============================================================ */

(function () {
  'use strict';

  // ---------- Navbar scroll effect ----------
  const navbar = document.getElementById('navbar');
  if (navbar) {
    window.addEventListener('scroll', function () {
      navbar.classList.toggle('scrolled', window.scrollY > 40);
    }, { passive: true });
  }

  // ---------- Mobile nav toggle ----------
  const navToggle = document.getElementById('navToggle');
  const navMenu = document.getElementById('navMenu');

  if (navToggle && navMenu) {
    navToggle.addEventListener('click', function () {
      navToggle.classList.toggle('active');
      navMenu.classList.toggle('open');
    });

    // Close menu when a link is tapped
    navMenu.querySelectorAll('.nav-link').forEach(function (link) {
      link.addEventListener('click', function () {
        navToggle.classList.remove('active');
        navMenu.classList.remove('open');
      });
    });
  }

  // ---------- Schedule day tabs ----------
  const tabBtns = document.querySelectorAll('.tab-btn');
  const scheduleDays = document.querySelectorAll('.schedule-day');

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

  // ---------- Countdown timer ----------
  var regOpenDate = new Date('2026-06-12T17:00:00Z'); // 10 AM PDT = 5 PM UTC
  var countdownBox = document.getElementById('countdownBox');
  var countDays = document.getElementById('countDays');
  var countHours = document.getElementById('countHours');
  var countMinutes = document.getElementById('countMinutes');
  var countSeconds = document.getElementById('countSeconds');

  function updateCountdown() {
    var now = new Date();
    var diff = regOpenDate - now;

    if (diff <= 0) {
      // Registration is open — replace countdown with message
      if (countdownBox) {
        countdownBox.querySelector('h3').textContent = 'Registration Is Open!';
        var timer = document.getElementById('countdownTimer');
        if (timer) {
          timer.innerHTML = '<span class="countdown-live">Submit your team now</span>';
        }
        var dateEl = countdownBox.querySelector('.countdown-date');
        if (dateEl) dateEl.style.display = 'none';
      }
      return;
    }

    var days = Math.floor(diff / (1000 * 60 * 60 * 24));
    var hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    var minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    var seconds = Math.floor((diff % (1000 * 60)) / 1000);

    if (countDays) countDays.textContent = String(days).padStart(2, '0');
    if (countHours) countHours.textContent = String(hours).padStart(2, '0');
    if (countMinutes) countMinutes.textContent = String(minutes).padStart(2, '0');
    if (countSeconds) countSeconds.textContent = String(seconds).padStart(2, '0');
  }

  if (countdownBox) {
    updateCountdown();
    setInterval(updateCountdown, 1000);
  }

  // ---------- Registration form ----------
  var regForm = document.getElementById('registrationForm');
  var formStatus = document.getElementById('formStatus');
  var formSuccess = document.getElementById('formSuccess');

  if (regForm && formStatus) {
    if (new Date() >= regOpenDate) {
      regForm.style.display = 'block';
      formStatus.style.display = 'none';
    }
  }

  if (regForm) {
    regForm.addEventListener('submit', function (e) {
      e.preventDefault();
      // Hide form, show success
      regForm.style.display = 'none';
      if (formSuccess) formSuccess.style.display = 'block';
      // Scroll to success message
      formSuccess.scrollIntoView({ behavior: 'smooth', block: 'center' });
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

  // ---------- Intersection Observer for fade-in ----------
  var observerOptions = { threshold: 0.1, rootMargin: '0px 0px -40px 0px' };

  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.style.opacity = '1';
        entry.target.style.transform = 'translateY(0)';
        observer.unobserve(entry.target);
      }
    });
  }, observerOptions);

  // Observe cards and key elements for entrance animation
  document.querySelectorAll(
    '.about-card, .optional-card, .pricing-card, .reg-date-card, .rule-card, .format-block, .process-step'
  ).forEach(function (el) {
    el.style.opacity = '0';
    el.style.transform = 'translateY(20px)';
    el.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
    observer.observe(el);
  });

})();
