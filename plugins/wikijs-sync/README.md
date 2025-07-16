# WikiJS Sync Plugin for Obsidian

A powerful Obsidian plugin that synchronizes your notes with WikiJS, providing bidirectional sync, path mapping, and metadata conversion.

## Features

- **Bidirectional Synchronization**: Sync between Obsidian and WikiJS in both directions
- **Flexible Path Mapping**: Map Obsidian folders to WikiJS paths with custom rules
- **Metadata Conversion**: Convert Obsidian frontmatter to WikiJS metadata and vice versa
- **Conflict Resolution**: Handle conflicts with automatic or manual resolution strategies
- **Performance Optimized**: Batch processing, checksum-based change detection, and smart caching
- **Auto-sync**: Automatic synchronization on file changes with customizable intervals
- **Rich UI**: Comprehensive settings interface with connection testing and status indicators

## Installation

1. Download the plugin files to your Obsidian plugins directory
2. Enable the plugin in Obsidian settings
3. Configure your WikiJS connection settings

## Configuration

### Connection Settings

1. **WikiJS URL**: Your WikiJS instance URL (e.g., `https://wiki.example.com`)
2. **API Key**: Your WikiJS API key for authentication

### Sync Settings

- **Sync Direction**: Choose between bidirectional, Obsidian → WikiJS, or WikiJS → Obsidian
- **Conflict Resolution**: Manual, keep local, or keep remote when conflicts occur
- **Auto-sync**: Enable automatic synchronization with customizable intervals

### Path Mapping

Map Obsidian folders to WikiJS paths for better organization:

```
Obsidian Path: docs/api
WikiJS Path: /documentation/api
```

### Metadata Mapping

Configure how Obsidian frontmatter maps to WikiJS metadata:

- **Tags**: Sync Obsidian tags with optional prefix
- **Categories**: Map categories between systems
- **Custom Fields**: Define custom field mappings with type conversion

## Usage

### Manual Sync

Use the ribbon icon or command palette:
- `Sync with WikiJS`: Full synchronization
- `Push all to WikiJS`: One-way sync from Obsidian
- `Pull all from WikiJS`: One-way sync from WikiJS
- `Sync current file`: Sync only the active file

### Auto-sync

Enable auto-sync in settings to automatically sync changes:
- File changes are detected and queued for sync
- Configurable delay to avoid excessive API calls
- Status bar shows last sync time

### Context Menu

Right-click on markdown files to sync individual files directly.

## Path Normalization

The plugin automatically normalizes paths for WikiJS compatibility:

- Removes file extensions (`.md`)
- Converts spaces to hyphens
- Handles special characters
- Ensures proper WikiJS path format

## Performance Features

- **Batch Processing**: Files are processed in batches to prevent API overload
- **Checksum Caching**: Only sync files that have actually changed
- **Smart Queuing**: Prevents concurrent sync operations
- **Progress Indicators**: Real-time sync progress in notices

## Conflict Resolution

When both Obsidian and WikiJS have changes to the same file:

1. **Manual**: Add to conflicts list for manual review
2. **Keep Local**: Always use Obsidian version
3. **Keep Remote**: Always use WikiJS version

## File Exclusions

Configure which files and folders to exclude from sync:

- **Excluded Folders**: `.obsidian`, `.trash`, `templates` (default)
- **Excluded Files**: Custom file patterns

## API Reference

### Commands

- `wikijs-sync:sync`: Full sync
- `wikijs-sync:push-to-wikijs`: Push all to WikiJS
- `wikijs-sync:pull-from-wikijs`: Pull all from WikiJS
- `wikijs-sync:sync-current-file`: Sync current file
- `wikijs-sync:show-sync-status`: Show status information

### Settings

All settings are automatically saved and can be accessed via the plugin settings tab.

## Error Handling

The plugin includes comprehensive error handling:

- Connection failures are reported with retry suggestions
- Individual file sync errors don't stop the entire sync
- Detailed error logs in the console for debugging

## Status Indicators

- **Ribbon Icon**: Quick access to manual sync
- **Status Bar**: Shows last sync time and status
- **Notices**: Real-time feedback on sync operations

## Development

### Testing

Run the test suite:
```bash
npm run test
```

Tests include:
- Unit tests for all core components
- Integration tests for sync workflows
- Performance optimization tests

### Building

```bash
npm run build
```

## Troubleshooting

### Connection Issues

1. Verify WikiJS URL is correct and accessible
2. Check API key has proper permissions
3. Use the "Test Connection" button in settings

### Sync Issues

1. Check excluded files/folders settings
2. Review conflict resolution settings
3. Check console for detailed error logs
4. Clear cache if path mappings changed

### Performance Issues

1. Reduce sync interval for auto-sync
2. Use path mappings to limit sync scope
3. Check WikiJS server performance

## License

This plugin is released under the MIT License.

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Submit a pull request

## Support

For issues and questions:

1. Check the troubleshooting section
2. Review console logs for detailed errors
3. Create an issue on the project repository