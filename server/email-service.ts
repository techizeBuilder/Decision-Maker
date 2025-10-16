import nodemailer from "nodemailer";
import crypto from "crypto";

// Generate email verification token
export const generateEmailVerificationToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

// Lazy initialization to ensure environment variables are loaded
let transporter: nodemailer.Transporter | null = null;

function getTransporter() {
  if (!transporter) {
    // Debug environment variables
    console.log("🔧 Email service initialization - called from:");
    console.trace();
    console.log("SMTP_USERNAME:", process.env.SMTP_USERNAME ? "✅ Set" : "❌ Missing");
    console.log("SMTP_PASSWORD:", process.env.SMTP_PASSWORD ? "✅ Set" : "❌ Missing");

    // Create transporter with Gmail SMTP configuration
    transporter = nodemailer.createTransport({
      service: "gmail",
      port: 587,
      host: "smtp.gmail.com",
      secure: false,
      auth: {
        user: process.env.SMTP_USERNAME,
        pass: process.env.SMTP_PASSWORD,
      },
    });

    // Verify transporter configuration
    transporter.verify((error: any, success: any) => {
      if (error) {
        console.error("Email transporter verification failed:", error);
      } else {
        console.log("Email service is ready to send emails");
      }
    });
  }
  return transporter;
}

// Email template for decision maker invitations
export const sendDecisionMakerInvitation = async (
  recipientEmail: string,
  recipientName: string,
  salesRepName: string,
  invitationToken: string,
) => {
  const inviteUrl = `${process.env.REPLIT_DOMAIN || "http://decisionmaker.shrawantravels.com"}/invite/${invitationToken}`;

  const mailOptions = {
    from: '"Naeberly Platform" <noreply@naeberly.com>',
    to: recipientEmail,
    subject: `You've Been Referred to Join Neaborly — Confirm Your Commitment as a Decision Maker`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Naeberly Invitation</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; margin: 0; padding: 0; background-color: #f4f4f4; }
          .container { max-width: 600px; margin: 0 auto; background-color: white; padding: 20px; border-radius: 10px; box-shadow: 0 0 10px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #3b82f6 0%, #6366f1 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; margin: -20px -20px 20px -20px; }
          .header h1 { margin: 0; font-size: 28px; }
          .content { padding: 20px 0; }
          .content h2 { color: #333; margin-bottom: 20px; }
          .content p { color: #666; margin-bottom: 15px; }
          .cta-button { display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #6366f1 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 20px 0; }
          .cta-button:hover { opacity: 0.9; }
          .benefits { background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0; }
          .benefits ul { margin: 0; padding-left: 20px; }
          .benefits li { margin-bottom: 10px; color: #555; }
          .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #999; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🚀 Naeberly Platform</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">Professional Business Networking</p>
          </div>

          <div class="content">
            <h2>Hi ${recipientName},</h2>

            <p>You've been referred by <strong>${salesRepName}</strong> to join Neaborly as a participating Decision Maker.</p>

            <p>Neaborly is a trusted, invite-only platform where senior professionals help drive warm introductions across industries. Your participation enables ${salesRepName.split(" ")[0]} to gain access to a live database of verified Decision Makers like yourself — in exchange for your agreement to take three (3) short, 15-minute calls with other approved professionals.</p>

            <div class="benefits">
              <h3>What You're Agreeing To:</h3>
              <p>By accepting this referral:</p>
              <ul>
                <li>You agree to take <strong>3 scheduled 15-minute calls</strong> with verified Reps via Neaborly.</li>
                <li>These calls are <strong>non-salesy discovery-style conversations</strong> with Reps from other real businesses — similar to how your Rep is trying to connect with others.</li>
                <li>You will integrate your calendar (Google/Outlook) so that Neaborly can schedule calls efficiently.</li>
                <li>Your participation unlocks access to the platform for the Rep who referred you.</li>
              </ul>
            </div>

            <p>If you're ready to participate and unlock access for <strong>${salesRepName.split(" ")[0]}</strong>, click below:</p>

            <div style="text-align: center;">
              <a href="${inviteUrl}" class="cta-button">👉 Accept My Referral & Join Neaborly</a>
            </div>

            <p style="margin-top: 30px; font-size: 14px; color: #888;">
              Questions? Reply to this email or reach us at support@naeborly.com.
            </p>

            <p style="margin-top: 20px; font-size: 14px; color: #888;">
              Thank you for helping build a better, warmer way to connect.
            </p>
          </div>

          <div class="footer">
            <p>Warm regards,<br>The Neaborly Team</p>
            <p>© 2025 Naeberly Platform. All rights reserved.</p>
            <p>This email was sent to ${recipientEmail}</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
      Hi ${recipientName},

      You've been referred by ${salesRepName} to join Neaborly as a participating Decision Maker.

      Neaborly is a trusted, invite-only platform where senior professionals help drive warm introductions across industries. Your participation enables ${salesRepName.split(" ")[0]} to gain access to a live database of verified Decision Makers like yourself — in exchange for your agreement to take three (3) short, 15-minute calls with other approved professionals.

      What You're Agreeing To:
      By accepting this referral:
      • You agree to take 3 scheduled 15-minute calls with verified Reps via Neaborly.
      • These calls are non-salesy discovery-style conversations with Reps from other real businesses — similar to how your Rep is trying to connect with others.
      • You will integrate your calendar (Google/Outlook) so that Neaborly can schedule calls efficiently.
      • Your participation unlocks access to the platform for the Rep who referred you.

      If you're ready to participate and unlock access for ${salesRepName.split(" ")[0]}, visit:
      ${inviteUrl}

      Questions? Reply to this email or reach us at support@naeborly.com.

      Thank you for helping build a better, warmer way to connect.

      Warm regards,
      The Neaborly Team
    `,
  };

  try {
    // Check if SMTP credentials are configured
    if (!process.env.SMTP_USERNAME || !process.env.SMTP_PASSWORD) {
      console.log("⚠️  SMTP credentials not configured - email would be sent to:", recipientEmail);
      console.log("📧 Subject:", mailOptions.subject);
      console.log("🔗 Invite URL:", inviteUrl);
      return { success: false, error: "SMTP credentials not configured", wouldSendTo: recipientEmail };
    }

    const info = await getTransporter().sendMail(mailOptions);
    console.log(
      "✅ Decision maker invitation email sent successfully to:",
      recipientEmail,
      "MessageID:",
      info.messageId,
    );
    return { success: true, messageId: info.messageId };
  } catch (error: any) {
    console.error("❌ Error sending decision maker invitation email to:", recipientEmail, error);
    return { success: false, error: error.message || "Failed to send email" };
  }
};

// Email template for welcome messages with email verification
export const sendWelcomeEmail = async (
  recipientEmail: string,
  recipientName: string,
  userRole: "sales_rep" | "decision_maker",
  verificationToken?: string,
) => {
  const dashboardUrl = `${process.env.REPLIT_DOMAIN || "http://decisionmaker.shrawantravels.com"}/dashboard`;
  const verificationUrl = verificationToken 
    ? `${process.env.REPLIT_DOMAIN || "http://decisionmaker.shrawantravels.com"}/verify-email?token=${verificationToken}`
    : null;

  const mailOptions = {
    from: '"Naeberly Platform" <noreply@naeberly.com>',
    to: recipientEmail,
    subject: verificationToken 
      ? `Welcome to Naeberly, ${recipientName}! Please verify your email`
      : `Welcome to Naeberly, ${recipientName}!`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to Naeberly</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; margin: 0; padding: 0; background-color: #f4f4f4; }
          .container { max-width: 600px; margin: 0 auto; background-color: white; padding: 20px; border-radius: 10px; box-shadow: 0 0 10px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #3b82f6 0%, #6366f1 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; margin: -20px -20px 20px -20px; }
          .header h1 { margin: 0; font-size: 28px; }
          .content { padding: 20px 0; }
          .content h2 { color: #333; margin-bottom: 20px; }
          .content p { color: #666; margin-bottom: 15px; }
          .cta-button { display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #6366f1 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 20px 0; }
          .verify-button { display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 20px 0; }
          .cta-button:hover, .verify-button:hover { opacity: 0.9; }
          .verification-notice { background-color: #fef3cd; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #f59e0b; }
          .next-steps { background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0; }
          .next-steps ol { margin: 0; padding-left: 20px; }
          .next-steps li { margin-bottom: 10px; color: #555; }
          .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #999; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 Welcome to Naeberly!</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">Your professional networking journey starts here</p>
          </div>

          <div class="content">
            <h2>Hello ${recipientName},</h2>

            <p>Welcome to Naeberly! We're excited to have you join our professional networking community as a ${userRole === "sales_rep" ? "Sales Representative" : "Decision Maker"}.</p>

            ${verificationToken ? `
              <div class="verification-notice">
                <h3 style="margin-top: 0; color: #f59e0b;">📧 Email Verification Required</h3>
                <p style="color: #92400e; margin-bottom: 0;">Before you can access your account and start using Naeberly, please verify your email address by clicking the button below:</p>
              </div>

              <div style="text-align: center;">
                <a href="${verificationUrl}" class="verify-button">✅ Verify Your Email</a>
              </div>

              <p style="margin-top: 20px;"><strong>Important:</strong> You won't be able to log in until your email is verified. This verification link will expire in 24 hours.</p>
            ` : ''}

            <div class="next-steps">
              <h3>After email verification, your next steps:</h3>
              <ol>
                ${
                  userRole === "sales_rep"
                    ? `
                    <li><strong>Complete your profile</strong> - Add your professional details and LinkedIn verification</li>
                    <li><strong>Choose your package</strong> - Select the subscription plan that fits your needs</li>
                    <li><strong>Invite decision makers</strong> - Start building your network of valuable connections</li>
                    <li><strong>Schedule your first call</strong> - Begin meaningful business conversations</li>
                  `
                    : `
                    <li><strong>Set up your calendar</strong> - Connect your Google Calendar for easy scheduling</li>
                    <li><strong>Review incoming invitations</strong> - See who wants to connect with you</li>
                    <li><strong>Schedule calls</strong> - Choose times that work best for you</li>
                    <li><strong>Provide feedback</strong> - Help maintain quality by rating your interactions</li>
                  `
                }
              </ol>
            </div>

            ${!verificationToken ? `
              <p>Ready to get started? Access your dashboard and begin your networking journey:</p>
              <div style="text-align: center;">
                <a href="${dashboardUrl}" class="cta-button">Go to Dashboard</a>
              </div>
            ` : `
              <p>Once your email is verified, you can access your dashboard and begin your networking journey!</p>
            `}

            <p style="margin-top: 30px;">If you have any questions or need assistance, don't hesitate to reach out to our support team.</p>
          </div>

          <div class="footer">
            <p>© 2025 Naeberly Platform. All rights reserved.</p>
            <p>This email was sent to ${recipientEmail}</p>
            ${verificationToken ? '<p style="color: #f59e0b;">⚠️ Please verify your email to activate your account</p>' : ''}
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
      Welcome to Naeberly, ${recipientName}!

      We're excited to have you join our professional networking community as a ${userRole === "sales_rep" ? "Sales Representative" : "Decision Maker"}.

      Your next steps:
      ${
        userRole === "sales_rep"
          ? `
          1. Complete your profile - Add your professional details and LinkedIn verification
          2. Choose your package - Select the subscription plan that fits your needs
          3. Invite decision makers - Start building your network of valuable connections
          4. Schedule your first call - Begin meaningful business conversations
        `
          : `
          1. Set up your calendar - Connect your Google Calendar for easy scheduling
          2. Review incoming invitations - See who wants to connect with you
          3. Schedule calls - Choose times that work best for you
          4. Provide feedback - Help maintain quality by rating your interactions
        `
      }

      Access your dashboard: ${dashboardUrl}

      If you have any questions or need assistance, don't hesitate to reach out to our support team.

      Best regards,
      The Naeberly Team
    `,
  };

  try {
    const info = await getTransporter().sendMail(mailOptions);
    console.log("Welcome email sent successfully:", info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("Error sending welcome email:", error);
    throw error;
  }
};

// Email template for call reminders
export const sendCallReminder = async (
  recipientEmail: string,
  recipientName: string,
  callDetails: {
    salesRepName: string;
    decisionMakerName: string;
    scheduledAt: Date;
    meetingLink?: string;
  },
) => {
  const mailOptions = {
    from: '"Naeberly Platform" <noreply@naeberly.com>',
    to: recipientEmail,
    subject: `Reminder: Your call with ${callDetails.salesRepName} is tomorrow`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Call Reminder</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; margin: 0; padding: 0; background-color: #f4f4f4; }
          .container { max-width: 600px; margin: 0 auto; background-color: white; padding: 20px; border-radius: 10px; box-shadow: 0 0 10px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #3b82f6 0%, #6366f1 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; margin: -20px -20px 20px -20px; }
          .header h1 { margin: 0; font-size: 28px; }
          .content { padding: 20px 0; }
          .content h2 { color: #333; margin-bottom: 20px; }
          .content p { color: #666; margin-bottom: 15px; }
          .call-details { background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #3b82f6; }
          .call-details h3 { margin-top: 0; color: #333; }
          .call-details p { margin-bottom: 10px; color: #555; font-weight: 500; }
          .cta-button { display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #6366f1 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 20px 0; }
          .cta-button:hover { opacity: 0.9; }
          .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #999; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📞 Call Reminder</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">Your upcoming Naeberly call</p>
          </div>

          <div class="content">
            <h2>Hello ${recipientName},</h2>

            <p>This is a friendly reminder about your upcoming call scheduled through Naeberly.</p>

            <div class="call-details">
              <h3>Call Details:</h3>
              <p><strong>Participants:</strong> ${callDetails.salesRepName} & ${callDetails.decisionMakerName}</p>
              <p><strong>Date & Time:</strong> ${callDetails.scheduledAt.toLocaleDateString(
                "en-US",
                {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                  timeZoneName: "short",
                },
              )}</p>
              ${callDetails.meetingLink ? `<p><strong>Meeting Link:</strong> <a href="${callDetails.meetingLink}">${callDetails.meetingLink}</a></p>` : ""}
            </div>

            <p>Please make sure to:</p>
            <ul>
              <li>Check your calendar and be available at the scheduled time</li>
              <li>Prepare any materials or questions you'd like to discuss</li>
              <li>Test your internet connection and audio/video equipment</li>
              <li>Have your contact information ready if needed</li>
            </ul>

            <p>Looking forward to a productive conversation!</p>
          </div>

          <div class="footer">
            <p>© 2025 Naeberly Platform. All rights reserved.</p>
            <p>This email was sent to ${recipientEmail}</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
      Call Reminder - Naeberly Platform

      Hello ${recipientName},

      This is a friendly reminder about your upcoming call scheduled through Naeberly.

      Call Details:
      - Participants: ${callDetails.salesRepName} & ${callDetails.decisionMakerName}
      - Date & Time: ${callDetails.scheduledAt.toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        timeZoneName: "short",
      })}
      ${callDetails.meetingLink ? `- Meeting Link: ${callDetails.meetingLink}` : ""}

      Please make sure to:
      - Check your calendar and be available at the scheduled time
      - Prepare any materials or questions you'd like to discuss
      - Test your internet connection and audio/video equipment
      - Have your contact information ready if needed

      Looking forward to a productive conversation!

      Best regards,
      The Naeberly Team
    `,
  };

  try {
    const info = await getTransporter().sendMail(mailOptions);
    console.log("Call reminder email sent successfully:", info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("Error sending call reminder email:", error);
    throw error;
  }
};

// Email template for booking confirmation to sales rep
export const sendBookingConfirmationToRep = async (
  repEmail: string,
  repFirstName: string,
  dmFullName: string,
  dmFirstName: string,
  dmRole: string,
  dmCompany: string,
  callDate: string,
  callTime: string,
  timezone: string,
  meetingLink?: string,
) => {
  const mailOptions = {
    from: '"Naeberly Platform" <noreply@naeberly.com>',
    to: repEmail,
    subject: `✅ Your Call with ${dmFirstName} Has Been Confirmed`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Booking Confirmation</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; margin: 0; padding: 0; background-color: #f4f4f4; }
          .container { max-width: 600px; margin: 0 auto; background-color: white; padding: 20px; border-radius: 10px; box-shadow: 0 0 10px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; margin: -20px -20px 20px -20px; }
          .header h1 { margin: 0; font-size: 28px; }
          .content { padding: 20px 0; }
          .content h2 { color: #333; margin-bottom: 20px; }
          .content p { color: #666; margin-bottom: 15px; }
          .call-details { background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #10b981; }
          .call-details h3 { color: #10b981; margin-top: 0; }
          .call-details ul { margin: 10px 0; padding-left: 20px; }
          .call-details li { margin-bottom: 8px; color: #555; }
          .warning-box { background-color: #fef3c7; border: 1px solid #f59e0b; padding: 15px; border-radius: 5px; margin: 20px 0; }
          .warning-box p { color: #92400e; margin: 0; font-weight: 500; }
          .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #999; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>✅ Call Confirmed!</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">Your Neaborly call is scheduled</p>
          </div>

          <div class="content">
            <h2>Hi ${repFirstName},</h2>

            <p>Great news — your 15-minute Neaborly call with <strong>${dmFullName}</strong> (${dmRole}, ${dmCompany}) has been confirmed!</p>

            <div class="call-details">
              <h3>📅 Call Details:</h3>
              <ul>
                <li><strong>Date:</strong> ${callDate}</li>
                <li><strong>Time:</strong> ${callTime} (${timezone})</li>
                <li><strong>Location:</strong> ${meetingLink || "Meeting link will be provided"}</li>
                <li><strong>Duration:</strong> 15 minutes</li>
              </ul>
            </div>

            <div class="call-details">
              <h3>✅ What to Prepare:</h3>
              <ul>
                <li>Be clear, respectful, and concise</li>
                <li>Aim to make the conversation valuable — not just for you, but for <strong>${dmFirstName}</strong> too</li>
                <li>You may only have one shot — make it count</li>
              </ul>
            </div>

            <div class="warning-box">
              <p>⚠️ No-shows, rudeness, or time-wasting will be flagged and may lead to account suspension.</p>
              <p><strong>Please be on time and professional.</strong></p>
            </div>

            <p>You can view or reschedule the call from your dashboard if needed.</p>

            <p>Wishing you a productive conversation,</p>
          </div>

          <div class="footer">
            <p>The Neaborly Team<br>support@naeborly.com</p>
            <p>© 2025 Naeberly Platform. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
      Hi ${repFirstName},

      Great news — your 15-minute Neaborly call with ${dmFullName} (${dmRole}, ${dmCompany}) has been confirmed!

      📅 Call Details:
      • Date: ${callDate}
      • Time: ${callTime} (${timezone})
      • Location: ${meetingLink || "Meeting link will be provided"}
      • Duration: 15 minutes

      ✅ What to Prepare:
      • Be clear, respectful, and concise
      • Aim to make the conversation valuable — not just for you, but for ${dmFirstName} too
      • You may only have one shot — make it count

      ⚠️ No-shows, rudeness, or time-wasting will be flagged and may lead to account suspension.

      Please be on time and professional.

      You can view or reschedule the call from your dashboard if needed.

      Wishing you a productive conversation,
      The Neaborly Team
      support@naeborly.com
    `,
  };

  try {
    const info = await getTransporter().sendMail(mailOptions);
    console.log(
      "Booking confirmation email sent to rep successfully:",
      info.messageId,
    );
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("Error sending booking confirmation email to rep:", error);
    throw error;
  }
};

// Email template for booking confirmation to decision maker
export const sendBookingConfirmationToDM = async (
  dmEmail: string,
  dmFirstName: string,
  repFullName: string,
  repRole: string,
  repCompany: string,
  callDate: string,
  callTime: string,
  timezone: string,
  meetingLink?: string,
) => {
  const mailOptions = {
    from: '"Naeberly Platform" <noreply@naeberly.com>',
    to: dmEmail,
    subject: `✅ A Neaborly Call Has Been Booked With You`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Booking Confirmation</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; margin: 0; padding: 0; background-color: #f4f4f4; }
          .container { max-width: 600px; margin: 0 auto; background-color: white; padding: 20px; border-radius: 10px; box-shadow: 0 0 10px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #3b82f6 0%, #6366f1 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; margin: -20px -20px 20px -20px; }
          .header h1 { margin: 0; font-size: 28px; }
          .content { padding: 20px 0; }
          .content h2 { color: #333; margin-bottom: 20px; }
          .content p { color: #666; margin-bottom: 15px; }
          .call-details { background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #3b82f6; }
          .call-details h3 { color: #3b82f6; margin-top: 0; }
          .call-details ul { margin: 10px 0; padding-left: 20px; }
          .call-details li { margin-bottom: 8px; color: #555; }
          .reminder-box { background-color: #dbeafe; border: 1px solid #3b82f6; padding: 15px; border-radius: 5px; margin: 20px 0; }
          .reminder-box p { color: #1e40af; margin: 5px 0; }
          .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #999; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>✅ Call Scheduled!</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">A Neaborly call has been booked with you</p>
          </div>

          <div class="content">
            <h2>Hi ${dmFirstName},</h2>

            <p>You've been matched for a 15-minute Neaborly call with <strong>${repFullName}</strong> (${repRole}, ${repCompany}).</p>

            <div class="call-details">
              <h3>📅 Call Details:</h3>
              <ul>
                <li><strong>Date:</strong> ${callDate}</li>
                <li><strong>Time:</strong> ${callTime} (${timezone})</li>
                <li><strong>Location:</strong> ${meetingLink || "Meeting link will be provided"}</li>
                <li><strong>Duration:</strong> 15 minutes</li>
              </ul>
            </div>

            <p>This call is part of your commitment to participate in 3 peer-to-peer discovery calls as a Decision Maker on Neaborly. Every conversation helps build a better, more meaningful network.</p>

            <div class="reminder-box">
              <h3 style="color: #1e40af; margin-top: 0;">📌 Quick Reminder:</h3>
              <p>• Please attend on time and be present</p>
              <p>• If something urgent comes up, reschedule in your dashboard</p>
              <p>• No-shows or repeated late attendance may result in your account being flagged</p>
            </div>

            <p>We're grateful to have you helping shape the future of high-trust, referral-based networking.</p>

            <p>Thank you,</p>
          </div>

          <div class="footer">
            <p>The Neaborly Team<br>support@naeborly.com</p>
            <p>© 2025 Naeberly Platform. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
      Hi ${dmFirstName},

      You've been matched for a 15-minute Neaborly call with ${repFullName} (${repRole}, ${repCompany}).

      📅 Call Details:
      • Date: ${callDate}
      • Time: ${callTime} (${timezone})
      • Location: ${meetingLink || "Meeting link will be provided"}
      • Duration: 15 minutes

      This call is part of your commitment to participate in 3 peer-to-peer discovery calls as a Decision Maker on Neaborly. Every conversation helps build a better, more meaningful network.

      📌 Quick Reminder:
      • Please attend on time and be present
      • If something urgent comes up, reschedule in your dashboard
      • No-shows or repeated late attendance may result in your account being flagged

      We're grateful to have you helping shape the future of high-trust, referral-based networking.

      Thank you,
      The Neaborly Team
      support@naeborly.com
    `,
  };

  try {
    const info = await getTransporter().sendMail(mailOptions);
    console.log(
      "Booking confirmation email sent to DM successfully:",
      info.messageId,
    );
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("Error sending booking confirmation email to DM:", error);
    throw error;
  }
};

// Warning email template for flagged sales reps
export const sendSalesRepWarningEmail = async (
  repEmail: string,
  repFirstName: string,
  dmFirstName: string,
  dmFullName: string,
  dmRole: string,
  dmCompany: string,
  flagReason: string,
  callDate: string,
  repFlagCount: number,
) => {
  const mailOptions = {
    from: '"Naeberly Platform" <noreply@naeberly.com>',
    to: repEmail,
    subject: `⚠ Warning Issued: Your Conduct on Neaborly Has Been Flagged`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Neaborly Warning Notice</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; margin: 0; padding: 0; background-color: #f4f4f4; }
          .container { max-width: 600px; margin: 0 auto; background-color: white; padding: 20px; border-radius: 10px; box-shadow: 0 0 10px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #f59e0b 0%, #ef4444 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; margin: -20px -20px 20px -20px; }
          .header h1 { margin: 0; font-size: 28px; }
          .content { padding: 20px 0; }
          .content h2 { color: #333; margin-bottom: 20px; }
          .content p { color: #666; margin-bottom: 15px; }
          .warning-box { background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 5px; }
          .incident-box { background-color: #fee2e2; border-left: 4px solid #ef4444; padding: 15px; margin: 20px 0; border-radius: 5px; }
          .action-box { background-color: #d1fae5; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0; border-radius: 5px; }
          .cta-button { display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #6366f1 100%); color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 10px 0; }
          .cta-button:hover { opacity: 0.9; }
          .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #999; font-size: 14px; }
          .flag-count { font-size: 18px; font-weight: bold; color: #ef4444; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>⚠ Warning Notice</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">Neaborly Platform</p>
          </div>

          <div class="content">
            <h2>Hi ${repFirstName},</h2>

            <p>We wanted to notify you that a flag has been submitted against your account following a recent scheduled call with ${dmFirstName} from ${dmCompany}.</p>

            <div class="incident-box">
              <h3 style="color: #dc2626; margin-top: 0;">🟠 What Happened:</h3>
              <p><strong>Flag Reason:</strong> ${flagReason}</p>
              <p><strong>Call Date:</strong> ${callDate}</p>
              <p><strong>Decision Maker:</strong> ${dmFullName} (${dmRole}, ${dmCompany})</p>
            </div>

            <div class="warning-box">
              <p>You now have <span class="flag-count">${repFlagCount} flag(s)</span> on your record. At 3 flags, your account will be automatically suspended for 90 days and you'll lose access to the platform.</p>
            </div>

            <div class="action-box">
              <h3 style="color: #059669; margin-top: 0;">✅ What You Can Do:</h3>
              <ul style="margin: 10px 0; padding-left: 20px;">
                <li>Review the call context if available in your dashboard</li>
                <li>Reflect on the feedback and aim to prevent future issues</li>
                <li>If you believe this was submitted in error, you can submit an appeal:</li>
              </ul>
              <a href="${process.env.REPLIT_DOMAIN || "https://localhost:5000"}/support" class="cta-button">Submit Appeal</a>
            </div>

            <div style="background-color: #f3f4f6; padding: 20px; border-radius: 5px; margin: 20px 0;">
              <h3 style="color: #374151; margin-top: 0;">⏳ Why This Matters:</h3>
              <p>Neaborly is built on mutual trust, respect, and time value. Ensuring high-quality, professional interactions protects everyone's experience — including yours.</p>
              <p>We're here to help you succeed. Please let us know if you need support improving your conversations or preparing for calls.</p>
            </div>

            <p>Stay sharp,</p>
            <p><strong>The Neaborly Team</strong></p>
          </div>

          <div class="footer">
            <p>support@naeborly.com</p>
            <p>© 2025 Naeberly Platform. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
      Hi ${repFirstName},

      We wanted to notify you that a flag has been submitted against your account following a recent scheduled call with ${dmFirstName} from ${dmCompany}.

      🟠 What Happened:
      Flag Reason: ${flagReason}
      Call Date: ${callDate}
      Decision Maker: ${dmFullName} (${dmRole}, ${dmCompany})

      You now have ${repFlagCount} flag(s) on your record. At 3 flags, your account will be automatically suspended for 90 days and you'll lose access to the platform.

      ✅ What You Can Do:
      • Review the call context if available in your dashboard
      • Reflect on the feedback and aim to prevent future issues
      • If you believe this was submitted in error, you can submit an appeal here: ${process.env.REPLIT_DOMAIN || "https://localhost:5000"}/support

      ⏳ Why This Matters:
      Neaborly is built on mutual trust, respect, and time value. Ensuring high-quality, professional interactions protects everyone's experience — including yours.

      We're here to help you succeed. Please let us know if you need support improving your conversations or preparing for calls.

      Stay sharp,
      The Neaborly Team
      support@naeborly.com
    `,
  };

  try {
    const info = await getTransporter().sendMail(mailOptions);
    console.log(
      "Warning email sent to sales rep successfully:",
      info.messageId,
    );
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("Error sending warning email to sales rep:", error);
    throw error;
  }
};

// Warning email template for flagged decision makers
export const sendDecisionMakerWarningEmail = async (
  dmEmail: string,
  dmFirstName: string,
  flagReason: string,
  callDate: string,
  repFullName: string,
  repCompany: string,
  dmFlagCount: number,
) => {
  const mailOptions = {
    from: '"Naeberly Platform" <noreply@naeberly.com>',
    to: dmEmail,
    subject: `⚠ Conduct Warning Issued on Neaborly`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Neaborly Warning Notice</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; margin: 0; padding: 0; background-color: #f4f4f4; }
          .container { max-width: 600px; margin: 0 auto; background-color: white; padding: 20px; border-radius: 10px; box-shadow: 0 0 10px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #f59e0b 0%, #ef4444 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; margin: -20px -20px 20px -20px; }
          .header h1 { margin: 0; font-size: 28px; }
          .content { padding: 20px 0; }
          .content h2 { color: #333; margin-bottom: 20px; }
          .content p { color: #666; margin-bottom: 15px; }
          .warning-box { background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 5px; }
          .cta-button { background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 20px; }
          .footer { background-color: #f8f9fa; padding: 20px; text-align: center; margin: 20px -20px -20px -20px; border-radius: 0 0 10px 10px; }
          .details { background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>⚠ Conduct Warning</h1>
            <p>Your Neaborly account has received a flag</p>
          </div>
          
          <div class="content">
            <p>Hi ${dmFirstName},</p>
            
            <p>We're reaching out to inform you that your Neaborly account has received a conduct warning.</p>
            
            <div class="details">
              <h3>🔺 What Happened:</h3>
              <p><strong>Flag Reason:</strong> ${flagReason}</p>
              <p><strong>Call Date:</strong> ${callDate}</p>
              <p><strong>Reported By:</strong> ${repFullName} (${repCompany})</p>
            </div>
            
            <div class="warning-box">
              <p><strong>You now have ${dmFlagCount} flag(s) on your record.</strong> At 3 flags, your account will be suspended for 90 days and you will no longer be eligible to support or unlock access for other Reps.</p>
              
              <p>Additionally, Reps who referred you may also face temporary penalties if your behaviour impacts the platform.</p>
            </div>
            
            <h3>🚨 Why This Matters:</h3>
            <p>Neaborly operates on a code of trust and professionalism. If you're unable to attend a scheduled call or participate respectfully, please use the platform tools to reschedule or cancel in advance.</p>
            
            <h3>🤝 Need Help?</h3>
            <p>If you believe this warning was issued in error or have feedback for us, you may file an appeal here:</p>
            
            <a href="${process.env.REPLIT_DOMAIN || "https://localhost:5000"}/support" class="cta-button">Submit Appeal</a>
            
            <p style="margin-top: 30px;">We appreciate your time and thank you for being part of a community that values real conversations.</p>
            
            <p>Warm regards,<br>
            The Neaborly Team<br>
            support@naeborly.com</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
      Hi ${dmFirstName},

      We're reaching out to inform you that your Neaborly account has received a conduct warning.

      🔺 What Happened:
      Flag Reason: ${flagReason}
      Call Date: ${callDate}
      Reported By: ${repFullName} (${repCompany})

      You now have ${dmFlagCount} flag(s) on your record. At 3 flags, your account will be suspended for 90 days and you will no longer be eligible to support or unlock access for other Reps.

      Additionally, Reps who referred you may also face temporary penalties if your behaviour impacts the platform.

      🚨 Why This Matters:
      Neaborly operates on a code of trust and professionalism. If you're unable to attend a scheduled call or participate respectfully, please use the platform tools to reschedule or cancel in advance.

      🤝 Need Help?
      If you believe this warning was issued in error or have feedback for us, you may file an appeal here:
      ${process.env.REPLIT_DOMAIN || "https://localhost:5000"}/support

      We appreciate your time and thank you for being part of a community that values real conversations.

      Warm regards,
      The Neaborly Team
      support@naeborly.com
    `,
  };

  try {
    const info = await getTransporter().sendMail(mailOptions);
    console.log(
      "Warning email sent to decision maker successfully:",
      info.messageId,
    );
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("Error sending warning email to decision maker:", error);
    throw error;
  }
};

// Post-call feedback email for Decision Makers
export const sendPostCallFeedbackToDM = async (
  dmEmail: string,
  dmFirstName: string,
  repFirstName: string,
  callId: string,
) => {
  const feedbackUrl = `${process.env.REPLIT_DOMAIN || "https://localhost:5000"}/feedback/dm/${callId}`;

  const mailOptions = {
    from: '"Naeberly Platform" <noreply@naeberly.com>',
    to: dmEmail,
    subject: `Quick check-in on your recent call`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Post-Call Feedback</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; margin: 0; padding: 0; background-color: #f4f4f4; }
          .container { max-width: 600px; margin: 0 auto; background-color: white; padding: 20px; border-radius: 10px; box-shadow: 0 0 10px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #3b82f6 0%, #6366f1 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; margin: -20px -20px 20px -20px; }
          .header h1 { margin: 0; font-size: 28px; }
          .content { padding: 20px 0; }
          .content h2 { color: #333; margin-bottom: 20px; }
          .content p { color: #666; margin-bottom: 15px; }
          .cta-button { display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #6366f1 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 20px 0; text-align: center; }
          .cta-button:hover { opacity: 0.9; }
          .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #999; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📞 Naeberly Platform</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">Your feedback matters</p>
          </div>

          <div class="content">
            <h2>Hi ${dmFirstName},</h2>

            <p>Thanks for taking a moment with <strong>${repFirstName}</strong> earlier.</p>
            <p>We'd love your quick feedback to confirm how the call went.</p>

            <p><strong>Did it take place? Were they polite and engaged?</strong></p>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${feedbackUrl}" class="cta-button" style="color: white; text-decoration: none;">
                👉 Click here to leave feedback
              </a>
            </div>

            <p>Takes less than 30 seconds and helps us improve every connection.</p>

            <p>Cheers,</p>
          </div>

          <div class="footer">
            <p>The Naeberly Team<br>support@naeborly.com</p>
            <p>© 2025 Naeberly Platform. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
      Hi ${dmFirstName},

      Thanks for taking a moment with ${repFirstName} earlier.
      We'd love your quick feedback to confirm how the call went.

      Did it take place? Were they polite and engaged?

      Click here to leave feedback: ${feedbackUrl}

      Takes less than 30 seconds and helps us improve every connection.

      Cheers,
      The Naeberly Team
      support@naeborly.com
    `,
  };

  try {
    const info = await getTransporter().sendMail(mailOptions);
    console.log(
      "Post-call feedback email sent to DM successfully:",
      info.messageId,
    );
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("Failed to send post-call feedback email to DM:", error);
    return { success: false, error: error.message };
  }
};

// Post-call feedback email for Sales Reps
export const sendPostCallFeedbackToRep = async (
  repEmail: string,
  repFirstName: string,
  dmFirstName: string,
  callId: string,
) => {
  const feedbackUrl = `${process.env.REPLIT_DOMAIN || "https://localhost:5000"}/feedback/rep/${callId}`;

  const mailOptions = {
    from: '"Naeberly Platform" <noreply@naeberly.com>',
    to: repEmail,
    subject: `Quick feedback on your call with ${dmFirstName}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Post-Call Feedback</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; margin: 0; padding: 0; background-color: #f4f4f4; }
          .container { max-width: 600px; margin: 0 auto; background-color: white; padding: 20px; border-radius: 10px; box-shadow: 0 0 10px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; margin: -20px -20px 20px -20px; }
          .header h1 { margin: 0; font-size: 28px; }
          .content { padding: 20px 0; }
          .content h2 { color: #333; margin-bottom: 20px; }
          .content p { color: #666; margin-bottom: 15px; }
          .cta-button { display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 20px 0; text-align: center; }
          .cta-button:hover { opacity: 0.9; }
          .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #999; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>💼 Naeberly Platform</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">Quality matters</p>
          </div>

          <div class="content">
            <h2>Hi ${repFirstName},</h2>

            <p>Just checking in on your call with <strong>${dmFirstName}</strong>.</p>

            <p><strong>Did the call happen? Were they polite and engaged?</strong></p>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${feedbackUrl}" class="cta-button" style="color: white; text-decoration: none;">
                👉 Share quick feedback
              </a>
            </div>

            <p>This helps us ensure quality and accountability across the platform.</p>

            <p>Thanks for being part of it,</p>
          </div>

          <div class="footer">
            <p>The Naeberly Team<br>support@naeborly.com</p>
            <p>© 2025 Naeberly Platform. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
      Hi ${repFirstName},

      Just checking in on your call with ${dmFirstName}.

      Did the call happen? Were they polite and engaged?

      Share quick feedback: ${feedbackUrl}

      This helps us ensure quality and accountability across the platform.

      Thanks for being part of it,
      The Naeberly Team
      support@naeborly.com
    `,
  };

  try {
    const info = await getTransporter().sendMail(mailOptions);
    console.log(
      "Post-call feedback email sent to Rep successfully:",
      info.messageId,
    );
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("Failed to send post-call feedback email to Rep:", error);
    return { success: false, error: error.message };
  }
};

// Work email verification for decision makers
export const sendWorkEmailVerification = async (
  recipientEmail: string,
  verificationCode: string,
) => {
  const mailOptions = {
    from: '"Naeberly Platform" <noreply@naeberly.com>',
    to: recipientEmail,
    subject: "Verify your work email - Naeberly",
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          .container { max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 15px rgba(0,0,0,0.1); }
          .verification-code { 
            font-size: 36px; 
            font-weight: bold; 
            text-align: center; 
            background: #f8f9fa; 
            padding: 20px; 
            border-radius: 10px; 
            letter-spacing: 4px; 
            color: #2d3748; 
            margin: 20px 0; 
            border: 2px dashed #667eea;
          }
          .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #999; font-size: 14px; }
          .warning { background-color: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #ffc107; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔐 Email Verification</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">Verify your work email to complete registration</p>
          </div>

          <div class="content">
            <h2>Hello there!</h2>

            <p>Thank you for signing up for Naeberly! To complete your registration and verify your work email address, please use the following verification code:</p>

            <div class="verification-code">
              ${verificationCode}
            </div>

            <p>Enter this code in your registration form to continue with your account setup.</p>

            <div class="warning">
              <strong>⏰ Important:</strong> This verification code will expire in 15 minutes for security reasons.
            </div>

            <p><strong>Why verify your email?</strong></p>
            <ul>
              <li>Confirms your identity and company affiliation</li>
              <li>Ensures you receive important platform notifications</li>
              <li>Helps maintain the quality and security of our network</li>
            </ul>

            <p>If you didn't request this verification, please ignore this email or contact our support team.</p>

            <p style="margin-top: 30px;">Best regards,<br>The Naeberly Team</p>
          </div>

          <div class="footer">
            <p>© 2025 Naeberly Platform. All rights reserved.</p>
            <p>This email was sent to ${recipientEmail}</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
      Naeberly Email Verification

      Hello there!

      Thank you for signing up for Naeberly! To complete your registration and verify your work email address, please use the following verification code:

      Verification Code: ${verificationCode}

      Enter this code in your registration form to continue with your account setup.

      Important: This verification code will expire in 15 minutes for security reasons.

      If you didn't request this verification, please ignore this email or contact our support team.

      Best regards,
      The Naeberly Team
    `,
  };

  try {
    const info = await getTransporter().sendMail(mailOptions);
    console.log("Work email verification sent successfully:", info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error: any) {
    console.error("❌ Error sending work email verification to:", recipientEmail, error);
    return { success: false, error: error.message || "Failed to send email" };
  }
};

// Test email function
export const testEmailConnection = async () => {
  try {
    await transporter.verify();
    console.log("Email service is ready to send emails");
    return { success: true, message: "Email service connection verified" };
  } catch (error) {
    console.error("Email service verification failed:", error);
    throw error;
  }
};

// Send manual verification approval email
export const sendManualVerificationApprovalEmail = async (
  recipientEmail: string,
  recipientName: string,
  userRole: "sales_rep" | "decision_maker",
  reviewNotes?: string,
) => {
  const dashboardUrl = `${process.env.REPLIT_DOMAIN || "http://decisionmaker.shrawantravels.com"}/dashboard`;
  const roleDisplayName = userRole === "sales_rep" ? "Sales Representative" : "Decision Maker";

  const mailOptions = {
    from: '"Naeberly Platform" <noreply@naeberly.com>',
    to: recipientEmail,
    subject: `✅ Your Naeberly Account Has Been Approved!`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Account Approved - Naeberly</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; margin: 0; padding: 0; background-color: #f4f4f4; }
          .container { max-width: 600px; margin: 0 auto; background-color: white; padding: 20px; border-radius: 10px; box-shadow: 0 0 10px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; margin: -20px -20px 20px -20px; }
          .header h1 { margin: 0; font-size: 28px; }
          .header .icon { font-size: 48px; margin-bottom: 10px; }
          .content { padding: 20px 0; }
          .content h2 { color: #333; margin-bottom: 20px; }
          .content p { color: #666; margin-bottom: 15px; }
          .success-box { background-color: #d1fae5; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #10b981; }
          .success-box h3 { color: #065f46; margin: 0 0 10px 0; }
          .success-box p { color: #047857; margin: 0; }
          .cta-button { display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #6366f1 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 20px 0; }
          .cta-button:hover { opacity: 0.9; }
          .notes-section { background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0; }
          .next-steps { background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0; }
          .next-steps ol { margin: 0; padding-left: 20px; }
          .next-steps li { margin-bottom: 10px; color: #555; }
          .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #999; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="icon">✅</div>
            <h1>Account Approved!</h1>
            <p style="margin: 0; opacity: 0.9;">Your Naeberly account has been verified and approved</p>
          </div>
          
          <div class="content">
            <h2>Congratulations, ${recipientName}!</h2>
            
            <div class="success-box">
              <h3>🎉 Your ${roleDisplayName} account is now active!</h3>
              <p>Our admin team has reviewed and approved your account. You now have full access to the Naeberly platform.</p>
            </div>
            
            <p>Your account has been manually verified and you can now enjoy all the features available to verified ${roleDisplayName.toLowerCase()}s on our platform.</p>
            
            ${reviewNotes ? `
            <div class="notes-section">
              <h3>Admin Notes:</h3>
              <p><em>"${reviewNotes}"</em></p>
            </div>
            ` : ''}
            
            <div class="next-steps">
              <h3>What's Next?</h3>
              <ol>
                <li>Access your dashboard using the button below</li>
                <li>${userRole === "sales_rep" ? "Start inviting decision makers to join your network" : "Begin scheduling calls with sales representatives"}</li>
                <li>Complete your profile to maximize your success</li>
                <li>Explore all available features and tools</li>
              </ol>
            </div>
            
            <div style="text-align: center;">
              <a href="${dashboardUrl}" class="cta-button">Access Your Dashboard</a>
            </div>
            
            <p>If you have any questions or need assistance, please don't hesitate to contact our support team.</p>
            
            <p>Welcome to the Naeberly community!</p>
          </div>
          
          <div class="footer">
            <p>© 2024 Naeberly Platform. All rights reserved.</p>
            <p>This email was sent automatically. Please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `,
  };

  try {
    const transporter = getTransporter();
    await transporter.sendMail(mailOptions);
    console.log("✅ Manual verification approval email sent to:", recipientEmail);
  } catch (error) {
    console.error("❌ Failed to send manual verification approval email:", error);
    throw error;
  }
};

// Send manual verification rejection email
export const sendManualVerificationRejectionEmail = async (
  recipientEmail: string,
  recipientName: string,
  userRole: "sales_rep" | "decision_maker",
  reviewNotes?: string,
) => {
  const contactUrl = `${process.env.REPLIT_DOMAIN || "http://decisionmaker.shrawantravels.com"}/contact`;
  const roleDisplayName = userRole === "sales_rep" ? "Sales Representative" : "Decision Maker";

  const mailOptions = {
    from: '"Naeberly Platform" <noreply@naeberly.com>',
    to: recipientEmail,
    subject: `❌ Update on Your Naeberly Account Verification`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Account Verification Update - Naeberly</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; margin: 0; padding: 0; background-color: #f4f4f4; }
          .container { max-width: 600px; margin: 0 auto; background-color: white; padding: 20px; border-radius: 10px; box-shadow: 0 0 10px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; margin: -20px -20px 20px -20px; }
          .header h1 { margin: 0; font-size: 28px; }
          .header .icon { font-size: 48px; margin-bottom: 10px; }
          .content { padding: 20px 0; }
          .content h2 { color: #333; margin-bottom: 20px; }
          .content p { color: #666; margin-bottom: 15px; }
          .warning-box { background-color: #fef2f2; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #ef4444; }
          .warning-box h3 { color: #991b1b; margin: 0 0 10px 0; }
          .warning-box p { color: #dc2626; margin: 0; }
          .info-box { background-color: #eff6ff; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #3b82f6; }
          .info-box h3 { color: #1e40af; margin: 0 0 10px 0; }
          .info-box p { color: #1d4ed8; margin: 0; }
          .cta-button { display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #6366f1 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 20px 0; }
          .cta-button:hover { opacity: 0.9; }
          .notes-section { background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0; }
          .next-steps { background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0; }
          .next-steps ol { margin: 0; padding-left: 20px; }
          .next-steps li { margin-bottom: 10px; color: #555; }
          .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #999; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="icon">⚠️</div>
            <h1>Verification Update</h1>
            <p style="margin: 0; opacity: 0.9;">Important information about your account</p>
          </div>
          
          <div class="content">
            <h2>Hello ${recipientName},</h2>
            
            <div class="warning-box">
              <h3>Account Verification Status</h3>
              <p>Unfortunately, we were unable to approve your ${roleDisplayName} account at this time.</p>
            </div>
            
            <p>Our admin team has carefully reviewed your account application, and we need to address some concerns before we can proceed with verification.</p>
            
            ${reviewNotes ? `
            <div class="notes-section">
              <h3>Admin Feedback:</h3>
              <p><strong>"${reviewNotes}"</strong></p>
            </div>
            ` : ''}
            
            <div class="info-box">
              <h3>What This Means</h3>
              <p>Your account access may be limited until verification requirements are met. We encourage you to reach out to resolve any issues.</p>
            </div>
            
            <div class="next-steps">
              <h3>Next Steps:</h3>
              <ol>
                <li>Review the admin feedback above (if provided)</li>
                <li>Contact our support team for clarification</li>
                <li>Provide any additional documentation if requested</li>
                <li>Resubmit your application if necessary</li>
              </ol>
            </div>
            
            <div style="text-align: center;">
              <a href="${contactUrl}" class="cta-button">Contact Support</a>
            </div>
            
            <p>We understand this may be disappointing, but our verification process helps maintain the quality and security of our platform for all users.</p>
            
            <p>If you believe this decision was made in error or if you have additional information to provide, please don't hesitate to contact our support team.</p>
            
            <p>Thank you for your understanding.</p>
          </div>
          
          <div class="footer">
            <p>© 2024 Naeberly Platform. All rights reserved.</p>
            <p>This email was sent automatically. Please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `,
  };

  try {
    const transporter = getTransporter();
    await transporter.sendMail(mailOptions);
    console.log("✅ Manual verification rejection email sent to:", recipientEmail);
  } catch (error) {
    console.error("❌ Failed to send manual verification rejection email:", error);
    throw error;
  }
};
