const { appName } = require("../config/appInfo");
const Recipient = require("mailersend").Recipient;
const EmailParams = require("mailersend").EmailParams;
const MailerSend = require("mailersend").MailerSend;
const Sender = require("mailersend").Sender;

const mailerSendConfig = { apiKey: process.env.EMAIL_TOKEN };

exports.sendMail = async ({ to, toName, subject, text, html }) => {
  const mailerSend = new MailerSend(mailerSendConfig);

  const recipients = [new Recipient(to, toName)];

  const sentFrom = new Sender(
    `${appName}@${process.env.EMAIL_DOMAIN}`,
    appName
  );

  const emailParams = new EmailParams()
    .setFrom(sentFrom)
    .setTo(recipients)
    .setSubject(subject)
    .setHtml(html)
    .setText(text);

  console.log("send mail");
  // await Promise.resolve();
  await mailerSend.email.send(emailParams);
};
