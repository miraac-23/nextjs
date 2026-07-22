# Angular Code Review Standartları

> Frontend · **Angular** (TypeScript / RxJS). Dosya deseni: `*.ts`.
> `- [ ]` maddeleri kural olarak okunur. ⚙️ = otomatik denetlenir.

## 1. Genel Kod Kalitesi
- [ ] console.log ile çıktı alınmamalı ⚙️
- [ ] Kodda TODO/FIXME bırakılmamalı ⚙️
- [ ] Gereksiz yorum satırı bulunmamalı ⚙️
- [ ] TypeScript `any` tipi kullanılmamalı; model arayüzleri tanımlanmalı ⚙️
- [ ] `var` yerine const/let kullanılmalı ⚙️
- [ ] debugger ve alert( bırakılmamalı ⚙️

## 2. Bileşen & Şablon
- [ ] Bileşenler ince olmalı; iş mantığı servislere taşınmalı
- [ ] Değişmeyen veriler için ChangeDetectionStrategy.OnPush kullanılmalı — Yasak: /changeDetection\s*:\s*ChangeDetectionStrategy\s*\.\s*Default/
- [ ] Şablonda ağır metot çağrısı yapılmamalı; pipe/computed tercih edilmeli — Yasak: /\{\{[^}]*[\w$]\s*\([^)]*\)[^}]*\}\}/
- [ ] *ngFor ile trackBy kullanılmalı — Yasak: /\*ngFor\s*=\s*["']\s*(?:(?!trackBy)[^"'])*["']/
- [ ] DOM'a doğrudan erişim yerine Renderer2/Angular API kullanılmalı — Yasak: /document\.(getElementById|querySelector|querySelectorAll|createElement|write)\s*\(|\.nativeElement\.(style|innerHTML|classList|appendChild|setAttribute)/
- [ ] Şablona iç HTML basarken innerHTML sanitizasyonu ihmal edilmemeli (XSS) — Yasak: /\[innerHTML\]\s*=|bypassSecurityTrust(Html|Script|Url|ResourceUrl|Style)\s*\(/

## 3. RxJS & Async
- [ ] Subscription'lar takeUntil/async pipe ile temizlenmeli; bellek sızıntısı olmamalı — Yasak: /\.pipe\s*\((?:(?!takeUntil|takeUntilDestroyed|take\s*\(|first\s*\()[^\n])*\)\s*\.subscribe\s*\(/
- [ ] İç içe subscribe yerine switchMap/mergeMap operatörleri kullanılmalı — Yasak: /\.subscribe\s*\([^\n]*\.subscribe\s*\(/
- [ ] Observable'lar bileşende manuel unsubscribe edilmeli veya async pipe ile bağlanmalı — Yasak: /^\s*this\.[\w$][^;=\n]*\.subscribe\s*\(/
- [ ] Gereksiz tekrar HTTP çağrısı için shareReplay/cache kullanılmalı

## 4. Güvenlik & Mimari
- [ ] Parola/secret/token/api key bileşene gömülmemeli; environment kullanılmalı ⚙️
- [ ] HTTP çağrıları HttpClient ve interceptor ile merkezileştirilmeli — Yasak: /(^|[^.\w])fetch\s*\(|\baxios\s*[.(]|new\s+XMLHttpRequest\s*\(/
- [ ] Servisler DI ile sağlanmalı; new ile elle örneklenmemeli — Yasak: /=\s*new\s+[A-Z][\w$]*(Service|Store|Facade|Repository|Api)\s*\(/
- [ ] Route'lar lazy loading ile modüllere bölünmeli
- [ ] Form doğrulaması Reactive Forms ile yapılmalı — Yasak: /\[\(ngModel\)\]|\bngModel\s*=|\bFormsModule\b/
- [ ] Yeni davranış için birim testi (Jasmine/Karma) eklenmeli — Yasak: /\b(describe|it)\s*\.\s*(skip|only)\s*\(|\bx(it|describe)\s*\(|\bfdescribe\s*\(|\bfit\s*\(/
