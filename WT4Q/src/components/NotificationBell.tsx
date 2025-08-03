"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { API_ROUTES } from "@/lib/api";
import styles from "./NotificationBell.module.css";

interface Notification {
  id: string;
  isRead: boolean;
}

export default function NotificationBell() {
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    fetch(API_ROUTES.NOTIFICATIONS.GET, { credentials: "include" })
      .then((res) => (res.ok ? res.json() : []))
      .then((data: Notification[]) => {
        const count = data.filter((n) => !n.isRead).length;
        setUnread(count);
      })
      .catch(() => {});
  }, []);

  return (
    <Link href="/notifications" className={styles.bell} aria-label="Notifications">
      <span>🔔</span>
      {unread > 0 && <span className={styles.badge}>{unread}</span>}
    </Link>
  );
}

