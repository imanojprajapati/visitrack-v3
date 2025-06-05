import { fetchApi, downloadFile } from './api';

export interface ReportFilter {
  startDate?: string;
  endDate?: string;
  eventId?: string;
  status?: string;
  searchTerm?: string;
}

export interface ReportOptions {
  format: 'csv' | 'pdf' | 'excel';
  includeHeaders?: boolean;
  orientation?: 'portrait' | 'landscape';
}

export class ReportGenerator {
  static async generateVisitorReport(
    filters: ReportFilter,
    options: ReportOptions
  ): Promise<void> {
    try {
      const queryParams = new URLSearchParams();
      
      // Add filters to query params
      Object.entries(filters).forEach(([key, value]) => {
        if (value) {
          queryParams.append(key, value);
        }
      });

      // Add format to query params
      queryParams.append('format', options.format);
      
      if (options.includeHeaders !== undefined) {
        queryParams.append('includeHeaders', options.includeHeaders.toString());
      }
      
      if (options.orientation) {
        queryParams.append('orientation', options.orientation);
      }

      const endpoint = `reports/visitors?${queryParams.toString()}`;
      await downloadFile(endpoint, `visitor-report.${options.format}`);
    } catch (error) {
      console.error('Error generating visitor report:', error);
      throw error;
    }
  }

  static async generateEventReport(
    filters: ReportFilter,
    options: ReportOptions
  ): Promise<void> {
    try {
      const queryParams = new URLSearchParams();
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value) {
          queryParams.append(key, value);
        }
      });

      queryParams.append('format', options.format);
      
      if (options.includeHeaders !== undefined) {
        queryParams.append('includeHeaders', options.includeHeaders.toString());
      }
      
      if (options.orientation) {
        queryParams.append('orientation', options.orientation);
      }

      const endpoint = `reports/events?${queryParams.toString()}`;
      await downloadFile(endpoint, `event-report.${options.format}`);
    } catch (error) {
      console.error('Error generating event report:', error);
      throw error;
    }
  }

  static async getVisitorStats(eventId?: string): Promise<any> {
    try {
      const endpoint = eventId 
        ? `reports/stats/visitors?eventId=${eventId}`
        : 'reports/stats/visitors';
      
      return await fetchApi(endpoint);
    } catch (error) {
      console.error('Error fetching visitor stats:', error);
      throw error;
    }
  }

  static async getEventStats(startDate?: string, endDate?: string): Promise<any> {
    try {
      const queryParams = new URLSearchParams();
      
      if (startDate) {
        queryParams.append('startDate', startDate);
      }
      
      if (endDate) {
        queryParams.append('endDate', endDate);
      }

      const endpoint = `reports/stats/events${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      return await fetchApi(endpoint);
    } catch (error) {
      console.error('Error fetching event stats:', error);
      throw error;
    }
  }

  static async getRegistrationTrends(
    eventId: string,
    interval: 'daily' | 'weekly' | 'monthly' = 'daily'
  ): Promise<any> {
    try {
      const endpoint = `reports/trends/registrations?eventId=${eventId}&interval=${interval}`;
      return await fetchApi(endpoint);
    } catch (error) {
      console.error('Error fetching registration trends:', error);
      throw error;
    }
  }

  static async getVisitorDemographics(eventId?: string): Promise<any> {
    try {
      const endpoint = eventId
        ? `reports/demographics?eventId=${eventId}`
        : 'reports/demographics';
      return await fetchApi(endpoint);
    } catch (error) {
      console.error('Error fetching visitor demographics:', error);
      throw error;
    }
  }
} 