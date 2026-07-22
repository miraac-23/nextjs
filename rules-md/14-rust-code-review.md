# Rust Code Review Standartları

> Backend · **Rust**. Dosya deseni: `*.rs`.
> `- [ ]` maddeleri kural olarak okunur. ⚙️ = otomatik denetlenir.

## 1. Genel Kod Kalitesi
- [ ] println! / dbg! ile hata ayıklama çıktısı bırakılmamalı — log/tracing kullanılmalı ⚙️
- [ ] Kodda TODO/FIXME bırakılmamalı ⚙️
- [ ] Gereksiz yorum satırı bulunmamalı ⚙️
- [ ] İsimlendirme snake_case (fonksiyon/değişken), CamelCase (tip), UPPER_CASE (const) olmalı — Yasak: /\bfn\s+[a-z_]*[A-Z]|\b(struct|enum|trait)\s+[a-z]|\bconst\s+[a-z]/
- [ ] cargo fmt ve cargo clippy uyarıları giderilmeli — Yasak: /#!?\[allow\(\s*(clippy::|dead_code|unused)/
- [ ] Sihirli sabitler yerine const/enum kullanılmalı — Yasak: /(==|>=|<=|>|<)\s*\d{3,}|from_(secs|millis)\(\s*\d{2,}/

## 2. Hata Yönetimi (Rust'a özgü)
- [ ] .unwrap() / .expect() üretim kodunda gelişigüzel kullanılmamalı; ? ile yayılmalı — Yasak: /\.(unwrap|expect)\s*\(/
- [ ] panic!( üretim akışında kullanılmamalı ⚙️ — Yasak: /\b(panic|unimplemented|unreachable|todo)!\s*\(/
- [ ] Result/Option uygun şekilde ele alınmalı; hatalar yutulmamalı — Yasak: /^\s*let\s+_\s*=\s|\.ok\(\)\s*;|\.unwrap_or_else\(\s*\|_\|/
- [ ] Özel hata tipleri (thiserror/anyhow) ile bağlam eklenmeli — Yasak: /Box<dyn\s+[^>]*Error|Err\(\s*"|Err\(\s*format!/
- [ ] `unsafe` blok yalnız gerekli ve gerekçeli kullanılmalı, yorumla açıklanmalı

## 3. Sahiplik & Performans
- [ ] Gereksiz .clone() ile kopyalama yapılmamalı; referans/borrow tercih edilmeli — Yasak: /\.clone\(\)\.clone\(\)|&[A-Za-z_]\w*\.clone\(\)|\.to_vec\(\)\.clone\(\)|\.clone\(\)\.(into|to_string)\(\)/
- [ ] String yerine mümkünse &str, Vec yerine dilim parametre alınmalı — Yasak: /fn\s+\w+\s*(<[^>]*>)?\s*\([^)]*:\s*(String|Vec\s*<)/
- [ ] Döngüde gereksiz tahsis yapılmamalı; kapasite önceden ayrılmalı (with_capacity) — Yasak: /for\s+\w+\s+in\s+[^{]*\{[^}]*(Vec::new|String::new|vec!|to_string\(\)|to_vec\(\))/
- [ ] Blocking I/O async runtime içinde çağrılmamalı (tokio) — Yasak: /std::thread::sleep|std::fs::(read|write|File|remove|create)|reqwest::blocking|\.blocking_(send|recv|lock|read|write)\(/

## 4. Güvenlik & Test
- [ ] Parola/secret/token/api key koda gömülmemeli; env kullanılmalı ⚙️
- [ ] SQL için parametreli sorgu (sqlx/diesel) kullanılmalı — Yasak: /(query|query_as|execute|sql_query)\s*\(\s*&?format!|(SELECT|INSERT|UPDATE|DELETE)[^"]*\{\}/
- [ ] Public API öğeleri doc comment (///) ile belgelenmeli
- [ ] Yeni davranış için test / entegrasyon testi eklenmeli — Yasak: /#\[ignore\]|#\[cfg\(ignore\)\]/
