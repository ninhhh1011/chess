import { render, screen } from '@testing-library/react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './Card';

describe('Card', () => {
  it('renders with children', () => {
    render(<Card>Card content</Card>);
    expect(screen.getByText('Card content')).toBeInTheDocument();
  });

  it('applies variant classes', () => {
    const { rerender } = render(<Card variant="elevated">Elevated</Card>);
    expect(screen.getByText('Elevated')).toHaveClass('bg-bg-elevated', 'shadow-md');

    rerender(<Card variant="glass">Glass</Card>);
    expect(screen.getByText('Glass')).toHaveClass('backdrop-blur-md');

    rerender(<Card variant="outline">Outline</Card>);
    expect(screen.getByText('Outline')).toHaveClass('bg-transparent');
  });

  it('applies padding classes', () => {
    const { rerender } = render(<Card padding="none">None</Card>);
    expect(screen.getByText('None')).not.toHaveClass(/p-/);

    rerender(<Card padding="sm">Small</Card>);
    expect(screen.getByText('Small')).toHaveClass('p-3');

    rerender(<Card padding="md">Medium</Card>);
    expect(screen.getByText('Medium')).toHaveClass('p-5');

    rerender(<Card padding="lg">Large</Card>);
    expect(screen.getByText('Large')).toHaveClass('p-8');
  });
});

describe('Card subcomponents', () => {
  it('renders CardHeader, CardTitle, CardDescription', () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Title</CardTitle>
          <CardDescription>Description</CardDescription>
        </CardHeader>
        <CardContent>Content</CardContent>
        <CardFooter>Footer</CardFooter>
      </Card>
    );
    expect(screen.getByText('Title')).toBeInTheDocument();
    expect(screen.getByText('Description')).toBeInTheDocument();
    expect(screen.getByText('Content')).toBeInTheDocument();
    expect(screen.getByText('Footer')).toBeInTheDocument();
  });
});
