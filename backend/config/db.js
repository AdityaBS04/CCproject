const mongoose = require('mongoose');
const { logger } = require('../utils/logger');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/serverless', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    logger.info(`MongoDB Connected: ${conn.connection.host}`);
    
    // Create indexes for better query performance
    await mongoose.connection.db.collection('functions').createIndex({ name: 1 }, { unique: true });
    await mongoose.connection.db.collection('functions').createIndex({ route: 1 }, { unique: true });
    await mongoose.connection.db.collection('metrics').createIndex({ functionId: 1, timestamp: -1 });
    
    logger.info('Database indexes created successfully');
  } catch (error) {
    logger.error(`Error connecting to database: ${error.message}`);
    process.exit(1);
  }
};

module.exports = { connectDB };