'use client';

import { useState, useEffect, FormEvent, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { API_ROUTES } from '@/lib/api';
import { ARTICLE_TYPES } from '@/lib/articleTypes';
import { CATEGORIES } from '@/lib/categories';
import countries from '../../../../../public/datas/Countries.json';
import styles from '../../dashboard/dashboard.module.css';
import type { ArticleImage } from '@/lib/models';
import { useAdminGuard } from '@/hooks/useAdminGuard';

interface ArticleDetails {
  title: string;
  content: string;
  createdDate: string;
  articleType: string;
  category: string;
  images?: ArticleImage[];
  embededCode?: string;
  countryName?: string;
  countryCode?: string;
  keywords?: string[];
}

export default function EditArticleClient({ id }: { id: string }) {
  const router = useRouter();
  const admin = useAdminGuard();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [type, setType] = useState('');
  const [category, setCategory] = useState('');
  const [keywords, setKeywords] = useState('');
  const [createdDate, setCreatedDate] = useState('');
  const [images, setImages] = useState<{ file?: File; link: string; altText: string; caption: string; existing?: string; }[]>([
    { link: '', altText: '', caption: '' }
  ]);
  const [embededCode, setEmbededCode] = useState('');
  const [countryName, setCountryName] = useState('');
  const [countryCode, setCountryCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    async function load() {
      if (!admin) return;
      try {
        const res = await fetch(API_ROUTES.ARTICLE.GET_BY_ID(id), {
          credentials: 'include',
        });
        if (!res.ok) throw new Error('Failed to load');
        const data: ArticleDetails = await res.json();
        setTitle(data.title);
        setContent(data.content);
        setType(data.articleType || '');
        setCategory(data.category || '');
        setCreatedDate(data.createdDate.slice(0, 16));
        setEmbededCode(data.embededCode || '');
        setImages(
          data.images && data.images.length
            ? data.images.map((img) => ({
                link: img.photoLink || '',
                altText: img.altText || '',
                caption: img.caption || '',
                existing: img.photo ? `data:image/jpeg;base64,${img.photo}` : undefined,
              }))
            : [{ link: '', altText: '', caption: '' }]
        );
        setCountryName(data.countryName || '');
        setCountryCode(data.countryCode || '');
        setKeywords(data.keywords ? data.keywords.join(', ') : '');
      } catch {
        setError('Failed to load article');
      }
    }
    load();
  }, [id, admin]);

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        const imagesPayload = (
          await Promise.all(
            images.map(async (img) => {
              if (img.file && img.link) {
                throw new Error('Provide either a file or a link for each image');
              }
              if (img.file) {
                const base64 = await new Promise<string>((resolve, reject) => {
                  const reader = new FileReader();
                  reader.onload = () => {
                    const result = reader.result as string;
                    resolve(result.split(',')[1]);
                  };
                  reader.onerror = () => reject(reader.error);
                  reader.readAsDataURL(img.file!);
                });
                return {
                  photo: base64,
                  altText: img.altText || undefined,
                  caption: img.caption || undefined,
                };
              }
              if (img.link) {
                return {
                  photoLink: img.link,
                  altText: img.altText || undefined,
                  caption: img.caption || undefined,
                };
              }
              if (img.existing) {
                return {
                  photo: img.existing.split(',')[1],
                  altText: img.altText || undefined,
                  caption: img.caption || undefined,
                };
              }
              return null;
            })
          )
        ).filter(Boolean);

        const body = {
          title,
          category: category || undefined,
          articleType: type || undefined,
          createdDate: new Date(createdDate).toISOString(),
          content,
          images: imagesPayload,
          embededCode: embededCode || undefined,
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
          placeholder="Content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={5}
          className={styles.textarea}
          required
        />
        {images.map((img, idx) => (
          <div key={idx} className={styles.imageGroup}>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                setImages((prev) => {
                  const copy = [...prev];
                  copy[idx].file = file || undefined;
                  return copy;
                });
              }}
              className={styles.input}
            />
            <input
              type="text"
              placeholder="Link to photo"
              value={img.link}
              onChange={(e) =>
                setImages((prev) => {
                  const copy = [...prev];
                  copy[idx].link = e.target.value;
                  return copy;
                })
              }
              className={styles.input}
            />
            <input
              type="text"
              placeholder="Alt text"
              value={img.altText}
              onChange={(e) =>
                setImages((prev) => {
                  const copy = [...prev];
                  copy[idx].altText = e.target.value;
                  return copy;
                })
              }
              className={styles.input}
            />
            <input
              type="text"
              placeholder="Caption"
              value={img.caption}
              onChange={(e) =>
                setImages((prev) => {
                  const copy = [...prev];
                  copy[idx].caption = e.target.value;
                  return copy;
                })
              }
              className={styles.input}
            />
          </div>
        ))}
        <button
          type="button"
          onClick={() =>
            setImages((prev) => [...prev, { link: '', altText: '', caption: '' }])
          }
          className={styles.button}
        >
          Add Image
        </button>
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

