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

/**
 * Common fetch wrapper with error handling
 * @param endpoint - API endpoint
 * @param options - Fetch options
 * @returns Response data
 */
export const fetchApi = async (endpoint: string, options: RequestInit = {}) => {
  const url = buildApiUrl(endpoint);
  
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      // Try to parse error as JSON, but handle non-JSON responses too
      try {
        const error = await response.json();
        throw new Error(error.message || 'API request failed');
      } catch {
        throw new Error(`API request failed with status ${response.status}`);
      }
    }

    // Check if response is JSON or binary
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return await response.json();
    } else {
      return await response.blob();
    }
  } catch (error) {
    console.error('API request error:', error);
    throw error;
  }
};

/**
 * Upload file to server
 * @param endpoint - API endpoint
 * @param file - File to upload
 * @param additionalData - Additional form data
 * @returns Upload response
 */
export const uploadFile = async (endpoint: string, file: File, additionalData?: Record<string, any>) => {
  const url = buildApiUrl(endpoint);
  const formData = new FormData();
  formData.append('file', file);
  
  if (additionalData) {
    Object.entries(additionalData).forEach(([key, value]) => {
      formData.append(key, value);
    });
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Upload failed');
    }

    return await response.json();
  } catch (error) {
    console.error('Upload error:', error);
    throw error;
  }
};

/**
 * Download file from server
 * @param endpoint - API endpoint
 * @param filename - Desired filename
 * @returns void
 */
export const downloadFile = async (endpoint: string, filename: string) => {
  const url = buildApiUrl(endpoint);
  
  try {
    const response = await fetch(url);
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
  } catch (error) {
    console.error('Download error:', error);
    throw error;
  }
}; 