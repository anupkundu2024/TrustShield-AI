import { LinkButton } from '../components/ui/Button';
import { EmptyState } from '../components/ui/Feedback';
import { Container } from '../components/ui/Surfaces';

export function NotFoundPage() {
  return (
    <Container className="py-24 sm:py-32">
      <EmptyState
        title="Page not found"
        description="The page may have moved, or the address may have a typo."
        action={<LinkButton to="/">Back to home</LinkButton>}
      />
    </Container>
  );
}
