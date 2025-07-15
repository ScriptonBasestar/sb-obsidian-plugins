# Publisher Scripton for Obsidian

> 🚀 Publish your Obsidian notes to scripton.cloud with ease

![Publisher Scripton Demo](https://img.shields.io/badge/Obsidian-Plugin-purple) ![Version](https://img.shields.io/badge/version-1.0.0-blue) ![License](https://img.shields.io/badge/license-MIT-green)

## ✨ Features

- **☁️ Cloud Publishing**: Seamless publishing to scripton.cloud
- **📎 Attachment Support**: Upload images and files automatically
- **🎛️ Flexible Controls**: Public, private, or unlisted publishing
- **🔄 Smart Retry**: Automatic retry on failed uploads
- **📊 Real-time Status**: Live publishing progress and feedback
- **🏷️ Tag Filtering**: Auto-publish based on tags and folders
- **🎨 Style Preservation**: Maintain formatting and custom styles
- **📝 Batch Operations**: Publish multiple notes at once

## 🚀 Quick Start

### Installation

1. **From Obsidian Community Plugins** (Recommended)
   - Open Settings → Community Plugins
   - Search for "Publisher Scripton"
   - Install and enable

2. **Manual Installation**
   - Download latest release from GitHub
   - Extract to `.obsidian/plugins/publisher-scripton/`
   - Enable in Community Plugins settings

### Basic Setup

1. **Get API Key**
   - Sign up at [scripton.cloud](https://scripton.cloud)
   - Navigate to Settings → API Keys
   - Generate new API key

2. **Configure Plugin**
   - Open Settings → Publisher Scripton
   - Enter your API key
   - Configure default visibility settings

3. **Start Publishing**
   - Right-click any note → "Publish to Scripton"
   - Or use Command Palette: "Publish Note"
   - Monitor progress in status bar

## 📖 Publishing Options

### Visibility Settings
- **Public**: Anyone can view with link
- **Private**: Only you can access
- **Unlisted**: Accessible with direct link only

### Content Processing
- **Strip Frontmatter**: Remove YAML metadata before publishing
- **Convert Wiki Links**: Transform `[[links]]` to web-friendly format
- **Preserve Formatting**: Maintain markdown styling
- **Custom CSS**: Apply custom styles to published content

### Attachment Handling
- **Auto-Upload**: Automatically upload referenced images
- **Link Preservation**: Maintain internal note links
- **File Optimization**: Optimize images for web delivery

## ⚙️ Configuration

### API Settings
- **API Key**: Your scripton.cloud authentication key
- **API Endpoint**: Service endpoint (default: https://api.scripton.cloud)
- **Timeout**: Request timeout in seconds

### Publishing Defaults
- **Default Visibility**: Public, private, or unlisted
- **Include Attachments**: Automatically upload images and files
- **Preserve Links**: Maintain internal note connections
- **Auto-Publish**: Enable automatic publishing for tagged content

### Content Processing
- **Strip Frontmatter**: Remove YAML metadata
- **Convert Wiki Links**: Transform Obsidian links
- **Custom CSS**: Apply custom styling
- **Markdown Processing**: Control markdown rendering

### Auto-Publishing
- **Enable Auto-Publish**: Automatically publish on save
- **Auto-Publish Folders**: Folders to monitor for changes
- **Auto-Publish Tags**: Tags that trigger publishing
- **Publish Delay**: Delay before auto-publishing

## 🎯 Usage Examples

### Single Note Publishing
1. Open any note in Obsidian
2. Use Command Palette (`Ctrl/Cmd + P`)
3. Search for "Publish Note to Scripton"
4. Choose visibility and options
5. Click "Publish"

### Batch Publishing
1. Use Command Palette
2. Search for "Publish Folder to Scripton"
3. Select folder to publish
4. Configure batch settings
5. Monitor progress in status bar

### Auto-Publishing Setup
```yaml
# Add to note frontmatter
---
title: My Public Note
publish: true
visibility: public
tags: [blog, public]
---

# Note content here
This note will be automatically published!
```

## 🔄 Publishing Workflow

### Manual Publishing
1. **Select Content**: Choose note or folder
2. **Configure Options**: Set visibility and processing options
3. **Review Preview**: Check how content will appear
4. **Publish**: Upload to scripton.cloud
5. **Get Link**: Receive shareable URL

### Automatic Publishing
1. **Tag Content**: Add auto-publish tags
2. **Save Note**: Plugin detects changes
3. **Auto-Process**: Applies configured settings
4. **Publish**: Uploads automatically
5. **Notification**: Confirms success

## 📊 Commands

Access via Command Palette (`Ctrl/Cmd + P`):

- **Publish Note to Scripton** - Publish current note
- **Publish Folder to Scripton** - Publish entire folder
- **Publish Selected Notes** - Publish multiple selected notes
- **Update Published Note** - Update existing publication
- **Delete Published Note** - Remove from scripton.cloud
- **View Published Notes** - List all published content
- **Copy Published Link** - Copy shareable URL to clipboard
- **Publish Status** - Show current publishing queue

## 🎨 Advanced Features

### Custom Styling
```css
/* Custom CSS for published content */
.published-note {
  font-family: 'Georgia', serif;
  line-height: 1.6;
  max-width: 800px;
  margin: 0 auto;
}

.published-note h1 {
  color: #2c3e50;
  border-bottom: 2px solid #3498db;
}

.published-note blockquote {
  border-left: 4px solid #3498db;
  padding-left: 20px;
  font-style: italic;
}
```

### Webhook Integration
```javascript
// Custom webhook for publishing events
{
  "event": "note_published",
  "note": {
    "title": "My Note",
    "url": "https://scripton.cloud/note/abc123",
    "visibility": "public",
    "published_at": "2024-01-15T10:30:00Z"
  }
}
```

### Template Processing
```markdown
<!-- Template variables available during publishing -->
{{title}} - Note title
{{date}} - Publication date
{{author}} - Author name
{{tags}} - Note tags
{{vault}} - Vault name
{{url}} - Published URL
```

## 🔧 Integration Examples

### Blog Publishing
```yaml
# Blog post template
---
title: {{title}}
author: {{author}}
date: {{date}}
visibility: public
tags: [blog]
custom_css: blog-style.css
---

# {{title}}

Published on {{date}} by {{author}}

<!-- Content here -->
```

### Documentation Publishing
```yaml
# Documentation template
---
title: {{title}}
type: documentation
visibility: unlisted
preserve_links: true
convert_wiki_links: true
---

# {{title}}

> 📚 Documentation

<!-- Content here -->
```

### Team Knowledge Base
```yaml
# Team knowledge template
---
title: {{title}}
team: development
visibility: private
tags: [knowledge-base, internal]
---

# {{title}}

**Team**: Development  
**Updated**: {{date}}

<!-- Content here -->
```

## 🚨 Troubleshooting

### Common Issues

**Publishing fails?**
- ✅ Check API key is valid and active
- ✅ Verify internet connection
- ✅ Check scripton.cloud service status
- ✅ Review error messages in console

**Attachments not uploading?**
- ✅ Verify file formats are supported
- ✅ Check file size limits
- ✅ Ensure attachment paths are correct
- ✅ Review upload permissions

**Links not working?**
- ✅ Enable "Preserve Links" option
- ✅ Check wiki link conversion settings
- ✅ Verify target notes are also published
- ✅ Review link format in published content

**Auto-publish not working?**
- ✅ Check auto-publish is enabled
- ✅ Verify folder/tag configuration
- ✅ Review publish delay settings
- ✅ Check for conflicting settings

### Debug Mode
Enable detailed logging:
1. Open Settings → Publisher Scripton
2. Enable "Detailed Logs"
3. Set log level to "debug"
4. Check Developer Console for `[Publisher Scripton]` messages

### API Limits
- **Rate Limiting**: 100 requests per minute
- **File Size**: 10MB per file
- **Daily Uploads**: 1GB per day
- **Concurrent Uploads**: 5 simultaneous uploads

## 🔒 Security & Privacy

### Data Handling
- **Secure Transmission**: All data encrypted in transit (HTTPS)
- **API Key Storage**: Stored securely in Obsidian's local storage
- **Content Privacy**: Only published content is sent to scripton.cloud
- **No Tracking**: Plugin doesn't track user behavior

### Privacy Controls
- **Selective Publishing**: Choose exactly what to publish
- **Visibility Control**: Public, private, or unlisted options
- **Content Filtering**: Strip sensitive metadata
- **Deletion Support**: Remove published content anytime

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
- [scripton.cloud](https://scripton.cloud) for the publishing service
- [axios](https://github.com/axios/axios) for HTTP requests
- Community contributors and testers

## 📞 Support

- 🐛 **Bug Reports**: [GitHub Issues](https://github.com/sb-obsidian-plugins/obsidian-publisher-scripton/issues)
- 💡 **Feature Requests**: [GitHub Discussions](https://github.com/sb-obsidian-plugins/obsidian-publisher-scripton/discussions)
- 📧 **Email**: support@sb-obsidian-plugins.com
- 🌐 **Scripton Support**: [scripton.cloud/support](https://scripton.cloud/support)

---

Made with ❤️ by [sb-obsidian-plugins](https://github.com/sb-obsidian-plugins)