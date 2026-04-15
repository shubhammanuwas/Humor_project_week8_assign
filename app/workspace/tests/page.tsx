import {
  CaptionLookupPanel,
  TestingPanel,
  WorkspaceHeader,
  WorkspaceStatus,
  loadWorkspaceData,
  type WorkspaceSearchParams,
} from '../workspace-console'

export const dynamic = 'force-dynamic'

export default async function WorkspaceTestsPage({
  searchParams,
}: {
  searchParams?: WorkspaceSearchParams
}) {
  const { userEmail, profile, selectedFlavor, flavors, steps, captions } =
    await loadWorkspaceData(searchParams)

  const flavorsWithSteps = flavors.filter((flavor) => {
    const flavorId = String(flavor.id)
    return steps.some((step) => String(step.humor_flavor_id ?? '') === flavorId)
  }).length
  const selectedFlavorLabel =
    flavors.find((flavor) => String(flavor.id) === selectedFlavor)?.slug ?? 'Choose a flavor'

  return (
    <main className="shell">
      <div className="page">
        <WorkspaceHeader
          userEmail={userEmail}
          profile={profile}
          flavorCount={flavors.length}
          stepCount={steps.length}
          activePath="/workspace/tests"
        />
        <WorkspaceStatus searchParams={searchParams} />

        <section className="panel stack testing-lab-hero">
          <div className="testing-lab-copy">
            <p className="eyebrow">Testing Lab</p>
            <h2 className="section-title">Run experiments and inspect outputs in one place</h2>
            <p className="muted">
              Upload a small image set, test a flavor, then review the newest captions without
              switching contexts.
            </p>
          </div>
          <div className="testing-lab-stats">
            <article className="testing-stat-card">
              <span className="testing-stat-label">Flavors available</span>
              <strong className="testing-stat-value">{flavors.length}</strong>
            </article>
            <article className="testing-stat-card">
              <span className="testing-stat-label">Ready to test</span>
              <strong className="testing-stat-value">{flavorsWithSteps}</strong>
            </article>
            <article className="testing-stat-card">
              <span className="testing-stat-label">Recent captions loaded</span>
              <strong className="testing-stat-value">{captions.length}</strong>
            </article>
            <article className="testing-stat-card">
              <span className="testing-stat-label">Current flavor</span>
              <strong className="testing-stat-value testing-stat-value-small">{selectedFlavorLabel}</strong>
            </article>
          </div>
        </section>

        <section className="testing-lab-layout">
          <div className="testing-lab-main">
            <TestingPanel flavors={flavors} selectedFlavor={selectedFlavor} />
          </div>
          <div className="testing-lab-sidebar">
            <CaptionLookupPanel
              flavors={flavors}
              selectedFlavor={selectedFlavor}
              captions={captions}
              formAction="/workspace/tests"
            />
          </div>
        </section>
      </div>
    </main>
  )
}
