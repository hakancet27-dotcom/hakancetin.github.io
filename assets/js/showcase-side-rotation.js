(function () {
  'use strict';

  var sidebar = document.querySelector('.side-headlines');
  if (!sidebar) return;

  var cards = Array.prototype.slice.call(sidebar.querySelectorAll('.side-headline')).slice(0, 10);
  if (!cards.length) return;

  var pageSize = 2;
  var pageCount = Math.ceil(cards.length / pageSize);
  var page = 0;
  var timer = null;
  var paused = false;
  var reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  sidebar.classList.add('is-rotating');

  var status = document.createElement('span');
  status.className = 'side-rotation-status';
  status.setAttribute('aria-hidden', 'true');
  sidebar.appendChild(status);

  function showPage(index) {
    page = (index + pageCount) % pageCount;
    cards.forEach(function (card, cardIndex) {
      var visible = Math.floor(cardIndex / pageSize) === page;
      card.hidden = !visible;
      card.setAttribute('aria-hidden', visible ? 'false' : 'true');
      if (!visible) card.setAttribute('tabindex', '-1');
      else card.removeAttribute('tabindex');
    });
    status.textContent = String(page + 1) + ' / ' + String(pageCount);
  }

  function stop() {
    if (timer) {
      window.clearInterval(timer);
      timer = null;
    }
  }

  function start() {
    stop();
    if (reducedMotion || pageCount <= 1 || paused) return;
    timer = window.setInterval(function () {
      showPage(page + 1);
    }, 10000);
  }

  sidebar.addEventListener('mouseenter', function () {
    paused = true;
    stop();
  });
  sidebar.addEventListener('mouseleave', function () {
    paused = false;
    start();
  });
  sidebar.addEventListener('focusin', function () {
    paused = true;
    stop();
  });
  sidebar.addEventListener('focusout', function (event) {
    if (sidebar.contains(event.relatedTarget)) return;
    paused = false;
    start();
  });
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) stop();
    else start();
  });

  showPage(0);
  start();
})();
