# obsidian-hadith-lookup-plugin

An Obsidian plugin that uses selected text as a reference ID to lookup and insert Quran and Hadith text and translation using the **[Ḥadīth Unlocked](https://hadith.quranunlocked.com)** API.

## Usage
- Within Obsdian, find and install the plugin from the Community plugins
- Within your Obsidian Note, type in a Ḥadīth Unlocked reference ID, e.g. quran:2:255 or bukhari:99, ideally on a new line
- Select the reference text you typed-in ealier
- Open the Obsidian Command palette and search for "Fetch Hadith"
- The reference text will be replaced by the content of that reference from Ḥadīth Unlocked

## References
There are two types of references you can use with this plugin:
### Quran: Single Āyah or a Range
- quran:2:255
- quran:3:190-194
- etc.
### Hadith
- bukhari:99
- muslim:1
- etc.
### Hadith Book IDs
The Book IDs you can use for Hadith references are the ones available on Ḥadīth Unlocked. There are [several books available](https://hadith.quranunlocked.com/books). Browser the aḥādīth within the books and use the ID found in the browser URL. The ones currently available are: 
- The two authentics: _bukhari_, _muslim_
- The four sunans: _nasai_, _abudawud_, _tirmidhi_, _ibnmajah_
- The additional: _ahmad_, _darami_, _hakim_, _ibnhibban_, _tabarani_, _nasai-kubra_, _bayhaqi_
- and the comprehensive: _suyuti_

### Customization of replacement blocks
By default, the Obsidian Callout format is used to replace the reference with the contents from the Ḥadīth Unlocked API. The API returns a JSON array as a response and the first element of the array is the referenced hadith.

The default Callout templates found in the plugin Settings can be customized as needed. The template should contain the JavaScript object-notation surrounded by {} to access different values from the response JSON. 

For example, `{result[0].body_en}` in the Settings template would be replaced by the contents of the following JSON:
```json
[ 
  { 
	"body_en": "Some value"
  } 
]
```
See the example JSON respones of Ḥadīth Unlocked for the following references:
- [quran:2:255](https://hadith.quranunlocked.com/quran:2:255?json)
- [quran:3:190-194](https://hadith.quranunlocked.com/passage:3:190-194?json)
- [bukhari:99](https://hadith.quranunlocked.com/bukhari:99?json)

### Default replacement templates
- **Quran (Single Āyah)**
```
> [!note]
> {result[0].chapter.title} {result[0].num_ar} - {result[0].body}
> 
> [[{result[0].chapter.title_en} {result[0].num}]] - {result[0].body_en}
```
- **Quran (Āyah Range / Passage)**
```
> [!note]
> {result[0].chapter.title} {result[0].num_ar} - {result[0].body}
> 
> [[{result[0].chapter.title_en} {result[0].num}]] - {result[0].body_en}
```
- **Hadith**
```
> [!tip] {result[0].title_en}
> {result[0].book.shortName} {result[0].num} - {result[0].chain}
> {result[0].body} 
> {result[0].footnote} – {result[0].grade.grade} ({result[0].grader. shortName})
> 
> [[{result[0].book.shortName_en} {result[0].num}]] - {result[0].chain_en}
> {result[0].body_en}
> {result[0].footnote_en} – {result[0].grade.grade_en} ({result[0].grader. shortName_en})
```

