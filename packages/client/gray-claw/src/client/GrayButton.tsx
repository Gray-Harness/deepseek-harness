/** Sidebar foot trigger row opening the persistent Gray session (wide row / rail circle). */

import clsx from 'clsx'
import type { InjectFace, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import css from './GrayButton.module.css'

/** Registrant-private injected share: the click verb closing over ctx.sessions. */
export interface GrayClawFace {
  /** Open the fixed Gray session, creating it on first use. */
  onOpenGray(): void
}

/** Full props composed by the sidebar footer-action slot. */
export type GrayButtonProps = PropsRuntime<'sidebar.footer.action'> & InjectFace<GrayClawFace>

/** Sidebar foot trigger: full "Gray" label when wide, a mark when the rail collapses. */
export function GrayButton({ wide, onOpenGray }: GrayButtonProps) {
  return (
    <button
      type="button"
      className={clsx(css.trigger, !wide && css.rail)}
      onClick={onOpenGray}
      title="Gray"
    >
      <span className={css.mark} aria-hidden="true">G</span>
      {wide && <span className={css.label}>Gray</span>}
    </button>
  )
}
