(function () {
  'use strict';

  var topics = {
    'son-dakika': {
      label: 'Son Dakika',
      heading: 'Son Dakika Türkiye Haberleri',
      note: 'Gündem, siyaset, ekonomi ve sıcak gelişmelerden seçilen Türkiye manşetleri.',
      title: 'Son Dakika Haberleri | hakancetin.com.tr'
    },
    'gundem': {
      label: 'Gündem',
      heading: 'Türkiye Gündem Haberleri',
      note: 'Gündem kategorisindeki güncel haberler gösteriliyor.',
      title: 'Gündem Haberleri | hakancetin.com.tr'
    },
    'siyaset': {
      label: 'Siyaset',
      heading: 'Türkiye Siyaset Haberleri',
      note: 'Siyaset kategorisindeki güncel haberler gösteriliyor.',
      title: 'Siyaset Haberleri | hakancetin.com.tr'
    },
    'ekonomi': {
      label: 'Ekonomi',
      heading: 'Türkiye Ekonomi Haberleri',
      note: 'Ekonomi kategorisindeki güncel haberler gösteriliyor.',
      title: 'Ekonomi Haberleri | hakancetin.com.tr'
    },
    'dunya': {
      label: 'Dünya',
      heading: 'Türkiye ve Dünya Haberleri',
      note: 'Dünya kategorisindeki güncel haberler gösteriliyor.',
      title: 'Dünya Haberleri | hakancetin.com.tr'
    },
    'spor': {
      label: 'Spor',
      heading: 'Türkiye Spor Haberleri',
      note: 'Spor kategorisindeki güncel haberler gösteriliyor.',
      title: 'Spor Haberleri | hakancetin.com.tr'
    },
    'magazin': {
      label: 'Magazin',
      heading: 'Türkiye Magazin Haberleri',
      note: 'Magazin kategorisindeki güncel haberler gösteriliyor.',
      title: 'Magazin Haberleri | hakancetin.com.tr'
    },
    'teknoloji': {
      label: 'Teknoloji',
      heading: 'Türkiye Teknoloji Haberleri',
      note: 'Teknoloji kategorisindeki güncel haberler gösteriliyor.',
      title: 'Teknoloji Haberleri | hakancetin.com.tr'
    },
    'saglik': {
      label: 'Sağlık',
      heading: 'Türkiye Sağlık Haberleri',
      note: 'Sağlık kategorisindeki güncel haberler gösteriliyor.',
      title: 'Sağlık Haberleri | hakancetin.com.tr'
    }
  };

  function normalize(value) {
    return (value || '')
      .toLocaleLowerCase('tr-TR')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/ç/g, 'c')
      .replace(/ğ/g, 'g')
      .replace(/ı/g, 'i')
      .replace(/ö/g, 'o')
      .replace(/ş/g, 's')
      .replace(/ü/g, 'u');
  }

  function inferredTopicForTitle(title) {
    var text = normalize(title);

    if (/(magazin|eurovision|sarki yarismasi|tv yayin akisi|ibrahim tatlises|bulent sakrak|duygu arabacioglu|dizi|oyuncu)/.test(text)) {
      return 'magazin';
    }
    if (/(dunya kupasi|futbol|basketbol|super lig|sampiyonlar ligi|uefa|fifa|wolfsburg|milli takim|corum fk)/.test(text)) {
      return 'spor';
    }
    if (/(ebola|hantavirus|virus salgini|pandemi|saglik acil|kanser|hemsirelik|saglikli mi|beslenme|matcha)/.test(text)) {
      return 'saglik';
    }
    if (/(openai|yapay zeka|artificial intelligence|cip fabrikasi|halbleiter|semiconductor)/.test(text)) {
      return 'teknoloji';
    }
    if (/(el nino|iklim krizi|iklim degisikligi)/.test(text)) {
      return 'dunya';
    }
    if (/(enflasyon|faiz|borsa|piyasa|vergi reformu|\bdax\b|ekonomik yardim|maliye bakani)/.test(text)) {
      return 'ekonomi';
    }
    return '';
  }

  function repairClearCategoryErrors() {
    document.querySelectorAll('.topic-card').forEach(function (card) {
      var titleNode = card.querySelector('.headline-title, .card-title');
      var corrected = inferredTopicForTitle(titleNode ? titleNode.textContent : '');
      if (!corrected || !topics[corrected]) return;

      card.dataset.topic = corrected;
      card.querySelectorAll('.headline-topic, .card-topic').forEach(function (label) {
        label.textContent = topics[corrected].label;
      });
    });
  }

  function applyCategoryHeading() {
    var selected = new URLSearchParams(window.location.search).get('kategori') || 'son-dakika';
    var topic = topics[selected] || topics['son-dakika'];
    var heading = document.getElementById('turkiye-title');
    var note = document.querySelector('.showcase-note');

    if (heading) heading.textContent = topic.heading;
    if (note) note.textContent = topic.note;
    document.title = topic.title;
  }

  function refreshTopicDisplay() {
    repairClearCategoryErrors();
    applyCategoryHeading();
    if (typeof window.applyTopicFilter === 'function') window.applyTopicFilter();
    if (typeof window.countCards === 'function') window.countCards();
    if (typeof window.refreshSideHeadlineRotation === 'function') window.refreshSideHeadlineRotation();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', refreshTopicDisplay, { once: true });
  } else {
    refreshTopicDisplay();
  }
})();
