"use client";

import { useMemo } from "react";

import Image from "next/image";
import dynamic from "next/dynamic";

import { useUser } from "@clerk/clerk-react";
import { PlusCircle } from "lucide-react";
import { useMutation, useQuery } from "convex/react";
import { Id } from "@/convex/_generated/dataModel";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

import { api } from "@/convex/_generated/api";
import { Toolbar } from "@/components/toolbar";

import { Button } from "@/components/ui/button";
import { Cover } from "@/components/cover";
import { Skeleton } from "@/components/ui/skeleton";

import { useTheme } from "next-themes";
import { BlockNoteEditor, PartialBlock } from "@blocknote/core";
import { BlockNoteView, useBlockNote } from "@blocknote/react";

import "@blocknote/core/style.css";

import { AskAIButton } from "@/components/ask-ai-button";

import { useEdgeStore } from "@/lib/edgestore";

interface DocumentIdPageProps {
  params: {
    documentId: Id<"documents">;
  };
}

const DocumentsPage = ({ params }: DocumentIdPageProps) => {
  const document = useQuery(api.documents.getById, {
    documentId: params.documentId,
  });

  const router = useRouter();
  const { user } = useUser();

  const initialContent = document?.content;
  const title = document?.title;
  const { resolvedTheme } = useTheme();
  const { edgestore } = useEdgeStore();

  const handleUpload = async (file: File) => {
    const response = await edgestore.publicFiles.upload({
      file,
    });

    return response.url;
  };

  const editor: BlockNoteEditor = useBlockNote({
    editable: true,
    initialContent: initialContent
      ? (JSON.parse(initialContent) as PartialBlock[])
      : undefined,
    onEditorContentChange: (editor) => {
      onChange(JSON.stringify(editor.topLevelBlocks, null, 2));
    },
    uploadFile: handleUpload,
  });

  const update = useMutation(api.documents.update);

  const onChange = (content?: string, title?: string) => {
    update({
      id: params.documentId,
      title,
      content,
    });
  };

  if (document === undefined) {
    return (
      <div>
        <Cover.Skeleton />
        <div className="md:max-w-3xl lg:max-w-4xl mx-auto mt-10">
          <div className="space-y-4 pl-8 pt-4">
            <Skeleton className="h-14 w-[50%]" />
            <Skeleton className="h-4 w-[80%]" />
            <Skeleton className="h-4 w-[40%]" />
            <Skeleton className="h-4 w-[60%]" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-40">
      <Cover url={document.coverImage} />
      <div className="md:max-w-3xl lg:max-w-4xl mx-auto">
        <Toolbar initialData={document} />
        <div>
          <BlockNoteView
            editor={editor}
            theme={resolvedTheme === "dark" ? "dark" : "light"}
          ></BlockNoteView>
          <AskAIButton onChange={onChange} editor={editor} title={title} />
        </div>
      </div>
    </div>
  );
};

export default DocumentsPage;
