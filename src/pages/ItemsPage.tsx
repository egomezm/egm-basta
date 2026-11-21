import { useState, type FormEvent } from 'react'
import { useItems } from '../features/items/ItemsContext'
import styles from './ItemsPage.module.css'

export default function ItemsPage() {
  const { items, loading, error, add, remove } = useItems()
  const [title, setTitle] = useState('')
  const [formError, setFormError] = useState<string | null>(null)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    try {
      await add(title.trim())
      setTitle('')
      setFormError(null)
    } catch (err) {
      setFormError((err as Error).message)
    }
  }

  return (
    <section>
      <h1>Items</h1>
      <form onSubmit={onSubmit} className={styles.form}>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="New item" />
        <button type="submit">Add</button>
      </form>
      {formError && <p className={styles.error}>{formError}</p>}
      {loading && <p>Loading…</p>}
      {error && <p className={styles.error}>{error}</p>}
      <ul className={styles.list}>
        {items.map((i) => (
          <li key={i.id}>
            {i.title}
            <button onClick={() => remove(i.id).catch((e: Error) => setFormError(e.message))}>
              Delete
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
