import {
  OverviewCards,
  WorkspaceHeader,
  WorkspaceStatus,
  loadWorkspaceData,
  type WorkspaceSearchParams,
} from './workspace-console'

export const dynamic = 'force-dynamic'

export default async function WorkspacePage({
  searchParams,
}: {
  searchParams?: WorkspaceSearchParams
}) {
  const { userEmail, profile, flavors, steps } = await loadWorkspaceData(searchParams)

  return (
    <main className="shell">
      <div className="page">
        <WorkspaceHeader
          userEmail={userEmail}
          profile={profile}
          flavorCount={flavors.length}
          stepCount={steps.length}
          activePath="/workspace"
        />
        <WorkspaceStatus searchParams={searchParams} />

        <section className="panel stack">
          <h2 className="section-title">A cleaner workspace</h2>
          <p className="muted">
            This tool is now organized by task. Keep flavor metadata on the flavor page, edit chain
            steps on the step page, and use the testing page just for experiments and caption
            lookup.
          </p>
        </section>

        <OverviewCards />
      </div>
    </main>
  )
}
