const nodemailer = require("nodemailer");

const html = `
<h1>Hello</h1>

`;

const transporter = nodemailer.createTransport({
  // host: "smtp.forwardemail.net",
  // port: 465,
  // secure: true,
  // auth: {
  //   // TODO: replace `user` and `pass` values from <https://forwardemail.net>
  //   user: "REPLACE-WITH-YOUR-ALIAS@YOURDOMAIN.COM",
  //   pass: "REPLACE-WITH-YOUR-GENERATED-PASSWORD",
  // },
  service: "gmail",
  auth: {
    user: "lanOrangejuice@gmail.com",
    pass: "yourpassword",
  },
});

// async..await is not allowed in global scope, must use a wrapper
async function sendNMMail({ from, to, subject, html, text, attachments }) {
  // send mail with defined transport object
  try {
    const info = await transporter.sendMail({
      from: from || "contact@tawk.com",
      to: to,
      subject,
      html,
      text,
      attachments,
    });

    console.log("Message sent: %s", info.messageId);
  } catch (error) {
    console.log(error);
  }
  // Message sent: <b658f8ca-6296-ccf4-8306-87d57a0b4321@example.com>

  //
  // NOTE: You can go to https://forwardemail.net/my-account/emails to see your email delivery status and preview
  //       Or you can use the "preview-email" npm package to preview emails locally in browsers and iOS Simulator
  //       <https://github.com/forwardemail/preview-email>
  //
}

exports.sendMail = async function (args) {
  if (process.env.NODE_ENV === "development") {
    console.log("send mail");
    return Promise.resolve();
  } else {
    return sendNMMail(args);
  }
};
// sendMail().catch(console.error);
