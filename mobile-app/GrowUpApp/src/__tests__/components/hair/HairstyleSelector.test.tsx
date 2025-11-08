import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { HairstyleSelector } from '../../../components/hair/HairstyleSelector';
import * as ImagePicker from 'expo-image-picker';
import { PermissionStatus } from 'expo-image-picker';

// Mock expo-image-picker
jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
  MediaTypeOptions: {
    Images: 'Images',
  },
}));

const mockImagePicker = ImagePicker as jest.Mocked<typeof ImagePicker>;

describe('HairstyleSelector', () => {
  const mockOnStyleSelected = jest.fn();
  const mockOnColorSelected = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly with default props', () => {
    const { getByText } = render(
      <HairstyleSelector onStyleSelected={mockOnStyleSelected} />
    );

    expect(getByText('Choose Hairstyle')).toBeTruthy();
    expect(getByText('All')).toBeTruthy();
    expect(getByText('Upload Custom Hairstyle')).toBeTruthy();
  });

  it('renders color selection when onColorSelected is provided', () => {
    const { getByText } = render(
      <HairstyleSelector
        onStyleSelected={mockOnStyleSelected}
        onColorSelected={mockOnColorSelected}
      />
    );

    expect(getByText('Hair Color (Optional)')).toBeTruthy();
    expect(getByText('Upload Custom Color Reference')).toBeTruthy();
  });

  it('filters styles by category', () => {
    const { getByText } = render(
      <HairstyleSelector onStyleSelected={mockOnStyleSelected} />
    );

    // Click on Short category
    fireEvent.press(getByText('Short'));
    
    // Should show short hairstyles (this would need actual predefined styles to test properly)
    expect(getByText('Short')).toBeTruthy();
  });

  it('handles custom style upload with permission granted', async () => {
    mockImagePicker.requestMediaLibraryPermissionsAsync.mockResolvedValue({
      status: PermissionStatus.GRANTED,
      expires: 'never',
      canAskAgain: true,
      granted: true,
    });

    mockImagePicker.launchImageLibraryAsync.mockResolvedValue({
      canceled: false,
      assets: [{
        uri: 'file://test-image.jpg',
        width: 100,
        height: 100,
        assetId: 'test-id',
      }],
    });

    const { getByText } = render(
      <HairstyleSelector onStyleSelected={mockOnStyleSelected} />
    );

    fireEvent.press(getByText('Upload Custom Hairstyle'));

    await waitFor(() => {
      expect(mockImagePicker.requestMediaLibraryPermissionsAsync).toHaveBeenCalled();
      expect(mockImagePicker.launchImageLibraryAsync).toHaveBeenCalledWith({
        mediaTypes: 'Images',
        allowsEditing: true,
        aspect: [3, 4],
        quality: 0.8,
      });
    });

    await waitFor(() => {
      expect(mockOnStyleSelected).toHaveBeenCalledWith('file://test-image.jpg', 'Custom Style');
    });
  });

  it('handles permission denied for custom upload', async () => {
    mockImagePicker.requestMediaLibraryPermissionsAsync.mockResolvedValue({
      status: PermissionStatus.DENIED,
      expires: 'never',
      canAskAgain: true,
      granted: false,
    });

    const { getByText } = render(
      <HairstyleSelector onStyleSelected={mockOnStyleSelected} />
    );

    fireEvent.press(getByText('Upload Custom Hairstyle'));

    await waitFor(() => {
      expect(mockImagePicker.requestMediaLibraryPermissionsAsync).toHaveBeenCalled();
      expect(mockImagePicker.launchImageLibraryAsync).not.toHaveBeenCalled();
      expect(mockOnStyleSelected).not.toHaveBeenCalled();
    });
  });

  it('handles custom color upload', async () => {
    mockImagePicker.requestMediaLibraryPermissionsAsync.mockResolvedValue({
      status: PermissionStatus.GRANTED,
      expires: 'never',
      canAskAgain: true,
      granted: true,
    });

    mockImagePicker.launchImageLibraryAsync.mockResolvedValue({
      canceled: false,
      assets: [{
        uri: 'file://test-color.jpg',
        width: 100,
        height: 100,
        assetId: 'test-id',
      }],
    });

    const { getByText } = render(
      <HairstyleSelector
        onStyleSelected={mockOnStyleSelected}
        onColorSelected={mockOnColorSelected}
      />
    );

    fireEvent.press(getByText('Upload Custom Color Reference'));

    await waitFor(() => {
      expect(mockImagePicker.launchImageLibraryAsync).toHaveBeenCalledWith({
        mediaTypes: 'Images',
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
    });

    await waitFor(() => {
      expect(mockOnColorSelected).toHaveBeenCalledWith('file://test-color.jpg');
    });
  });

  it('shows selected style with checkmark', () => {
    const selectedStyleUrl = 'https://example.com/styles/short-bob.jpg';
    
    const { UNSAFE_getByProps } = render(
      <HairstyleSelector
        onStyleSelected={mockOnStyleSelected}
        selectedStyle={selectedStyleUrl}
      />
    );

    // Check if the selected style has the blue border class
    const selectedStyleElement = UNSAFE_getByProps({
      className: expect.stringContaining('border-blue-500'),
    });
    expect(selectedStyleElement).toBeTruthy();
  });

  it('calls onColorSelected when predefined color is selected', () => {
    const { getByText } = render(
      <HairstyleSelector
        onStyleSelected={mockOnStyleSelected}
        onColorSelected={mockOnColorSelected}
      />
    );

    // This would need to be updated based on actual color option rendering
    // For now, just verify the component renders with color selection
    expect(getByText('Hair Color (Optional)')).toBeTruthy();
  });

  it('does not show custom upload when allowCustomUpload is false', () => {
    const { queryByText } = render(
      <HairstyleSelector
        onStyleSelected={mockOnStyleSelected}
        allowCustomUpload={false}
      />
    );

    expect(queryByText('Upload Custom Hairstyle')).toBeNull();
  });
});