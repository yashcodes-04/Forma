/**
 * FORMA Transactional Email Service
 * Dispatches high-deliverability 6-digit verification codes to user inbox
 */
export async function sendOtpEmail({ toEmail, toName, otp, purpose = "Authentication" }) {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    console.warn("⚠️ [EMAIL SERVICE] BREVO_API_KEY not configured in .env");
    return { success: false, reason: "No Brevo API key" };
  }

  const senderEmail = process.env.BREVO_SENDER_EMAIL || "yashcodes17@gmail.com";
  const senderName = process.env.BREVO_SENDER_NAME || "FORMA Luxury";

  const cleanEmail = String(toEmail).trim().toLowerCase();
  const displayName = toName || "Valued Member";

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>FORMA Verification Code</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0b0b0b; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f5f5f5;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #0b0b0b; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 520px; background-color: #141414; border: 1px solid #262626; border-radius: 8px; overflow: hidden; box-shadow: 0 10px 40px rgba(0,0,0,0.6);">
          
          <!-- Header -->
          <tr>
            <td style="padding: 36px 40px 24px; text-align: center; border-bottom: 1px solid #222;">
              <span style="font-size: 26px; font-weight: 700; letter-spacing: 0.2em; color: #ffffff; text-transform: uppercase;">FORMA<span style="font-size: 14px; vertical-align: super; font-weight: normal; color: #888;">®</span></span>
              <p style="margin: 6px 0 0; font-size: 11px; letter-spacing: 0.15em; color: #888; text-transform: uppercase;">Customer Access / Security Verification</p>
            </td>
          </tr>

          <!-- Body Content -->
          <tr>
            <td style="padding: 36px 40px;">
              <p style="margin: 0 0 16px; font-size: 15px; color: #ccc; line-height: 1.5;">Hello ${displayName},</p>
              <p style="margin: 0 0 28px; font-size: 14px; color: #999; line-height: 1.6;">
                Use the one-time verification passcode below to complete your FORMA <strong>${purpose}</strong>. This code is active for 5 minutes.
              </p>

              <!-- OTP Code Display -->
              <div style="background-color: #0a0a0a; border: 1px solid #2a2a2a; border-radius: 6px; padding: 22px 20px; text-align: center; margin: 24px 0;">
                <div style="font-family: 'SF Mono', Consolas, Monaco, monospace; font-size: 36px; font-weight: 700; letter-spacing: 0.28em; color: #ffffff;">
                  ${otp}
                </div>
                <div style="margin-top: 10px; font-size: 12px; color: #777; letter-spacing: 0.05em;">Valid for 5 minutes • Single use only</div>
              </div>

              <p style="margin: 28px 0 0; font-size: 13px; color: #666; line-height: 1.6;">
                If you did not request this security code, please ignore this email. No changes will be made to your account.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px; background-color: #0d0d0d; border-top: 1px solid #202020; text-align: center;">
              <p style="margin: 0; font-size: 11px; color: #555; letter-spacing: 0.08em; text-transform: uppercase;">
                FORMA Studios • Architectural Luxury
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  try {
    console.log(`✉️ [EMAIL SERVICE] Dispatching OTP email via Brevo to ${cleanEmail}...`);
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": apiKey,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        sender: { name: senderName, email: senderEmail },
        to: [{ email: cleanEmail, name: displayName }],
        subject: `Your FORMA verification code: ${otp}`,
        htmlContent,
      }),
    });

    const data = await response.json();

    if (response.ok && data.messageId) {
      console.log(`✅ [EMAIL SERVICE] OTP successfully delivered to inbox: ${cleanEmail} (ID: ${data.messageId})`);
      return { success: true, messageId: data.messageId, email: cleanEmail };
    } else {
      console.warn(`⚠️ [EMAIL SERVICE] Brevo response issue:`, data);
      return { success: false, error: data.message || "Failed to dispatch email." };
    }
  } catch (err) {
    console.error(`❌ [EMAIL SERVICE] Dispatch error:`, err.message);
    return { success: false, error: err.message };
  }
}
