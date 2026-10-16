import { createFileRoute } from '@tanstack/react-router'
import { RunsPage } from '../App'

export const Route = createFileRoute('/_workbench/')({ component: RunsPage })
