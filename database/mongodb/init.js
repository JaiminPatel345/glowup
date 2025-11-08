// GrowUp MongoDB Database Initialization
// Collections for skin analysis, hair try-on history, and product recommendations

// Switch to growup database
db = db.getSiblingDB('growup');

// Create collections with validation schemas

// Skin Analysis Results Collection
db.createCollection('skinAnalysis', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['userId', 'imageUrl', 'skinType', 'issues', 'createdAt'],
      properties: {
        userId: {
          bsonType: 'string',
          description: 'User ID from PostgreSQL users table'
        },
        imageUrl: {
          bsonType: 'string',
          description: 'URL to the original uploaded image'
        },
        skinType: {
          bsonType: 'string',
          enum: ['oily', 'dry', 'combination', 'sensitive', 'normal'],
          description: 'Detected skin type'
        },
        issues: {
          bsonType: 'array',
          items: {
            bsonType: 'object',
            required: ['id', 'name', 'description', 'severity', 'causes', 'confidence'],
            properties: {
              id: { bsonType: 'string' },
              name: { bsonType: 'string' },
              description: { bsonType: 'string' },
              severity: {
                bsonType: 'string',
                enum: ['low', 'medium', 'high']
              },
              causes: {
                bsonType: 'array',
                items: { bsonType: 'string' }
              },
              highlightedImageUrl: { bsonType: 'string' },
              confidence: {
                bsonType: 'double',
                minimum: 0,
                maximum: 1
              }
            }
          }
        },
        analysisMetadata: {
          bsonType: 'object',
          properties: {
            modelVersion: { bsonType: 'string' },
            processingTime: { bsonType: 'double' },
            imageQuality: { bsonType: 'double' }
          }
        },
        createdAt: { bsonType: 'date' }
      }
    }
  }
});

// Hair Try-On History Collection
db.createCollection('hairTryOn', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['userId', 'type', 'originalMediaUrl', 'styleImageUrl', 'resultMediaUrl', 'createdAt'],
      properties: {
        userId: {
          bsonType: 'string',
          description: 'User ID from PostgreSQL users table'
        },
        type: {
          bsonType: 'string',
          enum: ['video', 'realtime'],
          description: 'Type of hair try-on processing'
        },
        originalMediaUrl: {
          bsonType: 'string',
          description: 'URL to original video or image'
        },
        styleImageUrl: {
          bsonType: 'string',
          description: 'URL to reference hairstyle image'
        },
        colorImageUrl: {
          bsonType: 'string',
          description: 'Optional URL to hair color reference'
        },
        resultMediaUrl: {
          bsonType: 'string',
          description: 'URL to processed result video/image'
        },
        processingMetadata: {
          bsonType: 'object',
          properties: {
            modelVersion: { bsonType: 'string' },
            processingTime: { bsonType: 'double' },
            framesProcessed: { bsonType: 'int' },
            originalDuration: { bsonType: 'double' }
          }
        },
        createdAt: { bsonType: 'date' }
      }
    }
  }
});

// Product Recommendations Collection
db.createCollection('productRecommendations', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['issueId', 'products', 'lastUpdated'],
      properties: {
        issueId: {
          bsonType: 'string',
          description: 'Skin issue identifier'
        },
        products: {
          bsonType: 'array',
          items: {
            bsonType: 'object',
            required: ['id', 'name', 'brand', 'price', 'rating', 'isAyurvedic'],
            properties: {
              id: { bsonType: 'string' },
              name: { bsonType: 'string' },
              brand: { bsonType: 'string' },
              price: { bsonType: 'double' },
              rating: {
                bsonType: 'double',
                minimum: 0,
                maximum: 5
              },
              imageUrl: { bsonType: 'string' },
              isAyurvedic: { bsonType: 'bool' },
              ingredients: {
                bsonType: 'array',
                items: { bsonType: 'string' }
              },
              description: { bsonType: 'string' },
              benefits: {
                bsonType: 'array',
                items: { bsonType: 'string' }
              }
            }
          }
        },
        ayurvedicProducts: {
          bsonType: 'array',
          description: 'Filtered ayurvedic products for quick access'
        },
        lastUpdated: { bsonType: 'date' }
      }
    }
  }
});

// Create indexes for performance optimization

// Skin Analysis indexes
db.skinAnalysis.createIndex({ 'userId': 1, 'createdAt': -1 });
db.skinAnalysis.createIndex({ 'skinType': 1 });
db.skinAnalysis.createIndex({ 'issues.severity': 1 });
db.skinAnalysis.createIndex({ 'createdAt': -1 });

// Hair Try-On indexes
db.hairTryOn.createIndex({ 'userId': 1, 'createdAt': -1 });
db.hairTryOn.createIndex({ 'type': 1 });
db.hairTryOn.createIndex({ 'createdAt': -1 });

// Product Recommendations indexes
db.productRecommendations.createIndex({ 'issueId': 1 });
db.productRecommendations.createIndex({ 'products.isAyurvedic': 1 });
db.productRecommendations.createIndex({ 'lastUpdated': -1 });

// Insert sample product recommendations for common skin issues
db.productRecommendations.insertMany([
  {
    issueId: 'acne',
    products: [
      {
        id: 'prod_001',
        name: 'Neem Face Wash',
        brand: 'Himalaya',
        price: 12.99,
        rating: 4.2,
        imageUrl: 'https://example.com/neem-face-wash.jpg',
        isAyurvedic: true,
        ingredients: ['Neem', 'Turmeric', 'Aloe Vera'],
        description: 'Natural face wash with antibacterial properties',
        benefits: ['Reduces acne', 'Controls oil', 'Gentle cleansing']
      },
      {
        id: 'prod_002',
        name: 'Salicylic Acid Cleanser',
        brand: 'CeraVe',
        price: 18.99,
        rating: 4.5,
        imageUrl: 'https://example.com/salicylic-cleanser.jpg',
        isAyurvedic: false,
        ingredients: ['Salicylic Acid', 'Ceramides', 'Niacinamide'],
        description: 'Gentle exfoliating cleanser for acne-prone skin',
        benefits: ['Unclogs pores', 'Reduces blackheads', 'Gentle formula']
      }
    ],
    ayurvedicProducts: [
      {
        id: 'prod_001',
        name: 'Neem Face Wash',
        brand: 'Himalaya',
        price: 12.99,
        rating: 4.2,
        imageUrl: 'https://example.com/neem-face-wash.jpg',
        isAyurvedic: true,
        ingredients: ['Neem', 'Turmeric', 'Aloe Vera'],
        description: 'Natural face wash with antibacterial properties',
        benefits: ['Reduces acne', 'Controls oil', 'Gentle cleansing']
      }
    ],
    lastUpdated: new Date()
  },
  {
    issueId: 'dark_spots',
    products: [
      {
        id: 'prod_003',
        name: 'Turmeric Brightening Serum',
        brand: 'Forest Essentials',
        price: 45.99,
        rating: 4.3,
        imageUrl: 'https://example.com/turmeric-serum.jpg',
        isAyurvedic: true,
        ingredients: ['Turmeric', 'Saffron', 'Rose Water'],
        description: 'Natural brightening serum for even skin tone',
        benefits: ['Reduces dark spots', 'Brightens skin', 'Natural ingredients']
      },
      {
        id: 'prod_004',
        name: 'Vitamin C Serum',
        brand: 'The Ordinary',
        price: 24.99,
        rating: 4.4,
        imageUrl: 'https://example.com/vitamin-c-serum.jpg',
        isAyurvedic: false,
        ingredients: ['L-Ascorbic Acid', 'Alpha Arbutin', 'Hyaluronic Acid'],
        description: 'Potent vitamin C serum for brightening',
        benefits: ['Fades dark spots', 'Antioxidant protection', 'Hydrating']
      }
    ],
    ayurvedicProducts: [
      {
        id: 'prod_003',
        name: 'Turmeric Brightening Serum',
        brand: 'Forest Essentials',
        price: 45.99,
        rating: 4.3,
        imageUrl: 'https://example.com/turmeric-serum.jpg',
        isAyurvedic: true,
        ingredients: ['Turmeric', 'Saffron', 'Rose Water'],
        description: 'Natural brightening serum for even skin tone',
        benefits: ['Reduces dark spots', 'Brightens skin', 'Natural ingredients']
      }
    ],
    lastUpdated: new Date()
  }
]);

print('MongoDB collections and sample data created successfully!');