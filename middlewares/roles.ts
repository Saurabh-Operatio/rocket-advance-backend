import { NextFunction,Request, Response } from "express"
import { HTTP_STATUS, MESSAGES } from "../constants";
import { Req } from "../interfaces";

export const role = (...roles: string[]) => {
    return (req: Req, res: Response, next: NextFunction) => {
        try {
            for(const role of roles) 
                if(req.user?.role === role) return next();
            
            return res.status(HTTP_STATUS.UNAUTHORIZED).json({ message: MESSAGES.UNAUTHORIZED });
        } catch (err) {
            return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: MESSAGES.INTERNAL_SERVER_ERROR }); 
        }
    }
}