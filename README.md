
- **Motivation**: replacing hard coded unit conversion logics with LLM
- **UI/UX**: AI-first editor application
- **Prompt** **Engineering**: how to make LLM apps more efficient
- **Future** **direction**: training 7B LLM model using GPT4 synthetic data

## 1. Motivation

### Why I wanted to build food diary app using GPT?

I have never been satisfied with the recipe or diet logging apps currently available. This is mainly due to the tricky challenges that food-related applications face. They need to cover thousands of ingredients, brands, and unit systems. As a result, whenever I cook, I often find myself searching for answers on Google, such as "What is the gram equivalent of 1 cup of cilantro?" Additionally, I have to manually search for the nutrition facts of my Korean cracker and enter them into the app myself.

I thought it would be convenient if AI assistants could handle simple mental tasks like this. I tested ChatGPT with various conversion questions, and it answered most of them correctly with only minor errors. I also used Phind to inquire about the nutritional facts of a product, which uses RAG (Retrieval Augmented Generation) from a web search, and it provided mostly accurate information.

### An AI-first food diary does not require a complex input UI

This got me thinking about the broader applications of AI. If GPT can understand the text version of a recipe, why would we build a constrained system based on an input box? Can't we just let users write recipes in a plain text box and ask GPT to convert it into a JSON file to preserve the numeric data on the server? If this is possible, the app could handle every possible unit and ingredient exhaustively. Moreover, it would be faster to build and maintain compared to traditional hard-coded applications, as all the complex logic would be distilled down to neural networks.

You might feel familiar with this idea if you’ve already heard about Software 2.0 suggested by Andrej Karpathy. In this [article](https://karpathy.medium.com/software-2-0-a64152b37c35), Karpathy introduced a paradigm shift in software development which emphasizes the utilization of machine learning models rather than relying solely on explicit programming instructions. The shift from rule-based programming to leveraging neural networks aligns with the idea of using GPT to handle the intricacies of recipe conversion and nutritional information extraction. By employing AI as the intermediary, developers can bypass the complexities of hard-coding conversion logics for every ingredient or unit, and instead, allow LLM models to interpret natural language inputs and dynamically adapt based on learned patterns and correlations within the data.

## 2. UI/UX

So, I started building this app and the first challenge was finding the best user interface design for this specific use case. Unlike the traditional food diary apps, the AI-first approach is based on an empty text editor and an AI assistant tool.

I did some research and watched a [conference](https://www.latent.space/p/build-ai-ux) hosted by Latent Space last year. At the end of the day, I referenced the Notion AI system, which offers users two ways to interact with AI. The first is a button located at the bottom right that starts a chat with the AI assistant. The second is an inline command text input box that allows users to ask the AI to generate content based on selected text and a prompt. I have been subscribed to Notion AI for a few months and have found it to be intuitive, so I consider it as a baseline with some adaptations for this specific app.

I used BlockNote, an open-source library for creating a Notion-like text editor. I found the block units to be very useful, especially in the context of an AI-first editor app. By dividing the text into blocks, an AI assistant can easily modify specific sections without affecting the entire page. This allows us to focus on relevant blocks for a given task and make changes accordingly, minimizing any potential disruptions to the overall page structure.

## 3. Prompt Engineering

After setting the design I started building a LLM assistant using LangChain. First chain that I built was creating well summarized recipe text from a messy web scrawled data. It was pretty straightforward since It worked well any complicated prompt engineering as LLMs are good at summarizing and paraphrasing text.

However, building a chain to perform user-inputted tasks was challenging. The intended chain was as follows: when a user enters a task, such as "Change walnut to almond", GPT needs to select the relevant blocks from the document and then generate updated text based on the task.

For the selection task, I initially attempted to create a single prompt with detailed instructions. However, I soon realized that using few-shot learning, which involves providing a few examples instead of explaining every detail, would be easier. An AI engineer at Notion AI also  [mentioned](https://www.latent.space/p/ai-interfaces-and-notion) that few-shot learning can be more beneficial in cases where the instruction is not straightforward. [1] My few shot instruction is like this:

- **Few shot instruction**
    
    ```jsx
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
    ```
    

Getting a consistent format of response is also a well known issue in prompt engineering. To give few examples, it wraps the response with an object with a property “data”. Or, it uses string instead of array when the result is just one. When I asked GPT to response with JSON format, sometimes it replies with markdown code block format (``` JSON ```). 

To address this issue, I initially created my own formatting instructions and output parsing logic. However, as the chain of instructions grew longer, it quickly became complicated. Therefore, I switched to Langchain's solution: OutputFixingParser. Using this class, I was able to utilize the schema from zod to ensure the correct format. Additionally, if I encounter any issues with parsing the output, I can utilize another AI model called outputFixingParserModel to assist with parsing. With these two methods of format checking, I have not encountered any formatting issues thus far.

- **Formatting & Parsing**
    
    ```jsx
    // Focus on the blue highlighted lines
    
    **const outputFixingParserModel = new ChatOpenAI({
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
    Follow the format. {format_instructions}
    `;**
    
    const prompt_template = ChatPromptTemplate.fromMessages([
      **["system", system_instruction_for_format],**
      ["human", sample_user_instruction],
      ["assistant", sample_system_answer],
      ["human", user_template],
    ]);
    
    const llmChain = new LLMChain({
      llm: chatModel,
      prompt: prompt_template,
      outputKey: "selected_parts",
      **outputParser: outputFixingParser,**
    });
    
    const completion: any = await sequentialChain.call({
          **format_instructions: outputFixingParser.getFormatInstructions(),**
          recipe_document: document,
          promptMessage: promptMessage,
          selected_parts: llmChain.outputKey,
          selected_parts_string: transformChain.outputVariables,
          modified_recipe: llmChain2.outputKey,
        });
    ```
    

After the model selects relevant parts I pass the parts to the second chain where I call another GPT API call to actually change the text. The prompts are similar to the first chain.

- **Second chain**
    
    ```jsx
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
    ```
    

### Why I separated selection and modification

1. **To provide users with the exact locations of changes**
    
    One thing that has always bothered me when using AI-powered language learning apps to fix grammar or improve writing is that they often provide the fully modified version without any indication of the changes made. As a result, I have to compare the original and new versions sentence by sentence to identify the modified parts.
    
    To address this issue, I initially tried to add a prompt to highlight the changed part. However, it didn't work perfectly and missed some changes. So, I came up with the idea of a "select first, then modify later" strategy. Since we have the original text of changed part, we can search that block from the page and display which parts were modified by the LLM. 
    
    ![Screenshot 2024-01-09 at 8.30.55 AM.png](Building%20AI-first%20food%20diary%20app%203441a8b80be946f3b4dba748d001c67d/Screenshot_2024-01-09_at_8.30.55_AM.png)
    
2. **To use tokens more efficiently**
    
    When I ask LLMs to "change walnut to almond," it returns the entire recipe document with walnuts replaced with almonds. This means that LLMs use unnecessary output tokens to simply copy and paste the irrelevant part of the document.
    
    To make the LLM application more cost-efficient and faster, we should select the relevant parts first and only get output for those, avoiding excessive output token usage
    

**The limitation of the select and modify approach.**

One drawback of this approach is that it can impose limitations when the amendment requires a structural change throughout the entire page. I have observed that when I ask LLMs to select the relevant part, they tend not to select the entire document, even though that is the best way to complete the task. Therefore, the select and modify approach might hinder LLMs from providing more comprehensive suggestions.

## 4. Future direction

I mainly used GPT4 for all kind of tasks from the editor page and it works mostly well. There exist some problems, however, that is intrinsic to neural networks: all the outputs are probabilistic outcome meaning it is approximation rather than an accurate calculation. 

For instance, when I inquire about converting 1 cup of whole wheat flour to grams, it provides a result of 120-125 grams. However, this differs from the official website of the flour brand I am using, which states the conversion as 136 grams. This discrepancy occurs because LLM is making a guess based on the text corpus it has been trained on. 

### Retrieval Augmented Generation

Combining RAG with curated web search could provide more accurate and specific information for ingredient conversions. This enhanced system could retrieve data from reliable sources like official brand websites or culinary databases, refining the accuracy of conversions by synthesizing both retrieved information and the model's generative capabilities. Nevertheless, this approach may incur delays and higher costs due to the necessity of web page scraping for real-time data acquisition. 

### Building micro edge case models

At the beginning of this blog, I mentioned software 2.0, which involves replacing hard-coded logics with AI models. Utilizing RAG does not align with the principles of software 2.0, as there is no model specifically designed for the task at hand, which in this case is unit conversion. Moreover, in my demonstration, I used OpenAI's GPT4 model, which is a general-purpose model and too large for unit conversion tasks. 

If I were to truly replace the hard-coded unit conversion logic with an AI model, it should be more streamlined and specialized, ensuring it is as efficient as the original hard-coded implementation. In other words, I have to train a tiny LLM that is specialized in food unit conversion task.

Recently, Latent Space podcast [interview](https://www.latent.space/p/neurips-2023-startups) of AI startup founders showed that training a new model using the synthetic data from LLM like GPT4 became an hot topic. In May 2023, Microsoft researchers introduced [TinyStories](https://huggingface.co/papers/2305.07759), a synthetic dataset of short narratives designed for 3 to 4-year-old children. This dataset, derived from GPT-3.5 and GPT-4, has enabled the training and evaluation of language models with fewer parameters, as low as below 10 million. Surprisingly, these smaller models, when trained on TinyStories, show impressive capability.

I’m imagining building micro models(10M parameter) for edge cases that otherwise have to hard-code the complex logics. 

### Advantages of using micro models

GPT3 and GPT4 are often called "little brains" because they possess some level of reasoning ability. When I started developing this application, I also considered GPT4 API calls as a form of limited reasoning. However, even GPT3 is overly large for certain reasoning tasks. It's like using a rocket to travel from Ottawa to Toronto.

By effectively combining micro models and large models, we can enhance the efficiency of the application. Additionally, due to the compact size of micro models, they are easier to fine-tune, enabling developers to manipulate them to perform according to their specifications.

Here is a part of YC talk that exactly discusses about this approach (starting from 16:31)

[The Truth About Building AI Startups Today](https://youtu.be/TwDJhUJL-5o?si=krYt-lMqLHemfjQl&t=991)


Check this blog post on this project: https://minkijung.notion.site/Building-AI-first-food-diary-app-3441a8b80be946f3b4dba748d001c67d?pvs=74
