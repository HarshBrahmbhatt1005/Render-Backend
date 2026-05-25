import nodemailer from 'nodemailer';

// Create reusable transporter
const createTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail', // or 'smtp.gmail.com'
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
};

// Centralized email sending function
export const sendEmail = async ({ to, subject, html, text }) => {
  try {
    // Validate environment variables
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      throw new Error('Email credentials not configured in environment variables');
    }

    const transporter = createTransporter();

    const mailOptions = {
      from: `"Builder Visit System" <${process.env.EMAIL_USER}>`,
      to: Array.isArray(to) ? to.join(', ') : to,
      subject,
      html: html || text,
      text: text || '',
    };

    const info = await transporter.sendMail(mailOptions);
    
    console.log('✅ Email sent successfully:', {
      messageId: info.messageId,
      to: mailOptions.to,
      subject: mailOptions.subject,
    });

    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Email sending failed:', {
      error: error.message,
      to,
      subject,
    });
    
    // Don't throw error - log it and continue
    return { success: false, error: error.message };
  }
};

// Email template for Form 1 submission (Builder Visit)
export const sendBuilderVisitSubmissionEmail = async (visitData, adminEmails) => {
  const subject = `New Builder Visit Submitted - ${visitData.projectName || 'N/A'}`;
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 10px;">
        New Builder Visit Submitted
      </h2>
      
      <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <h3 style="color: #34495e; margin-top: 0;">Project Details</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px; font-weight: bold; width: 40%;">Project Name:</td>
            <td style="padding: 8px;">${visitData.projectName || 'N/A'}</td>
          </tr>
          <tr>
            <td style="padding: 8px; font-weight: bold;">Builder Name:</td>
            <td style="padding: 8px;">${visitData.builderName || 'N/A'}</td>
          </tr>
          <tr>
            <td style="padding: 8px; font-weight: bold;">Group Name:</td>
            <td style="padding: 8px;">${visitData.groupName || 'N/A'}</td>
          </tr>
          <tr>
            <td style="padding: 8px; font-weight: bold;">Location:</td>
            <td style="padding: 8px;">${visitData.location || 'N/A'}</td>
          </tr>
          <tr>
            <td style="padding: 8px; font-weight: bold;">Development Type:</td>
            <td style="padding: 8px;">${visitData.developmentType || 'N/A'}</td>
          </tr>
          <tr>
            <td style="padding: 8px; font-weight: bold;">Submitted At:</td>
            <td style="padding: 8px;">${new Date(visitData.submittedAt || visitData.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</td>
          </tr>
        </table>
      </div>

      <div style="background-color: #e8f4f8; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <h3 style="color: #34495e; margin-top: 0;">Contact Information</h3>
        <p><strong>Office Person:</strong> ${visitData.officePersonDetails || 'N/A'}</p>
        <p><strong>Contact Number:</strong> ${visitData.officePersonNumber || 'N/A'}</p>
        ${visitData.executives && visitData.executives.length > 0 ? `
          <p><strong>Executives:</strong></p>
          <ul>
            ${visitData.executives.map(exec => `<li>${exec.name} - ${exec.number}</li>`).join('')}
          </ul>
        ` : ''}
      </div>

      <div style="margin-top: 30px; padding: 15px; background-color: #fff3cd; border-left: 4px solid #ffc107; border-radius: 5px;">
        <p style="margin: 0; color: #856404;">
          <strong>⚠️ Action Required:</strong> This submission requires Level 1 approval.
        </p>
      </div>

      <div style="margin-top: 20px; padding: 15px; text-align: center; color: #6c757d; font-size: 12px; border-top: 1px solid #dee2e6;">
        <p>This is an automated email from the Builder Visit Management System.</p>
        <p>Please do not reply to this email.</p>
      </div>
    </div>
  `;

  return await sendEmail({
    to: adminEmails,
    subject,
    html,
  });
};

// Email template for Form 2 submission (Application)
export const sendApplicationSubmissionEmail = async (applicationData, adminEmails) => {
  const subject = `New Application Submitted - ${applicationData.name || 'N/A'}`;
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 10px;">
        New Application Submitted
      </h2>
      
      <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <h3 style="color: #34495e; margin-top: 0;">Applicant Details</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px; font-weight: bold; width: 40%;">Name:</td>
            <td style="padding: 8px;">${applicationData.name || 'N/A'}</td>
          </tr>
          <tr>
            <td style="padding: 8px; font-weight: bold;">Mobile:</td>
            <td style="padding: 8px;">${applicationData.mobile || 'N/A'}</td>
          </tr>
          <tr>
            <td style="padding: 8px; font-weight: bold;">Email:</td>
            <td style="padding: 8px;">${applicationData.email || 'N/A'}</td>
          </tr>
          <tr>
            <td style="padding: 8px; font-weight: bold;">Product:</td>
            <td style="padding: 8px;">${applicationData.product || 'N/A'}</td>
          </tr>
          <tr>
            <td style="padding: 8px; font-weight: bold;">Amount:</td>
            <td style="padding: 8px;">${applicationData.amount || 'N/A'}</td>
          </tr>
          <tr>
            <td style="padding: 8px; font-weight: bold;">Bank:</td>
            <td style="padding: 8px;">${applicationData.bank || 'N/A'}</td>
          </tr>
          <tr>
            <td style="padding: 8px; font-weight: bold;">Status:</td>
            <td style="padding: 8px;">${applicationData.status || 'N/A'}</td>
          </tr>
        </table>
      </div>

      <div style="margin-top: 30px; padding: 15px; background-color: #d1ecf1; border-left: 4px solid #17a2b8; border-radius: 5px;">
        <p style="margin: 0; color: #0c5460;">
          <strong>ℹ️ Note:</strong> This application has been saved to the system.
        </p>
      </div>

      <div style="margin-top: 20px; padding: 15px; text-align: center; color: #6c757d; font-size: 12px; border-top: 1px solid #dee2e6;">
        <p>This is an automated email from the Application Management System.</p>
        <p>Please do not reply to this email.</p>
      </div>
    </div>
  `;

  return await sendEmail({
    to: adminEmails,
    subject,
    html,
  });
};

// Email template for Level 2 Approval
export const sendLevel2ApprovalEmail = async (visitData, approvalData, adminEmails) => {
  const subject = `✅ Form Fully Approved – Level 2 Completed - ${visitData.projectName || 'N/A'}`;
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background-color: #28a745; color: white; padding: 20px; border-radius: 5px 5px 0 0; text-align: center;">
        <h2 style="margin: 0;">✅ Level 2 Approval Completed</h2>
      </div>
      
      <div style="background-color: #f8f9fa; padding: 20px; border-radius: 0 0 5px 5px;">
        <div style="background-color: white; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
          <h3 style="color: #34495e; margin-top: 0;">Project Information</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px; font-weight: bold; width: 40%;">Project Name:</td>
              <td style="padding: 8px;">${visitData.projectName || 'N/A'}</td>
            </tr>
            <tr>
              <td style="padding: 8px; font-weight: bold;">Builder Name:</td>
              <td style="padding: 8px;">${visitData.builderName || 'N/A'}</td>
            </tr>
            <tr>
              <td style="padding: 8px; font-weight: bold;">Location:</td>
              <td style="padding: 8px;">${visitData.location || 'N/A'}</td>
            </tr>
          </table>
        </div>

        <div style="background-color: #d4edda; padding: 15px; border-radius: 5px; border-left: 4px solid #28a745; margin-bottom: 20px;">
          <h3 style="color: #155724; margin-top: 0;">Approval Details</h3>
          <p><strong>Level 1 Approved By:</strong> ${approvalData.level1?.by || 'N/A'}</p>
          <p><strong>Level 1 Approved At:</strong> ${approvalData.level1?.at ? new Date(approvalData.level1.at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : 'N/A'}</p>
          <hr style="border: none; border-top: 1px solid #c3e6cb; margin: 15px 0;">
          <p><strong>Level 2 Approved By:</strong> ${approvalData.level2?.by || 'N/A'}</p>
          <p><strong>Level 2 Approved At:</strong> ${approvalData.level2?.at ? new Date(approvalData.level2.at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : 'N/A'}</p>
          ${approvalData.level2?.comment ? `<p><strong>Comment:</strong> ${approvalData.level2.comment}</p>` : ''}
        </div>

        <div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; border-left: 4px solid #ffc107;">
          <p style="margin: 0; color: #856404;">
            <strong>📋 Next Steps:</strong> This property is now fully approved and will be included in the next Excel export.
          </p>
        </div>
      </div>

      <div style="margin-top: 20px; padding: 15px; text-align: center; color: #6c757d; font-size: 12px; border-top: 1px solid #dee2e6;">
        <p>This is an automated email from the Builder Visit Management System.</p>
        <p>Please do not reply to this email.</p>
      </div>
    </div>
  `;

  return await sendEmail({
    to: adminEmails,
    subject,
    html,
  });
};
