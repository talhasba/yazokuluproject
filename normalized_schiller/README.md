# Schiller International University — 2027 yaz programları

`Schiller/` içindeki sağlayıcı duyurusu dört akademik seçim içerir. Madrid'de **Uluslararası İlişkiler ve Diplomasi** ile **Girişimcilik ve İnovasyon** (4–17 Temmuz 2027); Heidelberg'de **İş Dünyası için Yapay Zekâ** ile **Bilgisayar Bilimleri** (18–31 Temmuz 2027) ayrı katalog kayıtlarıdır. Öğrenci bulunduğu şehirde iki alandan birini seçer; dört ayrı ücretli dersin birlikte alınacağı varsayılmamıştır.

Tüm seçenekler 15–18 yaş, en az B1 İngilizce ve iki hafta içindir. B1 sınav veya mülakatla değerlendirilir. Transkript, pasaport kopyası ve veli/yasal vasi imzası gerekir. Son başvuru 1 Mayıs 2027'dir.

Standart ücret €3.500'dür. 1 Nisan 2027'ye kadar kayıt için duyurulan €150 indirimden hesaplanan ücret €3.350 olarak ayrıca ve koşuluyla gösterilir. İki fiyat aynı eğitimi ve konaklama paketini kapsar. Kahvaltı her gün, öğle yemeği ders günlerinde ve **toplam beş akşam yemeği** dahildir; tam pansiyon olduğu varsayılmaz. Gidiş-dönüş havalimanı transferi, şehir içi ulaşım kartı, 7/24 destek, etkinlikler, şehir için belirtilen gezi ve katılım sertifikası dahildir. Uçuş, vize, uluslararası sağlık sigortası ve kalan akşam yemekleri hariçtir.

`programs.reviewed.json`, duyurunun 1–2. sayfalarından gözden geçirilen kaynak içeriğidir. Kişisel iletişim bilgileri, e-posta başlıkları ve özel Gmail ek bağlantıları katalog içeriğine aktarılmaz. Yazının sonunda adı verilen iki ayrıntılı broşür ayrı dosya olarak klasörde bulunmaz; içeriklerine ilişkin ek varsayım yapılmaz.

[Schiller'ın Madrid yaz programı sayfası](https://www.schiller.edu/study-with-us/summer-at-schiller-madrid-program/) 12 Ekim 2026 kontrolünde 2027 tarihlerini teyit bekler olarak gösteriyor, 2026 başvuru tarihleri ve duyurudan farklı ders seçimi/yemek/gezi açıklamaları içeriyordu. 2027 kaydı için verilen duyuru esas alınır; kayıtlar `needs_review` durumundadır ve kontenjan teyidi açıklaması detay sayfasında görünür. Heidelberg için genel [kampüs sayfası](https://www.schiller.edu/campuses/heidelberg/) kullanılır; lisans eğitimleri yaz kampı olarak eklenmez.

Madrid görselleri Schiller'ın önceki yaz programındaki öğrencilere ait iki farklı fotoğraftır; gelecek 2027 grubunu gösterdiği iddia edilmez. Heidelberg görselleri açık lisanslı temsili bilgisayar/programlama fotoğraflarıdır; ekranda temsili oldukları belirtilir. Kaynak, lisans ve özgün dosya bilgileri `data/program-image-sources.json`, gözden geçirilmiş seçimler `data/program-photo-curation.json` içindedir.

Yeniden üretim:

```powershell
node normalized_schiller/normalize_schiller.mjs
node tools/build-digests.mjs
python tools/fetch_unique_program_images.py --stage=apply
node --test tests/schiller-programs.test.mjs tests/program-pricing.test.mjs tests/program-images.test.mjs
```

Normalleştirici diğer sağlayıcıların kayıtlarını korur; Schiller kayıtlarını, özet kaynaklarını ve doğrulanmış paket kapsamlarını yeniler. Yeni fotoğraf eklenirse görsel inceleme ve tekrar kontrolü raporu yeniden oluşturulmalıdır.
