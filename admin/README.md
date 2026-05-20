# Sveltia CMS Kurulumu

Bu panel iki ayrı amaçla kullanılır ve bu iki yapı birbirini tetiklemez.

- Panel adresi: `https://hakancetin.com.tr/admin/`
- Backend: `hakancet27-dotcom/hakancetin.github.io`
- Koleksiyonlar:
  - `1 - Bekleyen İncelemeler`: `review/pending/*.json`
  - `2.1 - Yayındaki Haberler / Türkçe`: `articles/*.json`
  - `2.2 - Published News / English`: `news/articles/*.json`
  - `2.3 - Veröffentlichte Nachrichten / Deutsch`: `nachrichten/artikel/*.json`

Notlar:

- Haber üretim otomasyonu `haber-botu` reposunda kalır.
- `review/pending` içinde `review_status: approved` yapılan haberler otomatik yayına alınır.
- Yayındaki haber koleksiyonları hiçbir otomasyonu tetiklemez; sadece editoryal bakım içindir.
- İlk aşamada GitHub token ile giriş en hızlı yoldur. Çok kullanıcılı rahat giriş için daha sonra OAuth client eklenebilir.
