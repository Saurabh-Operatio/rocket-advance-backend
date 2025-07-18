import express, { Request, Response } from 'express';
import { authenticateToken } from '../../middlewares/auth';
import { ROUTES, USER_ROLES } from '../../constants/index';
import { Req } from '../../interfaces';

// investor controller helpers
import { deals, fundedDeals, investorStats, newDeals, newDealsCount } from '../controller-helpers/investor-helper';
import { role } from '../../middlewares/roles';

// investor controller
export const investorController = express.Router();
investorController.use(authenticateToken, role(USER_ROLES.INVESTOR));


// fetch deals of investor
investorController.get(ROUTES.DEALS, async (req: Req, res: Response) => {
    await deals(req.user, res, req.query);
  });


// fetch stats from investor deals
investorController.get(ROUTES.STATS, async (req: Req, res: Response) => {
  await investorStats(req.user, res);
});

// fetch new deals stats
investorController.get(ROUTES.NEW_DEALS_STATS, async (req: Req, res: Response) => {
  await newDealsCount(req.user, res);
});

// fetch stats from investor deals
investorController.get(ROUTES.NEW_DEALS, async (req: Req, res: Response) => {
  await newDeals(req.user, res, req.query);
});

// fetch funded deals
investorController.get(ROUTES.FUNDED_DEALS, async (req: Req, res: Response) => {
  await fundedDeals(req.user, res, req.query);
});