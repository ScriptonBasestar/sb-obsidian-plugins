import fs from 'fs/promises';
import path from 'path';
import { execSync } from 'child_process';

interface TodoItem {
  index: number;
  completed: boolean;
  text: string;
  line: number;
}

interface TodoFile {
  path: string;
  filename: string;
  content: string;
  todos: TodoItem[];
  frontmatter?: Record<string, any>;
}

export class TaskRunner {
  private basePath: string;
  private todoDir: string;
  private doneDir: string;
  private alertDir: string;

  constructor(basePath = './tasks') {
    this.basePath = basePath;
    this.todoDir = path.join(basePath, 'todo');
    this.doneDir = path.join(basePath, 'done');
    this.alertDir = path.join(basePath, 'alert');
  }

  async ensureDirectories(): Promise<void> {
    await fs.mkdir(this.todoDir, { recursive: true });
    await fs.mkdir(this.doneDir, { recursive: true });
    await fs.mkdir(this.alertDir, { recursive: true });
  }

  async getTodoFiles(): Promise<string[]> {
    try {
      const files = await fs.readdir(this.todoDir);
      return files
        .filter((file) => file.endsWith('.md'))
        .sort()
        .map((file) => path.join(this.todoDir, file));
    } catch (error) {
      return [];
    }
  }

  async parseTodoFile(filePath: string): Promise<TodoFile> {
    const content = await fs.readFile(filePath, 'utf-8');
    const lines = content.split('\n');
    const todos: TodoItem[] = [];
    let frontmatter: Record<string, any> | undefined;

    // Parse frontmatter if exists
    if (lines[0]?.trim() === '---') {
      const endIndex = lines.findIndex((line, i) => i > 0 && line.trim() === '---');
      if (endIndex > 0) {
        const yamlContent = lines.slice(1, endIndex).join('\n');
        try {
          frontmatter = this.parseYaml(yamlContent);
        } catch (error) {
          console.warn('Failed to parse frontmatter:', error);
        }
      }
    }

    // Parse TODO items
    lines.forEach((line, lineIndex) => {
      const todoMatch = line.match(/^(\s*)-\s+\[([ x>])\]\s+(.+)$/);
      if (todoMatch) {
        const [, , status, text] = todoMatch;
        todos.push({
          index: todos.length,
          completed: status === 'x',
          text: text.trim(),
          line: lineIndex,
        });
      }
    });

    return {
      path: filePath,
      filename: path.basename(filePath),
      content,
      todos,
      frontmatter,
    };
  }

  private parseYaml(yamlContent: string): Record<string, any> {
    // Simple YAML parser for basic key-value pairs
    const result: Record<string, any> = {};
    const lines = yamlContent.split('\n');

    for (const line of lines) {
      const match = line.match(/^(\w+):\s*(.+)$/);
      if (match) {
        const [, key, value] = match;
        // Handle arrays
        if (value.startsWith('[') && value.endsWith(']')) {
          result[key] = value
            .slice(1, -1)
            .split(',')
            .map((v) => v.trim().replace(/['"]/g, ''));
        } else {
          result[key] = value.replace(/['"]/g, '');
        }
      }
    }

    return result;
  }

  async getNextIncompleteTask(): Promise<{ file: TodoFile; task: TodoItem } | null> {
    const todoFiles = await this.getTodoFiles();

    for (const filePath of todoFiles) {
      const todoFile = await this.parseTodoFile(filePath);
      const incompleteTask = todoFile.todos.find((todo) => !todo.completed);

      if (incompleteTask) {
        return { file: todoFile, task: incompleteTask };
      }
    }

    return null;
  }

  async markTaskCompleted(filePath: string, taskIndex: number): Promise<void> {
    const content = await fs.readFile(filePath, 'utf-8');
    const lines = content.split('\n');
    let todoIndex = 0;

    for (let i = 0; i < lines.length; i++) {
      const todoMatch = lines[i].match(/^(\s*)-\s+\[([ x>])\]\s+(.+)$/);
      if (todoMatch) {
        if (todoIndex === taskIndex) {
          const [, indent, , text] = todoMatch;
          lines[i] = `${indent}- [x] ${text}`;
          break;
        }
        todoIndex++;
      }
    }

    await fs.writeFile(filePath, lines.join('\n'), 'utf-8');
  }

  async areAllTasksCompleted(filePath: string): Promise<boolean> {
    const todoFile = await this.parseTodoFile(filePath);
    return todoFile.todos.length > 0 && todoFile.todos.every((todo) => todo.completed);
  }

  async moveToCompleted(filePath: string): Promise<string> {
    const filename = path.basename(filePath, '.md');
    const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const newFilename = `${filename}__DONE_${timestamp}.md`;
    const newPath = path.join(this.doneDir, newFilename);

    await fs.rename(filePath, newPath);
    return newPath;
  }

  async moveToAlert(filePath: string, reason: string): Promise<string> {
    const filename = path.basename(filePath, '.md');
    const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const newFilename = `${filename}__ALERT_${timestamp}.md`;
    const newPath = path.join(this.alertDir, newFilename);

    // Add failure reason to the file
    const content = await fs.readFile(filePath, 'utf-8');
    const updatedContent = `${content}\n\n---\n\n**실패 원인:** ${reason}\n**이동 시간:** ${new Date().toISOString()}`;

    await fs.writeFile(newPath, updatedContent, 'utf-8');
    await fs.unlink(filePath);
    return newPath;
  }

  async commitChanges(message: string): Promise<void> {
    try {
      execSync('git add .', { cwd: this.basePath });
      execSync(`git commit -m "${message}"`, { cwd: this.basePath });
      console.warn(`✅ Committed: ${message}`);
    } catch (error) {
      console.warn('Git commit failed:', error);
    }
  }

  async runFormatter(): Promise<void> {
    try {
      // Try common formatters
      const formatters = ['pnpm format', 'npm run format', 'yarn format'];

      for (const formatter of formatters) {
        try {
          execSync(formatter, { cwd: this.basePath });
          console.warn(`✅ Ran formatter: ${formatter}`);
          return;
        } catch (error) {
          continue;
        }
      }

      console.warn('⚠️ No formatter found, skipping');
    } catch (error) {
      console.warn('Formatter failed:', error);
    }
  }

  async processNextTask(): Promise<boolean> {
    const nextTask = await this.getNextIncompleteTask();

    if (!nextTask) {
      console.warn('🎉 No incomplete tasks found!');
      return false;
    }

    const { file, task } = nextTask;
    console.warn(`📋 Processing: ${file.filename}`);
    console.warn(`🔨 Task: ${task.text}`);

    // This is where the actual task processing would happen
    // For now, we'll just mark it as a template
    console.warn('⚠️ Task processing logic needs to be implemented');
    console.warn('👨‍💻 Manual intervention required for task completion');

    return true;
  }

  async processAlertFiles(): Promise<void> {
    try {
      const alertFiles = await fs.readdir(this.alertDir);
      const mdFiles = alertFiles.filter((file) => file.endsWith('.md'));

      for (const alertFile of mdFiles) {
        const alertPath = path.join(this.alertDir, alertFile);
        console.warn(`🚨 Processing alert: ${alertFile}`);

        // Convert alert to TODO task
        await this.convertAlertToTodo(alertPath);
      }
    } catch (error) {
      console.warn('Failed to process alert files:', error);
    }
  }

  private async convertAlertToTodo(alertPath: string): Promise<void> {
    const content = await fs.readFile(alertPath, 'utf-8');
    const alertFilename = path.basename(alertPath, '.md');

    // Create TODO file from alert
    const todoContent = `---
source: alert
severity: high
alert_id: ${alertFilename}
tags: [monitoring, alert]
---

# 🚨 Alert Conversion: ${alertFilename}

## ✏️ Analysis

Alert converted from: ${alertPath}

## 📋 Tasks

- [ ] Immediate mitigation
- [ ] Root cause analysis
- [ ] Implement fix
- [ ] Add monitoring
- [ ] Update documentation

## 📝 Original Alert Content

${content}
`;

    const todoPath = path.join(this.todoDir, `alert_${alertFilename}_${Date.now()}.md`);
    await fs.writeFile(todoPath, todoContent, 'utf-8');

    // Mark original alert as converted
    const updatedContent = `${content}\n\n---\n\nstatus: converted\nnew_file: ${todoPath}\nconverted_at: ${new Date().toISOString()}`;

    const doneAlertPath = path.join(this.doneDir, 'alert', path.basename(alertPath));
    await fs.mkdir(path.dirname(doneAlertPath), { recursive: true });
    await fs.writeFile(doneAlertPath, updatedContent, 'utf-8');
    await fs.unlink(alertPath);

    console.warn(`✅ Converted alert to TODO: ${todoPath}`);
  }
}
