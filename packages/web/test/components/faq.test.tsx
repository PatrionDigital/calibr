/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import type {
  FAQItem as FAQItemType,
  FAQCategory as FAQCategoryType,
} from '../../src/components/faq';
import {
  FAQItem,
  FAQCategory,
  FAQSearch,
  FAQList,
  FAQPage,
  useFAQ,
} from '../../src/components/faq';

// =============================================================================
// Test Data
// =============================================================================

const mockFAQItems: FAQItemType[] = [
  {
    id: 'faq-1',
    question: 'What is Calibr?',
    answer: 'Calibr is a prediction market portfolio manager that helps you track forecasts.',
    category: 'general',
  },
  {
    id: 'faq-2',
    question: 'How do I connect my wallet?',
    answer: 'Click the Connect Wallet button in the top navigation and select your wallet.',
    category: 'getting-started',
  },
  {
    id: 'faq-3',
    question: 'What is a Brier score?',
    answer: 'The Brier score measures the accuracy of probabilistic predictions.',
    category: 'forecasting',
  },
  {
    id: 'faq-4',
    question: 'How do attestations work?',
    answer: 'Attestations are on-chain records of your forecasts using EAS.',
    category: 'attestations',
  },
];

const mockCategories: FAQCategoryType[] = [
  { id: 'general', name: 'General', description: 'Basic questions about Calibr' },
  { id: 'getting-started', name: 'Getting Started', description: 'How to begin using Calibr' },
  { id: 'forecasting', name: 'Forecasting', description: 'Questions about making predictions' },
  { id: 'attestations', name: 'Attestations', description: 'On-chain verification questions' },
];

// =============================================================================
// FAQItem Tests
// =============================================================================

describe('FAQItem', () => {
  const mockItem = mockFAQItems[0]!;

  it('renders question', () => {
    render(<FAQItem item={mockItem} />);
    expect(screen.getByText('What is Calibr?')).toBeInTheDocument();
  });

  it('answer is hidden by default', () => {
    render(<FAQItem item={mockItem} />);
    expect(screen.queryByText(/prediction market portfolio/i)).not.toBeVisible();
  });

  it('shows answer when expanded', () => {
    render(<FAQItem item={mockItem} isExpanded={true} />);
    expect(screen.getByText(/prediction market portfolio/i)).toBeVisible();
  });

  it('toggles expansion on click', () => {
    const onToggle = vi.fn();
    render(<FAQItem item={mockItem} onToggle={onToggle} />);
    fireEvent.click(screen.getByText('What is Calibr?'));
    expect(onToggle).toHaveBeenCalledWith('faq-1');
  });

  it('shows expand indicator', () => {
    render(<FAQItem item={mockItem} />);
    expect(screen.getByTestId('expand-indicator')).toBeInTheDocument();
  });

  it('shows collapse indicator when expanded', () => {
    render(<FAQItem item={mockItem} isExpanded={true} />);
    const indicator = screen.getByTestId('expand-indicator');
    expect(indicator).toHaveTextContent('−');
  });

  it('has accessible button role', () => {
    render(<FAQItem item={mockItem} />);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('supports keyboard navigation', () => {
    const onToggle = vi.fn();
    render(<FAQItem item={mockItem} onToggle={onToggle} />);
    fireEvent.keyDown(screen.getByRole('button'), { key: 'Enter' });
    expect(onToggle).toHaveBeenCalled();
  });
});

// =============================================================================
// FAQCategory Tests
// =============================================================================

describe('FAQCategory', () => {
  const category = mockCategories[0]!;
  const items = mockFAQItems.filter((item) => item.category === 'general');

  it('renders category name', () => {
    render(<FAQCategory category={category} items={items} />);
    expect(screen.getByText('General')).toBeInTheDocument();
  });

  it('renders category description', () => {
    render(<FAQCategory category={category} items={items} />);
    expect(screen.getByText('Basic questions about Calibr')).toBeInTheDocument();
  });

  it('renders all items in category', () => {
    render(<FAQCategory category={category} items={items} />);
    expect(screen.getByText('What is Calibr?')).toBeInTheDocument();
  });

  it('shows item count', () => {
    render(<FAQCategory category={category} items={items} />);
    expect(screen.getByText(/1 question/i)).toBeInTheDocument();
  });

  it('handles multiple items', () => {
    const multipleItems = [...items, mockFAQItems[1]!];
    render(<FAQCategory category={category} items={multipleItems} />);
    expect(screen.getByText(/2 questions/i)).toBeInTheDocument();
  });

  it('allows expanding items within category', () => {
    render(<FAQCategory category={category} items={items} />);
    fireEvent.click(screen.getByText('What is Calibr?'));
    expect(screen.getByText(/prediction market portfolio/i)).toBeVisible();
  });

  it('has data-testid for category', () => {
    render(<FAQCategory category={category} items={items} />);
    expect(screen.getByTestId('faq-category-general')).toBeInTheDocument();
  });
});

// =============================================================================
// FAQSearch Tests
// =============================================================================

describe('FAQSearch', () => {
  it('renders search input', () => {
    render(<FAQSearch onSearch={() => {}} />);
    expect(screen.getByRole('searchbox')).toBeInTheDocument();
  });

  it('has placeholder text', () => {
    render(<FAQSearch onSearch={() => {}} />);
    expect(screen.getByPlaceholderText(/search/i)).toBeInTheDocument();
  });

  it('calls onSearch when typing', () => {
    const onSearch = vi.fn();
    render(<FAQSearch onSearch={onSearch} />);
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'wallet' } });
    expect(onSearch).toHaveBeenCalledWith('wallet');
  });

  it('shows clear button when has value', () => {
    render(<FAQSearch onSearch={() => {}} value="test" />);
    expect(screen.getByRole('button', { name: /clear/i })).toBeInTheDocument();
  });

  it('clears search on clear button click', () => {
    const onSearch = vi.fn();
    render(<FAQSearch onSearch={onSearch} value="test" />);
    fireEvent.click(screen.getByRole('button', { name: /clear/i }));
    expect(onSearch).toHaveBeenCalledWith('');
  });

  it('shows search icon', () => {
    render(<FAQSearch onSearch={() => {}} />);
    expect(screen.getByTestId('search-icon')).toBeInTheDocument();
  });

  it('shows result count when provided', () => {
    render(<FAQSearch onSearch={() => {}} resultCount={5} />);
    expect(screen.getByText(/5 results/i)).toBeInTheDocument();
  });
});

// =============================================================================
// FAQList Tests
// =============================================================================

describe('FAQList', () => {
  it('renders all FAQ items', () => {
    render(<FAQList items={mockFAQItems} />);
    expect(screen.getByText('What is Calibr?')).toBeInTheDocument();
    expect(screen.getByText('How do I connect my wallet?')).toBeInTheDocument();
    expect(screen.getByText('What is a Brier score?')).toBeInTheDocument();
  });

  it('shows empty state when no items', () => {
    render(<FAQList items={[]} />);
    expect(screen.getByText(/no questions found/i)).toBeInTheDocument();
  });

  it('allows expanding multiple items', () => {
    render(<FAQList items={mockFAQItems} />);
    fireEvent.click(screen.getByText('What is Calibr?'));
    fireEvent.click(screen.getByText('How do I connect my wallet?'));
    expect(screen.getByText(/prediction market portfolio/i)).toBeVisible();
    expect(screen.getByText(/Connect Wallet button/i)).toBeVisible();
  });

  it('collapses item when clicking again', () => {
    render(<FAQList items={mockFAQItems} />);
    fireEvent.click(screen.getByText('What is Calibr?'));
    expect(screen.getByText(/prediction market portfolio/i)).toBeVisible();
    fireEvent.click(screen.getByText('What is Calibr?'));
    expect(screen.queryByText(/prediction market portfolio/i)).not.toBeVisible();
  });

  it('has data-testid', () => {
    render(<FAQList items={mockFAQItems} />);
    expect(screen.getByTestId('faq-list')).toBeInTheDocument();
  });

  it('supports accordion mode (only one expanded)', () => {
    render(<FAQList items={mockFAQItems} accordion={true} />);
    fireEvent.click(screen.getByText('What is Calibr?'));
    fireEvent.click(screen.getByText('How do I connect my wallet?'));
    // First item should be collapsed when second is opened
    expect(screen.queryByText(/prediction market portfolio/i)).not.toBeVisible();
    expect(screen.getByText(/Connect Wallet button/i)).toBeVisible();
  });
});

// =============================================================================
// FAQPage Tests
// =============================================================================

describe('FAQPage', () => {
  it('renders FAQ page', () => {
    render(<FAQPage items={mockFAQItems} categories={mockCategories} />);
    expect(screen.getByTestId('faq-page')).toBeInTheDocument();
  });

  it('shows page title', () => {
    render(<FAQPage items={mockFAQItems} categories={mockCategories} />);
    expect(screen.getByText(/frequently asked questions/i)).toBeInTheDocument();
  });

  it('shows search input', () => {
    render(<FAQPage items={mockFAQItems} categories={mockCategories} />);
    expect(screen.getByRole('searchbox')).toBeInTheDocument();
  });

  it('shows all categories', () => {
    render(<FAQPage items={mockFAQItems} categories={mockCategories} />);
    // Category names appear in both filter buttons and section headings
    expect(screen.getAllByText('General').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Getting Started').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Forecasting').length).toBeGreaterThan(0);
  });

  it('filters items when searching', async () => {
    render(<FAQPage items={mockFAQItems} categories={mockCategories} />);
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'wallet' } });
    await waitFor(() => {
      expect(screen.getByText('How do I connect my wallet?')).toBeInTheDocument();
      expect(screen.queryByText('What is a Brier score?')).not.toBeInTheDocument();
    });
  });

  it('shows no results message when search has no matches', async () => {
    render(<FAQPage items={mockFAQItems} categories={mockCategories} />);
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'xyznonexistent' } });
    await waitFor(() => {
      expect(screen.getByText(/no questions found/i)).toBeInTheDocument();
    });
  });

  it('allows filtering by category', () => {
    render(<FAQPage items={mockFAQItems} categories={mockCategories} />);
    fireEvent.click(screen.getByTestId('category-filter-forecasting'));
    expect(screen.getByText('What is a Brier score?')).toBeInTheDocument();
    expect(screen.queryByText('What is Calibr?')).not.toBeInTheDocument();
  });

  it('shows all button to reset category filter', () => {
    render(<FAQPage items={mockFAQItems} categories={mockCategories} />);
    fireEvent.click(screen.getByTestId('category-filter-forecasting'));
    fireEvent.click(screen.getByText(/all/i));
    expect(screen.getByText('What is Calibr?')).toBeInTheDocument();
  });

  it('has contact support link', () => {
    render(<FAQPage items={mockFAQItems} categories={mockCategories} />);
    expect(screen.getByText(/contact support/i)).toBeInTheDocument();
  });
});

// =============================================================================
// useFAQ Hook Tests
// =============================================================================

describe('useFAQ', () => {
  function TestComponent({ items }: { items: FAQItemType[] }) {
    const {
      filteredItems,
      searchQuery,
      setSearchQuery,
      selectedCategory,
      setSelectedCategory,
      expandedIds,
      toggleExpanded,
      collapseAll,
    } = useFAQ(items);

    return (
      <div>
        <span data-testid="filtered-count">{filteredItems.length}</span>
        <span data-testid="search-query">{searchQuery || 'none'}</span>
        <span data-testid="selected-category">{selectedCategory || 'all'}</span>
        <span data-testid="expanded-count">{expandedIds.size}</span>
        <button onClick={() => setSearchQuery('wallet')}>Search Wallet</button>
        <button onClick={() => setSelectedCategory('forecasting')}>Filter Forecasting</button>
        <button onClick={() => toggleExpanded('faq-1')}>Toggle FAQ 1</button>
        <button onClick={collapseAll}>Collapse All</button>
      </div>
    );
  }

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns all items initially', () => {
    render(<TestComponent items={mockFAQItems} />);
    expect(screen.getByTestId('filtered-count')).toHaveTextContent('4');
  });

  it('has no search query initially', () => {
    render(<TestComponent items={mockFAQItems} />);
    expect(screen.getByTestId('search-query')).toHaveTextContent('none');
  });

  it('has no selected category initially', () => {
    render(<TestComponent items={mockFAQItems} />);
    expect(screen.getByTestId('selected-category')).toHaveTextContent('all');
  });

  it('has no expanded items initially', () => {
    render(<TestComponent items={mockFAQItems} />);
    expect(screen.getByTestId('expanded-count')).toHaveTextContent('0');
  });

  it('filters by search query', () => {
    render(<TestComponent items={mockFAQItems} />);
    fireEvent.click(screen.getByText('Search Wallet'));
    expect(screen.getByTestId('filtered-count')).toHaveTextContent('1');
  });

  it('filters by category', () => {
    render(<TestComponent items={mockFAQItems} />);
    fireEvent.click(screen.getByText('Filter Forecasting'));
    expect(screen.getByTestId('filtered-count')).toHaveTextContent('1');
  });

  it('toggles expanded state', () => {
    render(<TestComponent items={mockFAQItems} />);
    fireEvent.click(screen.getByText('Toggle FAQ 1'));
    expect(screen.getByTestId('expanded-count')).toHaveTextContent('1');
  });

  it('collapses all expanded items', () => {
    render(<TestComponent items={mockFAQItems} />);
    fireEvent.click(screen.getByText('Toggle FAQ 1'));
    fireEvent.click(screen.getByText('Collapse All'));
    expect(screen.getByTestId('expanded-count')).toHaveTextContent('0');
  });
});
