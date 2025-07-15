export interface WeatherData {
  temperature: number;
  description: string;
  location: string;
  humidity: number;
  pressure: number;
  windSpeed: number;
  icon: string;
  feelsLike: number;
  visibility: number;
}

export interface WeatherSettings {
  apiKey: string;
  location: string;
  unit: 'metric' | 'imperial';
  language: string;
}

export class WeatherService {
  private readonly baseUrl = 'https://api.openweathermap.org/data/2.5/weather';
  private cache: Map<string, { data: WeatherData; timestamp: number }> = new Map();
  private readonly cacheTimeout = 10 * 60 * 1000; // 10 minutes

  async getWeather(settings: WeatherSettings): Promise<WeatherData | null> {
    if (!settings.apiKey) {
      console.warn('Weather API key not configured');
      return null;
    }

    if (!settings.location) {
      console.warn('Weather location not configured');
      return null;
    }

    // Check cache first
    const cacheKey = `${settings.location}-${settings.unit}-${settings.language}`;
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }

    try {
      const url = this.buildApiUrl(settings);
      const response = await fetch(url);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Weather API error: ${response.status} ${response.statusText} - ${errorData.message || 'Unknown error'}`);
      }

      const data = await response.json();
      const weatherData = this.parseWeatherData(data, settings);

      // Cache the result
      this.cache.set(cacheKey, {
        data: weatherData,
        timestamp: Date.now(),
      });

      return weatherData;
    } catch (error) {
      console.error('Failed to fetch weather data:', error);
      return null;
    }
  }

  private buildApiUrl(settings: WeatherSettings): string {
    const params = new URLSearchParams({
      appid: settings.apiKey,
      units: settings.unit,
      lang: settings.language,
    });

    // Handle coordinates or city name
    if (this.isCoordinates(settings.location)) {
      const [lat, lon] = settings.location.split(',');
      params.append('lat', lat.trim());
      params.append('lon', lon.trim());
    } else {
      params.append('q', settings.location);
    }

    return `${this.baseUrl}?${params.toString()}`;
  }

  private isCoordinates(location: string): boolean {
    const coords = location.split(',');
    return coords.length === 2 && 
           coords.every(coord => !isNaN(parseFloat(coord.trim())));
  }

  private parseWeatherData(data: any, settings: WeatherSettings): WeatherData {
    const tempUnit = settings.unit === 'metric' ? '°C' : '°F';
    const speedUnit = settings.unit === 'metric' ? 'm/s' : 'mph';

    return {
      temperature: Math.round(data.main.temp),
      description: data.weather[0].description,
      location: data.name,
      humidity: data.main.humidity,
      pressure: data.main.pressure,
      windSpeed: data.wind?.speed || 0,
      icon: data.weather[0].icon,
      feelsLike: Math.round(data.main.feels_like),
      visibility: data.visibility ? Math.round(data.visibility / 1000) : 0, // Convert to km
    };
  }

  formatWeatherString(weather: WeatherData, settings: WeatherSettings): string {
    const tempUnit = settings.unit === 'metric' ? '°C' : '°F';
    
    switch (settings.language) {
      case 'kr':
        return `${weather.location}: ${weather.description}, ${weather.temperature}${tempUnit} (체감 ${weather.feelsLike}${tempUnit})`;
      case 'ja':
        return `${weather.location}: ${weather.description}, ${weather.temperature}${tempUnit} (体感 ${weather.feelsLike}${tempUnit})`;
      case 'zh':
        return `${weather.location}: ${weather.description}, ${weather.temperature}${tempUnit} (体感 ${weather.feelsLike}${tempUnit})`;
      default: // English
        return `${weather.location}: ${weather.description}, ${weather.temperature}${tempUnit} (feels like ${weather.feelsLike}${tempUnit})`;
    }
  }

  formatDetailedWeather(weather: WeatherData, settings: WeatherSettings): string {
    const tempUnit = settings.unit === 'metric' ? '°C' : '°F';
    const speedUnit = settings.unit === 'metric' ? 'm/s' : 'mph';
    
    switch (settings.language) {
      case 'kr':
        return `🌍 ${weather.location}
🌡️ 기온: ${weather.temperature}${tempUnit} (체감 ${weather.feelsLike}${tempUnit})
☁️ 날씨: ${weather.description}
💧 습도: ${weather.humidity}%
🌬️ 바람: ${weather.windSpeed} ${speedUnit}
👁️ 가시거리: ${weather.visibility}km`;
      
      case 'ja':
        return `🌍 ${weather.location}
🌡️ 気温: ${weather.temperature}${tempUnit} (体感 ${weather.feelsLike}${tempUnit})
☁️ 天気: ${weather.description}
💧 湿度: ${weather.humidity}%
🌬️ 風速: ${weather.windSpeed} ${speedUnit}
👁️ 視程: ${weather.visibility}km`;
      
      case 'zh':
        return `🌍 ${weather.location}
🌡️ 温度: ${weather.temperature}${tempUnit} (体感 ${weather.feelsLike}${tempUnit})
☁️ 天气: ${weather.description}
💧 湿度: ${weather.humidity}%
🌬️ 风速: ${weather.windSpeed} ${speedUnit}
👁️ 能见度: ${weather.visibility}km`;
      
      default: // English
        return `🌍 ${weather.location}
🌡️ Temperature: ${weather.temperature}${tempUnit} (feels like ${weather.feelsLike}${tempUnit})
☁️ Weather: ${weather.description}
💧 Humidity: ${weather.humidity}%
🌬️ Wind: ${weather.windSpeed} ${speedUnit}
👁️ Visibility: ${weather.visibility}km`;
    }
  }

  clearCache(): void {
    this.cache.clear();
  }

  getCacheStats(): { size: number; entries: Array<{ key: string; age: number }> } {
    const now = Date.now();
    const entries = Array.from(this.cache.entries()).map(([key, value]) => ({
      key,
      age: Math.round((now - value.timestamp) / 1000), // age in seconds
    }));

    return {
      size: this.cache.size,
      entries,
    };
  }
}