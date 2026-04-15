import {
  CreateFlavorPanel,
  FlavorsPanel,
  WorkspaceHeader,
  WorkspaceStatus,
  loadWorkspaceData,
  type WorkspaceSearchParams,
} from '../workspace-console'

export const dynamic = 'force-dynamic'

export default async function WorkspaceFlavorsPage({
  searchParams,
}: {
  searchParams?: WorkspaceSearchParams
}) {
  const { userEmail, profile, selectedFlavor, flavors, steps, stepsByFlavor } =
    await loadWorkspaceData(searchParams)

  const flavorsWithSteps = flavors.filter(
    (flavor) => (stepsByFlavor.get(String(flavor.id)) ?? []).length > 0
  ).length
  const emptyFlavors = flavors.length - flavorsWithSteps
  const selectedFlavorRow = flavors.find((flavor) => String(flavor.id) === selectedFlavor) ?? null

  return (
    <main className="shell">
      <div className="page">
        <WorkspaceHeader
          userEmail={userEmail}
          profile={profile}
          flavorCount={flavors.length}
          stepCount={steps.length}
          activePath="/workspace/flavors"
        />
        <WorkspaceStatus searchParams={searchParams} />

        <section className="panel stack flavor-library-hero">
          <div className="flavor-library-copy">
            <p className="eyebrow">Flavor Library</p>
            <h2 className="section-title">Keep your prompt styles easy to scan</h2>
            <p className="muted">
              This page is now tuned for flavor management only: define tone, compare what already
              exists, and jump into editing or testing without digging through every step record.
            </p>
          </div>

          <div className="flavor-library-stats">
            <article className="flavor-stat-card">
              <span className="flavor-stat-label">Total flavors</span>
              <strong className="flavor-stat-value">{flavors.length}</strong>
            </article>
            <article className="flavor-stat-card">
              <span className="flavor-stat-label">Ready for testing</span>
              <strong className="flavor-stat-value">{flavorsWithSteps}</strong>
            </article>
            <article className="flavor-stat-card">
              <span className="flavor-stat-label">Need step setup</span>
              <strong className="flavor-stat-value">{emptyFlavors}</strong>
            </article>
            <article className="flavor-stat-card">
              <span className="flavor-stat-label">Current selection</span>
              <strong className="flavor-stat-value flavor-stat-value-small">
                {selectedFlavorRow?.slug ?? 'None'}
              </strong>
            </article>
          </div>
        </section>

        <section className="flavor-library-layout">
          <div className="flavor-library-sidebar">
            <CreateFlavorPanel redirectTo="/workspace/flavors" />
          </div>
          <div className="flavor-library-main">
            <FlavorsPanel
              flavors={flavors}
              stepsByFlavor={stepsByFlavor}
              selectedFlavor={selectedFlavor}
              redirectTo="/workspace/flavors"
            />
          </div>
        </section>
      </div>
    </main>
  )
}
