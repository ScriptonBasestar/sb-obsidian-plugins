import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WikiJSClient } from '../src/wikijs-client';
import { GraphQLClient } from 'graphql-request';

vi.mock('graphql-request');

describe('WikiJSClient', () => {
  let client: WikiJSClient;
  let mockGraphQLClient: any;

  beforeEach(() => {
    mockGraphQLClient = {
      request: vi.fn()
    };
    (GraphQLClient as any).mockImplementation(() => mockGraphQLClient);
    client = new WikiJSClient('https://wiki.example.com', 'test-api-key');
  });

  describe('testConnection', () => {
    it('should return true when connection is successful', async () => {
      mockGraphQLClient.request.mockResolvedValue({
        pages: { list: [] }
      });

      const result = await client.testConnection();
      expect(result).toBe(true);
    });

    it('should return false when connection fails', async () => {
      mockGraphQLClient.request.mockRejectedValue(new Error('Connection failed'));

      const result = await client.testConnection();
      expect(result).toBe(false);
    });
  });

  describe('createPage', () => {
    it('should create a page successfully', async () => {
      const pageInput = {
        path: '/test-page',
        title: 'Test Page',
        content: 'Test content',
        editor: 'markdown'
      };

      mockGraphQLClient.request.mockResolvedValue({
        pages: {
          create: {
            responseResult: {
              succeeded: true,
              slug: 'test-page'
            }
          }
        }
      });

      const result = await client.createPage(pageInput);
      expect(result.succeeded).toBe(true);
      expect(result.slug).toBe('test-page');
    });

    it('should handle create page errors', async () => {
      const pageInput = {
        path: '/test-page',
        title: 'Test Page',
        content: 'Test content'
      };

      mockGraphQLClient.request.mockResolvedValue({
        pages: {
          create: {
            responseResult: {
              succeeded: false,
              errorCode: 'PAGE_EXISTS',
              message: 'Page already exists'
            }
          }
        }
      });

      const result = await client.createPage(pageInput);
      expect(result.succeeded).toBe(false);
      expect(result.errorCode).toBe('PAGE_EXISTS');
    });
  });

  describe('updatePage', () => {
    it('should update a page successfully', async () => {
      const pageId = '123';
      const pageInput = {
        path: '/test-page',
        title: 'Updated Test Page',
        content: 'Updated content'
      };

      mockGraphQLClient.request.mockResolvedValue({
        pages: {
          update: {
            responseResult: {
              succeeded: true
            }
          }
        }
      });

      const result = await client.updatePage(pageId, pageInput);
      expect(result.succeeded).toBe(true);
    });
  });

  describe('getPage', () => {
    it('should retrieve a page by path', async () => {
      const pagePath = '/test-page';
      const mockPage = {
        id: '123',
        path: '/test-page',
        title: 'Test Page',
        content: 'Test content',
        tags: ['test'],
        updatedAt: '2024-01-16T00:00:00Z'
      };

      mockGraphQLClient.request.mockResolvedValue({
        pages: {
          single: mockPage
        }
      });

      const result = await client.getPage(pagePath);
      expect(result).toEqual(mockPage);
    });

    it('should return null when page not found', async () => {
      mockGraphQLClient.request.mockResolvedValue({
        pages: {
          single: null
        }
      });

      const result = await client.getPage('/non-existent');
      expect(result).toBeNull();
    });
  });

  describe('listPages', () => {
    it('should list pages with pagination', async () => {
      const mockPages = [
        { id: '1', path: '/page1', title: 'Page 1' },
        { id: '2', path: '/page2', title: 'Page 2' }
      ];

      mockGraphQLClient.request.mockResolvedValue({
        pages: {
          list: mockPages
        }
      });

      const result = await client.listPages(10, 0);
      expect(result).toEqual(mockPages);
      expect(mockGraphQLClient.request).toHaveBeenCalledWith(
        expect.anything(),
        { limit: 10, offset: 0 }
      );
    });
  });

  describe('deletePage', () => {
    it('should delete a page successfully', async () => {
      mockGraphQLClient.request.mockResolvedValue({
        pages: {
          delete: {
            responseResult: {
              succeeded: true
            }
          }
        }
      });

      const result = await client.deletePage('123');
      expect(result.succeeded).toBe(true);
    });
  });

  describe('searchPages', () => {
    it('should search pages by query', async () => {
      const mockResults = [
        { id: '1', path: '/result1', title: 'Result 1', content: 'Match' }
      ];

      mockGraphQLClient.request.mockResolvedValue({
        pages: {
          search: mockResults
        }
      });

      const result = await client.searchPages('test query');
      expect(result).toEqual(mockResults);
    });
  });
});