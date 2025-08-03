'use client';
import { useState, FormEvent, useTransition } from 'react';
import Link from 'next/link';
import { API_ROUTES } from '@/lib/api';
import styles from '../dashboard/dashboard.module.css';

interface IngredientInput {
  name: string;
  quantity: string;
}

export default function CocktailDashboardClient() {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [ingredients, setIngredients] = useState<IngredientInput[]>([
    { name: '', quantity: '' },
  ]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const addIngredient = () => {
    setIngredients([...ingredients, { name: '', quantity: '' }]);
  };

  const updateIngredient = (index: number, field: keyof IngredientInput, value: string) => {
    const copy = [...ingredients];
    copy[index][field] = value;
    setIngredients(copy);
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      try {
        const body = {
          name,
          description,
          ingredients,
        };
        const res = await fetch(API_ROUTES.COCKTAIL.CREATE, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.message || 'Failed to publish');
        }
        setName('');
        setDescription('');
        setIngredients([{ name: '', quantity: '' }]);
        setSuccess('Cocktail saved');
      } catch (err) {
        if (err instanceof Error) setError(err.message);
        else setError('Failed to publish');
      }
    });
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Cocktail Manager</h1>
      <Link href="/admin/dashboard" className={styles.button}>
        Back to Dashboard
      </Link>
      {error && <p className={styles.error}>{error}</p>}
      {success && <p className={styles.success}>{success}</p>}
      <form onSubmit={handleSubmit} className={styles.form}>
        <input
          type="text"
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={styles.input}
          required
        />
        <textarea
          placeholder="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className={styles.textarea}
          required
        />
        <div>
          {ingredients.map((ing, i) => (
            <div key={i} className={styles.form} style={{ marginBottom: '0.5rem' }}>
              <input
                type="text"
                placeholder="Ingredient"
                value={ing.name}
                onChange={(e) => updateIngredient(i, 'name', e.target.value)}
                className={styles.input}
                required
              />
              <input
                type="text"
                placeholder="Quantity"
                value={ing.quantity}
                onChange={(e) => updateIngredient(i, 'quantity', e.target.value)}
                className={styles.input}
                required
              />
            </div>
          ))}
          <button type="button" onClick={addIngredient} className={styles.button}>
            Add Ingredient
          </button>
        </div>
        <button type="submit" disabled={isPending} className={styles.button}>
          {isPending ? 'Saving...' : 'Save'}
        </button>
      </form>
    </div>
  );
}
