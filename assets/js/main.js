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
      '<div class="modal-card modal-card--compact">' +
        '<button type="button" class="modal-close" data-modal-close aria-label="Close">' +
          '<svg viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6 6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>' +
        '</button>' +
        '<h3 id="login-modal-title">Sample login only</h3>' +
        '<div class="modal-actions">' +
          '<a href="dashboard.html" class="btn btn-primary btn-block">View Sample</a>' +
        '</div>' +
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

  /* ---------- "Book Now" → customise sports modal ---------- */
  var bookTriggers = document.querySelectorAll('[data-book-trigger]');
  if (bookTriggers.length) {
    var sports = ['Basketball', 'Football', 'Cricket', 'Badminton', 'Table Tennis', 'Swimming'];
    var bookOverlay = document.createElement('div');
    bookOverlay.className = 'modal-overlay';
    bookOverlay.id = 'book-modal';
    bookOverlay.setAttribute('role', 'dialog');
    bookOverlay.setAttribute('aria-modal', 'true');
    bookOverlay.setAttribute('aria-labelledby', 'book-modal-title');
    bookOverlay.innerHTML =
      '<div class="modal-card">' +
        '<button type="button" class="modal-close" data-modal-close aria-label="Close">' +
          '<svg viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6 6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>' +
        '</button>' +
        '<span class="pill" id="book-modal-plan"></span>' +
        '<h3 id="book-modal-title">Customise for your needs</h3>' +
        '<p>Pick the sports you’d like covered under this plan.</p>' +
        '<div class="sport-picker">' +
          sports.map(function (sport, i) {
            return '<label class="sport-box"><input type="checkbox"' + (i < 3 ? ' checked' : '') + '><span>' + sport + '</span></label>';
          }).join('') +
        '</div>' +
        '<div class="modal-actions">' +
          '<a href="contact.html" class="btn btn-primary btn-block">Continue</a>' +
        '</div>' +
      '</div>';
    document.body.appendChild(bookOverlay);

    var bookPlanTag = bookOverlay.querySelector('#book-modal-plan');
    var openBookModal = function () {
      bookOverlay.classList.add('is-open');
      document.body.style.overflow = 'hidden';
    };
    var closeBookModal = function () {
      bookOverlay.classList.remove('is-open');
      document.body.style.overflow = '';
    };

    bookTriggers.forEach(function (trigger) {
      trigger.addEventListener('click', function (e) {
        e.preventDefault();
        bookPlanTag.textContent = (trigger.dataset.plan || '') + ' Plan';
        openBookModal();
      });
    });

    bookOverlay.addEventListener('click', function (e) {
      if (e.target === bookOverlay || e.target.closest('[data-modal-close]')) {
        closeBookModal();
      }
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && bookOverlay.classList.contains('is-open')) {
        closeBookModal();
      }
    });
  }
})();
