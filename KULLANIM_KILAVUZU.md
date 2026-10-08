# Pacelet — Video Speed Controller: Kullanım Kılavuzu

Bu kılavuz, **Pacelet — Video Speed Controller** eklentisinin tüm özelliklerini, kurulum adımlarını ve ayar seçeneklerini adım adım açıklamaktadır.

---

## 1. Eklentiyi Chrome'a Ekleme (Geliştirici Modu)

1. **Chrome'u Başlatın**: Google Chrome tarayıcınızı açın.
2. **Uzantılar Sayfasına Gidin**: Adres çubuğuna `chrome://extensions` yazıp Enter tuşuna basın.
3. **Geliştirici Modunu Açın**: Sayfanın sağ üst köşesindeki "Geliştirici modu" düğmesini açık (mavi) konuma getirin.
4. **Paketlenmemiş Öğe Yükle**: Sol üstte beliren "Paketlenmemiş öğe yükle" (Load unpacked) butonuna tıklayın.
5. **Klasörü Seçin**: Eklentinin bulunduğu `video-hizlandirici` (veya `pacelet`) klasörünü seçip onaylayın.
6. **Araç Çubuğuna Sabitleme**: Chrome araç çubuğundaki yapboz simgesine tıklayıp **Pacelet** yanındaki raptiye simgesine basarak eklentiyi sabitleyebilirsiniz.
7. **Yerel Dosya İzni (İsteğe Bağlı)**: Eklentinin bilgisayarınızdaki yerel `.html` veya video dosyalarında çalışması için:
   * `chrome://extensions` sayfasında Pacelet altındaki **Ayrıntılar** (Details) butonuna tıklayın.
   * **"Dosya URL'lerine erişime izin ver"** (Allow access to file URLs) seçeneğini açın.

---

## 2. Kullanım Özellikleri

### A. Video Üzerindeki Kontrol Kapsülü
* Bir video oynatılmaya başladığında, sol üst köşesinde gözü yormayan mat bir hız rozeti belirir (örn. `1.00×`).
* **Genişletme**: Farenizi bu kutunun üzerine getirdiğinizde kutu pürüzsüzce sağa doğru genişleyerek butonları gösterir:
  * `⋮⋮` : **Taşıma Tutamacı**: Kutuyu videonun istediğiniz yerine sürükleyip bırakabilirsiniz.
  * `1.00×` : **Sıfırlama Rozeti**: Tıklandığında hızı anında normale döndürür.
  * `−` : **Yavaşlat**: Hızı ayarlanan adım miktarı kadar azaltır.
  * `+` : **Hızlandır**: Hızı ayarlanan adım miktarı kadar artırır.
  * `<<` : **Geri Sar**: Videoyu geriye sarar (varsayılan: 10s).
  * `>>` : **İleri Sar**: Videoyu ileriye sarar (varsayılan: 10s).
  * `1×` : **Normal Hız Butonu**.
  * `×` : **Gizle**: Kapsülü ekrandan kaldırır (`V` tuşu ile tekrar açılabilir).

### B. Klavye ile Refleks Yönetim
* <kbd>D</kbd> : Hızı artırır (`+0.10×`).
* <kbd>S</kbd> : Hızı azaltır (`-0.10×`).
* <kbd>R</kbd> : Hızı `1.00×` olarak sıfırlar.
* <kbd>G</kbd> : Tercih edilen hızlı moda (`1.80×`) geçer; tekrar basıldığında önceki hıza döner.
* <kbd>Z</kbd> ve <kbd>X</kbd> : 10 saniyelik sarma işlemi yapar.
* <kbd>V</kbd> : Video üstündeki kapsülü gösterir / gizler.
* <kbd>M</kbd> : Sesi kapatır / açar.

### C. Açılır Menü (Popup)
* Tarayıcı simgesine tıkladığınızda:
  * Geçerli sekmedeki videonun anlık hızı net monospaced rakamlarla görünür.
  * Hazır hız butonlarına (`0.75×`, `1.0×`, `1.25×`, `1.5×`, `2.0×`, `2.5×`, `3.0×`) basarak tek tıkla hız değiştirebilirsiniz.
  * Hassas hız kaydırıcısını (slider) kullanarak ara değerleri belirleyebilirsiniz.
  * "Site Aktif / Devre Dışı" anahtarıyla o sitede eklentiyi dilediğiniz zaman kapatabilirsiniz.

---

## 3. GitHub & Chrome Web Mağazası Yayınlama

* **GitHub:** Proje kök dizinindeki `README.md` dosyası açık kaynak topluluğu için uluslararası İngilizce standartlarında hazırlanmıştır.
* **Chrome Web Store:** `README.md` içerisindeki açıklama şablonu doğrudan Mağaza Paneline (CWS Developer Dashboard) kopyalanıp yapıştırılmaya hazırdır.
