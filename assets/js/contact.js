/* YOPPI — contact form, wired to the Supabase backend via window.Yoppi (see yoppi-client.js) */
(function () {
  var form = document.getElementById('contact-form');
  var status = document.getElementById('form-status');
  if (!form) return;

  var ROLE_VALUES = {
    'Sports Head / PE Teacher': 'sports_head_pe_teacher',
    'Facilities / Admin Manager': 'facilities_admin_manager',
    'Principal / Director': 'principal_director',
    'HR / Corporate Wellness': 'hr_corporate_wellness',
    'Vendor Partner': 'vendor_partner',
    'Other': 'other'
  };

  var submitBtn = form.querySelector('button[type="submit"]');
  var captcha = null;

  window.Yoppi.renderHcaptcha('contact-hcaptcha').then(function (handle) {
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

    var token = captcha && captcha.getResponse();
    if (!token) {
      setStatus('Please complete the captcha before sending.', true);
      return;
    }

    submitBtn.disabled = true;
    setStatus('Sending…', false);

    window.Yoppi.submitContact({
      name: form.name.value.trim(),
      org: form.org.value.trim(),
      email: form.email.value.trim(),
      phone: form.phone.value.trim(),
      role: ROLE_VALUES[form.role.value] || null,
      message: form.message.value.trim() || null,
      hcaptchaToken: token
    }).then(function () {
      setStatus('Thanks — we’ve received your message and will respond within one business day.', false);
      form.reset();
    }).catch(function (err) {
      console.error('submitContact failed', err);
      setStatus(err.message || 'Something went wrong — please try again.', true);
    }).finally(function () {
      submitBtn.disabled = false;
      if (captcha) captcha.reset();
    });
  });
})();
