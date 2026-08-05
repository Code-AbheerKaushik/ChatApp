/**
 * SMS Dispatch Service
 * Uses Twilio if environment variables are present, otherwise logs OTP to dev console.
 */
export const sendSMS = async (phone, otp) => {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_PHONE_NUMBER;

  if (accountSid && authToken && fromNumber) {
    try {
      const twilio = (await import("twilio")).default;
      const client = twilio(accountSid, authToken);
      await client.messages.create({
        body: `Your Chatty verification code is: ${otp}. Valid for 5 minutes. Do not share it with anyone.`,
        from: fromNumber,
        to: phone,
      });
      console.log(`[SMS SERVICE] Sent SMS to ${phone} via Twilio.`);
      return { success: true, method: "twilio" };
    } catch (err) {
      console.error(`[SMS SERVICE] Twilio Error:`, err.message);
      // Fallback log to console if SMS fails
    }
  }

  // Development Fallback Logging
  console.log(`\n==================================================`);
  console.log(`📱 [CHATTY OTP DEV LOG]`);
  console.log(`   Phone Number: ${phone}`);
  console.log(`   Verification OTP Code: ${otp}`);
  console.log(`   Valid for: 5 minutes`);
  console.log(`==================================================\n`);

  return { success: true, method: "dev_log" };
};
