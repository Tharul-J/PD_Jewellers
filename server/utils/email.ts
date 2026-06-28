import { Resend } from 'resend';

export const sendPasswordResetEmail = async (to: string, resetLink: string): Promise<boolean> => {
  const resend = new Resend(process.env.RESEND_API_KEY);
  try {
    const { error } = await resend.emails.send({
      from: 'PD Jewellers <onboarding@resend.dev>',
      to,
      subject: 'Reset your PD Jewellers password',
      html: `
        <p>You requested a password reset for your PD Jewellers account.</p>
        <p><a href="${resetLink}">Click here to reset your password</a></p>
        <p>This link expires in <strong>1 hour</strong>.</p>
        <p>If you did not request this, you can safely ignore this email.</p>
      `,
    });

    if (error) {
      console.error('Resend error:', error);
      return false;
    }

    console.log('Password reset email sent to', to);
    return true;
  } catch (err) {
    console.error('Failed to send password reset email:', err);
    return false;
  }
};
