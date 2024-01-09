import * as z from "zod";

const FormSchema = z.object({
  prompt: z.string().length(3,{
    message: "Please enter a valid prompt",
  }),
});

export const askAnything = async (form: z.infer<typeof FormSchema>) => {
  const body = JSON.stringify(form);
  // console.log(`( body )===============>`, body);
  try {
    const url =
      process.env.NEXT_PUBLIC_DIGITAL_OCEAN_SERVER_URL + "/api/askAnything";

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
