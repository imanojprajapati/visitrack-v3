import { BrowserQRCodeReader, IScannerControls } from '@zxing/browser';
import { Result } from '@zxing/library';
import { fetchApi } from './api';

export class QRScanner {
  private reader: BrowserQRCodeReader;
  private videoElement: HTMLVideoElement | null = null;
  private isScanning: boolean = false;
  private controls: IScannerControls | null = null;

  constructor() {
    this.reader = new BrowserQRCodeReader();
  }

  async startScanning(
    videoElementId: string,
    onResult: (result: string) => void,
    onError?: (error: Error) => void
  ): Promise<void> {
    try {
      if (this.isScanning) {
        return;
      }

      this.videoElement = document.getElementById(videoElementId) as HTMLVideoElement;
      if (!this.videoElement) {
        throw new Error('Video element not found');
      }

      // Get available video devices
      const videoInputDevices = await BrowserQRCodeReader.listVideoInputDevices();
      
      // Select the first available device
      const selectedDeviceId = videoInputDevices[0]?.deviceId;
      
      if (!selectedDeviceId) {
        throw new Error('No video input devices found');
      }

      this.isScanning = true;

      // Start continuous scanning
      this.controls = await this.reader.decodeFromVideoDevice(
        selectedDeviceId,
        this.videoElement,
        (result: Result | undefined, error: Error | undefined) => {
          if (result) {
            const qrData = result.getText();
            onResult(qrData);
          }
          if (error && onError) {
            onError(error);
          }
        }
      );
    } catch (error) {
      this.isScanning = false;
      if (onError && error instanceof Error) {
        onError(error);
      }
      throw error;
    }
  }

  async stopScanning(): Promise<void> {
    try {
      if (!this.isScanning) {
        return;
      }

      if (this.controls) {
        await this.controls.stop();
        this.controls = null;
      }
      
      if (this.videoElement) {
        const stream = this.videoElement.srcObject as MediaStream;
        if (stream) {
          stream.getTracks().forEach(track => track.stop());
        }
        this.videoElement.srcObject = null;
      }

      this.isScanning = false;
    } catch (error) {
      console.error('Error stopping QR scanner:', error);
      throw error;
    }
  }

  async validateQRCode(qrData: string, eventId: string): Promise<any> {
    try {
      const response = await fetchApi('visitors/validate-qr', {
        method: 'POST',
        body: JSON.stringify({
          qrData,
          eventId
        })
      });
      return response;
    } catch (error) {
      console.error('Error validating QR code:', error);
      throw error;
    }
  }

  isActive(): boolean {
    return this.isScanning;
  }
} 