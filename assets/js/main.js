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

  /* ---------- Login modal ---------- */
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
        '<h3 id="login-modal-title">Log in to your dashboard</h3>' +
        '<form id="login-form" novalidate>' +
          '<div class="field">' +
            '<label for="login-email">Email</label>' +
            '<input type="email" id="login-email" name="email" required autocomplete="username" />' +
          '</div>' +
          '<div class="field">' +
            '<label for="login-password">Password</label>' +
            '<input type="password" id="login-password" name="password" required autocomplete="current-password" />' +
          '</div>' +
          '<div class="field"><div id="login-hcaptcha"></div></div>' +
          '<button type="submit" class="btn btn-primary btn-block">Log In</button>' +
          '<p class="form-note" id="login-status" role="status"></p>' +
          '<button type="button" class="link-inline" id="login-forgot-link">Forgot password?</button>' +
        '</form>' +
      '</div>';
    document.body.appendChild(overlay);

    var loginForm = overlay.querySelector('#login-form');
    var loginStatus = overlay.querySelector('#login-status');
    var loginSubmitBtn = loginForm.querySelector('button[type="submit"]');
    var loginCaptcha = null;

    if (window.Yoppi) {
      window.Yoppi.renderHcaptcha('login-hcaptcha').then(function (handle) {
        loginCaptcha = handle;
      }).catch(function (err) {
        console.error('hCaptcha failed to load', err);
      });
    }

    var setLoginStatus = function (message, isError) {
      loginStatus.textContent = message;
      loginStatus.style.color = isError ? 'var(--error, #c0392b)' : 'var(--accent)';
    };

    loginForm.addEventListener('submit', function (e) {
      e.preventDefault();

      var token = loginCaptcha && loginCaptcha.getResponse();
      if (!token) {
        setLoginStatus('Please complete the captcha before continuing.', true);
        return;
      }

      loginSubmitBtn.disabled = true;
      setLoginStatus('Logging in…', false);

      window.Yoppi.login({
        email: loginForm.email.value.trim(),
        password: loginForm.password.value,
        hcaptchaToken: token
      }).then(function () {
        window.location.href = 'dashboard.html';
      }).catch(function (err) {
        console.error('login failed', err);
        setLoginStatus(err.message || 'Could not log in — please check your details and try again.', true);
      }).finally(function () {
        loginSubmitBtn.disabled = false;
        if (loginCaptcha) loginCaptcha.reset();
      });
    });

    overlay.querySelector('#login-forgot-link').addEventListener('click', function () {
      var email = loginForm.email.value.trim();
      if (!email) {
        setLoginStatus('Enter your email above first, then click "Forgot password?" again.', true);
        return;
      }

      var token = loginCaptcha && loginCaptcha.getResponse();
      if (!token) {
        setLoginStatus('Please complete the captcha before continuing.', true);
        return;
      }

      var redirectTo = new URL('reset-password.html', window.location.href).href;
      setLoginStatus('Sending reset link…', false);
      window.Yoppi.requestPasswordReset(email, redirectTo, token).then(function () {
        setLoginStatus('If an account exists for that email, a reset link is on its way.', false);
      }).catch(function (err) {
        console.error('requestPasswordReset failed', err);
        setLoginStatus(err.message || 'Something went wrong — please try again.', true);
      }).finally(function () {
        if (loginCaptcha) loginCaptcha.reset();
      });
    });

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
        if (!window.Yoppi) {
          openModal();
          return;
        }
        window.Yoppi.getSession().then(function (session) {
          if (session) {
            window.location.href = 'dashboard.html';
          } else {
            openModal();
          }
        }).catch(function () {
          openModal();
        });
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

  /* ---------- "Book Now" → customise + register interest modal ---------- */
  var bookTriggers = document.querySelectorAll('[data-book-trigger]');
  if (bookTriggers.length) {
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
        '<form id="book-form" novalidate>' +
          '<div class="form-row">' +
            '<div class="field">' +
              '<label for="book-name">Your Name</label>' +
              '<input type="text" id="book-name" name="name" required />' +
            '</div>' +
            '<div class="field">' +
              '<label for="book-org">Organisation</label>' +
              '<input type="text" id="book-org" name="org" required />' +
            '</div>' +
          '</div>' +
          '<div class="form-row">' +
            '<div class="field">' +
              '<label for="book-email">Work Email</label>' +
              '<input type="email" id="book-email" name="email" required />' +
            '</div>' +
            '<div class="field">' +
              '<label for="book-interest">Interested In</label>' +
              '<select id="book-interest" name="interest" required>' +
                '<option value="">Select one</option>' +
                '<option value="care">Care</option>' +
                '<option value="lease">Lease</option>' +
                '<option value="asset_management">Asset Management</option>' +
              '</select>' +
            '</div>' +
          '</div>' +
          '<p>Pick the sports you’d like covered under this plan.</p>' +
          '<div class="sport-picker" id="book-sport-picker">Loading sports…</div>' +
          '<div class="field"><div id="book-hcaptcha"></div></div>' +
          '<div class="modal-actions">' +
            '<button type="submit" class="btn btn-primary btn-block">Continue</button>' +
          '</div>' +
          '<p class="form-note" id="book-status" role="status"></p>' +
        '</form>' +
      '</div>';
    document.body.appendChild(bookOverlay);

    var bookPlanTag = bookOverlay.querySelector('#book-modal-plan');
    var bookForm = bookOverlay.querySelector('#book-form');
    var bookSportPicker = bookOverlay.querySelector('#book-sport-picker');
    var bookStatus = bookOverlay.querySelector('#book-status');
    var bookSubmitBtn = bookForm.querySelector('button[type="submit"]');
    var bookCaptcha = null;

    var setBookStatus = function (message, isError) {
      bookStatus.textContent = message;
      bookStatus.style.color = isError ? 'var(--error, #c0392b)' : 'var(--accent)';
    };

    if (window.Yoppi) {
      window.Yoppi.renderHcaptcha('book-hcaptcha').then(function (handle) {
        bookCaptcha = handle;
      }).catch(function (err) {
        console.error('hCaptcha failed to load', err);
      });

      window.Yoppi.getSports().then(function (sports) {
        bookSportPicker.innerHTML = sports.map(function (sport, i) {
          return '<label class="sport-box"><input type="checkbox" data-sport-id="' + sport.id + '"' + (i < 3 ? ' checked' : '') + '><span>' + sport.name + '</span></label>';
        }).join('');
      }).catch(function (err) {
        console.error('getSports failed', err);
        bookSportPicker.textContent = 'Could not load the sports list — you can still continue without selecting any.';
      });
    }

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

    bookForm.addEventListener('submit', function (e) {
      e.preventDefault();

      var token = bookCaptcha && bookCaptcha.getResponse();
      if (!token) {
        setBookStatus('Please complete the captcha before continuing.', true);
        return;
      }

      var selectedSports = Array.prototype.slice
        .call(bookSportPicker.querySelectorAll('input[type="checkbox"]:checked'))
        .map(function (el) { return el.dataset.sportId; });

      bookSubmitBtn.disabled = true;
      setBookStatus('Submitting…', false);

      window.Yoppi.submitEnquiry({
        orgName: bookForm.org.value.trim(),
        contactPerson: bookForm.name.value.trim(),
        email: bookForm.email.value.trim(),
        interest: bookForm.interest.value,
        selectedSports: selectedSports,
        hcaptchaToken: token
      }).then(function () {
        setBookStatus('Thanks — our team will follow up shortly to schedule your free facility review.', false);
        bookForm.reset();
      }).catch(function (err) {
        console.error('submitEnquiry failed', err);
        setBookStatus(err.message || 'Something went wrong — please try again.', true);
      }).finally(function () {
        bookSubmitBtn.disabled = false;
        if (bookCaptcha) bookCaptcha.reset();
      });
    });
  }
})();
