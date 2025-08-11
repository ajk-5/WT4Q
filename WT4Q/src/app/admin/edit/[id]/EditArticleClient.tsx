'use client';

import { useState, useEffect, FormEvent, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { API_ROUTES } from '@/lib/api';
import { ARTICLE_TYPES } from '@/lib/articleTypes';
import { CATEGORIES } from '@/lib/categories';
import countries from '../../../../../public/datas/Countries.json';
import styles from '../../dashboard/dashboard.module.css';

interface ArticleDetails {
  title: string;
  description: string;
  createdDate: string;
  articleType: number;
  category: number;
  photoLink?: string;
  embededCode?: string;
  altText?: string;
  countryName?: string;
  countryCode?: string;
  keywords?: string[];
}

export default function EditArticleClient({ id }: { id: string }) {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState('');
  const [category, setCategory] = useState('');
  const [keywords, setKeywords] = useState('');
  const [createdDate, setCreatedDate] = useState('');
  const [photos, setPhotos] = useState<FileList | null>(null);
  const [photoLink, setPhotoLink] = useState('');
  const [embededCode, setEmbededCode] = useState('');
  const [altText, setAltText] = useState('');
  const [countryName, setCountryName] = useState('');
  const [countryCode, setCountryCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(API_ROUTES.ARTICLE.GET_BY_ID(id), {
          credentials: 'include',
        });
        if (!res.ok) throw new Error('Failed to load');
        const data: ArticleDetails = await res.json();
        setTitle(data.title);
        setDescription(data.description);
        setType(ARTICLE_TYPES[data.articleType] ?? '');
        setCategory(CATEGORIES[data.category - 1] ?? '');
        setCreatedDate(data.createdDate.slice(0, 16));
        setPhotoLink(data.photoLink || '');
        setEmbededCode(data.embededCode || '');
        setAltText(data.altText || '');
        setCountryName(data.countryName || '');
        setCountryCode(data.countryCode || '');
        setKeywords(data.keywords ? data.keywords.join(', ') : '');
      } catch {
        setError('Failed to load article');
      }
    }
    load();
  }, [id]);

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
          createdDate: new Date(createdDate).toISOString(),
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

        const res = await fetch(`${API_ROUTES.ARTICLE.UPDATE}?Id=${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(body),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data.message || 'Failed to update');
        }
        router.push(`/articles/${id}`);
      } catch (err) {
        if (err instanceof Error) setError(err.message);
        else setError('Failed to update');
      }
    });
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Edit Article</h1>
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
        <input
          type="datetime-local"
          value={createdDate}
          readOnly
          className={styles.input}
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
          placeholder="Embedded code"
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
            {(countries as { name: string; code: string }[]).map((c) => (
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
          {isPending ? 'Updating...' : 'Update'}
        </button>
      </form>
    </div>
  );
}

