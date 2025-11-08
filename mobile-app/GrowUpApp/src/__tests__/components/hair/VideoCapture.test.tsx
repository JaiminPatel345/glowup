import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { VideoCapture } from '../../../components/hair/VideoCapture';
import { Camera } from 'expo-camera';
import * as MediaLibrary from 'expo-media-library';

// Mock dependencies
jest.mock('expo-camera', () => {
  const React = require('react');
  return {
    Camera: React.forwardRef((props: any, ref: any) => {
      return React.createElement('Camera', { ...props, ref });
    }),
    CameraType: {
      front: 'front',
      back: 'back',
    },
    requestCameraPermissionsAsync: jest.fn(),
    requestMicrophonePermissionsAsync: jest.fn(),
  };
});

jest.mock('expo-media-library', () => ({
  requestPermissionsAsync: jest.fn(),
}));

const mockAlert = Alert.alert as jest.MockedFunction<typeof Alert.alert>;

describe('VideoCapture', () => {
  const mockOnVideoRecorded = jest.fn();
  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('Permission Handling', () => {
    it('should request all necessary permissions on mount', async () => {
      (Camera.requestCameraPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'granted',
      });
      (Camera.requestMicrophonePermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'granted',
      });
      (MediaLibrary.requestPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'granted',
      });

      render(
        <VideoCapture
          onVideoRecorded={mockOnVideoRecorded}
          onClose={mockOnClose}
        />
      );

      await waitFor(() => {
        expect(Camera.requestCameraPermissionsAsync).toHaveBeenCalled();
        expect(Camera.requestMicrophonePermissionsAsync).toHaveBeenCalled();
        expect(MediaLibrary.requestPermissionsAsync).toHaveBeenCalled();
      });
    });

    it('should show permission denied message when camera permission is denied', async () => {
      (Camera.requestCameraPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'denied',
      });
      (Camera.requestMicrophonePermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'granted',
      });
      (MediaLibrary.requestPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'granted',
      });

      const { getByText } = render(
        <VideoCapture
          onVideoRecorded={mockOnVideoRecorded}
          onClose={mockOnClose}
        />
      );

      await waitFor(() => {
        expect(getByText('Camera Permission Required')).toBeTruthy();
        expect(getByText('Grant Permissions')).toBeTruthy();
      });
    });

    it('should show alert when permissions are denied', async () => {
      (Camera.requestCameraPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'denied',
      });
      (Camera.requestMicrophonePermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'denied',
      });
      (MediaLibrary.requestPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'granted',
      });

      render(
        <VideoCapture
          onVideoRecorded={mockOnVideoRecorded}
          onClose={mockOnClose}
        />
      );

      await waitFor(() => {
        expect(mockAlert).toHaveBeenCalledWith(
          'Permissions Required',
          expect.any(String),
          expect.any(Array)
        );
      });
    });

    it('should allow retry permission request', async () => {
      (Camera.requestCameraPermissionsAsync as jest.Mock).mockResolvedValueOnce({
        status: 'denied',
      }).mockResolvedValueOnce({
        status: 'granted',
      });
      (Camera.requestMicrophonePermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'granted',
      });
      (MediaLibrary.requestPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'granted',
      });

      const { getByText } = render(
        <VideoCapture
          onVideoRecorded={mockOnVideoRecorded}
          onClose={mockOnClose}
        />
      );

      await waitFor(() => {
        expect(getByText('Grant Permissions')).toBeTruthy();
      });

      fireEvent.press(getByText('Grant Permissions'));

      await waitFor(() => {
        expect(Camera.requestCameraPermissionsAsync).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('Camera Controls', () => {
    beforeEach(() => {
      (Camera.requestCameraPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'granted',
      });
      (Camera.requestMicrophonePermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'granted',
      });
      (MediaLibrary.requestPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'granted',
      });
    });

    it('should render camera controls when permissions are granted', async () => {
      const { getByText } = render(
        <VideoCapture
          onVideoRecorded={mockOnVideoRecorded}
          onClose={mockOnClose}
          maxDuration={10}
        />
      );

      await waitFor(() => {
        expect(getByText('Max: 0:10')).toBeTruthy();
      });
    });

    it('should show instructions before recording', async () => {
      const { getByText } = render(
        <VideoCapture
          onVideoRecorded={mockOnVideoRecorded}
          onClose={mockOnClose}
          maxDuration={15}
        />
      );

      await waitFor(() => {
        expect(
          getByText(/Position your face in the frame and tap the record button to start/)
        ).toBeTruthy();
        expect(getByText(/Maximum recording time is 15 seconds/)).toBeTruthy();
      });
    });

    it('should call onClose when close button is pressed', async () => {
      const { getAllByRole } = render(
        <VideoCapture
          onVideoRecorded={mockOnVideoRecorded}
          onClose={mockOnClose}
        />
      );

      await waitFor(() => {
        const buttons = getAllByRole('button');
        expect(buttons.length).toBeGreaterThan(0);
      });

      // The close button is typically the first button in the header
      const buttons = getAllByRole('button');
      fireEvent.press(buttons[0]);

      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('Recording Functionality', () => {
    beforeEach(() => {
      (Camera.requestCameraPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'granted',
      });
      (Camera.requestMicrophonePermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'granted',
      });
      (MediaLibrary.requestPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'granted',
      });
    });

    it('should use default max duration of 10 seconds', async () => {
      const { getByText } = render(
        <VideoCapture
          onVideoRecorded={mockOnVideoRecorded}
          onClose={mockOnClose}
        />
      );

      await waitFor(() => {
        expect(getByText('Max: 0:10')).toBeTruthy();
      });
    });

    it('should respect custom max duration', async () => {
      const { getByText } = render(
        <VideoCapture
          onVideoRecorded={mockOnVideoRecorded}
          onClose={mockOnClose}
          maxDuration={30}
        />
      );

      await waitFor(() => {
        expect(getByText('Max: 0:30')).toBeTruthy();
      });
    });

    it('should format time correctly', async () => {
      const { getByText } = render(
        <VideoCapture
          onVideoRecorded={mockOnVideoRecorded}
          onClose={mockOnClose}
          maxDuration={125}
        />
      );

      await waitFor(() => {
        expect(getByText('Max: 2:05')).toBeTruthy();
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle permission request errors gracefully', async () => {
      (Camera.requestCameraPermissionsAsync as jest.Mock).mockRejectedValue(
        new Error('Permission request failed')
      );

      const { getByText } = render(
        <VideoCapture
          onVideoRecorded={mockOnVideoRecorded}
          onClose={mockOnClose}
        />
      );

      await waitFor(() => {
        expect(getByText('Camera Permission Required')).toBeTruthy();
      });
    });
  });

  describe('Accessibility', () => {
    beforeEach(() => {
      (Camera.requestCameraPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'granted',
      });
      (Camera.requestMicrophonePermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'granted',
      });
      (MediaLibrary.requestPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'granted',
      });
    });

    it('should have accessible button elements', async () => {
      const { getAllByRole } = render(
        <VideoCapture
          onVideoRecorded={mockOnVideoRecorded}
          onClose={mockOnClose}
        />
      );

      await waitFor(() => {
        const buttons = getAllByRole('button');
        expect(buttons.length).toBeGreaterThan(0);
      });
    });
  });
});
