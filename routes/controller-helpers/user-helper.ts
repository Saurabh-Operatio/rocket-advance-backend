import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import UserModel from "../../schemas/user";
import {
  HTTP_STATUS,
  MESSAGES,
  MESSAGE_PLACEHOLDER,
  MESSAGE_TEMPLATES,
} from "../../constants";
import { Response } from "express";
import { UserLogin, UserRegister } from "../../interfaces";
import { getUserFromZohoCrm } from "../../helpers/zoho";
import { createMessageFromTemplate } from "../../helpers/utility";
import { sendPasswordResetEmail } from "../../helpers/mail";
import { RedisManager } from "../../services/cache/cache.redis";

// redis manager instance
const redisManager = RedisManager.getInstance();

const LOGIN_ATTEMPTS_THRESHOLD = 5;

const generateToken = (payload: any, expiresIn: string) => {
  return jwt.sign(payload, process.env.JWT_SECRET || "", { expiresIn });
};

const verifyToken = (token: string) => {
  return jwt.verify(token, process.env.JWT_SECRET || "");
};

// new user registeration helper
export const registerUser = async (payload: UserRegister, res: Response) => {
  try {
    if (
      !payload?.email ||
      !payload?.password ||
      !payload?.role ||
      !payload?.fullname
    )
      return res
        .status(HTTP_STATUS.BAD_REQUEST)
        .json({ message: "User details is not valid!" });

    const { email, password, role, fullname } = payload;

    // Check if the user already exists
    const existingUser = await UserModel.findOne({ email, role });
    if (existingUser) {
      return res
        .status(HTTP_STATUS.CONFLICT)
        .json({ message: MESSAGES.USER_EXISTS });
    }

    //check if admin allowed user to register
    const contactSearchResponse = await getUserFromZohoCrm(email, role);

    if (contactSearchResponse.statusCode === HTTP_STATUS.NOT_FOUND) {
      // const resMessage = createMessageFromTemplate(MESSAGE_TEMPLATES.NO_PERM_REGISTER, MESSAGE_PLACEHOLDER.USERPLACEHOLDER, role);
      const resMessage = MESSAGE_TEMPLATES.NO_USER_IN_CRM;
      return res.status(HTTP_STATUS.NOT_FOUND).json({ message: resMessage });
    }

    const internal_id = contactSearchResponse.data.id;
    // const internal_id = 1;
    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create and save the user
    const user = new UserModel({
      email,
      password: hashedPassword,
      role,
      fullname,
      internal_id,
    });
    await user.save();

    res
      .status(HTTP_STATUS.CREATED)
      .json({ message: MESSAGES.REGISTRATION_SUCCESS });
  } catch (error) {
    console.error(error);
    res
      .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
      .json({ message: MESSAGES.INTERNAL_SERVER_ERROR });
  }
};

// login helper for existing user
export const loginUser = async (
  payload: UserLogin,
  res: Response,
  ip: string
) => {
  try {
    const { email, password, role } = payload;
    const cacheLoginAtempt = await redisManager.getString(`${ip}:login`);
    const loginAttempts = cacheLoginAtempt ? parseInt(cacheLoginAtempt) : 0;
    if (loginAttempts >= LOGIN_ATTEMPTS_THRESHOLD) {
      // Set block duration for IP
      return res.status(HTTP_STATUS.TOO_MANY_REQUESTS).json({
        message: "You have exceeded the number of login attempts. Please try again in 24 hours",
      });
    }
    // Check if the user exists
    const user = await UserModel.findOne({ email, role });
    if (!user) {
      increaseLoginAttempt(ip, loginAttempts + 1);
      res
        .status(HTTP_STATUS.UNAUTHORIZED)
        .json({ message: MESSAGES.INVALID_CREDENTIALS });
      return;
    }

    // Check the password
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      increaseLoginAttempt(ip, loginAttempts + 1);
      res
        .status(HTTP_STATUS.UNAUTHORIZED)
        .json({ message: MESSAGES.INVALID_CREDENTIALS });
      return;
    }
    await redisManager.setString(`${ip}:login`, "0");

    // Generate JWT token
    const token = generateToken({ email: user.email, role: user.role }, "1h");

    res.status(HTTP_STATUS.OK).json({ message: MESSAGES.LOGIN_SUCCESS, token });
  } catch (error) {
    console.error(error);
    res
      .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
      .json({ message: MESSAGES.INTERNAL_SERVER_ERROR });
  }
};

// get the user details
export const userDetails = async (userData: UserLogin, res: Response) => {
  try {
    const { email } = userData;
    const user = await UserModel.findOne({ email }).select([
      "fullname",
      "email",
      "role",
    ]);
    if (!user)
      return res
        .status(HTTP_STATUS.NOT_FOUND)
        .json({ message: "User details not found." });

    res.status(HTTP_STATUS.OK).json({ user });
  } catch (error) {
    console.error(error);
    res
      .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
      .json({ message: MESSAGES.INTERNAL_SERVER_ERROR });
  }
};
export const forgotPassword = async (
  email: string,
  role: string,
  ip: string
) => {
  try {
    // Check if forgot password attempts exceeded threshold
    const cacheLoginAtempt = await redisManager.getString(`${ip}:forgot`);
    const loginAttempts = cacheLoginAtempt ? parseInt(cacheLoginAtempt) : 0;
    if (loginAttempts >= LOGIN_ATTEMPTS_THRESHOLD) {
      return {
        success: false,
        message:
          "Forgot password functionality can be called only 5 times per day, after, the user IP gets blocked for 24 hours.",
      };
    }

    // Generate JWT token with email payload and expiration time
    const token = generateToken({ email, role }, "24h");

    // Send password reset email with JWT token embedded in the link
    const resetLink = `https://portal.rocketadvance.ca/reset-password?token=${token}`;
    const user = await UserModel.findOne({ email, role });
    // console.log(user);

    if (!user) {
      return { success: false, message: "User not found." };
    }

    await sendPasswordResetEmail(email, resetLink);
    await redisManager.setString(`${ip}:login`, "0", 86400);

    await redisManager.setString(`${ip}:forgot`, loginAttempts + 1 + "", 86400);

    // Reset forgot password attempts upon successful request
    return {
      success: true,
      message: "An email was sent for your password reset.",
    };
  } catch (error) {
    console.error(error);
    return {
      success: false,
      message: "An error occurred while processing your request.",
    };
  }
};

export const resetPassword = async (
  token: string,
  newPassword: string,
  res: Response
) => {
  try {
    // Verify the token
    const decodedToken = jwt.verify(token, process.env.JWT_SECRET || "") as {
      email: string;
      role: string;
    };
    const { email, role } = decodedToken;

    // Find the user by email
    const user = await UserModel.findOne({ email, role });
    if (!user) {
      return { success: false, message: "User not found." };
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update the user's password
    await UserModel.findByIdAndUpdate(user._id, { password: hashedPassword });

    return { success: true, message: "Password reset successfully." };
  } catch (error) {
    console.error(error);
    return {
      success: false,
      message: "An error occurred while resetting your password.",
    };
  }
};

// Helper function to increase login attempts
const increaseLoginAttempt = async (ip: string, limit: number) => {
  await redisManager.setString(`${ip}:login`, limit + "", 86400);
};
