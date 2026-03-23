import Link from 'next/link'
import { requireAdminPage } from '@/lib/admin/auth'
import SignOutButton from './sign-out-button'
import ThemeToggle from './theme-toggle'
import TestFlavorForm from './test-flavor-form'
import {
  createFlavor,
  createStep,
  deleteFlavor,
  deleteStep,
  moveStep,
  updateFlavor,
  updateStep,
} from './actions'

export const dynamic = 'force-dynamic'

type FlavorRow = {
  id: string | number
  slug?: string | null
  description?: string | null
  created_datetime_utc?: string | null
}

type StepRow = {
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

type LookupRow = {
  id: string | number
  name?: string | null
}

type CaptionRow = {
  id?: string | number | null
  content?: string | null
  caption?: string | null
  text?: string | null
  humor_flavor_id?: string | number | null
  created_datetime_utc?: string | null
}

function pickCaptionText(row: CaptionRow) {
  return row.content ?? row.caption ?? row.text ?? 'Untitled caption'
}

function readMessage(value?: string | string[]) {
  if (Array.isArray(value)) {
    return value[0] ?? ''
  }

  return value ?? ''
}

export default async function WorkspacePage({
  searchParams,
}: {
  searchParams?: {
    flavor?: string
    success?: string | string[]
    error?: string | string[]
  }
}) {
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
  ].filter(Boolean)

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

  const successMessage = readMessage(searchParams?.success)
  const errorMessage = readMessage(searchParams?.error)

  return (
    <main className="shell">
      <div className="page">
        <section className="hero">
          <p className="eyebrow">Admin Workspace</p>
          <div className="hero-grid">
            <div className="stack">
              <h1 className="title">Humor Flavor Prompt Chain Tool</h1>
              <p className="subtitle">
                Manage prompt-chain flavors, reorder execution steps, inspect captions by flavor,
                and run live caption tests through the existing AlmostCrackd pipeline.
              </p>
              <div className="chip-row">
                <span className="chip">Signed in: {userEmail ?? 'Unknown user'}</span>
                <span className="chip">
                  Roles: {profile?.is_superadmin ? 'superadmin ' : ''}
                  {profile?.is_matrix_admin ? 'matrix_admin' : ''}
                </span>
                <span className="chip">{flavors.length} flavors</span>
                <span className="chip">{steps.length} total steps</span>
              </div>
            </div>
            <div className="panel stack">
              <ThemeToggle />
              <SignOutButton />
            </div>
          </div>
          {successMessage ? <p className="status-ok">{successMessage}</p> : null}
          {errorMessage ? <p className="status-error">{errorMessage}</p> : null}
        </section>

        <section className="grid-3">
          <div className="panel stack">
            <h2 className="section-title">Create Humor Flavor</h2>
            <form action={createFlavor} className="stack">
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
          </div>

          <div className="panel stack">
            <h2 className="section-title">Create Humor Flavor Step</h2>
            <form action={createStep} className="stack">
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
                  Lookup tables could not be read for: {lookupErrors.join(', ')}. Numeric ids still
                  work.
                </p>
              ) : (
                <div className="chip-row">
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
          </div>

          <div className="panel stack">
            <h2 className="section-title">Read Captions By Flavor</h2>
            <form action="/workspace" className="stack">
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
            <p className="muted">
              {selectedFlavor
                ? `Showing up to 30 recent captions for flavor ${selectedFlavor}.`
                : 'Pick a flavor to inspect its generated captions.'}
            </p>
          </div>
        </section>

        <section className="grid-2">
          <div className="panel stack">
            <h2 className="section-title">Humor Flavors</h2>
            {flavors.length === 0 ? (
              <div className="empty">No humor flavors found.</div>
            ) : (
              <div className="list">
                {flavors.map((flavor) => (
                  <article key={String(flavor.id)} className="card stack">
                    <div className="card-title">
                      <div>
                        <strong>{flavor.slug ?? `Flavor ${flavor.id}`}</strong>
                        <p className="muted mono">id: {String(flavor.id)}</p>
                      </div>
                      <Link
                        href={`/workspace?flavor=${String(flavor.id)}`}
                        className="btn btn-subtle"
                      >
                        View Captions
                      </Link>
                    </div>
                    <form action={updateFlavor} className="stack">
                      <input type="hidden" name="id" value={String(flavor.id)} />
                      <label className="stack">
                        <span className="muted">Slug</span>
                        <input name="slug" defaultValue={flavor.slug ?? ''} required />
                      </label>
                      <label className="stack">
                        <span className="muted">Description</span>
                        <textarea
                          name="description"
                          defaultValue={flavor.description ?? ''}
                          required
                        />
                      </label>
                      <div className="inline-actions">
                        <button type="submit" className="btn">
                          Save Flavor
                        </button>
                      </div>
                    </form>
                    <form action={deleteFlavor}>
                      <input type="hidden" name="id" value={String(flavor.id)} />
                      <button type="submit" className="btn btn-danger">
                        Delete Flavor
                      </button>
                    </form>
                  </article>
                ))}
              </div>
            )}
          </div>

          <div className="panel stack">
            <h2 className="section-title">Flavor Steps</h2>
            {flavors.length === 0 ? (
              <div className="empty">Create a humor flavor before adding steps.</div>
            ) : (
              <div className="list">
                {flavors.map((flavor) => {
                  const flavorId = String(flavor.id)
                  const flavorSteps = stepsByFlavor.get(flavorId) ?? []

                  return (
                    <section key={flavorId} className="card stack">
                      <div className="card-title">
                        <div>
                          <strong>{flavor.slug ?? `Flavor ${flavorId}`}</strong>
                          <p className="muted">
                            {flavorSteps.length} step{flavorSteps.length === 1 ? '' : 's'}
                          </p>
                        </div>
                      </div>

                      {flavorSteps.length === 0 ? (
                        <div className="empty">No steps for this flavor yet.</div>
                      ) : (
                        <div className="list">
                          {flavorSteps.map((step, index) => (
                            <article key={String(step.id)} className="card stack">
                              <div className="card-title">
                                <div>
                                  <strong>Step {step.order_by ?? index + 1}</strong>
                                  <p className="muted mono">id: {String(step.id)}</p>
                                </div>
                                <div className="inline-actions">
                                  <form action={moveStep}>
                                    <input type="hidden" name="step_id" value={String(step.id)} />
                                    <input
                                      type="hidden"
                                      name="humor_flavor_id"
                                      value={flavorId}
                                    />
                                    <input type="hidden" name="direction" value="up" />
                                    <button
                                      type="submit"
                                      className="btn"
                                      disabled={index === 0}
                                    >
                                      Move Up
                                    </button>
                                  </form>
                                  <form action={moveStep}>
                                    <input type="hidden" name="step_id" value={String(step.id)} />
                                    <input
                                      type="hidden"
                                      name="humor_flavor_id"
                                      value={flavorId}
                                    />
                                    <input type="hidden" name="direction" value="down" />
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

                              <form action={updateStep} className="stack">
                                <input type="hidden" name="id" value={String(step.id)} />
                                <label className="stack">
                                  <span className="muted">Description</span>
                                  <textarea
                                    name="description"
                                    defaultValue={step.description ?? ''}
                                  />
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
                                <div className="inline-actions">
                                  <button type="submit" className="btn">
                                    Save Step
                                  </button>
                                </div>
                              </form>

                              <form action={deleteStep}>
                                <input type="hidden" name="id" value={String(step.id)} />
                                <button type="submit" className="btn btn-danger">
                                  Delete Step
                                </button>
                              </form>
                            </article>
                          ))}
                        </div>
                      )}
                    </section>
                  )
                })}
              </div>
            )}
          </div>
        </section>

        <section className="grid-2">
          <TestFlavorForm
            flavors={flavors.map((flavor) => ({
              id: String(flavor.id),
              slug: flavor.slug ?? `Flavor ${flavor.id}`,
            }))}
            defaultFlavorId={selectedFlavor}
          />

          <section className="panel stack">
            <div>
              <h2 className="section-title">Recent Captions</h2>
              <p className="muted">
                Reads from `captions` filtered by the selected humor flavor.
              </p>
            </div>

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
        </section>
      </div>
    </main>
  )
}
