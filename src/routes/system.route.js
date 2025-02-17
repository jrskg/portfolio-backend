import express from"express";
import { sendEmailController } from "../controllers/system.controller.js";

const router  = express.Router();

router.route("/send-email").post(sendEmailController);

export default router;