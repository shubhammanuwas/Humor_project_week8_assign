import {
  CaptionLookupPanel,
  TestingPanel,
  WorkspaceHeader,
  WorkspaceStatus,
  getCompatibleFlavorIds,
  loadWorkspaceData,
  type WorkspaceSearchParams,
} from '../workspace-console'

export const dynamic = 'force-dynamic'

export default async function WorkspaceTestsPage({
  searchParams,
}: {
  searchParams?: WorkspaceSearchParams
}) {
  const { userEmail, profile, selectedFlavor, flavors, steps, captions, stepsByFlavor } =
    await loadWorkspaceData(searchParams)

  const compatibleFlavorIds = getCompatibleFlavorIds(flavors, stepsByFlavor)
  const compatibleFlavors = flavors.filter((flavor) => compatibleFlavorIds.has(String(flavor.id)))
  const excludedFlavorCount = flavors.length - compatibleFlavors.length
  const selectedFlavorIsCompatible = compatibleFlavorIds.has(selectedFlavor)
  const effectiveSelectedFlavor = selectedFlavorIsCompatible
    ? selectedFlavor
    : compatibleFlavors[0]
      ? String(compatibleFlavors[0].id)
      : ''

  const selectedFlavorLabel =
    compatibleFlavors.find((flavor) => String(flavor.id) === effectiveSelectedFlavor)?.slug ??
    'Choose a flavor'

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
              <strong className="testing-stat-value">{compatibleFlavors.length}</strong>
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
            <TestingPanel
              flavors={compatibleFlavors}
              selectedFlavor={effectiveSelectedFlavor}
              excludedFlavorCount={excludedFlavorCount}
            />
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
