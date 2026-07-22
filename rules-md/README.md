# Code Review kural dosyaları

Bu dizin, `/code-review` aracının kural kaynağıdır. Her `.md` dosyası bir teknoloji/alan için
review standartlarını tutar. Kurallar markdown checklist satırlarından okunur:

```markdown
- [ ] Kuralın metni  [Oncelik: Major]  ([01 §3.2](./01-react-code-review.md#32-state))
```

`README.md` kural olarak okunmaz.

## Derleme

Kurallar tarayıcıda çalıştığı için `lib/codereview/bundledRules.ts` içine gömülür.
Bir md dosyasını düzenledikten sonra:

```bash
npm run rules:build
```

`bundledRules.ts` **otomatik üretilir — elle düzenlemeyin.**

## Kural nasıl denetlenir?

Motor yapay zeka kullanmaz; MR diff'inin **eklenen satırlarına** bakar. Bir kural şu yollardan
biriyle denetlenir (`Kurallar` sekmesindeki "Denetim" sütunu hangisi olduğunu gösterir):

| Denetim | Nasıl |
| --- | --- |
| ⚙️ Regex | Kural REGEX tipinde; kendi deseniyle satır satır denetlenir |
| ⚙️ Desen | Kural metnine `Yasak:` / `Zorunlu:` deseni yazılmış |
| ⚙️ Yerleşik | Kural metni yerleşik bir dedektörün anahtar kelimesine bağlanıyor (`lib/codereview/detectors.ts`) |
| ⚙️ Sınır | Kural ölçülebilir bir satır üst sınırı belirtiyor ("en fazla 300 satır") |
| ✋ Elle | Soyut kural — makine ile denetlenemez, insan incelemesi gerekir |

## Soyut kuralı denetlenebilir yapmak: `Yasak:` / `Zorunlu:`

Kuralın tipini değiştirmeden, **satırın sonuna** açık bir desen yazılır:

```markdown
- [ ] Bileşende inline style kullanılmaz.  [Oncelik: Minor] Yasak: /style=\{\{/
- [ ] Her test dosyası describe ile başlar.  [Oncelik: Major] Zorunlu: /describe\s*\(/
```

- **`Yasak: /desen/`** → eklenen satırlardan biri desene uyarsa bulgu üretilir.
- **`Zorunlu: /desen/`** → dosyanın eklenen satırlarının **hiçbiri** uymuyorsa bulgu üretilir.
  Yanlış pozitife çok açıktır; yalnızca "bu dosya tipinde bu yapı kesinlikle olmalı" diyebildiğinizde kullanın.

### Kurallar

Kural metni motora gitmeden önce temizlenir (markdown linkleri metne indirgenir, `[Oncelik: X]` ve
`(… § …)` referansları, backtick'ler ve `**` silinir, ardışık boşluklar teke iner). Bu yüzden desen içinde:

1. **backtick kullanmayın** — silinir, regex bozulur
2. `**` kullanmayın
3. `[metin](hedef)` dizilimi oluşturmayın — link sanılıp yenir
4. `/` karakterini `\/` olarak kaçırın
5. bayrak (flag) yazmayın, sadece `/…/`
6. satır başına en fazla bir `Yasak:` ve bir `Zorunlu:`

Desen dar ve somut olmalı. Neredeyse her satıra uyan desen, denetimsiz kuraldan kötüdür —
o durumda kuralı `✋ Elle` bırakın.

### Yeni yerleşik dedektör

Aynı desen pek çok md dosyasında tekrar ediyorsa, tek tek yazmak yerine
`lib/codereview/detectors.ts` içindeki `DETECTORS` listesine anahtar kelimeleriyle birlikte
bir dedektör ekleyin; o kelimeleri içeren tüm kurallar otomatik bağlanır.
