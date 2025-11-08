const cloudinary = require('cloudinary').v2;
const logger = require('../configs/logger');

class CDNService {
  constructor() {
    this.isConfigured = false;
    this.configure();
  }

  configure() {
    try {
      cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
        secure: true
      });

      this.isConfigured = !!(
        process.env.CLOUDINARY_CLOUD_NAME &&
        process.env.CLOUDINARY_API_KEY &&
        process.env.CLOUDINARY_API_SECRET
      );

      if (this.isConfigured) {
        logger.info('Cloudinary CDN configured successfully');
      } else {
        logger.warn('Cloudinary CDN not configured - missing environment variables');
      }
    } catch (error) {
      logger.error('Failed to configure Cloudinary CDN:', error);
      this.isConfigured = false;
    }
  }

  /**
   * Upload image to CDN
   * @param {Buffer|string} imageData - Image buffer or base64 string
   * @param {Object} options - Upload options
   * @returns {Promise<Object>} - Upload result with URLs
   */
  async uploadImage(imageData, options = {}) {
    if (!this.isConfigured) {
      throw new Error('CDN service not configured');
    }

    try {
      const defaultOptions = {
        folder: 'growup',
        resource_type: 'image',
        format: 'auto',
        quality: 'auto:good',
        fetch_format: 'auto',
        flags: 'progressive',
        transformation: [
          { quality: 'auto:good' },
          { fetch_format: 'auto' }
        ]
      };

      const uploadOptions = { ...defaultOptions, ...options };

      // Convert buffer to base64 if needed
      let uploadData = imageData;
      if (Buffer.isBuffer(imageData)) {
        uploadData = `data:image/jpeg;base64,${imageData.toString('base64')}`;
      }

      const result = await cloudinary.uploader.upload(uploadData, uploadOptions);

      logger.info(`Image uploaded to CDN: ${result.public_id}`);

      return {
        publicId: result.public_id,
        url: result.secure_url,
        originalUrl: result.url,
        width: result.width,
        height: result.height,
        format: result.format,
        size: result.bytes,
        etag: result.etag,
        version: result.version,
        // Generate responsive URLs
        responsive: this.generateResponsiveUrls(result.public_id),
        // Generate optimized URLs for different use cases
        optimized: this.generateOptimizedUrls(result.public_id)
      };
    } catch (error) {
      logger.error('CDN upload failed:', error);
      throw new Error(`CDN upload failed: ${error.message}`);
    }
  }

  /**
   * Upload video to CDN
   * @param {Buffer|string} videoData - Video buffer or file path
   * @param {Object} options - Upload options
   * @returns {Promise<Object>} - Upload result with URLs
   */
  async uploadVideo(videoData, options = {}) {
    if (!this.isConfigured) {
      throw new Error('CDN service not configured');
    }

    try {
      const defaultOptions = {
        folder: 'growup/videos',
        resource_type: 'video',
        format: 'mp4',
        quality: 'auto:good',
        transformation: [
          { quality: 'auto:good' },
          { format: 'mp4' }
        ]
      };

      const uploadOptions = { ...defaultOptions, ...options };

      const result = await cloudinary.uploader.upload(videoData, uploadOptions);

      logger.info(`Video uploaded to CDN: ${result.public_id}`);

      return {
        publicId: result.public_id,
        url: result.secure_url,
        originalUrl: result.url,
        width: result.width,
        height: result.height,
        format: result.format,
        duration: result.duration,
        size: result.bytes,
        etag: result.etag,
        version: result.version,
        // Generate different quality versions
        qualities: this.generateVideoQualities(result.public_id)
      };
    } catch (error) {
      logger.error('CDN video upload failed:', error);
      throw new Error(`CDN video upload failed: ${error.message}`);
    }
  }

  /**
   * Generate responsive image URLs
   * @param {string} publicId - Cloudinary public ID
   * @returns {Object} - Object with different sized URLs
   */
  generateResponsiveUrls(publicId) {
    const baseTransformation = { quality: 'auto:good', fetch_format: 'auto' };

    return {
      thumbnail: cloudinary.url(publicId, {
        ...baseTransformation,
        width: 150,
        height: 150,
        crop: 'fill',
        gravity: 'face'
      }),
      small: cloudinary.url(publicId, {
        ...baseTransformation,
        width: 320,
        height: 240,
        crop: 'fit'
      }),
      medium: cloudinary.url(publicId, {
        ...baseTransformation,
        width: 640,
        height: 480,
        crop: 'fit'
      }),
      large: cloudinary.url(publicId, {
        ...baseTransformation,
        width: 1024,
        height: 768,
        crop: 'fit'
      }),
      xlarge: cloudinary.url(publicId, {
        ...baseTransformation,
        width: 1920,
        height: 1080,
        crop: 'fit'
      })
    };
  }

  /**
   * Generate optimized URLs for different use cases
   * @param {string} publicId - Cloudinary public ID
   * @returns {Object} - Object with optimized URLs
   */
  generateOptimizedUrls(publicId) {
    return {
      // High quality for analysis
      analysis: cloudinary.url(publicId, {
        quality: 'auto:best',
        format: 'auto',
        flags: 'progressive'
      }),
      // Compressed for mobile
      mobile: cloudinary.url(publicId, {
        quality: 'auto:low',
        format: 'auto',
        width: 640,
        crop: 'fit',
        flags: 'progressive'
      }),
      // Blurred placeholder
      placeholder: cloudinary.url(publicId, {
        quality: 'auto:low',
        format: 'auto',
        width: 50,
        blur: '1000',
        crop: 'fit'
      }),
      // Face detection crop
      face: cloudinary.url(publicId, {
        quality: 'auto:good',
        format: 'auto',
        width: 400,
        height: 400,
        crop: 'fill',
        gravity: 'face'
      })
    };
  }

  /**
   * Generate video quality variants
   * @param {string} publicId - Cloudinary public ID
   * @returns {Object} - Object with different quality URLs
   */
  generateVideoQualities(publicId) {
    return {
      low: cloudinary.url(publicId, {
        resource_type: 'video',
        quality: 'auto:low',
        format: 'mp4',
        width: 480,
        crop: 'scale'
      }),
      medium: cloudinary.url(publicId, {
        resource_type: 'video',
        quality: 'auto:good',
        format: 'mp4',
        width: 720,
        crop: 'scale'
      }),
      high: cloudinary.url(publicId, {
        resource_type: 'video',
        quality: 'auto:best',
        format: 'mp4',
        width: 1080,
        crop: 'scale'
      }),
      // Thumbnail from video
      thumbnail: cloudinary.url(publicId, {
        resource_type: 'video',
        format: 'jpg',
        width: 300,
        height: 200,
        crop: 'fill',
        start_offset: '1s'
      })
    };
  }

  /**
   * Delete asset from CDN
   * @param {string} publicId - Cloudinary public ID
   * @param {string} resourceType - 'image' or 'video'
   * @returns {Promise<Object>} - Deletion result
   */
  async deleteAsset(publicId, resourceType = 'image') {
    if (!this.isConfigured) {
      throw new Error('CDN service not configured');
    }

    try {
      const result = await cloudinary.uploader.destroy(publicId, {
        resource_type: resourceType
      });

      logger.info(`Asset deleted from CDN: ${publicId}`);
      return result;
    } catch (error) {
      logger.error('CDN deletion failed:', error);
      throw new Error(`CDN deletion failed: ${error.message}`);
    }
  }

  /**
   * Get asset details
   * @param {string} publicId - Cloudinary public ID
   * @param {string} resourceType - 'image' or 'video'
   * @returns {Promise<Object>} - Asset details
   */
  async getAssetDetails(publicId, resourceType = 'image') {
    if (!this.isConfigured) {
      throw new Error('CDN service not configured');
    }

    try {
      const result = await cloudinary.api.resource(publicId, {
        resource_type: resourceType
      });

      return {
        publicId: result.public_id,
        url: result.secure_url,
        format: result.format,
        width: result.width,
        height: result.height,
        size: result.bytes,
        createdAt: result.created_at,
        etag: result.etag,
        version: result.version
      };
    } catch (error) {
      logger.error('Failed to get asset details:', error);
      throw new Error(`Failed to get asset details: ${error.message}`);
    }
  }

  /**
   * Generate signed upload URL for direct client uploads
   * @param {Object} options - Upload options
   * @returns {Object} - Signed upload parameters
   */
  generateSignedUploadUrl(options = {}) {
    if (!this.isConfigured) {
      throw new Error('CDN service not configured');
    }

    const timestamp = Math.round(new Date().getTime() / 1000);
    const uploadOptions = {
      timestamp,
      folder: 'growup',
      ...options
    };

    const signature = cloudinary.utils.api_sign_request(uploadOptions, process.env.CLOUDINARY_API_SECRET);

    return {
      url: `https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload`,
      params: {
        ...uploadOptions,
        signature,
        api_key: process.env.CLOUDINARY_API_KEY
      }
    };
  }

  /**
   * Health check for CDN service
   * @returns {Promise<Object>} - Health status
   */
  async healthCheck() {
    if (!this.isConfigured) {
      return {
        status: 'unhealthy',
        message: 'CDN service not configured'
      };
    }

    try {
      // Test API connectivity
      await cloudinary.api.ping();
      return {
        status: 'healthy',
        message: 'CDN service is operational'
      };
    } catch (error) {
      logger.error('CDN health check failed:', error);
      return {
        status: 'unhealthy',
        message: error.message
      };
    }
  }
}

module.exports = new CDNService();