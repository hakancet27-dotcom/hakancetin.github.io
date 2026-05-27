(function () {
  'use strict';

  var desktopMarket = document.querySelector('header .desktop-market-strip, header .market-strip:not(.mobile-market-strip)');
  var mobileMarket = document.querySelector('.mobile-market-strip');
  var keys = ['usd', 'eur', 'gbp', 'btc'];
  var detailKeys = ['usd', 'eur', 'gbp'];
  var links = {
    usd: '/weather.html?rate=USD',
    eur: '/weather.html?rate=EUR',
    gbp: '/weather.html?rate=GBP'
  };

  function makeRatesClickable(root) {
    if (!root) return;
    detailKeys.forEach(function (key) {
      var item = root.querySelector('[data-market-item="' + key + '"], #market-' + key + '-item');
      if (!item || item.dataset.detailReady) return;
      item.dataset.detailReady = 'true';
      item.setAttribute('role', 'link');
      item.setAttribute('tabindex', '0');
      item.setAttribute('aria-label', key.toUpperCase() + ' kur detayını aç');
      item.addEventListener('click', function () { location.href = links[key]; });
      item.addEventListener('keydown', function (event) {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          location.href = links[key];
        }
      });
    });
  }

  function fixWeatherLinks() {
    var list = document.getElementById('weather-list');
    if (!list) return;
    list.addEventListener('click', function (event) {
      var item = event.target.closest('li');
      if (!item) return;
      var city = item.querySelector('.weather-city');
      if (!city) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      location.href = '/weather.html?city=' + encodeURIComponent(city.textContent.trim());
    }, true);
  }

  if (!desktopMarket) {
    fixWeatherLinks();
    if (typeof window.startWeatherLive === 'function') window.startWeatherLive();
    return;
  }

  makeRatesClickable(desktopMarket);

  if (!mobileMarket) {
    var media = window.matchMedia('(max-width: 640px)');
    var hero = document.querySelector('.headline-slider');
    var marker = document.createComment('market-desktop-position');
    desktopMarket.parentNode.insertBefore(marker, desktopMarket);

    function placeMarket() {
      if (media.matches && hero) {
        desktopMarket.classList.add('mobile-market-strip');
        hero.insertAdjacentElement('afterend', desktopMarket);
        document.body.classList.add('mobile-home-ux-ready');
      } else {
        desktopMarket.classList.remove('mobile-market-strip');
        if (marker.parentNode) marker.parentNode.insertBefore(desktopMarket, marker.nextSibling);
        document.body.classList.remove('mobile-home-ux-ready');
      }
    }
    placeMarket();
    if (media.addEventListener) media.addEventListener('change', placeMarket);
  } else {
    document.body.classList.add('mobile-home-static-ready');
    function syncValues() {
      keys.forEach(function (key) {
        var sourceItem = document.getElementById('market-' + key + '-item');
        var sourceValue = document.getElementById('market-' + key);
        var sourceChange = document.getElementById('market-' + key + '-change');
        var targetItem = mobileMarket.querySelector('[data-market-item="' + key + '"]');
        var targetValue = mobileMarket.querySelector('[data-market-value="' + key + '"]');
        var targetChange = mobileMarket.querySelector('[data-market-change="' + key + '"]');
        if (sourceItem && targetItem) targetItem.className = sourceItem.className.replace(/\bdesktop-market-item\b/g, '').trim();
        if (sourceValue && targetValue) targetValue.textContent = sourceValue.textContent;
        if (sourceChange && targetChange) targetChange.textContent = sourceChange.textContent;
      });
      makeRatesClickable(mobileMarket);
    }
    syncValues();
    if ('MutationObserver' in window) {
      new MutationObserver(syncValues).observe(desktopMarket, { childList: true, characterData: true, subtree: true, attributes: true, attributeFilter: ['class'] });
    }
  }

  fixWeatherLinks();
  if (typeof window.startMarketsLive === 'function') window.startMarketsLive();
  if (typeof window.startWeatherLive === 'function') window.startWeatherLive();
})();
