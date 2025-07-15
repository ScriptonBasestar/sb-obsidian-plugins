// Mock Obsidian API for testing
export class Plugin {
  app: any;
  addCommand() {}
  addSettingTab() {}
  addStatusBarItem() { return { setText: () => {} }; }
  addRibbonIcon() {}
  loadData() { return Promise.resolve({}); }
  saveData() { return Promise.resolve(); }
}

export class Notice {
  constructor(message: string) {}
}

export class Setting {
  constructor(containerEl: any) {}
  setName() { return this; }
  setDesc() { return this; }
  addText() { return this; }
  addToggle() { return this; }
  addSlider() { return this; }
  addDropdown() { return this; }
  addButton() { return this; }
}

export class PluginSettingTab {
  constructor(app: any, plugin: any) {}
  display() {}
}

export class Modal {
  app: any;
  contentEl: any = {
    createEl: () => ({ style: {}, createEl: () => ({}) }),
    empty: () => {},
    addClass: () => {}
  };
  
  constructor(app: any) {}
  open() {}
  close() {}
}

export class TFile {}
export class TFolder {}
export class Vault {}