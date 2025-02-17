import {v4 as uuid} from "uuid";

export const trackUser = (req, res, next) => {
  const cookie = req.cookies?.uniqueId || req.header("Authorization")?.replace("Bearer ", "");
  if(!cookie) {
    const uniqueId = uuid();
    res.cookie("uniqueId", uniqueId, {httpOnly: true, expires: new Date(Date.now() + 24 * 60 * 60 * 1000)});
    req.userId = uniqueId;
  } else {
    req.userId = cookie;
  }
  next();
};