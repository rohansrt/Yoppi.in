/* YOPPI — contact form prototype behaviour (no backend) */
(function () {
  var form = document.getElementById('contact-form');
  var status = document.getElementById('form-status');
  if (!form) return;

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    status.textContent = 'Thanks — this is a UI prototype, so nothing was sent yet. We’ll wire this up to the backend next.';
    status.style.color = 'var(--accent)';
  });
})();
