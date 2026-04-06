# Hadith Lookup Plugin for Obsidian

Look up Quran verses and Hadith directly inside Obsidian. Type a reference ID, select it, run a command, and the plugin replaces it with the full Arabic text and English translation pulled live from the [Hadith Unlocked](https://hadithunlocked.com) API.

## Getting Started

1. Open Obsidian and go to **Settings > Community Plugins**
2. Search for and install **Hadith Lookup**
3. In any note, type a reference ID on its own line — for example: `quran:2:255` or `bukhari:99`
4. Select the reference text
5. Open the Command Palette and run **Fetch Hadith**

The reference is replaced with the full text and translation from Hadith Unlocked.

---

## Reference Formats

### Quran

You can reference a single āyah or a range, using either the surah number or its name:

```
quran:2:255
quran:baqarah:255
quran:3:190-194
quran:ta-ha:9-15
```

### Hadith

Use the book ID followed by the hadith number:

```
bukhari:99
muslim:1
muslim:8a
```

### Available Book IDs

Browse any book on [hadithunlocked.com/books](https://hadithunlocked.com/books) and use the ID from the URL. Currently available:

| Category | Book IDs |
|---|---|
| The Two Authentics | `bukhari`, `muslim` |
| The Four Sunans | `nasai`, `abudawud`, `tirmidhi`, `ibnmajah` |
| Additional | `ahmad`, `darami`, `hakim`, `ibnhibban`, `tabarani`, `nasai-kubra`, `bayhaqi` |
| Comprehensive | `suyuti` |

And more are being added over time.

---

## Customizing the Output

By default, the plugin formats results as [Obsidian Callouts](https://help.obsidian.md/Editing+and+formatting/Callouts). You can customize these templates in the plugin Settings.

Templates use JavaScript dot-notation inside `{}` to reference fields from the API response. For example, `{result[0].body_en}` pulls the English text from the first item in the returned JSON array.

To understand what fields are available, check the live API responses for these examples:
- [quran:2:255](https://hadithunlocked.com/quran:2:255?json)
- [quran:3:190-194](https://hadithunlocked.com/passage:3:190-194?json)
- [bukhari:99](https://hadithunlocked.com/bukhari:99?json)

---

## Default Templates

### Quran — Single Āyah

```
> [!note]
> {result[0].chapter.title} {result[0].ar.num} - {result[0].body}
> 
> [[{result[0].chapter.title_en} {result[0].num}]] - {result[0].body_en}
```

### Quran — Āyah Range / Passage

```
> [!note]
> {result[0].chapter.title} {result[0].ar.num} - {result[0].body}
> 
> [[{result[0].chapter.title_en} {result[0].num}]] - {result[0].body_en}
```

### Hadith

```
> [!tip] {result[0].title_en}
> {result[0].book_shortName} {result[0].num} - {result[0].chain}
> {result[0].body}
> {result[0].footnote} – {result[0].grade.grade} ({result[0].grader.shortName})
> 
> [[{result[0].book_shortName_en} {result[0].num}]] - {result[0].chain_en}
> {result[0].body_en}
> {result[0].footnote_en} – {result[0].grade.grade_en} ({result[0].grader.shortName_en})
```

---

## Personal Templates

These are my own preferred formats — a bit more compact and styled for personal notes.

### Quran — Single Āyah

```
**Quran: {result[0].title_en}**
- ~~﴿{result[0].body} ۝ ﴾ ([{result[0].chapter.title} {result[0].ar.num}](https://hadithunlocked.com/{result[0].ref}))~~
> > {result[0].body_en}
```

### Quran — Āyah Range / Passage

```
**Quran: {result[0].title_en}**
- ~~﴿{result[0].body}﴾ ([{result[0].chapter.title} {result[0].ar.num}](https://hadithunlocked.com/{result[0].ref}))~~
> > {result[0].body_en}
```

### Hadith

```
**Hadith: {result[0].title_en}**
- ~~«{result[0].body}» ([{result[0].book_shortName} {result[0].ar.num}](https://hadithunlocked.com/{result[0].ref}) {result[0].grade_grade})~~
> > {result[0].body_en}
```