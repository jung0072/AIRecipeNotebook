import * as cheerio from "cheerio";
import axios from "axios";

import { ChatOpenAI } from "langchain/chat_models/openai";
import { ChatPromptTemplate } from "langchain/prompts";
import { BaseOutputParser } from "langchain/schema/output_parser";
import { calculateCost } from "@/lib/calculate-cost";

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

export async function POST(req: Request) {
  console.log("\x1b[32m>>> API POST recipe/generate <<<\x1b[0m");

  const dummy_data = ` ## Description

A delightful Zucchini Orzo Salad featuring toasted walnuts, fresh herbs, and an invigorating Pepperoncini Dressing. This versatile side dish can be savored warm or at room temperature, making it perfect for any summer occasion.

 ### Total Yield
6 servings

 ## Ingredients

- 1 cup dry orzo pasta
- ½ cup walnut halves
- ¼ cup plus 2 Tbsp. extra-virgin olive oil
- 2 medium zucchinis, halved lengthwise and sliced into half moons
- ½ tsp. kosher salt, divided
- ¼ tsp. black pepper
- 2 Tbsp. fresh lemon juice
- ¼ cup sliced pickled pepperoncinis, roughly chopped
- ¼ cup thinly sliced scallions
- 2 Tbsp. finely chopped fresh parsley
- 1 garlic clove, minced
- ¼ tsp. ground coriander (or cumin)
- ¼ cup grated or shaved Parmesan cheese

 ## Instructions

1. Start by boiling a pot of generously salted water. Cook orzo in the boiling water until it reaches an al dente texture.
2. Heat walnuts in a large skillet on medium until they are well-browned and aromatic, for about 3 to 5 minutes. Then, transfer them to a cutting board.
3. Using the same skillet, add 2 tablespoons of olive oil. Once hot, incorporate zucchini slices and cook until they are browned for about 6 to 7 minutes, stirring infrequently. During cooking, sprinkle in ¼ teaspoon of salt, then take the pan off the heat.
4. Finely chop the toasted walnuts and place them in a medium bowl. Combine with ¼ cup of olive oil, lemon juice, pepperoncinis, scallions, parsley, minced garlic, ground coriander, and the rest of the salt and pepper. Mix these ingredients well.
5. Drain the cooked orzo and add it into a large bowl. Incorporate the sautéed zucchini and the mixed pepperoncini dressing, tossing everything together.
6. Gently stir in the Parmesan cheese, and conduct a taste test, adding more salt if needed. Serve the salad either warm or at room temperature.

 Notes
- Make-Ahead Prepare the dressing up to a day in advance, excluding the walnuts. Keep it refrigerated, and mix in the walnuts just before putting the salad together.
- Storage The salad can be stored in the refrigerator for up to 4 days, although it may dry out over time. To freshen it up, add some extra olive oil and a splash of lemon juice. It can be enjoyed after warming, chilling, or at near room temperature.
- Reheating If you prefer the salad warm, reheat it in the microwave for 30 to 45 seconds.

 Nutrition
Per serving (0.66 cup) 300kcal | Carbohydrates 26g | Protein 6g | Fat 17g | Saturated Fat 1g | Sodium 533mg | Fiber 3g | Sugar 2g

Enjoy the Zucchini Orzo Salad with Pepperoncini Dressing as an easy, delicious side dish perfect for any occasion!`;
  const debug = false;
  if (debug) {
    return new Response(JSON.stringify({ data: dummy_data }), {
      status: 200,
    });
  }

  try {
    const { url, prompt } = await req.json();
    const AxiosInstance = axios.create();

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

    const completion: any = await chatModel
      .predictMessages(messages)
      .then((response) => {
        calculateCost(totalInputTokens, totalOutputTokens);
        return response.content;
      });

    console.log(">>> completion", completion);
    return new Response(JSON.stringify({ data: completion }), { status: 200 });
  } catch (error: any) {
    console.error(error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
    });
  }
}
