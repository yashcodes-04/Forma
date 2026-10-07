import crypto from "crypto";

/**
 * In-memory active OTP store
 * Map<mobile, { code: string, expiresAt: number, attempts: number, purpose: string }>
 */
const otpStore = new Map();

// Clean up expired OTPs periodically (every 5 minutes)
setInterval(() => {
  const now = Date.now();
  for (const [mobile, record] of otpStore.entries()) {
    if (now > record.expiresAt) {
      otpStore.delete(mobile);
    }
  }
}, 5 * 60 * 1000);

/**
 * Dispatch real SMS to phone via configured telecom SMS gateway
 */
async function dispatchSMS(mobile, code, purpose) {
  const clean10Digits = String(mobile).replace(/\D/g, "").slice(-10);
  const fullMobile = mobile.startsWith("+") ? mobile : `+91${clean10Digits}`;

  // Cellular SMS Gateways: Fast2SMS, Twilio, or Firebase Client Authentication

  // 2. FAST2SMS Integration (Instant Indian SMS gateway)
  if (process.env.FAST2SMS_API_KEY) {
    try {
      console.log(`📡 [SMS GATEWAY] Dispatching via Fast2SMS to +91 ${clean10Digits}...`);
      const response = await fetch("https://www.fast2sms.com/dev/bulkV2", {
        method: "POST",
        headers: {
          authorization: process.env.FAST2SMS_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          route: "otp",
          variables_values: code,
          numbers: clean10Digits,
        }),
      });
      const data = await response.json();
      if (data.return) {
        console.log(`✅ [FAST2SMS] Physical SMS delivered to +91 ${clean10Digits}!`);
        return { success: true, provider: "Fast2SMS" };
      } else {
        console.warn(`⚠️ [FAST2SMS] Gateway message:`, data.message || data);
      }
    } catch (err) {
      console.error(`❌ [FAST2SMS] Dispatch error:`, err.message);
    }
  }

  // 2. TWILIO Integration
  if (
    process.env.TWILIO_ACCOUNT_SID &&
    process.env.TWILIO_AUTH_TOKEN &&
    process.env.TWILIO_PHONE_NUMBER
  ) {
    try {
      console.log(`📡 [SMS GATEWAY] Dispatching via Twilio to ${fullMobile}...`);
      const auth = Buffer.from(
        `${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`
      ).toString("base64");

      const body = new URLSearchParams({
        To: fullMobile,
        From: process.env.TWILIO_PHONE_NUMBER,
        Body: `Your FORMA verification code is: ${code}. Valid for 5 minutes.`,
      });

      const response = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/Messages.json`,
        {
          method: "POST",
          headers: {
            Authorization: `Basic ${auth}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: body.toString(),
        }
      );
      const data = await response.json();
      if (response.ok) {
        console.log(`✅ [TWILIO] SMS delivered to ${fullMobile}! SID: ${data.sid}`);
        return { success: true, provider: "Twilio" };
      } else {
        console.warn(`⚠️ [TWILIO] Gateway message:`, data.message || data);
      }
    } catch (err) {
      console.error(`❌ [TWILIO] Dispatch error:`, err.message);
    }
  }

  return { success: false, reason: "No SMS gateway API key configured in .env" };
}

import { sendOtpEmail } from "./emailService.js";

export const otpService = {
  /**
   * Generate a secure 6-digit real OTP, store with 5-minute expiry, and dispatch to email and phone
   */
  async generateOTP({ mobile, email, name, purpose = "auth" }) {
    // Generate secure 6-digit numeric OTP (100000 - 999999)
    const code = crypto.randomInt(100000, 999999).toString();
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes validity

    const record = {
      code,
      expiresAt,
      attempts: 0,
      purpose,
      email,
      mobile,
    };

    if (mobile) {
      otpStore.set(mobile, record);
      const clean10 = String(mobile).replace(/\D/g, "").slice(-10);
      otpStore.set(clean10, record);
      otpStore.set(`+91${clean10}`, record);
    }

    if (email) {
      otpStore.set(email.trim().toLowerCase(), record);
    }

    let emailResult = { success: false };
    if (email) {
      emailResult = await sendOtpEmail({
        toEmail: email,
        toName: name,
        otp: code,
        purpose: purpose.toUpperCase(),
      });
    }

    // Attempt SMS dispatch as secondary if mobile is provided
    let smsResult = { success: false };
    if (mobile) {
      smsResult = await dispatchSMS(mobile, code, purpose);
    }

    // Formatted delivery banner in backend console
    console.log(`\n======================================================`);
    console.log(`✉️ [FORMA SECURE OTP DISPATCH]`);
    console.log(`------------------------------------------------------`);
    if (email) console.log(`📧 Email Inbox: ${email} (${emailResult.success ? "DELIVERED via Brevo" : "Pending/Fallback"})`);
    if (mobile) console.log(`📱 Mobile Number: ${mobile}`);
    console.log(`🎯 Purpose:      ${purpose.toUpperCase()}`);
    console.log(`🔑 OTP Code:     ${code}`);
    console.log(`⏱️  Validity:     5 minutes (Expires at ${new Date(expiresAt).toLocaleTimeString()})`);
    console.log(`======================================================\n`);

    return {
      otp: code,
      expiresAt,
      emailDispatched: emailResult.success,
      smsDispatched: smsResult.success,
    };
  },

  /**
   * Verify submitted OTP against stored code
   */
  verifyOTP(mobile, submittedOtp, purpose = "auth") {
    if (!submittedOtp) {
      return { success: false, message: "Please enter the 6-digit verification code." };
    }

    const cleanSubmitted = String(submittedOtp).trim().replace(/\D/g, "");
    if (cleanSubmitted.length !== 6) {
      return { success: false, message: "Verification code must be exactly 6 digits." };
    }

    const record = otpStore.get(mobile);

    if (!record) {
      return {
        success: false,
        message: "No active verification code found for this number. Please request a new code.",
      };
    }

    if (Date.now() > record.expiresAt) {
      otpStore.delete(mobile);
      return {
        success: false,
        message: "Verification code has expired. Please request a new code.",
      };
    }

    if (record.attempts >= 5) {
      otpStore.delete(mobile);
      return {
        success: false,
        message: "Too many incorrect attempts. Please request a new verification code.",
      };
    }

    if (record.code !== cleanSubmitted) {
      record.attempts += 1;
      const remaining = 5 - record.attempts;
      return {
        success: false,
        message: `Incorrect verification code. ${remaining} attempt${remaining === 1 ? "" : "s"} remaining.`,
      };
    }

    // Success - consume and invalidate OTP
    otpStore.delete(mobile);
    return { success: true };
  },

  /**
   * Clear active OTP for a mobile
   */
  clearOTP(mobile) {
    otpStore.delete(mobile);
  },
};
