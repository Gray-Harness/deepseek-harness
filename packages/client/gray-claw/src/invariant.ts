/**
 * Package-owned invariant companion for `@deepseek-ai/dsh-client-gray-claw`.
 * @module @deepseek-ai/dsh-client-gray-claw/invariant
 */

import type { Context } from '@deepseek-ai/cordis'
import type { InvariantInstaller } from '@deepseek-ai/dsh-invariants'

const PACKAGE_NAME = '@deepseek-ai/dsh-client-gray-claw'

/** Cordis companion plugin name. */
export const name = 'client-gray-claw-invariant'
/** Service required before the companion can reserve package ownership. */
export const inject = ['invariants']

/**
 * No runtime invariant: the single slot registration's disposal is proven by
 * the slot system's inject lifecycle, and the package owns no host-side
 * mutable relation — its only state (the fixed Gray session id) is a
 * constant, and the browser half lives outside the host invariant service's
 * reach.
 */
const install: InvariantInstaller = () => {}

/**
 * Register this package's invariant companion.
 * @param ctx - Cordis context carrying the invariant service.
 * @returns the installed registration's disposer after setup succeeds.
 */
export const apply = (ctx: Context): Promise<() => void> =>
  Promise.resolve(ctx.invariants.register(PACKAGE_NAME, install))
