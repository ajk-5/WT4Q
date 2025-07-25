'use client';
import { useEffect, useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import styles from './Profile.module.css';
import { API_ROUTES } from '@/lib/api';

interface User {
  userName: string;
  phone?: string;
  dob?: string;
}

interface Activity {
  comments: {
    id: string;
    articleTitle: string;
    content: string;
  }[];
  likes: {
    id: number;
    articleTitle: string;
    type: number;
  }[];
}

export default function Profile() {
  const [user, setUser] = useState<User | null>(null);
  const [password, setPassword] = useState('');
  const [activity, setActivity] = useState<Activity | null>(null);
  const [showDeletePrompt, setShowDeletePrompt] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetch(API_ROUTES.USERS.ME, { credentials: 'include' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setUser(data))
      .catch(() => setUser(null));

    fetch(API_ROUTES.USERS.ACTIVITY, { credentials: 'include' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setActivity(data))
      .catch(() => setActivity(null));
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;
    await fetch(API_ROUTES.USERS.UPDATE, {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userName: user.userName,
        phoneNumber: user.phone,
        dob: user.dob,
      }),
    });
    router.refresh();
  };

  const handleDelete = async () => {
    if (!password) return;
    const res = await fetch(API_ROUTES.USERS.DELETE, {
      method: 'DELETE',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    if (res.ok) {
      router.replace('/');
    } else {
      alert('Invalid password');
    }
  };

  if (!user) return <p className={styles.message}>Please log in</p>;

  return (
    <>
    <form onSubmit={handleSubmit} className={styles.form}>
      <h1 className={styles.title}>Profile</h1>
      <label className={styles.label}>
        Name
        <input
          className={styles.input}
          value={user.userName}
          onChange={(e) => setUser({ ...user, userName: e.target.value })}
        />
      </label>
      <label className={styles.label}>
        Phone
        <input
          className={styles.input}
          value={user.phone || ''}
          onChange={(e) => setUser({ ...user, phone: e.target.value })}
        />
      </label>
      <label className={styles.label}>
        Date of birth
        <input
          type="date"
          className={styles.input}
          value={user.dob || ''}
          onChange={(e) => setUser({ ...user, dob: e.target.value })}
        />
      </label>
      <button type="submit" className={styles.button}>Save</button>
    </form>

    <section className={styles.accountSection}>
      <h2 className={styles.subtitle}>Account Settings</h2>
      {!showDeletePrompt ? (
        <button
          type="button"
          onClick={() => setShowDeletePrompt(true)}
          className={styles.deleteButton}
        >
          Delete account
        </button>
      ) : (
        <div className={styles.deleteConfirm}>
          <input
            type="password"
            placeholder="Password"
            className={styles.input}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button
            type="button"
            onClick={handleDelete}
            className={styles.deleteButton}
          >
            Confirm
          </button>
          <button
            type="button"
            onClick={() => setShowDeletePrompt(false)}
            className={styles.button}
          >
            Cancel
          </button>
        </div>
      )}
    </section>
    {activity && (
      <section className={styles.activitySection}>
        <h2 className={styles.title}>Recent Activity</h2>
        <h3>Comments</h3>
        {activity.comments.length === 0 ? (
          <p>No comments yet.</p>
        ) : (
          <ul className={styles.activityList}>
            {activity.comments.map((c) => (
              <li key={c.id}>
                Commented on {c.articleTitle}: {c.content}
              </li>
            ))}
          </ul>
        )}
        <h3>Likes</h3>
        {activity.likes.length === 0 ? (
          <p>No likes yet.</p>
        ) : (
          <ul className={styles.activityList}>
            {activity.likes.map((l) => (
              <li key={l.id}>Liked {l.articleTitle}</li>
            ))}
          </ul>
        )}
      </section>
    )}
    </>
  );
}
