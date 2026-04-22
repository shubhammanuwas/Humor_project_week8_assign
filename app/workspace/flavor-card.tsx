'use client'

import Link from 'next/link'
import { useState } from 'react'
import { deleteFlavor, updateFlavor } from './actions'

type FlavorCardProps = {
  id: string
  slug: string
  description: string
  createdAt: string
  stepCount: number
  isSelected: boolean
  redirectTo: string
}

export default function FlavorCard({
  id,
  slug,
  description,
  createdAt,
  stepCount,
  isSelected,
  redirectTo,
}: FlavorCardProps) {
  const [isEditing, setIsEditing] = useState(false)

  return (
    <article className={`card stack flavor-card ${isSelected ? 'flavor-card-active' : ''}`}>
      <div className="card-title flavor-card-header">
        <div className="stack">
          <div className="flavor-card-topline">
            <strong>{slug}</strong>
            <span className="chip chip-soft">
              {stepCount} step{stepCount === 1 ? '' : 's'}
            </span>
          </div>
          <p className="muted mono">id: {id}</p>
          <p className="flavor-description">
            {description.trim() || 'No description yet. Add one so the intent is obvious.'}
          </p>
        </div>
      </div>

      <div className="flavor-meta-row">
        <span className="flavor-meta-pill">Created {createdAt}</span>
        {isSelected ? <span className="flavor-meta-pill flavor-meta-pill-active">Active selection</span> : null}
      </div>

      <div className="flavor-action-grid">
        <button type="button" className="btn" onClick={() => setIsEditing((current) => !current)}>
          {isEditing ? 'Cancel Edit' : 'Edit Flavor'}
        </button>
        <Link href={`/workspace/steps?flavor=${id}`} className="btn btn-subtle">
          Edit Steps
        </Link>
        <Link href={`/workspace/tests?flavor=${id}`} className="btn btn-subtle">
          Test Flavor
        </Link>
      </div>

      {isEditing ? (
        <form action={updateFlavor} className="stack">
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="redirect_to" value={redirectTo} />
          <label className="stack">
            <span className="muted">Slug</span>
            <input name="slug" defaultValue={slug} required />
          </label>
          <label className="stack">
            <span className="muted">Description</span>
            <textarea name="description" defaultValue={description} required />
          </label>
          <div className="inline-actions">
            <button type="submit" className="btn btn-primary">
              Save Flavor
            </button>
          </div>
        </form>
      ) : null}

      {isEditing ? (
        <form action={deleteFlavor}>
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="redirect_to" value={redirectTo} />
          <button type="submit" className="btn btn-danger">
            Delete Flavor
          </button>
        </form>
      ) : null}
    </article>
  )
}
