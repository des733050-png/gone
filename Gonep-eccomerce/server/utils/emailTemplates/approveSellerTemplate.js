exports.approveSellerTemplate = (name) => {
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
        Congratulations! Your supplier account has been <b style="color: #22c55e;">approved</b>. 
        You can now log in and start listing your healthcare products on the Gonep marketplace.
      </p>

      <p style="font-size: 16px; color: #555; margin-top: 25px;">
        <a href="${process.env.PLATFORM_URL}/seller/dashboard" 
           style="color: #ffffff; 
                  background-color: #1a3cff; 
                  padding: 12px 25px; 
                  border-radius: 8px; 
                  text-decoration: none; 
                  font-weight: bold;">
          Go to Dashboard
        </a>
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
