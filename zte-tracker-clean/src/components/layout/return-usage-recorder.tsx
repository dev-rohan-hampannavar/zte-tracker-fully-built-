"use client";

import { useEffect } from "react";
import { recordProductEvent } from "@/lib/product-analytics";

export function ReturnUsageRecorder() {
  useEffect(() => { void recordProductEvent("return_usage"); }, []);
  return null;
}
