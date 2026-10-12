"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { saveCategoryAction } from "../actions";
import { FormAlert } from "@/components/auth/FormAlert";
import { Button } from "@/components/ui/Button";
import { Switch } from "@/components/ui/Choice";
import { Field, Input, Textarea } from "@/components/ui/Field";
import { toast } from "@/components/ui/Toast";

type Initial = { name: string; slug: string; description: string; position: number; isActive: boolean };

export function CategoryForm({ id, initial, onDone }: { id: string | null; initial?: Initial; onDone?: () => void }) {
  const router = useRouter();
  const [v, setV] = useState<Initial>(initial ?? { name: "", slug: "", description: "", position: 0, isActive: true });
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [pending, start] = useTransition();
  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const result = await saveCategoryAction(id, v);
          if (result.status === "error") {
            setError(result.message ?? "Couldn't save.");
            setFields(result.fields ?? {});
            return;
          }
          setError(null);
          setFields({});
          toast({ title: result.message ?? "Saved", tone: "success" });
          if (!id) setV({ name: "", slug: "", description: "", position: 0, isActive: true });
          onDone?.();
          router.refresh();
        });
      }}
    >
      {error ? <FormAlert>{error}</FormAlert> : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name" error={fields.name}>
          {(ids) => <Input id={ids.id} value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} maxLength={60} required aria-invalid={ids.invalid} aria-describedby={ids.describedBy} />}
        </Field>
        <Field label="Slug" optional hint="Generated from the name if blank." error={fields.slug}>
          {(ids) => <Input id={ids.id} value={v.slug} onChange={(e) => setV({ ...v, slug: e.target.value })} maxLength={60} aria-invalid={ids.invalid} aria-describedby={ids.describedBy} />}
        </Field>
      </div>
      <Field label="Description" optional>
        {(ids) => <Textarea id={ids.id} rows={2} value={v.description} onChange={(e) => setV({ ...v, description: e.target.value })} maxLength={300} />}
      </Field>
      <div className="flex flex-wrap items-end gap-6">
        <Field label="Order" hint="Lower comes first.">
          {(ids) => <Input id={ids.id} type="number" min={0} max={999} className="w-24" value={v.position} onChange={(e) => setV({ ...v, position: Number(e.target.value) || 0 })} aria-describedby={ids.describedBy} />}
        </Field>
        <label className="flex h-11 items-center gap-3 text-body-sm text-fg">
          <Switch checked={v.isActive} onCheckedChange={(x) => setV({ ...v, isActive: x })} aria-label="Visible in the store" />
          Visible in the store
        </label>
      </div>
      <div>
        <Button type="submit" size="sm" loading={pending}>
          {id ? "Save category" : "Add category"}
        </Button>
      </div>
    </form>
  );
}
