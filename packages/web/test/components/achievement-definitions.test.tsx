/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type {
  AchievementCategory,
  AchievementProgress,
} from '../../src/components/achievement-definitions';
import {
  ACHIEVEMENT_DEFINITIONS,
  AchievementList,
  AchievementDetail,
  AchievementCategoryFilter,
  AchievementProgressCard,
  AchievementMilestone,
  AchievementDefinitionsPage,
  useAchievementDefinitions,
} from '../../src/components/achievement-definitions';

// =============================================================================
// Test Data
// =============================================================================

const mockProgress: AchievementProgress[] = [
  {
    achievementId: 'streak-7',
    currentValue: 5,
    targetValue: 7,
    percentage: 71,
    completed: false,
  },
  {
    achievementId: 'streak-30',
    currentValue: 5,
    targetValue: 30,
    percentage: 17,
    completed: false,
  },
  {
    achievementId: 'forecasts-10',
    currentValue: 10,
    targetValue: 10,
    percentage: 100,
    completed: true,
    completedAt: '2025-01-10',
  },
  {
    achievementId: 'accuracy-70',
    currentValue: 75,
    targetValue: 70,
    percentage: 100,
    completed: true,
    completedAt: '2025-01-15',
  },
];

// =============================================================================
// ACHIEVEMENT_DEFINITIONS Constants Tests
// =============================================================================

describe('ACHIEVEMENT_DEFINITIONS', () => {
  it('exports achievement definitions', () => {
    expect(ACHIEVEMENT_DEFINITIONS).toBeDefined();
    expect(Array.isArray(ACHIEVEMENT_DEFINITIONS)).toBe(true);
  });

  it('has streak achievements', () => {
    const streaks = ACHIEVEMENT_DEFINITIONS.filter((a) => a.category === 'streak');
    expect(streaks.length).toBeGreaterThan(0);
  });

  it('has accuracy achievements', () => {
    const accuracy = ACHIEVEMENT_DEFINITIONS.filter((a) => a.category === 'accuracy');
    expect(accuracy.length).toBeGreaterThan(0);
  });

  it('has volume achievements', () => {
    const volume = ACHIEVEMENT_DEFINITIONS.filter((a) => a.category === 'volume');
    expect(volume.length).toBeGreaterThan(0);
  });

  it('has tier achievements', () => {
    const tier = ACHIEVEMENT_DEFINITIONS.filter((a) => a.category === 'tier');
    expect(tier.length).toBeGreaterThan(0);
  });

  it('each definition has required fields', () => {
    for (const def of ACHIEVEMENT_DEFINITIONS) {
      expect(def.id).toBeDefined();
      expect(def.name).toBeDefined();
      expect(def.description).toBeDefined();
      expect(def.category).toBeDefined();
      expect(def.icon).toBeDefined();
      expect(def.targetValue).toBeDefined();
      expect(def.tier).toBeDefined();
    }
  });

  it('has unique IDs', () => {
    const ids = ACHIEVEMENT_DEFINITIONS.map((a) => a.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });
});

// =============================================================================
// AchievementList Tests
// =============================================================================

describe('AchievementList', () => {
  it('renders list', () => {
    render(<AchievementList definitions={ACHIEVEMENT_DEFINITIONS} progress={mockProgress} />);
    expect(screen.getByTestId('achievement-list')).toBeInTheDocument();
  });

  it('shows all definitions', () => {
    render(<AchievementList definitions={ACHIEVEMENT_DEFINITIONS} progress={mockProgress} />);
    const items = screen.getAllByTestId('achievement-list-item');
    expect(items.length).toBe(ACHIEVEMENT_DEFINITIONS.length);
  });

  it('shows achievement names', () => {
    render(<AchievementList definitions={ACHIEVEMENT_DEFINITIONS} progress={mockProgress} />);
    for (const def of ACHIEVEMENT_DEFINITIONS.slice(0, 3)) {
      expect(screen.getByText(def.name)).toBeInTheDocument();
    }
  });

  it('calls onSelect when item clicked', () => {
    const onSelect = vi.fn();
    render(
      <AchievementList
        definitions={ACHIEVEMENT_DEFINITIONS}
        progress={mockProgress}
        onSelect={onSelect}
      />
    );
    const items = screen.getAllByTestId('achievement-list-item');
    fireEvent.click(items[0]!);
    expect(onSelect).toHaveBeenCalledWith(ACHIEVEMENT_DEFINITIONS[0]!.id);
  });

  it('shows completed indicator for completed achievements', () => {
    render(<AchievementList definitions={ACHIEVEMENT_DEFINITIONS} progress={mockProgress} />);
    const completed = screen.getAllByText(/completed/i);
    expect(completed.length).toBeGreaterThan(0);
  });
});

// =============================================================================
// AchievementDetail Tests
// =============================================================================

describe('AchievementDetail', () => {
  const def = ACHIEVEMENT_DEFINITIONS.find((a) => a.id === 'streak-7') ?? ACHIEVEMENT_DEFINITIONS[0]!;
  const progress = mockProgress[0]!;

  it('renders detail card', () => {
    render(<AchievementDetail definition={def} progress={progress} />);
    expect(screen.getByTestId('achievement-detail')).toBeInTheDocument();
  });

  it('shows achievement name', () => {
    render(<AchievementDetail definition={def} progress={progress} />);
    expect(screen.getByText(def.name)).toBeInTheDocument();
  });

  it('shows achievement description', () => {
    render(<AchievementDetail definition={def} progress={progress} />);
    expect(screen.getByText(def.description)).toBeInTheDocument();
  });

  it('shows progress value', () => {
    render(<AchievementDetail definition={def} progress={progress} />);
    const detail = screen.getByTestId('achievement-detail');
    expect(detail).toHaveTextContent('5/7');
  });

  it('shows tier requirement', () => {
    render(<AchievementDetail definition={def} progress={progress} />);
    expect(screen.getByText(def.tier)).toBeInTheDocument();
  });

  it('shows icon', () => {
    render(<AchievementDetail definition={def} progress={progress} />);
    expect(screen.getByText(def.icon)).toBeInTheDocument();
  });

  it('shows completed state', () => {
    const completedProgress = mockProgress[2]!;
    const completedDef = ACHIEVEMENT_DEFINITIONS.find((a) => a.id === completedProgress.achievementId) ?? ACHIEVEMENT_DEFINITIONS[0]!;
    render(<AchievementDetail definition={completedDef} progress={completedProgress} />);
    expect(screen.getAllByText(/completed/i).length).toBeGreaterThan(0);
  });
});

// =============================================================================
// AchievementCategoryFilter Tests
// =============================================================================

describe('AchievementCategoryFilter', () => {
  const categories: AchievementCategory[] = ['streak', 'accuracy', 'volume', 'tier'];

  it('renders filter', () => {
    render(
      <AchievementCategoryFilter
        categories={categories}
        selected="all"
        onSelect={() => {}}
      />
    );
    expect(screen.getByTestId('achievement-category-filter')).toBeInTheDocument();
  });

  it('shows all option', () => {
    render(
      <AchievementCategoryFilter
        categories={categories}
        selected="all"
        onSelect={() => {}}
      />
    );
    expect(screen.getByText(/all/i)).toBeInTheDocument();
  });

  it('shows category options', () => {
    render(
      <AchievementCategoryFilter
        categories={categories}
        selected="all"
        onSelect={() => {}}
      />
    );
    expect(screen.getByText(/streak/i)).toBeInTheDocument();
    expect(screen.getByText(/accuracy/i)).toBeInTheDocument();
    expect(screen.getByText(/volume/i)).toBeInTheDocument();
  });

  it('highlights selected category', () => {
    render(
      <AchievementCategoryFilter
        categories={categories}
        selected="streak"
        onSelect={() => {}}
      />
    );
    expect(screen.getByTestId('category-streak')).toHaveClass('selected');
  });

  it('calls onSelect when clicked', () => {
    const onSelect = vi.fn();
    render(
      <AchievementCategoryFilter
        categories={categories}
        selected="all"
        onSelect={onSelect}
      />
    );
    fireEvent.click(screen.getByText(/streak/i));
    expect(onSelect).toHaveBeenCalledWith('streak');
  });
});

// =============================================================================
// AchievementProgressCard Tests
// =============================================================================

describe('AchievementProgressCard', () => {
  it('renders progress card', () => {
    render(<AchievementProgressCard progress={mockProgress[0]!} definition={ACHIEVEMENT_DEFINITIONS[0]!} />);
    expect(screen.getByTestId('achievement-progress-card')).toBeInTheDocument();
  });

  it('shows progress bar', () => {
    render(<AchievementProgressCard progress={mockProgress[0]!} definition={ACHIEVEMENT_DEFINITIONS[0]!} />);
    expect(screen.getByTestId('progress-bar')).toBeInTheDocument();
  });

  it('shows percentage', () => {
    render(<AchievementProgressCard progress={mockProgress[0]!} definition={ACHIEVEMENT_DEFINITIONS[0]!} />);
    expect(screen.getByText(/71%/)).toBeInTheDocument();
  });

  it('shows completed state', () => {
    const completedDef = ACHIEVEMENT_DEFINITIONS.find((a) => a.id === 'forecasts-10') ?? ACHIEVEMENT_DEFINITIONS[0]!;
    render(<AchievementProgressCard progress={mockProgress[2]!} definition={completedDef} />);
    expect(screen.getAllByText(/completed/i).length).toBeGreaterThan(0);
  });
});

// =============================================================================
// AchievementMilestone Tests
// =============================================================================

describe('AchievementMilestone', () => {
  it('renders milestone', () => {
    render(
      <AchievementMilestone
        label="Next Goal"
        currentValue={5}
        milestoneValue={7}
        icon="🔥"
      />
    );
    expect(screen.getByTestId('achievement-milestone')).toBeInTheDocument();
  });

  it('shows label', () => {
    render(
      <AchievementMilestone
        label="Next Goal"
        currentValue={5}
        milestoneValue={7}
        icon="🔥"
      />
    );
    expect(screen.getByText('Next Goal')).toBeInTheDocument();
  });

  it('shows values', () => {
    render(
      <AchievementMilestone
        label="Next Goal"
        currentValue={5}
        milestoneValue={7}
        icon="🔥"
      />
    );
    expect(screen.getByText(/5/)).toBeInTheDocument();
    expect(screen.getByText(/7/)).toBeInTheDocument();
  });

  it('shows icon', () => {
    render(
      <AchievementMilestone
        label="Next Goal"
        currentValue={5}
        milestoneValue={7}
        icon="🔥"
      />
    );
    expect(screen.getByText('🔥')).toBeInTheDocument();
  });

  it('shows reached state when complete', () => {
    render(
      <AchievementMilestone
        label="Completed"
        currentValue={10}
        milestoneValue={7}
        icon="🔥"
      />
    );
    expect(screen.getByTestId('achievement-milestone')).toHaveClass('reached');
  });
});

// =============================================================================
// AchievementDefinitionsPage Tests
// =============================================================================

describe('AchievementDefinitionsPage', () => {
  it('renders page', () => {
    render(<AchievementDefinitionsPage progress={mockProgress} />);
    expect(screen.getByTestId('achievement-definitions-page')).toBeInTheDocument();
  });

  it('shows page title', () => {
    render(<AchievementDefinitionsPage progress={mockProgress} />);
    expect(screen.getAllByText(/achievements/i).length).toBeGreaterThan(0);
  });

  it('shows achievement list', () => {
    render(<AchievementDefinitionsPage progress={mockProgress} />);
    expect(screen.getByTestId('achievement-list')).toBeInTheDocument();
  });

  it('shows category filter', () => {
    render(<AchievementDefinitionsPage progress={mockProgress} />);
    expect(screen.getByTestId('achievement-category-filter')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    render(<AchievementDefinitionsPage progress={[]} loading={true} />);
    expect(screen.getByTestId('loading-indicator')).toBeInTheDocument();
  });

  it('filters achievements by category', () => {
    render(<AchievementDefinitionsPage progress={mockProgress} />);
    fireEvent.click(screen.getByTestId('category-streak'));
    const items = screen.getAllByTestId('achievement-list-item');
    const streakCount = ACHIEVEMENT_DEFINITIONS.filter((a) => a.category === 'streak').length;
    expect(items.length).toBe(streakCount);
  });
});

// =============================================================================
// useAchievementDefinitions Hook Tests
// =============================================================================

describe('useAchievementDefinitions', () => {
  function TestComponent({ progress }: { progress: AchievementProgress[] }) {
    const {
      definitions,
      filteredDefinitions,
      selectedCategory,
      setSelectedCategory,
      completedCount,
      totalCount,
      nextAchievement,
    } = useAchievementDefinitions(progress);

    return (
      <div>
        <span data-testid="total-definitions">{definitions.length}</span>
        <span data-testid="filtered-count">{filteredDefinitions.length}</span>
        <span data-testid="selected-category">{selectedCategory}</span>
        <span data-testid="completed-count">{completedCount}</span>
        <span data-testid="total-count">{totalCount}</span>
        <span data-testid="next-achievement">{nextAchievement?.id ?? 'none'}</span>
        <button onClick={() => setSelectedCategory('streak')}>Filter Streak</button>
        <button onClick={() => setSelectedCategory('all')}>Show All</button>
      </div>
    );
  }

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns all definitions', () => {
    render(<TestComponent progress={mockProgress} />);
    expect(Number(screen.getByTestId('total-definitions').textContent)).toBe(
      ACHIEVEMENT_DEFINITIONS.length
    );
  });

  it('defaults to all category', () => {
    render(<TestComponent progress={mockProgress} />);
    expect(screen.getByTestId('selected-category')).toHaveTextContent('all');
  });

  it('shows all definitions initially', () => {
    render(<TestComponent progress={mockProgress} />);
    expect(screen.getByTestId('filtered-count')).toHaveTextContent(
      String(ACHIEVEMENT_DEFINITIONS.length)
    );
  });

  it('filters by category', () => {
    render(<TestComponent progress={mockProgress} />);
    fireEvent.click(screen.getByText('Filter Streak'));
    const streakCount = ACHIEVEMENT_DEFINITIONS.filter((a) => a.category === 'streak').length;
    expect(screen.getByTestId('filtered-count')).toHaveTextContent(String(streakCount));
  });

  it('counts completed achievements', () => {
    render(<TestComponent progress={mockProgress} />);
    expect(screen.getByTestId('completed-count')).toHaveTextContent('2');
  });

  it('identifies next achievement', () => {
    render(<TestComponent progress={mockProgress} />);
    // Should be the closest to completion that isn't done
    expect(screen.getByTestId('next-achievement')).not.toHaveTextContent('none');
  });

  it('resets filter', () => {
    render(<TestComponent progress={mockProgress} />);
    fireEvent.click(screen.getByText('Filter Streak'));
    fireEvent.click(screen.getByText('Show All'));
    expect(screen.getByTestId('filtered-count')).toHaveTextContent(
      String(ACHIEVEMENT_DEFINITIONS.length)
    );
  });
});
