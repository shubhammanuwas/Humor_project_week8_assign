import Link from 'next/link'
import { requireAdminPage } from '@/lib/admin/auth'
import SignOutButton from './sign-out-button'
import ThemeToggle from './theme-toggle'
import TestFlavorForm from './test-flavor-form'
import FlavorCard from './flavor-card'
import {
  createFlavor,
  createStep,
  deleteStep,
  moveStep,
  updateStep,
} from './actions'

export type FlavorRow = {
  id: string | number
  slug?: string | null
  description?: string | null
  created_datetime_utc?: string | null
}

export type StepRow = {
  id: string | number
  humor_flavor_id?: string | number | null
  order_by?: number | null
  description?: string | null
  llm_model_id?: number | null
  llm_input_type_id?: number | null
  llm_output_type_id?: number | null
  humor_flavor_step_type_id?: number | null
  llm_temperature?: number | null
  llm_system_prompt?: string | null
  llm_user_prompt?: string | null
}

export type LookupRow = {
  id: string | number
  name?: string | null
}

export type CaptionRow = {
  id?: string | number | null
  content?: string | null
  caption?: string | null
  text?: string | null
  humor_flavor_id?: string | number | null
  created_datetime_utc?: string | null
}

export type WorkspaceSearchParams = {
  flavor?: string
  success?: string | string[]
  error?: string | string[]
}

export function pickCaptionText(row: CaptionRow) {
  return row.content ?? row.caption ?? row.text ?? 'Untitled caption'
}

export function readMessage(value?: string | string[]) {
  if (Array.isArray(value)) {
    return value[0] ?? ''
  }

  return value ?? ''
}

export async function loadWorkspaceData(searchParams?: WorkspaceSearchParams) {
  const { supabase, userEmail, profile } = await requireAdminPage()
  const selectedFlavor = searchParams?.flavor ?? ''

  const [
    flavorsResult,
    stepsResult,
    captionsResult,
    modelsResult,
    inputTypesResult,
    outputTypesResult,
    stepTypesResult,
  ] = await Promise.all([
    supabase
      .from('humor_flavors')
      .select('id, slug, description, created_datetime_utc')
      .order('slug', { ascending: true }),
    supabase
      .from('humor_flavor_steps')
      .select(
        'id, humor_flavor_id, order_by, description, llm_model_id, llm_input_type_id, llm_output_type_id, humor_flavor_step_type_id, llm_temperature, llm_system_prompt, llm_user_prompt'
      )
      .order('humor_flavor_id', { ascending: true })
      .order('order_by', { ascending: true }),
    selectedFlavor
      ? supabase
          .from('captions')
          .select('id, content, caption, text, humor_flavor_id, created_datetime_utc')
          .eq('humor_flavor_id', selectedFlavor)
          .order('created_datetime_utc', { ascending: false })
          .limit(30)
      : Promise.resolve({ data: [], error: null }),
    supabase.from('llm_models').select('id, name').order('id', { ascending: true }),
    supabase.from('llm_input_types').select('id, name').order('id', { ascending: true }),
    supabase.from('llm_output_types').select('id, name').order('id', { ascending: true }),
    supabase
      .from('humor_flavor_step_types')
      .select('id, name')
      .order('id', { ascending: true }),
  ])

  const flavors = (flavorsResult.data ?? []) as FlavorRow[]
  const steps = (stepsResult.data ?? []) as StepRow[]
  const captions = (captionsResult.data ?? []) as CaptionRow[]
  const llmModels = (modelsResult.data ?? []) as LookupRow[]
  const llmInputTypes = (inputTypesResult.data ?? []) as LookupRow[]
  const llmOutputTypes = (outputTypesResult.data ?? []) as LookupRow[]
  const humorFlavorStepTypes = (stepTypesResult.data ?? []) as LookupRow[]

  const lookupErrors = [
    modelsResult.error ? 'llm_models' : null,
    inputTypesResult.error ? 'llm_input_types' : null,
    outputTypesResult.error ? 'llm_output_types' : null,
    stepTypesResult.error ? 'humor_flavor_step_types' : null,
  ].filter((value): value is string => Boolean(value))

  const stepsByFlavor = new Map<string, StepRow[]>()
  for (const step of steps) {
    const flavorId =
      step.humor_flavor_id === null || step.humor_flavor_id === undefined
        ? 'unknown'
        : String(step.humor_flavor_id)
    const list = stepsByFlavor.get(flavorId) ?? []
    list.push(step)
    stepsByFlavor.set(flavorId, list)
  }

  return {
    userEmail,
    profile,
    selectedFlavor,
    flavors,
    steps,
    captions,
    llmModels,
    llmInputTypes,
    llmOutputTypes,
    humorFlavorStepTypes,
    lookupErrors,
    stepsByFlavor,
  }
}

export function getCompatibleFlavorIds(
  flavors: FlavorRow[],
  stepsByFlavor: Map<string, StepRow[]>
) {
  const compatible = new Set<string>()

  for (const flavor of flavors) {
    const flavorId = String(flavor.id)
    const steps = [...(stepsByFlavor.get(flavorId) ?? [])]

    if (steps.length === 0) {
      continue
    }

    const orderedSteps = steps
      .filter((step) => typeof step.order_by === 'number')
      .sort((left, right) => Number(left.order_by ?? 0) - Number(right.order_by ?? 0))

    if (orderedSteps.length !== steps.length) {
      continue
    }

    const uniqueOrders = new Set(orderedSteps.map((step) => Number(step.order_by)))
    if (uniqueOrders.size !== orderedSteps.length) {
      continue
    }

    const hasConsecutiveOrder = orderedSteps.every(
      (step, index) => Number(step.order_by) === index + 1
    )

    if (!hasConsecutiveOrder) {
      continue
    }

    const hasRequiredRuntimeFields = orderedSteps.every(
      (step) =>
        typeof step.llm_model_id === 'number' &&
        typeof step.llm_input_type_id === 'number' &&
        typeof step.llm_output_type_id === 'number' &&
        typeof step.humor_flavor_step_type_id === 'number'
    )

    if (!hasRequiredRuntimeFields) {
      continue
    }

    const lastStep = orderedSteps[orderedSteps.length - 1]
    if (lastStep.llm_output_type_id !== 2) {
      continue
    }

    compatible.add(flavorId)
  }

  return compatible
}

export function WorkspaceHeader({
  userEmail,
  profile,
  flavorCount,
  stepCount,
  activePath,
}: {
  userEmail: string | null
  profile: { is_superadmin?: boolean | null; is_matrix_admin?: boolean | null } | null
  flavorCount: number
  stepCount: number
  activePath: string
}) {
  const links = [
    { href: '/workspace', label: 'Overview' },
    { href: '/workspace/flavors', label: 'Flavors' },
    { href: '/workspace/steps', label: 'Steps' },
    { href: '/workspace/tests', label: 'Testing' },
  ]

  return (
    <section className="hero">
      <p className="eyebrow">Admin Workspace</p>
      <div className="hero-grid">
        <div className="stack">
          <h1 className="title">Humor Flavor Prompt Chain Tool</h1>
          <p className="subtitle">
            Manage prompt-chain flavors, reorder execution steps, inspect captions by flavor, and
            run live caption tests through the existing AlmostCrackd pipeline.
          </p>
          <div className="chip-row">
            <span className="chip">Signed in: {userEmail ?? 'Unknown user'}</span>
            <span className="chip">
              Roles: {profile?.is_superadmin ? 'superadmin ' : ''}
              {profile?.is_matrix_admin ? 'matrix_admin' : ''}
            </span>
            <span className="chip">{flavorCount} flavors</span>
            <span className="chip">{stepCount} total steps</span>
          </div>
        </div>
        <div className="panel stack">
          <ThemeToggle />
          <SignOutButton />
        </div>
      </div>
      <nav className="workspace-nav-grid" aria-label="Workspace sections">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`workspace-nav-link ${activePath === link.href ? 'workspace-nav-link-active' : ''}`}
          >
            {link.label}
          </Link>
        ))}
      </nav>
    </section>
  )
}

export function WorkspaceStatus({ searchParams }: { searchParams?: WorkspaceSearchParams }) {
  const successMessage = readMessage(searchParams?.success)
  const errorMessage = readMessage(searchParams?.error)

  if (!successMessage && !errorMessage) {
    return null
  }

  return (
    <section className="panel stack">
      {successMessage ? <p className="status-ok">{successMessage}</p> : null}
      {errorMessage ? <p className="status-error">{errorMessage}</p> : null}
    </section>
  )
}

export function OverviewCards() {
  const cards = [
    {
      href: '/workspace/flavors',
      title: 'Flavor Library',
      text: 'Create new humor flavors and keep flavor metadata separate from step editing.',
    },
    {
      href: '/workspace/steps',
      title: 'Step Editor',
      text: 'Reorder steps, adjust prompts, and manage chain details without the testing panels in the way.',
    },
    {
      href: '/workspace/tests',
      title: 'Caption Testing',
      text: 'Run image test sets and inspect recent captions on a page dedicated to experimentation.',
    },
  ]

  return (
    <section className="panel stack">
      <h2 className="section-title">Choose a workspace</h2>
      <div className="workspace-route-grid">
        {cards.map((card) => (
          <Link key={card.href} href={card.href} className="workspace-route-card">
            <h3>{card.title}</h3>
            <p className="muted">{card.text}</p>
            <span className="workspace-route-link">Open section</span>
          </Link>
        ))}
      </div>
    </section>
  )
}

export function CreateFlavorPanel({ redirectTo }: { redirectTo: string }) {
  return (
    <div className="panel stack flavor-create-panel">
      <div className="stack">
        <p className="eyebrow">New Flavor</p>
        <h2 className="section-title">Create Humor Flavor</h2>
        <p className="muted">
          Start with a clear slug and one-sentence premise. You can add prompts and step structure
          right after this on the Steps page.
        </p>
      </div>
      <form action={createFlavor} className="stack">
        <input type="hidden" name="redirect_to" value={redirectTo} />
        <label className="stack">
          <span className="muted">Slug</span>
          <input name="slug" placeholder="deadpan-chaos" required />
        </label>
        <label className="stack">
          <span className="muted">Description</span>
          <textarea
            name="description"
            placeholder="How this flavor should guide the prompt chain."
            required
          />
        </label>
        <button type="submit" className="btn btn-primary">
          Create Flavor
        </button>
      </form>
      <div className="flavor-create-notes">
        <div className="flavor-note-card">
          <strong>Good slugs</strong>
          <p className="muted">Short, memorable, and specific enough to distinguish tone.</p>
        </div>
        <div className="flavor-note-card">
          <strong>Next move</strong>
          <p className="muted">After creating a flavor, jump to Steps to wire the prompt chain.</p>
        </div>
      </div>
    </div>
  )
}

export function CreateStepPanel({
  flavors,
  selectedFlavor,
  llmModels,
  llmInputTypes,
  llmOutputTypes,
  humorFlavorStepTypes,
  lookupErrors,
  redirectTo,
}: {
  flavors: FlavorRow[]
  selectedFlavor: string
  llmModels: LookupRow[]
  llmInputTypes: LookupRow[]
  llmOutputTypes: LookupRow[]
  humorFlavorStepTypes: LookupRow[]
  lookupErrors: string[]
  redirectTo: string
}) {
  return (
    <div className="panel stack step-create-panel">
      <div className="stack">
        <p className="eyebrow">New Step</p>
        <h2 className="section-title">Create Humor Flavor Step</h2>
        <p className="muted">
          Set the runtime ids here, then add the prompt text that gives the chain its behavior.
        </p>
      </div>
      <form action={createStep} className="stack">
        <input type="hidden" name="redirect_to" value={redirectTo} />
        <label className="stack">
          <span className="muted">Humor flavor</span>
          <select name="humor_flavor_id" required defaultValue={selectedFlavor || ''}>
            <option value="" disabled>
              Select a flavor
            </option>
            {flavors.map((flavor) => (
              <option key={String(flavor.id)} value={String(flavor.id)}>
                {flavor.slug ?? `Flavor ${flavor.id}`}
              </option>
            ))}
          </select>
        </label>
        <label className="stack">
          <span className="muted">Description</span>
          <textarea
            name="description"
            placeholder="Describe what this step contributes to the chain."
          />
        </label>
        <div className="toolbar">
          <label className="stack">
            <span className="muted">Order</span>
            <input name="order_by" type="number" min="1" placeholder="Auto" />
          </label>
          <label className="stack">
            <span className="muted">LLM model id</span>
            <input name="llm_model_id" type="number" min="1" required />
          </label>
        </div>
        <div className="toolbar">
          <label className="stack">
            <span className="muted">LLM input type id</span>
            <input name="llm_input_type_id" type="number" min="1" required />
          </label>
          <label className="stack">
            <span className="muted">LLM output type id</span>
            <input name="llm_output_type_id" type="number" min="1" required />
          </label>
          <label className="stack">
            <span className="muted">Step type id</span>
            <input name="humor_flavor_step_type_id" type="number" min="1" required />
          </label>
        </div>
        <div className="toolbar">
          <label className="stack">
            <span className="muted">Temperature</span>
            <input name="llm_temperature" type="number" step="0.1" placeholder="Optional" />
          </label>
        </div>
        <label className="stack">
          <span className="muted">System prompt</span>
          <textarea name="llm_system_prompt" placeholder="Optional system prompt" />
        </label>
        <label className="stack">
          <span className="muted">User prompt</span>
          <textarea name="llm_user_prompt" placeholder="Optional user prompt template" />
        </label>
        {lookupErrors.length > 0 ? (
          <p className="muted">
            Lookup tables could not be read for: {lookupErrors.join(', ')}. Numeric ids still work.
          </p>
        ) : (
          <div className="step-lookup-chip-wrap">
            {llmModels.slice(0, 6).map((row) => (
              <span key={`model-${row.id}`} className="chip">
                model {row.id}: {row.name ?? 'unnamed'}
              </span>
            ))}
            {llmInputTypes.slice(0, 4).map((row) => (
              <span key={`input-${row.id}`} className="chip">
                input {row.id}: {row.name ?? 'unnamed'}
              </span>
            ))}
            {llmOutputTypes.slice(0, 4).map((row) => (
              <span key={`output-${row.id}`} className="chip">
                output {row.id}: {row.name ?? 'unnamed'}
              </span>
            ))}
            {humorFlavorStepTypes.slice(0, 4).map((row) => (
              <span key={`step-type-${row.id}`} className="chip">
                step type {row.id}: {row.name ?? 'unnamed'}
              </span>
            ))}
          </div>
        )}
        <button type="submit" className="btn btn-primary">
          Create Step
        </button>
      </form>
      <div className="step-create-hints">
        <div className="step-hint-card">
          <strong>Typical flow</strong>
          <p className="muted">Recognition, description, then caption generation usually works best.</p>
        </div>
        <div className="step-hint-card">
          <strong>Fast recovery</strong>
          <p className="muted">If testing fails, compare your numeric ids against a working flavor.</p>
        </div>
      </div>
    </div>
  )
}

export function FlavorsPanel({
  flavors,
  stepsByFlavor,
  selectedFlavor,
  redirectTo,
}: {
  flavors: FlavorRow[]
  stepsByFlavor: Map<string, StepRow[]>
  selectedFlavor?: string
  redirectTo: string
}) {
  return (
    <section className="panel stack">
      <div className="card-title">
        <div>
          <h2 className="section-title">Humor Flavors</h2>
          <p className="muted">Browse, edit, and jump straight into testing or step editing.</p>
        </div>
        <span className="chip">{flavors.length} total</span>
      </div>
      {flavors.length === 0 ? (
        <div className="empty">No humor flavors found.</div>
      ) : (
        <div className="flavor-library-grid">
          {flavors.map((flavor) => (
            <FlavorCard
              key={String(flavor.id)}
              id={String(flavor.id)}
              slug={flavor.slug ?? `Flavor ${flavor.id}`}
              description={flavor.description ?? ''}
              createdAt={flavor.created_datetime_utc ?? 'unknown'}
              stepCount={(stepsByFlavor.get(String(flavor.id)) ?? []).length}
              isSelected={selectedFlavor === String(flavor.id)}
              redirectTo={redirectTo}
            />
          ))}
        </div>
      )}
    </section>
  )
}

export function StepsPanel({
  flavors,
  stepsByFlavor,
  selectedFlavor,
  redirectTo,
}: {
  flavors: FlavorRow[]
  stepsByFlavor: Map<string, StepRow[]>
  selectedFlavor?: string
  redirectTo: string
}) {
  const orderedFlavors = [...flavors].sort((left, right) => {
    const leftSelected = String(left.id) === selectedFlavor
    const rightSelected = String(right.id) === selectedFlavor

    if (leftSelected === rightSelected) {
      return String(left.slug ?? left.id).localeCompare(String(right.slug ?? right.id))
    }

    return leftSelected ? -1 : 1
  })

  return (
    <section className="panel stack">
      <div className="card-title">
        <div>
          <h2 className="section-title">Flavor Steps</h2>
          <p className="muted">Inspect full chains, adjust prompts, and keep step order under control.</p>
        </div>
        <span className="chip">{flavors.length} flavors</span>
      </div>
      {flavors.length === 0 ? (
        <div className="empty">Create a humor flavor before adding steps.</div>
      ) : (
        <div className="step-library-grid">
          {orderedFlavors.map((flavor, flavorIndex) => {
            const flavorId = String(flavor.id)
            const flavorSteps = stepsByFlavor.get(flavorId) ?? []
            const isSelected = selectedFlavor === flavorId
            const defaultOpen = isSelected || (!selectedFlavor && flavorIndex === 0)

            return (
              <details
                key={flavorId}
                open={defaultOpen}
                className={`card step-flavor-card step-flavor-details ${isSelected ? 'step-flavor-card-active' : ''}`}
              >
                <summary className="step-flavor-summary">
                  <div className="stack">
                    <div className="step-flavor-topline">
                      <strong>{flavor.slug ?? `Flavor ${flavorId}`}</strong>
                      <span className="chip chip-soft">
                        {flavorSteps.length} step{flavorSteps.length === 1 ? '' : 's'}
                      </span>
                    </div>
                    <p className="muted mono">id: {flavorId}</p>
                    <p className="muted">
                      {flavor.description?.trim() || 'No flavor description yet.'}
                    </p>
                  </div>
                  <div className="step-flavor-summary-side">
                    {isSelected ? <span className="chip">Selected</span> : null}
                    <span className="step-summary-hint" aria-hidden="true" />
                  </div>
                </summary>

                <div className="step-flavor-body stack">
                  <div className="inline-actions">
                    <Link href={`/workspace/tests?flavor=${flavorId}`} className="btn btn-subtle">
                      Test This Flavor
                    </Link>
                    <Link href={`/workspace/flavors?flavor=${flavorId}`} className="btn">
                      Edit Flavor Info
                    </Link>
                  </div>

                  {flavorSteps.length === 0 ? (
                    <div className="empty">No steps for this flavor yet.</div>
                  ) : (
                    <div className="list">
                      {flavorSteps.map((step, index) => (
                        <article key={String(step.id)} className="card stack step-card">
                          <div className="card-title">
                            <div className="stack">
                              <div className="step-card-topline">
                                <strong>Step {step.order_by ?? index + 1}</strong>
                                <span className="chip chip-soft">
                                  model {step.llm_model_id ?? 'n/a'}
                                </span>
                              </div>
                              <p className="muted mono">id: {String(step.id)}</p>
                            </div>
                            <div className="inline-actions">
                              <form action={moveStep}>
                                <input type="hidden" name="step_id" value={String(step.id)} />
                                <input type="hidden" name="humor_flavor_id" value={flavorId} />
                                <input type="hidden" name="direction" value="up" />
                                <input type="hidden" name="redirect_to" value={redirectTo} />
                                <button type="submit" className="btn" disabled={index === 0}>
                                  Move Up
                                </button>
                              </form>
                              <form action={moveStep}>
                                <input type="hidden" name="step_id" value={String(step.id)} />
                                <input type="hidden" name="humor_flavor_id" value={flavorId} />
                                <input type="hidden" name="direction" value="down" />
                                <input type="hidden" name="redirect_to" value={redirectTo} />
                                <button
                                  type="submit"
                                  className="btn"
                                  disabled={index === flavorSteps.length - 1}
                                >
                                  Move Down
                                </button>
                              </form>
                            </div>
                          </div>
                          <div className="step-chip-row">
                            <span className="chip chip-soft">input {step.llm_input_type_id ?? 'n/a'}</span>
                            <span className="chip chip-soft">output {step.llm_output_type_id ?? 'n/a'}</span>
                            <span className="chip chip-soft">
                              type {step.humor_flavor_step_type_id ?? 'n/a'}
                            </span>
                            <span className="chip chip-soft">
                              temp {step.llm_temperature ?? 'default'}
                            </span>
                          </div>

                          <form action={updateStep} className="stack">
                            <input type="hidden" name="id" value={String(step.id)} />
                            <input type="hidden" name="redirect_to" value={redirectTo} />
                            <label className="stack">
                              <span className="muted">Description</span>
                              <textarea name="description" defaultValue={step.description ?? ''} />
                            </label>
                            <div className="toolbar">
                              <label className="stack">
                                <span className="muted">Order</span>
                                <input
                                  name="order_by"
                                  type="number"
                                  min="1"
                                  defaultValue={step.order_by ?? index + 1}
                                  required
                                />
                              </label>
                              <label className="stack">
                                <span className="muted">LLM model id</span>
                                <input
                                  name="llm_model_id"
                                  type="number"
                                  min="1"
                                  defaultValue={step.llm_model_id ?? ''}
                                  required
                                />
                              </label>
                            </div>
                            <div className="toolbar">
                              <label className="stack">
                                <span className="muted">LLM input type id</span>
                                <input
                                  name="llm_input_type_id"
                                  type="number"
                                  min="1"
                                  defaultValue={step.llm_input_type_id ?? ''}
                                  required
                                />
                              </label>
                              <label className="stack">
                                <span className="muted">LLM output type id</span>
                                <input
                                  name="llm_output_type_id"
                                  type="number"
                                  min="1"
                                  defaultValue={step.llm_output_type_id ?? ''}
                                  required
                                />
                              </label>
                              <label className="stack">
                                <span className="muted">Step type id</span>
                                <input
                                  name="humor_flavor_step_type_id"
                                  type="number"
                                  min="1"
                                  defaultValue={step.humor_flavor_step_type_id ?? ''}
                                  required
                                />
                              </label>
                            </div>
                            <div className="toolbar">
                              <label className="stack">
                                <span className="muted">Temperature</span>
                                <input
                                  name="llm_temperature"
                                  type="number"
                                  step="0.1"
                                  defaultValue={step.llm_temperature ?? ''}
                                />
                              </label>
                            </div>
                            <div className="step-prompt-grid">
                              <label className="stack">
                                <span className="muted">System prompt</span>
                                <textarea
                                  name="llm_system_prompt"
                                  defaultValue={step.llm_system_prompt ?? ''}
                                />
                              </label>
                              <label className="stack">
                                <span className="muted">User prompt</span>
                                <textarea
                                  name="llm_user_prompt"
                                  defaultValue={step.llm_user_prompt ?? ''}
                                />
                              </label>
                            </div>
                            <div className="inline-actions">
                              <button type="submit" className="btn">
                                Save Step
                              </button>
                            </div>
                          </form>

                          <form action={deleteStep}>
                            <input type="hidden" name="id" value={String(step.id)} />
                            <input type="hidden" name="redirect_to" value={redirectTo} />
                            <button type="submit" className="btn btn-danger">
                              Delete Step
                            </button>
                          </form>
                        </article>
                      ))}
                    </div>
                  )}
                </div>
              </details>
            )
          })}
        </div>
      )}
    </section>
  )
}

export function TestingPanel({
  flavors,
  selectedFlavor,
  excludedFlavorCount = 0,
}: {
  flavors: FlavorRow[]
  selectedFlavor: string
  excludedFlavorCount?: number
}) {
  return (
    <TestFlavorForm
      flavors={flavors.map((flavor) => ({
        id: String(flavor.id),
        slug: flavor.slug ?? `Flavor ${flavor.id}`,
      }))}
      defaultFlavorId={selectedFlavor}
      excludedFlavorCount={excludedFlavorCount}
    />
  )
}

export function CaptionLookupPanel({
  flavors,
  selectedFlavor,
  captions,
  formAction = '/workspace/tests',
}: {
  flavors: FlavorRow[]
  selectedFlavor: string
  captions: CaptionRow[]
  formAction?: string
}) {
  return (
    <section className="panel stack">
      <div className="stack">
        <h2 className="section-title">Recent Captions</h2>
        <p className="muted">Reads from `captions` filtered by the selected humor flavor.</p>
      </div>

      <form action={formAction} className="stack">
        <label className="stack">
          <span className="muted">Humor flavor</span>
          <select name="flavor" defaultValue={selectedFlavor}>
            <option value="">Choose a flavor</option>
            {flavors.map((flavor) => (
              <option key={String(flavor.id)} value={String(flavor.id)}>
                {flavor.slug ?? `Flavor ${flavor.id}`}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className="btn btn-subtle">
          Load Captions
        </button>
      </form>

      {selectedFlavor ? (
        <div className="caption-lookup-summary">
          <span className="chip chip-soft">Flavor id {selectedFlavor}</span>
          <span className="chip">{captions.length} recent caption{captions.length === 1 ? '' : 's'}</span>
        </div>
      ) : null}

      {selectedFlavor ? (
        captions.length > 0 ? (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Caption</th>
                  <th>Created</th>
                  <th>ID</th>
                </tr>
              </thead>
              <tbody>
                {captions.map((caption) => (
                  <tr key={String(caption.id ?? pickCaptionText(caption))}>
                    <td>{pickCaptionText(caption)}</td>
                    <td className="mono">{caption.created_datetime_utc ?? 'Unknown'}</td>
                    <td className="mono">{caption.id ? String(caption.id) : 'n/a'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty">No captions found for that flavor yet.</div>
        )
      ) : (
        <div className="empty">Select a humor flavor above to load recent captions.</div>
      )}
    </section>
  )
}
