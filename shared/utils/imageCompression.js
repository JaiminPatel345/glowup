const sharp = require('sharp');
const crypto = require('crypto');
const logger = require('../configs/logger');

class ImageCompression {
  constructor() {
    this.defaultOptions = {
      maxWidth: 1024,
      maxHeight: 1024,
      quality: 85,
      format: 'jpeg',
      progressive: true
    };
  }

  /**
   * Compress and optimize image
   * @param {Buffer} imageBuffer - Input image buffer
   * @param {Object} options - Compression options
   * @returns {Promise<{buffer: Buffer, metadata: Object, hash: string}>}
   */
  async compressImage(imageBuffer, options = {}) {
    try {
      const opts = { ...this.defaultOptions, ...options };
      
      // Get original image metadata
      const originalMetadata = await sharp(imageBuffer).metadata();
      
      // Create sharp instance with optimization
      let sharpInstance = sharp(imageBuffer)
        .rotate() // Auto-rotate based on EXIF
        .resize({
          width: opts.maxWidth,
          height: opts.maxHeight,
          fit: 'inside',
          withoutEnlargement: true
        });

      // Apply format-specific optimizations
      switch (opts.format.toLowerCase()) {
        case 'jpeg':
        case 'jpg':
          sharpInstance = sharpInstance.jpeg({
            quality: opts.quality,
            progressive: opts.progressive,
            mozjpeg: true
          });
          break;
        case 'png':
          sharpInstance = sharpInstance.png({
            quality: opts.quality,
            progressive: opts.progressive,
            compressionLevel: 9,
            adaptiveFiltering: true
          });
          break;
        case 'webp':
          sharpInstance = sharpInstance.webp({
            quality: opts.quality,
            effort: 6
          });
          break;
        default:
          sharpInstance = sharpInstance.jpeg({
            quality: opts.quality,
            progressive: opts.progressive
          });
      }

      // Process the image
      const compressedBuffer = await sharpInstance.toBuffer();
      const compressedMetadata = await sharp(compressedBuffer).metadata();
      
      // Generate hash for caching
      const hash = this.generateImageHash(compressedBuffer);
      
      // Calculate compression ratio
      const compressionRatio = ((originalMetadata.size - compressedMetadata.size) / originalMetadata.size * 100).toFixed(2);
      
      logger.info(`Image compressed: ${originalMetadata.size} -> ${compressedMetadata.size} bytes (${compressionRatio}% reduction)`);
      
      return {
        buffer: compressedBuffer,
        metadata: {
          original: originalMetadata,
          compressed: compressedMetadata,
          compressionRatio: parseFloat(compressionRatio),
          format: opts.format
        },
        hash
      };
    } catch (error) {
      logger.error('Image compression failed:', error);
      throw new Error(`Image compression failed: ${error.message}`);
    }
  }

  /**
   * Generate thumbnail from image
   * @param {Buffer} imageBuffer - Input image buffer
   * @param {Object} options - Thumbnail options
   * @returns {Promise<Buffer>}
   */
  async generateThumbnail(imageBuffer, options = {}) {
    try {
      const opts = {
        width: 150,
        height: 150,
        quality: 80,
        format: 'jpeg',
        ...options
      };

      const thumbnailBuffer = await sharp(imageBuffer)
        .resize(opts.width, opts.height, {
          fit: 'cover',
          position: 'center'
        })
        .jpeg({ quality: opts.quality })
        .toBuffer();

      return thumbnailBuffer;
    } catch (error) {
      logger.error('Thumbnail generation failed:', error);
      throw new Error(`Thumbnail generation failed: ${error.message}`);
    }
  }

  /**
   * Validate image format and size
   * @param {Buffer} imageBuffer - Input image buffer
   * @param {Object} constraints - Validation constraints
   * @returns {Promise<{valid: boolean, errors: string[], metadata: Object}>}
   */
  async validateImage(imageBuffer, constraints = {}) {
    try {
      const defaultConstraints = {
        maxSize: 10 * 1024 * 1024, // 10MB
        minWidth: 100,
        minHeight: 100,
        maxWidth: 4096,
        maxHeight: 4096,
        allowedFormats: ['jpeg', 'jpg', 'png', 'webp']
      };

      const rules = { ...defaultConstraints, ...constraints };
      const metadata = await sharp(imageBuffer).metadata();
      const errors = [];

      // Check file size
      if (imageBuffer.length > rules.maxSize) {
        errors.push(`Image size ${(imageBuffer.length / 1024 / 1024).toFixed(2)}MB exceeds maximum ${(rules.maxSize / 1024 / 1024).toFixed(2)}MB`);
      }

      // Check dimensions
      if (metadata.width < rules.minWidth || metadata.height < rules.minHeight) {
        errors.push(`Image dimensions ${metadata.width}x${metadata.height} are below minimum ${rules.minWidth}x${rules.minHeight}`);
      }

      if (metadata.width > rules.maxWidth || metadata.height > rules.maxHeight) {
        errors.push(`Image dimensions ${metadata.width}x${metadata.height} exceed maximum ${rules.maxWidth}x${rules.maxHeight}`);
      }

      // Check format
      if (!rules.allowedFormats.includes(metadata.format.toLowerCase())) {
        errors.push(`Image format ${metadata.format} is not allowed. Allowed formats: ${rules.allowedFormats.join(', ')}`);
      }

      return {
        valid: errors.length === 0,
        errors,
        metadata
      };
    } catch (error) {
      logger.error('Image validation failed:', error);
      return {
        valid: false,
        errors: [`Image validation failed: ${error.message}`],
        metadata: null
      };
    }
  }

  /**
   * Generate hash for image content
   * @param {Buffer} imageBuffer - Input image buffer
   * @returns {string} - SHA256 hash
   */
  generateImageHash(imageBuffer) {
    return crypto.createHash('sha256').update(imageBuffer).digest('hex');
  }

  /**
   * Create multiple sizes for responsive images
   * @param {Buffer} imageBuffer - Input image buffer
   * @param {Array} sizes - Array of size objects {width, height, suffix}
   * @returns {Promise<Object>} - Object with different sized images
   */
  async createResponsiveImages(imageBuffer, sizes = []) {
    try {
      const defaultSizes = [
        { width: 320, height: 240, suffix: 'small' },
        { width: 640, height: 480, suffix: 'medium' },
        { width: 1024, height: 768, suffix: 'large' }
      ];

      const imageSizes = sizes.length > 0 ? sizes : defaultSizes;
      const results = {};

      for (const size of imageSizes) {
        const resizedBuffer = await sharp(imageBuffer)
          .resize(size.width, size.height, {
            fit: 'inside',
            withoutEnlargement: true
          })
          .jpeg({ quality: 85, progressive: true })
          .toBuffer();

        results[size.suffix] = {
          buffer: resizedBuffer,
          width: size.width,
          height: size.height,
          size: resizedBuffer.length
        };
      }

      return results;
    } catch (error) {
      logger.error('Responsive image creation failed:', error);
      throw new Error(`Responsive image creation failed: ${error.message}`);
    }
  }

  /**
   * Extract dominant colors from image
   * @param {Buffer} imageBuffer - Input image buffer
   * @returns {Promise<Array>} - Array of dominant colors
   */
  async extractDominantColors(imageBuffer) {
    try {
      const { dominant } = await sharp(imageBuffer)
        .resize(100, 100, { fit: 'cover' })
        .raw()
        .toBuffer({ resolveWithObject: true });

      // This is a simplified version - in production, you might want to use a more sophisticated color extraction library
      return {
        dominant: `rgb(${dominant.r}, ${dominant.g}, ${dominant.b})`,
        hex: `#${dominant.r.toString(16).padStart(2, '0')}${dominant.g.toString(16).padStart(2, '0')}${dominant.b.toString(16).padStart(2, '0')}`
      };
    } catch (error) {
      logger.error('Color extraction failed:', error);
      return null;
    }
  }
}

module.exports = new ImageCompression();