import { describe, it, expect, beforeEach } from 'vitest';
import { FortuneService, FortuneSettings } from './fortune-service';

describe('FortuneService', () => {
  let fortuneService: FortuneService;
  let mockSettings: FortuneSettings;

  beforeEach(() => {
    fortuneService = new FortuneService();
    mockSettings = {
      enabled: true,
      language: 'kr',
    };
  });

  describe('Fortune generation', () => {
    it('should generate fortune data with all required fields', () => {
      const fortune = fortuneService.getFortune(mockSettings);
      
      expect(fortune).toHaveProperty('general');
      expect(fortune).toHaveProperty('love');
      expect(fortune).toHaveProperty('work');
      expect(fortune).toHaveProperty('health');
      expect(fortune).toHaveProperty('lucky');
      expect(fortune).toHaveProperty('warning');
      
      expect(fortune.lucky).toHaveProperty('number');
      expect(fortune.lucky).toHaveProperty('color');
      expect(fortune.lucky).toHaveProperty('item');
      
      expect(typeof fortune.general).toBe('string');
      expect(typeof fortune.love).toBe('string');
      expect(typeof fortune.work).toBe('string');
      expect(typeof fortune.health).toBe('string');
      expect(typeof fortune.warning).toBe('string');
      expect(typeof fortune.lucky.number).toBe('number');
      expect(typeof fortune.lucky.color).toBe('string');
      expect(typeof fortune.lucky.item).toBe('string');
    });

    it('should generate consistent fortune for the same day', () => {
      const fortune1 = fortuneService.getFortune(mockSettings);
      const fortune2 = fortuneService.getFortune(mockSettings);
      
      expect(fortune1).toEqual(fortune2);
    });

    it('should generate Korean fortune text when language is kr', () => {
      const koreanSettings: FortuneSettings = {
        enabled: true,
        language: 'kr',
      };
      
      const fortune = fortuneService.getFortune(koreanSettings);
      
      // Check that Korean text is generated (contains Korean characters)
      expect(fortune.general).toMatch(/[가-힣]/);
      expect(fortune.love).toMatch(/[가-힣]/);
      expect(fortune.work).toMatch(/[가-힣]/);
      expect(fortune.health).toMatch(/[가-힣]/);
      expect(fortune.warning).toMatch(/[가-힣]/);
      expect(fortune.lucky.color).toMatch(/[가-힣]/);
      expect(fortune.lucky.item).toMatch(/[가-힣]/);
    });

    it('should generate English fortune text when language is en', () => {
      const englishSettings: FortuneSettings = {
        enabled: true,
        language: 'en',
      };
      
      const fortune = fortuneService.getFortune(englishSettings);
      
      // Check that English text is generated (no Korean characters)
      expect(fortune.general).not.toMatch(/[가-힣]/);
      expect(fortune.love).not.toMatch(/[가-힣]/);
      expect(fortune.work).not.toMatch(/[가-힣]/);
      expect(fortune.health).not.toMatch(/[가-힣]/);
      expect(fortune.warning).not.toMatch(/[가-힣]/);
      expect(fortune.lucky.color).not.toMatch(/[가-힣]/);
      expect(fortune.lucky.item).not.toMatch(/[가-힣]/);
    });

    it('should return empty fortune when disabled', () => {
      const disabledSettings: FortuneSettings = {
        enabled: false,
        language: 'kr',
      };
      
      const fortune = fortuneService.getFortune(disabledSettings);
      
      expect(fortune.general).toBe('운세 정보 없음');
      expect(fortune.love).toBe('운세 정보 없음');
      expect(fortune.work).toBe('운세 정보 없음');
      expect(fortune.health).toBe('운세 정보 없음');
      expect(fortune.warning).toBe('운세 정보 없음');
      expect(fortune.lucky.number).toBe(0);
      expect(fortune.lucky.color).toBe('운세 정보 없음');
      expect(fortune.lucky.item).toBe('운세 정보 없음');
    });
  });

  describe('Fortune formatting', () => {
    it('should format simple fortune string in Korean', () => {
      const fortune = fortuneService.getFortune(mockSettings);
      const formatted = fortuneService.formatFortune(fortune, mockSettings);
      
      expect(formatted).toContain('🔮');
      expect(formatted).toContain(fortune.general);
    });

    it('should format simple fortune string in English', () => {
      const englishSettings: FortuneSettings = {
        enabled: true,
        language: 'en',
      };
      
      const fortune = fortuneService.getFortune(englishSettings);
      const formatted = fortuneService.formatFortune(fortune, englishSettings);
      
      expect(formatted).toContain('🔮');
      expect(formatted).toContain(fortune.general);
    });

    it('should format detailed fortune with all sections in Korean', () => {
      const fortune = fortuneService.getFortune(mockSettings);
      const detailed = fortuneService.formatDetailedFortune(fortune, mockSettings);
      
      expect(detailed).toContain('🔮');
      expect(detailed).toContain('오늘의 운세');
      expect(detailed).toContain('💫 종합운');
      expect(detailed).toContain('💕 연애운');
      expect(detailed).toContain('💼 직장운');
      expect(detailed).toContain('🏥 건강운');
      expect(detailed).toContain('🍀 행운의 키워드');
      expect(detailed).toContain('⚠️ 주의사항');
      expect(detailed).toContain(fortune.general);
      expect(detailed).toContain(fortune.love);
      expect(detailed).toContain(fortune.work);
      expect(detailed).toContain(fortune.health);
      expect(detailed).toContain(fortune.warning);
      expect(detailed).toContain(fortune.lucky.number.toString());
      expect(detailed).toContain(fortune.lucky.color);
      expect(detailed).toContain(fortune.lucky.item);
    });

    it('should format detailed fortune with all sections in English', () => {
      const englishSettings: FortuneSettings = {
        enabled: true,
        language: 'en',
      };
      
      const fortune = fortuneService.getFortune(englishSettings);
      const detailed = fortuneService.formatDetailedFortune(fortune, englishSettings);
      
      expect(detailed).toContain('🔮');
      expect(detailed).toContain("Today's Fortune");
      expect(detailed).toContain('💫 General');
      expect(detailed).toContain('💕 Love');
      expect(detailed).toContain('💼 Career');
      expect(detailed).toContain('🏥 Health');
      expect(detailed).toContain('🍀 Lucky Keywords');
      expect(detailed).toContain('⚠️ Warning');
      expect(detailed).toContain(fortune.general);
      expect(detailed).toContain(fortune.love);
      expect(detailed).toContain(fortune.work);
      expect(detailed).toContain(fortune.health);
      expect(detailed).toContain(fortune.warning);
      expect(detailed).toContain(fortune.lucky.number.toString());
      expect(detailed).toContain(fortune.lucky.color);
      expect(detailed).toContain(fortune.lucky.item);
    });

    it('should return fallback message when disabled', () => {
      const disabledSettings: FortuneSettings = {
        enabled: false,
        language: 'kr',
      };
      
      const fortune = fortuneService.getFortune(disabledSettings);
      const formatted = fortuneService.formatFortune(fortune, disabledSettings);
      const detailed = fortuneService.formatDetailedFortune(fortune, disabledSettings);
      
      expect(formatted).toBe('운세 정보 없음');
      expect(detailed).toBe('운세 정보 없음');
    });

    it('should return English fallback message when disabled with English language', () => {
      const disabledEnglishSettings: FortuneSettings = {
        enabled: false,
        language: 'en',
      };
      
      const fortune = fortuneService.getFortune(disabledEnglishSettings);
      const formatted = fortuneService.formatFortune(fortune, disabledEnglishSettings);
      const detailed = fortuneService.formatDetailedFortune(fortune, disabledEnglishSettings);
      
      expect(formatted).toBe('Fortune unavailable');
      expect(detailed).toBe('Fortune unavailable');
    });
  });

  describe('Lucky number generation', () => {
    it('should generate valid lucky numbers', () => {
      const fortune = fortuneService.getFortune(mockSettings);
      const validNumbers = [1, 3, 7, 9, 13, 21, 27, 33, 42, 88];
      
      expect(validNumbers).toContain(fortune.lucky.number);
    });
  });

  describe('Color and item generation', () => {
    it('should generate valid Korean colors and items', () => {
      const koreanSettings: FortuneSettings = {
        enabled: true,
        language: 'kr',
      };
      
      const fortune = fortuneService.getFortune(koreanSettings);
      
      expect(fortune.lucky.color).toMatch(/[가-힣]/);
      expect(fortune.lucky.item).toMatch(/[가-힣]/);
    });

    it('should generate valid English colors and items', () => {
      const englishSettings: FortuneSettings = {
        enabled: true,
        language: 'en',
      };
      
      const fortune = fortuneService.getFortune(englishSettings);
      
      expect(fortune.lucky.color).not.toMatch(/[가-힣]/);
      expect(fortune.lucky.item).not.toMatch(/[가-힣]/);
    });
  });
});