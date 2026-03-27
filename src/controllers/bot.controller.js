import { ai_model } from "../ai.js";
import { SYSTEM_PROMPT } from "../systemPrompt.js";
import {
  extractJSON,
  initializeUserMapping,
  toolsMapping
} from "../utility.js";

const messageMapping = new Map();
const usersMapping = new Map();

export const askBot = async (req, res) => {
  let { query } = req.body;
  if (!query || query.trim() === "") {
    return res.status(400).json({ message: "Query is required" });
  }

  const userId = req.userId;
  if (!usersMapping.has(userId)) {
    usersMapping.set(userId, initializeUserMapping());
  }
  if (!messageMapping.has(userId)) {
    messageMapping.set(userId, { messages: [] });
  }

  const userContext = messageMapping.get(userId);
  query = query.trim();

  const performedActionInfo = {
    performed: false,
    dataFrom: null,
  };

  let maxIterations = 10;
  const calledFunctions = new Set();

  try {
    let chat;
    // Fallback for models/SDK versions that don't support systemInstruction
    const historyWithSystem = [
      { role: "user", parts: [{ text: SYSTEM_PROMPT }] },
      { role: "model", parts: [{ text: "Understood. I will act as Suraj Gupta's AI assistant and respond only in the requested JSON format." }] },
      ...userContext.messages
    ];
    chat = ai_model.startChat({ history: historyWithSystem });

    let currentInput = JSON.stringify({ type: "user", user: query });
    while (maxIterations--) {
      let response = await chat.sendMessage(currentInput);
      const responseMessage = response.response.text();

      let result;
      try {
        result = JSON.parse(responseMessage);
      } catch (error) {
        console.error("Error parsing JSON result:", error, "Message:", responseMessage);
        // Fallback to extraction if parsing fails
        try {
          const extracted = extractJSON(responseMessage);
          result = JSON.parse(extracted);
        } catch (extractError) {
          return res
            .status(500)
            .json({ message: "AI response is not valid JSON" });
        }
      }

      if (!result.type) {
        return res
          .status(500)
          .json({ message: "AI response missing type field" });
      }

      if (result.type === "output") {
        const output = (result.output || "").replaceAll("<br>", "\n");
        const { dataFrom, performed } = performedActionInfo;

        // Update persistent history
        userContext.messages = await chat.getHistory();

        if (performed) {
          return res.status(200).json({
            message: output,
            data: usersMapping.get(userId)[dataFrom],
            dataFrom,
          });
        }
        return res.status(200).json({ message: output });
      }

      if (result.type === "action") {
        const fn = toolsMapping[result.function];
        if (!fn) {
          return res
            .status(500)
            .json({ message: `Unknown tool function: ${result.function}` });
        }

        if (calledFunctions.has(result.function)) {
          currentInput = JSON.stringify({
            type: "user",
            user: "You have already performed this action. Just reply with the output.",
          });
          continue;
        }

        calledFunctions.add(result.function);

        let observation;
        try {
          observation = await fn(...(result.input || []));
        } catch (error) {
          console.error("Error executing function:", error);
          return res
            .status(500)
            .json({ message: "Error executing action function" });
        }

        if (observation?.dataFrom) {
          const userData = usersMapping.get(userId);
          userData[observation.dataFrom] = observation.data;
          performedActionInfo.performed = true;
          performedActionInfo.dataFrom = observation.dataFrom;
        }

        currentInput = JSON.stringify({ type: "observation", observation });
      }

      if (result.type === "plan") {
        currentInput = "Proceed with your plan.";
      }
    }
  } catch (error) {
    console.error("Error in chat loop:", error);
    return res
      .status(500)
      .json({ message: "An error occurred while processing the request" });
  }

  return res
    .status(500)
    .json({ message: "Max iterations reached, possible infinite loop" });
};

export const clearUserData = (req, res) => {
  const userId = req.userId;

  if(!usersMapping.has(userId) || !messageMapping.has(userId)){
    return res.status(404).json({message: "User not found"});
  }

  usersMapping.delete(userId);
  messageMapping.delete(userId);
 
  return res
    .status(200)
    .cookie("uniqueId", "", { httpOnly: true, expires: new Date(0), path: "/" })
    .json({ message: "User data cleared" });
};

export const clearAllData = (req, res) => {
  const ownerKey = req.query.ownerKey;
  if(ownerKey !== process.env.OWNER_KEY){
    return res
      .status(403)
      .json({message: "You are not authorized to perform this action"
    });
  }
  usersMapping.clear();
  messageMapping.clear();

  return res
    .status(200)
    .json({ message: "All user data cleared" });
}