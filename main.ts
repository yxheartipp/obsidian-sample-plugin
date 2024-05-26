// src/main.ts
import { App, Modal, Notice, Plugin, PluginSettingTab, Setting, TFile } from 'obsidian';

interface MyPluginSettings {
	mySetting: string;
}

const DEFAULT_SETTINGS: MyPluginSettings = {
	mySetting: 'default'
}

export default class LeetCodePracticePlugin extends Plugin {
	settings: MyPluginSettings;
	startTime: number | null = null;
	timer: number | null = null;
	practiceFile: TFile | null = null;
	countdownEl: HTMLElement | null = null;

	async onload() {
		await this.loadSettings();

		this.addCommand({
			id: 'open-practice',
			name: 'Open Practice',
			callback: () => {
				this.createPracticeNote();
			}
		});

		this.addCommand({
			id: 'start-practice',
			name: 'Start Practice',
			callback: () => {
				this.openTimeInputModal();
			}
		});

		this.addCommand({
			id: 'end-practice',
			name: 'End Practice',
			callback: () => {
				this.endPracticeTimer();
			}
		});

		this.addSettingTab(new LeetCodePracticeSettingTab(this.app, this));
	}

	onunload() {
		if (this.timer) {
			clearTimeout(this.timer);
		}
		if (this.countdownEl) {
			this.countdownEl.remove();
		}
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	async createPracticeNote() {
		const folderPath = "LeetCode Practices";
		const date = new Date().toISOString().split('T')[0];
		const time = new Date().toLocaleTimeString('en-GB').replace(/:/g, '-');
		const fileName = `${folderPath}/LeetCode Practice - ${date} ${time}.md`;
		const fileContent = `# LeetCode Practice\n\n## 目标\n\n## 时间\n\n## 结果\n\n## 反馈\n\n`;

		try {
			await this.app.vault.createFolder(folderPath).catch((error) => {
				if (!error.message.contains("Folder already exists")) {
					throw error;
				}
			});

			const file = await this.app.vault.create(fileName, fileContent);
			const leaf = this.app.workspace.getLeaf();
			await leaf.openFile(file);
			new Notice('Practice note created successfully.');
		} catch (error) {
			new Notice('Error creating practice note: ' + error.message);
		}
	}

	openTimeInputModal() {
		new TimeInputModal(this.app, (inputTime: number, goal: string) => {
			this.startPracticeTimer(inputTime, goal);
		}).open();
	}

	startPracticeTimer(inputTime: number, goal: string) {
		this.startTime = Date.now();
		const practiceTimeInMinutes = inputTime;
		const practiceTimeInMilliseconds = practiceTimeInMinutes * 60 * 1000;

		// Generate the practice note
		this.createPracticeNoteWithGoal(goal);

		new Notice(`Practice started for ${practiceTimeInMinutes} minutes.`);

		this.timer = window.setTimeout(() => {
			this.endPracticeTimer();
		}, practiceTimeInMilliseconds);

		this.startCountdown(practiceTimeInMilliseconds);
	}

	async createPracticeNoteWithGoal(goal: string) {
		const folderPath = "LeetCode Practices";
		const date = new Date().toISOString().split('T')[0];
		const time = new Date().toLocaleTimeString('en-GB').replace(/:/g, '-');
		const fileName = `${folderPath}/LeetCode Practice - ${date} ${time}.md`;
		const fileContent = `# LeetCode Practice\n\n## 目标\n\n${goal}\n\n## 时间\n\n## 结果\n\n## 反馈\n\n`;

		try {
			await this.app.vault.createFolder(folderPath).catch((error) => {
				if (!error.message.contains("Folder already exists")) {
					throw error;
				}
			});

			const file = await this.app.vault.create(fileName, fileContent);
			this.practiceFile = file;  // Save the file for future use
			const leaf = this.app.workspace.getLeaf();
			await leaf.openFile(file);
		} catch (error) {
			new Notice('Error creating practice note: ' + error.message);
		}
	}

	async endPracticeTimer() {
		if (this.startTime === null) {
			new Notice('No active practice session.');
			return;
		}

		const endTime = Date.now();
		const elapsedTime = Math.floor((endTime - this.startTime) / 1000); // in seconds
		const hours = Math.floor(elapsedTime / 3600);
		const minutes = Math.floor((elapsedTime % 3600) / 60);
		const seconds = elapsedTime % 60;

		const formattedTime = `${hours}小时${minutes}分钟${seconds}秒`;

		if (!this.practiceFile) {
			new Notice('No practice file found.');
			return;
		}

		const content = await this.app.vault.read(this.practiceFile);
		const updatedContent = content.replace("## 时间", `## 时间\n\n实际练习时间：${formattedTime}`);
		await this.app.vault.modify(this.practiceFile, updatedContent);

		new Notice(`Practice ended. Time spent: ${formattedTime}.`);

		this.logPracticeFeedback();
		this.startTime = null;
		if (this.timer) {
			clearTimeout(this.timer);
			this.timer = null;
		}
		if (this.countdownEl) {
			this.countdownEl.remove();
			this.countdownEl = null;
		}
	}

	logPracticeFeedback() {
		new FeedbackModal(this.app, async (feedback: string) => {
			if (!this.practiceFile) {
				new Notice('No practice file found.');
				return;
			}

			const content = await this.app.vault.read(this.practiceFile);
			const updatedContent = content.replace("## 反馈", `## 反馈\n\n${feedback}`);
			await this.app.vault.modify(this.practiceFile, updatedContent);
		}).open();
	}

	startCountdown(duration: number) {
		if (this.countdownEl) {
			this.countdownEl.remove();
		}
		this.countdownEl = createCountdownElement();
		document.body.appendChild(this.countdownEl);

		const updateCountdown = () => {
			const now = Date.now();
			const remainingTime = Math.max(0, duration - (now - this.startTime));
			const hours = Math.floor(remainingTime / (1000 * 60 * 60));
			const minutes = Math.floor((remainingTime % (1000 * 60 * 60)) / (1000 * 60));
			const seconds = Math.floor((remainingTime % (1000 * 60)) / 1000);

			this.countdownEl.setText(`剩余时间: ${hours}小时${minutes}分钟${seconds}秒`);

			if (remainingTime <= 0) {
				clearInterval(intervalId);
			}
		};

		updateCountdown();
		const intervalId = setInterval(updateCountdown, 1000);
	}
}

function createCountdownElement(): HTMLElement {
	const el = document.createElement('div');
	el.style.position = 'fixed';
	el.style.top = '10px';
	el.style.right = '10px';
	el.style.backgroundColor = '#333';
	el.style.color = '#fff';
	el.style.padding = '5px 10px';
	el.style.borderRadius = '5px';
	el.style.zIndex = '1000';
	return el;
}

class TimeInputModal extends Modal {
	result: string;
	goal: string;
	onSubmit: (time: number, goal: string) => void;

	constructor(app: App, onSubmit: (time: number, goal: string) => void) {
		super(app);
		this.onSubmit = onSubmit;
	}

	onOpen() {
		const { contentEl } = this;

		contentEl.createEl("h1", { text: "输入练习时间 (分钟)" });

		const timeInput = new Setting(contentEl)
			.setName("时间")
			.addText((text) => {
				text.inputEl.addEventListener("keypress", (event) => {
					if (event.key === "Enter") {
						event.preventDefault();
						goalInput.controlEl.children[1].focus();
					}
				});
				text.onChange((value) => {
					this.result = value;
				});
			});

		const goalInput = new Setting(contentEl)
			.setName("目标")
			.addText((text) => {
				text.inputEl.addEventListener("keypress", (event) => {
					if (event.key === "Enter") {
						event.preventDefault();
						this.submit();
					}
				});
				text.onChange((value) => {
					this.goal = value;
				});
			});

		new Setting(contentEl)
			.addButton((btn) =>
				btn
					.setButtonText("提交")
					.setCta()
					.onClick(() => {
						this.submit();
					})
			);
	}

	submit() {
		if (!this.result || !this.goal) {
			new Notice('时间和目标不能为空。');
			return;
		}

		this.close();
		const inputTime = parseInt(this.result);
		if (!isNaN(inputTime) && inputTime > 0) {
			this.onSubmit(inputTime, this.goal);
		} else {
			new Notice('Invalid time entered.');
		}
	}

	onClose() {
		let { contentEl } = this;
		contentEl.empty();
	}
}

class FeedbackModal extends Modal {
	result: string;
	onSubmit: (result: string) => void;

	constructor(app: App, onSubmit: (result: string) => void) {
		super(app);
		this.onSubmit = onSubmit;
	}

	onOpen() {
		const { contentEl } = this;

		contentEl.createEl("h1", { text: "输入练习反馈" });

		new Setting(contentEl)
			.setName("反馈")
			.addTextArea((text) => {
				text.inputEl.addEventListener("keypress", (event) => {
					if (event.key === "Enter") {
						event.preventDefault();
						this.submit();
					}
				});
				text.onChange((value) => {
					this.result = value;
				});
			});

		new Setting(contentEl)
			.addButton((btn) =>
				btn
					.setButtonText("提交")
					.setCta()
					.onClick(() => {
						this.submit();
					})
			);
	}

	submit() {
		if (!this.result) {
			new Notice('反馈不能为空。');
			return;
		}
		this.close();
		this.onSubmit(this.result);
	}

	onClose() {
		let { contentEl } = this;
		contentEl.empty();
	}
}

class LeetCodePracticeSettingTab extends PluginSettingTab {
	plugin: LeetCodePracticePlugin;

	constructor(app: App, plugin: LeetCodePracticePlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		containerEl.createEl('h2', { text: 'Settings for LeetCode Practice Plugin' });

		new Setting(containerEl)
			.setName('My Setting')
			.setDesc('A description of my setting.')
			.addText(text => text
				.setPlaceholder('Enter your setting')
				.setValue(this.plugin.settings.mySetting)
				.onChange(async (value) => {
					this.plugin.settings.mySetting = value;
					await this.plugin.saveSettings();
				}));
	}
}
