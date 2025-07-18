import express, { Request, Response } from 'express';
import { authenticateToken } from '../../middlewares/auth';
import { ROUTES, USER_ROLES } from '../../constants/index';
import { Req } from '../../interfaces';

// broker controller helpers
import { actions, brokerDetails, closedAndExistingDealsCount, commissionAdvanced, deals } from '../controller-helpers/broker-helper';
import { role } from '../../middlewares/roles';

// broker controller
export const brokerController = express.Router();
brokerController.use(authenticateToken, role(USER_ROLES.BROKER, USER_ROLES.BROKER_ADMIN));


brokerController.get(ROUTES.ACTIONS, async (req: Req, res: Response) => {
  await actions(req.user, res);
})


// fetch deals of broker
brokerController.get(ROUTES.DEALS, async (req: Req, res: Response) => {
    await deals(req.user, res, req.query);
  });

// fetch broker details
brokerController.get(ROUTES.ROOT, async (req: Req, res: Response) => {
    await brokerDetails(req.user, res);
  });

// fetch existing and closed deals
brokerController.get(ROUTES.DEALS_STATS, async (req: Req, res: Response) => {
  await closedAndExistingDealsCount(req.user, res);
});

// fetch the commission advanced and week based commission
brokerController.get(ROUTES.COMMISSION_ADVANCED, async (req: Req, res: Response) => {
  await commissionAdvanced(req.user, res);
})

