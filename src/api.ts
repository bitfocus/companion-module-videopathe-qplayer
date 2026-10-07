export function buildBaseUrl(host: string, port: number): string {
	const normalizedHost = String(host || '').trim()
	const address =
		normalizedHost.includes(':') && !normalizedHost.startsWith('[') ? `[${normalizedHost}]` : normalizedHost
	return `http://${address}:${port}`
}

export async function fetchJson<T>(url: string, init?: RequestInit, timeoutMs = 10_000): Promise<T> {
	const controller = new AbortController()
	const abortSignal = init?.signal
	const onAbort = (): void => {
		controller.abort()
	}

	if (abortSignal) {
		if (abortSignal.aborted) {
			controller.abort()
		} else {
			abortSignal.addEventListener('abort', onAbort, { once: true })
		}
	}

	const timer = setTimeout(() => {
		controller.abort()
	}, timeoutMs)

	try {
		const response = await fetch(url, {
			...init,
			signal: controller.signal,
			headers: {
				'Content-Type': 'application/json',
				...(init?.headers ?? {}),
			},
		})

		if (!response.ok) {
			const bodyText = await response.text()
			throw new Error(`HTTP ${response.status} ${response.statusText}${bodyText ? `: ${bodyText}` : ''}`)
		}

		return (await response.json()) as T
	} catch (error) {
		if (error instanceof Error && error.name === 'AbortError' && !abortSignal?.aborted) {
			throw new Error(`Request timed out after ${timeoutMs}ms`)
		}

		throw error
	} finally {
		clearTimeout(timer)
		abortSignal?.removeEventListener('abort', onAbort)
	}
}

export async function postJson<T>(
	url: string,
	body?: unknown,
	headers?: Record<string, string>,
	signal?: AbortSignal,
	method: 'POST' | 'PUT' = 'POST',
): Promise<T> {
	const init: RequestInit = {
		method,
		headers,
		signal,
	}

	if (body !== undefined) {
		init.body = JSON.stringify(body)
	}

	return fetchJson<T>(url, init)
}
