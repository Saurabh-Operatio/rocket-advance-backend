import mongoose from 'mongoose';
import { EnvManager } from '../../config';
import { ENV_KEYS } from '../../constants';

class Database {
  /**
   * connect the mongo database
   */
  async run() {
    // if mongodb uri string not found in env then try with local loopback
    const dbURI = EnvManager.getInsatnce().getEnv(ENV_KEYS.MONGO_URI) || "mongodb://localhost:27017";  
    
    this._bindMongoEvents();
    this._bindProcessTerminationEvents();

    try {
      await mongoose.connect(dbURI);
    } catch (error) {
      console.error('Error connecting to MongoDB:', error);
    }
  }

  /**
   * retry database connection after error while creating connection
   * @param dbUri string
   * @returns void
   */
  private async connectionRetry(dbUri:string) {
    if (mongoose.connection.readyState !== 0) {
      console.log('Already attempting to reconnect to MongoDB');
      return;
    }

    await mongoose.connect(dbUri);
  }

  /**
   * bind mongo connection related events
   */
  private _bindMongoEvents() {
    mongoose.connection.on('connected', () => {
      console.log('Connected to MongoDB');
    });

    mongoose.connection.on('error', (err) => {
      console.error('MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', async () => {
      console.log('MongoDB disconnected.');
      // await this.connectionRetry(dbURI);
    });
  } 

  /**
   * bind the events related the process termination signals (SIGINT)
   */
  private _bindProcessTerminationEvents() {

        // close the connection before service termination (for signal termination)
        process.on('SIGINT', async () => {
          await mongoose.connection.close();
          console.log('MongoDB connection closed due to process termination');
          process.exit(0);
      });
  }
}

export default Database;
