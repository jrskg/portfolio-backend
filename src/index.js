import dotenv from "dotenv";
import {GoogleGenerativeAI} from "@google/generative-ai";
import express from "express";
import cookieParser from "cookie-parser";
import botRoute from "./routes/bot.route.js";
import systemRoute from "./routes/system.route.js";
import { trackUser } from "./middleware/trackUser.js";
import { clearUserData } from "./controllers/bot.controller.js";
import cors from "cors";

dotenv.config();

const app = express();
app.use(cors({
  origin: "http://localhost:5173",
  credentials: true
}));

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
export const ai_model = genAI.getGenerativeModel({model:"gemini-1.5-flash"});

app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));
app.use("/bot", botRoute);
app.use("/system", systemRoute);

app.get("/clear-session", trackUser, clearUserData);

app.listen(process.env.PORT, () => {
  console.log(`Server running on port ${process.env.PORT}`);
});



