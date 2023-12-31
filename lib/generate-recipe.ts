import * as z from "zod";

const FormSchema = z.object({
  url: z.string().url({
    message: "Please enter a valid URL.",
  }),
});

export const generateRecipe = async (form: z.infer<typeof FormSchema>) => {
  const body = JSON.stringify(form);
  console.log(`( body )===============>`, body);
  try {
    // http://localhost:6001/api/recipe/generate
    // /api/recipe/generate
    // 159.203.19.109/api/recipe/generate
    const response = await fetch("159.203.19.109/api/recipe/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: body,
    });

    return response;
  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
    });
  }
};
