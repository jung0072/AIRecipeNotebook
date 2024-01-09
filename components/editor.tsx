"use client";

import { useEffect, useState } from "react";

import { useTheme } from "next-themes";
import { BlockNoteEditor, PartialBlock } from "@blocknote/core";
import { BlockNoteView, useBlockNote } from "@blocknote/react";

import "@blocknote/core/style.css";

import { Doc } from "@/convex/_generated/dataModel";

import { ImportDocument } from "@/components/import-document";
import { AskAIButton } from "@/components/ask-ai-button";
import { Button } from "@/components/ui/button";

import { useEdgeStore } from "@/lib/edgestore";
import { modifyRecipe } from "@/lib/modify-recipe";
import { Spinner } from "@/components/spinner";

interface EditorProps {
  onChange: (content?: string, title?: string) => void;
  initialData?: Doc<"documents">;
  editable?: boolean;
}

const Editor = ({ onChange, initialData, editable }: EditorProps) => {
  const initialContent = initialData?.content;
  const title = initialData?.title;
  const { resolvedTheme } = useTheme();
  const { edgestore } = useEdgeStore();
  const [showModal, setShowModal] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [modifiedRecipe, setModifiedRecipe] = useState<string[]>([]);
  const [matchedBlockIds, setMatchedBlockIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [confirmModal, setConfirmModal] = useState<boolean>(false);
  const [currentBlockContentMD, setCurrentBlockContentMD] =
    useState<string>("");

  const handleUpload = async (file: File) => {
    const response = await edgestore.publicFiles.upload({
      file,
    });

    return response.url;
  };

  const editor: BlockNoteEditor = useBlockNote({
    editable,
    initialContent: initialContent
      ? (JSON.parse(initialContent) as PartialBlock[])
      : undefined,
    onEditorContentChange: (editor) => {
      onChange(JSON.stringify(editor.topLevelBlocks, null, 2));
    },
    uploadFile: handleUpload,
  });

  const handleEnter = async () => {
    setIsLoading(true);

    modifyRecipe(inputValue, currentBlockContentMD)
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
  };

  const handleCancel = () => {
    // Handle cancel button click
    console.log("Cancel button clicked");
    // Close the modal
    setShowModal(false);
  };

  const getMDOfCurrentCursorBlock = () => {
    const textCursorPosition = editor.getTextCursorPosition();

    if (textCursorPosition.block.content) {
      if (
        textCursorPosition.block.content &&
        textCursorPosition.block.content[0].type === "text"
      ) {
        console.log(
          "Set currentBlockContentMD to ",
          textCursorPosition.block.content[0].text
        );
        setCurrentBlockContentMD(textCursorPosition.block.content[0].text);
      }
    }
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey && event.key === "i") {
        getMDOfCurrentCursorBlock();
        setShowModal(true);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  function handleAcceptBtnClick() {
    console.log(`( matchedBlockIds )===============>`, matchedBlockIds);

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
        setShowModal(false);
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
      setShowModal(false);
      setConfirmModal(false);
    });
  }

  return (
    <div>
      <ImportDocument
        onChange={onChange}
        editor={editor}
        initialContent={initialContent}
      />
      <BlockNoteView
        editor={editor}
        theme={resolvedTheme === "dark" ? "dark" : "light"}
      ></BlockNoteView>
      <AskAIButton onChange={onChange} editor={editor} title={title} />
      {showModal && (
        <div className="fixed bottom-3 right-7 flex items-center justify-center bg-opacity-50 border z-999 max-w-md rounded-md">
          <div className="bg-white p-4 rounded-md flex flex-col gap-3">
            <h1 className="text-xl font-bold">
              Write a prompt for the text below and click enter
            </h1>
            <p>{currentBlockContentMD}</p>
            <textarea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              className="border border-gray-300 rounded-md p-2 mb-2"
              rows={Math.ceil(inputValue.length / 30)}
            />
            {confirmModal ? (
              <div className="flex justify-end gap-3">
                <Button
                  variant="destructive"
                  onClick={handleCancelModifyBtnClick}
                >
                  Cancel
                </Button>
                <Button onClick={handleAcceptBtnClick}>Accept</Button>
              </div>
            ) : (
              <div className="flex justify-end gap-3">
                <Button onClick={handleCancel} variant="destructive">
                  Cancel
                </Button>
                <Button onClick={handleEnter} variant="default">
                  Enter
                </Button>
              </div>
            )}
            {isLoading && (
              <div className="flex justify-end gap-3">
                <Button variant="outline">
                  <span>Generating...</span>
                  <Spinner />
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Editor;
