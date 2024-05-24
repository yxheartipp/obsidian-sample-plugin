import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting } from 'obsidian';

interface MyPluginSettings {
	mySetting: string;
}

const DEFAULT_SETTINGS: MyPluginSettings = {
	mySetting: 'default'
}

export default class MyPlugin extends Plugin {
	settings: MyPluginSettings;
	timer: number;

	async onload() {
		await this.loadSettings();

		// This creates an icon in the left ribbon.
		const ribbonIconEl = this.addRibbonIcon('dice', 'Sample Plugin', (evt: MouseEvent) => {
			// Called when the user clicks the icon.
			new Notice('This is a notice!');
		});
		ribbonIconEl.addClass('my-plugin-ribbon-class');

		const statusBarItemEl = this.addStatusBarItem();
		statusBarItemEl.setText('Status Bar Text');


		this.addCommand({
			id: 'sample-editor-command',
			name: 'Sample editor command',
			editorCallback: (editor: Editor, view: MarkdownView) => {
				this.processEditorContent(editor);
				new Notice('This is a notice!');
			}
		});


		this.addCommand({
			id: 'open-sample-modal-simple',
			name: 'Open sample modal (simple)',
			callback: () => {
				new SampleModal(this.app).open();
			}
		});

		// this.addCommand({
		// 	id: 'sample-editor-command',
		// 	name: 'Sample editor command',
		// 	editorCallback: (editor: Editor, view: MarkdownView) => {
		// 		console.log(editor.getSelection());
		// 		editor.replaceSelection('Sample Editor Command');
		// 	}
		// });

		this.addCommand({
			id: 'open-sample-modal-complex',
			name: 'Open sample modal (complex)',
			checkCallback: (checking: boolean) => {
				const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
				if (markdownView) {
					if (!checking) {
						new SampleModal(this.app).open();
					}
					return true;
				}
			}
		});

		this.addCommand({
			id: 'start-20-minute-timer',
			name: 'Start 20 Minute Timer',
			callback: () => {
				this.startTimer();
			}
		});

		this.addSettingTab(new SampleSettingTab(this.app, this));

		this.registerDomEvent(document, 'click', (evt: MouseEvent) => {
			console.log('click', evt);
		});

		this.registerInterval(window.setInterval(() => console.log('setInterval'), 5 * 60 * 1000));
	}

	onunload() {
		if (this.timer) {
			clearTimeout(this.timer);
		}
	}

	startTimer() {
		new Notice('Timer started for 20 minutes.');
		this.timer = window.setTimeout(() => {
			new TimeUpModal(this.app).open();
		}, 20);
	}


processEditorContent(editor: Editor) {
    // 获取整个文档内容
    const content = editor.getValue();

    // 使用正则表达式查找所有被 :: 标记的数据
    const regex = /::((?:.|\n)*?)::/g;
    let match;
    const matches = [];

    // 查找所有匹配的部分
    while ((match = regex.exec(content)) !== null) {
        matches.push(match);
    }

    // 如果找到任何匹配的部分
    if (matches.length > 0) {
        let updatedContent = content;
        for (const match of matches) {
            const fullMatch = match[0];
            const data = match[1];

            // 转换为字符数组以便进行替换操作
            const dataArray = data.split('');
            const length = dataArray.length;
            
            // 随机删除字符，确保至少一个字符被删除
            const numToDelete = Math.floor(Math.random() * length) + 1;
            for (let i = 0; i < numToDelete; i++) {
                const indexToDelete = Math.floor(Math.random() * length);
                dataArray[indexToDelete] = ' ';
            }

            // 处理后的数据
            const updatedData = dataArray.join('');

            // 用处理后的数据替换原始内容中的匹配部分
            updatedContent = updatedContent.replace(fullMatch, `::${updatedData}::`);
        }

        // 更新编辑器内容
        editor.setValue(updatedContent);
    } else {
        new Notice('No ::marked:: content found.');
    }
}


	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class SampleModal extends Modal {
	constructor(app: App) {
		super(app);
	}

	onOpen() {
		const {contentEl} = this;
		contentEl.setText('Woah!');
	}

	onClose() {
		const {contentEl} = this;
		contentEl.empty();
	}
}

class SampleSettingTab extends PluginSettingTab {
	plugin: MyPlugin;

	constructor(app: App, plugin: MyPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName('Setting #1')
			.setDesc('It\'s a secret')
			.addText(text => text
				.setPlaceholder('Enter your secret')
				.setValue(this.plugin.settings.mySetting)
				.onChange(async (value) => {
					this.plugin.settings.mySetting = value;
					await this.plugin.saveSettings();
				}));
	}
}

class TimeUpModal extends Modal {
	constructor(app: App) {
		super(app);
	}

	onOpen() {
		const {contentEl} = this;
		contentEl.setText('Time up!');
	}

	onClose() {
		const {contentEl} = this;
		contentEl.empty();
	}
}
