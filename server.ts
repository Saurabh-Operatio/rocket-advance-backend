import { EnvManager } from "./config"
import App from './services/http/index';
import Database from './services/database/index';
import { AccessTokenGenerator } from "./services/cron/refresh-token-generator";
import { RedisManager } from "./services/cache/cache.redis";

const mongodbOptions = {
  reconnectTries: Number.MAX_VALUE, // Number of attempts to reconnect (-1 means infinite retries)
  reconnectInterval: 5000, // Time in milliseconds between attempts
};

class Server {
  private database: Database;
  private app: App;
  private accessTokenService: AccessTokenGenerator;
  private cacheManager: RedisManager;

  constructor() {
    this.database = new Database();
    this.app = new App();
    this.accessTokenService = new AccessTokenGenerator();
    this.cacheManager = new RedisManager();
  }

  async run() {
    // load the enviroment vars
    new EnvManager();
    
    // start sevices
    await this.database.run();
    await this.cacheManager.run();
    await this.app.run();
    await this.accessTokenService.run();
  }
}

// Run the server
new Server().run();