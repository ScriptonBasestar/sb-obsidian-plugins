import { requestUrl, RequestUrlParam, Notice } from 'obsidian';

import { ScriptonCloudConfig, CloudSyncResult, SettingsProfile, ChangeItem } from '../types';

export interface CloudResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface CloudProfile {
  id: string;
  name: string;
  description: string;
  settings: any;
  version: string;
  createdAt: string;
  updatedAt: string;
  organizationId?: string;
  teamId?: string;
  isPublic: boolean;
}

export interface CloudPlugin {
  id: string;
  name: string;
  version: string;
  description: string;
  repository: string;
  downloadUrl: string;
}

export class ScriptonCloudClient {
  private config: ScriptonCloudConfig;

  constructor(config: ScriptonCloudConfig) {
    this.config = config;
  }

  /**
   * Update client configuration
   */
  updateConfig(config: ScriptonCloudConfig): void {
    this.config = config;
  }

  /**
   * Validate API key
   */
  async validateApiKey(): Promise<boolean> {
    try {
      const response = await this.request('GET', '/api/v1/auth/validate');
      return response.success;
    } catch (error) {
      console.error('Failed to validate API key:', error);
      return false;
    }
  }

  /**
   * Get available profiles from cloud
   */
  async getProfiles(): Promise<CloudProfile[]> {
    try {
      const response = await this.request<{ profiles: CloudProfile[] }>('GET', '/api/v1/profiles');

      if (response.success && response.data) {
        return response.data.profiles;
      }

      return [];
    } catch (error) {
      console.error('Failed to get profiles:', error);
      throw error;
    }
  }

  /**
   * Get a specific profile by ID
   */
  async getProfile(profileId: string): Promise<CloudProfile | null> {
    try {
      const response = await this.request<CloudProfile>('GET', `/api/v1/profiles/${profileId}`);

      if (response.success && response.data) {
        return response.data;
      }

      return null;
    } catch (error) {
      console.error('Failed to get profile:', error);
      throw error;
    }
  }

  /**
   * Upload a profile to cloud
   */
  async uploadProfile(profile: SettingsProfile): Promise<CloudSyncResult> {
    try {
      const response = await this.request<{ profileId: string; version: string }>(
        'POST',
        '/api/v1/profiles',
        {
          name: profile.name,
          description: profile.description,
          settings: profile.settings,
          organizationId: this.config.organizationId,
          teamId: this.config.teamId,
        }
      );

      if (response.success && response.data) {
        return {
          success: true,
          profileId: response.data.profileId,
          timestamp: new Date().toISOString(),
          changes: [],
        };
      }

      return {
        success: false,
        profileId: '',
        timestamp: new Date().toISOString(),
        changes: [],
        error: response.error || 'Failed to upload profile',
      };
    } catch (error) {
      console.error('Failed to upload profile:', error);
      return {
        success: false,
        profileId: '',
        timestamp: new Date().toISOString(),
        changes: [],
        error: error.message,
      };
    }
  }

  /**
   * Update an existing profile
   */
  async updateProfile(profileId: string, profile: SettingsProfile): Promise<CloudSyncResult> {
    try {
      const response = await this.request<{ version: string; changes: ChangeItem[] }>(
        'PUT',
        `/api/v1/profiles/${profileId}`,
        {
          name: profile.name,
          description: profile.description,
          settings: profile.settings,
        }
      );

      if (response.success && response.data) {
        return {
          success: true,
          profileId,
          timestamp: new Date().toISOString(),
          changes: response.data.changes || [],
        };
      }

      return {
        success: false,
        profileId,
        timestamp: new Date().toISOString(),
        changes: [],
        error: response.error || 'Failed to update profile',
      };
    } catch (error) {
      console.error('Failed to update profile:', error);
      return {
        success: false,
        profileId,
        timestamp: new Date().toISOString(),
        changes: [],
        error: error.message,
      };
    }
  }

  /**
   * Delete a profile from cloud
   */
  async deleteProfile(profileId: string): Promise<boolean> {
    try {
      const response = await this.request('DELETE', `/api/v1/profiles/${profileId}`);
      return response.success;
    } catch (error) {
      console.error('Failed to delete profile:', error);
      return false;
    }
  }

  /**
   * Get recommended plugins
   */
  async getRecommendedPlugins(): Promise<CloudPlugin[]> {
    try {
      const response = await this.request<{ plugins: CloudPlugin[] }>(
        'GET',
        '/api/v1/plugins/recommended'
      );

      if (response.success && response.data) {
        return response.data.plugins;
      }

      return [];
    } catch (error) {
      console.error('Failed to get recommended plugins:', error);
      return [];
    }
  }

  /**
   * Search for plugins
   */
  async searchPlugins(query: string): Promise<CloudPlugin[]> {
    try {
      const response = await this.request<{ plugins: CloudPlugin[] }>(
        'GET',
        `/api/v1/plugins/search?q=${encodeURIComponent(query)}`
      );

      if (response.success && response.data) {
        return response.data.plugins;
      }

      return [];
    } catch (error) {
      console.error('Failed to search plugins:', error);
      return [];
    }
  }

  /**
   * Get plugin installation instructions
   */
  async getPluginInstallInfo(pluginId: string): Promise<{
    repository: string;
    installCommand?: string;
    manualSteps?: string[];
  } | null> {
    try {
      const response = await this.request<any>('GET', `/api/v1/plugins/${pluginId}/install`);

      if (response.success && response.data) {
        return response.data;
      }

      return null;
    } catch (error) {
      console.error('Failed to get plugin install info:', error);
      return null;
    }
  }

  /**
   * Apply a cloud profile to current vault
   */
  async applyProfile(profileId: string): Promise<CloudSyncResult> {
    try {
      const profile = await this.getProfile(profileId);

      if (!profile) {
        return {
          success: false,
          profileId,
          timestamp: new Date().toISOString(),
          changes: [],
          error: 'Profile not found',
        };
      }

      // The actual application would be handled by the sync manager
      // This just returns the profile data
      return {
        success: true,
        profileId,
        timestamp: new Date().toISOString(),
        changes: [],
      };
    } catch (error) {
      console.error('Failed to apply profile:', error);
      return {
        success: false,
        profileId,
        timestamp: new Date().toISOString(),
        changes: [],
        error: error.message,
      };
    }
  }

  /**
   * Make a request to Scripton Cloud API
   */
  private async request<T = any>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    path: string,
    body?: any
  ): Promise<CloudResponse<T>> {
    const url = `${this.config.apiUrl}${path}`;

    const params: RequestUrlParam = {
      url,
      method,
      headers: {
        Authorization: `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
      },
    };

    if (body && (method === 'POST' || method === 'PUT')) {
      params.body = JSON.stringify(body);
    }

    try {
      const response = await requestUrl(params);

      if (response.status >= 200 && response.status < 300) {
        return {
          success: true,
          data: response.json,
        };
      } else {
        return {
          success: false,
          error: `API error: ${response.status}`,
          message: response.json?.message,
        };
      }
    } catch (error) {
      console.error('Request failed:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Check connectivity to Scripton Cloud
   */
  async checkConnectivity(): Promise<boolean> {
    try {
      const response = await this.request('GET', '/api/v1/health');
      return response.success;
    } catch (error) {
      console.error('Connectivity check failed:', error);
      return false;
    }
  }

  /**
   * Get organization settings
   */
  async getOrganizationSettings(): Promise<any> {
    if (!this.config.organizationId) {
      return null;
    }

    try {
      const response = await this.request(
        'GET',
        `/api/v1/organizations/${this.config.organizationId}/settings`
      );

      if (response.success && response.data) {
        return response.data;
      }

      return null;
    } catch (error) {
      console.error('Failed to get organization settings:', error);
      return null;
    }
  }

  /**
   * Get team settings
   */
  async getTeamSettings(): Promise<any> {
    if (!this.config.teamId) {
      return null;
    }

    try {
      const response = await this.request('GET', `/api/v1/teams/${this.config.teamId}/settings`);

      if (response.success && response.data) {
        return response.data;
      }

      return null;
    } catch (error) {
      console.error('Failed to get team settings:', error);
      return null;
    }
  }
}
