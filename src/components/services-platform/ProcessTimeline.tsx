/**
 * ProcessTimeline Component
 *
 * Displays service process steps with vertical timeline design
 *
 * Features:
 * - Vertical timeline with connecting lines
 * - Step number badges (circular, primary colored)
 * - Duration badges with clock icon
 * - Activities checklist with checkmark icons
 * - Responsive layout
 * - Dark mode support
 *
 * Related: TASK-006, TASK-007, TASK-008
 * Created: 2025-11-19
 */

import { Check, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { ProcessTimelineProps } from '@/types/services-platform';

export function ProcessTimeline({ steps }: ProcessTimelineProps) {
  if (!steps || steps.length === 0) {
    return null;
  }

  return (
    <div className="space-y-8">
      {steps.map((step, index) => {
        const isLastStep = index === steps.length - 1;

        return (
          <div key={step.step} className="relative flex gap-6">
            {/* Timeline Connector (vertical line) */}
            {!isLastStep && (
              <div
                className="absolute left-6 top-12 h-full w-0.5 border-l-2 border-muted"
                aria-hidden="true"
              />
            )}

            {/* Step Number Badge (circular, primary) */}
            <div className="relative z-10 flex-shrink-0">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold">
                {step.step}
              </div>
            </div>

            {/* Step Content */}
            <div className="flex-1 space-y-3 pb-8">
              {/* Step Title & Duration */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <h3 className="text-xl font-bold">{step.title}</h3>
                <Badge variant="secondary" className="w-fit">
                  <Clock className="mr-1 h-3 w-3" />
                  {step.duration}
                </Badge>
              </div>

              {/* Activities Checklist */}
              {step.activities && step.activities.length > 0 && (
                <ul className="space-y-2" role="list">
                  {step.activities.map((activity, activityIndex) => (
                    <li
                      key={activityIndex}
                      className="flex items-start gap-2 text-muted-foreground"
                    >
                      <Check className="h-5 w-5 flex-shrink-0 text-primary mt-0.5" aria-hidden="true" />
                      <span className="flex-1">{activity}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
