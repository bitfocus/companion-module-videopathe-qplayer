import type { SomeCompanionConfigField } from '@companion-module/base'

export const DEFAULT_POLL_INTERVAL_MS = 1000

export interface ModuleConfig {
	host: string
	port: number
	pollInterval: number
	player?: 'active' | 'p1' | 'p2'
	apiPin?: string
}

export function GetConfigFields(): SomeCompanionConfigField[] {
	return [
		{
			type: 'static-text',
			id: 'info',
			width: 12,
			label: 'QPlayer API',
			value: 'Point this module to the QPlayer web server, usually available on port 2224.',
		},
		{
			type: 'textinput',
			id: 'host',
			label: 'QPlayer host',
			width: 8,
			default: '',
			tooltip:
				'Enter 127.0.0.1 for QPlayer on this computer, or the remote computer IP/hostname. No requests are sent until a host is configured.',
		},
		{
			type: 'dropdown',
			id: 'player',
			label: 'Player controlled by this connection',
			width: 6,
			default: 'active',
			choices: [
				{ id: 'active', label: 'Player currently controlled in QPlayer' },
				{ id: 'p1', label: 'Player 1' },
				{ id: 'p2', label: 'Player 2' },
			],
		},
		{
			type: 'secret-text',
			id: 'apiPin',
			label: 'API PIN',
			width: 6,
			default: '',
			regex: '/^([0-9]{4,8})?$/',
			tooltip:
				'Only needed when QPlayer has a PIN enabled in Settings > Security, and Companion runs on another machine. QPlayer never asks a PIN of requests coming from its own machine, so leave this blank for a local 127.0.0.1 connection.',
		},
		{
			type: 'number',
			id: 'port',
			label: 'QPlayer port',
			width: 4,
			default: 2224,
			min: 1,
			max: 65535,
		},
		{
			type: 'number',
			id: 'pollInterval',
			label: 'Poll interval (ms)',
			width: 4,
			default: DEFAULT_POLL_INTERVAL_MS,
			min: 250,
			max: 10000,
		},
	]
}
