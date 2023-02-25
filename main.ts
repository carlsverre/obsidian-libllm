import { complete, DEFAULT_MODEL, listModels } from "libllm/openai";
import {
	App,
	Editor,
	MarkdownView,
	Modal,
	Plugin,
	PluginSettingTab,
	Setting,
} from "obsidian";

interface LLMSettings {
	openaiSecretKey: string;
	openaiOrganizationId: string;
	openaiModel: string;
}

const DEFAULT_SETTINGS: LLMSettings = {
	openaiSecretKey: "",
	openaiOrganizationId: "",
	openaiModel: DEFAULT_MODEL,
};

const generatePrompt = (editor: Editor) => {
	const cursor = editor.getCursor("to");
	let selection = editor.getSelection();
	if (!selection) {
		selection = editor.getLine(cursor.line);
		cursor.ch = selection.length; // make sure we don't insert somewhere in the middle

		// prepend lines to the prompt until we hit an empty line
		let line = cursor.line - 1;
		while (line >= 0) {
			const lineText = editor.getLine(line);
			if (lineText.trim() === "") {
				break;
			}
			selection = lineText + "\n" + selection;
			line--;
		}
	}

	return {
		prompt: selection,
		endPos: cursor,
	};
};

export default class LLMPlugin extends Plugin {
	settings: LLMSettings;

	async onload() {
		await this.loadSettings();

		this.addCommand({
			id: "complete",
			name: "Complete",
			editorCallback: async (editor: Editor, view: MarkdownView) => {
				const { prompt, endPos } = generatePrompt(editor);
				const result = await this.complete(prompt);
				editor.replaceRange("\n" + result, endPos);
			},
		});

		this.addCommand({
			id: "complete-with-instructions",
			name: "Complete with instructions",
			editorCallback: async (editor: Editor, view: MarkdownView) => {
				const promptMeta = generatePrompt(editor);
				const result = await this.completeWithInstructions(
					promptMeta.prompt
				);
				editor.replaceRange("\n" + result, promptMeta.endPos);
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

	async complete(prompt: string) {
		return await complete({
			config: {
				organization: this.settings.openaiOrganizationId,
				apiKey: this.settings.openaiSecretKey,
			},
			prompt,
		});
	}

	async completeWithInstructions(prompt: string): Promise<string> {
		return new Promise((resolve) =>
			new InstructionsModal(this.app, (instructions) => {
				resolve(this.complete(`${instructions}:\n${prompt}`));
			}).open()
		);
	}
}

class InstructionsModal extends Modal {
	onSubmit: (result: string) => void;

	constructor(app: App, onSubmit: (result: string) => void) {
		super(app);
		this.onSubmit = onSubmit;
	}

	onOpen() {
		const { contentEl } = this;

		contentEl.createEl("h2", { text: "Instructions" });

		const input = createEl("input");
		input.type = "text";
		input.placeholder = "Enter instructions here and press enter";
		input.style.width = "100%";
		input.addEventListener("keydown", (e) => {
			if (e.currentTarget === input && e.key === "Enter") {
				e.preventDefault();
				e.stopPropagation();
				this.close();
				this.onSubmit(input.value);
			}
		});

		contentEl.appendChild(input);
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
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

		new Setting(containerEl)
			.setName("OpenAI Model")
			.setDesc("Which model to use for OpenAI requests.")
			.addDropdown(async (dropdown) => {
				try {
					const models = await listModels({
						organization: this.plugin.settings.openaiOrganizationId,
						apiKey: this.plugin.settings.openaiSecretKey,
					});
					models.data.data
						.sort((a, b) => a.id.localeCompare(b.id))
						.forEach((model) =>
							dropdown.addOption(model.id, model.id)
						);
				} catch (e) {
					console.error(e);
					dropdown.addOption(
						this.plugin.settings.openaiModel,
						this.plugin.settings.openaiModel
					);
				}

				dropdown.setValue(this.plugin.settings.openaiModel);

				dropdown.onChange(async (value) => {
					this.plugin.settings.openaiModel = value;
					await this.plugin.saveSettings();
				});
			});
	}
}
