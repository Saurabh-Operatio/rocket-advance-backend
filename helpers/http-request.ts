import axios, { AxiosRequestConfig } from 'axios';
import { RequestOptions } from '../interfaces';
import { HelperResponsePOD } from '../pod';
import { ERROR_MESSAGES } from '../constants';

// Function to handle HTTP requests
export async function httpRequest(
    method: string,
    url: string,
    data: any = null,
    options: RequestOptions = {}
): Promise<HelperResponsePOD> {
    try {
        if (!method || typeof method !== 'string') {
            throw new Error(ERROR_MESSAGES.INVALID_HTTP_METHOD);
        }
 
        if (!url || typeof url !== 'string') {
            throw new Error(ERROR_MESSAGES.INVALID_URL);
        }


        /**
         * by default content-type is set to application/json
         * can be overridden by passing the custom content-type
         * in request options
         */
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            ...options.headers
        };

        const axiosConfig: AxiosRequestConfig = { method, url, headers };
        if (data) axiosConfig.data = data;
        if (options.timeout) axiosConfig.timeout = options.timeout;
        if(options.params) axiosConfig.params = options.params;

        // perform http request
        const response = await axios(axiosConfig);
        console.log(`[${method}] ${url} - ${response.status}`);
        console.log(response.data);
        
        
        return new HelperResponsePOD(null, {data: response.data, status: response.status});

    } catch (err: any) {
        console.error(`[${method}] ${url} - ${err.message}`);
        console.log(err.response.data);
        
        if (err.response) return new HelperResponsePOD(null, {data: err.response.data, status: err.response.status});
        return new HelperResponsePOD(err, null, ERROR_MESSAGES.HTTP_REQUEST);
    }
}