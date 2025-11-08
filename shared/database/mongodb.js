// MongoDB Database Connection Utility
const { MongoClient } = require('mongodb');

class MongoDBConnection {
  constructor() {
    this.client = null;
    this.db = null;
  }

  async connect() {
    if (this.client && this.db) {
      return this.db;
    }

    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
    const dbName = process.env.MONGODB_DB || 'growup';

    const options = {
      maxPoolSize: parseInt(process.env.MONGODB_MAX_POOL_SIZE) || 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      bufferMaxEntries: 0,
      useUnifiedTopology: true,
    };

    try {
      this.client = new MongoClient(uri, options);
      await this.client.connect();
      this.db = this.client.db(dbName);
      
      // Test connection
      await this.db.admin().ping();
      console.log('MongoDB connected successfully');
      
      return this.db;
    } catch (error) {
      console.error('MongoDB connection failed:', error);
      throw error;
    }
  }

  async getCollection(collectionName) {
    if (!this.db) {
      await this.connect();
    }
    return this.db.collection(collectionName);
  }

  async close() {
    if (this.client) {
      await this.client.close();
      this.client = null;
      this.db = null;
      console.log('MongoDB connection closed');
    }
  }

  async checkConnection() {
    try {
      if (!this.db) {
        await this.connect();
      }
      await this.db.admin().ping();
      return { connected: true, timestamp: new Date() };
    } catch (error) {
      return { connected: false, error: error.message };
    }
  }

  // Collection-specific methods
  async getSkinAnalysisCollection() {
    return this.getCollection('skinAnalysis');
  }

  async getHairTryOnCollection() {
    return this.getCollection('hairTryOn');
  }

  async getProductRecommendationsCollection() {
    return this.getCollection('productRecommendations');
  }

  // Utility methods for common operations
  async insertSkinAnalysis(analysisData) {
    const collection = await this.getSkinAnalysisCollection();
    const result = await collection.insertOne({
      ...analysisData,
      createdAt: new Date()
    });
    return result;
  }

  async findSkinAnalysisByUserId(userId, limit = 10) {
    const collection = await this.getSkinAnalysisCollection();
    const results = await collection
      .find({ userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();
    return results;
  }

  async insertHairTryOn(hairTryOnData) {
    const collection = await this.getHairTryOnCollection();
    const result = await collection.insertOne({
      ...hairTryOnData,
      createdAt: new Date()
    });
    return result;
  }

  async findHairTryOnByUserId(userId, limit = 10) {
    const collection = await this.getHairTryOnCollection();
    const results = await collection
      .find({ userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();
    return results;
  }

  async getProductRecommendations(issueId) {
    const collection = await this.getProductRecommendationsCollection();
    const result = await collection.findOne({ issueId });
    return result;
  }

  async updateProductRecommendations(issueId, products) {
    const collection = await this.getProductRecommendationsCollection();
    const result = await collection.updateOne(
      { issueId },
      {
        $set: {
          products,
          ayurvedicProducts: products.filter(p => p.isAyurvedic),
          lastUpdated: new Date()
        }
      },
      { upsert: true }
    );
    return result;
  }

  // Health check and statistics
  async getCollectionStats() {
    if (!this.db) {
      await this.connect();
    }

    const stats = {};
    const collections = ['skinAnalysis', 'hairTryOn', 'productRecommendations'];
    
    for (const collectionName of collections) {
      try {
        const collection = this.db.collection(collectionName);
        const count = await collection.countDocuments();
        stats[collectionName] = { documentCount: count };
      } catch (error) {
        stats[collectionName] = { error: error.message };
      }
    }
    
    return stats;
  }
}

// Singleton instance
const mongoConnection = new MongoDBConnection();

module.exports = {
  MongoDBConnection,
  mongodb: mongoConnection
};