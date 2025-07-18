import { EnvManager } from "../../config";
import { ENV_KEYS, HTTP_VERBS, SYSTEM_CALL_ERROR_CODES } from "../../constants";
import { HelperResponsePOD } from "../../pod";
import { httpRequest } from "../../helpers/http-request";
import fs from 'fs/promises';
import path from 'path';

export class AccessTokenGenerator {
    timerId: any = null;
    generatorTimer = ((1000 * 60) * 55);
    envManager: EnvManager;

    constructor() {
        this.envManager = EnvManager.getInsatnce();
    }


    public run = async () => {
        try {
            const storageFileDataResponse = await this.readStorageFile();
            if(!storageFileDataResponse.error) {
                if(storageFileDataResponse.data.isStroageFileCreated) {
                    const generatorResponse = await this.generatorCB();
                    if(generatorResponse.error) throw generatorResponse.error;
                } else {
                    const storageFileData = storageFileDataResponse.data.storageFileData;
                    const expiryTimeLeft = storageFileData.next_time - Date.now();
                    if(expiryTimeLeft > 0) this.setAccessTokenGeneratingTimer(expiryTimeLeft);
                    else {
                        const generatorResponse = await this.generatorCB();
                        if(generatorResponse.error) throw generatorResponse.error;
                    }
                }

            } else throw storageFileDataResponse.error;
        } catch (err) {
            console.error("Error while starting the refresh token generator service: ", err);
            return new HelperResponsePOD(err);
        }
    }

    /**
     * access token generating timer callback 
     */
    public generatorCB = async () => {
        try {
 
            const generateAndSetResponse = await this.generateAndSetAccessToken();
            if(generateAndSetResponse?.error) throw generateAndSetResponse.error;

            const generatorResponse = this.setAccessTokenGeneratingTimer();

            // throw error if any
            if(generatorResponse.error) throw generatorResponse.error;

            // set the generator timer id for cancel the generator
            this.timerId = generatorResponse.data;

            // write the time point in miliseond before 5 mintue of access token expiry
            const _nextTime = Date.now() + this.generatorTimer;
            const storageFileJson = JSON.stringify({next_time: _nextTime});
            const writeResponse = await this.createOrWriteStroageFile(storageFileJson);

            // if someting went wrong while writing to file throw the error
            if(writeResponse.error) throw writeResponse.error;
            return new HelperResponsePOD(null);
        } catch (err) {
            console.error('Error while generating the access token: ', err);

            // clear the timer if any error occured
            if (this.timerId) clearTimeout(this.timerId);
            return new HelperResponsePOD(err);
        }
    }

    /**
     * generate and set the access token 
     */
    public generateAndSetAccessToken = async () => {
        try {
            const accessTokenResponse = await this.generateAccessTokens();
            if(!accessTokenResponse?.error) {
            const accessToken = accessTokenResponse?.data;
            this.envManager.setEnv(ENV_KEYS.ZOHO_ACCESS_TOKEN, accessToken);
            } else throw accessTokenResponse.error;
            return new HelperResponsePOD(null);
        } catch (err) {
            return new HelperResponsePOD(err);
        }
    }

    /**
     * set interval for generating the the access token before 5min of expiry
     */
    public setAccessTokenGeneratingTimer = (timer: number = 0) => {
        try {
            const _timeInMilli = (!!timer) ? timer : this.generatorTimer
            console.log("Access token is refreshed after ", ((_timeInMilli/1000)/60).toFixed(2), "Min");
            const timerId = setTimeout(this.generatorCB, _timeInMilli);
            return new HelperResponsePOD(null, timerId);
        } catch (err) {
            return new HelperResponsePOD(err);
        }
    }

    /**
     * generate the zoho access token using the refresh token
     * @returns 
     */
    public generateAccessTokens = async () => {
        try {
            const baseUrl = this.envManager.getEnv(ENV_KEYS.ZOHO_ACCESS_TOKEN_GENERTOR_URL) || '';
            const clientId = this.envManager.getEnv(ENV_KEYS.ZOHO_CLIENT_ID);
            const clientSecret = this.envManager.getEnv(ENV_KEYS.ZOHO_CLIENT_SECRET);
            const refreshToken = this.envManager.getEnv(ENV_KEYS.ZOHO_REFRESH_TOKEN);
            const redirectionUrl = this.envManager.getEnv(ENV_KEYS.REDIRECTION_URL);

            const accessTokenGeneratorQuery = {
                refresh_token: refreshToken,
                client_id: clientId,
                client_secret: clientSecret,
                redirect_uri: redirectionUrl,
                grant_type: 'refresh_token',
                scope: 'ZohoCRM.modules.all'
            };
            

            const accessTokenResponse = await httpRequest(HTTP_VERBS.POST, baseUrl, null, { params: accessTokenGeneratorQuery });
            if (accessTokenResponse.data?.data) {
                const zohoAccessToken = accessTokenResponse.data.data.access_token;
                return new HelperResponsePOD(null, zohoAccessToken);

            }

        } catch (err) {
            console.log("Error while generating the zoho access token: ", err);
            return new HelperResponsePOD(err);
        }
    }

    /**
     * create the stroage file if it doesn't exist 
     */
    public createOrWriteStroageFile = async (stroageJson: string = '') => {
        try {
            const _storageJson = stroageJson ? stroageJson : JSON.stringify({ next_time: 0});
            await fs.writeFile(path.join(__dirname, 'storage.json'), _storageJson, 'utf-8');
            return new HelperResponsePOD(null, _storageJson);
        } catch (err) {
            return new HelperResponsePOD(err);
        }
    }


    /**
     * read stroage.json for data related to application
     */
    public readStorageFile = async () => {
        try {
            const storageJson = await fs.readFile(path.join(__dirname, 'storage.json'), 'utf-8');
            const storageFileData = JSON.parse(storageJson);
            return new HelperResponsePOD(null, { isStroageFileCreated: false, storageFileData });
        } catch (err: any) {
            if (err.code === SYSTEM_CALL_ERROR_CODES.ENOENT) {
                const createHelperResponse = await this.createOrWriteStroageFile();
                if (!createHelperResponse.error)
                    return new HelperResponsePOD(null, { isStroageFileCreated: true, storageFileData: JSON.parse(createHelperResponse.data) });
                else return createHelperResponse;

            }
            return new HelperResponsePOD(err);
        }
    }
}