import { App, Notice } from 'obsidian';
import { ObsidianSettings } from './types';
import { SettingsParser } from './settings-parser';

export class BackupManager {
  private app: App;
  private parser: SettingsParser;
  private backupDir: string;

  constructor(app: App, sensitiveKeys: string[] = []) {
    this.app = app;
    this.parser = new SettingsParser(app, sensitiveKeys);
    this.backupDir = `${app.vault.configDir}/.settings-backups`;
  }

  /**
   * Create a backup of current settings
   */
  async createBackup(name?: string): Promise<string> {
    try {
      // Ensure backup directory exists
      if (!await this.app.vault.adapter.exists(this.backupDir)) {
        await this.app.vault.adapter.mkdir(this.backupDir);
      }

      // Parse current settings
      const settings = await this.parser.parseAllSettings();
      
      // Generate backup filename
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupName = name || `backup-${timestamp}`;
      const backupPath = `${this.backupDir}/${backupName}.json`;

      // Create backup metadata
      const backup = {
        version: 1,
        created: new Date().toISOString(),
        obsidianVersion: (this.app as any).desktop?.appVersion || 'unknown',
        vaultName: this.app.vault.getName(),
        settings: settings
      };

      // Write backup file
      await this.app.vault.adapter.write(
        backupPath,
        JSON.stringify(backup, null, 2)
      );

      new Notice(`Backup created: ${backupName}`);
      return backupPath;

    } catch (error) {
      console.error('Backup failed:', error);
      throw new Error(`Failed to create backup: ${error.message}`);
    }
  }

  /**
   * List available backups
   */
  async listBackups(): Promise<BackupInfo[]> {
    try {
      if (!await this.app.vault.adapter.exists(this.backupDir)) {
        return [];
      }

      const files = await this.app.vault.adapter.list(this.backupDir);
      const backups: BackupInfo[] = [];

      for (const file of files.files) {
        if (file.endsWith('.json')) {
          try {
            const content = await this.app.vault.adapter.read(file);
            const backup = JSON.parse(content);
            
            backups.push({
              path: file,
              name: file.split('/').pop()?.replace('.json', '') || '',
              created: backup.created,
              obsidianVersion: backup.obsidianVersion,
              vaultName: backup.vaultName
            });
          } catch (error) {
            console.error(`Failed to read backup ${file}:`, error);
          }
        }
      }

      // Sort by creation date, newest first
      backups.sort((a, b) => 
        new Date(b.created).getTime() - new Date(a.created).getTime()
      );

      return backups;

    } catch (error) {
      console.error('Failed to list backups:', error);
      return [];
    }
  }

  /**
   * Restore settings from a backup
   */
  async restoreBackup(backupPath: string): Promise<void> {
    try {
      // Read backup file
      const content = await this.app.vault.adapter.read(backupPath);
      const backup = JSON.parse(content);

      // Validate backup format
      if (!backup.version || !backup.settings) {
        throw new Error('Invalid backup format');
      }

      // Check version compatibility
      if (backup.version > 1) {
        throw new Error(`Backup version ${backup.version} is not supported`);
      }

      // Create a backup of current settings before restoring
      await this.createBackup('pre-restore-backup');

      // Restore settings
      await this.parser.serializeSettings(backup.settings);

      new Notice('Settings restored successfully. Please reload Obsidian to apply changes.');

    } catch (error) {
      console.error('Restore failed:', error);
      throw new Error(`Failed to restore backup: ${error.message}`);
    }
  }

  /**
   * Delete a backup
   */
  async deleteBackup(backupPath: string): Promise<void> {
    try {
      await this.app.vault.adapter.remove(backupPath);
      new Notice('Backup deleted');
    } catch (error) {
      console.error('Failed to delete backup:', error);
      throw new Error(`Failed to delete backup: ${error.message}`);
    }
  }

  /**
   * Clean up old backups
   */
  async cleanupOldBackups(keepCount: number = 10): Promise<number> {
    try {
      const backups = await this.listBackups();
      
      if (backups.length <= keepCount) {
        return 0;
      }

      // Keep the newest backups
      const toDelete = backups.slice(keepCount);
      
      for (const backup of toDelete) {
        await this.deleteBackup(backup.path);
      }

      return toDelete.length;

    } catch (error) {
      console.error('Cleanup failed:', error);
      return 0;
    }
  }

  /**
   * Export backup to vault
   */
  async exportBackup(backupPath: string, exportPath: string): Promise<void> {
    try {
      const content = await this.app.vault.adapter.read(backupPath);
      await this.app.vault.create(exportPath, content);
      new Notice(`Backup exported to ${exportPath}`);
    } catch (error) {
      console.error('Export failed:', error);
      throw new Error(`Failed to export backup: ${error.message}`);
    }
  }

  /**
   * Import backup from vault
   */
  async importBackup(importPath: string): Promise<string> {
    try {
      const file = this.app.vault.getAbstractFileByPath(importPath);
      if (!file || !('extension' in file) || file.extension !== 'json') {
        throw new Error('Invalid backup file');
      }

      const content = await this.app.vault.read(file);
      const backup = JSON.parse(content);

      // Validate backup
      if (!backup.version || !backup.settings) {
        throw new Error('Invalid backup format');
      }

      // Save to backup directory
      const backupName = `imported-${new Date().toISOString().replace(/[:.]/g, '-')}`;
      const backupPath = `${this.backupDir}/${backupName}.json`;
      
      await this.app.vault.adapter.write(backupPath, content);
      new Notice('Backup imported successfully');
      
      return backupPath;

    } catch (error) {
      console.error('Import failed:', error);
      throw new Error(`Failed to import backup: ${error.message}`);
    }
  }
}

export interface BackupInfo {
  path: string;
  name: string;
  created: string;
  obsidianVersion: string;
  vaultName: string;
}