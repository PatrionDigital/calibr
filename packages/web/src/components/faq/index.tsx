'use client';

import { useState, useCallback, useMemo } from 'react';

// =============================================================================
// Types
// =============================================================================

export interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: string;
}

export interface FAQCategory {
  id: string;
  name: string;
  description: string;
}

// =============================================================================
// FAQItem Component
// =============================================================================

interface FAQItemProps {
  item: FAQItem;
  isExpanded?: boolean;
  onToggle?: (id: string) => void;
}

export function FAQItem({ item, isExpanded = false, onToggle }: FAQItemProps) {
  const handleToggle = useCallback(() => {
    onToggle?.(item.id);
  }, [item.id, onToggle]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleToggle();
      }
    },
    [handleToggle]
  );

  return (
    <div className="border border-[var(--terminal-green)] mb-2 font-mono">
      <button
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        className="w-full p-4 text-left flex justify-between items-center hover:bg-[var(--terminal-green)] hover:bg-opacity-10 transition-colors"
        aria-expanded={isExpanded}
      >
        <span className="text-[var(--terminal-green)]">{item.question}</span>
        <span
          data-testid="expand-indicator"
          className="text-[var(--terminal-green)] text-xl ml-4"
        >
          {isExpanded ? '−' : '+'}
        </span>
      </button>
      <div
        className={`overflow-hidden transition-all duration-200 ${
          isExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
        }`}
        style={{ visibility: isExpanded ? 'visible' : 'hidden' }}
      >
        <div className="p-4 pt-0 text-[var(--terminal-green)] text-sm opacity-80 border-t border-[var(--terminal-green)] border-opacity-30">
          {item.answer}
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// FAQCategory Component
// =============================================================================

interface FAQCategoryProps {
  category: FAQCategory;
  items: FAQItem[];
}

export function FAQCategory({ category, items }: FAQCategoryProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const toggleExpanded = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  return (
    <div data-testid={`faq-category-${category.id}`} className="mb-8 font-mono">
      <div className="mb-4">
        <h3 className="text-[var(--terminal-green)] text-lg font-bold">{category.name}</h3>
        <p className="text-[var(--terminal-dim)] text-sm">{category.description}</p>
        <p className="text-[var(--terminal-dim)] text-xs mt-1">
          {items.length} {items.length === 1 ? 'question' : 'questions'}
        </p>
      </div>
      <div>
        {items.map((item) => (
          <FAQItem
            key={item.id}
            item={item}
            isExpanded={expandedIds.has(item.id)}
            onToggle={toggleExpanded}
          />
        ))}
      </div>
    </div>
  );
}

// =============================================================================
// FAQSearch Component
// =============================================================================

interface FAQSearchProps {
  onSearch: (query: string) => void;
  value?: string;
  resultCount?: number;
}

export function FAQSearch({ onSearch, value = '', resultCount }: FAQSearchProps) {
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onSearch(e.target.value);
    },
    [onSearch]
  );

  const handleClear = useCallback(() => {
    onSearch('');
  }, [onSearch]);

  return (
    <div className="mb-6 font-mono">
      <div className="relative">
        <span
          data-testid="search-icon"
          className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--terminal-green)]"
        >
          🔍
        </span>
        <input
          type="search"
          value={value}
          onChange={handleChange}
          placeholder="Search questions..."
          className="w-full pl-10 pr-10 py-3 bg-black border border-[var(--terminal-green)] text-[var(--terminal-green)] font-mono focus:outline-none focus:border-[var(--terminal-green)]"
        />
        {value && (
          <button
            onClick={handleClear}
            aria-label="Clear search"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--terminal-green)] hover:text-white"
          >
            ✕
          </button>
        )}
      </div>
      {resultCount !== undefined && (
        <p className="text-[var(--terminal-dim)] text-xs mt-2">{resultCount} results found</p>
      )}
    </div>
  );
}

// =============================================================================
// FAQList Component
// =============================================================================

interface FAQListProps {
  items: FAQItem[];
  accordion?: boolean;
}

export function FAQList({ items, accordion = false }: FAQListProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const toggleExpanded = useCallback(
    (id: string) => {
      setExpandedIds((prev) => {
        if (accordion) {
          // In accordion mode, only one item can be expanded
          if (prev.has(id)) {
            return new Set();
          }
          return new Set([id]);
        }
        // Normal mode - multiple items can be expanded
        const next = new Set(prev);
        if (next.has(id)) {
          next.delete(id);
        } else {
          next.add(id);
        }
        return next;
      });
    },
    [accordion]
  );

  if (items.length === 0) {
    return (
      <div data-testid="faq-list" className="text-center py-8 font-mono">
        <p className="text-[var(--terminal-dim)]">No questions found</p>
      </div>
    );
  }

  return (
    <div data-testid="faq-list">
      {items.map((item) => (
        <FAQItem
          key={item.id}
          item={item}
          isExpanded={expandedIds.has(item.id)}
          onToggle={toggleExpanded}
        />
      ))}
    </div>
  );
}

// =============================================================================
// FAQPage Component
// =============================================================================

interface FAQPageProps {
  items: FAQItem[];
  categories: FAQCategory[];
}

export function FAQPage({ items, categories }: FAQPageProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const filteredItems = useMemo(() => {
    let result = items;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (item) =>
          item.question.toLowerCase().includes(query) ||
          item.answer.toLowerCase().includes(query)
      );
    }

    if (selectedCategory) {
      result = result.filter((item) => item.category === selectedCategory);
    }

    return result;
  }, [items, searchQuery, selectedCategory]);

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  const handleCategoryClick = useCallback((categoryId: string | null) => {
    setSelectedCategory(categoryId);
  }, []);

  return (
    <div data-testid="faq-page" className="max-w-3xl mx-auto p-4 font-mono">
      <div className="mb-8">
        <h1 className="text-[var(--terminal-green)] text-2xl mb-2">
          Frequently Asked Questions
        </h1>
        <p className="text-[var(--terminal-dim)] text-sm">
          Find answers to common questions about Calibr
        </p>
      </div>

      <FAQSearch
        onSearch={handleSearch}
        value={searchQuery}
        resultCount={searchQuery ? filteredItems.length : undefined}
      />

      {/* Category filters */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => handleCategoryClick(null)}
          className={`px-3 py-1 border text-xs transition-colors ${
            selectedCategory === null
              ? 'border-[var(--terminal-green)] bg-[var(--terminal-green)] text-black'
              : 'border-[var(--terminal-green)] text-[var(--terminal-green)] hover:bg-[var(--terminal-green)] hover:bg-opacity-20'
          }`}
        >
          All
        </button>
        {categories.map((category) => (
          <button
            key={category.id}
            data-testid={`category-filter-${category.id}`}
            onClick={() => handleCategoryClick(category.id)}
            className={`px-3 py-1 border text-xs transition-colors ${
              selectedCategory === category.id
                ? 'border-[var(--terminal-green)] bg-[var(--terminal-green)] text-black'
                : 'border-[var(--terminal-green)] text-[var(--terminal-green)] hover:bg-[var(--terminal-green)] hover:bg-opacity-20'
            }`}
          >
            {category.name}
          </button>
        ))}
      </div>

      {/* FAQ List */}
      {searchQuery || selectedCategory ? (
        <FAQList items={filteredItems} />
      ) : (
        // Show by category when no filter active
        categories.map((category) => {
          const categoryItems = items.filter((item) => item.category === category.id);
          if (categoryItems.length === 0) return null;
          return (
            <FAQCategory key={category.id} category={category} items={categoryItems} />
          );
        })
      )}

      {/* Contact support */}
      <div className="mt-12 p-6 border border-[var(--terminal-green)] border-opacity-30 text-center">
        <p className="text-[var(--terminal-green)] mb-2">
          Can&apos;t find what you&apos;re looking for?
        </p>
        <a
          href="mailto:support@calibr.xyz"
          className="text-[var(--terminal-green)] underline hover:no-underline"
        >
          Contact Support
        </a>
      </div>
    </div>
  );
}

// =============================================================================
// useFAQ Hook
// =============================================================================

interface UseFAQReturn {
  filteredItems: FAQItem[];
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedCategory: string | null;
  setSelectedCategory: (category: string | null) => void;
  expandedIds: Set<string>;
  toggleExpanded: (id: string) => void;
  collapseAll: () => void;
}

export function useFAQ(items: FAQItem[]): UseFAQReturn {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const filteredItems = useMemo(() => {
    let result = items;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (item) =>
          item.question.toLowerCase().includes(query) ||
          item.answer.toLowerCase().includes(query)
      );
    }

    if (selectedCategory) {
      result = result.filter((item) => item.category === selectedCategory);
    }

    return result;
  }, [items, searchQuery, selectedCategory]);

  const toggleExpanded = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const collapseAll = useCallback(() => {
    setExpandedIds(new Set());
  }, []);

  return {
    filteredItems,
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    expandedIds,
    toggleExpanded,
    collapseAll,
  };
}
