import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API || process.env.GEMINI_API_KEY);
export const ai_model = genAI.getGenerativeModel({
  model: "gemini-flash-latest",
  generationConfig: { responseMimeType: "application/json" }
});
