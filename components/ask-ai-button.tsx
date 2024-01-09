import React, { useState, useEffect, useRef, useMemo } from "react";

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

  const recognition = useMemo(() => {
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

    return recognition;
  }, []);

  useEffect(() => {
    if (speechRecBtnRef.current) {
      speechRecBtnRef.current.addEventListener("click", () => {
        recognition.start();
      });
    }
  }, [isClicked]);

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
  function handleCancelModifyBtnClick() {
    matchedBlockIds.forEach((matchedBlockId, index) => {
      const block = editor.getBlock(matchedBlockId);
      if (block && block.content && block.content[0].type === "text") {
        editor.updateBlock(matchedBlockId, {
          content: [
            {
              type: "text",
              text: block.content[0].text.split(" → ")[0].trim(),
              styles: block.content[0].styles,
            },
          ],
          props: { backgroundColor: "default" },
        });
        console.log("update blocks");
      }
      setIsClicked(false);
    });

    setConfirmModal(false);
  }

  function handleCancelBtnClick() {
    setIsClicked(false);
  }

  async function handleAddImagesBtnClick() {
    setIsLoading(true);
    try {
      const topLvBlocks = editor.topLevelBlocks;
      const topLvBlocksMarkdown = await editor.blocksToMarkdown(topLvBlocks);

      const response = await generateImage(topLvBlocksMarkdown);

      editor.insertBlocks(
        [{ type: "image", props: { url: response.url } }],
        topLvBlocks[0].id,
        "before"
      );

      setIsLoading(false);
    } catch (error) {
      console.log(error);
      setIsLoading(false);
    }
  }

  async function handleAIBtnClick() {
    if (!inputRef.current || inputRef.current.value == "") {
      console.error("Please enter a prompt to ask AI.");
      return;
    }

    let inputPrompt = inputRef.current.value;

    let blocksToModify: Block[];
    const selection = editor.getSelection();
    if (selection) {
      blocksToModify = selection!.blocks;
    } else {
      blocksToModify = editor.topLevelBlocks;
    }

    // Remove blocks that are not text
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

        selected_parts.forEach((selected_part: string, index: number) => {
          selected_part = selected_part.trim();
          editor.topLevelBlocks.forEach((block) => {
            if (
              block.content &&
              block.content[0] &&
              block.content[0].type != "link" &&
              block.content[0].text
            ) {
              const original_block = block.content[0].text.trim();
              // Check substring to prevent different notation of fractional numbers
              if (
                original_block.includes(selected_part) ||
                original_block.includes(
                  selected_part.substring(selected_part.indexOf(" ") + 1)
                ) ||
                original_block.includes(
                  selected_part.substring(0, selected_part.lastIndexOf(" "))
                )
              ) {
                editor.updateBlock(block.id, {
                  content: [
                    {
                      type: "text",
                      text:
                        block.content[0].text +
                        " → " +
                        response.data.modified_recipe[index],
                      styles: block.content[0].styles,
                    },
                  ],
                  props: { backgroundColor: "blue" },
                });
                matchedBlockIds_buffer.push(block.id);
              }
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
        <Button variant="outline" className="flex items-center gap-3">
          <span>Generating...</span>
          <Spinner />
        </Button>
      ) : isClicked ? (
        <div className="flex flex-col items-end gap-3">
          <textarea
            rows={1}
            placeholder="Write prompt"
            style={{
              // marginRight: "10px",
              padding: "5px",
              borderRadius: "5px",
              border: "1px solid #ccc",
              minWidth: "280px",
              maxWidth: "400px",
              overflow: "hidden",
              resize: "none",
            }}
            onChange={(event) => {
              event.target.style.height = "inherit";
              event.target.style.height = `${event.target.scrollHeight}px`;
            }}
            ref={inputRef}
          />

          {/* <Button
            ref={speechRecBtnRef}
          >
            <FaMicrophone />
          </Button> */}

          {confirmModal ? (
            <div className="flex gap-3">
              <Button
                variant="destructive"
                onClick={handleCancelModifyBtnClick}
              >
                Cancel
              </Button>
              <Button onClick={handleAcceptBtnClick}>Accept</Button>
            </div>
          ) : (
            <div className="flex gap-3">
              <Button variant="outline" onClick={handleAddImagesBtnClick}>
                Add Images
              </Button>
              <Button variant="destructive" onClick={handleCancelBtnClick}>
                Cancel
              </Button>
              <Button onClick={handleAIBtnClick}>Enter</Button>
            </div>
          )}
        </div>
      ) : (
        <Button onClick={() => setIsClicked(true)}>AI Sous Chef</Button>
      )}
    </div>
  );
}
