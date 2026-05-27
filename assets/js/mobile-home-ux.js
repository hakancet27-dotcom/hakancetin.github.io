(function () {
  'use strict';

  var desktopMarket = document.querySelector('header .desktop-market-strip, header .market-strip:not(.mobile-market-strip)');
  var mobileMarket = document.querySelector('.mobile-market-strip');
  var keys = ['usd', 'eur', 'gbp', 'btc'];
  var marketLinks = {
    usd: '/doviz-kurlari.html?birim=USD',
    eur: '/doviz-kurlari.html?birim=EUR',
    gbp: '/doviz-kurlari.html?birim=GBP',
    btc: '/doviz-kurlari.html?birim=BTC'
  };
  var marketLabels = {
    usd: 'USD/TRY kur detaylarını aç',
    eur: 'EUR/TRY kur detaylarını aç',
    gbp: 'GBP/TRY kur detaylarını aç',
    btc: 'Bitcoin TL fiyat detaylarını aç'
  };

  function itemIn(root, key) {
    if (!root) return null;
    return root.querySelector('[data-market-item="' + key + '"], #market-' + key + '-item');
  }

  function decorateMarketLinks(root) {
    if (!root) return;
    keys.forEach(function (key) {
      var item = itemIn(root, key);
      if (!item || item.dataset.detailReady) return;
      item.dataset.detailReady = 'true';
      item.setAttribute('role', 'link');
      item.setAttribute('tabindex', '0');
      item.setAttribute('aria-label', marketLabels[key]);
      item.classList.add('market-detail-link');
      item.addEventListener('click', function (event) {
        if (event.target.closest('a, button')) return;
        window.location.href = marketLinks[key];
      });
      item.addEventListener('keydown', function (event) {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        window.location.href = marketLinks[key];
      });
    });
  }

  function startLiveWidgets() {
    if (typeof window.startMarketsLive === 'function') window.startMarketsLive();
    if (typeof window.startWeatherLive === 'function') window.startWeatherLive();
  }

  function fixWeatherDetailRoute() {
    var list = document.getElementById('weather-list');
    if (!list || list.dataset.absoluteDetailReady) return;
    list.dataset.absoluteDetailReady = 'true';
    list.addEventListener('click', function (event) {
      if (event.target.closest('a')) return;
      var item = event.target.closest('li');
      if (!item) return;
      var cityNode = item.querySelector('.weather-city');
      var city = cityNode ? cityNode.textContent.trim() : '';
      if (!city) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      window.location.href = '/weather.html?city=' + encodeURIComponent(city);
    }, true);
    list.addEventListener('keydown', function (event) {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      var item = event.target.closest('li');
      if (!item) return;
      var cityNode = item.querySelector('.weather-city');
      var city = cityNode ? cityNode.textContent.trim() : '';
      if (!city) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      window.location.href = '/weather.html?city=' + encodeURIComponent(city);
    }, true);
    Array.prototype.forEach.call(list.querySelectorAll('li'), function (item) {
      item.setAttribute('role', 'link');
      item.setAttribute('tabindex', '0');
    });
    if ('MutationObserver' in window) {
      new MutationObserver(function () {
        Array.prototype.forEach.call(list.querySelectorAll('li'), function (item) {
          item.setAttribute('role', 'link');
          item.setAttribute('tabindex', '0');
        });
      }).observe(list, { childList: true });
    }
  }

  if (desktopMarket) {
    decorateMarketLinks(desktopMarket);

    if (!mobileMarket) {
      var mobileQuery = window.matchMedia('(max-width: 640px)');
      var hero = document.querySelector('.headline-slider');
      if (hero) {
        var marker = document.createComment('market-desktop-position');
        desktopMarket.parentNode.insertBefore(marker, desktopMarket);

        function retainLegacyLayout() {
          if (mobileQuery.matches) {
            desktopMarket.classList.add('mobile-market-strip');
            hero.insertAdjacentElement('afterend', desktopMarket);
            document.body.classList.add('mobile-home-ux-ready');
            desktopMarket.scrollLeft = 0;
          } else {
            desktopMarket.classList.remove('mobile-market-strip');
            if (marker.parentNode) marker.parentNode.insertBefore(desktopMarket, marker.nextSibling);
            document.body.classList.remove('mobile-home-ux-ready');
          }
          decorateMarketLinks(desktopMarket);
        }

        retainLegacyLayout();
        if (mobileQuery.addEventListener) mobileQuery.addEventListener('change', retainLegacyLayout);
      }
    } else {
      document.body.classList.add('mobile-home-static-ready');

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
        decorateMarketLinks(mobileMarket);
      }

      decorateMarketLinks(mobileMarket);
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
    }
  }

  fixWeatherDetailRoute();
  startLiveWidgets();
})();
