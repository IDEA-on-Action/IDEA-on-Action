/**
 * DeliverablesGrid Component
 * Services Platform - Day 2 Implementation
 *
 * Displays service deliverables in a responsive grid with icons
 */

import * as Icons from 'lucide-react'
import { Card } from '@/components/ui/card'
import type { Deliverable } from '@/types/services/services-platform'

interface DeliverablesGridProps {
  deliverables: Deliverable[]
}

/**
 * Dynamically renders a Lucide icon by name
 */
function DynamicIcon({ name, className }: { name?: string; className?: string }) {
  if (!name) {
    // Default icon if none specified
    const Icon = Icons.CheckCircle
    return <Icon className={className} />
  }

  // Get icon component by name
  const Icon = (Icons as Record<string, React.ComponentType<{ className?: string }>>)[name]

  if (!Icon) {
    // Fallback to default icon if name not found
    const FallbackIcon = Icons.CheckCircle
    return <FallbackIcon className={className} />
  }

  return <Icon className={className} />
}

export function DeliverablesGrid({ deliverables }: DeliverablesGridProps) {
  if (!deliverables || deliverables.length === 0) {
    return null
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {deliverables.map((deliverable, index) => (
        <Card
          key={deliverable.title + index}
          className="p-6 hover:shadow-lg transition-shadow duration-200"
        >
          <div className="flex gap-4">
            {/* Icon */}
            <div className="flex-shrink-0">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <DynamicIcon
                  name={deliverable.icon}
                  className="w-6 h-6 text-primary"
                />
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold mb-2">
                {deliverable.title}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {deliverable.description}
              </p>
            </div>
          </div>
        </Card>
      ))}
    </div>
  )
}
