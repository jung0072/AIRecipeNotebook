"use client";

import { useEffect, useState } from "react";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";


import Image from "next/image";
import { useUser } from "@clerk/clerk-react";
import { PlusCircle } from "lucide-react";
import { useMutation } from "convex/react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

import { api } from "@/convex/_generated/api";
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
import { askAnything } from "@/lib/askanything";

const FormSchema = z.object({
  prompt: z.string().length(3,{
    message: "Please enter a valid prompt.",
  }),
});

const DocumentsPage = () => {
  const router = useRouter();
  const { user } = useUser();
  const create = useMutation(api.documents.create);
  const [response, setResponse] = useState("");
  const [isStreamDoneReading, setIsStreamDoneReading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isLoading) {
      let count = 0;
      interval = setInterval(() => {
        setProgress(count);
        count++;
        if (count > 99) {
          clearInterval(interval);
        }
      }, 400);
    }
    return () => {
      clearInterval(interval);
    };
  }, [isLoading]);

  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      prompt:
        "draw a macro nutrition diagram for the recipe Zucchini Orzo Salad with Pepperoncini Dressing",
    },
  });

  async function handleOnSubmit(data: z.infer<typeof FormSchema>) {
    setIsLoading(true);
    try {
      const res = await askAnything(data);
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

  const onCreate = () => {
    const promise = create({ title: "Untitled", type: "document" })
      .then((documentId) => router.push(`/documents/${documentId}`))

    toast.promise(promise, {
      loading: "Creating a new note...",
      success: "New note created!",
      error: "Failed to create a new note."
    });
  };

  return (
    <div className="h-full flex flex-col items-center justify-center space-y-4">
      <Image
        src="/images/empty.png"
        height="300"
        width="300"
        alt="Empty"
        className="dark:hidden"
      />
      <h2 className="text-lg font-medium">
        Hey {user?.firstName}, ask anything to your AI assistant
      </h2>
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(handleOnSubmit)}
          className="px-[70px] space-y-6"
        >
          <FormField
            control={form.control}
            name="prompt"
            render={({ field }) => (
              <FormItem>
                <FormLabel></FormLabel>
                <FormControl>
                  <div className="flex gap-3 w-full">
                    <Input placeholder="URL" {...field} />
                    {isLoading ? (
                      <Button className="flex flex-row gap-2">
                        <Spinner></Spinner>
                        <span>{progress}%</span>
                      </Button>
                    ) : (
                      <Button type="submit" size="default" disabled={isLoading}>
                        Ask
                      </Button>
                    )}
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
 
export default DocumentsPage;