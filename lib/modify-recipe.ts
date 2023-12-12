
export const modifyRecipe = async (
  promptMessage: string,
  document: string
): Promise<any> => {  
  
  const body = JSON.stringify({
    promptMessage: promptMessage,
    document: document,
  });

  try {
    const response = await fetch("/api/recipe/modify", {
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