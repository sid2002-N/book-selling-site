"use client";

import { useState } from "react";
import { CategoryForm } from "./CategoryForm";
import { Button } from "@/components/ui/Button";
import { Dialog, DialogContent } from "@/components/ui/Dialog";

export function EditCategory(props: { id: string; initial: { name: string; slug: string; description: string; position: number; isActive: boolean } }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button size="sm" variant="ghost" onClick={() => setOpen(true)}>
        Edit
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent title={`Edit ${props.initial.name}`}>
          <CategoryForm id={props.id} initial={props.initial} onDone={() => setOpen(false)} />
        </DialogContent>
      </Dialog>
    </>
  );
}
