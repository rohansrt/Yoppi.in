/* YOPPI — signup form, wired to the Supabase backend via window.Yoppi (see yoppi-client.js) */
(function () {
  var form = document.getElementById('signup-form');
  var status = document.getElementById('signup-status');
  if (!form) return;

  var ORG_TYPE_VALUES = {
    'School': 'school',
    'College / University': 'college_university',
    'Corporate Campus': 'corporate_campus',
    'Gated Society / Club': 'gated_society_club',
    'Other': 'other'
  };

  var HEADCOUNT_VALUES = {
    'Under 500': 'under_500',
    '500 to 2,000': '500_2000',
    '2,000 to 5,000': '2000_5000',
    '5,000+': '5000_plus'
  };

  var INTEREST_VALUES = {
    'Care': 'care',
    'Lease': 'lease',
    'Asset Management': 'asset_management'
  };

  var submitBtn = form.querySelector('button[type="submit"]');
  var captcha = null;

  window.Yoppi.renderHcaptcha('signup-hcaptcha').then(function (handle) {
    captcha = handle;
  }).catch(function (err) {
    console.error('hCaptcha failed to load', err);
    status.textContent = 'Could not load spam protection — please refresh the page.';
    status.style.color = 'var(--error, #c0392b)';
  });

  function setStatus(message, isError) {
    status.textContent = message;
    status.style.color = isError ? 'var(--error, #c0392b)' : 'var(--accent)';
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();

    var password = form['password'].value;
    var passwordConfirm = form['password-confirm'].value;

    if (password.length < 8) {
      setStatus('Password must be at least 8 characters.', true);
      return;
    }
    if (password !== passwordConfirm) {
      setStatus('Passwords do not match.', true);
      return;
    }

    var token = captcha && captcha.getResponse();
    if (!token) {
      setStatus('Please complete the captcha before continuing.', true);
      return;
    }

    submitBtn.disabled = true;
    setStatus('Creating your account…', false);

    window.Yoppi.signupOrganization({
      orgName: form['org-name'].value.trim(),
      orgType: ORG_TYPE_VALUES[form['org-type'].value] || 'other',
      city: form.city.value.trim(),
      headcountRange: HEADCOUNT_VALUES[form.headcount.value] || null,
      contactPerson: form['contact-person'].value.trim(),
      designation: form.designation.value.trim() || null,
      phone: form.phone.value.trim(),
      email: form.email.value.trim(),
      password: password,
      interest: INTEREST_VALUES[form.interest.value] || null,
      hcaptchaToken: token
    }).then(function () {
      setStatus('Account created — check your inbox for a verification email before logging in.', false);
      form.reset();
    }).catch(function (err) {
      console.error('signupOrganization failed', err);
      setStatus(err.message || 'Something went wrong — please try again.', true);
    }).finally(function () {
      submitBtn.disabled = false;
      if (captcha) captcha.reset();
    });
  });
})();
