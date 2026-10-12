"use client";

import { useActionState } from "react";
import { createProductAction } from "../../actions";
import { FormAlert } from "@/components/auth/FormAlert";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { initialFormState } from "@/lib/form-state";
import { cn } from "@/lib/cn";

const TYPES = [
  { value: "book", label: "Book", hint: "Long-form digital book" },
  { value: "guide", label: "Guide", hint: "Focused, practical guide" },
  { value: "workbook", label: "Workbook", hint: "Fillable PDF with exercises" },
  { value: "bundle", label: "Bundle", hint: "Several products sold together" },
  { value: "free_resource", label: "Free resource", hint: "Priced at 0, still needs an account" },
] as const;

export function NewProductForm() {
  const [state, action, pending] = useActionState(createProductAction, initialFormState);
  return (
    <form action={action} className="flex flex-col gap-5">
      {state.status === "error" ? <FormAlert>{state.message}</FormAlert> : null}
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1.5 text-label font-medium text-fg">Type</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {TYPES.map((t, i) => (
            <label
              key={t.value}
              className={cn(
                "flex cursor-pointer items-start gap-3 rounded-sm border border-line bg-surface p-3 has-[:checked]:border-ink has-[:checked]:bg-canvas-subtle",
                "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-focus",
              )}
            >
              <input type="radio" name="type" value={t.value} defaultChecked={state.values?.type ? state.values.type === t.value : i === 0} className="mt-1 accent-ink" />
              <span className="flex flex-col">
                <span className="text-body-sm font-semibold text-fg">{t.label}</span>
                <span className="text-caption text-fg-muted">{t.hint}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <Field label="Title" error={state.fields?.title}>
        {(ids) => <Input id={ids.id} name="title" required maxLength={160} defaultValue={state.values?.title} aria-describedby={ids.describedBy} aria-invalid={ids.invalid} autoFocus />}
      </Field>
      <div>
        <Button type="submit" loading={pending}>
          Create draft
        </Button>
      </div>
    </form>
  );
}
