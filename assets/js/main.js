/* YOPPI — shared site behaviour: nav toggle + scroll reveal */
(function () {
  var toggle = document.querySelector('.nav-toggle');
  var links = document.querySelector('.nav-links');

  if (toggle && links) {
    toggle.addEventListener('click', function () {
      links.classList.toggle('is-open');
      var expanded = links.classList.contains('is-open');
      toggle.setAttribute('aria-expanded', expanded);
    });

    links.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () {
        links.classList.remove('is-open');
      });
    });
  }

  var revealEls = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && revealEls.length) {
    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 }
    );
    revealEls.forEach(function (el) {
      observer.observe(el);
    });
  } else {
    revealEls.forEach(function (el) {
      el.classList.add('is-visible');
    });
  }

  var year = document.querySelector('[data-year]');
  if (year) {
    year.textContent = new Date().getFullYear();
  }

  /* ---------- Login → "View Sample" modal ---------- */
  var loginTriggers = document.querySelectorAll('[data-login-trigger]');
  if (loginTriggers.length) {
    var overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = 'login-modal';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'login-modal-title');
    overlay.innerHTML =
      '<div class="modal-card">' +
        '<button type="button" class="modal-close" data-modal-close aria-label="Close">' +
          '<svg viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6 6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>' +
        '</button>' +
        '<span class="pill">Sample Login</span>' +
        '<div class="modal-icon">' +
          '<svg viewBox="0 0 24 24" fill="none"><rect x="3" y="11" width="18" height="10" rx="2" stroke="currentColor" stroke-width="1.6"/><path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>' +
        '</div>' +
        '<h3>This is a sample login</h3>' +
        '<p>YOPPI is currently in prototype. There’s no real account to sign into yet &mdash; instead, explore a fully working sample dashboard as a demo institution admin.</p>' +
        '<div class="modal-actions">' +
          '<a href="dashboard.html" class="btn btn-primary">View Sample Dashboard</a>' +
          '<button type="button" class="btn btn-secondary" data-modal-close>Cancel</button>' +
        '</div>' +
        '<p class="modal-note">No signup or credentials required.</p>' +
      '</div>';
    document.body.appendChild(overlay);

    var openModal = function () {
      overlay.classList.add('is-open');
      document.body.style.overflow = 'hidden';
    };
    var closeModal = function () {
      overlay.classList.remove('is-open');
      document.body.style.overflow = '';
    };

    loginTriggers.forEach(function (trigger) {
      trigger.addEventListener('click', function (e) {
        e.preventDefault();
        openModal();
      });
    });

    overlay.addEventListener('click', function (e) {
      if (e.target === overlay || e.target.closest('[data-modal-close]')) {
        closeModal();
      }
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && overlay.classList.contains('is-open')) {
        closeModal();
      }
    });
  }
})();
