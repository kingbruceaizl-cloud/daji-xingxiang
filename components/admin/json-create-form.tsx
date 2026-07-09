"use client";

import { Button } from "@/components/ui/button";
import { useState } from "react";

type JsonCreateFormProps = {
  endpoint: string;
  initialValue: string;
  submitText: string;
  fieldHints: string[];
};

export function JsonCreateForm({
  endpoint,
  initialValue,
  submitText,
  fieldHints,
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
      setMessage(
        error instanceof SyntaxError
          ? "配置格式不正确，请检查引号、逗号和括号。"
          : "请求失败，请稍后重试。",
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-md border border-stone-200 bg-white p-5">
      <div className="mb-4">
        <p className="text-sm font-semibold">字段说明</p>
        <div className="mt-3 grid gap-2">
          {fieldHints.map((hint) => (
            <p
              key={hint}
              className="rounded-md bg-stone-50 px-3 py-2 text-xs leading-5 text-stone-500"
            >
              {hint}
            </p>
          ))}
        </div>
      </div>
      <label className="block text-xs font-medium text-stone-500">
        配置模板
      </label>
      <textarea
        value={value}
        onChange={(event) => setValue(event.target.value)}
        aria-label="结构化配置模板"
        className="mt-2 min-h-72 w-full rounded-md border border-stone-200 bg-stone-50 p-4 font-mono text-sm leading-6 outline-none focus:border-red-300"
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
