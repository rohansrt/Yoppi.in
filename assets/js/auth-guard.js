/* YOPPI — dashboard auth guard: bounces to the homepage if there's no active session. */
(function () {
  window.Yoppi.getSession().then(function (session) {
    if (!session) {
      window.location.href = 'index.html';
    }
  }).catch(function (err) {
    console.error('auth guard: getSession failed', err);
    window.location.href = 'index.html';
  });
})();
