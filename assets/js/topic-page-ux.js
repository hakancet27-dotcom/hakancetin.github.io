(function () {
  'use strict';

  var topics = {
    'son-dakika': {
      heading: 'Son Dakika Türkiye Haberleri',
      note: 'Gündem, siyaset, ekonomi ve sıcak gelişmelerden seçilen Türkiye manşetleri.',
      title: 'Son Dakika Haberleri | hakancetin.com.tr'
    },
    'gundem': {
      heading: 'Türkiye Gündem Haberleri',
      note: 'Gündem kategorisindeki güncel haberler gösteriliyor.',
      title: 'Gündem Haberleri | hakancetin.com.tr'
    },
    'siyaset': {
      heading: 'Türkiye Siyaset Haberleri',
      note: 'Siyaset kategorisindeki güncel haberler gösteriliyor.',
      title: 'Siyaset Haberleri | hakancetin.com.tr'
    },
    'ekonomi': {
      heading: 'Türkiye Ekonomi Haberleri',
      note: 'Ekonomi kategorisindeki güncel haberler gösteriliyor.',
      title: 'Ekonomi Haberleri | hakancetin.com.tr'
    },
    'dunya': {
      heading: 'Türkiye ve Dünya Haberleri',
      note: 'Dünya kategorisindeki güncel haberler gösteriliyor.',
      title: 'Dünya Haberleri | hakancetin.com.tr'
    },
    'spor': {
      heading: 'Türkiye Spor Haberleri',
      note: 'Spor kategorisindeki güncel haberler gösteriliyor.',
      title: 'Spor Haberleri | hakancetin.com.tr'
    },
    'magazin': {
      heading: 'Türkiye Magazin Haberleri',
      note: 'Magazin kategorisindeki güncel haberler gösteriliyor.',
      title: 'Magazin Haberleri | hakancetin.com.tr'
    },
    'teknoloji': {
      heading: 'Türkiye Teknoloji Haberleri',
      note: 'Teknoloji kategorisindeki güncel haberler gösteriliyor.',
      title: 'Teknoloji Haberleri | hakancetin.com.tr'
    },
    'saglik': {
      heading: 'Türkiye Sağlık Haberleri',
      note: 'Sağlık kategorisindeki güncel haberler gösteriliyor.',
      title: 'Sağlık Haberleri | hakancetin.com.tr'
    }
  };

  function applyCategoryHeading() {
    var selected = new URLSearchParams(window.location.search).get('kategori') || 'son-dakika';
    var topic = topics[selected] || topics['son-dakika'];
    var heading = document.getElementById('turkiye-title');
    var note = document.querySelector('.showcase-note');

    if (heading) heading.textContent = topic.heading;
    if (note) note.textContent = topic.note;
    document.title = topic.title;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyCategoryHeading, { once: true });
  } else {
    applyCategoryHeading();
  }
})();
