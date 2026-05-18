exports.orderStatusTemplate = (name, status, orderId) => {
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
        Your order <b>#${orderId}</b> has been updated:
      </p>

      <div style="margin: 25px 0;">
        <span style="font-size: 24px;
                     font-weight: bold;
                     color: #1a3cff;
                     background-color: #eef0ff;
                     padding: 12px 20px;
                     border-radius: 10px;
                     border: 2px solid #c7ccff;">
          ${status.toUpperCase()}
        </span>
      </div>

      <p style="font-size: 14px; color: #555;">
        View your full order history on your <a href="${process.env.PLATFORM_URL}/myorders" style="color:#1a3cff; text-decoration:none;">dashboard</a>.
      </p>

      <p style="font-size: 13px; color: #888; margin-top: 16px;">
        If you have questions about your order, contact us at 
        <a href="mailto:info@gonepharm.com" style="color:#1a3cff;">info@gonepharm.com</a> 
        or call <b>+254 707 231 654</b>.
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
