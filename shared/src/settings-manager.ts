import { App, PluginSettingTab, Setting } from 'obsidian';
import { BasePlugin, BasePluginSettings } from './base-plugin';

export interface SettingsSection {
  title: string;
  description?: string;
  settings: SettingConfig[];
}

export interface SettingConfig {
  key: string;
  name: string;
  desc: string;
  type: 'text' | 'toggle' | 'dropdown' | 'number' | 'textarea' | 'button';
  default?: any;
  options?: Record<string, string>; // For dropdown
  min?: number; // For number
  max?: number; // For number
  placeholder?: string; // For text/textarea
  action?: () => void; // For button
  onChange?: (value: any) => void;
  validate?: (value: any) => string | null; // Return error message or null
}

export class SettingsManager<T extends BasePluginSettings> extends PluginSettingTab {
  private plugin: BasePlugin<T>;
  private sections: SettingsSection[] = [];
  private validationErrors: Map<string, string> = new Map();

  constructor(app: App, plugin: BasePlugin<T>) {
    super(app, plugin);
    this.plugin = plugin;
  }

  addSection(section: SettingsSection): void {
    this.sections.push(section);
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    // Plugin header
    containerEl.createEl('h2', { text: this.plugin.manifest.name });

    // Render each section
    this.sections.forEach((section) => {
      this.renderSection(containerEl, section);
    });

    // Add reset button at the bottom
    new Setting(containerEl)
      .setName('Reset to defaults')
      .setDesc('Reset all settings to their default values')
      .addButton((button) =>
        button
          .setButtonText('Reset')
          .setWarning()
          .onClick(async () => {
            if (confirm('Are you sure you want to reset all settings to defaults?')) {
              await this.plugin.loadSettings();
              this.display(); // Refresh the settings display
            }
          })
      );
  }

  private renderSection(containerEl: HTMLElement, section: SettingsSection): void {
    // Section title
    if (section.title) {
      containerEl.createEl('h3', { text: section.title });
    }

    // Section description
    if (section.description) {
      containerEl.createEl('p', {
        text: section.description,
        cls: 'setting-item-description',
      });
    }

    // Render each setting
    section.settings.forEach((config) => {
      this.renderSetting(containerEl, config);
    });
  }

  private renderSetting(containerEl: HTMLElement, config: SettingConfig): void {
    const setting = new Setting(containerEl).setName(config.name).setDesc(config.desc);

    // Add validation error display
    const errorId = `error-${config.key}`;
    const existingError = this.validationErrors.get(config.key);
    if (existingError) {
      setting.descEl.createEl('div', {
        text: existingError,
        cls: 'setting-validation-error',
        attr: { id: errorId },
      });
    }

    switch (config.type) {
      case 'text':
        setting.addText((text) => {
          text
            .setPlaceholder(config.placeholder || '')
            .setValue((this.plugin.settings as any)[config.key] || config.default || '')
            .onChange(async (value) => {
              await this.updateSetting(config.key, value, config);
            });
        });
        break;

      case 'toggle':
        setting.addToggle((toggle) => {
          toggle
            .setValue((this.plugin.settings as any)[config.key] ?? config.default ?? false)
            .onChange(async (value) => {
              await this.updateSetting(config.key, value, config);
            });
        });
        break;

      case 'dropdown':
        setting.addDropdown((dropdown) => {
          if (config.options) {
            Object.entries(config.options).forEach(([value, display]) => {
              dropdown.addOption(value, display);
            });
          }
          dropdown
            .setValue((this.plugin.settings as any)[config.key] || config.default || '')
            .onChange(async (value) => {
              await this.updateSetting(config.key, value, config);
            });
        });
        break;

      case 'number':
        setting.addText((text) => {
          text
            .setPlaceholder(config.placeholder || '')
            .setValue(String((this.plugin.settings as any)[config.key] ?? config.default ?? 0))
            .onChange(async (value) => {
              const numValue = parseFloat(value);
              if (!isNaN(numValue)) {
                if (config.min !== undefined && numValue < config.min) return;
                if (config.max !== undefined && numValue > config.max) return;
                await this.updateSetting(config.key, numValue, config);
              }
            });
        });
        break;

      case 'textarea':
        setting.addTextArea((textarea) => {
          textarea
            .setPlaceholder(config.placeholder || '')
            .setValue((this.plugin.settings as any)[config.key] || config.default || '')
            .onChange(async (value) => {
              await this.updateSetting(config.key, value, config);
            });
        });
        break;

      case 'button':
        setting.addButton((button) => {
          button.setButtonText(config.placeholder || 'Click').onClick(() => {
            if (config.action) {
              config.action();
            }
          });
        });
        break;
    }
  }

  private async updateSetting(key: string, value: any, config: SettingConfig): Promise<void> {
    // Validate the value
    if (config.validate) {
      const error = config.validate(value);
      if (error) {
        this.validationErrors.set(key, error);
        this.display(); // Re-render to show error
        return;
      } else {
        this.validationErrors.delete(key);
      }
    }

    // Update the setting
    (this.plugin.settings as any)[key] = value;
    await this.plugin.saveSettings();

    // Call custom onChange handler
    if (config.onChange) {
      config.onChange(value);
    }
  }
}

// Preset validation functions
export const Validators = {
  required: (message = 'This field is required') => {
    return (value: any) => {
      if (!value || (typeof value === 'string' && !value.trim())) {
        return message;
      }
      return null;
    };
  },

  minLength: (min: number, message?: string) => {
    return (value: string) => {
      if (value && value.length < min) {
        return message || `Minimum length is ${min} characters`;
      }
      return null;
    };
  },

  maxLength: (max: number, message?: string) => {
    return (value: string) => {
      if (value && value.length > max) {
        return message || `Maximum length is ${max} characters`;
      }
      return null;
    };
  },

  pattern: (regex: RegExp, message = 'Invalid format') => {
    return (value: string) => {
      if (value && !regex.test(value)) {
        return message;
      }
      return null;
    };
  },

  url: (message = 'Invalid URL') => {
    return (value: string) => {
      if (value) {
        try {
          new URL(value);
        } catch {
          return message;
        }
      }
      return null;
    };
  },

  email: (message = 'Invalid email address') => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return (value: string) => {
      if (value && !emailRegex.test(value)) {
        return message;
      }
      return null;
    };
  },
};
