# Metadata Manager for Obsidian

> 🧠 Automatically manage and lint frontmatter metadata in Obsidian documents

![Metadata Manager Demo](https://img.shields.io/badge/Obsidian-Plugin-purple) ![Version](https://img.shields.io/badge/version-1.0.0-blue) ![License](https://img.shields.io/badge/license-MIT-green)

## ✨ Features

- **🔮 Auto-Insert Frontmatter**: Automatically add metadata to new documents
- **🔍 Smart Validation**: Rule-based linting for metadata consistency
- **📋 Template System**: Folder-specific metadata templates
- **🎯 Auto-Generation**: Automatic created/modified dates and IDs
- **✨ Auto-Formatting**: Consistent field ordering and formatting
- **🛡️ Error Prevention**: Catch missing fields and type mismatches
- **⚡ Real-time Processing**: Instant validation and correction

## 🚀 Quick Start

### Installation

1. **From Obsidian Community Plugins** (Recommended)

   - Open Settings → Community Plugins
   - Search for "Metadata Manager"
   - Install and enable

2. **Manual Installation**
   - Download latest release from GitHub
   - Extract to `.obsidian/plugins/metadata-manager/`
   - Enable in Community Plugins settings

### Basic Usage

1. **Create New Document**

   - Plugin automatically detects new files
   - Inserts frontmatter based on template
   - Validates metadata structure

2. **Edit Existing Documents**

   - Real-time validation as you type
   - Auto-format on save
   - Helpful error messages

3. **Customize Templates**
   - Define metadata templates per folder
   - Set required and optional fields
   - Configure auto-generation rules

## 📖 Template System

### Default Template

```yaml
---
title:
created: { { created } }
modified: { { modified } }
tags: []
---
```

### Folder-Specific Templates

Configure different templates for different folders:

```yaml
# /daily/ folder template
---
title: Daily Note - {{date}}
created: { { created } }
modified: { { modified } }
type: daily
mood:
weather:
tags: [daily]
---
# /projects/ folder template
---
title:
created: { { created } }
modified: { { modified } }
type: project
status: planning
priority: medium
tags: [project]
due_date:
---
```

### Template Variables

- `{{created}}` - File creation timestamp
- `{{modified}}` - Last modification timestamp
- `{{date}}` - Current date (YYYY-MM-DD)
- `{{time}}` - Current time (HH:mm)
- `{{title}}` - File name without extension
- `{{folder}}` - Current folder name
- `{{vault}}` - Vault name
- `{{id}}` - Unique identifier

## 🔍 Validation Rules

### Field Types

- **string**: Text values
- **number**: Numeric values
- **boolean**: true/false values
- **date**: Date strings (YYYY-MM-DD)
- **array**: List of values
- **enum**: Predefined options

### Example Validation Config

```yaml
required_fields:
  - title (string)
  - created (date)
  - tags (array)

optional_fields:
  - status (enum: draft, review, published)
  - priority (enum: low, medium, high)
  - due_date (date)
  - archived (boolean)

field_constraints:
  title:
    min_length: 3
    max_length: 100
  tags:
    min_items: 1
    max_items: 10
  priority:
    default: medium
```

## ⚙️ Configuration

### Auto-Insert Settings

- **Enable Auto-Insert**: Automatically add frontmatter to new files
- **Insert Delay**: Delay before insertion (default: 1 second)
- **New Files Only**: Only process completely new files
- **Confirmation Modal**: Ask before inserting frontmatter

### Template Configuration

- **Default Template**: Template for files without folder-specific rules
- **Folder Templates**: Map folders to specific templates
- **Template Variables**: Configure auto-generated values

### Validation Settings

- **Required Fields**: Fields that must be present
- **Optional Fields**: Fields that are allowed but not required
- **Field Types**: Type validation for each field
- **Auto-Format**: Automatically format and sort fields

### Auto-Generation

- **Auto-Generate Created**: Add creation timestamp
- **Auto-Generate Modified**: Update modification timestamp
- **Auto-Generate ID**: Add unique identifier
- **Date Format**: Format for date fields

## 🎨 Advanced Features

### Conditional Templates

Use folder paths and file names to determine templates:

```javascript
// Template selection logic
if (folder.startsWith('daily/')) {
  return dailyTemplate;
} else if (file.name.includes('meeting')) {
  return meetingTemplate;
} else if (folder === 'projects') {
  return projectTemplate;
}
```

### Custom Validation Rules

```javascript
// Custom validation function
function validateMetadata(metadata) {
  const errors = [];

  // Custom title validation
  if (!metadata.title || metadata.title.trim() === '') {
    errors.push('Title is required');
  }

  // Date validation
  if (metadata.due_date && new Date(metadata.due_date) < new Date()) {
    errors.push('Due date cannot be in the past');
  }

  return errors;
}
```

### Batch Processing

- **Bulk Update**: Update metadata across multiple files
- **Migration**: Migrate from old metadata format to new
- **Validation Report**: Generate report of metadata issues

## 📊 Commands

Access via Command Palette (`Ctrl/Cmd + P`):

- **Metadata Manager: Insert Frontmatter** - Add metadata to current file
- **Metadata Manager: Validate Current File** - Check current file's metadata
- **Metadata Manager: Format Metadata** - Format and sort frontmatter
- **Metadata Manager: Update Modified Date** - Update modification timestamp
- **Metadata Manager: Batch Validate** - Validate all files in vault
- **Metadata Manager: Generate Report** - Create validation report

## 🔧 Integration Examples

### Daily Note Setup

```yaml
# Template for daily notes
---
title: Daily Note - {{date}}
created: { { created } }
modified: { { modified } }
type: daily
date: { { date } }
mood:
energy:
weather:
tags: [daily, { { date } }]
---
# Content starts here
## Today's Goals
- []
## Reflection
```

### Project Management

```yaml
# Template for project files
---
title:
created: { { created } }
modified: { { modified } }
type: project
status: planning
priority: medium
start_date:
due_date:
assigned_to:
tags: [project]
progress: 0
---
# Project Overview
## Goals
## Tasks
## Timeline
```

### Meeting Notes

```yaml
# Template for meeting notes
---
title: Meeting - {{date}}
created: { { created } }
modified: { { modified } }
type: meeting
date: { { date } }
attendees: []
duration:
tags: [meeting]
---
## Agenda
## Notes
## Action Items
```

## 🚨 Troubleshooting

### Common Issues

**Frontmatter not inserting?**

- ✅ Check auto-insert is enabled
- ✅ Verify file is new and empty
- ✅ Check template is valid YAML
- ✅ Review folder template mappings

**Validation errors?**

- ✅ Check required fields are present
- ✅ Verify field types match expectations
- ✅ Review YAML syntax
- ✅ Check for invisible characters

**Templates not applying?**

- ✅ Verify folder path mappings
- ✅ Check template syntax
- ✅ Ensure variables are properly formatted
- ✅ Review plugin settings

**Performance issues?**

- ✅ Reduce auto-insert delay
- ✅ Limit batch processing scope
- ✅ Disable unnecessary validations
- ✅ Check for large files

### Debug Information

Enable debug logging to troubleshoot:

1. Open Developer Console (`Ctrl/Cmd + Shift + I`)
2. Look for `[Metadata Manager]` messages
3. Check for error messages and stack traces
4. Share logs when reporting issues

## 🔒 Best Practices

### Template Design

- **Keep it simple**: Start with basic templates
- **Consistent naming**: Use consistent field names across templates
- **Required vs optional**: Clearly separate required and optional fields
- **Date formats**: Use ISO format (YYYY-MM-DD) for dates

### Field Naming

- **Use lowercase**: `created_date` instead of `Created_Date`
- **Underscores**: `due_date` instead of `due-date`
- **Descriptive**: `meeting_attendees` instead of `people`
- **Avoid spaces**: Use underscores or camelCase

### Validation Strategy

- **Start permissive**: Begin with loose validation, tighten over time
- **Gradual rollout**: Test with small subset of files first
- **User feedback**: Make validation errors clear and actionable
- **Backup important**: Always backup before bulk operations

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Obsidian](https://obsidian.md) for the amazing platform
- [js-yaml](https://github.com/nodeca/js-yaml) for YAML parsing
- [moment.js](https://momentjs.com) for date handling
- Community contributors and testers

## 📞 Support

- 🐛 **Bug Reports**: [GitHub Issues](https://github.com/sb-obsidian-plugins/obsidian-metadata-manager/issues)
- 💡 **Feature Requests**: [GitHub Discussions](https://github.com/sb-obsidian-plugins/obsidian-metadata-manager/discussions)
- 📧 **Email**: support@sb-obsidian-plugins.com

---

Made with ❤️ by [sb-obsidian-plugins](https://github.com/sb-obsidian-plugins)
