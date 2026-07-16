# Spring vs Spring Boot: Rakip Değil, Aynı Takımın İki Oyuncusu

*Java & Spring serisi — Bölüm 5/6*

---

[[LINKS]]

Serinin **beşinci bölümü**. [Bölüm 3](https://medium.com/p/d2fc48834423)'te Spring'in çekirdeğini, [Bölüm 4](https://medium.com/p/56828329e6e6)'te Spring Boot'u gördük. Şimdi ikisini yan yana koyup en sık sorulan üç soruyu net biçimde cevaplayalım:

1. Spring Boot, Spring'in yerini mi aldı?
2. Boot kullanınca kontrolü kaybediyor muyum?
3. Hangisini, ne zaman?

Bu bölüm kısa — ama zihinsel modeli oturtan bölüm bu.

---

## Soru 1: Boot, Spring'in yerini mi aldı?

**Hayır.** Spring Boot, Spring Framework'ün **üzerine kurulu bir kolaylık katmanıdır**. Aynı IoC/DI çekirdeğini, aynı AOP'yi, aynı MVC'yi kullanır. Yeni bir framework değildir.

Bunun pratik anlamı şu: "Spring Boot öğrenmek" aslında "Spring'i kolay yoldan kullanmak"tır. Altındaki Spring kavramlarını (IoC, bean, transaction, proxy) bilmezsen Boot'un davranışları sana **sihir** gibi görünür — ve sihre hata ayıklama yapamazsın.

[[IMG:p5-compare]]

---

## Somut fark: aynı iş, iki yol

Bir web + JPA uygulamasını ayağa kaldıralım.

**Düz Spring — her şeyi elle kur:**

```java
@Configuration @EnableWebMvc @ComponentScan
class WebConfig { /* ViewResolver, message converter... */ }

@Configuration
class DataConfig {
    @Bean DataSource ds() {
        var d = new DriverManagerDataSource();
        d.setUrl("jdbc:mysql://...");
        d.setUsername("app");
        return d;
    }
    @Bean LocalContainerEntityManagerFactoryBean emf() { ... }
    @Bean PlatformTransactionManager tx() { ... }
}
// + WebApplicationInitializer (DispatcherServlet kaydı)
// + WAR paketle + harici Tomcat'e deploy et
```

**Spring Boot — auto-config:**

```java
@SpringBootApplication
class App {
    public static void main(String[] a) { SpringApplication.run(App.class, a); }
}
```

```yaml
# application.yml — gerisi otomatik
spring.datasource.url: jdbc:mysql://...
spring.datasource.username: app
# DataSource, JPA, transaction manager, DispatcherServlet, gömülü Tomcat → HEPSİ auto-config
```

**Aynı işlevsellik.** Düz Spring'de onlarca satır config + WAR + harici sunucu; Boot'ta birkaç satır + `java -jar`.

---

## Soru 2: Kontrolü kaybediyor muyum?

Bu korku çok yaygın ve **yersiz**. Boot *opinionated*'dır (fikir sahibidir) ama **dayatmacı değildir**:

* Bean tanımlamazsan **varsayılan** gelir.
* Tanımlarsan **seninki kazanır** — auto-config sınıfları `@ConditionalOnMissingBean` ile yazılmıştır: "kullanıcı kendi bean'ini tanımlamadıysa benimkini kur."
* İstemediğin auto-config'i `exclude` edebilirsin.

Ve en önemlisi: bu bir kara kutu değil. Uygulamayı `--debug` ile çalıştır, **auto-configuration raporunu** gör: hangi yapılandırma neden uygulandı, hangisi neden atlandı — hepsi satır satır listelenir.

Yani Boot config'i **gizlemiyor**; sana **makul bir varsayılan veriyor** ve onu değiştirmenin yolunu açık bırakıyor.

### Auto-configuration nasıl çalışıyor?

Boot, **classpath'e** ve **mevcut bean'lere** bakar (`@Conditional` mekanizması). Örnek: classpath'te H2 ve JPA varsa, otomatik bir `DataSource` kurar. Ama sen kendi `DataSource` bean'ini tanımlamışsan, seninkini kullanır.

Basit ama güçlü bir fikir: **koşullu yapılandırma.**

---

## Soru 3: Hangisini, ne zaman?

**Spring Boot tercih et** (yeni projelerin ~%90'ı):

* Yeni web/REST uygulaması, mikroservis — neredeyse her zaman
* Hızlı prototip / MVP — Initializr ile dakikalar içinde başla
* Standart altyapı (DB, web, güvenlik) — auto-config işini görür
* Üretim odaklı: hazır health/metrik/profil desteği

**Düz Spring tercih et** (nadir):

* Mevcut, büyük, özel yapılandırılmış legacy sistem
* Çok sıra dışı altyapı, tam manuel kontrol gereksinimi
* Boot dışı minimal bağımlılık zorunluluğu

Günümüzde yeni bir projede düz Spring'i seçmek için gerçekten güçlü bir sebep gerekir.

---

## Düz Spring'den Boot'a geçiş (kademeli)

1. Bağımlılıkları `spring-boot-starter-*`'a çevir; sürüm yönetimini **BOM**'a bırak.
2. `@SpringBootApplication` + `SpringApplication.run(...)` giriş noktasını ekle.
3. Elle yazılmış `DataSource` / `JdbcTemplate` / `DispatcherServlet` yapılandırmalarını **sil** — yalnızca gerçekten özel olanı bırak.
4. XML → `application.yml` + `@Configuration`.
5. Harici Tomcat/WAR → gömülü sunucu + `java -jar`.
6. Actuator, profiller ve metrikleri ekle.

Her adımda testleri koştur. Geçişte en sık kırılan şey, **elle bean tanımları ile auto-config'in çakışması** ve bağımlılık sürüm çatışmalarıdır. Çakışan auto-config'i `exclude` et, davranış farklarını testlerle yakala.

---

## Bölüm Özeti — Aklında Kalsın

* **Aynı çekirdek.** Boot, Spring'in üstünde çalışır: IoC/DI, AOP, MVC hep aynı.
* **Yeni proje mi? → Spring Boot.** Neredeyse her zaman.
* **Tam manuel kontrol / özel legacy ihtiyaç? → Düz Spring.** Nadir; genelde Boot varsayılanını override etmek yeter.
* **Kontrol kaybı korkusu yersiz:** tanımlamazsan varsayılan gelir, tanımlarsan seninki kazanır, istemediğini `exclude` edersin. `--debug` ile raporu görürsün.
* **Geçiş kademeli olmalı**, her adımda test.

> **Tek cümle:** **"Spring'i öğren, Spring Boot ile uygula."** Temeli anlarsan, Boot'un otomatiği sana sihir değil — kontrol edebildiğin bir kolaylık olarak görünür.

---

## Sırada ne var?

**Bölüm 6: Spring Boot Sürüm Analizi — 1.x'ten 4.x'e.** Serinin son bölümünde `javax → jakarta` kırılmasını, Boot 4.0'ın yeniliklerini (Jackson 3, JSpecify, API versiyonlama) ve güvenli yükseltme zincirini göreceğiz.

[[SERIES]]
