import express, { Request, Response } from "express";
import { authenticateToken } from "../../middlewares/auth";
import { ROUTES, USER_ROLES } from "../../constants/index";
import { Req } from "../../interfaces";
// agent controller helpers
import {
  actions,
  commisions,
  deals,
  docs,
  getOfferWidgets,
  newDeal,
  openAndClosedDealsCount,
} from "../controller-helpers/agent-helper";
import { role } from "../../middlewares/roles";

// agent controller
export const agentController = express.Router();
agentController.use(authenticateToken, role(USER_ROLES.AGENT));

// fetch deals of agent
agentController.get(ROUTES.DEALS, async (req: Req, res: Response) => {
  await deals(req.user, res, req.query);
});

// fetch open and closed deals count and last deal timestamp
agentController.get(ROUTES.DEALS_COUNT, async (req: Req, res: Response) => {
  await openAndClosedDealsCount(req.user, res);
});

// fetch deal and calculate the commisions
agentController.get(ROUTES.COMMISIONS, async (req: Req, res: Response) => {
  await commisions(req.user, res);
});

// fetch deal and calculate the commisions
agentController.get(ROUTES.NEW_DEAL, async (req: Req, res: Response) => {
  await newDeal(req.user, res);
});

// fetch deals and generate actions
agentController.get(ROUTES.ACTIONS, async (req: Req, res: Response) => {
  await actions(req.user, res);
});

agentController.get(ROUTES.OFFER_WIDGETS, async (req: Req, res: Response) => {
  await getOfferWidgets(req.user, res);
});

// fetch deals and extract the documents approval related data
agentController.get(ROUTES.DOCS, async (req: Req, res: Response) => {
  await docs(req.user, res, req.query);
});
