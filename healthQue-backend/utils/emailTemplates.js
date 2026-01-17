function onboardingEmail({ name, email, tempPassword, androidUrl, iosUrl, webUrl }) {
  const subject = 'Welcome to healthQue — account details & app links';
  const html = `
    <p>Hi ${name || ''},</p>
    <p>Your account has been created on healthQue. Use the credentials below to sign in and complete your profile.</p>
    <ul>
      <li><strong>Username:</strong> ${email}</li>
      <li><strong>Temporary password:</strong> ${tempPassword}</li>
    </ul>
    <p>Download the mobile app:</p>
    <ul>
      ${androidUrl ? `<li><a href="${androidUrl}">Android app</a></li>` : ''}
      ${iosUrl ? `<li><a href="${iosUrl}">iOS app</a></li>` : ''}
    </ul>
    <p>Or open the web app: <a href="${webUrl}">${webUrl}</a></p>
    <p>After signing in, please complete your profile and add your clinic details and operating timings.</p>
    <p>Regards,<br/>healthQue Team</p>
  `;
  return { subject, html };
}

module.exports = { onboardingEmail };
