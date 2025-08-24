"use client";

import { useEffect, useState } from "react";
import PrefetchLink from "@/components/PrefetchLink";
import { API_ROUTES } from "@/lib/api";
import { isLoggedIn } from "@/lib/auth";
import styles from "./NotificationBell.module.css";

interface Notification {
  id: string;
  isRead: boolean;
}

export default function NotificationBell() {
  const [unread, setUnread] = useState(0);
  const loggedIn = isLoggedIn();

  useEffect(() => {
    if (!loggedIn) return;
    fetch(API_ROUTES.NOTIFICATIONS.GET, { credentials: "include" })
      .then((res) => (res.ok ? res.json() : []))
      .then((data: Notification[]) => {
        const count = data.filter((n) => !n.isRead).length;
        setUnread(count);
      })
      .catch(() => {});
  }, [loggedIn]);

  if (!loggedIn) return null;

  return (
    <PrefetchLink href="/notifications" className={styles.bell} aria-label="Notifications">
      <span>🔔</span>
      {unread > 0 && <span className={styles.badge}>{unread}</span>}
    </PrefetchLink>
  );
}

