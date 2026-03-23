import LoginButtons from './login-buttons'

export default function LoginPage({
  searchParams,
}: {
  searchParams?: { error?: string }
}) {
  const showAdminMessage = searchParams?.error === 'admin_required'

  return (
    <main className="shell">
      <div className="page">
        <section className="hero">
          <p className="eyebrow">Week 8</p>
          <div className="hero-grid">
            <div className="stack">
              <h1 className="title">Prompt Chain Tool</h1>
              <p className="subtitle">
                Sign in with Google to manage humor flavors, prompt-chain steps, and test
                caption generation against the existing AlmostCrackd API.
              </p>
            </div>
            <div className="panel stack">
              <p className="muted">
                Access is limited to users whose `profiles.is_superadmin` or
                `profiles.is_matrix_admin` flag is set to `TRUE`.
              </p>
              {showAdminMessage ? (
                <p className="status-error">
                  Your account is signed in but does not have the required admin role.
                </p>
              ) : null}
              <LoginButtons />
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
