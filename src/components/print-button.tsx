"use client";

import { Button } from "./ui";

/** Opens the print dialog, where "Save as PDF" produces the receipt / plan PDF. */
export function PrintButton({ label = "Download PDF" }: { label?: string }) {
  return (
    <Button icon="download" onClick={() => window.print()}>
      {label}
    </Button>
  );
}
