import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const BUSINESS_EMAIL = process.env.BUSINESS_EMAIL || "veritasprepinfo@gmail.com";
const BUSINESS_PHONE = "949-873-5192";
const FROM = process.env.EMAIL_FROM || `Veritas Prep <${BUSINESS_EMAIL}>`;

async function sendEmail({ to, subject, html }) {
  if (!resend) {
    // No API key configured — log instead of sending, so local dev never breaks
    // and nothing silently fails to reach a student.
    console.log(`\n[email:dry-run] Would send "${subject}" to ${to}`);
    console.log("Set RESEND_API_KEY in server/.env to actually send this.\n");
    return { dryRun: true };
  }

  const { data, error } = await resend.emails.send({ from: FROM, to, subject, html });
  if (error) throw new Error(error.message || "Failed to send email.");
  return data;
}

const wrapper = (bodyHtml) => `
  <div style="font-family: Georgia, 'Times New Roman', serif; max-width: 600px; margin: 0 auto; color: #0B1F3B;">
    <div style="border-bottom: 3px solid #C9A227; padding-bottom: 16px; margin-bottom: 28px;">
      <span style="font-size: 20px; letter-spacing: 0.02em;">Veritas Prep</span>
    </div>
    ${bodyHtml}
    <div style="margin-top: 40px; padding-top: 16px; border-top: 1px solid #E4DFD3; font-family: Arial, sans-serif; font-size: 12px; color: #6B7280;">
      Veritas Prep — Authentic stories. Stronger applications.<br />
      ${BUSINESS_EMAIL} &nbsp;·&nbsp; ${BUSINESS_PHONE}
    </div>
  </div>
`;

export async function sendConfirmationEmail({ to, name }) {
  const firstName = (name || "").split(" ")[0] || "there";
  const html = wrapper(`
    <p style="font-family: Arial, sans-serif; font-size: 15px; line-height: 1.6;">Hi ${firstName},</p>
    <p style="font-family: Arial, sans-serif; font-size: 15px; line-height: 1.6;">
      Thanks for submitting your application materials to Veritas Prep. We've
      received your essay and activities list, and we read every submission
      closely and personally.
    </p>
    <p style="font-family: Arial, sans-serif; font-size: 15px; line-height: 1.6;">
      You can expect detailed feedback by email within <strong>3–5 days</strong>.
    </p>
    <p style="font-family: Arial, sans-serif; font-size: 15px; line-height: 1.6;">
      — Veritas Prep
    </p>
  `);
  return sendEmail({ to, subject: "We've received your application — Veritas Prep", html });
}

function renderAnnotationsHtml(essay, annotations) {
  if (!annotations || annotations.length === 0) return "";
  const sorted = [...annotations].sort((a, b) => a.start - b.start);
  const items = sorted
    .map((a) => {
      const excerpt = essay.slice(a.start, a.end).trim();
      const label = { highlight: "Highlighted", underline: "Underlined", note: "Noted" }[a.type] || "Marked";
      return `
        <div style="margin-bottom: 16px; padding: 12px 16px; background: #FAF7F1; border-left: 3px solid #C9A227;">
          <p style="font-family: Georgia, serif; font-style: italic; font-size: 14px; margin: 0 0 6px 0; color: #0B1F3B;">
            "${excerpt}"
          </p>
          <p style="font-family: Arial, sans-serif; font-size: 12px; text-transform: uppercase; letter-spacing: 0.04em; color: #A9820F; margin: 0 0 4px 0;">
            ${label}
          </p>
          ${a.note ? `<p style="font-family: Arial, sans-serif; font-size: 14px; line-height: 1.5; margin: 0; color: #1C2430;">${a.note}</p>` : ""}
        </div>
      `;
    })
    .join("");
  return `
    <h3 style="font-family: Arial, sans-serif; font-size: 13px; text-transform: uppercase; letter-spacing: 0.06em; color: #A9820F; margin: 28px 0 12px 0;">
      Line notes on your essay
    </h3>
    ${items}
  `;
}

function renderCommentsHtml(comments) {
  if (!comments || comments.length === 0) return "";
  const items = comments
    .map(
      (c) => `
        <p style="font-family: Arial, sans-serif; font-size: 15px; line-height: 1.6; margin: 0 0 14px 0;">
          ${c.text}
        </p>
      `
    )
    .join("");
  return `
    <h3 style="font-family: Arial, sans-serif; font-size: 13px; text-transform: uppercase; letter-spacing: 0.06em; color: #A9820F; margin: 28px 0 12px 0;">
      Overall feedback
    </h3>
    ${items}
  `;
}

export async function sendFeedbackEmail({ to, name, submission }) {
  const firstName = (name || submission?.name || "").split(" ")[0] || "there";
  const html = wrapper(`
    <p style="font-family: Arial, sans-serif; font-size: 15px; line-height: 1.6;">Hi ${firstName},</p>
    <p style="font-family: Arial, sans-serif; font-size: 15px; line-height: 1.6;">
      There's a new feedback update on your Veritas Prep dashboard.
    </p>
    <p style="font-family: Arial, sans-serif; font-size: 15px; line-height: 1.6; margin-top: 28px;">
      Log in to your account to review the full feedback for <strong>${submission?.submission_title || serviceLabel(submission || {})}</strong>.
    </p>
    <p style="font-family: Arial, sans-serif; font-size: 15px; line-height: 1.6;">
      — Veritas Prep
    </p>
  `);
  return sendEmail({ to, subject: "New feedback is available in your dashboard — Veritas Prep", html });
}

function serviceLabel(submission) {
  return submission.service_label || submission.service_key || "Submission";
}

function formatSubmissionSummary(submission) {
  return `
    <ul style="font-family: Arial, sans-serif; font-size: 14px; line-height: 1.7; color: #1C2430; padding-left: 18px;">
      <li><strong>Submission:</strong> ${submission.submission_title || serviceLabel(submission)}</li>
      <li><strong>Service:</strong> ${serviceLabel(submission)}</li>
      ${submission.essay_for_college ? `<li><strong>College:</strong> ${submission.essay_for_college}</li>` : ""}
      ${submission.word_count ? `<li><strong>Word count:</strong> ${submission.word_count}</li>` : ""}
      ${submission.essay_prompt ? `<li><strong>Prompt:</strong> ${submission.essay_prompt}</li>` : ""}
      <li><strong>Submitted:</strong> ${new Date(submission.created_at).toLocaleString()}</li>
    </ul>
  `;
}

export async function sendSubmissionApprovedEmail({ submission }) {
  const firstName = (submission.name || "").split(" ")[0] || "there";
  const html = wrapper(`
    <p style="font-family: Arial, sans-serif; font-size: 15px; line-height: 1.6;">Hi ${firstName},</p>
    <p style="font-family: Arial, sans-serif; font-size: 15px; line-height: 1.6;">
      We've reviewed your submission details and your request is now in our active queue.
    </p>
    ${formatSubmissionSummary(submission)}
    <p style="font-family: Arial, sans-serif; font-size: 15px; line-height: 1.6;">
      We'll get back to you soon with feedback.
    </p>
    <p style="font-family: Arial, sans-serif; font-size: 15px; line-height: 1.6;">— Veritas Prep</p>
  `);
  return sendEmail({ to: submission.email, subject: "Your submission is approved and in review — Veritas Prep", html });
}

export async function sendSubmissionCompletedEmail({ submission }) {
  const firstName = (submission.name || "").split(" ")[0] || "there";
  const html = wrapper(`
    <p style="font-family: Arial, sans-serif; font-size: 15px; line-height: 1.6;">Hi ${firstName},</p>
    <p style="font-family: Arial, sans-serif; font-size: 15px; line-height: 1.6;">
      We've finished checking your submission.
    </p>
    ${formatSubmissionSummary(submission)}
    <p style="font-family: Arial, sans-serif; font-size: 15px; line-height: 1.6;">
      Please log in to your account dashboard to review your written feedback and any next-step notes.
    </p>
    <p style="font-family: Arial, sans-serif; font-size: 15px; line-height: 1.6;">— Veritas Prep</p>
  `);
  return sendEmail({ to: submission.email, subject: "Update: your submission review is complete — Veritas Prep", html });
}

export async function sendCreditRequestReceivedEmail({ request }) {
  const html = wrapper(`
    <p style="font-family: Arial, sans-serif; font-size: 15px; line-height: 1.6;">Hi there,</p>
    <p style="font-family: Arial, sans-serif; font-size: 15px; line-height: 1.6;">
      We received your credit purchase request.
    </p>
    <ul style="font-family: Arial, sans-serif; font-size: 14px; line-height: 1.7; color: #1C2430; padding-left: 18px;">
      <li><strong>Amount:</strong> $${request.amount_usd}</li>
      <li><strong>Credits:</strong> ${request.vc} VC</li>
      <li><strong>Method:</strong> ${request.method}</li>
    </ul>
    <p style="font-family: Arial, sans-serif; font-size: 15px; line-height: 1.6;">
      We'll confirm and update your balance shortly.
    </p>
  `);
  return sendEmail({ to: request.email, subject: "We received your credit request — Veritas Prep", html });
}

export async function sendCreditApprovedEmail({ request }) {
  const html = wrapper(`
    <p style="font-family: Arial, sans-serif; font-size: 15px; line-height: 1.6;">Hi there,</p>
    <p style="font-family: Arial, sans-serif; font-size: 15px; line-height: 1.6;">
      Your credit purchase has been approved and added to your account.
    </p>
    <ul style="font-family: Arial, sans-serif; font-size: 14px; line-height: 1.7; color: #1C2430; padding-left: 18px;">
      <li><strong>Amount:</strong> $${request.amount_usd}</li>
      <li><strong>Credits added:</strong> ${request.vc} VC</li>
    </ul>
    <p style="font-family: Arial, sans-serif; font-size: 15px; line-height: 1.6;">
      Log in to your dashboard to see your updated balance.
    </p>
  `);
  return sendEmail({ to: request.email, subject: "Your credits are now available — Veritas Prep", html });
}

function formatAppointmentSummary(appointment) {
  return `${appointment.slot?.date || appointment.date} at ${appointment.slot?.time || appointment.time}`;
}

export async function sendMeetingApprovedEmail({ appointment }) {
  const firstName = (appointment.studentName || "").split(" ")[0] || "there";
  const html = wrapper(`
    <p style="font-family: Arial, sans-serif; font-size: 15px; line-height: 1.6;">Hi ${firstName},</p>
    <p style="font-family: Arial, sans-serif; font-size: 15px; line-height: 1.6;">
      Your meeting request has been approved.
    </p>
    <ul style="font-family: Arial, sans-serif; font-size: 14px; line-height: 1.7; color: #1C2430; padding-left: 18px;">
      <li><strong>Time:</strong> ${formatAppointmentSummary(appointment)}</li>
      <li><strong>Status:</strong> Confirmed</li>
    </ul>
    <p style="font-family: Arial, sans-serif; font-size: 15px; line-height: 1.6;">— Veritas Prep</p>
  `);
  return sendEmail({ to: appointment.studentEmail, subject: "Meeting confirmed — Veritas Prep", html });
}

export async function sendMeetingRejectedEmail({ appointment }) {
  const firstName = (appointment.studentName || "").split(" ")[0] || "there";
  const html = wrapper(`
    <p style="font-family: Arial, sans-serif; font-size: 15px; line-height: 1.6;">Hi ${firstName},</p>
    <p style="font-family: Arial, sans-serif; font-size: 15px; line-height: 1.6;">
      Your meeting request for ${formatAppointmentSummary(appointment)} was declined. Please choose another available slot.
    </p>
    <p style="font-family: Arial, sans-serif; font-size: 15px; line-height: 1.6;">— Veritas Prep</p>
  `);
  return sendEmail({ to: appointment.studentEmail, subject: "Meeting update — Veritas Prep", html });
}

export async function sendMeetingCompletedEmail({ appointment }) {
  const firstName = (appointment.studentName || "").split(" ")[0] || "there";
  const html = wrapper(`
    <p style="font-family: Arial, sans-serif; font-size: 15px; line-height: 1.6;">Hi ${firstName},</p>
    <p style="font-family: Arial, sans-serif; font-size: 15px; line-height: 1.6;">
      Your meeting at ${formatAppointmentSummary(appointment)} has been marked complete.
    </p>
    <p style="font-family: Arial, sans-serif; font-size: 15px; line-height: 1.6;">— Veritas Prep</p>
  `);
  return sendEmail({ to: appointment.studentEmail, subject: "Meeting completed — Veritas Prep", html });
}
