import { ai_model } from "../index.js";
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

  const { messages } = messageMapping.get(userId);
  query = query.trim();
  messages.push({
    role: "user",
    parts: [{ text: JSON.stringify({ type: "user", user: query }) }],
  });

  const performedActionInfo = {
    performed: false,
    dataFrom: null,
  };

  let maxIterations = 5;
  const calledFunctions = new Set();

  while (maxIterations--) {
    try {
      const chat = ai_model.startChat({
        history: messages,
        systemInstruction: { role: "system", parts: [{ text: SYSTEM_PROMPT }] },
      });

      let response = await chat.sendMessage(query);
      const responseMessage = response.response.text();

      let extracted;
      try {
        extracted = extractJSON(responseMessage);
      } catch (error) {
        console.error("Error extracting JSON:", error);
        return res
          .status(500)
          .json({ message: "Invalid response format from AI model" });
      }

      messages.push({ role: "model", parts: [{ text: extracted }] });

      let result;
      try {
        result = JSON.parse(extracted);
      } catch (error) {
        console.error("Error parsing JSON result:", error);
        return res
          .status(500)
          .json({ message: "AI response is not valid JSON" });
      }

      if (!result.type) {
        return res
          .status(500)
          .json({ message: "AI response missing type field" });
      }

      if (result.type === "output") {
        const output = result.output.replaceAll("<br>", "\n");
        const { dataFrom, performed } = performedActionInfo;

        if (performed) {
          return res
            .status(200)
            .json({
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

        if(calledFunctions.has(result.function)){
          messages.push({role: "user", parts: [{text: JSON.stringify({type: "user", user: "You have already performed this action. Just reply with the output."})}]});
          continue;
        }

        calledFunctions.add(result.function);

        let observation;
        try {
          observation = await fn(...result.input);
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

        messages.push({
          role: "model",
          parts: [
            { text: JSON.stringify({ type: "observation", observation }) },
          ],
        });
      }
    } catch (error) {
      console.error("Error in chat loop:", error);
      return res
        .status(500)
        .json({ message: "An error occurred while processing the request" });
    }
  }

  return res
    .status(500)
    .json({ message: "Max iterations reached, possible infinite loop" });
};

export const clearUserData = (req, res) => {
  const userId = req.userId;
  if(!usersMapping.has(userId)){
    return res.status(404).json({message: "User not found"});
  }
  usersMapping.delete(userId);
  messageMapping.delete(userId);
  return res
    .status(200)
    .cookie("uniqueId", "", { httpOnly: true, expires: new Date(0), path: "/" })
    .json({ message: "User data cleared" });
};

// export const askBot = async(req, res) => {
//   let {query} = req.body;
//   if(!query || query.trim() === ""){
//     return res.status(400).json({message: "Query is required"});
//   }
//   const userId = req.userId;
//   if(!usersMapping[userId]){
//     usersMapping[userId] = initializeUserMapping();
//   }
//   if(!messageMapping[userId]){
//     messageMapping[userId] = {messages: []};
//   }
//   const {messages} = messageMapping[userId];

//   query = query.trim();
//   messages.push({role: "user", parts: [{text: JSON.stringify({type: "user", user: query})}]});
//   const performedActionInfo = {
//     performed: false,
//     dataFrom: null,
//   }

//   while(true){
//     console.log("Entering while loop");
//     const chat = ai_model.startChat({
//       history: messages,
//       systemInstruction: {role: "system", parts: [{text: SYSTEM_PROMPT}]}
//     });
//     let response = await chat.sendMessage(query);
//     const responseMessage = response.response.text();

//     const extracted = extractJSON(responseMessage);
//     messages.push({role: "model", parts: [{text: extracted}]});

//     let result = JSON.parse(extracted);
//     console.log("1************************ result", result);

//     if(result.type === "output"){
//       console.log("2************************ output");
//       const output = result.output.replaceAll('<br>', '\n')
//       const {dataFrom, performed} = performedActionInfo;
//       if(performed){
//         return res
//           .status(200)
//           .json({message: output, data: usersMapping[userId][dataFrom], dataFrom});
//       }
//       return res.status(200).json({message: output});
//     }
//     else if(result.type === "action"){
//       console.log("3************************ action");
//       const fn = toolsMapping[result.function];
//       if(!fn) {
//         return res.status(500).json({message: `Something went wrong (tool not found -> ${result.function})`});
//       }
//       const observation = await fn(...result.input);
//       console.log("4************************ observation", observation);

//       if(observation.dataFrom){
//         console.log("5************************ dataFrom");
//         usersMapping[userId][observation.dataFrom] = observation.data;
//         performedActionInfo.performed = true;
//         performedActionInfo.dataFrom = observation.dataFrom;
//       }
//       const observationMessage = {
//         type:"observation",
//         observation: observation
//       }
//       console.log("6************************ observationMessage", observationMessage);
//       messages.push({role: "model", parts: [{text: JSON.stringify(observationMessage)}]});
//     }
//   }
// }
