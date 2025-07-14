#!/usr/bin/env node

import { TaskRunner } from './task-runner.js';
import path from 'path';

interface CLIOptions {
  dir?: string;
  help?: boolean;
  process?: boolean;
  alerts?: boolean;
}

function parseArgs(args: string[]): CLIOptions {
  const options: CLIOptions = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else if (arg === '--dir' || arg === '-d') {
      options.dir = args[++i];
    } else if (arg === '--process' || arg === '-p') {
      options.process = true;
    } else if (arg === '--alerts' || arg === '-a') {
      options.alerts = true;
    }
  }

  return options;
}

function showHelp(): void {
  console.log(`
🚀 TASK_RUNNER.todo - Automated TODO Task Processor

Usage:
  task-runner [options]

Options:
  -d, --dir <path>     Set the tasks directory (default: ./tasks)
  -p, --process        Process the next incomplete task
  -a, --alerts         Process alert files and convert to TODOs
  -h, --help           Show this help message

Examples:
  task-runner --dir /tasks/todo --process
  task-runner --alerts
  task-runner --dir /my-project/tasks

Description:
  This tool automatically processes TODO files in the specified directory:
  1. Finds the next incomplete [ ] task
  2. Provides guidance for task completion
  3. Marks tasks as completed [x] after implementation
  4. Moves completed files to /tasks/done/ with timestamp
  5. Handles git commits with proper messages
  6. Converts alert files to actionable TODO items
`);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const options = parseArgs(args);

  if (options.help) {
    showHelp();
    return;
  }

  const taskDir = options.dir || './tasks';
  const runner = new TaskRunner(taskDir);

  try {
    await runner.ensureDirectories();

    if (options.alerts) {
      console.log('🚨 Processing alert files...');
      await runner.processAlertFiles();
      return;
    }

    if (options.process) {
      console.log('📋 Processing next task...');
      const hasTask = await runner.processNextTask();

      if (!hasTask) {
        console.log('✅ All tasks completed!');
      }
      return;
    }

    // Default behavior: show next task
    const nextTask = await runner.getNextIncompleteTask();

    if (!nextTask) {
      console.log('🎉 No incomplete tasks found!');
      console.log('📁 Checking for alert files...');
      await runner.processAlertFiles();
      return;
    }

    const { file, task } = nextTask;
    console.log(`📋 Next task in ${file.filename}:`);
    console.log(`🔨 ${task.text}`);
    console.log('');
    console.log('💡 Use --process to start working on this task');
    console.log('💡 Use --alerts to process alert files');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { main, parseArgs, showHelp };
