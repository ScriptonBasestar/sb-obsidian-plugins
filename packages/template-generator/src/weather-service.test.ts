import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WeatherService, WeatherSettings } from './weather-service';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('WeatherService', () => {
  let weatherService: WeatherService;
  let mockSettings: WeatherSettings;

  beforeEach(() => {
    weatherService = new WeatherService();
    mockSettings = {
      apiKey: 'test-api-key',
      location: 'Seoul,KR',
      unit: 'metric',
      language: 'kr',
    };
    
    vi.clearAllMocks();
    weatherService.clearCache();
  });

  describe('API URL building', () => {
    it('should build correct URL for city name', async () => {
      const mockWeatherData = {
        main: { temp: 20, feels_like: 18, humidity: 65, pressure: 1013 },
        weather: [{ description: '맑음', icon: '01d' }],
        name: 'Seoul',
        wind: { speed: 2.5 },
        visibility: 10000,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockWeatherData),
      });

      await weatherService.getWeather(mockSettings);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.openweathermap.org/data/2.5/weather?appid=test-api-key&units=metric&lang=kr&q=Seoul%2CKR'
      );
    });

    it('should build correct URL for coordinates', async () => {
      const coordSettings = {
        ...mockSettings,
        location: '37.5665,126.9780',
      };

      const mockWeatherData = {
        main: { temp: 22, feels_like: 20, humidity: 70, pressure: 1015 },
        weather: [{ description: '구름 많음', icon: '03d' }],
        name: 'Seoul',
        wind: { speed: 1.8 },
        visibility: 8000,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockWeatherData),
      });

      await weatherService.getWeather(coordSettings);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.openweathermap.org/data/2.5/weather?appid=test-api-key&units=metric&lang=kr&lat=37.5665&lon=126.9780'
      );
    });
  });

  describe('Weather data parsing', () => {
    it('should parse weather data correctly', async () => {
      const mockApiResponse = {
        main: {
          temp: 25.3,
          feels_like: 23.8,
          humidity: 68,
          pressure: 1018,
        },
        weather: [
          {
            description: '맑음',
            icon: '01d',
          },
        ],
        name: 'Seoul',
        wind: {
          speed: 3.2,
        },
        visibility: 10000,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockApiResponse),
      });

      const result = await weatherService.getWeather(mockSettings);

      expect(result).toEqual({
        temperature: 25,
        description: '맑음',
        location: 'Seoul',
        humidity: 68,
        pressure: 1018,
        windSpeed: 3.2,
        icon: '01d',
        feelsLike: 24,
        visibility: 10,
      });
    });

    it('should handle missing wind data', async () => {
      const mockApiResponse = {
        main: { temp: 20, feels_like: 18, humidity: 60, pressure: 1015 },
        weather: [{ description: '흐림', icon: '04d' }],
        name: 'Seoul',
        // wind data missing
        visibility: 5000,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockApiResponse),
      });

      const result = await weatherService.getWeather(mockSettings);

      expect(result?.windSpeed).toBe(0);
    });
  });

  describe('Formatting', () => {
    const mockWeather = {
      temperature: 22,
      description: '맑음',
      location: 'Seoul',
      humidity: 65,
      pressure: 1013,
      windSpeed: 2.5,
      icon: '01d',
      feelsLike: 20,
      visibility: 10,
    };

    it('should format weather string in Korean', () => {
      const koreanSettings = { ...mockSettings, language: 'kr' };
      const result = weatherService.formatWeatherString(mockWeather, koreanSettings);
      
      expect(result).toBe('Seoul: 맑음, 22°C (체감 20°C)');
    });

    it('should format weather string in English', () => {
      const englishSettings = { ...mockSettings, language: 'en' };
      const result = weatherService.formatWeatherString(mockWeather, englishSettings);
      
      expect(result).toBe('Seoul: 맑음, 22°C (feels like 20°C)');
    });

    it('should format detailed weather in Korean', () => {
      const koreanSettings = { ...mockSettings, language: 'kr' };
      const result = weatherService.formatDetailedWeather(mockWeather, koreanSettings);
      
      expect(result).toContain('🌍 Seoul');
      expect(result).toContain('🌡️ 기온: 22°C (체감 20°C)');
      expect(result).toContain('☁️ 날씨: 맑음');
      expect(result).toContain('💧 습도: 65%');
      expect(result).toContain('🌬️ 바람: 2.5 m/s');
      expect(result).toContain('👁️ 가시거리: 10km');
    });

    it('should format detailed weather with imperial units', () => {
      const imperialSettings: WeatherSettings = { ...mockSettings, unit: 'imperial', language: 'en' };
      const imperialWeather = { ...mockWeather, temperature: 72, feelsLike: 68 };
      const result = weatherService.formatDetailedWeather(imperialWeather, imperialSettings);
      
      expect(result).toContain('Temperature: 72°F (feels like 68°F)');
      expect(result).toContain('Wind: 2.5 mph');
    });
  });

  describe('Caching', () => {
    it('should cache weather data', async () => {
      const mockWeatherData = {
        main: { temp: 20, feels_like: 18, humidity: 65, pressure: 1013 },
        weather: [{ description: '맑음', icon: '01d' }],
        name: 'Seoul',
        wind: { speed: 2.5 },
        visibility: 10000,
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockWeatherData),
      });

      // First call
      await weatherService.getWeather(mockSettings);
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Second call should use cache
      await weatherService.getWeather(mockSettings);
      expect(mockFetch).toHaveBeenCalledTimes(1);

      const stats = weatherService.getCacheStats();
      expect(stats.size).toBe(1);
      expect(stats.entries).toHaveLength(1);
    });

    it('should clear cache', async () => {
      const mockWeatherData = {
        main: { temp: 20, feels_like: 18, humidity: 65, pressure: 1013 },
        weather: [{ description: '맑음', icon: '01d' }],
        name: 'Seoul',
        wind: { speed: 2.5 },
        visibility: 10000,
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockWeatherData),
      });

      await weatherService.getWeather(mockSettings);
      expect(weatherService.getCacheStats().size).toBe(1);

      weatherService.clearCache();
      expect(weatherService.getCacheStats().size).toBe(0);
    });
  });

  describe('Error handling', () => {
    it('should return null when API key is missing', async () => {
      const settingsWithoutKey = { ...mockSettings, apiKey: '' };
      const result = await weatherService.getWeather(settingsWithoutKey);
      
      expect(result).toBeNull();
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should return null when location is missing', async () => {
      const settingsWithoutLocation = { ...mockSettings, location: '' };
      const result = await weatherService.getWeather(settingsWithoutLocation);
      
      expect(result).toBeNull();
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should handle API errors gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: () => Promise.resolve({ message: 'Invalid API key' }),
      });

      const result = await weatherService.getWeather(mockSettings);
      
      expect(result).toBeNull();
    });

    it('should handle network errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await weatherService.getWeather(mockSettings);
      
      expect(result).toBeNull();
    });
  });
});