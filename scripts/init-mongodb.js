#!/usr/bin/env node

// MongoDB Initialization Script
const { mongodb } = require('../shared/database/mongodb');

async function initializeMongoDB() {
  console.log('Initializing MongoDB collections and indexes...');
  
  try {
    const db = await mongodb.connect();
    
    // Check if collections already exist
    const collections = await db.listCollections().toArray();
    const existingCollections = collections.map(c => c.name);
    
    console.log('Existing collections:', existingCollections);
    
    // Create collections with validation if they don't exist
    const collectionsToCreate = [
      {
        name: 'skinAnalysis',
        validator: {
          $jsonSchema: {
            bsonType: 'object',
            required: ['userId', 'imageUrl', 'skinType', 'issues', 'createdAt'],
            properties: {
              userId: { bsonType: 'string' },
              imageUrl: { bsonType: 'string' },
              skinType: {
                bsonType: 'string',
                enum: ['oily', 'dry', 'combination', 'sensitive', 'normal']
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
                    severity: { bsonType: 'string', enum: ['low', 'medium', 'high'] },
                    causes: { bsonType: 'array', items: { bsonType: 'string' } },
                    highlightedImageUrl: { bsonType: 'string' },
                    confidence: { bsonType: 'double', minimum: 0, maximum: 1 }
                  }
                }
              },
              createdAt: { bsonType: 'date' }
            }
          }
        }
      },
      {
        name: 'hairTryOn',
        validator: {
          $jsonSchema: {
            bsonType: 'object',
            required: ['userId', 'type', 'originalMediaUrl', 'styleImageUrl', 'resultMediaUrl', 'createdAt'],
            properties: {
              userId: { bsonType: 'string' },
              type: { bsonType: 'string', enum: ['video', 'realtime'] },
              originalMediaUrl: { bsonType: 'string' },
              styleImageUrl: { bsonType: 'string' },
              colorImageUrl: { bsonType: 'string' },
              resultMediaUrl: { bsonType: 'string' },
              createdAt: { bsonType: 'date' }
            }
          }
        }
      },
      {
        name: 'productRecommendations',
        validator: {
          $jsonSchema: {
            bsonType: 'object',
            required: ['issueId', 'products', 'lastUpdated'],
            properties: {
              issueId: { bsonType: 'string' },
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
                    rating: { bsonType: 'double', minimum: 0, maximum: 5 },
                    isAyurvedic: { bsonType: 'bool' }
                  }
                }
              },
              lastUpdated: { bsonType: 'date' }
            }
          }
        }
      }
    ];
    
    for (const collectionConfig of collectionsToCreate) {
      if (!existingCollections.includes(collectionConfig.name)) {
        console.log(`Creating collection: ${collectionConfig.name}`);
        await db.createCollection(collectionConfig.name, {
          validator: collectionConfig.validator
        });
        console.log(`✓ Collection ${collectionConfig.name} created`);
      } else {
        console.log(`Collection ${collectionConfig.name} already exists`);
      }
    }
    
    // Create indexes
    console.log('Creating indexes...');
    
    const skinAnalysis = db.collection('skinAnalysis');
    await skinAnalysis.createIndex({ 'userId': 1, 'createdAt': -1 });
    await skinAnalysis.createIndex({ 'skinType': 1 });
    await skinAnalysis.createIndex({ 'issues.severity': 1 });
    console.log('✓ Skin analysis indexes created');
    
    const hairTryOn = db.collection('hairTryOn');
    await hairTryOn.createIndex({ 'userId': 1, 'createdAt': -1 });
    await hairTryOn.createIndex({ 'type': 1 });
    console.log('✓ Hair try-on indexes created');
    
    const productRecommendations = db.collection('productRecommendations');
    await productRecommendations.createIndex({ 'issueId': 1 });
    await productRecommendations.createIndex({ 'products.isAyurvedic': 1 });
    console.log('✓ Product recommendations indexes created');
    
    // Insert sample data if collections are empty
    const sampleData = [
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
      }
    ];
    
    const existingProducts = await productRecommendations.countDocuments();
    if (existingProducts === 0) {
      console.log('Inserting sample product data...');
      await productRecommendations.insertMany(sampleData);
      console.log('✓ Sample product data inserted');
    } else {
      console.log('Product data already exists, skipping sample data insertion');
    }
    
    console.log('MongoDB initialization completed successfully!');
    
    // Display collection statistics
    const stats = await mongodb.getCollectionStats();
    console.log('Collection statistics:', stats);
    
  } catch (error) {
    console.error('MongoDB initialization failed:', error);
    process.exit(1);
  } finally {
    await mongodb.close();
  }
}

// Run initialization if called directly
if (require.main === module) {
  initializeMongoDB();
}

module.exports = { initializeMongoDB };