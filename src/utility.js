import { GITHUB_EVENTS, GITHUB_REPOS } from "./constant.js";
import { getGithubRepos, getRecentEvents, sendEmailToSuraj } from "./tools/tools.js";
import { createTransport } from "nodemailer";

export function extractJSON(response) {
  const jsonRegex = /{.*}/s; // Regex to match JSON objects
  const match = response.match(jsonRegex);
  return match ? match[0] : "{}";
}

export const initializeUserMapping = () => ({
  [GITHUB_REPOS]: [],
  [GITHUB_EVENTS]: [],
  // getRecentEvents: 0,
  // getGithubRepos: 0,
});

export const toolsMapping = {
  getRecentEvents,
  getGithubRepos,
  sendEmailToSuraj,
};
export const getValueNameFromFunctionName = (functionName) => {
  const ok = {
    getGithubRepos: GITHUB_REPOS,
    getRecentEvents: GITHUB_EVENTS,
  };

  return ok[functionName];
};

export const sendEmail = async (toEmail, subject, data, fromAI=false) => {
  const transporter = createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  try {
    const info = await transporter.sendMail({
      to: toEmail,
      subject,
      html: `
      <!DOCTYPE html>
      <html>
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Contact Form Submission</title>
          <style>
              body {
                  font-family: Arial, sans-serif;
                  background-color: #f4f4f4;
                  margin: 0;
                  padding: 0;
              }
              .email-container {
                  max-width: 600px;
                  margin: 20px auto;
                  background: #ffffff;
                  padding: 20px;
                  border-radius: 8px;
                  box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
              }
              .header {
                  background-color: #007bff;
                  color: white;
                  padding: 15px;
                  text-align: center;
                  font-size: 20px;
                  border-top-left-radius: 8px;
                  border-top-right-radius: 8px;
              }
              .content {
                  padding: 20px;
                  color: #333;
                  line-height: 1.6;
              }
              .footer {
                  text-align: center;
                  padding: 15px;
                  font-size: 14px;
                  color: #777;
              }
              .info {
                  background: #f8f9fa;
                  padding: 15px;
                  border-left: 4px solid #007bff;
                  margin-bottom: 15px;
                  border-radius: 5px;
              }
          </style>
      </head>
      <body>
          <div class="email-container">
              <div class="header">
                  Contact Me Form Submission
              </div>
              <div class="content">
                  <p><strong>Name:</strong> ${data.name}</p>
                  <p><strong>Email:</strong> ${data.email}</p>
                  <div class="info">
                      <p><strong>Message:</strong></p>
                      <p>${data.message}</p>
                  </div>
              </div>
              <div class="footer">
                  <p>${fromAI ? "This email was sent by your portfolio's AI Assistant" : "This email was sent from your website's contact form"}</p>
              </div>
          </div>
      </body>
      </html>
      `,
    });
    return true;
  } catch (error) {
    console.error(error);
    return false;
  }
};
