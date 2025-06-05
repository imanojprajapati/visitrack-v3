/**
 * Get the base API URL based on the current environment
 */
export const getApiUrl = () => {
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
};

/**
 * Helper function to build API endpoint URLs
 * @param endpoint - The API endpoint path
 * @returns Full API URL
 */
export const buildApiUrl = (endpoint: string): string => {
  const baseUrl = getApiUrl();
  return `${baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
};

/**
 * Helper function to build WebSocket URL
 */
export const getWebSocketUrl = () => {
  const isProduction = process.env.NODE_ENV === 'production';
  return isProduction 
    ? 'wss://www.visitrack.in'
    : 'ws://localhost:3000';
};

interface FetchOptions extends RequestInit {
  retries?: number;
  retryDelay?: number;
}

/**
 * Common fetch wrapper with error handling and retry logic
 * @param endpoint - API endpoint
 * @param options - Fetch options including retry configuration
 * @returns Response data
 */
export const fetchApi = async (endpoint: string, options: FetchOptions = {}) => {
  const { retries = 3, retryDelay = 1000, ...fetchOptions } = options;
  const url = buildApiUrl(endpoint);
  
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, {
        ...fetchOptions,
        headers: {
          'Content-Type': 'application/json',
          ...fetchOptions.headers,
        },
        credentials: 'include', // Include cookies for cross-origin requests
      });

      if (!response.ok) {
        // Try to parse error as JSON
        let errorMessage = `HTTP error! status: ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorData.error || errorMessage;
        } catch {
          // If parsing fails, use status text
          errorMessage = response.statusText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      // Check if response is JSON or binary
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await response.json();
      } else {
        return await response.blob();
      }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error occurred');
      
      // If this was the last attempt, throw the error
      if (attempt === retries) {
        console.error('API request failed after retries:', {
          url,
          attempts: attempt + 1,
          error: lastError
        });
        throw lastError;
      }
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, retryDelay * Math.pow(2, attempt)));
    }
  }
};

/**
 * Upload file to server with retry logic
 * @param endpoint - API endpoint
 * @param file - File to upload
 * @param additionalData - Additional form data
 * @returns Upload response
 */
export const uploadFile = async (
  endpoint: string,
  file: File,
  additionalData?: Record<string, any>,
  options: FetchOptions = {}
) => {
  const { retries = 3, retryDelay = 1000 } = options;
  const url = buildApiUrl(endpoint);
  const formData = new FormData();
  formData.append('file', file);
  
  if (additionalData) {
    Object.entries(additionalData).forEach(([key, value]) => {
      formData.append(key, value);
    });
  }

  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Upload failed');
      }

      return await response.json();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error occurred');
      
      if (attempt === retries) {
        console.error('Upload failed after retries:', {
          url,
          attempts: attempt + 1,
          error: lastError
        });
        throw lastError;
      }
      
      await new Promise(resolve => setTimeout(resolve, retryDelay * Math.pow(2, attempt)));
    }
  }
};

/**
 * Download file from server with retry logic
 * @param endpoint - API endpoint
 * @param filename - Desired filename
 * @returns void
 */
export const downloadFile = async (
  endpoint: string,
  filename: string,
  options: FetchOptions = {}
) => {
  const { retries = 3, retryDelay = 1000 } = options;
  const url = buildApiUrl(endpoint);
  
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, {
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Download failed');
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);
      return;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error occurred');
      
      if (attempt === retries) {
        console.error('Download failed after retries:', {
          url,
          attempts: attempt + 1,
          error: lastError
        });
        throw lastError;
      }
      
      await new Promise(resolve => setTimeout(resolve, retryDelay * Math.pow(2, attempt)));
    }
  }
}; 