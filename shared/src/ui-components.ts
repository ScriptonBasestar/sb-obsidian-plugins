import { Modal, App, Setting, ButtonComponent, TextComponent } from 'obsidian';

export interface ConfirmDialogOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  dangerous?: boolean;
}

export class ConfirmDialog extends Modal {
  private result: boolean = false;
  private options: ConfirmDialogOptions;
  private onConfirm: () => void;
  private onCancel?: () => void;

  constructor(
    app: App,
    options: ConfirmDialogOptions,
    onConfirm: () => void,
    onCancel?: () => void
  ) {
    super(app);
    this.options = options;
    this.onConfirm = onConfirm;
    this.onCancel = onCancel;
  }

  onOpen() {
    const { contentEl } = this;

    contentEl.createEl('h2', { text: this.options.title });
    contentEl.createEl('p', { text: this.options.message });

    new Setting(contentEl)
      .addButton((btn) => {
        btn.setButtonText(this.options.cancelText || 'Cancel').onClick(() => {
          this.result = false;
          this.close();
        });
      })
      .addButton((btn) => {
        const button = btn.setButtonText(this.options.confirmText || 'Confirm').onClick(() => {
          this.result = true;
          this.close();
        });

        if (this.options.dangerous) {
          button.setWarning();
        }
      });
  }

  onClose() {
    if (this.result) {
      this.onConfirm();
    } else if (this.onCancel) {
      this.onCancel();
    }
  }
}

export interface InputDialogOptions {
  title: string;
  message?: string;
  placeholder?: string;
  defaultValue?: string;
  validate?: (value: string) => string | null;
}

export class InputDialog extends Modal {
  private result: string | null = null;
  private options: InputDialogOptions;
  private onSubmit: (value: string) => void;
  private onCancel?: () => void;
  private inputComponent: TextComponent | null = null;
  private errorEl: HTMLElement | null = null;

  constructor(
    app: App,
    options: InputDialogOptions,
    onSubmit: (value: string) => void,
    onCancel?: () => void
  ) {
    super(app);
    this.options = options;
    this.onSubmit = onSubmit;
    this.onCancel = onCancel;
  }

  onOpen() {
    const { contentEl } = this;

    contentEl.createEl('h2', { text: this.options.title });

    if (this.options.message) {
      contentEl.createEl('p', { text: this.options.message });
    }

    // Create error message element
    this.errorEl = contentEl.createEl('div', {
      cls: 'input-dialog-error',
      attr: { style: 'color: var(--text-error); margin-bottom: 10px; display: none;' },
    });

    new Setting(contentEl).addText((text) => {
      this.inputComponent = text;
      text
        .setPlaceholder(this.options.placeholder || '')
        .setValue(this.options.defaultValue || '')
        .onChange((value) => {
          // Clear error when user types
          if (this.errorEl) {
            this.errorEl.style.display = 'none';
          }
        });

      // Focus and select all text
      text.inputEl.focus();
      text.inputEl.select();

      // Submit on Enter
      text.inputEl.addEventListener('keydown', (e: KeyboardEvent) => {
        if (e.key === 'Enter') {
          this.submit();
        }
      });
    });

    new Setting(contentEl)
      .addButton((btn) => {
        btn.setButtonText('Cancel').onClick(() => {
          this.result = null;
          this.close();
        });
      })
      .addButton((btn) => {
        btn
          .setButtonText('OK')
          .setCta()
          .onClick(() => {
            this.submit();
          });
      });
  }

  private submit() {
    if (!this.inputComponent) return;

    const value = this.inputComponent.getValue();

    // Validate if validator is provided
    if (this.options.validate) {
      const error = this.options.validate(value);
      if (error && this.errorEl) {
        this.errorEl.textContent = error;
        this.errorEl.style.display = 'block';
        return;
      }
    }

    this.result = value;
    this.close();
  }

  onClose() {
    if (this.result !== null) {
      this.onSubmit(this.result);
    } else if (this.onCancel) {
      this.onCancel();
    }
  }
}

export interface ProgressBarOptions {
  title: string;
  message?: string;
  cancellable?: boolean;
}

export class ProgressDialog extends Modal {
  private options: ProgressBarOptions;
  private progressBar!: HTMLElement;
  private progressText!: HTMLElement;
  private messageEl!: HTMLElement;
  private cancelButton: ButtonComponent | null = null;
  private cancelled = false;
  private onCancel?: () => void;

  constructor(app: App, options: ProgressBarOptions, onCancel?: () => void) {
    super(app);
    this.options = options;
    this.onCancel = onCancel;
  }

  onOpen() {
    const { contentEl } = this;

    contentEl.createEl('h2', { text: this.options.title });

    if (this.options.message) {
      this.messageEl = contentEl.createEl('p', { text: this.options.message });
    } else {
      this.messageEl = contentEl.createEl('p');
    }

    // Progress bar container
    const progressContainer = contentEl.createEl('div', {
      cls: 'progress-bar-container',
      attr: {
        style:
          'width: 100%; height: 20px; background-color: var(--background-modifier-border); border-radius: 10px; overflow: hidden; margin: 20px 0;',
      },
    });

    // Progress bar
    this.progressBar = progressContainer.createEl('div', {
      cls: 'progress-bar',
      attr: {
        style:
          'width: 0%; height: 100%; background-color: var(--interactive-accent); transition: width 0.3s ease;',
      },
    });

    // Progress text
    this.progressText = contentEl.createEl('div', {
      text: '0%',
      cls: 'progress-text',
      attr: { style: 'text-align: center; margin-top: 10px;' },
    });

    // Cancel button if cancellable
    if (this.options.cancellable) {
      new Setting(contentEl).addButton((btn) => {
        this.cancelButton = btn.setButtonText('Cancel').onClick(() => {
          this.cancelled = true;
          if (this.onCancel) {
            this.onCancel();
          }
          this.close();
        });
      });
    }
  }

  updateProgress(percent: number, message?: string) {
    if (this.cancelled) return;

    const clampedPercent = Math.max(0, Math.min(100, percent));

    if (this.progressBar) {
      this.progressBar.style.width = `${clampedPercent}%`;
    }

    if (this.progressText) {
      this.progressText.textContent = `${Math.round(clampedPercent)}%`;
    }

    if (message && this.messageEl) {
      this.messageEl.textContent = message;
    }
  }

  isCancelled(): boolean {
    return this.cancelled;
  }

  onClose() {
    // Clean up
  }
}

// Utility functions for common UI operations
export const UI = {
  confirm: (app: App, options: ConfirmDialogOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      new ConfirmDialog(
        app,
        options,
        () => resolve(true),
        () => resolve(false)
      ).open();
    });
  },

  prompt: (app: App, options: InputDialogOptions): Promise<string | null> => {
    return new Promise((resolve) => {
      new InputDialog(
        app,
        options,
        (value) => resolve(value),
        () => resolve(null)
      ).open();
    });
  },

  showProgress: (app: App, options: ProgressBarOptions): ProgressDialog => {
    const dialog = new ProgressDialog(app, options);
    dialog.open();
    return dialog;
  },
};
