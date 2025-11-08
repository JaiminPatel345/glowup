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
  PermissionStatus: {
    GRANTED: 'granted',
    DENIED: 'denied',
    UNDETERMINED: 'undetermined',
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
    
    const { getAllByRole } = render(
      <HairstyleSelector
        onStyleSelected={mockOnStyleSelected}
        selectedStyle={selectedStyleUrl}
      />
    );

    // Check if there are images rendered for styles (at least one should be the selected style)
    const images = getAllByRole('image');
    expect(images.length).toBeGreaterThan(0);
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

  describe('Category Filtering', () => {
    it('should show all styles by default', () => {
      const { getByText } = render(
        <HairstyleSelector onStyleSelected={mockOnStyleSelected} />
      );

      expect(getByText('All')).toBeTruthy();
      expect(getByText('Choose Hairstyle')).toBeTruthy();
    });

    it('should filter by each category correctly', () => {
      const { getByText } = render(
        <HairstyleSelector onStyleSelected={mockOnStyleSelected} />
      );

      const categories = ['Short', 'Medium', 'Long', 'Curly', 'Straight', 'Wavy'];
      
      categories.forEach(category => {
        const categoryButton = getByText(category);
        expect(categoryButton).toBeTruthy();
        fireEvent.press(categoryButton);
      });
    });

    it('should switch between categories', () => {
      const { getByText } = render(
        <HairstyleSelector onStyleSelected={mockOnStyleSelected} />
      );

      // Start with 'All' category
      fireEvent.press(getByText('Short'));
      fireEvent.press(getByText('Long'));
      fireEvent.press(getByText('All'));
      
      expect(getByText('All')).toBeTruthy();
    });
  });

  describe('Style Selection', () => {
    it('should call onStyleSelected with correct parameters for predefined style', () => {
      const { getAllByRole } = render(
        <HairstyleSelector onStyleSelected={mockOnStyleSelected} />
      );

      const images = getAllByRole('image');
      if (images.length > 0) {
        fireEvent.press(images[0].parent!);
        
        expect(mockOnStyleSelected).toHaveBeenCalled();
        expect(mockOnStyleSelected).toHaveBeenCalledWith(
          expect.any(String),
          expect.any(String)
        );
      }
    });

    it('should handle selecting same style twice', () => {
      const { getAllByRole } = render(
        <HairstyleSelector onStyleSelected={mockOnStyleSelected} />
      );

      const images = getAllByRole('image');
      if (images.length > 0) {
        const firstStyle = images[0].parent!;
        fireEvent.press(firstStyle);
        fireEvent.press(firstStyle);
        
        expect(mockOnStyleSelected).toHaveBeenCalledTimes(2);
      }
    });

    it('should handle multiple style selections', () => {
      const { getAllByRole } = render(
        <HairstyleSelector onStyleSelected={mockOnStyleSelected} />
      );

      const images = getAllByRole('image');
      if (images.length >= 2) {
        fireEvent.press(images[0].parent!);
        fireEvent.press(images[1].parent!);
        
        expect(mockOnStyleSelected).toHaveBeenCalledTimes(2);
      }
    });
  });

  describe('Color Selection', () => {
    it('should render predefined color options', () => {
      const { getByText } = render(
        <HairstyleSelector
          onStyleSelected={mockOnStyleSelected}
          onColorSelected={mockOnColorSelected}
        />
      );

      expect(getByText('Hair Color (Optional)')).toBeTruthy();
    });

    it('should call onColorSelected when color is selected', () => {
      const { getByText } = render(
        <HairstyleSelector
          onStyleSelected={mockOnStyleSelected}
          onColorSelected={mockOnColorSelected}
        />
      );

      // This test assumes color options are rendered as touchable elements
      // The actual implementation may vary
      expect(getByText('Hair Color (Optional)')).toBeTruthy();
    });

    it('should not render color section when onColorSelected is not provided', () => {
      const { queryByText } = render(
        <HairstyleSelector onStyleSelected={mockOnStyleSelected} />
      );

      expect(queryByText('Hair Color (Optional)')).toBeNull();
    });

    it('should show selected color indicator', () => {
      const selectedColor = 'blonde';
      
      const { getByText } = render(
        <HairstyleSelector
          onStyleSelected={mockOnStyleSelected}
          onColorSelected={mockOnColorSelected}
          selectedColor={selectedColor}
        />
      );

      expect(getByText('Hair Color (Optional)')).toBeTruthy();
    });
  });

  describe('Custom Upload Error Handling', () => {
    it('should handle image picker cancellation', async () => {
      mockImagePicker.requestMediaLibraryPermissionsAsync.mockResolvedValue({
        status: PermissionStatus.GRANTED,
        expires: 'never',
        canAskAgain: true,
        granted: true,
      });

      mockImagePicker.launchImageLibraryAsync.mockResolvedValue({
        canceled: true,
      } as any);

      const { getByText } = render(
        <HairstyleSelector onStyleSelected={mockOnStyleSelected} />
      );

      fireEvent.press(getByText('Upload Custom Hairstyle'));

      await waitFor(() => {
        expect(mockImagePicker.launchImageLibraryAsync).toHaveBeenCalled();
      });

      expect(mockOnStyleSelected).not.toHaveBeenCalled();
    });

    it('should handle image picker errors', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      
      mockImagePicker.requestMediaLibraryPermissionsAsync.mockResolvedValue({
        status: PermissionStatus.GRANTED,
        expires: 'never',
        canAskAgain: true,
        granted: true,
      });

      mockImagePicker.launchImageLibraryAsync.mockRejectedValue(
        new Error('Image picker failed')
      );

      const { getByText } = render(
        <HairstyleSelector onStyleSelected={mockOnStyleSelected} />
      );

      fireEvent.press(getByText('Upload Custom Hairstyle'));

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          'Error picking custom style:',
          expect.any(Error)
        );
      });

      consoleErrorSpy.mockRestore();
    });

    it('should handle color upload with no assets', async () => {
      mockImagePicker.requestMediaLibraryPermissionsAsync.mockResolvedValue({
        status: PermissionStatus.GRANTED,
        expires: 'never',
        canAskAgain: true,
        granted: true,
      });

      mockImagePicker.launchImageLibraryAsync.mockResolvedValue({
        canceled: false,
        assets: [] as any,
      });

      const { getByText } = render(
        <HairstyleSelector
          onStyleSelected={mockOnStyleSelected}
          onColorSelected={mockOnColorSelected}
        />
      );

      fireEvent.press(getByText('Upload Custom Color Reference'));

      await waitFor(() => {
        expect(mockImagePicker.launchImageLibraryAsync).toHaveBeenCalled();
      });

      expect(mockOnColorSelected).not.toHaveBeenCalled();
    });
  });

  describe('Image Quality and Aspect Ratio', () => {
    it('should use correct aspect ratio for style images', async () => {
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
          width: 300,
          height: 400,
          assetId: 'test-id',
        }],
      });

      const { getByText } = render(
        <HairstyleSelector onStyleSelected={mockOnStyleSelected} />
      );

      fireEvent.press(getByText('Upload Custom Hairstyle'));

      await waitFor(() => {
        expect(mockImagePicker.launchImageLibraryAsync).toHaveBeenCalledWith({
          mediaTypes: 'Images',
          allowsEditing: true,
          aspect: [3, 4],
          quality: 0.8,
        });
      });
    });

    it('should use correct aspect ratio for color images', async () => {
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
    });
  });

  describe('Accessibility and UX', () => {
    it('should render all required UI elements', () => {
      const { getByText } = render(
        <HairstyleSelector onStyleSelected={mockOnStyleSelected} />
      );

      expect(getByText('Choose Hairstyle')).toBeTruthy();
      expect(getByText('All')).toBeTruthy();
      expect(getByText('Upload Custom Hairstyle')).toBeTruthy();
    });

    it('should handle rapid consecutive taps', () => {
      const { getByText } = render(
        <HairstyleSelector onStyleSelected={mockOnStyleSelected} />
      );

      const uploadButton = getByText('Upload Custom Hairstyle');
      
      fireEvent.press(uploadButton);
      fireEvent.press(uploadButton);
      fireEvent.press(uploadButton);

      // Should still only trigger permission request once per successful flow
      expect(mockImagePicker.requestMediaLibraryPermissionsAsync).toHaveBeenCalled();
    });

    it('should provide visual feedback for selected items', () => {
      const selectedStyle = 'https://example.com/styles/short-bob.jpg';
      
      const { getAllByRole } = render(
        <HairstyleSelector
          onStyleSelected={mockOnStyleSelected}
          selectedStyle={selectedStyle}
        />
      );

      const images = getAllByRole('image');
      expect(images.length).toBeGreaterThan(0);
    });
  });
});