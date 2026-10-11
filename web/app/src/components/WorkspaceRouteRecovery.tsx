import { Component, useLayoutEffect, useRef, type ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { BottomNav } from './BottomNav'
import { PressableButton } from './PressableButton'
import { AppShell, PageHeader, Surface } from './system'

function RouteDownloadRecovery() {
  const header = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    // Valid Settings deep links normally own focus in their loaded page. If
    // loading fails, this screen must provide that destination itself.
    const heading = header.current?.querySelector('h1')
    if (heading) {
      heading.tabIndex = -1
      heading.focus({ preventScroll: true })
    }
  }, [])
  return <AppShell screen="k-page" nav={<BottomNav />}>
    <div ref={header}><PageHeader title="Couldn’t open this screen" eyebrow="Try again" avoid /></div>
    <main className="app-main k-page-main" data-mascot-avoid>
      <Surface variant="outlined">
        <p role="alert">Check your connection, then reload this screen to try again.</p>
        <p>Your saved Poiem data stays on this device.</p>
        <PressableButton label="Reload this screen" fullWidth onClick={() => window.location.reload()} />
        <p><Link className="back-link" to="/">Return to Today</Link></p>
      </Surface>
    </main>
  </AppShell>
}

class RouteRecoveryBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  render() {
    // Do not expose an import URL, provider detail or raw exception. A document
    // reload also clears a rejected React.lazy promise and refreshes old assets.
    return this.state.failed ? <RouteDownloadRecovery /> : this.props.children
  }
}

export function WorkspaceRouteRecovery({ children }: { children: ReactNode }) {
  const { pathname } = useLocation()
  // A usable route can be opened after returning from the failed screen.
  return <RouteRecoveryBoundary key={pathname}>{children}</RouteRecoveryBoundary>
}
