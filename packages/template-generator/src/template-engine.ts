import * as Handlebars from 'handlebars';
import { ParsedTemplate } from './template-parser';
import { WeatherService, WeatherSettings } from './weather-service';
import { FortuneService, FortuneSettings } from './fortune-service';

export interface TemplateVariables {
  [key: string]: any;
}

export interface TemplateContext {
  // Built-in variables
  date: string;
  time: string;
  datetime: string;
  today: string;
  tomorrow: string;
  yesterday: string;
  
  // Korean date variables
  날짜: string;
  오늘: string;
  내일: string;
  어제: string;
  요일: string;
  
  // Weather variables
  날씨: string;
  weather: string;
  
  // Fortune variables
  운세: string;
  fortune: string;
  
  // User-provided variables
  title?: string;
  author?: string;
  
  // Custom variables
  [key: string]: any;
}

export class TemplateEngine {
  private handlebars: typeof Handlebars;
  private weatherService: WeatherService;
  private fortuneService: FortuneService;
  private weatherSettings?: WeatherSettings;
  private fortuneSettings?: FortuneSettings;

  constructor(weatherSettings?: WeatherSettings, fortuneSettings?: FortuneSettings) {
    this.handlebars = Handlebars.create();
    this.weatherService = new WeatherService();
    this.fortuneService = new FortuneService();
    this.weatherSettings = weatherSettings;
    this.fortuneSettings = fortuneSettings;
    this.registerHelpers();
  }

  private registerHelpers(): void {
    // Date formatting helpers
    this.handlebars.registerHelper('formatDate', (date: Date | string, format: string) => {
      let dateObj: Date;
      if (!date) {
        dateObj = new Date();
      } else if (typeof date === 'string') {
        dateObj = new Date(date);
      } else {
        dateObj = date;
      }
      
      switch (format) {
        case 'YYYY-MM-DD':
          return dateObj.toISOString().split('T')[0];
        case 'MM/DD/YYYY':
          return dateObj.toLocaleDateString('en-US');
        case 'DD/MM/YYYY':
          return dateObj.toLocaleDateString('en-GB');
        case 'MMMM DD, YYYY':
          return dateObj.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          });
        default:
          return dateObj.toLocaleDateString();
      }
    });

    // Time formatting helpers
    this.handlebars.registerHelper('formatTime', (date: Date | string, format: string) => {
      let dateObj: Date;
      if (!date) {
        dateObj = new Date();
      } else if (typeof date === 'string') {
        dateObj = new Date(date);
      } else {
        dateObj = date;
      }
      
      switch (format) {
        case '24':
          return dateObj.toLocaleTimeString('en-GB', { 
            hour: '2-digit', 
            minute: '2-digit' 
          });
        case '12':
          return dateObj.toLocaleTimeString('en-US', { 
            hour: 'numeric', 
            minute: '2-digit' 
          });
        default:
          return dateObj.toLocaleTimeString();
      }
    });

    // String manipulation helpers
    this.handlebars.registerHelper('uppercase', (str: string) => {
      return str ? str.toUpperCase() : '';
    });

    this.handlebars.registerHelper('lowercase', (str: string) => {
      return str ? str.toLowerCase() : '';
    });

    this.handlebars.registerHelper('capitalize', (str: string) => {
      return str ? str.charAt(0).toUpperCase() + str.slice(1).toLowerCase() : '';
    });

    // Conditional helpers
    this.handlebars.registerHelper('if_eq', function(a: any, b: any, options: any) {
      if (a === b) {
        return options.fn(this);
      }
      return options.inverse(this);
    });

    // Math helpers
    this.handlebars.registerHelper('add', (a: number, b: number) => {
      return (a || 0) + (b || 0);
    });

    this.handlebars.registerHelper('subtract', (a: number, b: number) => {
      return (a || 0) - (b || 0);
    });

    // Korean date helpers
    this.handlebars.registerHelper('koreanDate', (date?: Date | string) => {
      const dateObj = date ? (typeof date === 'string' ? new Date(date) : date) : new Date();
      return this.formatKoreanDate(dateObj);
    });

    this.handlebars.registerHelper('koreanDay', (date?: Date | string) => {
      const dateObj = date ? (typeof date === 'string' ? new Date(date) : date) : new Date();
      return this.formatKoreanDay(dateObj);
    });

    this.handlebars.registerHelper('koreanDateTime', (date?: Date | string) => {
      const dateObj = date ? (typeof date === 'string' ? new Date(date) : date) : new Date();
      return this.formatKoreanDateTime(dateObj);
    });

    // Weather helpers
    this.handlebars.registerHelper('weatherSimple', async () => {
      if (!this.weatherSettings) return '날씨 정보 없음';
      const weather = await this.weatherService.getWeather(this.weatherSettings);
      return weather ? this.weatherService.formatWeatherString(weather, this.weatherSettings) : '날씨 정보를 가져올 수 없습니다';
    });

    this.handlebars.registerHelper('weatherDetailed', async () => {
      if (!this.weatherSettings) return '날씨 정보 없음';
      const weather = await this.weatherService.getWeather(this.weatherSettings);
      return weather ? this.weatherService.formatDetailedWeather(weather, this.weatherSettings) : '날씨 정보를 가져올 수 없습니다';
    });

    // Fortune helpers
    this.handlebars.registerHelper('fortuneSimple', () => {
      if (!this.fortuneSettings) return '운세 정보 없음';
      const fortune = this.fortuneService.getFortune(this.fortuneSettings);
      return this.fortuneService.formatFortune(fortune, this.fortuneSettings);
    });

    this.handlebars.registerHelper('fortuneDetailed', () => {
      if (!this.fortuneSettings) return '운세 정보 없음';
      const fortune = this.fortuneService.getFortune(this.fortuneSettings);
      return this.fortuneService.formatDetailedFortune(fortune, this.fortuneSettings);
    });
  }

  private async getDefaultContext(): Promise<TemplateContext> {
    const now = new Date();
    const today = new Date(now);
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);

    // Get weather information
    let weatherInfo = '날씨 정보 없음';
    if (this.weatherSettings && this.weatherSettings.weatherEnabled) {
      try {
        const weather = await this.weatherService.getWeather(this.weatherSettings);
        if (weather) {
          weatherInfo = this.weatherService.formatWeatherString(weather, this.weatherSettings);
        } else {
          weatherInfo = '날씨 정보를 가져올 수 없습니다';
        }
      } catch (error) {
        console.warn('Failed to fetch weather:', error);
        weatherInfo = '날씨 서비스 오류';
      }
    }

    // Get fortune information
    let fortuneInfo = '운세 정보 없음';
    if (this.fortuneSettings && this.fortuneSettings.enabled) {
      try {
        const fortune = this.fortuneService.getFortune(this.fortuneSettings);
        fortuneInfo = this.fortuneService.formatFortune(fortune, this.fortuneSettings);
      } catch (error) {
        console.warn('Failed to get fortune:', error);
        fortuneInfo = '운세 서비스 오류';
      }
    }

    return {
      // English date variables
      date: now.toISOString().split('T')[0],
      time: now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
      datetime: now.toISOString(),
      today: today.toISOString().split('T')[0],
      tomorrow: tomorrow.toISOString().split('T')[0],
      yesterday: yesterday.toISOString().split('T')[0],
      
      // Korean date variables
      날짜: this.formatKoreanDate(now),
      오늘: this.formatKoreanDate(today),
      내일: this.formatKoreanDate(tomorrow),
      어제: this.formatKoreanDate(yesterday),
      요일: this.formatKoreanDay(now),
      
      // Weather variables
      날씨: weatherInfo,
      weather: weatherInfo,
      
      // Fortune variables
      운세: fortuneInfo,
      fortune: fortuneInfo,
    };
  }

  private formatKoreanDate(date: Date): string {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    
    return `${year}년 ${month}월 ${day}일`;
  }

  private formatKoreanDay(date: Date): string {
    const days = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
    return days[date.getDay()];
  }

  private formatKoreanDateTime(date: Date): string {
    const koreanDate = this.formatKoreanDate(date);
    const koreanDay = this.formatKoreanDay(date);
    const time = date.toLocaleTimeString('ko-KR', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true
    });
    
    return `${koreanDate} ${koreanDay} ${time}`;
  }

  async renderTemplate(template: ParsedTemplate, userVariables?: TemplateVariables): Promise<string> {
    try {
      // Combine default context with user variables
      const defaultContext = await this.getDefaultContext();
      const context: TemplateContext = {
        ...defaultContext,
        ...userVariables,
      };

      // Compile and render template
      const compiledTemplate = this.handlebars.compile(template.content);
      return compiledTemplate(context);
    } catch (error) {
      console.error('Template rendering error:', error);
      throw new Error(`Failed to render template: ${error.message}`);
    }
  }

  async renderTemplateString(templateString: string, userVariables?: TemplateVariables): Promise<string> {
    try {
      const defaultContext = await this.getDefaultContext();
      const context: TemplateContext = {
        ...defaultContext,
        ...userVariables,
      };

      const compiledTemplate = this.handlebars.compile(templateString);
      return compiledTemplate(context);
    } catch (error) {
      console.error('Template string rendering error:', error);
      throw new Error(`Failed to render template string: ${error.message}`);
    }
  }

  async previewTemplate(template: ParsedTemplate, userVariables?: TemplateVariables): Promise<string> {
    try {
      // Use sample data for preview
      const defaultContext = await this.getDefaultContext();
      const previewContext: TemplateContext = {
        ...defaultContext,
        title: '[Title]',
        author: '[Author]',
        ...userVariables,
      };

      // Render only the body part for preview
      const compiledTemplate = this.handlebars.compile(template.body);
      let preview = compiledTemplate(previewContext);

      // Truncate preview
      const maxLength = 150;
      if (preview.length > maxLength) {
        preview = preview.substring(0, maxLength) + '...';
      }

      return preview.trim();
    } catch (error) {
      console.error('Template preview error:', error);
      // Fallback to original content
      return template.body.substring(0, 150) + (template.body.length > 150 ? '...' : '');
    }
  }

  validateTemplate(templateString: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    try {
      // Try to compile the template
      this.handlebars.compile(templateString);
    } catch (error) {
      errors.push(`Handlebars syntax error: ${error.message}`);
    }

    // Check for common issues
    const openBraces = (templateString.match(/\{\{/g) || []).length;
    const closeBraces = (templateString.match(/\}\}/g) || []).length;
    
    if (openBraces !== closeBraces) {
      errors.push('Mismatched template braces {{ }}');
    }

    // Check for potentially problematic patterns
    const tripleBeaces = templateString.match(/\{\{\{[^}]*\}\}\}/g);
    if (tripleBeaces && tripleBeaces.length > 0) {
      errors.push('Triple braces {{{ }}} found - use with caution for unescaped HTML');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  updateWeatherSettings(weatherSettings: WeatherSettings): void {
    this.weatherSettings = weatherSettings;
  }

  updateFortuneSettings(fortuneSettings: FortuneSettings): void {
    this.fortuneSettings = fortuneSettings;
  }

  getAvailableVariables(): string[] {
    return [
      // English variables
      'date',
      'time', 
      'datetime',
      'today',
      'tomorrow',
      'yesterday',
      'title',
      'author',
      'weather',
      'fortune',
      
      // Korean variables
      '날짜',
      '오늘',
      '내일',
      '어제',
      '요일',
      '날씨',
      '운세',
    ];
  }

  getAvailableHelpers(): string[] {
    return [
      // English helpers
      'formatDate',
      'formatTime',
      'uppercase',
      'lowercase', 
      'capitalize',
      'if_eq',
      'add',
      'subtract',
      
      // Korean helpers
      'koreanDate',
      'koreanDay',
      'koreanDateTime',
      
      // Weather helpers
      'weatherSimple',
      'weatherDetailed',
      
      // Fortune helpers
      'fortuneSimple',
      'fortuneDetailed',
    ];
  }
}