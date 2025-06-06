/**
 * Get the base API URL based on the current environment
 */
export const getApiUrl = () => {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
  return baseUrl.endsWith('/api') ? baseUrl : `${baseUrl}/api`;
};

/**
 * Helper function to build API endpoint URLs
 * @param endpoint - The API endpoint path
 * @returns Full API URL
 */
export const buildApiUrl = (endpoint: string): string => {
  const baseUrl = getApiUrl();
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  return `${baseUrl}/${cleanEndpoint}`;
};

/**
 * Helper function to build WebSocket URL
 */
export const getWebSocketUrl = () => {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000/api';
  return baseUrl.replace(/^http/, 'ws');
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
  let attempt = 0;
  
  while (attempt <= retries) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // Reduced timeout to 15 seconds

      const response = await fetch(url, {
        ...fetchOptions,
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          ...fetchOptions.headers,
        },
        credentials: 'include',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Handle specific status codes
      if (response.status === 508) {
        throw new Error('Server is temporarily overloaded. Please try again later.');
      }

      if (!response.ok) {
        let errorMessage = `HTTP error! status: ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorData.error || errorMessage;
        } catch {
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
    } catch (err: unknown) {
      if (err instanceof Error) {
        lastError = err;
        
        // Don't retry on certain errors
        if (err.name === 'AbortError' || 
            err.message.includes('Server is temporarily overloaded') ||
            err.message.includes('Database connection failed')) {
          throw err;
        }
      } else {
        lastError = new Error('Unknown error occurred');
      }

      // If this was the last attempt, throw the error
      if (attempt === retries) {
        console.error('API request failed after retries:', {
          url,
          attempts: attempt + 1,
          error: lastError
        });
        throw lastError;
      }
      
      // Exponential backoff with jitter
      const backoffDelay = retryDelay * Math.pow(2, attempt) * (0.5 + Math.random());
      await new Promise(resolve => setTimeout(resolve, backoffDelay));
      attempt++;
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
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout for uploads

      const response = await fetch(url, {
        method: 'POST',
        body: formData,
        credentials: 'include',
        signal: controller.signal,
        headers: {
          'X-Requested-With': 'XMLHttpRequest',
        }
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Upload failed');
      }

      return await response.json();
    } catch (err: unknown) {
      if (err instanceof Error) {
        lastError = err;
        if (err.name === 'AbortError') {
          throw new Error('Upload timed out');
        }
      } else {
        lastError = new Error('Unknown error occurred');
      }

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
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

      const response = await fetch(url, {
        credentials: 'include',
        signal: controller.signal,
        headers: {
          'X-Requested-With': 'XMLHttpRequest',
        }
      });

      clearTimeout(timeoutId);
      
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
    } catch (err: unknown) {
      if (err instanceof Error) {
        lastError = err;
        if (err.name === 'AbortError') {
          throw new Error('Download timed out');
        }
      } else {
        lastError = new Error('Unknown error occurred');
      }

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