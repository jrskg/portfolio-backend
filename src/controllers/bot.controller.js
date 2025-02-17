import {extractJSON, getValueNameFromFunctionName, initializeUserMapping, toolsMapping} from "../utility.js";
import {SYSTEM_PROMPT} from "../systemPrompt.js";
import { ai_model } from "../index.js";

const messageMapping = {}
const usersMapping = {};

export const askBot = async(req, res) => {
  let {query} = req.body;
  if(!query || query.trim() === ""){
    return res.status(400).json({message: "Query is required"});
  }
  const userId = req.userId;
  if(!usersMapping[userId]){
    usersMapping[userId] = initializeUserMapping();
  }
  if(!messageMapping[userId]){
    messageMapping[userId] = {messages: []};
  }
  const {messages} = messageMapping[userId];

  query = query.trim();
  messages.push({role: "user", parts: [{text: JSON.stringify({type: "user", user: query})}]});
  const performedActionInfo = {
    performed: false,
    dataFrom: null,
  }

  while(true){
    const chat = ai_model.startChat({
      history: messages,
      systemInstruction: {role: "system", parts: [{text: SYSTEM_PROMPT}]}
    });
    let response = await chat.sendMessage(query);
    const responseMessage = response.response.text();

    const extracted = extractJSON(responseMessage);
    messages.push({role: "model", parts: [{text: extracted}]});

    let result = JSON.parse(extracted);
    console.log(result.type);
    console.log(result.output);

    if(result.type === "output"){
      // const output = result.output.replaceAll('\n*', '<br>').replaceAll("\n", '<br>');
      const output = result.output.replaceAll('<br>', '\n')
      const {dataFrom, performed} = performedActionInfo;
      if(performed){
        return res
          .status(200)
          .json({message: output, data: usersMapping[userId][dataFrom], dataFrom});
      }
      return res.status(200).json({message: output});
    }
    else if(result.type === "action"){
      const fn = toolsMapping[result.function];
      if(!fn) {
        return res.status(500).json({message: `Something went wrong (tool not found -> ${result.function})`});
      }
      const hitCount  = usersMapping[userId][result.function];
      let observation;
      if(hitCount >= 1){
        const dataFrom = getValueNameFromFunctionName(result.function);
        observation = {data: usersMapping[userId][dataFrom], dataFrom};
      }else{
        usersMapping[userId][result.function]++;
        observation = await fn(...result.input);
        usersMapping[userId][observation.dataFrom] = observation.data;
      }
      performedActionInfo.performed = true;
      performedActionInfo.dataFrom = observation.dataFrom;
      const observationMessage = {
        type:"observation",
        observation: observation
      }
      messages.push({role: "model", parts: [{text: JSON.stringify(observationMessage)}]});      
    }
  }
}

export const clearUserData = (req, res) => {
  const userId = req.userId;
  delete usersMapping[userId];
  delete messageMapping[userId];
  return res.status(200)
  .cookie("uniqueId", "", {httpOnly: true, expires: new Date(0)})
  .json({message: "User data cleared"});
}