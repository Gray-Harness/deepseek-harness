/**
 * Session-bound sidebar navigation.
 *
 * A `sidebar.panellist` row belongs to this shell: the shell owns its button,
 * label, and click. That is the right shape for a row that selects a `main`
 * panel — but a row that stands for a Session (an assistant, a fixed working
 * context) has no panel to select. What opens it is the Session Controller's
 * navigation, and the click is not the registrant's to handle.
 *
 * This service is how such a registrant says "this id opens that Session"
 * without the shell learning any feature: `bind` claims the id, `setSession`
 * publishes the target (resolved once, repointed on rotation, so the row keeps
 * its place in the nav list either way), and the shell's click dispatcher
 * prefers the binding over `layout.selectPanel`.
 *
 * A bound row highlights off the Session's `mainView` retention instead of
 * `panelInfo.activePanelId` — the same "what the centre shows" signal
 * ui-workspace itself reads (see its `tree.ts`), because opening a Session
 * clears the active panel rather than setting one.
 */
import { createSnapshotStore, type ObservableSnapshot } from '@deepseek-ai/dsh-client-store'
import type { SessionId } from '@deepseek-ai/dsh-session/types'

declare module '@deepseek-ai/cordis' {
  interface Context {
    /**
     * Session-bound nav rows, provided by this sidebar's own `apply`. A
     * registrant claims a `sidebar.panellist` id whose click should open a
     * Session instead of selecting a `main` panel.
     */
    navSessions: NavSessions
  }
}

/** The open verb a bound row's click runs. */
export interface NavSessionBinding {
  /**
   * Open the row's Session, creating it on first use. A rejection is reported
   * through the service's own warning channel rather than thrown into the
   * shell's click handler.
   */
  open(): void | Promise<void>
}

/** Handle returned by {@link NavSessions.bind}. */
export interface NavSessionHandle {
  /** Publish the resolved target; `undefined` while it is still unknown. */
  setSession(sessionId: SessionId | undefined): void
  /** Drop the binding and its nav-row metadata. */
  dispose(): void
}

/** Live `id -> target Session` map; a present key marks the id as session-bound. */
export type NavSessionBindings = Readonly<Record<string, SessionId | undefined>>

/**
 * Session-bound nav rows, as consumed by the shell's row dispatcher and by the
 * registrant that claims an id.
 */
export interface NavSessions {
  /**
   * Bind one panellist id to a Session. Binding an id twice replaces the
   * earlier binding (last registrant wins, matching the slot ledger's own
   * shadowing).
   * @param id - the `sidebar.panellist` id this binding governs.
   * @param binding - the open verb for that id's click.
   * @returns the handle publishing the target and releasing the binding.
   */
  bind(id: string, binding: NavSessionBinding): NavSessionHandle
  /** Whether an id is session-bound. The click path's imperative read. */
  has(id: string): boolean
  /** Run the bound open verb; a no-op for an unbound id. */
  open(id: string): void
  /** Reactive map for the shell's row rendering (key presence = bound). */
  readonly bound: ObservableSnapshot<NavSessionBindings>
}

/** Reporter for a rejected open verb; the shell keeps its click handler total. */
export interface NavSessionsLog {
  warn(...args: unknown[]): void
}

/**
 * Create the nav-session registry for one sidebar instance.
 * @param log - warning sink for rejected open verbs.
 * @returns the registry, backed by one snapshot store for the shell's rows.
 */
export function createNavSessions(log: NavSessionsLog): NavSessions {
  const bindings = new Map<string, { binding: NavSessionBinding; sessionId: SessionId | undefined }>()
  const store = createSnapshotStore<NavSessionBindings>({})

  const publish = (): void => {
    const next: Record<string, SessionId | undefined> = {}
    for (const [id, entry] of bindings) next[id] = entry.sessionId
    store.set(next)
  }

  return {
    bind(id, binding) {
      const entry: { binding: NavSessionBinding; sessionId: SessionId | undefined } = { binding, sessionId: undefined }
      bindings.set(id, entry)
      publish()
      return {
        setSession(sessionId) {
          // A stale handle (its id rebound to another registrant) must not
          // overwrite the live binding's target.
          if (bindings.get(id) !== entry) return
          entry.sessionId = sessionId
          publish()
        },
        dispose() {
          if (bindings.get(id) !== entry) return
          bindings.delete(id)
          publish()
        },
      }
    },
    has: id => bindings.has(id),
    open(id) {
      const entry = bindings.get(id)
      if (entry === undefined) return
      try {
        const result = entry.binding.open()
        if (result instanceof Promise) {
          result.catch((error: unknown) => { log.warn(`session row "${id}" failed to open:`, error) })
        }
      } catch (error: unknown) {
        log.warn(`session row "${id}" failed to open:`, error)
      }
    },
    bound: store,
  }
}
