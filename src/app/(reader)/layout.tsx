/** Distraction-free shell for the reader: no storefront header, footer or bottom nav. */
export default function ReaderLayout({ children }: LayoutProps<"/">) {
  return <div className="flex min-h-dvh flex-col bg-canvas-subtle">{children}</div>;
}
