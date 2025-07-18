import sgMail from "@sendgrid/mail";
import { EnvManager } from "../config";
import { ENV_KEYS } from "../constants";

const envManager = EnvManager.getInsatnce();
const key = envManager.getEnv(ENV_KEYS.SENDGRID_API_KEY);

sgMail.setApiKey(key || "");

export const sendPasswordResetEmail = async (to: string, resetLink: string) => {
  const msg = {
    to,
    from: {
      email: "info@rocketadvance.ca",
      name: "Rocket Advance",
    },
    subject: "Rocket Advance Portal Password Reset Request",
    html: `<div align="center" style="padding: 10px;"> <img align="center" border="0" src="https://i.imgur.com/PwXiLZA.jpeg" alt="" title="width: 40%;max-width: 192px;" height="80" width="192"/></div>
           <p>You're receiving this email because you requested a password reset for your account.</p>
           <p>Click <a href="${resetLink}">here</a> to reset your password. This link expires in 24 hours.</p>
           <p>If you didn't request a password reset, please ignore this email.</p>`,
  };

  try {
    await sgMail.send(msg);
    // console.log(msg);

    console.log("Password reset email sent successfully");
  } catch (error) {
    console.error("Error sending password reset email:", error);
    throw error;
  }
};
