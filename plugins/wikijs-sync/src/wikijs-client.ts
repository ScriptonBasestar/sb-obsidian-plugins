import { GraphQLClient } from 'graphql-request';
import { gql } from 'graphql-request';
import { 
  WikiPage, 
  WikiPageInput, 
  GraphQLResponse,
  PageCreateResponse,
  PageUpdateResponse,
  PageQueryResponse,
  ResponseResult
} from './types';

export class WikiJSClient {
  private client: GraphQLClient;
  private apiKey: string;

  constructor(wikiUrl: string, apiKey: string) {
    this.apiKey = apiKey;
    this.client = new GraphQLClient(`${wikiUrl}/graphql`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      timeout: 30000,
      errorPolicy: 'all'
    });
  }

  /**
   * Test connection to WikiJS
   */
  async testConnection(): Promise<boolean> {
    try {
      const query = gql`
        query {
          system {
            info {
              title
              version
            }
          }
        }
      `;

      const response = await this.client.request(query);
      return !!response;
    } catch (error) {
      console.error('WikiJS connection test failed:', error);
      return false;
    }
  }

  /**
   * Get a single page by path
   */
  async getPage(path: string): Promise<WikiPage | null> {
    try {
      const query = gql`
        query GetPage($path: String!) {
          pages {
            single(path: $path) {
              id
              path
              title
              content
              description
              tags
              isPublished
              isPrivate
              locale
              createdAt
              updatedAt
              editor
            }
          }
        }
      `;

      const response: PageQueryResponse = await this.client.request(query, { path });
      return response.pages.single || null;
    } catch (error) {
      console.error(`Failed to get page ${path}:`, error);
      return null;
    }
  }

  /**
   * List all pages
   */
  async listPages(limit: number = 100, offset: number = 0): Promise<WikiPage[]> {
    try {
      const query = gql`
        query ListPages($limit: Int!, $offset: Int!) {
          pages {
            list(limit: $limit, offset: $offset) {
              id
              path
              title
              description
              tags
              isPublished
              isPrivate
              locale
              createdAt
              updatedAt
              editor
            }
          }
        }
      `;

      const response: PageQueryResponse = await this.client.request(query, { limit, offset });
      return response.pages.list || [];
    } catch (error) {
      console.error('Failed to list pages:', error);
      return [];
    }
  }

  /**
   * Create a new page
   */
  async createPage(input: WikiPageInput): Promise<ResponseResult> {
    try {
      const mutation = gql`
        mutation CreatePage(
          $path: String!
          $title: String!
          $content: String!
          $description: String
          $tags: [String!]
          $isPublished: Boolean
          $isPrivate: Boolean
          $locale: String
          $editor: String
        ) {
          pages {
            create(
              path: $path
              title: $title
              content: $content
              description: $description
              tags: $tags
              isPublished: $isPublished
              isPrivate: $isPrivate
              locale: $locale
              editor: $editor
            ) {
              responseResult {
                succeeded
                errorCode
                slug
                message
              }
              page {
                id
                path
                title
              }
            }
          }
        }
      `;

      const variables = {
        path: input.path,
        title: input.title,
        content: input.content,
        description: input.description || '',
        tags: input.tags || [],
        isPublished: input.isPublished ?? true,
        isPrivate: input.isPrivate ?? false,
        locale: input.locale || 'en',
        editor: input.editor || 'markdown'
      };

      const response: PageCreateResponse = await this.client.request(mutation, variables);
      return response.pages.create.responseResult;
    } catch (error) {
      console.error('Failed to create page:', error);
      return {
        succeeded: false,
        errorCode: 'UNKNOWN_ERROR',
        message: error.message
      };
    }
  }

  /**
   * Update an existing page
   */
  async updatePage(id: string, input: WikiPageInput): Promise<ResponseResult> {
    try {
      const mutation = gql`
        mutation UpdatePage(
          $id: String!
          $path: String!
          $title: String!
          $content: String!
          $description: String
          $tags: [String!]
          $isPublished: Boolean
          $isPrivate: Boolean
          $locale: String
          $editor: String
        ) {
          pages {
            update(
              id: $id
              path: $path
              title: $title
              content: $content
              description: $description
              tags: $tags
              isPublished: $isPublished
              isPrivate: $isPrivate
              locale: $locale
              editor: $editor
            ) {
              responseResult {
                succeeded
                errorCode
                slug
                message
              }
              page {
                id
                path
                title
              }
            }
          }
        }
      `;

      const variables = {
        id,
        path: input.path,
        title: input.title,
        content: input.content,
        description: input.description || '',
        tags: input.tags || [],
        isPublished: input.isPublished ?? true,
        isPrivate: input.isPrivate ?? false,
        locale: input.locale || 'en',
        editor: input.editor || 'markdown'
      };

      const response: PageUpdateResponse = await this.client.request(mutation, variables);
      return response.pages.update.responseResult;
    } catch (error) {
      console.error('Failed to update page:', error);
      return {
        succeeded: false,
        errorCode: 'UNKNOWN_ERROR',
        message: error.message
      };
    }
  }

  /**
   * Delete a page
   */
  async deletePage(id: string): Promise<ResponseResult> {
    try {
      const mutation = gql`
        mutation DeletePage($id: String!) {
          pages {
            delete(id: $id) {
              responseResult {
                succeeded
                errorCode
                message
              }
            }
          }
        }
      `;

      const response = await this.client.request(mutation, { id });
      return response.pages.delete.responseResult;
    } catch (error) {
      console.error('Failed to delete page:', error);
      return {
        succeeded: false,
        errorCode: 'UNKNOWN_ERROR',
        message: error.message
      };
    }
  }

  /**
   * Search pages
   */
  async searchPages(query: string, limit: number = 10): Promise<WikiPage[]> {
    try {
      const searchQuery = gql`
        query SearchPages($query: String!, $limit: Int!) {
          pages {
            search(query: $query, limit: $limit) {
              results {
                id
                path
                title
                description
                tags
                locale
              }
            }
          }
        }
      `;

      const response = await this.client.request(searchQuery, { query, limit });
      return response.pages.search.results || [];
    } catch (error) {
      console.error('Failed to search pages:', error);
      return [];
    }
  }

  /**
   * Get page tree structure
   */
  async getPageTree(): Promise<any> {
    try {
      const query = gql`
        query GetPageTree {
          pages {
            tree {
              id
              path
              title
              isFolder
              children {
                id
                path
                title
                isFolder
              }
            }
          }
        }
      `;

      const response = await this.client.request(query);
      return response.pages.tree;
    } catch (error) {
      console.error('Failed to get page tree:', error);
      return [];
    }
  }

  /**
   * Handle API errors with retry logic
   */
  private async withRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    delay: number = 1000
  ): Promise<T> {
    let lastError: Error;

    for (let i = 0; i < maxRetries; i++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        
        // Don't retry on authentication errors
        if (error.message?.includes('401') || error.message?.includes('403')) {
          throw error;
        }

        // Wait before retrying
        if (i < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
        }
      }
    }

    throw lastError;
  }

  /**
   * Batch operations for better performance
   */
  async batchCreatePages(pages: WikiPageInput[]): Promise<ResponseResult[]> {
    const results: ResponseResult[] = [];
    
    // Process in batches of 10
    const batchSize = 10;
    for (let i = 0; i < pages.length; i += batchSize) {
      const batch = pages.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(page => this.createPage(page))
      );
      results.push(...batchResults);
    }

    return results;
  }

  /**
   * Update API key
   */
  updateApiKey(apiKey: string): void {
    this.apiKey = apiKey;
    this.client = new GraphQLClient(this.client['url'], {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      timeout: 30000,
      errorPolicy: 'all'
    });
  }
}