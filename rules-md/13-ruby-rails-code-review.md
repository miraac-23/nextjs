# Ruby on Rails Code Review Standartları

> Backend · **Ruby** (Rails). Dosya deseni: `*.rb`.
> `- [ ]` maddeleri kural olarak okunur. ⚙️ = otomatik denetlenir.

## 1. Genel Kod Kalitesi
- [ ] print( / puts ile hata ayıklama çıktısı bırakılmamalı — Rails.logger kullanılmalı ⚙️
- [ ] Kodda TODO/FIXME bırakılmamalı ⚙️
- [ ] Gereksiz yorum satırı bulunmamalı ⚙️
- [ ] Metod/değişken snake_case, sınıf/modül CamelCase olmalı — Yasak: /\bdef\s+[a-z_]*[A-Z]|\b(class|module)\s+[a-z]/
- [ ] Sihirli sabitler yerine adlandırılmış sabit kullanılmalı — Yasak: /(==|>=|<=|>|<)\s*\d{3,}|\.(limit|take|sleep)\s*\(?\s*\d{2,}/
- [ ] Metotlar kısa ve tek sorumlu olmalı; RuboCop uyarıları giderilmeli — Yasak: /rubocop:disable/

## 2. Güvenlik
- [ ] Parola/secret/token/api key koda gömülmemeli; credentials/ENV kullanılmalı ⚙️
- [ ] eval( / send ile doğrulanmamış girdi çalıştırılmamalı ⚙️ — Yasak: /\b(eval|instance_eval|class_eval)\s*\(|\.(send|public_send)\s*\(\s*params\[/
- [ ] SQL için parametreli sorgu/ActiveRecord kullanılmalı; string interpolation yasak — Yasak: /(where|find_by_sql|execute|order|group|select)\s*\(?\s*["'][^"']*#\{/
- [ ] Toplu atama için strong parameters (permit) kullanılmalı — Yasak: /\.(new|create|create!|update|update!|update_attributes)\s*\(\s*params\[/
- [ ] Çıktı ERB'de otomatik kaçışlanmalı; html_safe / raw dikkatli kullanılmalı — Yasak: /\.html_safe\b|\braw\s*\(|sanitize:\s*false/
- [ ] CSRF koruması (protect_from_forgery) etkin olmalı — Yasak: /skip_before_action\s+:verify_authenticity_token|protect_from_forgery\s+with:\s*:null_session/

## 3. Rails Standartları
- [ ] Controller ince olmalı; iş mantığı model/service objesine taşınmalı (fat model, skinny controller)
- [ ] N+1 sorgu için includes (eager loading) kullanılmalı — Yasak: /\.all\.each\b|\.where\([^)]*\)\.each\b|\.each\s*do\s*\|\w+\|\s*\w+\.\w+\.(count|sum|first|where)/
- [ ] Model callback'leri aşırı kullanılmamalı; karmaşık akış service objelerine alınmalı — Yasak: /^\s*(after_save|after_create|after_commit|before_save|before_create)\s+[:{]/
- [ ] Uzun işlemler Active Job / Sidekiq'e taşınmalı — Yasak: /\.deliver_now\b|Net::HTTP\.(get|post|start)|\bsleep\s+\d/
- [ ] Veritabanı sorguları scope/where ile yazılmalı; Ruby tarafında filtreleme yapılmamalı — Yasak: /\.(all|to_a)\.(select|reject|find_all|sort_by|detect|count)\s*(\{|do\b)/
- [ ] Migration'lar geri alınabilir (reversible) olmalı — Yasak: /^\s*execute\s+["']|^\s*def\s+down\b/

## 4. Hata Yönetimi & Test
- [ ] Boş rescue ile istisna yutulmamalı ⚙️
- [ ] rescue => e yerine belirli istisna sınıfları yakalanmalı — Yasak: /rescue\s*=>\s*\w+|rescue\s+(StandardError|Exception)\b/
- [ ] Yeni davranış için RSpec/Minitest testi eklenmeli — Yasak: /^\s*(xit|xdescribe|xcontext|pending)\b|^\s*skip\s+["']/
- [ ] Ölü kod ve yorum satırına alınmış blok bırakılmamalı
