(function () {
  'use strict';

  var desktopMarket = document.querySelector('header .desktop-market-strip, header .market-strip:not(.mobile-market-strip)');
  var mobileMarket = document.querySelector('.mobile-market-strip');

  if (!desktopMarket || !mobileMarket) return;

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
      targetItem.className = sourceItem.className;
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
