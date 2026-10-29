import { Resend } from 'resend';
import { brandedEmail, escapeEmailHtml } from '@/lib/emailTemplates';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendEmail({ to, subject, html, text, attachments, from = 'FootballBank.soccer <contact@footballbank.soccer>' }) {
  try {
    // console.log("🔍 Starting sendEmail to:", to);
    // console.log("🔍 Resend API key exists:", !!process.env.RESEND_API_KEY);
    // console.log("🔍 Resend API key length:", process.env.RESEND_API_KEY?.length || 0);
    // console.log("🔍 Resend API key prefix:", process.env.RESEND_API_KEY?.substring(0, 10) + "...");
    
    // Validate required environment variables
    if (!process.env.RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY environment variable is not set');
    }

    if (!to || !subject) {
      throw new Error('Missing required email parameters: to and subject are required');
    }

    // console.log("🔍 Attempting to send email with Resend API...");
    
    const emailPayload = {
      from,
      to: [to],
      subject,
      html,
      text,
      ...(attachments?.length ? { attachments } : {}),
    };
    const { data, error } = await resend.emails.send(emailPayload);

    // console.log("🔍 Resend response - data:", data, "error:", error);

    if (error) {
      console.error('🔍 Email sending error:', error);
      
      // Handle specific Resend API errors
      if (error.name === 'application_error') {
        throw new Error(`Resend API error: ${error.message}. This might be a network connectivity issue or API endpoint problem.`);
      } else if (error.name === 'validation_error') {
        throw new Error(`Email validation error: ${error.message}. Please check the email format and content.`);
      } else if (error.name === 'rate_limit_error') {
        throw new Error(`Rate limit exceeded: ${error.message}. Please try again later.`);
      } else {
        throw new Error(`Failed to send email: ${error.message || 'Unknown error'}`);
      }
    }

    // console.log("🔍 Email sent successfully with ID:", data?.id);
    return { success: true, messageId: data?.id };
  } catch (error) {
    console.error('🔍 Email service error:', error);
    console.error('🔍 Error details:', {
      message: error.message,
      name: error.name,
      stack: error.stack
    });
    
    // Provide more specific error messages
    if (error.message.includes('fetch')) {
      throw new Error(`Network error: Unable to connect to Resend API. Please check your internet connection and try again.`);
    } else if (error.message.includes('API key')) {
      throw new Error(`Authentication error: Invalid or missing Resend API key. Please check your RESEND_API_KEY environment variable.`);
    } else {
      throw new Error(`Email service unavailable: ${error.message}`);
    }
  }
}

export function generateOTPEmailTemplate(otp, type) {
  const titles = {
    login: 'Login Verification Code',
    signup: 'Welcome to FootballBank.soccer',
    reset: 'Password Reset Code',
    verification: 'Email Verification Code'
  };

  const messages = {
    login: 'Use this code to complete your login:',
    signup: 'Welcome to FootballBank.soccer! Use this code to verify your email:',
    reset: 'Use this code to reset your password:',
    verification: 'Use this code to verify your email address:'
  };

  return brandedEmail({
    preheader: messages[type],
    title: titles[type],
    greeting: messages[type],
    body: `<div style="margin:28px 0;padding:18px;background:#0b1220;color:#ffffff;text-align:center;font-family:monospace;font-size:32px;font-weight:700;letter-spacing:8px">${escapeEmailHtml(otp)}</div><p style="padding:14px 16px;background:#fff7d6;border-left:3px solid #fbbf24;color:#6b4f00;font-size:13px">This code expires in 10 minutes. Never share it with anyone.</p>`,
    footerNote: "If you did not request this code, you can safely ignore this email.",
  }).html;
}

export async function sendWelcomeEmail({ to, firstName }) {
  const email = brandedEmail({
    preheader: "Welcome to FootballBank International",
    title: "Welcome to FootballBank",
    greeting: `Hello ${firstName || "there"},`,
    body: "<p>Your FootballBank account is ready. You can sign in with email verification and explore opportunities across the football network.</p>",
    ctaLabel: "Open FootballBank",
    ctaUrl: "https://footballbank.soccer/en",
    footerNote: "Your account is protected by email verification.",
  });
  return sendEmail({ to, subject: "Welcome to FootballBank International", ...email });
}

export async function sendMediaAccessEmail({ to, recipientName, playerName, organization, customMessage, expiresAt, url }) {
  const expiry = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }).format(expiresAt);
  const safeMessage = customMessage ? `<p>${escapeEmailHtml(customMessage)}</p>` : "";
  const email = brandedEmail({
    eyebrow: "FootballBank Media",
    preheader: `Private media access for ${playerName}`,
    title: "Player media access",
    greeting: `Hello ${recipientName},`,
    body: `<p>You have been granted private access to the FootballBank profile and media library for <strong>${escapeEmailHtml(playerName)}</strong>.</p>${safeMessage}`,
    details: [{ label: "Organisation", value: organization || "Not provided" }, { label: "Access expires (UTC)", value: expiry }],
    ctaLabel: "View player media",
    ctaUrl: url,
    footerNote: "This personal access link is time-limited. Please do not forward it.",
  });
  return sendEmail({
    to,
    subject: `Private player media access: ${playerName}`,
    from: "FootballBank Media <media@footballbank.soccer>",
    ...email,
  });
}

export async function sendPlayerSubmissionDecisionEmail({ to, firstName, playerName, approved, reason }) {
  const email = brandedEmail({
    preheader: approved ? "Your player profile has been approved" : "Update on your player profile submission",
    title: approved ? "Player profile approved" : "Player profile submission update",
    greeting: `Hello ${firstName || "there"},`,
    body: approved
      ? `<p>Your player profile for <strong>${escapeHtml(playerName)}</strong> has been approved and is now part of the FootballBank player network.</p>`
      : `<p>Your player profile submission for <strong>${escapeHtml(playerName)}</strong> was not approved at this time.</p><p><strong>Reason:</strong> ${escapeHtml(reason || "Please review your submission and try again.")}</p>`,
    ctaLabel: approved ? "View player profile" : "Submit again",
    ctaUrl: approved ? "https://footballbank.soccer/en/player-profile" : "https://footballbank.soccer/en/submit-profile",
    footerNote: "For questions, reply to this email or contact contact@footballbank.soccer.",
  });
  return sendEmail({ to, subject: approved ? "Your FootballBank player profile was approved" : "Update on your FootballBank player submission", ...email });
}

export async function sendOTPEmail(email, otp, type) {
  try {
    // console.log("🔍 Starting sendOTPEmail for:", email, "type:", type);
    
    const subject = type === 'signup' 
      ? 'Welcome to FootballBank.soccer - Verify Your Email'
      : `Your FootballBank.soccer ${type === 'login' ? 'Login' : type === 'reset' ? 'Password Reset' : 'Verification'} Code`;

    // console.log("🔍 Email subject:", subject);

    const html = generateOTPEmailTemplate(otp, type);
    // console.log("🔍 Email template generated");
    
    const result = await sendEmail({
      to: email,
      subject,
      html,
      text: `Your verification code is: ${otp}. This code expires in 10 minutes.`
    });
    
    // console.log("🔍 Email sent successfully:", result);
    return result;
  } catch (error) {
    console.error("🔍 Error in sendOTPEmail:", error);
    console.error("🔍 Error stack:", error.stack);
    
    // Add fallback mechanism - you could implement alternative email services here
    // console.log("🔍 Attempting fallback email service...");
    
    // For now, we'll just re-throw the error, but you could add:
    // - Alternative email service (SendGrid, Mailgun, etc.)
    // - SMS fallback
    // - Queue for retry later
    
    throw error;
  }
}
