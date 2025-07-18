import express, { Request, Response } from "express";
import * as UserHelper from "../controller-helpers/user-helper";
import { authenticateToken } from "../../middlewares/auth";
import { HTTP_STATUS, ROUTES } from "../../constants/index";
import { Req } from "../../interfaces";

export const userController = express.Router();

// Register route
userController.post(ROUTES.REGISTER, async (req: Request, res: Response) => {
  await UserHelper.registerUser(req.body, res);
});

// Login route
userController.post(ROUTES.LOGIN, async (req: Request, res: Response) => {
  const clientIP =
    req.headers["x-forwarded-for"] ||
    req.headers["x-real-ip"] ||
    req.headers["cf-connecting-ip"] ||
    req.socket.remoteAddress ||
    req.ip ||
    "";
  await UserHelper.loginUser(
    req.body,
    res,
    Array.isArray(clientIP) ? clientIP[0] : clientIP
  );
});

// Forgot password route
userController.post(
  ROUTES.FORGOT_PASSWORD,
  async (req: Request, res: Response) => {
    const clientIP =
      req.headers["x-forwarded-for"] ||
      req.headers["x-real-ip"] ||
      req.headers["cf-connecting-ip"] ||
      req.socket.remoteAddress ||
      req.ip ||
      "";

    const forgotPasswordResult = await UserHelper.forgotPassword(
      req.body.email,
      req.body.role,
      Array.isArray(clientIP) ? clientIP[0] : clientIP
    );
    if (forgotPasswordResult.success) {
      res
        .status(HTTP_STATUS.OK)
        .json({ message: "An email was sent for your password reset." });
    } else {
      res
        .status(HTTP_STATUS.BAD_REQUEST)
        .json({ message: forgotPasswordResult.message });
    }
  }
);

// Reset password route
userController.post(
  ROUTES.RESET_PASSWORD,
  async (req: Request, res: Response) => {
    const { token, password } = req.body;
    const resetResult = await UserHelper.resetPassword(token, password, res);

    if (resetResult.success) {
      res.status(HTTP_STATUS.OK).json({ message: resetResult.message });
    } else {
      res
        .status(HTTP_STATUS.BAD_REQUEST)
        .json({ message: resetResult.message });
    }
  }
);

// Example protected route
userController.get(
  ROUTES.ROOT,
  authenticateToken,
  async (req: Req, res: Response) => {
    await UserHelper.userDetails(req.user, res);
  }
);
