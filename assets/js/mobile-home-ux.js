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

  /* Existing page slider rotates every three seconds. When the visitor actively
     chooses a headline, preserve that chosen slide for one minute. */
  var slides = Array.prototype.slice.call(hero.querySelectorAll('.headline-slide'));
  var pauseUntil = 0;
  var heldSlide = null;
  var touchStartX = null;
  var restoring = false;

  function activeSlide() {
    return hero.querySelector('.headline-slide.is-active');
  }

  function holdCurrentSlide() {
    var selected = activeSlide();
    if (!selected) return;
    heldSlide = selected;
    pauseUntil = Date.now() + 60000;
  }

  function restoreHeldSlide() {
    if (!heldSlide || Date.now() >= pauseUntil || restoring) return;
    var visible = activeSlide();
    if (visible === heldSlide) return;
    restoring = true;
    slides.forEach(function (slide) {
      slide.classList.toggle('is-active', slide === heldSlide);
    });
    hero.classList.toggle('has-image-active', Boolean(heldSlide.querySelector('.headline-image img')));
    restoring = false;
  }

  hero.querySelectorAll('[data-slider-prev], [data-slider-next]').forEach(function (button) {
    button.addEventListener('click', function () {
      window.setTimeout(holdCurrentSlide, 0);
    });
  });

  hero.addEventListener('touchstart', function (event) {
    if (!event.changedTouches || !event.changedTouches.length) return;
    touchStartX = event.changedTouches[0].clientX;
  }, { passive: true });

  hero.addEventListener('touchend', function (event) {
    if (touchStartX === null || !event.changedTouches || !event.changedTouches.length) return;
    var distance = event.changedTouches[0].clientX - touchStartX;
    touchStartX = null;
    if (Math.abs(distance) >= 45) window.setTimeout(holdCurrentSlide, 0);
  }, { passive: true });

  var observer = new MutationObserver(function () {
    restoreHeldSlide();
  });
  slides.forEach(function (slide) {
    observer.observe(slide, { attributes: true, attributeFilter: ['class'] });
  });
})();
