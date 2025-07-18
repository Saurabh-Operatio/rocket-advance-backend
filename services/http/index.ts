import express from "express";
import cors from "cors";
import { userController } from "../../routes/controllers/user-controller";
import { HTTP_STATUS, MESSAGES, ROUTES } from "../../constants";
import { Request, Response } from "express";
import { agentController } from "../../routes/controllers/agent-controller";
import { brokerController } from "../../routes/controllers/broker-controller";
import { investorController } from "../../routes/controllers/investor-controller";
import { referralController } from "../../routes/controllers/referral.controller";

class App {
  private app: express.Application;

  constructor() {
    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
  }

  private setupMiddleware() {
    this.app.use(cors({}));
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: false }));
  }

  private setupRoutes() {
    this.app.use(ROUTES.API.concat(ROUTES.USER), userController);
    this.app.use(ROUTES.API.concat(ROUTES.AGENT), agentController);
    this.app.use(ROUTES.API.concat(ROUTES.BROKER), brokerController);
    this.app.use(ROUTES.API.concat(ROUTES.INVESTOR), investorController);
    this.app.use(ROUTES.API.concat(ROUTES.REFERRAL), referralController);
    this.app.all("*", (_: Request, res: Response) => {
      res
        .status(HTTP_STATUS.NOT_FOUND)
        .json({ message: MESSAGES.ROUTE_NOT_FOUND });
    });
  }

  async run() {
    const port = process.env.PORT ? parseInt(process.env.PORT) : 3000;

    this.app.listen(port, "0.0.0.0", () => {
      console.log(`Server is running on http://localhost:${port}`);
    });
  }

  getInstance() {
    return this.app;
  }
}

export default App;
