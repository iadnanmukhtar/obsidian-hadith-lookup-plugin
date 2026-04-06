import { App, Editor, MarkdownView, Notice, Plugin, PluginSettingTab, Setting } from 'obsidian';

interface HadithLookupSettings {
	api: string;
	quranTemplate: string;
	passageTemplate: string;
	hadithTemplate: string;
}

type TemplateType = 'hadith' | 'quran' | 'passage';

interface LookupRequest {
	ref: string;
	templateType: TemplateType;
}

type LookupApiResult = Record<string, any>[];

const DEFAULT_SETTINGS: HadithLookupSettings = {
	api: 'https://hadithunlocked.com/{result.ref}?json',
	quranTemplate:
		`> [!note]
> {result[0].chapter.title} {result[0].num_ar} - {result[0].body}
> 
> [[{result[0].chapter.title_en} {result[0].num}]] - {result[0].body_en}

`,
	passageTemplate:
		`> [!note]
> {result[0].chapter.title} {result[0].num_ar} - {result[0].body}
> 
> [[{result[0].chapter.title_en} {result[0].num}]] - {result[0].body_en}

`,
	hadithTemplate:
		`> [!tip] {result[0].title_en}
> {result[0].book_shortName} {result[0].num} - {result[0].chain}
> {result[0].body} 
> {result[0].footnote} – {result[0].grade_grade} ({result[0].grader_shortName})
> 
> [[{result[0].book_shortName_en} {result[0].num}]] - {result[0].chain_en}
> {result[0].body_en}
> {result[0].footnote_en} – {result[0].grade_grade_en} ({result[0].grader_shortName_en})

`,
}

const HADITH_BOOK_IDS = new Set([
	'bukhari', 'muslim', 'nasai', 'abudawud', 'tirmidhi', 'ibnmajah', 'ahmad', 'darami', 'hakim',
	'ibnhibban', 'tabarani', 'nasai-kubra', 'bayhaqi', 'suyuti',
]);

const PASSAGE_REFERENCE_PATTERN = /^passage:.+:\d+(?:-\d+)?$/;
const QURAN_REFERENCE_PATTERN = /^quran:.+:\d+$/;
const QURAN_PASSAGE_PATTERN = /^quran:.+:\d+-\d+$/;
const NORMALIZED_QURAN_REFERENCE_PATTERN = /^(?:quran|passage)(?::|\s+)[a-z0-9'_-]+(?::|\s+)\d+(?:-\d+)?$/;
const NORMALIZED_GENERIC_REFERENCE_PATTERN = /^[a-z0-9'_-]+(?::|\s+)\d+[a-z]?(?:-\d+[a-z]?)?$/;
const BARE_NUMERIC_QURAN_REFERENCE_PATTERN = /^\d+:\d+(?:-\d+)?$/;
const BARE_NAMED_QURAN_REFERENCE_PATTERN = /^([a-z0-9'_-]+):\d+(?:-\d+)?$/;
const NAMED_QURAN_REFERENCE_PATTERN = /^quran:([a-z'_-]+):\d+(?:-\d+)?$/;
const RESULT_TEMPLATE_MAP: Record<TemplateType, keyof HadithLookupSettings> = {
	hadith: 'hadithTemplate',
	quran: 'quranTemplate',
	passage: 'passageTemplate',
};

export default class HadithLookupPlugin extends Plugin {

	settings: HadithLookupSettings;

	async onload() {

		await this.loadSettings();

		this.addCommand({
			id: 'fetch-hadith',
			name: 'Fetch hadith or Quran using the selected reference',
			editorCallback: async (editor: Editor, view: MarkdownView) => {
				try {
					const lookupRequest = resolveLookupRequest(editor.getSelection());
					const result = await fetchLookupResult(this.settings.api, lookupRequest.ref);
					editor.replaceSelection(renderLookupResult(result, lookupRequest.templateType, this.settings));
				} catch (error) {
					handleLookupError(error);
				}
			}
		});

		this.addCommand({
			id: 'search-hadith',
			name: 'Find hadith or Quran using the selected text',
			editorCallback: async (editor: Editor, view: MarkdownView) => {
				try {
					const result = await searchLookupResult(editor.getSelection());
					editor.replaceSelection(formatSearchResults(result));
				} catch (error) {
					handleLookupError(error);
				}
			}
		});

		this.addSettingTab(new HadithLookupSettingTab(this.app, this));

	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class HadithLookupSettingTab extends PluginSettingTab {

	plugin: HadithLookupPlugin;

	constructor(app: App, plugin: HadithLookupPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		this.addTextSetting(containerEl, 'API', 'Hadith lookup API: Default is the Hadith Unlocked API', 'api');
		this.addTextAreaSetting(containerEl, 'Quran template', 'For single ayah references, e.g. quran:2:255', 'quranTemplate');
		this.addTextAreaSetting(containerEl, 'Quran passage template', 'For passage references e.g. quran:2:255-258', 'passageTemplate');
		this.addTextAreaSetting(containerEl, 'Hadith template', 'For hadith references e.g. muslim:55a', 'hadithTemplate');
	}

	private addTextSetting(containerEl: HTMLElement, name: string, description: string, key: keyof HadithLookupSettings) {
		new Setting(containerEl)
			.setName(name)
			.setDesc(description)
			.addText(text => text
				.setPlaceholder('')
				.setValue(this.plugin.settings[key])
				.onChange(async (value) => {
					this.plugin.settings[key] = value;
					await this.plugin.saveSettings();
				}));
	}

	private addTextAreaSetting(containerEl: HTMLElement, name: string, description: string, key: keyof HadithLookupSettings) {
		new Setting(containerEl)
			.setName(name)
			.setDesc(description)
			.addTextArea(text => text
				.setPlaceholder('')
				.setValue(this.plugin.settings[key])
				.onChange(async (value) => {
					this.plugin.settings[key] = value;
					await this.plugin.saveSettings();
				}));
	}
}

function normalizeReference(ref: string) {
	const normalizedRef = ref
		.trim()
		.toLowerCase()
		.replace(/\s*:\s*/g, ':')
		.replace(/\s+/g, ' ');

	if (normalizedRef.match(NORMALIZED_QURAN_REFERENCE_PATTERN))
		return normalizedRef.replace(/[:\s]+/g, ':');
	if (normalizedRef.match(NORMALIZED_GENERIC_REFERENCE_PATTERN))
		return normalizedRef.replace(/[:\s]+/g, ':');

	return normalizedRef;
}

function isBareQuranReference(ref: string) {
	if (ref.match(BARE_NUMERIC_QURAN_REFERENCE_PATTERN))
		return true;

	const match = ref.match(BARE_NAMED_QURAN_REFERENCE_PATTERN);
	if (!match)
		return false;

	return !HADITH_BOOK_IDS.has(match[1]);
}

function resolveLookupRequest(selection: string): LookupRequest {
	const normalizedRef = normalizeReference(selection);
	const ref = isBareQuranReference(normalizedRef) ? `quran:${normalizedRef}` : normalizedRef;

	if (ref.match(PASSAGE_REFERENCE_PATTERN))
		return {
			ref,
			templateType: 'passage',
		};

	if (ref.match(QURAN_PASSAGE_PATTERN))
		return {
			ref: ref.replace(/^quran/, 'passage'),
			templateType: 'passage',
		};

	if (ref.match(QURAN_REFERENCE_PATTERN))
		return {
			ref: usesNamedSurahRoute(ref) ? ref.replace(/^quran/, 'passage') : ref,
			templateType: 'quran',
		};

	return {
		ref,
		templateType: 'hadith',
	};
}

function usesNamedSurahRoute(ref: string) {
	return ref.match(NAMED_QURAN_REFERENCE_PATTERN) !== null;
}

async function fetchLookupResult(apiTemplate: string, ref: string): Promise<LookupApiResult> {
	const res = await fetch(fillIn(apiTemplate, { ref }));
	const resStr = await res.text();
	const result = (resStr === '') ? [] : JSON.parse(resStr);

	if (!result[0])
		throw new Error(`No results found for "${ref}"`);

	result[0].num = (result[0].num + '').replace(/:/, '\ua789');
	return result;
}

function renderLookupResult(result: LookupApiResult, templateType: TemplateType, settings: HadithLookupSettings) {
	return fillIn(settings[RESULT_TEMPLATE_MAP[templateType]], result);
}

async function searchLookupResult(query: string): Promise<LookupApiResult> {
	const res = await fetch('https://hadithunlocked.com?json&q=' + query);
	let resStr = await res.text();
	resStr = resStr.replace(/<\/?i>/g, '');
	return (resStr === '') ? [] : JSON.parse(resStr);
}

function formatSearchResults(result: LookupApiResult) {
	const text = result
		.slice(0, 5)
		.map(entry => `> ${entry.book_shortName} – ${entry.body}\n> ${entry.book_alias}:${entry.num} – ${entry.body_en}\n`)
		.join('\n');

	return `* * *\n\n${text}* * *\n`;
}

function handleLookupError(error: unknown) {
	const message = error instanceof Error ? error.message : String(error);
	new Notice(`Lookup failed: ${message}`);
	console.error(error);
}

function fillIn(s: string, result: any) {
	const matches = [...s.matchAll(/{([^}]+)}/g)];
	if (matches) {
		for (let i = 0; i < matches.length; i++) {
			let replacement = eval(matches[i][1]);
			if (!replacement) replacement = '';
			s = s.replaceAll(matches[i][0], replacement);
		}
	}
	return s;
}
