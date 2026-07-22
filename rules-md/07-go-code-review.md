# Go (Golang) Code Review Standartları

> Backend · **Go**. Dosya deseni: `*.go`.
> `- [ ]` maddeleri Portal Code Review kuralı olarak okunur. ⚙️ = otomatik denetlenir.

## 1. Genel Kod Kalitesi
- [ ] fmt.Println / fmt.Printf ile çıktı alınmamalı — log/slog kullanılmalı ⚙️
- [ ] Kodda TODO/FIXME bırakılmamalı ⚙️
- [ ] Gereksiz yorum satırı bulunmamalı ⚙️
- [ ] Değişken/paket adları kısa ve anlamlı; dışa açık isimler PascalCase olmalı — Yasak: /(func|type|var|const)\s+[a-z]\w*_\w+/
- [ ] Sihirli sabitler yerine adlandırılmış const/iota kullanılmalı — Yasak: /(if|for)\s[^{\n]*[<>=!]=\s*\d{3,}/
- [ ] Kod gofmt/goimports ile biçimlendirilmeli; kullanılmayan import kalmamalı
- [ ] Paket adları tekil, kısa ve küçük harf olmalı; util/common gibi çöp paketler olmamalı — Yasak: /^package\s+(util|utils|common|helper|helpers|misc|shared|base)\b/

## 2. Hata Yönetimi (Go'ya özgü)
- [ ] Dönen error değeri yok sayılmamalı; _ = err ile yutulmamalı — Yasak: /(_\s*=\s*err\b|_\s*=\s*[\w.]+\([^)\n]*\)\s*$)/
- [ ] panic( üretim kodunda kullanılmamalı; hata değerle döndürülmeli ⚙️
- [ ] Hatalar fmt.Errorf("...: %w", err) ile sarmalanarak bağlam eklenmeli — Yasak: /fmt\.Errorf\((?![^\n]*%w)[^\n]*,\s*err\b/
- [ ] Sentinel hata karşılaştırmasında errors.Is / errors.As kullanılmalı — Yasak: /err\s*[!=]=\s*[\w.]*Err[A-Z]\w*/
- [ ] Hata mesajları küçük harfle başlamalı ve noktalama ile bitmemeli — Yasak: /(errors\.New|fmt\.Errorf)\(\s*"([A-Z]|[^"\n]*[.!]")/
- [ ] recover yalnız gerçekten gerekli sınırlarda (goroutine tepesi) kullanılmalı — Yasak: /\brecover\s*\(\s*\)/

## 3. Eşzamanlılık
- [ ] goroutine sızıntısı olmamalı; context ile iptal/timeout yönetilmeli — Yasak: /go\s+func\s*\(\s*\)\s*\{/
- [ ] Paylaşılan duruma erişimde mutex/kanal ile senkronizasyon yapılmalı; race olmamalı — Yasak: /go\s+func\s*\([^)\n]*\)\s*\{[^\n]*(\+\+|--|\+=|\]\s*=)/
- [ ] defer ile kaynak (file, rows, conn, mutex.Unlock) mutlaka kapatılmalı — Yasak: /_\s*=\s*[\w.]*\.Close\s*\(\s*\)/
- [ ] Kanallar üretici tarafında kapatılmalı; kapalı kanala yazılmamalı — Yasak: /for\s[^\n]*range\s+\w+\s*\{[^\n]*close\s*\(/
- [ ] WaitGroup Add/Done dengesi korunmalı; sync primitive'leri kopyalanmamalı — Yasak: /\(\s*[^)*\n]*\bsync\.(WaitGroup|Mutex|RWMutex)\b/
- [ ] context.Context fonksiyonun ilk parametresi olmalı; struct içinde saklanmamalı — Yasak: /func\s+[^(\n]*\(\s*[a-z]\w*\s+[\w*.\[\]]+\s*,\s*\w+\s+context\.Context/

## 4. Güvenlik & Performans
- [ ] Parola/secret/token/api key koda gömülmemeli ⚙️
- [ ] SQL sorguları parametreli olmalı; string birleştirme ile yazılmamalı — Yasak: /(Query|QueryRow|Exec)(Context)?\s*\([^\n]*("[^"\n]*"\s*\+|fmt\.Sprintf\()/
- [ ] Döngü içinde gereksiz tahsis (allocation) yapılmamalı; slice önceden cap ile ayrılmalı — Yasak: /=\s*make\(\[\][\w.*\[\]]+,\s*0\s*\)/
- [ ] Büyük struct'lar değer yerine pointer ile geçirilmeli (gerektiğinde) — Yasak: /func\s*\(\s*\w+\s+[A-Z]\w*\s*\)\s*[A-Z]/
- [ ] defer sıcak döngü (hot loop) içinde kullanılmamalı — Yasak: /for\s[^\n]*\{[^\n]*\bdefer\s/
- [ ] HTTP istemcisinde timeout ayarlanmalı; response body kapatılmalı — Yasak: /(http\.(Get|Post|PostForm|Head)\s*\(|http\.Client\{\s*\})/

## 5. API & Yapı
- [ ] Interface'ler tüketici tarafında, küçük ve odaklı tanımlanmalı — Yasak: /type\s+I[A-Z]\w*\s+interface\b/
- [ ] Dışa açık tipler/fonksiyonlar doc comment ile açıklanmalı
- [ ] Test edilebilirlik için bağımlılıklar interface üzerinden enjekte edilmeli — Yasak: /^var\s+\w+\s*=\s*&?\w*(Service|Repo|Repository|Client|Store)\{/
- [ ] Yeni davranış için `_test.go` altında test eklenmeli
