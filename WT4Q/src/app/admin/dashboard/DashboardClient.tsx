'use client';

import {
  useState,
  useEffect,
  FormEvent,
  useTransition,
} from 'react';
import { useRouter } from 'next/navigation';
import PrefetchLink from '@/components/PrefetchLink';
import { API_ROUTES } from '@/lib/api';
import { ARTICLE_TYPES } from '@/lib/articleTypes';
import { UPLOADCATEGORIES } from '@/lib/categories';
import styles from './dashboard.module.css';
import countries from '../../../../public/datas/Countries.json';
import { useAdminGuard } from '@/hooks/useAdminGuard';

export default function DashboardClient() {
  const router = useRouter();
  const admin = useAdminGuard();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [type, setType] = useState('');
  const [category, setCategory] = useState('');
  const [keywords, setKeywords] = useState('');
  const [images, setImages] = useState<{ file?: File; link: string; altText: string; caption: string; }[]>([
    { link: '', altText: '', caption: '' }
  ]);
  const [embededCode, setEmbededCode] = useState('');
  const [countryName, setCountryName] = useState('');
  const [countryCode, setCountryCode] = useState('');
  const [isBreakingNews, setIsBreakingNews] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [articles, setArticles] = useState<
    { id: string; title: string; createdDate?: string }[]
  >([]);

  useEffect(() => {
    async function load() {
      if (!admin?.id) return;
      try {
        const res = await fetch(API_ROUTES.ARTICLE.SEARCH_BY_AUTHOR(admin.id), {
          credentials: 'include',
        });
        if (!res.ok) return;
        const data: { id: string; title: string; createdDate?: string }[] =
          await res.json();
        data.sort(
          (a, b) =>
            new Date(b.createdDate ?? 0).getTime() -
            new Date(a.createdDate ?? 0).getTime(),
        );
        setArticles(data);
      } catch {
        // ignore
      }
    }
    load();
  }, [admin]);


  const handleLogout = async () => {
    await fetch(API_ROUTES.ADMIN_AUTH.LOGOUT, {
      method: 'POST',
      credentials: 'include',
    });
      document.cookie = 'JwtToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
      router.replace('/admin-login');
    };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
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
              return null;
            })
          )
        ).filter(Boolean);

        const body = {
          title,
          category: category ? UPLOADCATEGORIES.indexOf(category) + 1 : 0,
          articleType: type ? ARTICLE_TYPES.indexOf(type) : 0,
          createdDate: new Date().toISOString(),
          content,
          images: imagesPayload,
          embededCode: embededCode || undefined,
          isBreakingNews,
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
        setContent('');
        setType('');
        setCategory('');
        setKeywords('');
        setImages([{ link: '', altText: '', caption: '' }]);
        setEmbededCode('');
        setCountryName('');
        setCountryCode('');
        setIsBreakingNews(false);
        setSuccess('Article published');
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
      {success && <p className={styles.success}>{success}</p>}
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
            {(
              countries as { name: string; code: string }[]
            ).map((c) => (
              <option key={c.code} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>
        )}
        {type === 'News' && (
          <label className={styles.checkbox}>
            <input
              type="checkbox"
              checked={isBreakingNews}
              onChange={(e) => setIsBreakingNews(e.target.checked)}
            />
            Breaking news
          </label>
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
          {UPLOADCATEGORIES.map((c) => (
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
      <PrefetchLink href="/admin/cocktails" className={styles.button} style={{marginTop:'1rem'}}>Upload Cocktail</PrefetchLink>
      <h2 className={styles.subtitle}>Your Articles</h2>
      <ul className={styles.list}>
        {articles.map((a) => (
          <li key={a.id} className={styles.articleItem}>
            <span>{a.title}</span>
            <span className={styles.articleActions}>
              <button
                type="button"
                onClick={() => router.push(`/admin/edit/${a.id}`)}
                className={styles.button}
              >
                Edit
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (!confirm('Delete article?')) return;
                  await fetch(`${API_ROUTES.ARTICLE.DELETE}?Id=${a.id}`, {
                    method: 'DELETE',
                    credentials: 'include',
                  });
                  setArticles(articles.filter((art) => art.id !== a.id));
                }}
                className={styles.button}
              >
                Delete
              </button>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
