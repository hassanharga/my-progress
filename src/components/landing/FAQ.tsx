'use client';

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

const faqs = [
  {
    question: 'Is it free to use?',
    answer:
      'Yes, My Progress is completely free to use. No hidden fees, no credit card required.',
  },
  {
    question: 'Do I need to install anything?',
    answer:
      'No, My Progress runs entirely in your browser. Just sign up and start tracking.',
  },
  {
    question: 'Is my data secure?',
    answer:
      'Your data is stored securely and is only accessible by you. We use encrypted authentication and never share your information.',
  },
  {
    question: 'Can I use it on mobile?',
    answer:
      'Yes, My Progress is fully responsive and works great on phones, tablets, and desktops.',
  },
];

export default function FAQ() {
  return (
    <section id="faq" className="px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl">
        <h2 className="mb-8 text-center font-display text-3xl font-bold sm:text-4xl">
          Common questions
        </h2>

        <Accordion type="single" collapsible className="w-full">
          {faqs.map((faq, i) => (
            <AccordionItem key={i} value={`item-${i}`}>
              <AccordionTrigger className="text-left text-base font-medium">
                {faq.question}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
