(function () {
  'use strict';

  var mobileQuery = window.matchMedia('(max-width: 640px)');
  var market = document.querySelector('.market-strip');
  var hero = document.querySelector('.headline-slider');
  if (!market || !hero) return;

  var marker = document.createComment('market-desktop-position');
  market.parentNode.insertBefore(marker, market);

  function arrangeMobileHome() {
    if (mobileQuery.matches) {
      hero.insertAdjacentElement('afterend', market);
      document.body.classList.add('mobile-home-ux-ready');
      market.scrollLeft = 0;
    } else {
      if (marker.parentNode) marker.parentNode.insertBefore(market, marker.nextSibling);
      document.body.classList.remove('mobile-home-ux-ready');
    }
  }

  arrangeMobileHome();
  if (mobileQuery.addEventListener) mobileQuery.addEventListener('change', arrangeMobileHome);
})();
