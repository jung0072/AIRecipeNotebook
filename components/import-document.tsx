"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useState } from "react";

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
    console.log("Get Block and insert");
    console.log(content);
    // content = content
    //   .replace("```markdown\n", "m")
    //   .replace("\n```", "")
    //   .replace("---\n", "")
    //   .replaceAll("**", "")
    //   .replaceAll("#", "")
    //   .replaceAll(":", "")
    //   .replace(/(?<!#)[Tt]otal [Yy]ield(:?\b)/, "### Total Yield")
    //   .replace(/(?<!#)[Dd]escription:?\b/, "## Description\n")
    //   .replace(/(?<!#)[Ii]ngredients:?\b/, "## Ingredients\n")
    //   .replace(/(?<!#)[Ii]nstructions:?\b/, "## Instructions\n");

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

  function onSubmit(data: z.infer<typeof FormSchema>) {
    setIsLoading(true);

    generateRecipe(data)
      .then((response) => {
        if (response.error) {
          console.error("Error in response:", response.error);
          return;
        }
        getBlocks(response.data);
        setIsLoading(false);
      })
      .catch((error: any) => {
        console.log(error);
        setIsLoading(false);
      });
  }

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
    </div>
  );
}
