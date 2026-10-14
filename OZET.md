# Kod Tabanı Özeti

Bu belge, 5 Ekim 2026 tarihinde yapılan kod incelemesinden sonra 14 Ekim 2026 tarihindeki güncellemelerle (Study Mind, kampüs ve konaklama bilgileri, sağlayıcı/kampüs filtreleri, numaralı sayfalama, çevrimiçi programların kaldırılması) yenilenmiştir. Sayısal bilgiler mevcut veri dosyalarından doğrulanmıştır.

## Projenin amacı

Proje, **Summer Programs / summerbutwhere** markasıyla uluslararası yaz okullarını, kampları ve akademik programları bir araya getiren, ASBA bağlantılı bir katalog uygulamasıdır. Ziyaretçiler programları konu, sağlayıcı ve ülkeye göre filtreleyebilir; ücret, tarih, yaş, konum ve eğitim içeriğini inceleyebilir. Arayüz ve program içerikleri İngilizce ve Türkçe sunulur.

Ziyaretçiye sunulan site, HTML, CSS, JavaScript ve JSON dosyalarıyla çalışan statik bir uygulamadır. Veritabanı, kullanıcı hesabı veya yayımlanan siteye ait bir içerik kayıt API'si bulunmaz. İçerik düzenlemek için ayrıca yerel bir Node.js sunucusu ve tarayıcı tabanlı editör vardır.

## Güncel veri kapsamı

Ana kaynak `data/programs.normalized.json` dosyasıdır.

| Gösterge | Mevcut değer |
| --- | ---: |
| Program kaydı | 473 |
| Benzersiz program kimliği | 473 |
| Sağlayıcı | 13 |
| Dolu ülke alanlarında farklı ülke | 7 |
| `ready` durumundaki kayıt | 188 |
| `needs_review` durumundaki kayıt | 285 |
| Özetli detay sayfası bulunan program | 473 |
| Görsel adayı tanımlanan program | 473 |
| Türkçe katalog alanları eksiksiz program | 473 |
| Kampüs bilgisi (`campus`) bulunan program | 163 |
| Konaklama bilgisi (`accommodation`) bulunan program | 470 |
| Editörün program/içerik değişikliği kayıtları | 0 / 0 |

Ülkeler Almanya, Amerika Birleşik Devletleri, Birleşik Krallık, İrlanda, İspanya, İtalya ve Kanada'dır. Yalnızca yüz yüze programlar sunulduğu için çevrimiçi kayıtlar katalogdan kaldırılmıştır; tüm kayıtların ülke alanı doludur.

| Sağlayıcı | Program | `ready` | `needs_review` |
| --- | ---: | ---: | ---: |
| Summer Discovery | 265 | 0 | 265 |
| Immerse Education | 78 | 78 | 0 |
| Academy Royale International | 36 | 36 | 0 |
| Sportech Academy | 19 | 15 | 4 |
| InvestIN Education | 16 | 16 | 0 |
| Study Mind | 12 | 12 | 0 |
| St Clare's, Oxford | 10 | 10 | 0 |
| Constructor University Summer Camp | 9 | 9 | 0 |
| Bucksmore | 8 | 8 | 0 |
| MPW Summer School | 8 | 0 | 8 |
| Edconic | 6 | 4 | 2 |
| Schiller International University | 4 | 0 | 4 |
| Emerald Cultural Institute | 2 | 0 | 2 |

Academy Royale International, Oxford Royale'ın yeni sağlayıcı adıdır; [resmî açıklama](https://www.academyroyaleinternational.com/about-us) marka değişikliğini Eylül 2026 olarak belirtir. Katalog etiketleri, iki dildeki içerik ve fotoğraf atıfları yeni adı kullanır. Mevcut program bağlantıları ve veri eşleşmelerini korumak için `oxford_royale` sağlayıcı anahtarı ile `oxford-royale-` program kimlikleri korunmuştur.

`needs_review`, kaydın bazı bilgileri için kaynak kontrolü gerektiğini belirtir. Mevcut katalog kodu bu durumu yayın engeli olarak kullanmaz; bu kayıtlar da listelenir. Eksiksiz Türkçe katalog alanları, `title_tr`, `subject_tr`, `location_tr` ve `description_short_tr` alanlarının dolu olduğu anlamına gelir.

## Uygulamanın yapısı

`index.html`, parola penceresini, statik tanıtım sayfasını ve iki ayrı uygulama alanını içerir: React kataloğu için `#root`, özetli program detayları için `#program-page`.

- **`script.js`:** React, React DOM ve Lucide bileşenlerini içeren küçültülmüş uygulama paketidir. Katalog kartlarını, filtreleri, sayfalamayı, dil seçimini ve özgün detay sayfalarını oluşturur. Bu paketin özgün React kaynak dosyaları depoda bulunmaz.
- **`app-loader.js`:** Paketi metin olarak indirir, belirli kod parçalarını değiştirir ve sonucu bir Blob modülü olarak çalıştırır. Çalıştırmadan önce program verisine editör değişikliklerini uygular.
- **`program-page.js`:** İlgili programın özet içeriği varsa React alanını gizleyerek kendi detay sayfasını gösterir. Özet bulunamazsa özgün React sayfasına döner.
- **`program-pricing.js`:** Birden fazla farklı ücret bulunan programlarda paket kapsamlarını karşılaştırır; süre, konaklama ve doğrulanmış ek olanakları açıklar. Kampüs geneli aralıkları ve geçmiş dönem ücretlerini ayrı gösterir.
- **`home-page.js`:** Ana sayfa ile katalog arasındaki görünürlüğü, ana sayfanın dilini ve özgün detay sayfasının kataloğa geri dönüşünü yönetir.
- **`password-lock.js`:** Sayfaya erişim için tarayıcıda parola kontrolü yapar; başarılı erişimi `sessionStorage` içinde tutar.
- **`catalogue-cleanup.js`:** Özgün React detay sayfasındaki dış bağlantıları ve tekrarlayan bölümleri kaldırır, uzun açıklamaları maddelere dönüştürür.
- **`online-research-options.js`:** Immerse çevrimiçi araştırma programına özel seçenek ve ücret kartlarını ekliyordu. Bu program katalogdan kaldırıldığı için betik şu anda etkin değildir.
- **`bg-options.js` / `bg-options.css`:** Geçici arka plan deseni seçicisi (aşağıya bakın).

`style.css` derlenmiş katalog stillerini içerir. Ana sayfa, detay sayfası, parola penceresi ve ek bölümler kendi CSS dosyalarıyla biçimlendirilir. `palette.css`, ortak mavi/kırmızı renkleri ve derlenmiş kataloğun marka renklerini düzenler.

Bu yapı, özgün React paketi üzerine eklenen bağımsız JavaScript ve CSS katmanlarından oluşur. Betikler verileri asenkron yükler; çalışma sırası yalnızca HTML içindeki etiket sırasına dayanmaz.

## Sayfa ve kullanıcı akışı

| Adres | İşlev |
| --- | --- |
| `#/` veya boş adres parçası | Tanıtım ana sayfası |
| `#/programs` | Filtrelenebilir program kataloğu |
| `#/programs/<id>` | Program detay sayfası |
| `/admin` | Yerel sunucunun sunduğu program editörü |

Ziyaretçi sayfaları URL'nin `#` bölümünü kullandığı için bu rotalar sunucuda özel yönlendirme kuralı gerektirmez. `/admin` ise yerel sunucuda tanımlanan ayrı bir yoldur.

Katalog, konu grubu, sağlayıcı ve ülke filtrelerini birlikte uygular. Masaüstünde yan panel, mobilde açılır filtre paneli kullanılır. Birden çok konumu olan sağlayıcılar (ör. Summer Discovery kampüsleri, Immerse şehirleri) açılır liste olarak kampüs/üniversite adlarını ve program sayılarını gösterir; yalnızca bazı konumlar seçiliyse sağlayıcı kutusunda tire ve sayı rozeti görünür, tıklamak bu seçimleri temizler. Konu filtresinde "Diğer" kategorisi yoktur. Sayfa başına 25, 50 veya 100 kayıt gösterilebilir ve sayfalar numaralı düğmelerle (1 2 3 … N) gezilir. Ana katalogda serbest metin arama alanı bulunmaz; metinle arama yerel editörde vardır. Dil tercihi `localStorage` içindeki `lang` anahtarında saklanır.

`app-loader.js`, katalog başlıklarını "Program - Kampüs" biçiminde düzenler (kayıtta `campus` varsa kampüs/üniversite, yoksa şehir); şehir kartın altında görünmeye devam eder. Kartlarda yalnızca sağlayıcı adı gösterilir. Başlık, sayfalama ve sağlayıcı/kampüs filtreleri bu dosyadaki yamalarla eklenir. Ayrıca ülke ve sağlayıcı listelerini genişletir, yeni konu eşlemelerini ekler ve bazı görsel yollarını alt dizinden sunuma uygun hâle getirir.

## Veri dosyaları ve öncelik sırası

| Dosya veya klasör | Sorumluluk |
| --- | --- |
| `data/programs.normalized.json` | Program kimliği, sağlayıcı, konu, yaş, konum, süre, tarih, ücret, açıklama ve kaynak bilgileri |
| `data/program-digests.json` | Program kimliğiyle eşlenen İngilizce/Türkçe kısa ve yapılandırılmış detay içerikleri |
| `data/digest-src/` | Özetlerin hazırlanmasında kullanılan içerikler, ortak şablonlar ve çeviriler |
| `data/tr-translations.json` | Bazı sağlayıcıların Türkçe başlık, konu ve konum karşılıkları |
| `data/image-candidates.json` | Her program için sıralı görsel adayları |
| `data/program-image-sources.json` | 473 programın ayrı indirilen fotoğrafı, kaynak, fotoğrafçı, lisans ve dosya doğrulama bilgileri |
| `data/program-photo-curation.json` | Görsel incelemede reddedilen kaynaklar ve programa özel temsili fotoğraf aramaları |
| `data/program-image-audit.json` | Son fotoğraf koleksiyonunun görsel inceleme ve tekrar kontrolü kaydı |
| `data/price-inclusions.json` | İngilizce/Türkçe paket kapsamları, sağlayıcı kaynakları ve programa özel istisnalar |
| `data/program-editor-overrides.json` | Yerel editörün ürettiği son içerik değişiklikleri |
| `assets/program-images/` | Kampüs, konu ve sağlayıcı görselleri ile kaynak/lisans kayıtları |

Programın `id` alanı, katalog, özet, görsel ve editör verilerini birbirine bağlar. Kimlik değişikliği bu eşleşmelerin de güncellenmesini gerektirir.

Çalışma sırasında temel verilerin üzerine editör değişiklikleri uygulanır. Nesneler alan alan birleştirilir; diziler değişiklikteki diziyle değiştirilir. Böylece üretilmiş kaynak dosyaları yeniden oluşturulsa bile ayrı dosyada saklanan editör değişiklikleri önceliğini korur.

## Özetli program detayları ve bilgi formu

`program-page.js`, tüm 473 program için büyük görsel, temel bilgiler (yaş, süre, tarih, ücret, konum ve **konaklama**), konu etiketleri, etkinlikler, kazanımlar, uygun katılımcı profili ve ek olanaklardan oluşan detay sayfası sunar. Ücret, tarih, süre ve konum temel program kaydından okunur. Yaş alanı boş olan Summer Discovery kayıtlarında özetin sınıf bilgisi gösterilebilir; sınıf aralığı yaşa dönüştürülmez.

Her programın `/unique/` klasörüne indirilen ayrı fotoğrafı hem katalog kartında hem detay sayfasının başlığında önceliklidir. Sağlayıcı fotoğrafları kullanılır; uygun ve benzersiz bir sağlayıcı görseli bulunamadığında açık lisanslı temsili konu fotoğrafı seçilir. Temsili fotoğraflar ekranda belirtilir; kaynak, fotoğrafçı ve lisans bağlantıları kartta ve detay sayfasında gösterilir. Fotoğrafların indirilen özgün dosyaları korunur. Diğer uygun yerel adaylardan en fazla üçü detay galerisinde gösterilir; kampüs görsellerinin mevcut atıfları korunur. Görsel yüklenemezse yer tutucu gösterilir.

Yalnızca yüz yüze programlar sunulduğu için `immerse-online-research-programme` ve Edconic Online Essentials katalogdan kaldırılmıştır (`tools/remove-online-programs.mjs`). Böylece her programın özetli detay sayfası vardır.

Birden fazla farklı ücret bulunan 84 özetli program sayfasında paket karşılaştırması vardır. InvestIN seçenekleri bir hafta, iki hafta ve Enhanced olarak ayrılır; konaklamalı ücretler toplam paket fiyatı olarak açıklanır. Bu eşlemeler doğrulanmış ücret ve para birimiyle eşleşir; editörde tanınmayan bir ücret girilirse süre tahmin edilmez. Aynı ücretin tekrar eden kayıtları ayrı paket oluşturmaz. 259 programın kampüs geneli ücret aralığı, bu dersin kesin fiyatı veya iki ayrı paket gibi sunulmaz. Bilinmeyen yemek/ek hizmet kapsamları açıkça belirtilir. Paket açıklamaları temel JSON yeniden üretilse de ayrı dosyada korunur.

Bilgi formu ad, telefon, e-posta, katılımcı yaşı ve il bilgilerini doğrular. Yaşı program aralığıyla karşılaştırıp uygunluk bilgisi gösterir. Ancak `FORM_ENDPOINT` ve `WHATSAPP_NUMBER` şu anda boştur: form verisi bir alıcıya gönderilmez, gönderilmediğini belirten mesaj gösterilir ve hazırlanan veri tarayıcı konsoluna yazılır.

URL'de `#` öncesine `?review` eklenirse özet sayfalarında iç veri kontrol notları görünür. Bu notlar normal ziyaretçi görünümünde gizlidir.

## İçerik üretim araçları

- **`tools/build-digests.mjs`:** Sağlayıcı içeriklerini ve şablonları okuyarak `data/program-digests.json` dosyasını üretir. İki dilin zorunlu alanlarını, metin uzunluklarını, etiket sayılarını, bazı tekrarları ve yer tutucu metinleri denetler. Hata varsa çıktı yazmadan başarısız olur.
- **`tools/extract-sd.mjs`:** Summer Discovery açıklamalarını yapılandırır ve içerik özetiyle tekrarları birleştirir. Mevcut 265 kayıt, 171 içerik birimine eşlenmiştir. `--write` seçeneği kaynak JSON'u yazar; `--sheet <dosya>` çeviri çalışma belgesi üretir.
- **`tools/apply-tr-translations.mjs`:** Edconic, MPW, Sportech, Summer Discovery ve Constructor kayıtlarına gözden geçirilmiş Türkçe alanları uygular. Kısa Türkçe açıklamayı ilgili özetin `tr.focus` alanından alır; ana ve sağlayıcı JSON dosyalarını günceller.
- **`normalized_new_providers/normalize_new_providers.py`:** Dört yeni sağlayıcının ham verisini ortak şemaya dönüştürür ve kalite raporlarını üretir. Çıktıyı kendi klasörüne yazar; ana kataloğa otomatik birleştirme yapmaz. Beklediği beş ham giriş JSON dosyası mevcut depoda bulunmadığından yeniden üretim için bu dosyalar gerekir.
- **`normalized_constructor/normalize_constructor.mjs`:** Betikte gömülü ders açıklamalarından Constructor için dokuz kayıt üretir ve eski Constructor kayıtlarını değiştirerek ana kataloğa birleştirir. Kamp tek bir 12 günlük programdır; dersler ayrı katalog kayıtları olarak modellenmiştir. Ortak ücret ve tarihler betikte sabittir.
- **`tools/apply-campuses.mjs`:** Her programa `campus` / `campus_tr` (üniversite veya mekân adı) ekler; sağlayıcı sayfalarında doğrulanan değerleri sağlayıcı + konum kurallarıyla yazar. Normalleştiriciler ana JSON'u yeniden ürettikten sonra yeniden çalıştırılmalıdır.
- **`tools/apply-accommodation.mjs`:** Her programa `accommodation` / `accommodation_tr` (öğrencilerin nerede kalacağı) ekler. Değerler kısa tutulur (ör. "University of Oxford", "Queen's Gate House, London").
- **`tools/remove-online-programs.mjs`:** Yalnızca çevrimiçi programları ana veri, görsel adayları, özetler ve fotoğraf kaynak kayıtlarından kaldırır.
- **`normalized_constructor/add_image_candidates.mjs`:** Constructor dersleri için konu ve Bremen kampüs görsellerini aday listesine ekler.
- **`tools/fetch_program_images.py` / `tools/fetch_provider_thumbnails.py`:** Kampüs ve seçili sağlayıcı görsellerini indirir, yerel kopyaları ve kaynak kayıtlarını yeniler.
- **`tools/fetch_unique_program_images.py`:** Program başına ayrı sağlayıcı veya açık lisanslı temsili fotoğraf indirir; kaynak kayıtlarını ve aday önceliğini günceller. Önceki eşleyiciler çalıştırıldıktan sonra `--stage=apply` ile indirilen fotoğraf önceliği yeniden uygulanmalıdır.
- **`tools/audit_program_photos.py`:** Fotoğrafları değiştirmeden ortak görsel ayrıntıları ve piksel uyumunu karşılaştırarak farklı kırpılmış/kodlanmış tekrarları inceleme için raporlar. Otomatik dosya, kaynak ve benzerlik kontrolleri `tests/program-images.test.mjs` içindedir.

Özetler ile Türkçe alanları yeniden üretmek için proje kökünde şu komutlar kullanılır:

```powershell
node tools/build-digests.mjs
node tools/apply-tr-translations.mjs
```

Summer Discovery kaynak metni değiştiğinde önce `node tools/extract-sd.mjs --write` çalıştırılır ve değişen içerik birimlerinin Türkçe çevirileri güncellenir. Üretilmiş özet dosyası yerine kaynak içerik veya yerel editör değişiklikleri düzenlenmelidir.

## Yerel program editörü

`local-editor/`, programları arama ve sağlayıcıya göre filtreleme, genel bilgileri ve ücretleri düzenleme, İngilizce/Türkçe özet içeriğini değiştirme, kaydedilmiş detay sayfasını önizleme ve program değişikliklerini sıfırlama işlevlerini içerir. `Ctrl+S` kayıt yapar; önizleme, kaydedilmiş veriyi kullanır.

`local-server.mjs`, `127.0.0.1:5173` üzerinde siteyi ve editörü sunar. `GET /api/editor/status` durum bilgisini verir; `PUT /api/editor/programs/<id>` değişiklikleri kaydeder, `DELETE` aynı programın değişikliklerini kaldırır.

Kayıt ve sıfırlama istekleri rastgele üretilen editör anahtarı ve yerel kaynak kontrolünden geçer. Sunucu düzenlenebilir alanları doğrular, temel veriyle farkları hesaplar ve yalnızca farkları `data/program-editor-overrides.json` içine yazar. Önceki dosya `.local-editor/backups/` altında yedeklenir; bu klasör Git dışında tutulur. Statik yayımlanan sitede editörün kayıt API'si çalışmaz.

## Yerelde çalıştırma

Node.js ile doğrudan çalıştırmak için proje kökünde:

```powershell
# Siteyi açar.
node local-server.mjs

# Editörü açar.
node local-server.mjs --editor

# Tarayıcı açmadan farklı bir portta çalıştırır.
node local-server.mjs --no-open --port=5174
```

Windows'ta `open-localhost.bat` ve `open-program-editor.bat` aynı işlemleri başlatır. Bu başlatıcılar önce 5173 portunu dinleyen mevcut süreçleri sonlandırır; açık başka bir yerel çalışma varsa bu davranış dikkate alınmalıdır.

`package.json`, React 19, React DOM, Lucide, Vite 6 ve Tailwind CSS 4 bağımlılıklarını; `dev`, `build`, `preview`, `build:compress` ve `preview:compress` komutlarını tanımlar. Ancak özgün React kaynakları ve Vite yapılandırması depoda yoktur. `build:compress` yalnızca `compress` modunu seçer; bu moda ait ayrı çıktı klasörü ayarı görünmezken `preview:compress`, `compress` klasörünü bekler. Bu komutların uçtan uca çalıştığı bu incelemede doğrulanmamıştır.

## Destekleyici belgeler ve bakım noktaları

`summary.md`, `contentsummary.md` ve `providers-overview.md` mevcut İngilizce açıklamalardır. `price-comparison-2027.md`, katalog ile dış bir fiyat/tarih çalışması arasındaki karşılaştırmayı kaydeder; uygulama bu dosyayı okumaz. `contents/` içindeki Excel ve Word dosyaları referans kopyalarıdır, düzenlenmeleri site verilerini otomatik güncellemez. `constructor/` kaynak sayfa arşivini ve ders belgesini içerir. `prototypes/index.html` tasarım prototipidir; `prototypes/layer-test.html` parola katmanı olmadan gerçek özet sayfasını denemek ve editör önizlemesi için kullanılır.

Bakım sırasında mevcut yapının şu özellikleri önemlidir:

- `app-loader.js`, küçültülmüş paketteki tam metin eşleşmelerine bağlıdır. Eşleşme kaybolur veya birden fazla kez bulunursa uygulama yüklemesi hata verir. Yeni sağlayıcı, ülke ve konu eklenirken veriyle birlikte filtre listeleri ve konu eşlemeleri de kontrol edilmelidir.
- `MutationObserver` kullanan ek betikler, özgün React sayfasının metinlerine ve DOM yapısına bağlıdır. Paket değişiklikleri bu davranışları etkileyebilir.
- Parola tarayıcı kodunda bulunur; kontrol yalnızca arayüz erişimini sınırlar. JSON verileri ve dosyalar sunucudan ayrıca erişilebilir.
- Ana sayfadaki 473 program ve 7 ülke sayıları `index.html` içinde sabittir, veri değişince kendiliğinden yenilenmez.
- Güncel inceleme durumu toplamı **285**'tir (265 Summer Discovery, 8 MPW, 4 Sportech, 4 Schiller, 2 Emerald, 2 Edconic); Schiller'ın duyuruya dayanan dört kaydı dahildir. Veri sayıları için ana dosya esas alınmalıdır.
- Bazı ücretler geçmiş dönem bilgisi veya kampüs geneli aralıktır. Bu ayrımlar `flags`, fiyat notları, tarihsel alanlar ve özet kontrol notlarında korunur.
- Görsel adayının bulunması, görselin yüklenebilir veya açık lisanslı olduğunu tek başına göstermez. Commons ve sağlayıcı kaynak kayıtları ayrıdır; Bremen görselinin kaynak/lisans doğrulaması belgelere göre tamamlanmamıştır.
- `tests/program-pricing.test.mjs`, fiyat eşlemelerini, konaklama ayrımını, geçmiş ücretleri, tekrarların birleştirilmesini, metin güvenliğini ve iki dilde tüm katalog kapsamını kontrol eder. `node --test tests/program-pricing.test.mjs` ile çalıştırılır. `tests/program-images.test.mjs` fotoğraf koleksiyonunu, `tests/studymind-programs.test.mjs` Study Mind kayıtlarını denetler; testler tek tek dosya olarak çalıştırılır. Lint yapılandırması veya görünür CI iş akışı bulunmaz. Özet üreticisindeki içerik kontrolleri ve yerel arayüz önizlemeleri de kullanılabilir.

Bu belge için kod ve veri dosyaları okunmuş, JSON sayıları ve eşleşmeler kontrol edilmiştir. Fiyat kapsamları eklendikten sonra ilgili otomatik testler ve yerel tarayıcı kontrolleri yapılmıştır. Üretim derlemesi ve içerik üretim betikleri bu incelemede yürütülmemiştir.

## İrlanda programları (5 Ekim 2026)

`normalized_ireland/normalize_ireland.mjs`, gözden geçirilmiş kaynaklardan Emerald Cultural Institute için Trinity Walton STEM ve Young Adult kayıtlarını üretir. İngilizce ve Türkçe özetler, görsel adayları ve ana katalog birlikte güncellenir; diğer sağlayıcılara dokunulmaz. Kaynak kararları ve yeniden üretim adımları `normalized_ireland/README.md` içindedir.

İrlanda ülke filtresi ve Emerald sağlayıcı filtresi eklenmiştir. Aile yanı ve yurt paketleri, tam pansiyon kapsamı, süre seçenekleri ve ek ücretler program sayfalarında açıklanır. Kaynakların 2026 tarih/ücretleri geçmiş dönem olarak görünür; gelecek sezon varsayılmaz. Young Adult broşüründeki yaş/transfer çelişkileri açıklanır; tarihli tarife ve resmî kurs sayfası esas alınır.

## Schiller programları (12 Ekim 2026)

`normalized_schiller/normalize_schiller.mjs`, `Schiller/` klasöründeki 2027 duyurusundan dört ayrı akademik seçim üretir: Madrid'de Uluslararası İlişkiler ve Diplomasi ile Girişimcilik ve İnovasyon; Heidelberg'de İş Dünyası için Yapay Zekâ ile Bilgisayar Bilimleri. Madrid 4–17 Temmuz, Heidelberg 18–31 Temmuz 2027; yaş 15–18, süre iki hafta, İngilizce en az B1'dir. Sağlayıcı filtresi ve İspanya ülke filtresi eklenmiştir.

€3.500 standart ücret ile 1 Nisan 2027'ye kadar kayıt için €150 indirimden hesaplanan €3.350 ücret, aynı paket kapsamıyla karşılaştırılır; indirim konaklama veya eğitim farkı değildir. Son başvuru 1 Mayıs 2027'dir. Kahvaltı, ders günlerinde öğle yemeği ve beş akşam yemeği dahil olup tam pansiyon varsayılmaz. Dahil/hariç kalemler iki dilde gösterilir.

Madrid için önceki Schiller yaz programından iki gerçek fotoğraf; Heidelberg için açık lisanslı, temsili olarak etiketlenmiş iki bilgisayar fotoğrafı kullanılır. Ayrıntılı broşür ekleri klasörde bulunmadığından bunlardan bilgi türetilmez. Sağlayıcının açık Madrid sayfasındaki dönem/konu/yemek/gezi farkları nedeniyle duyuru esas alınır ve kaynak kontrol notları korunur. Yeniden üretim ve kaynak kararları `normalized_schiller/README.md` içindedir.

## Study Mind programları (13 Ekim 2026)

`normalized_studymind/` altındaki normalleştirici, Londra'daki Study Mind'ın 15–18 yaş iş deneyimi programlarından yayında olan 12'sini ana kataloğa ekler; "yakında" olarak işaretli üç program katalogda yer almaz. Özetler elle yazılmış İngilizce/Türkçe içeriktir, görseller programın kendi sayfasından alınmıştır. Her süre için ayrı ücret katmanı bulunur (1 hafta £1.799, 2 hafta £2.999, 3 hafta £3.999). İsteğe bağlı UCL Ramsay Hall konaklamasının ücrete dahil olup olmadığı sayfada belirtilmediği için tahmin edilmemiş, işaretlenmiştir. Ayrıntılar `summary.md` içindedir; testler `tests/studymind-programs.test.mjs` dosyasındadır.

## Kampüs ve konaklama bilgileri, çevrimiçi programlar (14 Ekim 2026)

- **Kampüs (`campus` / `campus_tr`):** Başlıklar "Program - Kampüs" biçimindedir (ör. "Avukat Yaz Deneyimi - UCL"); şehir kartın altında kalır ve filtredeki konum satırları aynı üniversite adlarını kullanır. 163 programın kampüs bilgisi vardır; kalan Sportech ve Emerald Young Adult programlarında şehir gösterilir.
- **Konaklama (`accommodation` / `accommodation_tr`):** Program sayfasındaki bilgi şeridinde "Format" yerine "Konaklama" konumun yanında gösterilir. Değerler sağlayıcı sayfalarından doğrulanmıştır (`mdoutput/` klasöründeki kaydedilmiş sayfa dönüşümleri dahil): Immerse için UCL, Cambridge/Oxford kolejleri, Barnard College, Toronto Üniversitesi ve UC Berkeley; InvestIN için Londra Üniversitesi yurtları (Career Discovery için Dulwich College); MPW için Queen's Gate House ve Tripos Court. Summer Discovery sayfaları yalnızca kampüste konaklamalı programı belirtir ve UCLA'nın yurdunu adlandırır; diğer kampüslerde "<kampüs> kampüsü" yazar. Veri bulunmayan üç Edconic Vogue programı "Talep üzerine" gösterir.
- **Çevrimiçi programlar:** Yalnızca yüz yüze programlar sunulduğu için iki çevrimiçi kayıt kaldırılmıştır; katalog 473 programdır. Fotoğraf denetim kaydı (`data/program-image-audit.json`) ve parmak izi bu sayıya göre güncellenmiştir.
- **Filtre ve sayfalama:** Sayfalar numaralı düğmelerle gezilir; sağlayıcılar kampüs/konum listesi açar; "Diğer" konu kategorisi kaldırılmıştır (iki Academy Royale "Economics & Finance" kaydı İş Dünyası ve Finans altına alınmıştır).
- **Marka ve görünüm:** Site logosu `assets/summerbutwhere-logo.png` dosyasıdır ("Yaz Okulları ve Danışmanlık" alt yazısı kırpılmıştır); logo seçici kaldırılmıştır. Başlıklarda "Akademik Yaz Okulu Programları" ifadesi kullanılır. Geçici arka plan deseni seçicisi (`bg-options.js`, `?bg=0..5`) kalıcı bir desen seçilene kadar sayfanın sol altında görünür.
