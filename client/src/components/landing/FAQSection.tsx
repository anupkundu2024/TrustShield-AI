import { Minus, Plus } from 'lucide-react';
import { useState } from 'react';
import { faqs } from '../../data/landingContent';
import { Container, SectionHeading } from '../ui/Surfaces';

export function FAQSection() {
  const [openQuestion, setOpenQuestion] = useState<number | null>(null);

  return (
    <section
      id="faq"
      tabIndex={-1}
      className="landing-section faq-section"
      aria-labelledby="faq-title"
    >
      <Container className="faq-layout">
        <div className="faq-intro">
          <SectionHeading id="faq-title" title="Frequently Asked Questions" />
        </div>
        <div className="faq-list">
          {faqs.map(({ question, answer }, index) => {
            const isOpen = index === openQuestion;
            const answerId = `faq-answer-${index}`;
            return (
              <div className="faq-item" key={question}>
                <h3>
                  <button
                    type="button"
                    className="faq-toggle"
                    aria-expanded={isOpen}
                    aria-controls={answerId}
                    onClick={() => setOpenQuestion(isOpen ? null : index)}
                  >
                    {question}
                    <span aria-hidden="true">
                      {isOpen ? <Minus size={17} /> : <Plus size={17} />}
                    </span>
                  </button>
                </h3>
                <div
                  id={answerId}
                  className="faq-answer"
                  data-open={isOpen}
                  inert={!isOpen}
                >
                  <div>
                    <p>{answer}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
