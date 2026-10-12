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
* **Fare Tekerleğiyle Hız Ayarı:** Kapsülün üzerindeyken fare tekerleğini yukarı/aşağı çevirerek video hızını doğrudan artırıp azaltabilirsiniz. Web sayfası gereksiz yere kaydırılmaz.
* **Genişletme**: Farenizi bu kutunun üzerine getirdiğinizde kutu pürüzsüzce sağa doğru genişleyerek butonları gösterir:
  * `⋮⋮` : **Taşıma Tutamacı**: Kutuyu videonun istediğiniz yerine sürükleyip bırakabilirsiniz.
  * `1.00×` : **Sıfırlama Rozeti**: Tıklandığında hızı anında normale döndürür.
  * `−` : **Yavaşlat**: Hızı ayarlanan adım miktarı kadar azaltır.
  * `+` : **Hızlandır**: Hızı ayarlanan adım miktarı kadar artırır.
  * `<<` : **Geri Sar**: Videoyu geriye sarar (varsayılan: 10s).
  * `>>` : **İleri Sar**: Videoyu ileriye sarar (varsayılan: 10s).
  * `A-B` : **A-B Tekrar Döngüsü**: 1. tıklamada A noktası, 2. tıklamada B noktası belirlenir ve o bölüm sürekli tekrarlanır. 3. tıklamada döngü sıfırlanır.
  * `1×` : **Normal Hız Butonu**.
  * `×` : **Gizle**: Kapsülü ekrandan kaldırır (`V` tuşu ile tekrar açılabilir).

### B. Klavye ile Refleks Yönetim
* <kbd>D</kbd> : Hızı artırır (`+0.10×`).
* <kbd>S</kbd> : Hızı azaltır (`-0.10×`).
* <kbd>R</kbd> : Hızı `1.00×` olarak sıfırlar.
* <kbd>G</kbd> : Tercih edilen hızlı moda (`1.80×`) geçer; tekrar basıldığında önceki hıza döner.
* <kbd>L</kbd> : **A-B Döngüsü**: Sırasıyla A noktasını belirler, B noktasını belirleyip döngüyü başlatır, ardından döngüyü sıfırlar.
* <kbd>Z</kbd> ve <kbd>X</kbd> : 10 saniyelik sarma işlemi yapar.
* <kbd>V</kbd> : Video üstündeki kapsülü gösterir / gizler.
* <kbd>M</kbd> : Sesi kapatır / açar.

#### Genel Kısayollar (Chrome Commands):
Sayfa veya tarayıcı sekmesi odakta değilken bile video hızını değiştirebilirsiniz:
* <kbd>Alt</kbd> + <kbd>Shift</kbd> + <kbd>D</kbd> : Hızı artır
* <kbd>Alt</kbd> + <kbd>Shift</kbd> + <kbd>S</kbd> : Hızı yavaşlat
* <kbd>Alt</kbd> + <kbd>Shift</kbd> + <kbd>R</kbd> : Hızı sıfırla (1.0×)
* <kbd>Alt</kbd> + <kbd>Shift</kbd> + <kbd>G</kbd> : Hızlı moda geç / dön
* <kbd>Alt</kbd> + <kbd>Shift</kbd> + <kbd>L</kbd> : A-B döngüsünü tetikle
> *İpucu: Bu genel kısayolları Chrome adres çubuğuna `chrome://extensions/shortcuts` yazarak dilediğiniz tuş kombinasyonlarıyla özelleştirebilirsiniz.*

### C. Açılır Menü (Popup) & Araç Çubuğu Rozeti
* **Rozette Hız Gösterimi**: Tarayıcı araç çubuğundaki Pacelet simgesinin üzerinde anlık oynatma hızı otomatik olarak gösterilir (örn. `1.5`, `1.25`, `2`). Normal hızda (`1.00×`) araç çubuğunun sade kalması için rozet temizlenir.
* **Kaydedilen Zaman İstatistiği (Zaman Tasarrufu)**:
  * "⚡ Bu hafta: 3 sa 12 dk kazandın 🚀" ve "Toplam: 14 sa 45 dk" gibi gerçek zamanlı tasarruf istatistiği gösterilir.
  * Hızlandırma sayesinde ne kadar zaman kazandığınızı takip ederek motive olabilirsiniz.
* **A-B Döngüsü Yönetimi**:
  * Popup içerisinden "A Belirle", "B Belirle" ve "Sıfırla" butonlarıyla aktif döngü aralığını (`01:23 → 02:45`) canlı olarak görüp yönetebilirsiniz.
* **Özelleştirilebilir Hazır Hız Butonları**:
  * Popup'taki hazır hız butonları sabit değildir; Ayarlar sayfasından dilediğiniz hızları (`0.5×`, `1.2×`, `1.8×`, `2.5×` vb.) ekleyip çıkarabilirsiniz.
* **Hassas Hız Kaydırıcısı & Site Hafızası**:
  * Kaydırıcı (slider) ile ara değerleri seçebilir, "Kaydet" butonu ile geçerli site için (örn. `youtube.com`) özel varsayılan hızı tek tıkla sabitleyebilirsiniz.
  * "Site Aktif / Devre Dışı" anahtarıyla o sitede eklentiyi dilediğiniz zaman kapatabilirsiniz.

### D. Gelişmiş Tercihler (Ayarlar Sayfası)
* **Hazır Hızları Özelleştirme:** Popup menüsünde gösterilecek hazır hızları listeye ekleyin, çıkarın veya tek tıkla varsayılanlara sıfırlayın.
* **Fare Tekerleği Ayarı:** Kapsül üzerinde fare tekerleği ile hız değişimini açıp kapatabilirsiniz.
* **Zaman Tasarrufu Paneli:** Bugün, bu hafta ve tüm zamanlarda kazanılan süreyi görüntüleyin; dilediğinizde istatistikleri sıfırlayın.
* **Site Bazlı Hız Hafızası**: Örneğin YouTube'da `1.50×`, Udemy'de `1.25×`, Netflix'te `1.00×` gibi her siteye ayrı varsayılan hız tanımlayabilirsiniz.
* **Sitenin Hızı Ezmesini Engelleme**: YouTube reklamları bittiğinde veya oynatıcılar hızı otomatik olarak `1.00×` değerine sıfırladığında, Pacelet bunu anında tespit eder ve kullanıcının seçtiği hızı geri yükler.
* **Ayarları Dışa ve İçe Aktarma (JSON)**: Tüm kısayollarınızı, hazır hızlarınızı ve site profillerinizi `.json` dosyası olarak yedekleyin.

---

## 3. GitHub & Chrome Web Mağazası Yayınlama

* **GitHub:** Proje kök dizinindeki `README.md` dosyası açık kaynak topluluğu için uluslararası İngilizce standartlarında hazırlanmıştır.
* **Chrome Web Store:** `README.md` içerisindeki açıklama şablonu doğrudan Mağaza Paneline (CWS Developer Dashboard) kopyalanıp yapıştırılmaya hazırdır.
