import { createFileRoute } from '@tanstack/react-router'
import { NewRunPage } from '../App'

export const Route = createFileRoute('/_workbench/runs/new')({ component: NewRunPage })
