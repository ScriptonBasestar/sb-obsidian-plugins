import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TemplateEngine } from './template-engine';
import { TemplateParser } from './template-parser';
import { WeatherSettings } from './weather-service';
import { FortuneSettings } from './fortune-service';

describe('TemplateEngine', () => {
  let engine: TemplateEngine;

  beforeEach(() => {
    engine = new TemplateEngine();
  });

  describe('Basic rendering', () => {
    it('should render built-in date variables', async () => {
      const result = await engine.renderTemplateString('Today is {{date}}');

      expect(result).toMatch(/Today is \d{4}-\d{2}-\d{2}/);
    });

    it('should render time variables', () => {
      const result = engine.renderTemplateString('Current time: {{time}}');

      expect(result).toMatch(/Current time: \d{2}:\d{2}/);
    });

    it('should render Korean date variables', () => {
      const dateResult = engine.renderTemplateString('오늘은 {{날짜}}입니다');
      expect(dateResult).toMatch(/오늘은 \d{4}년 \d{1,2}월 \d{1,2}일입니다/);

      const dayResult = engine.renderTemplateString('오늘은 {{요일}}입니다');
      expect(dayResult).toMatch(/오늘은 (월|화|수|목|금|토|일)요일입니다/);

      const todayResult = engine.renderTemplateString('{{오늘}} {{요일}}');
      expect(todayResult).toMatch(/\d{4}년 \d{1,2}월 \d{1,2}일 (월|화|수|목|금|토|일)요일/);
    });

    it('should render user variables', () => {
      const result = engine.renderTemplateString('Hello {{name}}!', { name: 'World' });

      expect(result).toBe('Hello World!');
    });

    it('should combine built-in and user variables', () => {
      const template = 'Meeting on {{date}} with {{attendee}}';
      const result = engine.renderTemplateString(template, { attendee: 'John' });

      expect(result).toMatch(/Meeting on \d{4}-\d{2}-\d{2} with John/);
    });
  });

  describe('Handlebars helpers', () => {
    it('should format dates with formatDate helper', () => {
      const now = new Date();
      const template = '{{formatDate myDate "YYYY-MM-DD"}}';
      const result = engine.renderTemplateString(template, { myDate: now });

      expect(result).toMatch(/\d{4}-\d{2}-\d{2}/);
    });

    it('should format time with formatTime helper', () => {
      const now = new Date();
      const template = '{{formatTime myDate "24"}}';
      const result = engine.renderTemplateString(template, { myDate: now });

      expect(result).toMatch(/\d{2}:\d{2}/);
    });

    it('should uppercase text', () => {
      const template = '{{uppercase title}}';
      const result = engine.renderTemplateString(template, { title: 'hello world' });

      expect(result).toBe('HELLO WORLD');
    });

    it('should lowercase text', () => {
      const template = '{{lowercase title}}';
      const result = engine.renderTemplateString(template, { title: 'HELLO WORLD' });

      expect(result).toBe('hello world');
    });

    it('should capitalize text', () => {
      const template = '{{capitalize title}}';
      const result = engine.renderTemplateString(template, { title: 'hello world' });

      expect(result).toBe('Hello world');
    });

    it('should perform math operations', () => {
      const addTemplate = '{{add count 5}}';
      const addResult = engine.renderTemplateString(addTemplate, { count: 3 });
      expect(addResult).toBe('8');

      const subtractTemplate = '{{subtract total discount}}';
      const subtractResult = engine.renderTemplateString(subtractTemplate, {
        total: 100,
        discount: 15,
      });
      expect(subtractResult).toBe('85');
    });

    it('should format Korean dates with helpers', () => {
      const testDate = new Date('2025-01-15');

      const koreanDateTemplate = '{{koreanDate myDate}}';
      const koreanDateResult = engine.renderTemplateString(koreanDateTemplate, {
        myDate: testDate,
      });
      expect(koreanDateResult).toBe('2025년 1월 15일');

      const koreanDayTemplate = '{{koreanDay myDate}}';
      const koreanDayResult = engine.renderTemplateString(koreanDayTemplate, { myDate: testDate });
      expect(koreanDayResult).toBe('수요일');

      const koreanDateTimeTemplate = '{{koreanDateTime myDate}}';
      const koreanDateTimeResult = engine.renderTemplateString(koreanDateTimeTemplate, {
        myDate: testDate,
      });
      expect(koreanDateTimeResult).toMatch(/2025년 1월 15일 수요일 오전 \d{2}:\d{2}/);
    });

    it('should handle conditional rendering with if_eq', () => {
      const template =
        '{{#if_eq status "active"}}Status is active{{else}}Status is not active{{/if_eq}}';

      const activeResult = engine.renderTemplateString(template, { status: 'active' });
      expect(activeResult).toBe('Status is active');

      const inactiveResult = engine.renderTemplateString(template, { status: 'inactive' });
      expect(inactiveResult).toBe('Status is not active');
    });
  });

  describe('Template validation', () => {
    it('should validate correct templates', () => {
      const template = 'Hello {{name}}, today is {{date}}';
      const validation = engine.validateTemplate(template);

      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should detect mismatched braces', () => {
      const template = 'Hello {{name}, today is {{date}}';
      const validation = engine.validateTemplate(template);

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Mismatched template braces {{ }}');
    });

    it('should detect handlebars syntax errors', () => {
      const template = 'Hello {{#if name}}{{/if';
      const validation = engine.validateTemplate(template);

      expect(validation.isValid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });

    it('should warn about triple braces', () => {
      const template = 'Content: {{{rawHtml}}}';
      const validation = engine.validateTemplate(template);

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain(
        'Triple braces {{{ }}} found - use with caution for unescaped HTML'
      );
    });
  });

  describe('Template rendering with ParsedTemplate', () => {
    it('should render parsed template correctly', async () => {
      const content = `---
title: Test Template
---
# {{title}}

Created on {{date}} by {{author}}`;

      const parsedTemplate = TemplateParser.parseTemplate('test', content, 'test.md');
      const result = await engine.renderTemplate(parsedTemplate, {
        title: 'My Note',
        author: 'John Doe',
      });

      expect(result).toMatch(/# My Note/);
      expect(result).toMatch(/Created on \d{4}-\d{2}-\d{2} by John Doe/);
      expect(result).toContain('title: Test Template');
    });
  });

  describe('Preview rendering', () => {
    it('should generate template preview with sample data', async () => {
      const content = `# {{title}}

Meeting with {{attendee}} on {{date}}`;

      const parsedTemplate = TemplateParser.parseTemplate('meeting', content, 'meeting.md');
      const preview = await engine.previewTemplate(parsedTemplate);

      expect(preview).toContain('# [Title]');
      expect(preview).toMatch(/Meeting with .* on \d{4}-\d{2}-\d{2}/);
    });

    it('should truncate long previews', async () => {
      const longContent = 'A'.repeat(200) + ' {{title}}';
      const parsedTemplate = TemplateParser.parseTemplate('long', longContent, 'long.md');
      const preview = await engine.previewTemplate(parsedTemplate);

      expect(preview.length).toBeLessThanOrEqual(153); // 150 + '...'
      expect(preview).toMatch(/\.\.\.$/);
    });

    it('should handle preview errors gracefully', async () => {
      const invalidContent = 'Hello {{#invalid syntax}}';
      const parsedTemplate = TemplateParser.parseTemplate('invalid', invalidContent, 'invalid.md');
      const preview = await engine.previewTemplate(parsedTemplate);

      // Should fallback to truncated original content
      expect(preview).toBe('Hello {{#invalid syntax}}');
    });
  });

  describe('Available variables and helpers', () => {
    it('should list available variables', () => {
      const variables = engine.getAvailableVariables();

      // English variables
      expect(variables).toContain('date');
      expect(variables).toContain('time');
      expect(variables).toContain('title');
      expect(variables).toContain('author');
      expect(variables).toContain('today');
      expect(variables).toContain('tomorrow');
      expect(variables).toContain('yesterday');

      // Korean variables
      expect(variables).toContain('날짜');
      expect(variables).toContain('오늘');
      expect(variables).toContain('내일');
      expect(variables).toContain('어제');
      expect(variables).toContain('요일');
    });

    it('should list available helpers', () => {
      const helpers = engine.getAvailableHelpers();

      // English helpers
      expect(helpers).toContain('formatDate');
      expect(helpers).toContain('formatTime');
      expect(helpers).toContain('uppercase');
      expect(helpers).toContain('lowercase');
      expect(helpers).toContain('capitalize');
      expect(helpers).toContain('if_eq');
      expect(helpers).toContain('add');
      expect(helpers).toContain('subtract');

      // Korean helpers
      expect(helpers).toContain('koreanDate');
      expect(helpers).toContain('koreanDay');
      expect(helpers).toContain('koreanDateTime');
    });
  });

  describe('Error handling', () => {
    it('should handle missing variables gracefully', () => {
      const template = 'Hello {{undefinedVariable}}';
      const result = engine.renderTemplateString(template);

      // Handlebars renders undefined variables as empty string
      expect(result).toBe('Hello ');
    });

    it('should handle template rendering gracefully', () => {
      const template = 'Hello {{#each items}}{{name}}{{/each}}';

      // Should not throw with valid template and data
      expect(() => {
        engine.renderTemplateString(template, { items: [{ name: 'test' }] });
      }).not.toThrow();

      const result = engine.renderTemplateString(template, { items: [{ name: 'test' }] });
      expect(result).toBe('Hello test');
    });
  });

  describe('Weather integration', () => {
    it('should include weather variables in available variables list', () => {
      const variables = engine.getAvailableVariables();

      expect(variables).toContain('날씨');
      expect(variables).toContain('weather');
    });

    it('should include fortune variables in available variables list', () => {
      const variables = engine.getAvailableVariables();

      expect(variables).toContain('운세');
      expect(variables).toContain('fortune');
    });

    it('should include weather helpers in available helpers list', () => {
      const helpers = engine.getAvailableHelpers();

      expect(helpers).toContain('weatherSimple');
      expect(helpers).toContain('weatherDetailed');
    });

    it('should include fortune helpers in available helpers list', () => {
      const helpers = engine.getAvailableHelpers();

      expect(helpers).toContain('fortuneSimple');
      expect(helpers).toContain('fortuneDetailed');
    });

    it('should show fallback message when weather settings are not configured', async () => {
      const engineWithoutWeather = new TemplateEngine();
      const result = await engineWithoutWeather.renderTemplateString('오늘 날씨: {{날씨}}');

      expect(result).toBe('오늘 날씨: 날씨 정보 없음');
    });

    it('should show fallback message when weather is disabled', async () => {
      const weatherSettings: WeatherSettings = {
        apiKey: 'test-key',
        location: 'Seoul,KR',
        unit: 'metric',
        language: 'kr',
        weatherEnabled: false,
      };

      const engineWithDisabledWeather = new TemplateEngine(weatherSettings);
      const result = await engineWithDisabledWeather.renderTemplateString('오늘 날씨: {{날씨}}');

      expect(result).toBe('오늘 날씨: 날씨 정보 없음');
    });

    it('should update weather settings dynamically', () => {
      const initialSettings: WeatherSettings = {
        apiKey: 'test-key-1',
        location: 'Seoul,KR',
        unit: 'metric',
        language: 'kr',
        weatherEnabled: true,
      };

      const engineWithWeather = new TemplateEngine(initialSettings);

      const updatedSettings: WeatherSettings = {
        apiKey: 'test-key-2',
        location: 'Tokyo,JP',
        unit: 'imperial',
        language: 'ja',
        weatherEnabled: false,
      };

      // Should not throw when updating settings
      expect(() => {
        engineWithWeather.updateWeatherSettings(updatedSettings);
      }).not.toThrow();
    });

    it('should handle weather service errors gracefully', async () => {
      // Mock weather settings that will cause API failure
      const weatherSettings: WeatherSettings = {
        apiKey: 'invalid-key',
        location: 'Invalid,Location',
        unit: 'metric',
        language: 'kr',
        weatherEnabled: true,
      };

      const engineWithBadWeather = new TemplateEngine(weatherSettings);

      // Mock console.warn to avoid test output noise
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      try {
        const result = await engineWithBadWeather.renderTemplateString('날씨: {{날씨}}');

        // Should show error message instead of crashing
        expect(result).toMatch(/날씨: (날씨 정보를 가져올 수 없습니다|날씨 서비스 오류)/);
        expect(consoleWarnSpy).toHaveBeenCalled();
      } finally {
        consoleWarnSpy.mockRestore();
      }
    });
  });

  describe('Fortune integration', () => {
    it('should show fallback message when fortune settings are not configured', async () => {
      const engineWithoutFortune = new TemplateEngine();
      const result = await engineWithoutFortune.renderTemplateString('오늘 운세: {{운세}}');

      expect(result).toBe('오늘 운세: 운세 정보 없음');
    });

    it('should show fallback message when fortune is disabled', async () => {
      const fortuneSettings: FortuneSettings = {
        enabled: false,
        language: 'kr',
      };

      const engineWithDisabledFortune = new TemplateEngine(undefined, fortuneSettings);
      const result = await engineWithDisabledFortune.renderTemplateString('오늘 운세: {{운세}}');

      expect(result).toBe('오늘 운세: 운세 정보 없음');
    });

    it('should generate fortune when enabled', async () => {
      const fortuneSettings: FortuneSettings = {
        enabled: true,
        language: 'kr',
      };

      const engineWithFortune = new TemplateEngine(undefined, fortuneSettings);
      const result = await engineWithFortune.renderTemplateString('오늘 운세: {{운세}}');

      expect(result).toContain('오늘 운세: 🔮');
      expect(result).not.toBe('오늘 운세: 운세 정보 없음');
    });

    it('should generate English fortune when language is en', async () => {
      const fortuneSettings: FortuneSettings = {
        enabled: true,
        language: 'en',
      };

      const engineWithEnglishFortune = new TemplateEngine(undefined, fortuneSettings);
      const result = await engineWithEnglishFortune.renderTemplateString(
        'Today fortune: {{fortune}}'
      );

      expect(result).toContain('Today fortune: 🔮');
      expect(result).not.toBe('Today fortune: Fortune unavailable');
    });

    it('should update fortune settings dynamically', () => {
      const initialSettings: FortuneSettings = {
        enabled: true,
        language: 'kr',
      };

      const engineWithFortune = new TemplateEngine(undefined, initialSettings);

      const updatedSettings: FortuneSettings = {
        enabled: false,
        language: 'en',
      };

      // Should not throw when updating settings
      expect(() => {
        engineWithFortune.updateFortuneSettings(updatedSettings);
      }).not.toThrow();
    });

    it('should provide consistent fortune for the same day', async () => {
      const fortuneSettings: FortuneSettings = {
        enabled: true,
        language: 'kr',
      };

      const engineWithFortune = new TemplateEngine(undefined, fortuneSettings);

      const result1 = await engineWithFortune.renderTemplateString('{{운세}}');
      const result2 = await engineWithFortune.renderTemplateString('{{운세}}');

      expect(result1).toBe(result2);
    });
  });
});
