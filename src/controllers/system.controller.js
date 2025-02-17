import { sendEmail } from "../utility.js";

export const sendEmailController = async (req, res) => {
  const subject = "Contact Form Submission (Controller)";
  const toEmail = process.env.MY_EMAIL;
  const {email, name, message} = req.body;
  if([email, name].some((value) => !value || value.trim() === "")){
    return res.status(400).json({message: "Name and Email are required"});
  }
  const isSent = await sendEmail(toEmail, subject, {name, email, message});
  return res.status(200).json({isSent});
}