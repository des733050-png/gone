exports.forgotPasswordTemplate = (name, otp) => {
  return `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
                max-width: 500px; 
                margin: 0 auto; 
                border: 1px solid #e0e0e0; 
                border-radius: 12px; 
                padding: 30px; 
                text-align: center; 
                background-color: #ffffff;">

      <h2 style="color: #1a3cff; margin-bottom: 4px;">GONEP</h2>
      <p style="font-size: 12px; color: #22c55e; margin-top: 0; letter-spacing: 1px;">HEALTHCARE MARKETPLACE</p>

      <hr style="border: none; border-top: 1px solid #eeeeee; margin: 20px 0;" />

      <p style="font-size: 16px; color: #555;">
        Hello <b>${name}</b>,
      </p>

      <p style="font-size: 16px; color: #555;">
        We received a request to reset your Gonep account password. Use the OTP below to continue.
      </p>

      <div style="margin: 35px 0;">
        <span style="font-size: 34px; 
                     font-weight: bold; 
                     letter-spacing: 6px; 
                     color: #1a3cff; 
                     background-color: #eef0ff; 
                     padding: 12px 24px; 
                     border-radius: 10px; 
                     border: 2px solid #c7ccff;">
          ${otp}
        </span>
      </div>

      <p style="font-size: 14px; color: #999;">
        This OTP is valid for <b>10 minutes</b>.
      </p>

      <p style="font-size: 13px; color: #cc0000; margin-top: 20px;">
        If you did not request a password reset, please ignore this email or contact us immediately at info@gonepharm.com.
      </p>

      <p style="font-size: 14px; color: #555; margin-top: 30px; text-align: left;">
        Regards,<br/>
        <b>Gonep Admin Team</b><br/>
        <a href="https://gonepharm.com" style="color:#1a3cff; text-decoration:none;">gonepharm.com</a>
      </p>

      <div style="margin-top: 30px; 
                  padding-top: 15px; 
                  border-top: 1px solid #eeeeee; 
                  font-size: 12px; 
                  color: #aaa;">
        © 2026 Gonep. All rights reserved. | info@gonepharm.com | +254 707 231 654
      </div>
    </div>
  `;
};
