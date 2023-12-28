import OpenAI from "openai";
import { ChatOpenAI } from "langchain/chat_models/openai";
import { calculateCost } from "@/lib/calculate-cost";
import { ChatPromptTemplate } from "langchain/prompts";

let totalInputTokens = 0;
let totalOutputTokens = 0;

const chatModel = new ChatOpenAI({
  openAIApiKey: process.env.OPENAI_API_KEY,
  modelName: "gpt-4-1106-preview",
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

const openai = new OpenAI();

const generateImage = async (prompt: string) => {
//   console.log(`( prompt )===============>`, prompt);
  try {
    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt: prompt,
      size: "1024x1024",
      n: 1,
    });
    return response.data[0].url;
  } catch (error) {
    console.error(error);
  }
};

async function generatePromptForDallE(topLvBlocksMarkdown: string) {
  const instruction = `You are an experienced AI image generation prompt engineer. Write a prompt for Dall-E-3 to create an image based on this recipe: ${topLvBlocksMarkdown}`;
  const prompt_template = ChatPromptTemplate.fromMessages([
    ["system", instruction],
  ]);
  const messages = await prompt_template.formatMessages({
    topLvBlocksMarkdown: topLvBlocksMarkdown,
  });
  const promptForDallE: any = await chatModel
    .predictMessages(messages)
    .then((response) => {
      calculateCost(totalInputTokens, totalOutputTokens);
      return response.content;
    });

  return promptForDallE;
}

export async function POST(req: Request) {
  console.log("\x1b[32m>>> API POST image/generate <<<\x1b[0m");
  try {
    const topLvBlocksMarkdown = await req.json();

    const promptForDallE = await generatePromptForDallE(topLvBlocksMarkdown);

    const completion = await generateImage(promptForDallE);

    return new Response(JSON.stringify({ url: completion }), { status: 200 });
  } catch (error: any) {
    console.error(error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
    });
  }
}
