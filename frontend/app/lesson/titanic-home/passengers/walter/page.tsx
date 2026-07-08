"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function WalterLegacyRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/lesson/titanic-home/passengers");
  }, [router]);

  return null;
}
