import * as cheerio from "cheerio";
import axios from "axios";

import { ChatOpenAI } from "langchain/chat_models/openai";
import { ChatPromptTemplate } from "langchain/prompts";
import { BaseOutputParser } from "langchain/schema/output_parser";

const chatModel = new ChatOpenAI({
  openAIApiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  console.log("%c>>> API POST recipe/generate <<<", "color: lime");
  const { url, prompt } = await req.json();
  const AxiosInstance = axios.create();

  try {
    const response = await AxiosInstance.get(url, {
      headers: {
        "x-apikey": "59a7ad19f5a9fa0808f11931",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET,PUT,POST,DELETE,PATCH,OPTIONS",
      },
    });

    const html = response.data;
    const $ = cheerio.load(html);

    let recipeData = "";

    let simple_condition = `[class*="recipe-template"],[class*="tasty-recipes-entry-content"],[class*="mv-create-wrapper"],[class*="article__content"]`;
    $(simple_condition).each((index: number, element: cheerio.Element) => {
      recipeData += $(element).text() + "\n";
    });
    // console.log("recipeData", recipeData.trim());

    const template = `
For the following recipeData paraphrase the recipe in a clean format with the text scrapped from a website. Keep all the details from the instructions. Divide as many steps as you need.
The markdown should contain the following information: title, total_yield, description, ingredients, instructions.`;
    const humanTemplate = "{recipeData}";

    const prompt_template = ChatPromptTemplate.fromMessages([
      ["system", template],
      ["human", humanTemplate],
    ]);

    const messages = await prompt_template.formatMessages({
      recipeData: recipeData,
    });

    const completion: any = await chatModel.predictMessages(messages)
      .then((response) => {
        return response.content;
      }
      )

    console.log("completion", completion);
    return new Response(JSON.stringify({ data: completion }), { status: 200 });
  } catch (error: any) {
    console.error(error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
    });
  }
}
