import { App, Editor, MarkdownView, Notice, Plugin, PluginSettingTab, Setting } from 'obsidian';

interface HadithLookupSettings {
	api: string;
	quranTemplate: string;
	passageTemplate: string;
	hadithTemplate: string;
}

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
> {result[0].book.shortName} {result[0].num} - {result[0].chain}
> {result[0].body} 
> {result[0].footnote} – {result[0].grade.grade} ({result[0].grader. shortName})
> 
> [[{result[0].book.shortName_en} {result[0].num}]] - {result[0].chain_en}
> {result[0].body_en}
> {result[0].footnote_en} – {result[0].grade.grade_en} ({result[0].grader. shortName_en})

`,
}

export default class HadithLookupPlugin extends Plugin {

	settings: HadithLookupSettings;

	async onload() {

		await this.loadSettings();

		this.addCommand({
			id: 'fetch-hadith-command',
			name: 'Fetch Quran or Hadith',
			editorCallback: async (editor: Editor, view: MarkdownView) => {
				let ref = editor.getSelection().trim();
				let templateType = 'hadith';
				if (ref.startsWith('quran'))
					templateType = 'quran';
				if (ref.match(/^quran:.+:\d+-\d+/) || ref.match(/^quran:.+:\d+/)) {
					ref = ref.replace(/^quran/, 'passage');
					templateType = 'passage';
				}
				if (ref.match(/^quran:.+:\d+/)) {
					ref = ref.replace(/(\d+)/, '$1-$1');
				}
				try {
					const res = await fetch(fillIn(this.settings.api, { ref: ref }));
					const resStr = await res.text();
					const result = (resStr === '') ? {} : JSON.parse(resStr);
					result[0].num = (result[0].num + '').replace(/:/, '\ua789');

					if (templateType === 'hadith')
						editor.replaceSelection(fillIn(this.settings.hadithTemplate, result));
					else if (templateType === 'quran')
						editor.replaceSelection(fillIn(this.settings.quranTemplate, result));
					else if (templateType === 'passage')
						editor.replaceSelection(fillIn(this.settings.passageTemplate, result));
					else
						editor.replaceSelection(JSON.stringify(result[0]));

				} catch (error) {
					new Notice(`Lookup Failed: ${error.message}`);
					console.error(error.stack);
				}

			}
		});

		this.addCommand({
			id: 'search-hadith-command',
			name: 'Search Hadith Unlocked',
			editorCallback: async (editor: Editor, view: MarkdownView) => {
				try {

					const res = await fetch('https://hadithunlocked.com?json&q=' + editor.getSelection());
					let resStr = await res.text();
					resStr = resStr.replace(/<\/?i>/g, '');
					const result = (resStr === '') ? {} : JSON.parse(resStr);
					let text = '';
					for (let i = 0; i < result.length && i < 5; i++)
						text += `> ${result[i].book_shortName} – ${result[i].body}\n> ${result[i].book_alias}:${result[i].num} – ${result[i].body_en}\n\n`;
					editor.replaceSelection(`* * *\n\n${text}* * *\n`);

				} catch (error) {
					new Notice(`Lookup Failed: ${error.message}`);
					console.error(error.stack);
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

		containerEl.createEl('h2', { text: 'Hadith Lookup Plugin Settings' });

		new Setting(containerEl)
			.setName('API')
			.setDesc('Hadith Lookup API: Default is the Ḥadīth Unlocked API')
			.addText(text => text
				.setPlaceholder('')
				.setValue(this.plugin.settings.api)
				.onChange(async (value) => {
					this.plugin.settings.api = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Quran Template')
			.setDesc('For single ayah references, e.g. quran:2:255')
			.addTextArea(text => text
				.setPlaceholder('')
				.setValue(this.plugin.settings.quranTemplate)
				.onChange(async (value) => {
					this.plugin.settings.quranTemplate = value;
					await this.plugin.saveSettings();
				}));


		new Setting(containerEl)
			.setName('Quran Passage Template')
			.setDesc('For passage references e.g. quran:2:255-258')
			.addTextArea(text => text
				.setPlaceholder('')
				.setValue(this.plugin.settings.passageTemplate)
				.onChange(async (value) => {
					this.plugin.settings.passageTemplate = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Hadith Template')
			.setDesc('For hadith references e.g. muslim:55a of Hadith Unlocked')
			.addTextArea(text => text
				.setPlaceholder('')
				.setValue(this.plugin.settings.hadithTemplate)
				.onChange(async (value) => {
					this.plugin.settings.hadithTemplate = value;
					await this.plugin.saveSettings();
				}));

	}
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
