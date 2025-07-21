'use client';

import { useState, FormEvent, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { API_ROUTES } from '@/lib/api';
import { ARTICLE_TYPES } from '@/lib/articleTypes';
import { CATEGORIES } from '@/lib/categories';
import styles from './dashboard.module.css';
import countries from '../../../../public/datas/Countries.json';

export default function DashboardClient() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState('');
  const [category, setCategory] = useState('');
  const [keywords, setKeywords] = useState('');
  const [photos, setPhotos] = useState<FileList | null>(null);
  const [photoLink, setPhotoLink] = useState('');
  const [embededCode, setEmbededCode] = useState('');
  const [altText, setAltText] = useState('');
  const [countryName, setCountryName] = useState('');
  const [countryCode, setCountryCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();


  const handleLogout = async () => {
    await fetch(API_ROUTES.ADMIN_AUTH.LOGOUT, {
      method: 'POST',
      credentials: 'include',
    });
    document.cookie = 'AdminToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    router.replace('/admin-login');
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        const photosBase64 = photos
          ? await Promise.all(
              Array.from(photos).map(
                (file) =>
                  new Promise<string>((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = () => {
                      const result = reader.result as string;
                      const base64 = result.split(',')[1];
                      resolve(base64);
                    };
                    reader.onerror = () => reject(reader.error);
                    reader.readAsDataURL(file);
                  })
              )
            )
          : undefined;

        const body = {
          title,
          category: category ? CATEGORIES.indexOf(category) + 1 : 0,
          articleType: type ? ARTICLE_TYPES.indexOf(type) : 0,
          createdDate: new Date().toISOString(),
          description,
          photo: photosBase64,
          photoLink: photoLink || undefined,
          embededCode: embededCode || undefined,
          altText: altText || undefined,
          countryName: countryName || undefined,
          countryCode: countryCode || undefined,
          keyword: keywords
            .split(',')
            .map((k) => k.trim())
            .filter((k) => k.length > 0),
        } as Record<string, unknown>;
        const res = await fetch(API_ROUTES.ARTICLE.CREATE, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(body),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data.message || 'Failed to publish');
        }
        setTitle('');
        setDescription('');
        setType('');
        setCategory('');
        setKeywords('');
        setPhotos(null);
        setPhotoLink('');
        setEmbededCode('');
        setAltText('');
        setCountryName('');
        setCountryCode('');
      } catch (err) {
        if (err instanceof Error) setError(err.message);
        else setError('Failed to publish');
      }
    });
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Admin Dashboard</h1>
      <button onClick={handleLogout} className={styles.logoutButton}>
        Logout
      </button>
      {error && <p className={styles.error}>{error}</p>}
      <form onSubmit={handleSubmit} className={styles.form}>
        <input
          type="text"
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className={styles.input}
          required
        />
        <textarea
          placeholder="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={5}
          className={styles.textarea}
          required
        />
        <input
          type="file"
          multiple
          accept="image/*"
          onChange={(e) => setPhotos(e.target.files)}
          className={styles.input}
        />
        <input
          type="text"
          placeholder="Alt text"
          value={altText}
          onChange={(e) => setAltText(e.target.value)}
          className={styles.input}
        />
        <input
          type="text"
          placeholder="Link to photo"
          value={photoLink}
          onChange={(e) => setPhotoLink(e.target.value)}
          className={styles.input}
        />
        <textarea
          placeholder="Embeded code"
          value={embededCode}
          onChange={(e) => setEmbededCode(e.target.value)}
          rows={3}
          className={styles.textarea}
        />
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className={styles.select}
          required
        >
          <option value="" disabled>
            Select Type
          </option>
          {ARTICLE_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        {type === 'News' && (
          <select
            value={countryName}
            onChange={(e) => {
              const name = e.target.value;
              setCountryName(name);
              const match = (countries as { name: string; code: string }[]).find(
                (c) => c.name === name
              );
              setCountryCode(match ? match.code : '');
            }}
            className={styles.select}
          >
            <option value="" disabled>
              Select Country
            </option>
            {(
              countries as { name: string; code: string }[]
            ).map((c) => (
              <option key={c.code} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>
        )}
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className={styles.select}
          required
        >
          <option value="" disabled>
            Select Category
          </option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <input
          type="text"
          placeholder="Keywords (comma separated)"
          value={keywords}
          onChange={(e) => setKeywords(e.target.value)}
          className={styles.input}
        />
        <button type="submit" disabled={isPending} className={styles.button}>
          {isPending ? 'Publishing...' : 'Publish'}
        </button>
      </form>
    </div>
  );
}
