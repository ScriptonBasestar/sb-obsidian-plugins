import { App, Modal } from 'obsidian';
import SettingsSyncPlugin from './main';

export class InitWizard extends Modal {
  private plugin: SettingsSyncPlugin;

  constructor(app: App, plugin: SettingsSyncPlugin) {
    super(app);
    this.plugin = plugin;
  }

  async show() {
    this.open();
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    
    contentEl.createEl('h2', { text: 'Initialize Vault' });
    contentEl.createEl('p', { text: 'This wizard will help you initialize your vault with shared settings.' });
    
    // TODO: Implement initialization wizard
    // This is a placeholder for Phase 4 implementation
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}