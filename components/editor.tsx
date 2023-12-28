"use client";

import { useTheme } from "next-themes";
import { BlockNoteEditor, PartialBlock } from "@blocknote/core";
import {
  BlockNoteView,
  useBlockNote,
} from "@blocknote/react";

import "@blocknote/core/style.css";

import { Doc } from "@/convex/_generated/dataModel";

import { ImportDocument } from "@/components/import-document";
import { AskAIButton } from "@/components/ask-ai-button";

import { useEdgeStore } from "@/lib/edgestore";

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
      <AskAIButton editor={editor} title={title} />
    </div>
  );
};

export default Editor;
