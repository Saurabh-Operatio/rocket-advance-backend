import e, { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { HTTP_STATUS, MESSAGES } from '../constants/index';
import { Req } from '../interfaces';
import User from '../schemas/user';


/**
 * 
 * @param req incoming request
 * @param res sent the response to client
 * @param next function for calling the next middleware or route handler in the middleware chain
 * @returns void
 */
export const authenticateToken = async (req: Req, res: Response, next: NextFunction) => {
  const token = req.headers['authorization'] as string;
  if (!token) {
    return res.status(HTTP_STATUS.UNAUTHORIZED).json({ message: MESSAGES.UNAUTHORIZED });
  }

  try {
    const jwtSecret = process.env.JWT_SECRET;
    if(!jwtSecret) throw new Error("Jwt Secret is missing for decryption of token");
    const user:any = jwt.verify(token, process.env.JWT_SECRET || '');
    
    const _user = await User.findOne({email: user.email, role: user.role});
    if(!_user) return res.status(HTTP_STATUS.NOT_FOUND).json({message: MESSAGES.USER_NOT_FOUND});

    // set the current user session for further processing request
    req.user = {...user, internal_id : _user?.internal_id};
    next();
  } catch (error: any) {

    // parse the error and check for expiration type error
    try {
      const parseError = JSON.parse(JSON.stringify(error));
      
      if(parseError?.name === 'TokenExpiredError') 
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({ message: MESSAGES.INVALID_TOKEN }); 
      else if(parseError?.name === 'JsonWebTokenError')
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({ message: MESSAGES.INVALID_TOKEN }); 
      else throw error;
    } catch (err) {
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: MESSAGES.INTERNAL_SERVER_ERROR }); 
    }
  }
};
