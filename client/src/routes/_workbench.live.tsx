import { createFileRoute } from '@tanstack/react-router'
import { LivePage } from '../App'

export const Route = createFileRoute('/_workbench/live')({ component: LivePage })
