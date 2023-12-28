import React, { useState, useEffect, useRef } from "react";

import { BlockNoteEditor, Block, PartialBlock } from "@blocknote/core";
import { Button } from "../components/ui/button";

import { modifyRecipe } from "@/lib/modify-recipe";
import { generateImage } from "@/lib/generate-image";
import { FaMicrophone } from "react-icons/fa";
import { Spinner } from "@/components/spinner";

interface AskAIButtonProps {
  onChange: (content?: string, title?: string) => void;
  editor: BlockNoteEditor;
  title?: string;
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
  title,
}: AskAIButtonProps) {
  const [isClicked, setIsClicked] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const speechRecBtnRef = useRef<HTMLButtonElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [matchedBlockIds, setMatchedBlockIds] = useState<string[]>([]);
  const [modifiedRecipe, setModifiedRecipe] = useState<string[]>([]);
  const [confirmModal, setConfirmModal] = useState<boolean>(false);

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
  }, [isClicked, recognition]);

  function handleAcceptBtnClick() {
    matchedBlockIds.forEach((matchedBlockId, index) => {
      const block = editor.getBlock(matchedBlockId);
      if (block && block.content && block.content[0].type === "text") {
        editor.updateBlock(matchedBlockId, {
          content: [
            {
              type: "text",
              text: modifiedRecipe[index],
              styles: block.content[0].styles,
            },
          ],
          props: { backgroundColor: "default" },
        });
        setIsClicked(false);
      }
    });

    setConfirmModal(false);
  }

  function handleCancelBtnClick() {
    setIsClicked(false);
  }

  async function handleAddImagesBtnClick() {
    setIsLoading(true);

    const topLvBlocks = editor.topLevelBlocks;
    const topLvBlocksMarkdown = await editor.blocksToMarkdown(topLvBlocks);

    const response = await generateImage(topLvBlocksMarkdown);

    // let imageBlock = [{ type: "image", props: { url: response.url } }];
    // editor.insertBlocks(imageBlock, topLvBlocks[0].id, "before");
    
    editor.insertBlocks(
      [{ type: "image", props: { url: response.url } }],
      topLvBlocks[0].id,
      "before"
    );
    
    setIsLoading(false);
  }

  async function handleAIBtnClick() {
    console.log("handleAIBtnClick");
    let inputPrompt = "Change the total yield to 3 servings";

    if (inputRef.current && inputRef.current.value !== "") {
      console.log(inputRef.current.value);
      inputPrompt = inputRef.current.value;
    }

    let blocksToModify: Block[];
    const selection = editor.getSelection();
    if (selection) {
      blocksToModify = selection!.blocks;
    } else {
      blocksToModify = editor.topLevelBlocks;
    }

    // Remove blocks that are not text which are empty in content
    blocksToModify = blocksToModify.filter(
      (block) => block.content != undefined
    ) as Block[];

    const markdownToModify = await editor.blocksToMarkdown(blocksToModify);

    setIsLoading(true);

    modifyRecipe(inputPrompt, markdownToModify)
      .then(async (response: any) => {
        if (response.error) {
          console.error("Error in response:", response.error);
          return;
        }
        console.log("Response from modifyRecipe API:", response.data);

        setModifiedRecipe(response.data.modified_recipe);
        const selected_parts = response.data.selected_parts;

        let matchedBlockIds_buffer: string[] = [];

        selected_parts.forEach((selected_part: string) => {
          editor.topLevelBlocks.forEach((block) => {
            if (
              block.content &&
              block.content[0] &&
              block.content[0].type != "link" &&
              block.content[0].text &&
              block.content[0].text.trim() === selected_part.trim()
            ) {
              editor.updateBlock(block.id, {
                props: { backgroundColor: "blue" },
              });
              matchedBlockIds_buffer.push(block.id);
            }
          });
        });
        setMatchedBlockIds(matchedBlockIds_buffer);
      })
      .catch((error: any) => {
        console.log(error);
      })
      .finally(() => {
        // Set isLoading back to false when the request finishes
        setIsLoading(false);
        setConfirmModal(true);
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
          {confirmModal ? (
            <Button onClick={handleAcceptBtnClick}>Accept</Button>
          ) : (
            <div className="flex gap-3">
              <Button onClick={handleAIBtnClick}>Enter</Button>
              <Button variant="destructive" onClick={handleCancelBtnClick}>
                Cancel
              </Button>
              <Button variant="outline" onClick={handleAddImagesBtnClick}>
                Add Images
              </Button>
            </div>
          )}
        </div>
      ) : (
        <Button onClick={() => setIsClicked(true)}>AI Sous Chef</Button>
      )}
    </div>
  );
}
