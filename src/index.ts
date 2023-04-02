import { Command } from '@gosen/command-types'
import { resolve, VersionMismatchError } from '@gosen/run-resolver'

type RequestOptions = {
  version?: string
  retries?: number
} & RequestInit

type RequestResult = {
  version: string
  commands: Command[]
}

const request = async (url: string, options: RequestOptions): Promise<RequestResult> => {
  const { version, retries = 1, ...init } = options
  const res = await fetch(url, init)
  const result = await res.json()

  if (result.error === 'VERSION_MISMATCH') {
    if (retries > 0) {
      return await request(url, {
        ...options,
        retries: retries - 1,
        version: result.serverVersion,
      })
    }

    throw new VersionMismatchError(result.serverVersion)
  }

  if (!Array.isArray(result)) {
    return {
      commands: [],
      version,
    }
  }

  try {
    return {
      commands: await resolve(result, version),
      version,
    }
  } catch (err) {
    if (err instanceof VersionMismatchError) {
      if (retries > 0) {
        return await request(url, {
          ...options,
          retries: retries - 1,
          version: err.serverVersion,
        })
      }
    }

    throw err
  }
}

export { Command, VersionMismatchError, RequestOptions, RequestResult }
export default request
