/* YOPPI — signup form prototype behaviour (no backend) */
(function () {
  var form = document.getElementById('signup-form');
  var status = document.getElementById('signup-status');
  if (!form) return;

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    status.textContent = 'Thanks — this is a UI prototype, so no account was created yet. In V2 this will register your institution and take you to onboarding.';
    status.style.color = 'var(--accent)';
  });
})();
