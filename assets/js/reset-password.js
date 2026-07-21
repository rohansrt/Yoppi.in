/* YOPPI — password reset landing page, wired to window.Yoppi (see yoppi-client.js).
   Reached via the recovery link Supabase emails after requestPasswordReset(); the
   Supabase client auto-detects the recovery session from the URL on load. */
(function () {
  var form = document.getElementById('reset-password-form');
  var status = document.getElementById('reset-password-status');
  if (!form) return;

  var submitBtn = form.querySelector('button[type="submit"]');

  function setStatus(message, isError) {
    status.textContent = message;
    status.style.color = isError ? 'var(--error, #c0392b)' : 'var(--accent)';
  }

  window.Yoppi.getSession().then(function (session) {
    if (!session) {
      setStatus('This reset link is invalid or has expired. Request a new one from the login form.', true);
      submitBtn.disabled = true;
    }
  }).catch(function (err) {
    console.error('getSession failed', err);
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault();

    var password = form['password'].value;
    var confirmPassword = form['password-confirm'].value;

    if (password.length < 8) {
      setStatus('Password must be at least 8 characters.', true);
      return;
    }
    if (password !== confirmPassword) {
      setStatus('Passwords do not match.', true);
      return;
    }

    submitBtn.disabled = true;
    setStatus('Updating your password…', false);

    window.Yoppi.updatePassword(password).then(function () {
      setStatus('Password updated — taking you to your dashboard…', false);
      setTimeout(function () {
        window.location.href = 'dashboard.html';
      }, 1500);
    }).catch(function (err) {
      console.error('updatePassword failed', err);
      setStatus(err.message || 'Something went wrong — please try again.', true);
      submitBtn.disabled = false;
    });
  });
})();
