/* YOPPI — dashboard prototype behaviour (UI only, no data/backend) */
(function () {
  var tabs = document.querySelectorAll('.dash-tab[data-tab]');
  tabs.forEach(function (tab) {
    tab.addEventListener('click', function (e) {
      e.preventDefault();
      tabs.forEach(function (t) { t.classList.remove('active'); });
      tab.classList.add('active');
    });
  });
})();
