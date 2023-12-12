import { ChatOpenAI } from "langchain/chat_models/openai";
import { ChatPromptTemplate } from "langchain/prompts";
import { BaseOutputParser } from "langchain/schema/output_parser";



const chatModel = new ChatOpenAI({
  openAIApiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  console.log("%c>>> API POST recipe/modify <<<", "color: lime");
  const { promptMessage, document } = await req.json();
  console.log("prompt", promptMessage);
  console.log("document", document);

  try {
    const template = `
You are an assistant chef helping modify the recipe provided below. Be accurate when changing the document. 
recipe: {recipe_document}
      `;
    const humanTemplate = "{prompt}"

    const prompt_template = ChatPromptTemplate.fromMessages([
      ["system", template],
      ["human", humanTemplate],
    ]);

    const messages = await prompt_template.formatMessages({
      recipe_document: document,
      prompt: promptMessage,
    });

    const completion: any = await chatModel
      .predictMessages(messages)
      .then((response) => {
        return response.content;
      });

    console.log("completion", completion);
    return new Response(JSON.stringify({ data: completion }), { status: 200 });
  } catch (error: any) {
    console.error(error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
    });
  }
}
