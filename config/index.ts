import path from "path";
import {config} from "dotenv";
import { ENVIRONMENTS, ERROR_MESSAGES, MESSAGES } from "../constants";
import { HelperResponsePOD } from "../pod";
import { HelperResponse } from "../interfaces";


export class EnvManager {
    envs: {[key: string]: string | undefined} = {};
    static instance:EnvManager;

    constructor() {
        if(!EnvManager.instance) { 
            EnvManager.loadEnvs();
            EnvManager.instance = this;
            this.envs = {...process.env};
        }
        
        return EnvManager.instance;
    }

    static getInsatnce = () => {
        if(!EnvManager.instance) new EnvManager();
        return EnvManager.instance;
    }

    getEnv = (key: string) => {
        return this.envs[key];
    }

    setEnv = (key: string, value: string) => {
        this.envs[key] = value;
    }

    static loadEnvs = (): HelperResponse => {
        try {
            const loadEnv = Number(process.env.LoadEnvOff);
            if(loadEnv) {
                return new HelperResponsePOD(null, null, MESSAGES.ENVS_LOADED_BY_OS);
            }
    
            const env = process.env.ENV || ENVIRONMENTS.DEVELOPMENT;
            console.log(`Enviroment ${env}`);
    
            // load the env vars according to passed environment by deafult development env is loaded
            config({path: path.join(__dirname, `/${env}.env`)});
            return new HelperResponsePOD(null, null, MESSAGES.ENVS_LOADED); 
        } catch (err: any) {
            console.error("Error while loading environment variables:\n", err);
            return new HelperResponsePOD(err, null, ERROR_MESSAGES.ENV_LOAD);
        }
    };
};