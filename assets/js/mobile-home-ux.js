(function () {
  'use strict';

  function loadMemberAuth() {
    return new Promise(function (resolve, reject) {
      if (window.HaberMember) { resolve(); return; }
      var existing = document.querySelector('script[data-member-auth-loader]');
      if (existing) {
        existing.addEventListener('load', resolve, { once: true });
        existing.addEventListener('error', reject, { once: true });
        return;
      }
      var script = document.createElement('script');
      script.src = '/assets/js/member-auth.js';
      script.defer = true;
      script.dataset.memberAuthLoader = 'true';
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  function addMemberMenuStyles() {
    if (document.getElementById('member-menu-styles')) return;
    var style = document.createElement('style');
    style.id = 'member-menu-styles';
    style.textContent = '.member-nav-shell{position:relative;display:inline-flex}.member-login-btn.is-member{display:inline-flex;align-items:center;gap:6px}.member-account-menu{position:absolute;top:calc(100% + 9px);right:0;z-index:400;min-width:205px;padding:8px;background:#fff;border:1px solid #e1e5ea;border-radius:12px;box-shadow:0 16px 34px rgba(15,23,42,.16);display:none}.member-account-menu.is-open{display:grid;gap:3px}.member-account-menu a,.member-account-menu button{appearance:none;display:block;width:100%;border:0;background:transparent;padding:10px 11px;border-radius:8px;text-align:left;text-decoration:none;color:#24292f;font:inherit;font-size:.88rem;font-weight:700;cursor:pointer}.member-account-menu a:hover,.member-account-menu button:hover{background:#f4f6f8;color:#e10600}.member-account-menu .member-logout{margin-top:5px;padding-top:11px;border-top:1px solid #e1e5ea;color:#b42318}@media(max-width:640px){.member-account-menu{right:0;min-width:min(235px,84vw)}}';
    document.head.appendChild(style);
  }

  function firstNameFor(user) {
    var metadata = user && user.user_metadata ? user.user_metadata : {};
    var raw = String(metadata.display_name || metadata.full_name || metadata.name || '').trim();
    if (raw) return raw.split(/\s+/)[0];
    var email = String(user && user.email || '');
    return email ? email.split('@')[0] : '';
  }

  async function initMemberMenu() {
    var link = document.querySelector('.member-login-btn');
    if (!link) return;
    try {
      await loadMemberAuth();
      var activeSession = await window.HaberMember.session();
      if (!activeSession || !activeSession.user) return;
      addMemberMenuStyles();
      var name = firstNameFor(activeSession.user);
      var shell = document.createElement('span');
      shell.className = 'member-nav-shell';
      link.parentNode.insertBefore(shell, link);
      shell.appendChild(link);
      link.classList.add('is-member');
      link.href = '/account.html';
      link.textContent = '👤 ' + (name || 'Hesabım') + ' ▾';
      link.setAttribute('aria-haspopup', 'menu');
      link.setAttribute('aria-expanded', 'false');
      link.setAttribute('aria-label', 'Hesap menüsünü aç');

      var menu = document.createElement('div');
      menu.className = 'member-account-menu';
      menu.setAttribute('role', 'menu');
      menu.innerHTML = '<a href="/account.html" role="menuitem">Hesabım</a><a href="/account.html#saved" role="menuitem">Kaydettiklerim</a><a href="/account.html#interests" role="menuitem">İlgi Alanlarım</a><a href="/account.html#notifications" role="menuitem">Bildirim Tercihlerim</a><button class="member-logout" type="button" role="menuitem">Çıkış Yap</button>';
      shell.appendChild(menu);

      link.addEventListener('click', function (event) {
        event.preventDefault();
        var open = menu.classList.toggle('is-open');
        link.setAttribute('aria-expanded', open ? 'true' : 'false');
      });
      menu.querySelector('.member-logout').addEventListener('click', async function () {
        await window.HaberMember.logout();
        location.href = '/haber/';
      });
      document.addEventListener('click', function (event) {
        if (shell.contains(event.target)) return;
        menu.classList.remove('is-open');
        link.setAttribute('aria-expanded', 'false');
      });
    } catch (error) {
      console.warn('Üye oturumu ana sayfada yüklenemedi.');
    }
  }

  initMemberMenu();

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

  var slides = Array.prototype.slice.call(hero.querySelectorAll('.headline-slide'));
  var pauseUntil = 0;
  var heldSlide = null;
  var touchStartX = null;
  var restoring = false;

  function activeSlide() { return hero.querySelector('.headline-slide.is-active'); }
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
    slides.forEach(function (slide) { slide.classList.toggle('is-active', slide === heldSlide); });
    hero.classList.toggle('has-image-active', Boolean(heldSlide.querySelector('.headline-image img')));
    restoring = false;
  }

  hero.querySelectorAll('[data-slider-prev], [data-slider-next]').forEach(function (button) {
    button.addEventListener('click', function () { window.setTimeout(holdCurrentSlide, 0); });
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

  var observer = new MutationObserver(function () { restoreHeldSlide(); });
  slides.forEach(function (slide) { observer.observe(slide, { attributes: true, attributeFilter: ['class'] }); });
})();
