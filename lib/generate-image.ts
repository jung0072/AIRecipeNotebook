export const generateImage = async (topLvBlocksMarkdown: string) => {
  const body = JSON.stringify(topLvBlocksMarkdown);

  const debug = false;
  if (debug){
    const data =
      {url: "https://oaidalleapiprodscus.blob.core.windows.net/private/org-AzhW41SZihdUCaG93bzrFxT3/user-oFDuyoJHzwskiZhE7d7Q6cla/img-vWXfoTjlE2r4WSbNm0Tl55Ce.png?st=2023-12-27T10%3A49%3A50Z&se=2023-12-27T12%3A49%3A50Z&sp=r&sv=2021-08-06&sr=b&rscd=inline&rsct=image/png&skoid=6aaadede-4fb3-4698-a8f6-684d7786b067&sktid=a48cca56-e6da-484e-a814-9c849652bcb3&skt=2023-12-26T15%3A08%3A04Z&ske=2023-12-27T15%3A08%3A04Z&sks=b&skv=2021-08-06&sig=P2ui5nS6JzxzwkiLhTlxXY0NX3aKat6ajg5cFu3olUo%3D"};
    return data
  }
  
  try {
    const response = await fetch("/api/image/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: body,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error(error);
  }
};
