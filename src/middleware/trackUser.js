import { v4 as uuid } from "uuid";

export const trackUser = (req, res, next) => {
  const cookie =
    req.cookies?.uniqueId ||
    req.header("Authorization")?.replace("Bearer ", "");
  if (!cookie) {
    const uniqueId = uuid();
    const nodeEnv = process.env.NODE_ENV;
    const cookieOptions = {
      httpOnly: true,
      secure: nodeEnv === "production",
      sameSite: nodeEnv === "production" ? "None" : "Lax",
      path: "/",
      maxAge: 1000 * 60 * 60 * 2,
    };
    if (nodeEnv === "production" && process.env.PROD_DOMAIN) {
      cookieOptions.domain = process.env.PROD_DOMAIN;
    }
    res.cookie("uniqueId", uniqueId, cookieOptions);
    req.userId = uniqueId;
  } else {
    req.userId = cookie;
  }
  next();
};
