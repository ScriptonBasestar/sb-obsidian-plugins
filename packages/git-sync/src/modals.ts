import { App, Modal } from 'obsidian';

export class PromptPreviewModal extends Modal {
  private content: string;

  constructor(app: App, content: string) {
    super(app);
    this.content = content;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();

    contentEl.createEl('h2', { text: 'Commit Prompt Preview' });

    const previewContainer = contentEl.createEl('div', {
      cls: 'prompt-preview-container',
    });

    // Create a code block with the processed prompt content
    const codeBlock = previewContainer.createEl('pre', {
      cls: 'language-markdown',
    });
    codeBlock.createEl('code', {
      text: this.content,
    });

    // Add close button
    const buttonContainer = contentEl.createEl('div', {
      attr: { style: 'margin-top: 20px; text-align: center;' },
    });

    buttonContainer
      .createEl('button', {
        text: 'Close',
        cls: 'mod-cta',
      })
      .addEventListener('click', () => {
        this.close();
      });
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}

export class TemplateHelpModal extends Modal {
  private helpContent: string;

  constructor(app: App, helpContent: string) {
    super(app);
    this.helpContent = helpContent;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();

    contentEl.createEl('h2', { text: 'Template Variables & Syntax Help' });

    const helpContainer = contentEl.createEl('div', {
      attr: { style: 'margin: 20px 0;' },
    });

    // Parse and render the help content as HTML
    helpContainer.innerHTML = this.helpContent;

    // Add close button
    const buttonContainer = contentEl.createEl('div', {
      attr: { style: 'margin-top: 20px; text-align: center;' },
    });

    buttonContainer
      .createEl('button', {
        text: 'Close',
        cls: 'mod-cta',
      })
      .addEventListener('click', () => {
        this.close();
      });
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}