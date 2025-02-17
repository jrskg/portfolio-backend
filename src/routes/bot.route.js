import express from"express";
import { askBot } from "../controllers/bot.controller.js";
import { trackUser } from "../middleware/trackUser.js";

const router  = express.Router();

router.route("/ask").post(trackUser, askBot);

export default router;