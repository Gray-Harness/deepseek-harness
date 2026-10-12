/**
 * A route is advertised only while it can serve a request.
 *
 * The gate inverts the earlier contract, which advertised the configured catalog
 * regardless of credentials: two DeepSeek routes then fell back to the same
 * static default catalog, so the picker showed two identical groups and one of
 * them failed on the first request. `buildModelCatalog` drops a group with no
 * models, so withholding here is what removes the unusable group.
 */
import { Context } from '@deepseek-ai/cordis'
import LlmRuntime from '@deepseek-ai/dsh-llm'
import { expect, it, vi } from 'vitest'
import * as ApiKey from '../src/index.ts'

/**
 * Mount the API-key route under one environment value and read what it advertises.
 * @param apiKey - the ambient key, or undefined to remove the variable entirely.
 * @returns the advertised models and the warning arguments the run produced.
 */
async function catalog(apiKey: string | undefined): Promise<{ models: { id: string }[]; warnings: string[] }> {
  const previous = process.env.DEEPSEEK_API_KEY
  if (apiKey === undefined) delete process.env.DEEPSEEK_API_KEY
  else process.env.DEEPSEEK_API_KEY = apiKey
  const ctx = new Context()
  try {
    await ctx.plugin(LlmRuntime)
    const warn = vi.spyOn(ctx.logger, 'warn').mockImplementation(() => undefined)
    await ctx.plugin(ApiKey, {})
    const models = await ctx.llm.listModels('deepseek-official')
    return { models, warnings: warn.mock.calls.map(call => String(call[0])) }
  } finally {
    await ctx.fiber.dispose()
    if (previous === undefined) delete process.env.DEEPSEEK_API_KEY
    else process.env.DEEPSEEK_API_KEY = previous
  }
}

it('withholds the route when no API key is configured', async () => {
  const { models, warnings } = await catalog(undefined)
  expect(models).toEqual([])
  expect(warnings.join('\n')).toContain('hiding route "deepseek-official"')
})

it.each(['', 'invalid\nheader'])('withholds the route when the configured key is unusable: %j', async (key) => {
  const { models, warnings } = await catalog(key)
  expect(models).toEqual([])
  expect(warnings.join('\n')).toContain('hiding route "deepseek-official"')
})

it('advertises the configured models once the key is usable', async () => {
  const { models, warnings } = await catalog('sk-test-0123456789')
  expect(models).toEqual(expect.arrayContaining([
    expect.objectContaining({ provider: 'deepseek-official', id: 'deepseek-flash' }),
  ]))
  expect(warnings.join('\n')).not.toContain('hiding route')
})
