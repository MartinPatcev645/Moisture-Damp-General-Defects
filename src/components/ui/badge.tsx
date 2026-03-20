import React from "react";
import { cva } from "class-variance-authority";

import { cn } from "./utils";

const thumbBadgeVariants = cva("ds-photo-guide-thumb-badge", {
  variants: {
    accepted: {
      true: "ds-photo-guide-thumb-badge--ok",
      false: "ds-photo-guide-thumb-badge--bad",
    },
  },
  defaultVariants: {
    accepted: true,
  },
});

export function ThumbBadge({
  accepted,
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { accepted: boolean }) {
  return <span className={cn(thumbBadgeVariants({ accepted }), className)} {...props} />;
}

