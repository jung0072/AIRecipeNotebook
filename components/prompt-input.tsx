import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

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
import { BlockNoteEditor, PartialBlock, Block } from "@blocknote/core";

import { modifyRecipe } from "@/lib/modify-recipe";

const FormSchema = z.object({
  prompt: z.string(),
});

interface ImportDocumentProps {
  onChange: (value: string) => void;
  editor: BlockNoteEditor;
}

export function PromptInput({ onChange, editor }: ImportDocumentProps) {
  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      prompt: "increase the portion to 10%",
    },
  });

  const document = editor.topLevelBlocks
    .map((block) => {
      if (
        block.content &&
        block.content[0] &&
        block.content[0].type != "link" &&
        block.content[0].text
      ) {
        return block.content[0].text;
      }
    })
    .join(" ");

  function onSubmit(data: z.infer<typeof FormSchema>) {
    modifyRecipe(data.prompt, document)
      .then((response) => {
        if (response.error) {
          console.error("Error in response:", response.error);
          return;
        }
        console.log(response.data);
      })
      .catch((error: any) => {
        console.log(error);
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
            name="prompt"
            render={({ field }) => (
              <FormItem>
                <FormLabel></FormLabel>
                <FormControl>
                  <div className="flex gap-3">
                    <Input
                      placeholder="Ask AI sous chef to change the recipe..."
                      {...field}
                    />
                    <Button type="submit" size="default">
                      Prompt
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
