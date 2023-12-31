import * as z from "zod";

const FormSchema = z.object({
  url: z.string().url({
    message: "Please enter a valid URL.",
  }),
});

export const generateRecipe = async (form: z.infer<typeof FormSchema>) => {
  const body = JSON.stringify(form);
  // console.log(`( body )===============>`, body);
  try {
    // http://localhost:6001
    const url =
      process.env.NEXT_PUBLIC_DIGITAL_OCEAN_SERVER_URL + "/api/recipe/generate";
    console.log("url ===> ", url)
    const response = await fetch(url, {
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
