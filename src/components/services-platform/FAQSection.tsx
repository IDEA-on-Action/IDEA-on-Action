/**
 * FAQSection Component
 * Services Platform - Day 2 Implementation
 *
 * Displays FAQs with Accordion and markdown rendering
 */

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { MarkdownRenderer } from "@/components/blog/MarkdownRenderer"
import type { FAQ } from "@/types/services/services-platform"

interface FAQSectionProps {
  faqs: FAQ[]
  title?: string
}

export function FAQSection({
  faqs,
  title = "자주 묻는 질문",
}: FAQSectionProps) {
  if (!faqs || faqs.length === 0) {
    return null
  }

  return (
    <section className="py-12">
      <h2 className="text-3xl font-bold text-center mb-8">{title}</h2>
      <Accordion type="single" collapsible className="w-full max-w-3xl mx-auto">
        {faqs.map((faq, index) => (
          <AccordionItem key={`faq-${index}`} value={`item-${index}`}>
            <AccordionTrigger className="text-left font-semibold">
              {faq.question}
            </AccordionTrigger>
            <AccordionContent>
              <div className="text-muted-foreground">
                <MarkdownRenderer content={faq.answer || ''} />
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  )
}

// Export as default for backward compatibility
export default FAQSection
