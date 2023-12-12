"use client";

import { useMemo } from "react";
import { useTheme } from "next-themes";
import { BlockNoteEditor, PartialBlock } from "@blocknote/core";
import {
  BlockNoteView,
  useBlockNote,
  HyperlinkToolbarPositioner,
  ImageToolbarPositioner,
  SlashMenuPositioner,
  SideMenuPositioner,
  FormattingToolbarPositioner,
} from "@blocknote/react";

import "@blocknote/core/style.css";

import { ImportDocument } from "@/components/import-document";
import { PromptInput } from "@/components/prompt-input";
import { AskAIButton } from "@/components/ask-ai-button";

import { useEdgeStore } from "@/lib/edgestore";

interface EditorProps {
  onChange: (content?: string, title?: string) => void;
  initialContent?: string;
  editable?: boolean;
}

const Editor = ({ onChange, initialContent, editable }: EditorProps) => {
  const { resolvedTheme } = useTheme();
  const { edgestore } = useEdgeStore();

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

  const handleButtonClick = () => {
    console.log("hi");
  };

  const sideMenu = () => {
    return (
      <div className="flex flex-col">
        <button>GPT</button>
      </div>
    );
  };

  return (
    <div>
      <ImportDocument
        onChange={onChange}
        editor={editor}
        initialContent={initialContent}
      />
      <PromptInput onChange={onChange} editor={editor} />
      <BlockNoteView
        editor={editor}
        theme={resolvedTheme === "dark" ? "dark" : "light"}
      ></BlockNoteView>
      <AskAIButton editor={editor} />
    </div>
  );
};

export default Editor;
