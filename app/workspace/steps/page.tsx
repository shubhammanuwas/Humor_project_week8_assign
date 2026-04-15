import {
  CreateStepPanel,
  StepsPanel,
  WorkspaceHeader,
  WorkspaceStatus,
  loadWorkspaceData,
  type WorkspaceSearchParams,
} from '../workspace-console'

export const dynamic = 'force-dynamic'

export default async function WorkspaceStepsPage({
  searchParams,
}: {
  searchParams?: WorkspaceSearchParams
}) {
  const {
    userEmail,
    profile,
    selectedFlavor,
    flavors,
    steps,
    llmModels,
    llmInputTypes,
    llmOutputTypes,
    humorFlavorStepTypes,
    lookupErrors,
    stepsByFlavor,
  } = await loadWorkspaceData(searchParams)

  const configuredFlavors = flavors.filter(
    (flavor) => (stepsByFlavor.get(String(flavor.id)) ?? []).length > 0
  ).length
  const totalPrompts = steps.filter(
    (step) =>
      Boolean(step.llm_system_prompt?.trim()) || Boolean(step.llm_user_prompt?.trim())
  ).length
  const selectedFlavorLabel =
    flavors.find((flavor) => String(flavor.id) === selectedFlavor)?.slug ?? 'No flavor selected'

  return (
    <main className="shell">
      <div className="page">
        <WorkspaceHeader
          userEmail={userEmail}
          profile={profile}
          flavorCount={flavors.length}
          stepCount={steps.length}
          activePath="/workspace/steps"
        />
        <WorkspaceStatus searchParams={searchParams} />

        <section className="panel stack step-editor-hero">
          <div className="step-editor-copy">
            <p className="eyebrow">Step Editor</p>
            <h2 className="section-title">Build prompt chains without losing the plot</h2>
            <p className="muted">
              Create new runtime steps, compare chain structure across flavors, and jump directly to
              testing once a chain looks ready.
            </p>
          </div>
          <div className="step-editor-stats">
            <article className="step-stat-card">
              <span className="step-stat-label">Total steps</span>
              <strong className="step-stat-value">{steps.length}</strong>
            </article>
            <article className="step-stat-card">
              <span className="step-stat-label">Configured flavors</span>
              <strong className="step-stat-value">{configuredFlavors}</strong>
            </article>
            <article className="step-stat-card">
              <span className="step-stat-label">Prompt-filled steps</span>
              <strong className="step-stat-value">{totalPrompts}</strong>
            </article>
            <article className="step-stat-card">
              <span className="step-stat-label">Current focus</span>
              <strong className="step-stat-value step-stat-value-small">{selectedFlavorLabel}</strong>
            </article>
          </div>
        </section>

        <section className="step-editor-layout">
          <div className="step-editor-sidebar">
            <CreateStepPanel
              flavors={flavors}
              selectedFlavor={selectedFlavor}
              llmModels={llmModels}
              llmInputTypes={llmInputTypes}
              llmOutputTypes={llmOutputTypes}
              humorFlavorStepTypes={humorFlavorStepTypes}
              lookupErrors={lookupErrors}
              redirectTo="/workspace/steps"
            />
          </div>
          <div className="step-editor-main">
            <StepsPanel
              flavors={flavors}
              stepsByFlavor={stepsByFlavor}
              selectedFlavor={selectedFlavor}
              redirectTo="/workspace/steps"
            />
          </div>
        </section>
      </div>
    </main>
  )
}
