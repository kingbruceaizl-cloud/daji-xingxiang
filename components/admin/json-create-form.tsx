"use client";

import { Button } from "@/components/ui/button";
import { useState } from "react";

type JsonCreateFormProps = {
  endpoint: string;
  initialValue: string;
  submitText: string;
};

export function JsonCreateForm({
  endpoint,
  initialValue,
  submitText,
}: JsonCreateFormProps) {
  const [value, setValue] = useState(initialValue);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setMessage(null);

    try {
      const payload = JSON.parse(value) as Record<string, unknown>;
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      setMessage(data.message || (data.ok ? "保存成功" : "保存失败"));
    } catch (error) {
      setMessage(error instanceof SyntaxError ? "JSON 格式不正确。" : "请求失败，请稍后重试。");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-md border border-stone-200 bg-white p-5">
      <textarea
        value={value}
        onChange={(event) => setValue(event.target.value)}
        className="min-h-72 w-full rounded-md border border-stone-200 bg-stone-50 p-4 font-mono text-sm leading-6 outline-none focus:border-red-300"
      />
      <div className="mt-4 flex items-center justify-between gap-4">
        <Button type="submit" disabled={isSaving}>
          {isSaving ? "保存中..." : submitText}
        </Button>
        {message && <p className="text-sm text-stone-500">{message}</p>}
      </div>
    </form>
  );
}
