/* Greenko x Bien - landing szkoleń: zachowania prototypu (bez zależności). */
(function () {
  'use strict';

  var dl = (window.dataLayer = window.dataLayer || []);
  var SLUGS = ['metaads', 'ai-w-firmie', 'ai-w-marketingu', 'strategia-social-media', 'linkedin', 'na-miare'];
  var params = new URLSearchParams(window.location.search);
  var desktopMq = window.matchMedia('(min-width: 768px)');
  var heroFormMq = window.matchMedia('(min-width: 1024px)');

  function sectionOf(el) {
    var s = el.closest('[data-section]');
    if (s) return s.getAttribute('data-section');
    var sec = el.closest('section, header, footer');
    return sec ? (sec.id || sec.className.split(' ')[0]) : 'unknown';
  }

  /* ---------- Szkolenie: select z ?szkolenie= ---------- */
  function setTraining(slug) {
    if (SLUGS.indexOf(slug) === -1) return;
    document.querySelectorAll('[data-training-select]').forEach(function (sel) {
      sel.value = slug;
      var f = sel.closest('.field');
      if (f) { f.classList.remove('is-invalid'); var e = f.querySelector('.field__error'); if (e) e.textContent = ''; }
    });
  }
  var qsSlug = (params.get('szkolenie') || '').toLowerCase();
  if (qsSlug) setTraining(qsSlug);

  /* ---------- Ukryte pola: UTM, gclid, fbclid, landing_url ---------- */
  var trackKeys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'gclid', 'fbclid'];
  var stored = {};
  try { stored = JSON.parse(sessionStorage.getItem('gb_attrib') || '{}'); } catch (e) { stored = {}; }
  trackKeys.forEach(function (k) { if (params.get(k)) stored[k] = params.get(k); });
  if (!stored.landing_url) stored.landing_url = window.location.href;
  try { sessionStorage.setItem('gb_attrib', JSON.stringify(stored)); } catch (e) { /* prywatny tryb */ }
  document.querySelectorAll('input[data-track]').forEach(function (inp) {
    var k = inp.getAttribute('data-track');
    inp.value = k === 'landing_url' ? window.location.href : (stored[k] || '');
  });

  /* ---------- Karty szkoleń: accordion na mobile ---------- */
  var heads = document.querySelectorAll('.course__head');
  function syncCourses() {
    heads.forEach(function (btn) {
      var body = document.getElementById(btn.getAttribute('aria-controls'));
      if (desktopMq.matches) {
        btn.setAttribute('aria-expanded', 'true');
        btn.setAttribute('disabled', '');
        body.hidden = false;
      } else {
        btn.removeAttribute('disabled');
        var open = btn.getAttribute('data-open') === '1';
        btn.setAttribute('aria-expanded', open ? 'true' : 'false');
        body.hidden = !open;
      }
    });
  }
  heads.forEach(function (btn) {
    btn.addEventListener('click', function () {
      if (desktopMq.matches) return;
      var open = btn.getAttribute('aria-expanded') !== 'true';
      btn.setAttribute('data-open', open ? '1' : '0');
      syncCourses();
    });
  });
  // wariant szkolenia z URL: ta karta otwarta na mobile
  if (qsSlug) {
    var h = document.getElementById('head-' + qsSlug);
    if (h) h.setAttribute('data-open', '1');
  }
  syncCourses();
  (desktopMq.addEventListener ? desktopMq.addEventListener('change', syncCourses) : desktopMq.addListener(syncCourses));

  /* ---------- Przyciski kart: ustaw szkolenie i przewiń ---------- */
  document.querySelectorAll('[data-course-cta]').forEach(function (a) {
    a.addEventListener('click', function (ev) {
      var slug = a.getAttribute('data-course-cta');
      setTraining(slug);
      dl.push({ event: 'select_training', training: slug });
      ev.preventDefault();
      var target = document.getElementById('formularz');
      target.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
      var first = target.querySelector('input[name="name"]');
      if (first) setTimeout(function () { first.focus({ preventScroll: true }); }, 450);
    });
  });

  /* ---------- CTA hero na desktopie: fokus na formularz obok ---------- */
  var heroCta = document.querySelector('[data-hero-cta]');
  if (heroCta) {
    heroCta.addEventListener('click', function (ev) {
      if (!heroFormMq.matches) return;
      ev.preventDefault();
      var f = document.getElementById('h-name');
      if (f) f.focus();
    });
  }

  /* ---------- dataLayer: CTA i telefon ---------- */
  document.addEventListener('click', function (ev) {
    var cta = ev.target.closest('[data-cta]');
    if (cta) {
      dl.push({ event: 'click_cta', cta_text: cta.getAttribute('data-cta') || cta.textContent.trim(), section: sectionOf(cta) });
    }
    var tel = ev.target.closest('a[href^="tel:"]');
    if (tel) {
      dl.push({ event: 'click_phone', location: tel.getAttribute('data-phone') || sectionOf(tel) });
    }
  });

  /* ---------- Formularze: walidacja i przekierowanie ---------- */
  function fieldWrap(el) { return el.closest('.field') || el.closest('.consent'); }
  function errorEl(el) { var id = el.getAttribute('aria-describedby'); return id ? document.getElementById(id) : null; }

  function validate(el) {
    var ok = el.checkValidity();
    if (ok && el.type === 'tel') ok = el.value.replace(/\D/g, '').length >= 9;
    var w = fieldWrap(el), e = errorEl(el);
    if (w) w.classList.toggle('is-invalid', !ok);
    el.setAttribute('aria-invalid', ok ? 'false' : 'true');
    if (e) e.textContent = ok ? '' : (el.getAttribute('data-error') || 'Uzupełnij to pole');
    return ok;
  }

  document.querySelectorAll('form[data-form]').forEach(function (form) {
    var required = form.querySelectorAll('[required]');
    required.forEach(function (el) {
      el.addEventListener(el.tagName === 'SELECT' || el.type === 'checkbox' ? 'change' : 'blur', function () {
        if (el.value || el.type === 'checkbox' || el.getAttribute('aria-invalid') === 'true') validate(el);
      });
    });

    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var firstBad = null;
      required.forEach(function (el) { if (!validate(el) && !firstBad) firstBad = el; });
      if (firstBad) { firstBad.focus(); return; }

      // honeypot: bot dostaje "sukces", nic nie wysyłamy
      var hp = form.querySelector('input[name="website"]');
      var training = form.querySelector('[name="training"]').value;
      var btn = form.querySelector('[data-submit]');
      btn.disabled = true;
      btn.textContent = 'Wysyłamy...';

      if (!(hp && hp.value)) {
        dl.push({ event: 'form_submit', form_id: form.getAttribute('data-form'), training: training });
        // Prototyp: brak backendu. W produkcji: POST do endpointu (mail Greenko + CRM), potem redirect.
      }
      window.location.href = 'dziekujemy.html?szkolenie=' + encodeURIComponent(training);
    });
  });

  /* ---------- Nagłówek chowa się przy przewijaniu w dół, z dołu wysuwa się pasek z telefonem i CTA ----------
     Wzorzec jak na jack-sparrow.pl. Kierunek przewijania wymaga zdarzenia scroll: listener pasywny, odczyt raz na klatkę (rAF). */
  var root = document.body;
  var bar = document.querySelector('[data-float-bar]');
  var finalForm = document.getElementById('formularz');
  var lastY = window.scrollY, ticking = false, formVisible = false;
  function update() {
    var y = window.scrollY, dy = y - lastY;
    if (y < 160) root.classList.remove('header-hidden');
    else if (dy > 6) root.classList.add('header-hidden');
    else if (dy < -6) root.classList.remove('header-hidden');
    if (Math.abs(dy) > 6 || y < 160) lastY = y;
    if (bar) bar.classList.toggle('is-shown', root.classList.contains('header-hidden') && !formVisible);
    ticking = false;
  }
  window.addEventListener('scroll', function () {
    if (!ticking) { ticking = true; requestAnimationFrame(update); }
  }, { passive: true });
  /* pasek znika, gdy formularz końcowy jest na ekranie */
  if (bar && finalForm && 'IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { formVisible = en.isIntersecting; update(); });
    }, { threshold: 0.15 }).observe(finalForm);
  }
})();
