import React, { useState, useEffect, useRef } from "react";

import { BlockNoteEditor, Block } from "@blocknote/core";
import { Button } from "../components/ui/button";

import { modifyRecipe } from "@/lib/modify-recipe";
import { FaMicrophone } from "react-icons/fa";
import { Spinner } from "@/components/spinner";

interface AskAIButtonProps {
  onChange: (content?: string, title?: string) => void;
  editor: BlockNoteEditor;
  initialContent?: string;
}
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export function AskAIButton({
  onChange: onChange,
  editor,
  initialContent,
}: AskAIButtonProps) {
  const [isClicked, setIsClicked] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const speechRecBtnRef = useRef<HTMLButtonElement>(null);
  const [isLoading, setIsLoading] = useState(false);

  const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition;
  const recognition = new SpeechRecognition();

  recognition.onstart = function () {
    console.log("Voice activated, you can speak to microphone.");
  };

  recognition.onresult = function (event: any) {
    console.log("recognition onresult");
    const transcript = event.results[0][0].transcript;
    inputRef.current!.value = transcript;
    inputRef.current!.style.height = `${inputRef.current!.scrollHeight}px`;
  };

  useEffect(() => {
    if (speechRecBtnRef.current) {
      speechRecBtnRef.current.addEventListener("click", () => {
        recognition.start();
      });
    }
  }, [isClicked]);

  async function handleAIBtnClick() {
    console.log("handleAIBtnClick");
    let inputPrompt = "";

    if (inputRef.current) {
      console.log(inputRef.current.value);
      inputPrompt = inputRef.current.value;
    }

    const selection = editor.getSelection();
    if (!selection) {
      console.error("No selection");
      return;
    }

    const selectedBlocks = selection.blocks;
    const selectedBlocksMarkdown = await editor.blocksToMarkdown(
      selectedBlocks
    );
    console.log(
      "AI button clicked\n Prpmpt: ",
      inputPrompt,
      "\nselectedBlocks: \n",
      selectedBlocksMarkdown
    );

    setIsLoading(true);
    modifyRecipe(inputPrompt, selectedBlocksMarkdown)
      .then(async (response: any) => {
        if (response.error) {
          console.error("Error in response:", response.error);
          return;
        }
        console.log("Response:", response.data);
        const blocks: Block[] = await editor.markdownToBlocks(response.data);

        selectedBlocks.forEach((block, index) => {
          block.content?.forEach((inlineContent) => {
            if (
              inlineContent.type !== "text" ||
              !/\s*\*\s*/.test(inlineContent.text)
            ) {
              return;
            }
          });

          let blockIdentifier = block.id;
          editor.updateBlock(blockIdentifier, blocks[index]);
        });
      })
      .catch((error: any) => {
        console.log(error);
      })
      .finally(() => {
        // Set isLoading back to false when the request finishes
        setIsLoading(false);
      });
  }

  return (
    <div style={{ position: "fixed", bottom: "20px", right: "30px" }}>
      {isLoading ? (
        <div className="flex items-center gap-3">
          <span>Thinking...</span>
          <Spinner />
        </div>
      ) : isClicked ? (
        <div className="flex items-end">
          <textarea
            rows={1}
            placeholder="Write prompt"
            style={{
              marginRight: "10px",
              padding: "5px",
              borderRadius: "5px",
              border: "1px solid #ccc",
              minWidth: "100px",
              maxWidth: "500px",
              overflow: "hidden",
              resize: "none",
            }}
            onChange={(event) => {
              console.log("onChange event");
              event.target.style.height = "inherit";
              event.target.style.height = `${event.target.scrollHeight}px`;
            }}
            ref={inputRef}
          />

          <Button
            ref={speechRecBtnRef}
            style={{
              marginRight: "10px",
            }}
          >
            <FaMicrophone />
          </Button>
          <Button onClick={handleAIBtnClick}>Enter</Button>
        </div>
      ) : (
        <Button onClick={() => setIsClicked(true)}>AI Sous Chef</Button>
      )}
    </div>
  );
}
