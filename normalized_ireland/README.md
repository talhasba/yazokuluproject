# İrlanda programları

Emerald Cultural Institute için `/ireland` klasöründeki iki broşür ve kayıtlı STEM sayfası incelendi. Ücretler, yaş ve merkez/tarih tablosu kök dizindeki `2026-Junior-Price-List.pdf` ile karşılaştırıldı. Resmî STEM ve Young Adult kurs sayfaları 5 Ekim 2026 tarihinde kontrol edildi; hâlâ 2026 bilgilerini içeriyordu.

- **Trinity Walton STEM:** 14–17 yaş, en az B2 İngilizce ve giriş testi; iki hafta, haftada 10 saat STEM + 10 saat İngilizce. STEM dersleri Trinity College Dublin'de; yurt Trinity Hall'dadır. 2026 aile yanı/yurt ücretleri €2.990/€3.700.
- **Young Adult:** 2026 tarifesi ve kurs sayfasına göre 16–19 yaş, B1–C1, en az iki hafta; haftada 20 saat İngilizce. Aile yanı ders merkezi Sandford Park School; yurt merkezi Trinity Hall. İki, üç ve dört haftalık tam paketler ayrı ücret seçenekleridir. Ek hafta bedelleri paket fiyatı olarak listelenmez.

Young Adult broşüründeki 16–20 yaş bilgisi ile €190 gidiş-dönüş transfer ücreti, 2026 tarifesiyle çelişir. Katalog 16–19 yaş ve tek yön €105 bilgilerini esas alır; farklar ziyaretçiye ve inceleme notlarına aktarılmıştır. Kaynakların tamamı geçmiş 2026 dönemine aittir; 2027 tarih, fiyat veya kontenjanı varsayılmamıştır. Kayıtlar `needs_review` durumundadır; geçmiş dönem açıklaması normal sayfada da görünür.

`programs.reviewed.json` gözden geçirilmiş iki dildeki içerik ve kaynak kararlarını içerir. Yeniden üretim:

```powershell
node normalized_ireland/normalize_ireland.mjs
node tools/build-digests.mjs
node --test tests/program-pricing.test.mjs tests/ireland-programs.test.mjs
```

Normalleştirici yalnızca Emerald kayıtlarını değiştirir; ana katalog, sağlayıcı verisi, özet kaynakları ve görsel adaylarını günceller. Paket kapsamları `data/price-inclusions.json` içinde saklanır. Görseller broşürlerin ikinci sayfasındaki özgün JPEG'lerden çıkarılmıştır; kaynakları `image-provenance.json` içinde kayıtlıdır. Sağlayıcıya ait görseller için açık lisans iddiası bulunmaz.

Yeni bir sezonun kaynağı geldiğinde tarih/ücret, yaş ve transfer çelişkileri yeniden kontrol edilmeli; `price_status`, yıl alanları, inceleme notları ve paket kapsamları birlikte güncellenmelidir.
