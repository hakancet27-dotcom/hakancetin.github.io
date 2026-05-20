# Sveltia CMS Kurulumu

Bu klasör sadece yayınlanmış haberlerin editoryal düzenlemesi içindir.

- Panel adresi: `https://hakancetin.com.tr/admin/`
- Backend: `hakancet27-dotcom/hakancetin.github.io`
- Koleksiyonlar:
  - `articles/*.json` Türkçe ana haberler
  - `news/articles/*.json` İngilizce haberler
  - `nachrichten/artikel/*.json` Almanca haberler

Notlar:

- Haber üretim otomasyonu `haber-botu` reposunda kalır.
- Bu panel yeni haber üretmek için değil, yayın sonrası editör düzenlemesi için kullanılır.
- İlk aşamada GitHub token ile giriş en hızlı yoldur. Çok kullanıcılı rahat giriş için daha sonra OAuth client eklenebilir.
- JSON düzenlemesi sonrası ilgili HTML sayfalarının yeniden üretilmesi için ayrıca site senkronizasyon workflow'u planlanmalıdır.
