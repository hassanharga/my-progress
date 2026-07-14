'use client';

import { FAQ_CONTENT } from '@/constants/faq';

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

export default function FAQ() {
  return (
    <section id="faq" className="px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl">
        <h2 className="mb-8 text-center text-heading-xxlarge font-weight-bold sm:text-display-small">
          Common questions
        </h2>

        <Accordion type="single" collapsible className="w-full">
          {FAQ_CONTENT.map((faq, i) => (
            <AccordionItem key={i} value={`item-${i}`}>
              <AccordionTrigger className="text-left text-body-large font-weight-medium">
                {faq.question}
              </AccordionTrigger>
              <AccordionContent className="text-text-subtle">{faq.answer}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
