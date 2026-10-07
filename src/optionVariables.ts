/** API 1.x suggests variables in fields but does not resolve them automatically. */
export function variableOptionIds(
	fields: readonly { id?: string; type: string; useVariables?: unknown }[],
	options: Record<string, unknown>,
): string[] {
	return fields.flatMap((field) =>
		field.id &&
		field.type === 'textinput' &&
		field.useVariables &&
		typeof options[field.id] === 'string' &&
		String(options[field.id]).includes('$(')
			? [field.id]
			: [],
	)
}

export async function resolveVariableOptions<T extends Record<string, unknown>>(
	options: T,
	ids: readonly string[],
	context: { parseVariablesInString: (text: string) => Promise<string> },
): Promise<T> {
	if (ids.length === 0) return options
	const resolved: Record<string, unknown> = { ...options }
	for (const id of ids) resolved[id] = await context.parseVariablesInString(String(options[id]))
	return resolved as T
}
