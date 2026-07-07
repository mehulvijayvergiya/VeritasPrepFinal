import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM = process.env.EMAIL_FROM || "Veritas Prep <onboarding@resend.dev>";
const BUSINESS_EMAIL = process.env.BUSINESS_EMAIL || "veritasprepinfo@gmail.com";
const BUSINESS_PHONE = "949-873-5192";

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

export async function sendFeedbackEmail({ to, name, essay, annotations, comments }) {
  const firstName = (name || "").split(" ")[0] || "there";
  const html = wrapper(`
    <p style="font-family: Arial, sans-serif; font-size: 15px; line-height: 1.6;">Hi ${firstName},</p>
    <p style="font-family: Arial, sans-serif; font-size: 15px; line-height: 1.6;">
      Here's feedback on the essay you submitted.
    </p>
    ${renderCommentsHtml(comments)}
    ${renderAnnotationsHtml(essay, annotations)}
    <p style="font-family: Arial, sans-serif; font-size: 15px; line-height: 1.6; margin-top: 28px;">
      Reply to this email any time with questions.
    </p>
    <p style="font-family: Arial, sans-serif; font-size: 15px; line-height: 1.6;">
      — Veritas Prep
    </p>
  `);
  return sendEmail({ to, subject: "Your essay feedback — Veritas Prep", html });
}
