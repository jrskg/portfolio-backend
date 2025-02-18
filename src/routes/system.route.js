import express from"express";
import { getVisitorsData, sendEmailController } from "../controllers/system.controller.js";

const router  = express.Router();

router.route("/send-email").post(sendEmailController);
router.route("/get-visitor").post(getVisitorsData);

export default router;