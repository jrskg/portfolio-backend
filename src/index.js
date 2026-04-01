import dotenv from "dotenv";
import { GoogleGenerativeAI } from "@google/generative-ai";
import express from "express";
import cookieParser from "cookie-parser";
import botRoute from "./routes/bot.route.js";
import systemRoute from "./routes/system.route.js";
import { trackUser } from "./middleware/trackUser.js";
import { clearAllData, clearUserData } from "./controllers/bot.controller.js";
import cors from "cors";

dotenv.config();

const allowedOrigins = (process.env.FRONTEND_URLS || "").split(",").map(o => o.trim()).filter(Boolean);

const app = express();

// Robust CORS configuration
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);
      
      const isAllowed = allowedOrigins.some((allowedOrigin) => {
        return origin === allowedOrigin || origin.startsWith(allowedOrigin);
      });

      if (isAllowed || process.env.NODE_ENV === "development") {
        callback(null, true);
      } else {
        console.error(`CORS Error: Origin ${origin} not allowed. Allowed: ${allowedOrigins.join(", ")}`);
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept"],
    optionsSuccessStatus: 200, // Some legacy browsers choke on 204
  })
);

// Explicitly handle OPTIONS preflight
app.options("*", cors());

import { ai_model } from "./ai.js";

app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));
app.use("/bot", botRoute);
app.use("/system", systemRoute);

app.get("/", (req, res) => {
  res.send(`Hello World! in ${process.env.NODE_ENV} mode`);
});

app.post("/clear-session", trackUser, clearUserData);
app.get("/owner/clear", clearAllData);

// app.listen(process.env.PORT, () => {
//   console.log(`Server running on port ${process.env.PORT} in ${process.env.NODE_ENV} mode`);
// });

export default app;