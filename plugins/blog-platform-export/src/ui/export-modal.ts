import { App, Modal, TFile, Notice } from 'obsidian';
import { ProfileManager } from '../profile-manager';
import { ExportProfile } from '../types';

export class ExportModal extends Modal {
  private profileManager: ProfileManager;
  private onExport: (files: TFile[], profile: ExportProfile) => void;
  private selectedFiles: TFile[] = [];
  private selectedProfile: ExportProfile | null = null;

  constructor(
    app: App,
    profileManager: ProfileManager,
    onExport: (files: TFile[], profile: ExportProfile) => void
  ) {
    super(app);
    this.profileManager = profileManager;
    this.onExport = onExport;
  }

  override onOpen() {
    const { contentEl } = this;
    contentEl.empty();

    this.titleEl.setText('Export to Blog Platform');

    // File selection
    contentEl.createEl('h3', { text: 'Select Files' });
    this.renderFileSelection(contentEl);

    // Profile selection
    contentEl.createEl('h3', { text: 'Select Profile' });
    this.renderProfileSelection(contentEl);

    // Export button
    const buttonContainer = contentEl.createDiv('modal-button-container');
    buttonContainer.style.marginTop = '20px';
    buttonContainer.style.textAlign = 'right';

    const cancelBtn = buttonContainer.createEl('button', { text: 'Cancel' });
    cancelBtn.addEventListener('click', () => this.close());

    const exportBtn = buttonContainer.createEl('button', {
      text: 'Export',
      cls: 'mod-cta',
    });
    exportBtn.style.marginLeft = '10px';
    exportBtn.addEventListener('click', () => this.handleExport());

    this.updateExportButton(exportBtn);
  }

  private renderFileSelection(container: HTMLElement) {
    const fileContainer = container.createDiv('file-selection');

    // Quick options
    const quickOptions = fileContainer.createDiv('quick-options');

    const currentFileBtn = quickOptions.createEl('button', { text: 'Current File' });
    currentFileBtn.addEventListener('click', () => {
      const activeFile = this.app.workspace.getActiveFile();
      if (activeFile && activeFile.extension === 'md') {
        this.selectedFiles = [activeFile];
        this.renderSelectedFiles(fileContainer);
      } else {
        new Notice('No markdown file is currently active');
      }
    });

    const allFilesBtn = quickOptions.createEl('button', { text: 'All Files' });
    allFilesBtn.style.marginLeft = '10px';
    allFilesBtn.addEventListener('click', () => {
      this.selectedFiles = this.app.vault.getMarkdownFiles();
      this.renderSelectedFiles(fileContainer);
    });

    // Selected files display
    this.renderSelectedFiles(fileContainer);
  }

  private renderSelectedFiles(container: HTMLElement) {
    const existing = container.querySelector('.selected-files');
    if (existing) {
      existing.remove();
    }

    const selectedContainer = container.createDiv('selected-files');
    selectedContainer.style.marginTop = '10px';

    if (this.selectedFiles.length === 0) {
      selectedContainer.createEl('p', {
        text: 'No files selected',
        cls: 'setting-item-description',
      });
    } else {
      selectedContainer.createEl('p', {
        text: `${this.selectedFiles.length} file(s) selected:`,
        cls: 'setting-item-description',
      });

      const fileList = selectedContainer.createEl('ul');
      fileList.style.maxHeight = '150px';
      fileList.style.overflow = 'auto';
      fileList.style.margin = '5px 0';
      fileList.style.padding = '0 20px';

      this.selectedFiles.forEach((file) => {
        const listItem = fileList.createEl('li', { text: file.path });
        listItem.style.fontSize = '0.9em';
      });

      // Clear selection button
      const clearBtn = selectedContainer.createEl('button', {
        text: 'Clear Selection',
        cls: 'mod-warning',
      });
      clearBtn.style.fontSize = '0.8em';
      clearBtn.addEventListener('click', () => {
        this.selectedFiles = [];
        this.renderSelectedFiles(container);
      });
    }
  }

  private renderProfileSelection(container: HTMLElement) {
    const profiles = this.profileManager.getAllProfiles();

    if (profiles.length === 0) {
      container.createEl('p', {
        text: 'No export profiles configured. Please create a profile in settings first.',
        cls: 'setting-item-description',
      });
      return;
    }

    const profileContainer = container.createDiv('profile-selection');

    profiles.forEach((profile) => {
      const profileEl = profileContainer.createDiv('profile-option');
      profileEl.style.border = '1px solid var(--background-modifier-border)';
      profileEl.style.borderRadius = '5px';
      profileEl.style.padding = '10px';
      profileEl.style.marginBottom = '10px';
      profileEl.style.cursor = 'pointer';

      const radio = profileEl.createEl('input', { type: 'radio' });
      radio.name = 'export-profile';
      radio.value = profile.id;
      radio.addEventListener('change', () => {
        this.selectedProfile = profile;
        this.updateExportButton();
      });

      const label = profileEl.createEl('label');
      label.style.cursor = 'pointer';
      label.style.display = 'flex';
      label.style.alignItems = 'center';
      label.style.marginLeft = '10px';

      label.appendChild(radio);

      const info = label.createDiv('profile-info');
      info.style.marginLeft = '10px';

      const name = info.createEl('div', { text: profile.name });
      name.style.fontWeight = 'bold';

      const platform = info.createEl('div', {
        text: `Platform: ${profile.platform.toUpperCase()}`,
        cls: 'setting-item-description',
      });

      // Click anywhere on the profile to select it
      profileEl.addEventListener('click', (e) => {
        if (e.target !== radio) {
          radio.click();
        }
      });
    });
  }

  private updateExportButton(button?: HTMLButtonElement) {
    const exportBtn = button || (this.contentEl.querySelector('.mod-cta') as HTMLButtonElement);
    if (!exportBtn) return;

    const canExport = this.selectedFiles.length > 0 && this.selectedProfile !== null;
    exportBtn.disabled = !canExport;
    exportBtn.style.opacity = canExport ? '1' : '0.5';
  }

  private handleExport() {
    if (this.selectedFiles.length === 0) {
      new Notice('Please select files to export');
      return;
    }

    if (!this.selectedProfile) {
      new Notice('Please select an export profile');
      return;
    }

    this.close();
    this.onExport(this.selectedFiles, this.selectedProfile);
  }

  override onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}
