"use client";

import { ArrowRight, Heart, LogOut, ShoppingBag } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Shelf } from "@/components/library/Shelf";
import type { ShelfBook } from "@/components/library/types";
import { BookCover } from "@/components/library/BookCover";
import { SystemState, systemVariants, type SystemVariant } from "@/components/system/SystemState";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/Accordion";
import { Badge, StatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Checkbox, Radio, RadioGroup, Switch } from "@/components/ui/Choice";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/Dialog";
import { Avatar, ProgressBar, Skeleton, Stepper } from "@/components/ui/Feedback";
import { Field, Input, PasswordInput, Textarea } from "@/components/ui/Field";
import { OTPInput } from "@/components/ui/OTPInput";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/Select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import { toast } from "@/components/ui/Toast";
import { SPINE_PALETTE } from "@/lib/spine";

// DEMO DATA — gallery only, never shown on real storefront surfaces.
const demoTitles = [
  "The Internet Knowledge Bible",
  "Productivity System Workbook",
  "Digital Minimalism Guide",
  "Atomic Habits Summary",
  "Career Growth Guide",
  "Habit Builder Workbook",
  "Notion Templates Pack",
  "Design Practice Workbook",
  "Software Shortcuts Handbook",
  "The Creator Blueprint",
  "Deep Work Toolkit",
  "Life Planner Workbook",
  "Second Brain System",
  "Freelancer Business Kit",
];
const demoBooks: ShelfBook[] = demoTitles.map((title, i) => ({
  id: `demo-${i}`,
  title,
  href: "/dev/components",
  typeLabel: i % 3 === 0 ? "Workbook" : "Book",
  category: "Demo",
  spineColor: SPINE_PALETTE[i % SPINE_PALETTE.length],
  summary: "Demo product used to check the shelf interaction in development.",
  priceLabel: i % 4 === 0 ? undefined : "₹499",
  progress: i % 4 === 0 ? 32 : undefined,
  readHref: i % 4 === 0 ? "/dev/components" : undefined,
}));

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4 border-t border-line pt-8">
      <h2 className="text-h2">{title}</h2>
      {children}
    </section>
  );
}

export function Gallery() {
  const [otp, setOtp] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [variant, setVariant] = useState<SystemVariant>("not-found");

  return (
    <div className="container-page flex flex-col gap-10 py-10">
      <header className="flex flex-col gap-2">
        <Badge tone="warning" size="sm" className="self-start">
          Development only
        </Badge>
        <h1 className="text-display">Component gallery</h1>
        <p className="text-fg-secondary">Tokens and components from docs/DESIGN_SYSTEM.md, checked against UIUX/.</p>
      </header>

      <Section title="Typography">
        <p className="text-display">Display — Practical Knowledge</p>
        <h1 className="text-h1">H1 — The Internet Knowledge Bible</h1>
        <h2 className="text-h2">H2 — About this book</h2>
        <h3 className="text-h3">H3 — Curated Bundles</h3>
        <p className="text-body-lg">Body large — Digital books, guides and workbooks.</p>
        <p className="text-body">Body — A complete guide to the digital world.</p>
        <p className="text-body-sm text-fg-secondary">Body small — secondary copy.</p>
        <p className="text-caption text-fg-muted">Caption — Purchased on 15 Sep 2025</p>
        <p className="text-micro font-semibold tracking-wider uppercase">Micro — Bestseller</p>
        <p className="font-serif text-price">₹799</p>
      </Section>

      <Section title="Buttons">
        <div className="flex flex-wrap items-center gap-3">
          <Button>
            Buy Now <ArrowRight />
          </Button>
          <Button variant="secondary">
            <ShoppingBag /> Add to Cart
          </Button>
          <Button variant="tertiary">View all</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="accent">View All Deals</Button>
          <Button variant="destructive">Delete My Account</Button>
          <Button loading>Saving</Button>
          <Button disabled>Disabled</Button>
          <Button variant="secondary" size="icon" aria-label="Add to wishlist">
            <Heart />
          </Button>
        </div>
      </Section>

      <Section title="Forms">
        <div className="grid max-w-3xl gap-5 md:grid-cols-2">
          <Field label="Email address" hint="We'll send your receipt here.">
            {({ id, describedBy, invalid }) => (
              <Input id={id} type="email" placeholder="you@example.com" aria-describedby={describedBy} aria-invalid={invalid} />
            )}
          </Field>
          <Field label="Password" error="At least 8 characters, with a number and a letter.">
            {({ id, describedBy, invalid }) => <PasswordInput id={id} aria-describedby={describedBy} aria-invalid={invalid} />}
          </Field>
          <Field label="Country">
            {({ id }) => (
              <Select defaultValue="IN">
                <SelectTrigger id={id}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="IN">India</SelectItem>
                  <SelectItem value="US">United States</SelectItem>
                </SelectContent>
              </Select>
            )}
          </Field>
          <Field label="Message" optional>
            {({ id }) => <Textarea id={id} placeholder="Write a personal message…" />}
          </Field>
          <label className="flex items-center gap-3 text-body-sm">
            <Checkbox defaultChecked /> Keep me signed in
          </label>
          <label className="flex items-center gap-3 text-body-sm">
            <Switch defaultChecked /> Order updates
          </label>
          <RadioGroup defaultValue="razorpay" aria-label="Payment method">
            <label className="flex items-center gap-3 text-body-sm">
              <Radio value="razorpay" /> Razorpay (UPI, Cards, Wallets)
            </label>
            <label className="flex items-center gap-3 text-body-sm">
              <Radio value="stripe" /> Stripe (International Cards)
            </label>
          </RadioGroup>
          <OTPInput value={otp} onChange={setOtp} />
        </div>
      </Section>

      <Section title="Badges, progress, stepper">
        <div className="flex flex-wrap gap-2">
          <Badge tone="accent" size="sm">Bestseller</Badge>
          <Badge tone="deal" size="sm">40% off</Badge>
          <Badge tone="ink" size="sm">New</Badge>
          {(["published", "draft", "pending", "completed", "failed", "refunded", "scheduled", "expired"] as const).map((s) => (
            <StatusBadge key={s} status={s} />
          ))}
        </div>
        <div className="flex max-w-md items-center gap-4">
          <Avatar name="Siddharth Santhosh" />
          <ProgressBar value={32} label="Reading progress" />
        </div>
        <Stepper steps={["Information", "Payment", "Review"]} current={1} className="max-w-xl" />
        <div className="flex gap-3">
          <Skeleton className="h-40 w-32" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </div>
      </Section>

      <Section title="Overlays">
        <div className="flex flex-wrap gap-3">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="secondary">Open modal</Button>
            </DialogTrigger>
            <DialogContent title="Write a review" description="Share your thoughts about this product.">
              <p className="text-body-sm text-fg-secondary">Dialog body.</p>
            </DialogContent>
          </Dialog>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="secondary">Open bottom sheet</Button>
            </DialogTrigger>
            <DialogContent variant="sheet" title="Filters">
              <p className="text-body-sm text-fg-secondary">Sheet body.</p>
            </DialogContent>
          </Dialog>
          <Button variant="secondary" onClick={() => setConfirm(true)}>
            Sign out…
          </Button>
          <Button
            variant="secondary"
            onClick={() => toast({ title: "Added to cart", description: "Demo product", tone: "success" })}
          >
            Show toast
          </Button>
        </div>
        <ConfirmDialog
          open={confirm}
          onOpenChange={setConfirm}
          icon={<LogOut className="size-8" />}
          title="Sign Out?"
          description="Are you sure you want to sign out of your account?"
          confirmLabel="Sign Out"
          onConfirm={() => setConfirm(false)}
        />
        <Tabs defaultValue="overview">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="preview">Preview</TabsTrigger>
            <TabsTrigger value="toc">Table of Contents</TabsTrigger>
          </TabsList>
          <TabsContent value="overview">Overview panel</TabsContent>
          <TabsContent value="preview">Preview panel</TabsContent>
          <TabsContent value="toc">Contents panel</TabsContent>
        </Tabs>
        <Accordion type="single" collapsible className="flex max-w-xl flex-col gap-2">
          <AccordionItem value="a">
            <AccordionTrigger>Is this a physical book or a digital product?</AccordionTrigger>
            <AccordionContent>Answer content.</AccordionContent>
          </AccordionItem>
        </Accordion>
      </Section>

      <Section title="Covers & library shelf">
        <div className="grid max-w-2xl grid-cols-3 gap-4 md:grid-cols-5">
          {demoBooks.slice(0, 5).map((b) => (
            <BookCover key={b.id} id={b.id} title={b.title} spineColor={b.spineColor} typeLabel={b.typeLabel} />
          ))}
        </div>
        <Shelf books={demoBooks} label="Demo shelf" />
      </Section>

      <Section title="System states">
        <div className="flex flex-wrap gap-2">
          {(Object.keys(systemVariants) as SystemVariant[]).map((v) => (
            <Button key={v} size="sm" variant={v === variant ? "primary" : "secondary"} onClick={() => setVariant(v)}>
              {v}
            </Button>
          ))}
        </div>
        <SystemState variant={variant} layout="inline" headingLevel="h2" onRetry={() => toast({ title: "Retry pressed" })} />
      </Section>
    </div>
  );
}
