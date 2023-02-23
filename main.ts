import { complete } from "libllm/openai";
import {
	App,
	Editor,
	MarkdownView,
	Modal,
	Plugin,
	PluginSettingTab,
	Setting,
} from "obsidian";

// Remember to rename these classes and interfaces!

interface LLMSettings {
	openaiSecretKey: string;
	openaiOrganizationId: string;
}

const DEFAULT_SETTINGS: LLMSettings = {
	openaiSecretKey: "",
	openaiOrganizationId: "",
};

export default class LLMPlugin extends Plugin {
	settings: LLMSettings;

	async onload() {
		await this.loadSettings();

		this.addCommand({
			id: "selection-gpt3",
			name: "Send selection to OpenAI GPT-3",
			editorCallback: async (editor: Editor, view: MarkdownView) => {
				const selection = editor.getSelection();
				const result = await complete({
					config: {
						organization: this.settings.openaiOrganizationId,
						apiKey: this.settings.openaiSecretKey,
					},
					prompt: selection,
				});
				new LLMResultModal(this.app, result).open();
			},
		});

		this.addSettingTab(new LLMSettingTab(this.app, this));
	}

	onunload() {}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData()
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class LLMResultModal extends Modal {
	result: string;

	constructor(app: App, result: string) {
		super(app);
		this.result = result;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.setText(this.result);
	}

	onClose() {}
}

class LLMSettingTab extends PluginSettingTab {
	plugin: LLMPlugin;

	constructor(app: App, plugin: LLMPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		containerEl.createEl("h2", { text: "Settings for LibLLM" });

		new Setting(containerEl)
			.setName("OpenAI Secret Key")
			.setDesc("Your OpenAI secret key.")
			.addText((text) =>
				text
					.setPlaceholder("sk-jfiowj3f3f32ojf2f...")
					.setValue(this.plugin.settings.openaiSecretKey)
					.onChange(async (value) => {
						this.plugin.settings.openaiSecretKey = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("OpenAI Organization Id")
			.setDesc(
				"Which organization to use for OpenAI requests. Leave blank to use your default organization."
			)
			.addText((text) =>
				text
					.setPlaceholder("org-jLfje3fjksfs...")
					.setValue(this.plugin.settings.openaiOrganizationId)
					.onChange(async (value) => {
						this.plugin.settings.openaiOrganizationId = value;
						await this.plugin.saveSettings();
					})
			);
	}
}
