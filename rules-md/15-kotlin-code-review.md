# Kotlin Code Review Standartları

> Backend · **Kotlin** (Spring Boot / Ktor / Android dışı sunucu). Dosya deseni: `*.kt`.
> `- [ ]` maddeleri kural olarak okunur. ⚙️ = otomatik denetlenir.

## 1. Genel Kod Kalitesi
- [ ] println( ile çıktı alınmamalı — logger (SLF4J) kullanılmalı ⚙️
- [ ] Kodda TODO/FIXME bırakılmamalı ⚙️
- [ ] Gereksiz yorum satırı bulunmamalı ⚙️
- [ ] İsimlendirme: fonksiyon/değişken camelCase, sınıf PascalCase, sabit UPPER_CASE — Yasak: /\bfun\s+[A-Z]|\b(class|interface|object)\s+[a-z]|\b(val|var)\s+\w*_\w/
- [ ] ktlint/detekt uyarıları giderilmeli — Yasak: /@Suppress\s*\(|ktlint-disable/
- [ ] Sihirli sabitler yerine const/enum kullanılmalı — Yasak: /(==|>=|<=|>|<)\s*\d{3,}|(delay|Thread\.sleep)\s*\(\s*\d{3,}/

## 2. Null Güvenliği & Deyimsel Kotlin
- [ ] Not-null assertion (cift unlem) gelişigüzel kullanılmamalı; ?. , ?: , let ile ele alınmalı — Yasak: /[\w\)\]]!!/
- [ ] Değişmezlik için `val` tercih edilmeli; gereksiz `var` kullanılmamalı
- [ ] Veri taşıyıcılar için data class kullanılmalı — Yasak: /^\s*(open\s+|internal\s+|public\s+)?class\s+\w*(Dto|DTO|Request|Response|Payload|Model)\b/
- [ ] when ifadesi enum/sealed için exhaustive olmalı — Yasak: /^\s*else\s*->/
- [ ] Uzantı fonksiyonları uygun ve okunur biçimde kullanılmalı

## 3. Hata Yönetimi & Coroutines
- [ ] Boş catch bloğu ile istisna yutulmamalı ⚙️
- [ ] Genel catch (e: Exception) yerine belirli tipler yakalanmalı — Yasak: /catch\s*\(\s*\w+\s*:\s*(Exception|Throwable|RuntimeException)\s*\)/
- [ ] runBlocking üretim kodunda kullanılmamalı; suspend fonksiyon zinciri korunmalı — Yasak: /\brunBlocking\s*[({]|\.getCompleted\(\)|Thread\.sleep\s*\(/
- [ ] Coroutine'ler yapılandırılmış eşzamanlılık (scope) ile başlatılmalı; GlobalScope kullanılmamalı — Yasak: /\bGlobalScope\s*\.\s*(launch|async|produce)|CoroutineScope\s*\(\s*Dispatchers\.\w+\s*\)\s*\.\s*launch/
- [ ] Dispatcher (IO/Default) işe uygun seçilmeli — Yasak: /Dispatchers\.(Unconfined|Main)|withContext\s*\(\s*Dispatchers\.Default\s*\)\s*\{[^}]*(File|Jdbc|jdbc|http|Http)/

## 4. Güvenlik & Test
- [ ] Parola/secret/token/api key koda gömülmemeli ⚙️
- [ ] SQL için parametreli sorgu/ORM kullanılmalı — Yasak: /(createQuery|createNativeQuery|execSQL|rawQuery|executeQuery|@Query)\s*\(?\s*"[^"]*\$/
- [ ] Controller/handler ince olmalı; iş mantığı service katmanında olmalı — Yasak: /class\s+\w+(Controller|Handler|Resource)\s*\([^)]*(Repository|EntityManager|JdbcTemplate|DataSource)/
- [ ] Yeni davranış için birim testi (JUnit/Kotest) eklenmeli — Yasak: /@(Ignore|Disabled)\b|\bxit\s*\(/
