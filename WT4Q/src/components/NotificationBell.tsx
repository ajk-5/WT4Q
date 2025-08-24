"use client";

import { useEffect, useState } from "react";
import PrefetchLink from "@/components/PrefetchLink";
import { API_ROUTES, apiFetch } from "@/lib/api";
import { isLoggedIn, setLoggedIn } from "@/lib/auth";
import styles from "./NotificationBell.module.css";

interface Notification {
  id: string;
  isRead: boolean;
}

export default function NotificationBell() {
  const [unread, setUnread] = useState(0);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!isLoggedIn()) return;
    setShow(true);
    apiFetch(API_ROUTES.NOTIFICATIONS.GET)
      .then((res) => (res.ok ? res.json() : []))
      .then((data: Notification[]) => {
        const count = data.filter((n) => !n.isRead).length;
        setUnread(count);
      })
      .catch(() => {
        setShow(false);
        setLoggedIn(false);
      });
  }, []);

  if (!show) return null;

  return (
    <PrefetchLink href="/notifications" className={styles.bell} aria-label="Notifications">
      <span>🔔</span>
      {unread > 0 && <span className={styles.badge}>{unread}</span>}
    </PrefetchLink>
  );
}

