import { RedisClientType, createClient } from "redis";
import { EnvManager } from "../../config";
import { ENV_KEYS } from "../../constants";

export class RedisManager {
  client: RedisClientType | null = null;
  static instance: RedisManager | null = null;
  envManager = EnvManager.getInsatnce();

  constructor() {
    if (!RedisManager.instance) RedisManager.instance = this;
    return RedisManager.instance;
  }

  static getInstance() {
    return new RedisManager();
  }

  public async run() {
    this.client = createClient({
      url: `redis://${this.envManager.getEnv(
        ENV_KEYS.REDIS_HOST
      )}:${this.envManager.getEnv(ENV_KEYS.REDIS_PORT)}`,
    });

    await this.client.connect();

    // bind the useful event for connection checking and error logging
    this.client.on("connect", () => {
      console.log("Connect to redis successfully. ");
    });
    this.client.on("ready", () => {
      console.log("Ready");
    });
    this.client.on("reconnecting", () => {
      console.log("Reconnecting");
    });

    this.client.on("end", () => {
      console.log("End");
    });
    this.client.on("error", (err: Error) =>
      console.error(
        "\x1b[31m%s\x1b[0m",
        "error while connecting redis server: ",
        err.message
      )
    );
  }

  // set the string data to redis
  public async setString(key: string, data: string, ttl?: number) {
    try {
      if (!this.client) throw new Error("Redis client is null");
      const ttlGiven = ttl
        ? ttl
        : this.envManager.getEnv(ENV_KEYS.REDIS_TTL)
        ? Number(this.envManager.getEnv(ENV_KEYS.REDIS_TTL))
        : 30 * 60;
      await this.client.set(key, data, { EX: ttlGiven });
      return true;
    } catch (err) {
      console.error("Error while setting the string in redis\n", err);
      return false;
    }
  }

  // get the string data from redis
  public async getString(key: string) {
    try {
      if (!this.client) throw new Error("Redis client is null");
      const resString = (await this.client.get(key)) as string;
      return resString;
    } catch (err) {
      console.error("Error while getting the string from redis: ", err);
      return "";
    }
  }
}
