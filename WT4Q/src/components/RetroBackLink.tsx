"use client";

import { useRouter } from "next/navigation";
import { VAULT_BASE } from "@/lib/vaultPaths";
import styles from "./RetroBackLink.module.css";

type Props = {
  href?: string;
  label?: string;
  variant?: "solid" | "ghost";
  className?: string;
};

export default function RetroBackLink({
  href = VAULT_BASE,
  label = "Back",
  variant = "solid",
  className,
}: Props) {
  const router = useRouter();

  function handleClick() {
    if (typeof window === "undefined") {
      router.push(href);
      return;
    }

    const origin = window.location.origin;
    const ref = document.referrer || "";
    const hasHistory = window.history.length > 1;
    const fromSameSite = ref.startsWith(origin);

    if (hasHistory && fromSameSite) {
      router.back();
      return;
    }

    router.push(href);
  }

  const classes = [
    styles.base,
    variant === "ghost" ? styles.ghost : styles.solid,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button type="button" onClick={handleClick} className={classes}>
      <span aria-hidden="true" className={styles.icon}>
        ↩
      </span>
      {label}
    </button>
  );
}

