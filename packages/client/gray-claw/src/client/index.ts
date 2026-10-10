/**
 * Gray session entry, browser half: a sidebar foot trigger registered into
 * the sidebar shell's `sidebar.footer.action` list slot. Clicking opens the
 * fixed-id persistent Gray session — an ordinary host session, so the
 * standard conversation UI carries the chat/tool/memory surface and this
 * plugin renders one button. Export discipline: packages/client/AGENTS.md.
 */
import type { Context } from '@deepseek-ai/cordis'
import type { ISessions } from '@deepseek-ai/dsh-api-session-controller/client'
import type { IWorkspaces, WorkspaceId } from '@deepseek-ai/dsh-api-workspace-controller/client'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
// Type-only: pulls the sidebar plugin's SlotMap merge ('sidebar.footer.action').
import type {} from '@deepseek-ai/dsh-client-ui-sidebar/client'
// Type-only: pulls the SlotRegistry service merge (ctx.slots).
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type { GrayClawFace } from './GrayButton.tsx'
import { GrayButton } from './GrayButton.tsx'

export type { GrayClawFace } from './GrayButton.tsx'

declare module '@deepseek-ai/dsh-api-session-controller/client' {
  interface SessionReferenceSourceMap {
    /** The Gray trigger's create-and-title work on the fixed persistent session. */
    grayClaw: unknown
  }
}

/** Fixed id of the persistent Gray session — stable across reloads. */
const GRAY_SESSION_ID = 'gray-claw-home' as SessionId
/** Durable title pinning the session in the list (survives auto-titling). */
const GRAY_SESSION_TITLE = 'Gray 主会话'
/**
 * Home workspace the Gray session belongs to — the OpenClaw home, so the
 * session surfaces under the same root the KimiClaw main session lived in.
 * Membership matters: a session no workspace accounts renders the inert
 * hero ("choose a workspace") instead of a conversation.
 */
const GRAY_WORKSPACE_PATH = 'C:\\Users\\22414\\.kimi_openclaw\\workspace'

/**
 * The slice of the Workspace UI's navigation service this trigger consumes.
 * The service is named on the client root context by its owner but not
 * declared there, so a consumer narrows the lookup instead of importing the
 * owning package's symbol (`packages/client/AGENTS.md` export discipline).
 */
interface GrayNavigation {
  /**
   * Select one Session and show its Conversation.
   * @param target - Session identity to display.
   */
  openSession(target: SessionId): void
}

/** Required services: the slot registry, both controller domains, and navigation. */
export const inject = ['slots', 'sessions', 'workspaces', 'uiWorkspace']

/**
 * Client plugin body: register the Gray trigger into the sidebar foot. The
 * click verb closes over ctx in the apply world; the component sees only the
 * owner column state and the injected callback.
 * @param ctx - client root context.
 */
export function apply(ctx: Context): void {
  const sessions: ISessions = ctx.sessions
  const workspaces: IWorkspaces = ctx.workspaces
  const navigation = ctx.get('uiWorkspace') as unknown as GrayNavigation

  /**
   * Write the durable title onto the fixed session.
   * @param id - target Session.
   * @returns completion; a refused rename rejects.
   */
  const pinTitle = (id: SessionId): Promise<void> => sessions.using(
    id,
    { source: 'grayClaw' },
    async (reference) => {
      const result = await reference.binding.session.rename(GRAY_SESSION_TITLE)
      if (!result.ok) throw new Error(result.error.message)
    },
  )

  /** Resolve the home workspace, registering it when the registry is ready but lacks it. */
  const ensureHomeWorkspace = async (): Promise<WorkspaceId | undefined> => {
    const snapshot = workspaces.list.getSnapshot()
    const found = snapshot.items.find(item => item.path === GRAY_WORKSPACE_PATH)
    if (found !== undefined) return found.workspaceId
    if (snapshot.phase !== 'ready') return undefined
    return (await workspaces.create({ path: GRAY_WORKSPACE_PATH })).workspaceId
  }

  const openGray = (): void => {
    try {
      const existing = sessions.list.getSnapshot().byId[GRAY_SESSION_ID]
      if (existing !== undefined) {
        // Sessions created before the title pin existed stay blank — pin on open.
        if (existing.title === undefined) {
          void pinTitle(GRAY_SESSION_ID).catch((error: unknown) => {
            console.warn('[gray-claw] rename failed:', error)
          })
        }
        navigation.openSession(GRAY_SESSION_ID)
        return
      }
      void ensureHomeWorkspace()
        .then(async (workspaceId) => {
          const created = await sessions.create(
            workspaceId === undefined
              ? { sessionId: GRAY_SESSION_ID }
              : { sessionId: GRAY_SESSION_ID, workspaceId },
          )
          // Pin a durable title so the opened session is unmistakable in the list.
          await pinTitle(created).catch((error: unknown) => {
            console.warn('[gray-claw] rename failed:', error)
          })
          navigation.openSession(created)
        })
        .catch((error: unknown) => { console.error('[gray-claw] session create failed:', error) })
    } catch (error) {
      console.error('[gray-claw] openGray failed:', error)
    }
  }

  ctx.slots.inject('sidebar.footer.action', () => ctx.slots.register({
    name: 'sidebar.footer.action',
    id: 'gray-claw-entry',
    order: 50,
    inject: (): GrayClawFace => ({ onOpenGray: openGray }),
  }, GrayButton))
}
