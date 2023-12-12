import * as z from "zod";

const FormSchema = z.object({
  url: z.string().url({
    message: "Please enter a valid URL.",
  }),
});

export const generateRecipe = async (
  url: z.infer<typeof FormSchema>
) => {
  const body = JSON.stringify(url);

  try {
    const response = await fetch("/api/recipe/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: body,
    });
    return await response.json();
  } catch (error) {
    console.log(error);
  }
};
