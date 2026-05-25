(function () {
  'use strict';

  var desktopMarket = document.querySelector('header .desktop-market-strip, header .market-strip:not(.mobile-market-strip)');
  var mobileMarket = document.querySelector('.mobile-market-strip');

  if (!desktopMarket) return;

  if (!mobileMarket) {
    var mobileQuery = window.matchMedia('(max-width: 640px)');
    var hero = document.querySelector('.headline-slider');
    if (!hero) return;

    var marker = document.createComment('market-desktop-position');
    desktopMarket.parentNode.insertBefore(marker, desktopMarket);

    function retainLegacyLayout() {
      if (mobileQuery.matches) {
        hero.insertAdjacentElement('afterend', desktopMarket);
        document.body.classList.add('mobile-home-ux-ready');
        desktopMarket.scrollLeft = 0;
      } else {
        if (marker.parentNode) marker.parentNode.insertBefore(desktopMarket, marker.nextSibling);
        document.body.classList.remove('mobile-home-ux-ready');
      }
    }

    retainLegacyLayout();
    if (mobileQuery.addEventListener) mobileQuery.addEventListener('change', retainLegacyLayout);
    return;
  }

  document.body.classList.add('mobile-home-static-ready');
  var keys = ['usd', 'eur', 'gbp', 'btc'];

  function syncMarketValues() {
    keys.forEach(function (key) {
      var sourceItem = document.getElementById('market-' + key + '-item');
      var sourceValue = document.getElementById('market-' + key);
      var sourceChange = document.getElementById('market-' + key + '-change');
      var targetItem = mobileMarket.querySelector('[data-market-item="' + key + '"]');
      var targetValue = mobileMarket.querySelector('[data-market-value="' + key + '"]');
      var targetChange = mobileMarket.querySelector('[data-market-change="' + key + '"]');

      if (!sourceItem || !targetItem) return;
      targetItem.className = sourceItem.className.replace(/\bdesktop-market-item\b/g, '').trim();
      if (sourceValue && targetValue) targetValue.textContent = sourceValue.textContent;
      if (sourceChange && targetChange) targetChange.textContent = sourceChange.textContent;
    });

    var sourceStatus = document.getElementById('market-status');
    var targetStatus = mobileMarket.querySelector('[data-market-status]');
    if (sourceStatus && targetStatus) targetStatus.textContent = sourceStatus.textContent;
  }

  syncMarketValues();

  if ('MutationObserver' in window) {
    new MutationObserver(syncMarketValues).observe(desktopMarket, {
      childList: true,
      characterData: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class']
    });
  }
})();
