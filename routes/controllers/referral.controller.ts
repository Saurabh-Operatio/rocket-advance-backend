import express, { Request, Response } from 'express';
import { authenticateToken } from '../../middlewares/auth';
import { ROUTES, USER_ROLES } from '../../constants/index';
import { Req } from '../../interfaces';

// referral controller helpers
import { leadFrom, referralStats } from '../controller-helpers/referral.helper';
import { role } from '../../middlewares/roles';

// referral controller
export const referralController = express.Router();
referralController.use(authenticateToken, role(USER_ROLES.REFERRAL));


// fetch the lead form
referralController.get(ROUTES.LEAD_FORM, async (req: Req, res: Response) => {
    await leadFrom(req.user, res);
  });

// fetch the stats for referral dashboard
referralController.get(ROUTES.STATS, async (req: Req, res: Response) => {
  await referralStats(req.user, res);
});