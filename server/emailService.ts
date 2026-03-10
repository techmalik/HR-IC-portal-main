import { Resend } from "resend";
import { storage } from "./storage";
import type { NotificationPreferences } from "@shared/schema";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
if (resend) {
  console.log(`[EMAIL] Using FROM_EMAIL: ${process.env.FROM_EMAIL || "notifications@resend.dev"}`);
}

const APP_NAME = "TeamFlow";
const BRAND_COLOR = "#2563EB";

const FROM_EMAIL = process.env.FROM_EMAIL || "notifications@resend.dev";

export interface EmailPayload {
  type: string;
  title: string;
  message: string;
  entityType?: string;
  entityId?: string;
  actorName?: string;
  additionalDetails?: Record<string, string>;
}

function getEmailCategoryFromType(type: string): keyof NotificationPreferences | null {
  if (type.startsWith("ooo_")) return "oooNotifications";
  if (type.startsWith("timesheet_")) return "timesheetNotifications";
  if (type.startsWith("overtime_")) return "overtimeNotifications";
  if (type.startsWith("invoice_")) return "invoiceNotifications";
  if (type === "deadline_reminder") return "deadlineReminders";
  if (type.startsWith("evaluation_") || type === "feedback_requested") return "evaluationNotifications";
  return null;
}

async function shouldSendEmail(userId: string, notificationType: string): Promise<boolean> {
  const prefs = await storage.getNotificationPreferences(userId);
  // If no preferences found, default to enabled
  if (!prefs) return true;
  if (!prefs.emailEnabled) return false;

  const category = getEmailCategoryFromType(notificationType);
  if (category && prefs[category] === false) return false;

  return true;
}

function getStatusColor(type: string): string {
  if (type.includes("approved")) return "#10B981";
  if (type.includes("rejected")) return "#EF4444";
  if (type.includes("submitted") || type.includes("uploaded")) return "#F59E0B";
  if (type.includes("created")) return "#6366F1";
  if (type.includes("reminder") || type.includes("requested")) return "#8B5CF6";
  return "#6366F1";
}

function getStatusLabel(type: string): string {
  if (type.includes("approved")) return "Approved";
  if (type.includes("rejected")) return "Rejected";
  if (type.includes("submitted")) return "Pending Review";
  if (type.includes("uploaded")) return "Pending Review";
  if (type.includes("created")) return "New";
  if (type.includes("reminder")) return "Reminder";
  if (type.includes("requested")) return "Action Required";
  return "Update";
}

function getDeepLink(baseUrl: string, payload: EmailPayload): string {
  if (!baseUrl || baseUrl === '#') return '#';
  
  const { entityType, entityId, type } = payload;
  
  // Generate appropriate deep link based on entity type and notification type
  // Support both short and full entity type names (e.g., 'ooo' and 'ooo_request')
  // Routes must match actual application routes in App.tsx
  if ((entityType === 'ooo' || entityType === 'ooo_request') && entityId) {
    return `${baseUrl}/ooo-requests?highlight=${entityId}`;
  }
  if ((entityType === 'timesheet' || entityType === 'timesheet_entry') && entityId) {
    return `${baseUrl}/timesheets?highlight=${entityId}`;
  }
  if (entityType === 'invoice' && entityId) {
    return `${baseUrl}/invoices?highlight=${entityId}`;
  }
  if ((entityType === 'overtime' || entityType === 'overtime_request') && entityId) {
    return `${baseUrl}/overtime-approvals?highlight=${entityId}`;
  }
  if (entityType === 'evaluation' && entityId) {
    return `${baseUrl}/evaluations?highlight=${entityId}`;
  }
  
  // Fallback based on notification type prefix
  if (type.startsWith('ooo_')) {
    return `${baseUrl}/ooo-requests`;
  }
  if (type.startsWith('timesheet_')) {
    return `${baseUrl}/timesheets`;
  }
  if (type.startsWith('invoice_')) {
    return `${baseUrl}/invoices`;
  }
  if (type.startsWith('overtime_')) {
    return `${baseUrl}/overtime-approvals`;
  }
  if (type.startsWith('evaluation_') || type === 'feedback_requested') {
    return `${baseUrl}/evaluations`;
  }
  
  // Default to dashboard
  return baseUrl;
}

function generateEmailHtml(payload: EmailPayload): string {
  const statusColor = getStatusColor(payload.type);
  const statusLabel = getStatusLabel(payload.type);
  const baseUrl = process.env.REPLIT_DOMAINS?.split(',')[0] 
    ? `https://${process.env.REPLIT_DOMAINS.split(',')[0]}` 
    : '#';
  const appUrl = getDeepLink(baseUrl, payload);

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${payload.title}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background-color: ${BRAND_COLOR}; padding: 32px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700; letter-spacing: -0.025em;">${APP_NAME}</h1>
            </td>
          </tr>
          
          <!-- Status Badge -->
          <tr>
            <td style="padding: 32px 32px 0;">
              <span style="display: inline-block; background-color: ${statusColor}15; color: ${statusColor}; padding: 6px 12px; border-radius: 4px; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">
                ${statusLabel}
              </span>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 24px 32px;">
              <h2 style="margin: 0 0 16px; color: #18181b; font-size: 24px; font-weight: 600;">${payload.title}</h2>
              <p style="margin: 0 0 24px; color: #52525b; font-size: 16px; line-height: 1.6;">${payload.message}</p>
              
              ${payload.actorName ? `
              <p style="margin: 0 0 16px; color: #71717a; font-size: 14px;">
                <strong>Action by:</strong> ${payload.actorName}
              </p>
              ` : ''}
              
              ${payload.additionalDetails && Object.keys(payload.additionalDetails).length > 0 ? `
              <table style="margin: 16px 0; border-collapse: collapse;">
                ${Object.entries(payload.additionalDetails).map(([key, value]) => `
                <tr>
                  <td style="padding: 4px 16px 4px 0; color: #71717a; font-size: 14px; font-weight: 500;">${key}:</td>
                  <td style="padding: 4px 0; color: #52525b; font-size: 14px;">${value}</td>
                </tr>
                `).join('')}
              </table>
              ` : ''}
            </td>
          </tr>
          
          <!-- CTA Button -->
          <tr>
            <td style="padding: 0 32px 32px;">
              <a href="${appUrl}" 
                 style="display: inline-block; background-color: ${BRAND_COLOR}; color: #ffffff; padding: 14px 28px; border-radius: 6px; text-decoration: none; font-size: 14px; font-weight: 600; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                View in ${APP_NAME}
              </a>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #fafafa; padding: 24px 32px; border-top: 1px solid #e4e4e7;">
              <p style="margin: 0; color: #a1a1aa; font-size: 12px; line-height: 1.5;">
                You're receiving this email because you have email notifications enabled in your ${APP_NAME} account. 
                You can update your notification preferences in Settings.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

function generatePlainText(payload: EmailPayload): string {
  let text = `${payload.title}\n\n${payload.message}`;
  
  if (payload.actorName) {
    text += `\n\nAction by: ${payload.actorName}`;
  }
  
  if (payload.additionalDetails && Object.keys(payload.additionalDetails).length > 0) {
    text += "\n\nDetails:";
    for (const [key, value] of Object.entries(payload.additionalDetails)) {
      text += `\n${key}: ${value}`;
    }
  }
  
  text += `\n\n---\nThis is an automated notification from ${APP_NAME}.`;
  
  return text;
}

export async function sendNotificationEmail(
  userId: string,
  payload: EmailPayload
): Promise<boolean> {
  console.log(`[EMAIL] Attempting to send email for ${payload.type} to user ${userId}`);
  
  if (!resend) {
    console.log("[EMAIL] Email service not configured (RESEND_API_KEY missing)");
    return false;
  }

  try {
    const shouldSend = await shouldSendEmail(userId, payload.type);
    console.log(`[EMAIL] shouldSendEmail result: ${shouldSend}`);
    if (!shouldSend) {
      console.log("[EMAIL] Email blocked by user preferences");
      return false;
    }

    const user = await storage.getUser(userId);
    if (!user || !user.email) {
      console.log(`[EMAIL] No email found for user ${userId}`);
      return false;
    }

    console.log(`[EMAIL] Sending email to ${user.email} with subject: [${APP_NAME}] ${payload.title}`);
    
    const result = await resend.emails.send({
      from: FROM_EMAIL,
      to: user.email,
      subject: `[${APP_NAME}] ${payload.title}`,
      html: generateEmailHtml(payload),
      text: generatePlainText(payload),
    });

    if (result.error) {
      console.error("[EMAIL] Failed to send email:", result.error);
      return false;
    }

    console.log(`[EMAIL] Email sent successfully to ${user.email}: ${payload.title}`);
    return true;
  } catch (error) {
    console.error("[EMAIL] Error sending email:", error);
    return false;
  }
}

export function isEmailServiceConfigured(): boolean {
  return !!resend;
}
