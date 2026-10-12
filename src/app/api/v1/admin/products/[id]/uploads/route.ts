import { revalidatePath } from "next/cache";
import { AppError } from "@/lib/errors";
import { ok, route } from "@/lib/http";
import { uploadCover, uploadPreview, uploadVersion } from "@/modules/backoffice";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Admin uploads (multipart): `kind` = cover | preview | version. The services check
 * `products.update`, sniff magic bytes, enforce size caps and write the audit entry.
 */
export const POST = route<RouteContext<"/api/v1/admin/products/[id]/uploads">>(async (request, { params }) => {
  const { id } = await params;
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    throw new AppError("INVALID_REQUEST", "The upload could not be read.");
  }
  const file = form.get("file");
  if (!(file instanceof File)) throw new AppError("VALIDATION_ERROR", "Choose a file to upload.");
  const bytes = Buffer.from(await file.arrayBuffer());
  const kind = String(form.get("kind") ?? "");
  const text = (key: string) => {
    const v = form.get(key);
    return typeof v === "string" ? v : "";
  };
  if (kind === "cover") await uploadCover(id, bytes, text("alt") || null);
  else if (kind === "preview") await uploadPreview(id, bytes, text("label") || null);
  else if (kind === "version") await uploadVersion(id, bytes, { version: text("version"), changelog: text("changelog"), fileName: file.name });
  else throw new AppError("INVALID_REQUEST", "Unknown upload type.");

  revalidatePath(`/admin/products/${id}`);
  revalidatePath("/", "layout");
  return ok({ uploaded: kind });
});
