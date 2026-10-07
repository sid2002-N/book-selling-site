"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { FormAlert } from "@/components/auth/FormAlert";
import { Button } from "@/components/ui/Button";
import { Switch } from "@/components/ui/Choice";
import { Field, FormSection, Input, Label, Textarea } from "@/components/ui/Field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/Select";
import { toast } from "@/components/ui/Toast";

type Props = {
  initial: { name: string; email: string; country: string | null; bio: string | null; newsletter: boolean; emailVerified: boolean };
  countries: { code: string; name: string }[];
};

/** Profile & preferences (sheet "Warm Account Settings"). */
export function ProfileForm({ initial, countries }: Props) {
  const router = useRouter();
  const [name, setName] = useState(initial.name);
  const [country, setCountry] = useState(initial.country ?? "");
  const [bio, setBio] = useState(initial.bio ?? "");
  const [newsletter, setNewsletter] = useState(initial.newsletter);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setFields({});
    const res = await fetch("/api/v1/account/profile", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, country: country || null, bio: bio || null, newsletter }) });
    const json = (await res.json().catch(() => null)) as { error?: { message: string; fields?: Record<string, string> } } | null;
    setBusy(false);
    if (!res.ok) {
      setFields(json?.error?.fields ?? {});
      setError(json?.error?.message ?? "We couldn't save your changes.");
      return;
    }
    toast({ title: "Settings saved", tone: "success" });
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-8">
      {error ? <FormAlert>{error}</FormAlert> : null}
      <FormSection title="Profile" description="How you appear on reviews and in emails.">
        <Field label="Full name" error={fields.name}>
          {(ids) => <Input id={ids.id} autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} aria-describedby={ids.describedBy} aria-invalid={ids.invalid} />}
        </Field>
        <Field label="Email" hint={initial.emailVerified ? "Verified" : "Not verified yet — check your inbox for the verification link."}>
          {(ids) => <Input id={ids.id} value={initial.email} readOnly disabled aria-describedby={ids.describedBy} />}
        </Field>
        <Field label="Country" optional hint="Pre-fills checkout and sets your invoice country.">
          {(ids) => (
            <Select value={country} onValueChange={setCountry}>
              <SelectTrigger id={ids.id} aria-describedby={ids.describedBy}>
                <SelectValue placeholder="Choose your country" />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                {countries.map((c) => (
                  <SelectItem key={c.code} value={c.code}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </Field>
        <Field label="Short bio" optional hint={`${bio.length}/280`} error={fields.bio}>
          {(ids) => <Textarea id={ids.id} rows={3} maxLength={280} value={bio} onChange={(e) => setBio(e.target.value)} aria-describedby={ids.describedBy} aria-invalid={ids.invalid} />}
        </Field>
      </FormSection>
      <FormSection title="Email preferences" description="Order, download and security emails are always sent.">
        <div className="flex items-start justify-between gap-4 rounded-lg border border-line bg-surface p-4">
          <div>
            <Label htmlFor="newsletter" className="text-body-sm font-semibold">
              New releases & reading notes
            </Label>
            <p className="text-caption text-fg-muted">An occasional email about new titles and collections. Unsubscribe any time.</p>
          </div>
          <Switch id="newsletter" checked={newsletter} onCheckedChange={setNewsletter} />
        </div>
      </FormSection>
      <div>
        <Button type="submit" loading={busy}>
          Save changes
        </Button>
      </div>
    </form>
  );
}
