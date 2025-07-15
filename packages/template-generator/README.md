# Template Generator for Obsidian

> 🎨 Dynamic template insertion with weather, fortune, and date variables for Obsidian

![Template Generator Demo](https://img.shields.io/badge/Obsidian-Plugin-purple) ![Version](https://img.shields.io/badge/version-1.0.0-blue) ![License](https://img.shields.io/badge/license-MIT-green)

## ✨ Features

- **📅 Korean Date Formatting**: Beautiful Korean date and time variables
- **🌤️ Weather Integration**: Real-time weather information via OpenWeather API
- **🔮 Daily Fortune**: Horoscope and fortune telling integration
- **🎨 Handlebars Templates**: Powerful template engine with conditional logic
- **📁 Smart Organization**: Folder-based template management
- **⚡ Quick Access**: Command palette and hotkey support
- **🎯 Template Preview**: See your templates before insertion

## 🚀 Quick Start

### Installation

1. **From Obsidian Community Plugins** (Recommended)
   - Open Settings → Community Plugins
   - Search for "Template Generator"
   - Install and enable

2. **Manual Installation**
   - Download latest release from GitHub
   - Extract to `.obsidian/plugins/template-generator/`
   - Enable in Community Plugins settings

### Basic Usage

1. Create templates in your `/templates` folder
2. Use variables like `{{날짜}}`, `{{날씨}}`, `{{운세}}`
3. Access via Command Palette: `Insert Template`
4. Enjoy dynamic content generation!

## 📖 Template Variables

### Date & Time Variables
```handlebars
{{날짜}}          # 2024년 1월 15일
{{시간}}          # 오후 3시 30분
{{date}}          # 2024-01-15
{{time}}          # 15:30
{{datetime}}      # 2024-01-15 15:30:00
```

### Weather Variables (requires API key)
```handlebars
{{날씨}}          # 맑음, 15°C
{{weather}}       # Clear, 15°C
{{temperature}}   # 15
{{humidity}}      # 65%
{{wind}}          # 5 m/s
```

### Fortune Variables
```handlebars
{{운세}}          # 오늘은 좋은 일이 생길 것입니다
{{fortune}}       # Good fortune awaits you today
{{lucky_number}}  # 7
{{lucky_color}}   # Blue
```

## 🎨 Template Examples

### Daily Journal Template
```handlebars
# 📅 {{날짜}} 일기

## 🌤️ 오늘의 날씨
{{날씨}}

## 🔮 오늘의 운세
{{운세}}

## ✍️ 오늘의 기록
<!-- 여기에 내용을 작성하세요 -->

## 📝 할 일
- [ ] 
- [ ] 
- [ ] 

---
생성일: {{datetime}}
```

### Meeting Notes Template
```handlebars
# 🤝 회의록 - {{date}}

## 📋 회의 정보
- **날짜**: {{날짜}}
- **시간**: {{시간}}
- **참석자**: 
- **장소**: 

## 📝 안건
1. 
2. 
3. 

## 💡 논의 내용


## ✅ 액션 아이템
- [ ] 
- [ ] 

## 📎 첨부파일


---
작성일: {{datetime}}
```

### Weather-Conditional Template
```handlebars
# 🌅 {{날짜}} 모닝 페이지

{{#if (eq weather "Rain")}}
☔ 비가 오는 날이네요! 실내 활동을 계획해보세요.
{{else if (eq weather "Snow")}}
❄️ 눈이 오는 날! 따뜻하게 입고 나가세요.
{{else}}
🌞 좋은 날씨네요! 야외 활동을 즐겨보세요.
{{/if}}

**현재 날씨**: {{날씨}}
**온도**: {{temperature}}°C
**습도**: {{humidity}}

## 오늘의 계획
- [ ] 
- [ ] 
- [ ] 
```

## ⚙️ Configuration

### OpenWeather API Setup
1. Get free API key from [OpenWeatherMap](https://openweathermap.org/api)
2. Go to Plugin Settings
3. Enter your API key and location
4. Save settings

### Template Directory
- Default: `/templates` folder in your vault
- Customizable in plugin settings
- Supports nested folders for organization

### Date Format Options
- Korean format: `YYYY년 M월 D일`
- International format: `YYYY-MM-DD`
- Custom formats using moment.js syntax

## 🎯 Advanced Features

### Conditional Templates
Use Handlebars conditionals for smart content:

```handlebars
{{#if (gt temperature 25)}}
🌡️ 더운 날씨입니다! 충분한 수분 섭취를 하세요.
{{else if (lt temperature 5)}}
🧊 추운 날씨입니다! 따뜻하게 입으세요.
{{else}}
🌤️ 쾌적한 날씨네요!
{{/if}}
```

### Custom Variables
Extend functionality with custom variables:

```handlebars
{{vault_name}}    # Your vault name
{{file_name}}     # Current file name
{{folder_name}}   # Current folder name
```

## 🔧 Troubleshooting

### Weather Not Working?
- ✅ Check API key is valid
- ✅ Verify location setting
- ✅ Ensure internet connection
- ✅ Check API quota limits

### Templates Not Found?
- ✅ Verify template directory path
- ✅ Check file extensions (.md)
- ✅ Refresh template cache in settings

### Variables Not Rendering?
- ✅ Check Handlebars syntax
- ✅ Verify variable names
- ✅ Check plugin is enabled

## 🛠️ Development

### Building from Source
```bash
# Clone repository
git clone https://github.com/sb-obsidian-plugins/obsidian-template-generator
cd obsidian-template-generator

# Install dependencies
npm install

# Build plugin
npm run build

# Development mode
npm run dev
```

### Testing
```bash
# Run tests
npm test

# Run with coverage
npm run test:coverage

# Lint code
npm run lint
```

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
- [OpenWeatherMap](https://openweathermap.org) for weather data
- [Handlebars.js](https://handlebarsjs.com) for template engine
- Community contributors and testers

## 📞 Support

- 🐛 **Bug Reports**: [GitHub Issues](https://github.com/sb-obsidian-plugins/obsidian-template-generator/issues)
- 💡 **Feature Requests**: [GitHub Discussions](https://github.com/sb-obsidian-plugins/obsidian-template-generator/discussions)
- 📧 **Email**: support@sb-obsidian-plugins.com

---

Made with ❤️ by [sb-obsidian-plugins](https://github.com/sb-obsidian-plugins)