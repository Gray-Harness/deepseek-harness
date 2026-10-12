/**
 * API-key authentication and discovery for the official DeepSeek route.
 *
 * Discovery is credential-gated: a route with no usable key is not advertised,
 * so the browser catalog lists what can actually serve a request. The account
 * route (`llm-deepseek-account`) takes the same fail-closed read on a signed-out
 * account, and `buildModelCatalog` drops any group left with no models — without
 * the gate both DeepSeek routes fell back to the same static default catalog and
 * the picker showed two identical groups, the second of them unusable.
 */
import type { Context } from '@deepseek-ai/cordis'
import { assertUsableApiKey, LlmError } from '@deepseek-ai/dsh-llm'
import type {} from '@deepseek-ai/cordis-plugin-loader'
import { launchEnvironmentOf } from '@deepseek-ai/dsh-launch-environment'
import { registerDeepSeekProvider, catalogModelInfo } from '@deepseek-ai/dsh-llm-deepseek'
import { Config, plainOptions, resolveAdapterOptions } from './config.ts'
import type { ResolvedDeepSeekOptions } from './config.ts'

export { Config, plainOptions, resolveAdapterOptions } from './config.ts'
export type { Options, ResolvedDeepSeekOptions } from './config.ts'
export const name = 'llm-deepseek-api-key'
export const inject = ['llm']

const PROVIDER = 'deepseek-official'

/** How long one resolved key is reused. A credential is read on demand; the window stays short. */
const CREDENTIAL_REUSE_MS = 5_000

export function apply(ctx: Context, config: Config): void {
  const options = () => resolveAdapterOptions(plainOptions(config), launchEnvironmentOf(ctx))
  options()
  const resolveApiKey = async (connection: ResolvedDeepSeekOptions): Promise<string> => {
    const ref = connection.apiKeyEnv
    const credentials = ctx.get('credentials')
    if (credentials !== undefined) {
      const hit = await credentials.resolve(ref)
      if (hit !== undefined) return assertUsableApiKey(hit.value, 'llm-deepseek', ref)
    } else {
      const ambient = launchEnvironmentOf(ctx).get(ref)
      if (ambient !== undefined && ambient.value.length > 0) return assertUsableApiKey(ambient.value, 'llm-deepseek', ref)
    }
    throw new LlmError(
      `llm-deepseek: no API key for provider route "${PROVIDER}"; store ${ref} through the credentials`
      + ` service (the web Models page writes it), or export ${ref} in the launching environment`,
      'MISSING_CREDENTIAL',
    )
  }

  // The catalog is rebuilt on demand, and a keyring read per rebuild is wasted
  // work; the value is a credential, so the reuse window is short.
  let cached: { at: number; value: string } | undefined
  const resolveApiKeyReused = async (connection: ResolvedDeepSeekOptions): Promise<string> => {
    const now = Date.now()
    if (cached !== undefined && now - cached.at < CREDENTIAL_REUSE_MS) return cached.value
    const value = await resolveApiKey(connection)
    cached = { at: now, value }
    return value
  }

  ctx.llm.registerConfigurableProviders([
    { provider: PROVIDER, displayName: 'DeepSeek', settingsNs: ctx.fiber.entry?.options.id ?? name, settingsPath: [] },
  ])
  registerDeepSeekProvider(ctx, PROVIDER, {
    options, providerName: 'DeepSeek',
    resolveAuth: async connection => ({ headers: { 'x-api-key': await resolveApiKeyReused(connection) } }),
    discoverModels: async (provider) => {
      const connection = options()
      try {
        await resolveApiKeyReused(connection)
      } catch (error) {
        // A declared credential failure — missing, unusable, or an unavailable
        // store — means this route cannot serve a request, so it is withheld.
        // Any other throwable is a defect and must surface rather than silently
        // emptying the catalog.
        if (!(error instanceof LlmError)) throw error
        ctx.logger.warn(`llm-deepseek: hiding route "${PROVIDER}" from the catalog: ${error.message}`)
        return []
      }
      return connection.models.map(model => catalogModelInfo(provider, model))
    },
  })
}
