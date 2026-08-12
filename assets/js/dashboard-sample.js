/* MatchGrade — sample dashboard behaviour: tab scrolling only (UI only, no real data). */
(function () {
  var tabs = document.querySelectorAll('.dash-tab[data-tab]');
  tabs.forEach(function (tab) {
    tab.addEventListener('click', function (e) {
      e.preventDefault();
      tabs.forEach(function (t) { t.classList.remove('active'); });
      tab.classList.add('active');
      var target = document.getElementById('tab-' + tab.dataset.tab);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    });
  });
})();
