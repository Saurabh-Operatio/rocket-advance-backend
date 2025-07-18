import { HelperResponse } from "../interfaces";

export class HelperResponsePOD implements HelperResponse {
    error: any;
    message?: string;
    data?: any;
    statusCode?: number;

    constructor(error: any, data:any=null, message='', statusCode=-1) {
        this.error = error;
        this.data = data;
        this.message = message;
        this.statusCode = statusCode;
    }
}