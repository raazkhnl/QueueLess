const nodemailer = require('nodemailer');

// Using Sender.net SMTP
const createTransporter = () => {
  return nodemailer.createTransport({
    host: 'smtp.sender.net',
    port: 587,
    secure: false,
    auth: {
      user: process.env.SENDER_API_TOKEN || '',
      pass: process.env.SENDER_API_TOKEN || '',
    },
  });
};

const sendEmail = async ({ to, subject, html, text }) => {
  try {
    const transporter = createTransporter();
    const info = await transporter.sendMail({
      from: `"QueueLess" <${process.env.SENDER_FROM_EMAIL || 'noreply@queueless.app'}>`,
      to,
      subject,
      html,
      text,
    });
    console.log(`Email sent: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Email send failed:', error.message);
    return { success: false, error: error.message };
  }
};

const emailTemplates = {
  bookingConfirmed: (data) => ({
    subject: `Booking Confirmed - ${data.refCode} | QueueLess`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#f9fafb;padding:20px;">
        <div style="background:#2563eb;color:white;padding:20px;border-radius:8px 8px 0 0;text-align:center;">
          <h1 style="margin:0;font-size:24px;">✅ Booking Confirmed</h1>
        </div>
        <div style="background:white;padding:24px;border-radius:0 0 8px 8px;border:1px solid #e5e7eb;">
          <p>Hello <strong>${data.name}</strong>,</p>
          <p>Your appointment has been confirmed.</p>
          <table style="width:100%;border-collapse:collapse;margin:16px 0;">
            <tr><td style="padding:8px;border-bottom:1px solid #e5e7eb;color:#6b7280;">Reference</td><td style="padding:8px;border-bottom:1px solid #e5e7eb;font-weight:bold;">${data.refCode}</td></tr>
            <tr><td style="padding:8px;border-bottom:1px solid #e5e7eb;color:#6b7280;">Service</td><td style="padding:8px;border-bottom:1px solid #e5e7eb;">${data.serviceName}</td></tr>
            <tr><td style="padding:8px;border-bottom:1px solid #e5e7eb;color:#6b7280;">Branch</td><td style="padding:8px;border-bottom:1px solid #e5e7eb;">${data.branchName}</td></tr>
            <tr><td style="padding:8px;border-bottom:1px solid #e5e7eb;color:#6b7280;">Date</td><td style="padding:8px;border-bottom:1px solid #e5e7eb;">${data.date}</td></tr>
            <tr><td style="padding:8px;border-bottom:1px solid #e5e7eb;color:#6b7280;">Time</td><td style="padding:8px;border-bottom:1px solid #e5e7eb;">${data.startTime} - ${data.endTime}</td></tr>
            <tr><td style="padding:8px;color:#6b7280;">Token #</td><td style="padding:8px;font-weight:bold;font-size:18px;color:#2563eb;">${data.tokenNumber}</td></tr>
          </table>
          <div style="text-align:center;margin:20px 0;">
            <a href="${process.env.FRONTEND_URL}/appointments/${data.refCode}" style="background:#2563eb;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;">View Appointment</a>
          </div>
          <p style="color:#6b7280;font-size:12px;text-align:center;">QueueLess - Public Service, Fast Forward</p>
        </div>
      </div>
    `
  }),

  bookingCancelled: (data) => ({
    subject: `Booking Cancelled - ${data.refCode} | QueueLess`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#f9fafb;padding:20px;">
        <div style="background:#ef4444;color:white;padding:20px;border-radius:8px 8px 0 0;text-align:center;">
          <h1 style="margin:0;font-size:24px;">❌ Booking Cancelled</h1>
        </div>
        <div style="background:white;padding:24px;border-radius:0 0 8px 8px;border:1px solid #e5e7eb;">
          <p>Hello <strong>${data.name}</strong>,</p>
          <p>Your appointment <strong>${data.refCode}</strong> for <strong>${data.serviceName}</strong> on <strong>${data.date}</strong> at <strong>${data.startTime}</strong> has been cancelled.</p>
          ${data.reason ? `<p>Reason: ${data.reason}</p>` : ''}
          <p style="color:#6b7280;font-size:12px;text-align:center;margin-top:20px;">QueueLess - Public Service, Fast Forward</p>
        </div>
      </div>
    `
  }),

  bookingReminder: (data) => ({
    subject: `Reminder: Appointment Tomorrow - ${data.refCode} | QueueLess`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#f9fafb;padding:20px;">
        <div style="background:#f59e0b;color:white;padding:20px;border-radius:8px 8px 0 0;text-align:center;">
          <h1 style="margin:0;font-size:24px;">⏰ Appointment Reminder</h1>
        </div>
        <div style="background:white;padding:24px;border-radius:0 0 8px 8px;border:1px solid #e5e7eb;">
          <p>Hello <strong>${data.name}</strong>,</p>
          <p>This is a reminder for your upcoming appointment.</p>
          <p><strong>Service:</strong> ${data.serviceName}<br/>
          <strong>Branch:</strong> ${data.branchName}<br/>
          <strong>Date:</strong> ${data.date}<br/>
          <strong>Time:</strong> ${data.startTime} - ${data.endTime}<br/>
          <strong>Token #:</strong> ${data.tokenNumber}</p>
          <p style="color:#6b7280;font-size:12px;text-align:center;margin-top:20px;">QueueLess - Public Service, Fast Forward</p>
        </div>
      </div>
    `
  }),

  otpEmail: (data) => ({
    subject: `Your OTP Code - QueueLess`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#f9fafb;padding:20px;">
        <div style="background:#2563eb;color:white;padding:20px;border-radius:8px 8px 0 0;text-align:center;">
          <h1 style="margin:0;font-size:24px;">🔐 OTP Verification</h1>
        </div>
        <div style="background:white;padding:24px;border-radius:0 0 8px 8px;border:1px solid #e5e7eb;text-align:center;">
          <p>Your verification code is:</p>
          <p style="font-size:32px;font-weight:bold;color:#2563eb;letter-spacing:8px;margin:20px 0;">${data.otp}</p>
          <p style="color:#6b7280;">This code expires in 10 minutes.</p>
        </div>
      </div>
    `
  }),
};

module.exports = { sendEmail, emailTemplates };
