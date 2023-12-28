import { z } from "zod";

import { ChatOpenAI } from "langchain/chat_models/openai";
import { ChatPromptTemplate } from "langchain/prompts";
import { LLMChain, SequentialChain, TransformChain } from "langchain/chains";
import {
  StructuredOutputParser,
  OutputFixingParser,
} from "langchain/output_parsers";
import { ChainValues } from "langchain/schema";
import { calculateCost } from "@/lib/calculate-cost";

let totalInputTokens = 0;
let totalOutputTokens = 0;

const chatModel = new ChatOpenAI({
  openAIApiKey: process.env.OPENAI_API_KEY,
  modelName: "gpt-4-1106-preview",
  temperature: 0,
  callbacks: [
    {
      handleLLMEnd: (output, runId, parentRunId, tags) => {
        const { promptTokens, completionTokens } = output.llmOutput?.tokenUsage;
        totalInputTokens += promptTokens ?? 0;
        totalOutputTokens += completionTokens ?? 0;
      },
    },
  ],
});

const outputFixingParserModel = new ChatOpenAI({
  openAIApiKey: process.env.OPENAI_API_KEY,
  modelName: "gpt-3.5-turbo",
});
const outputSchema = z.array(
  z.string().describe("Selected part of the recipe")
);
const outputParser = StructuredOutputParser.fromZodSchema(outputSchema);
const outputFixingParser = OutputFixingParser.fromLLM(
  outputFixingParserModel,
  outputParser
);

const system_instruction_for_format = `
Follow the following format : {format_instructions}
`;

const sample_user_instruction = `
Identify any part of in the recipe that should be modified to satisfy the user's prompt
-----%%%%-----
prompt: "convert sugar to maple syrup"
-----%%%%-----
recipe: 
Ingredients:
1 cup all-purpose flour
2 tbsp sugar
2 tsp baking powder
1/2 tsp salt
1 cup milk
1 large egg
2 tbsp melted butter or oil
1 tsp vanilla extract (optional)
Butter or oil for cooking

Instructions:
1. Whisk flour, baking power, sugar, salt in one bowl and wet ingredients in another.
2. Combine wet and dry ingredients until just mixed.
3. Heat a skillet over medium heat and add butter or oil.
4. Pour 1/4 cup batter per pancake onto the skillet.
5. Cook until bubbles form, flip, and cook until golden.
6. Repeat with remaining batter.
7. Serve with toppings of choice.
-----%%%%-----`;

const sample_system_answer = `
[
  "2 tbsp sugar",
  "Whisk flour, baking power, sugar, salt in one bowl and wet ingredients in another."
]
`;

const user_template = `
Identify any part of in the recipe that should be modified to satisfy the user's prompt
-----%%%%-----
prompt: {promptMessage}
-----%%%%-----
recipe: {recipe_document}
-----%%%%-----
`;

const prompt_template = ChatPromptTemplate.fromMessages([
  ["system", system_instruction_for_format],
  ["human", sample_user_instruction],
  ["assistant", sample_system_answer],
  ["human", user_template],
]);

const llmChain = new LLMChain({
  llm: chatModel,
  prompt: prompt_template,
  outputKey: "selected_parts",
  outputParser: outputFixingParser,
  verbose: false,
});

function ParseJsonIntoString(values: ChainValues): ChainValues {
  return {
    selected_parts_string: `[${values.selected_parts.join()}]`,
  };
}
const transformChain = new TransformChain({
  inputVariables: ["selected_parts"],
  outputVariables: ["selected_parts_string"],
  transform: ParseJsonIntoString,
});

const system_guide_chain2 = `
You are an assistant chef helping modify the recipe.
Change the selected parts of the recipe based on the user's prompt.
Don't add any other message than the changed part.
Return the answer in an python array of strings seperated with comma(,).
`;
const sample_user_instruction_chain2 = `
selected parts: [2 tbsp sugar,Whisk flour, baking power, sugar, salt in one bowl and wet ingredients in another.]
user prompt: convert sugar to maple syrup
`;
const sample_system_answer_chain2 = `
[
  "2 tbsp maple syrup",
  "Whisk flour, baking power, maple syrup, salt in one bowl and wet ingredients in another."
]
`;
const user_template_chain2 = `
selected parts: {selected_parts_string}
user prompt: {promptMessage}
`;

const prompt_template2 = ChatPromptTemplate.fromMessages([
  ["system", system_guide_chain2],
  ["human", sample_user_instruction_chain2],
  ["system", sample_system_answer_chain2],
  ["human", user_template_chain2],
]);

const llmChain2 = new LLMChain({
  llm: chatModel,
  prompt: prompt_template2,
  outputKey: "modified_recipe",
  verbose: false,
  outputParser: outputFixingParser,
});

const sequentialChain = new SequentialChain({
  chains: [llmChain, transformChain, llmChain2],
  verbose: true,
  inputVariables: ["recipe_document", "promptMessage", "format_instructions"],
  outputVariables: ["selected_parts", "modified_recipe"],
});

export async function POST(req: Request) {
  console.log("\x1b[32m>>> API POST recipe/modify <<<\x1b[0m");
  
  const dummy_data = {
    selected_parts: [
      "6 servings",
      "1 cup dry orzo pasta",
      "½ cup walnut halves",
      "¼ cup plus 2 Tbsp. extra-virgin olive oil",
      "2 medium zucchinis, halved lengthwise and sliced into half moons",
      "½ tsp. kosher salt, divided",
      "¼ tsp. black pepper",
      "2 Tbsp. fresh lemon juice",
      "¼ cup sliced pickled pepperoncinis, roughly chopped",
      "¼ cup thinly sliced scallions",
      "2 Tbsp. finely chopped fresh parsley",
      "1 garlic clove, minced",
      "¼ tsp. ground coriander (or cumin)",
      "¼ cup grated or shaved Parmesan cheese",
      "Nutrition Per serving (0.66 cup) 300kcal | Carbohydrates 26g | Protein 6g | Fat 17g | Saturated Fat 1g | Sodium 533mg | Fiber 3g | Sugar 2g",
    ],
    modified_recipe: [
      "3 servings",
      "½ cup dry orzo pasta",
      "¼ cup walnut halves",
      "2 Tbsp. plus 1 Tbsp. extra-virgin olive oil",
      "1 medium zucchinis, halved lengthwise and sliced into half moons",
      "¼ tsp. kosher salt, divided",
      "⅛ tsp. black pepper",
      "1 Tbsp. fresh lemon juice",
      "2 Tbsp. sliced pickled pepperoncinis, roughly chopped",
      "2 Tbsp. thinly sliced scallions",
      "1 Tbsp. finely chopped fresh parsley",
      "½ garlic clove, minced",
      "⅛ tsp. ground coriander (or cumin)",
      "2 Tbsp. grated or shaved Parmesan cheese",
      "Nutrition Per serving (0.66 cup) 150kcal | Carbohydrates 13g | Protein 3g | Fat 8.5g | Saturated Fat 0.5g | Sodium 266.5mg | Fiber 1.5g | Sugar 1g",
    ],
  };
  const debug = false;
  if (debug) {
    return new Response(JSON.stringify({ data: dummy_data }), {
      status: 200,
    });
  }

  const { promptMessage, document } = await req.json();
  
  try {
    const completion: any = await sequentialChain.call({
      format_instructions: outputFixingParser.getFormatInstructions(),
      recipe_document: document,
      promptMessage: promptMessage,
      selected_parts: llmChain.outputKey,
      selected_parts_string: transformChain.outputVariables,
      modified_recipe: llmChain2.outputKey,
    });
    console.log(">>> completion", completion);
    calculateCost(totalInputTokens, totalOutputTokens);
    return new Response(JSON.stringify({ data: completion }), {
      status: 200,
    });
  } catch (error: any) {
    console.error(error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
    });
  }
}
