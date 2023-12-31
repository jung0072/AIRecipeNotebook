"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useEffect, useState } from "react";

import { BlockNoteEditor, PartialBlock, Block } from "@blocknote/core";

import { generateRecipe } from "@/lib/generate-recipe";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/spinner";

const FormSchema = z.object({
  url: z.string().url({
    message: "Please enter a valid URL.",
  }),
});

interface ImportDocumentProps {
  onChange: (content?: string, title?: string) => void;
  editor: BlockNoteEditor;
  initialContent?: string;
}

export function ImportDocument({
  onChange: onChange,
  editor,
  initialContent,
}: ImportDocumentProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState("");
  const [isStreamDoneReading, setIsStreamDoneReading] = useState(false);

  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      url: "https://dishingouthealth.com/zucchini-orzo-salad/",
    },
  });

  let firstBlock: Block;
  if (initialContent) {
    const blocks = JSON.parse(initialContent) as PartialBlock[];
    firstBlock = blocks[0] as Block;
  }

  const getBlocks = async (content: string) => {
    let title = content.slice(0, content.indexOf("\n"));
    title = title
      .replace("\n", "")
      .replace(/[Tt]itle:?\b/, "")
      .replaceAll("#", "")
      .trim();

    content = content.substring(content.indexOf("\n") + 1);

    const blocks: Block[] = await editor.markdownToBlocks(content);
    editor.insertBlocks(blocks, editor.topLevelBlocks[0], "before");
    onChange(JSON.stringify(editor.topLevelBlocks, null, 2), title);
  };

  async function onSubmit(data: z.infer<typeof FormSchema>) {
    setIsLoading(true);
    try {
      const res = await generateRecipe(data)
      // console.log(`( res )===============>`, res);
      
      if (!res) return;
  
      if (!res.ok) throw new Error(res.statusText);
  
      const stream = res.body;
      // console.log(`( stream )===============>`, stream);
      if (!stream) return;
  
      const reader = stream.getReader();
      const decoder = new TextDecoder();
  
      while (true) {
        const { value, done: doneReading } = await reader.read();
        setIsStreamDoneReading(doneReading);
        const chunkValue = decoder.decode(value);
        // console.log(`( chunkValue )===============>`, chunkValue);
        setResponse((prev) => prev + chunkValue);
        if (doneReading) {
          break;
        }
      }
      setIsLoading(false);
    } catch (error) {
      console.error(error);
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (response && isStreamDoneReading === true) {
      getBlocks(response);
      setResponse("")
    }
  }, [isStreamDoneReading]);

  return (
    <div className="pl-[54px] mb-2 flex flex-col items-start justify-center ">
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="w-full pr-[70px] space-y-6"
        >
          <FormField
            control={form.control}
            name="url"
            render={({ field }) => (
              <FormItem>
                <FormLabel></FormLabel>
                <FormControl>
                  <div className="flex gap-3">
                    <Input placeholder="URL" {...field} />
                    <Button type="submit" size="default" disabled={isLoading}>
                      {isLoading ? <Spinner /> : "Import"}
                    </Button>
                  </div>
                </FormControl>
                <FormDescription></FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </form>
      </Form>
      <div>{response}</div>
    </div>
  );
}
