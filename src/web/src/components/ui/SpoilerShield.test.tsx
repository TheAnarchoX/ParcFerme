import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  SpoilerMask,
  SpoilerBlur,
  SpoilerPlaceholder,
  SpoilerRevealButton,
  SpoilerRevealDialog,
  SpoilerBadge,
  ExcitementMeter,
} from './SpoilerShield';
import {
  renderWithProviders,
  strictSpoilerState,
  moderateSpoilerState,
  noSpoilerProtectionState,
  loggedSessionSpoilerState,
  tempRevealedSpoilerState,
  authenticatedState,
} from '../../test/test-utils';

// Mock session IDs for testing
const TEST_SESSION_ID = 'session-123';
const LOGGED_SESSION_ID = 'session-logged';
const TEMP_REVEALED_SESSION_ID = 'session-temp';

// =========================
// SpoilerMask Tests
// =========================

describe('SpoilerMask', () => {
  describe('visibility states', () => {
    it('shows full content when spoiler mode is None', () => {
      renderWithProviders(
        <SpoilerMask sessionId={TEST_SESSION_ID}>
          <div data-testid="sensitive-content">Race Winner: Hamilton</div>
        </SpoilerMask>,
        {
          preloadedState: {
            ...authenticatedState,
            spoiler: noSpoilerProtectionState,
          },
        }
      );

      expect(screen.getByTestId('sensitive-content')).toBeInTheDocument();
      expect(screen.getByText('Race Winner: Hamilton')).toBeVisible();
    });

    it('shows full content when session is logged', () => {
      renderWithProviders(
        <SpoilerMask sessionId={LOGGED_SESSION_ID}>
          <div data-testid="sensitive-content">Race Winner: Hamilton</div>
        </SpoilerMask>,
        {
          preloadedState: {
            ...authenticatedState,
            spoiler: loggedSessionSpoilerState(LOGGED_SESSION_ID),
          },
        }
      );

      expect(screen.getByTestId('sensitive-content')).toBeInTheDocument();
      expect(screen.getByText('Race Winner: Hamilton')).toBeVisible();
    });

    it('shows full content when session is temporarily revealed', () => {
      renderWithProviders(
        <SpoilerMask sessionId={TEMP_REVEALED_SESSION_ID}>
          <div data-testid="sensitive-content">Race Winner: Hamilton</div>
        </SpoilerMask>,
        {
          preloadedState: {
            ...authenticatedState,
            spoiler: tempRevealedSpoilerState(TEMP_REVEALED_SESSION_ID),
          },
        }
      );

      expect(screen.getByTestId('sensitive-content')).toBeInTheDocument();
    });

    it('hides content and shows placeholder in Strict mode', () => {
      renderWithProviders(
        <SpoilerMask sessionId={TEST_SESSION_ID}>
          <div data-testid="sensitive-content">Race Winner: Hamilton</div>
        </SpoilerMask>,
        {
          preloadedState: {
            ...authenticatedState,
            spoiler: strictSpoilerState,
          },
        }
      );

      expect(screen.queryByTestId('sensitive-content')).not.toBeInTheDocument();
      expect(screen.getByText('Spoiler protection enabled')).toBeInTheDocument();
    });

    it('shows partial content with reveal button in Moderate mode', () => {
      renderWithProviders(
        <SpoilerMask
          sessionId={TEST_SESSION_ID}
          partialContent={<div data-testid="partial-content">Excitement: 8.5</div>}
        >
          <div data-testid="full-content">Race Winner: Hamilton</div>
        </SpoilerMask>,
        {
          preloadedState: {
            ...authenticatedState,
            spoiler: moderateSpoilerState,
          },
        }
      );

      // Should show partial content, not full content
      expect(screen.getByTestId('partial-content')).toBeInTheDocument();
      expect(screen.queryByTestId('full-content')).not.toBeInTheDocument();
      // Reveal button should be present for partial mode
      expect(screen.getByRole('button', { name: /reveal/i })).toBeInTheDocument();
    });
  });

  describe('custom placeholder', () => {
    it('renders custom placeholder when provided', () => {
      renderWithProviders(
        <SpoilerMask
          sessionId={TEST_SESSION_ID}
          placeholder={<div data-testid="custom-placeholder">Custom hidden message</div>}
        >
          <div>Hidden content</div>
        </SpoilerMask>,
        {
          preloadedState: {
            ...authenticatedState,
            spoiler: strictSpoilerState,
          },
        }
      );

      expect(screen.getByTestId('custom-placeholder')).toBeInTheDocument();
      expect(screen.getByText('Custom hidden message')).toBeVisible();
    });
  });

  describe('reveal functionality', () => {
    it('shows reveal button when content is hidden', () => {
      renderWithProviders(
        <SpoilerMask sessionId={TEST_SESSION_ID}>
          <div>Hidden content</div>
        </SpoilerMask>,
        {
          preloadedState: {
            ...authenticatedState,
            spoiler: strictSpoilerState,
          },
        }
      );

      expect(screen.getByRole('button', { name: /reveal/i })).toBeInTheDocument();
    });

    it('clicking reveal opens confirmation dialog', async () => {
      const user = userEvent.setup();

      renderWithProviders(
        <SpoilerMask sessionId={TEST_SESSION_ID}>
          <div>Hidden content</div>
        </SpoilerMask>,
        {
          preloadedState: {
            ...authenticatedState,
            spoiler: strictSpoilerState,
          },
        }
      );

      await user.click(screen.getByRole('button', { name: /reveal/i }));

      expect(screen.getByText('Reveal Spoilers?')).toBeInTheDocument();
    });

    it('does not show reveal button when allowTempReveal is false and using button text', () => {
      renderWithProviders(
        <SpoilerMask sessionId={TEST_SESSION_ID} allowTempReveal={false}>
          <div>Hidden content</div>
        </SpoilerMask>,
        {
          preloadedState: {
            ...authenticatedState,
            spoiler: strictSpoilerState,
          },
        }
      );

      // Button should say "Mark as Watched" instead of "Reveal"
      expect(screen.getByRole('button', { name: /mark as watched/i })).toBeInTheDocument();
    });
  });

  describe('styling', () => {
    it('applies custom className', () => {
      const { container } = renderWithProviders(
        <SpoilerMask sessionId={TEST_SESSION_ID} className="custom-class">
          <div>Content</div>
        </SpoilerMask>,
        {
          preloadedState: {
            ...authenticatedState,
            spoiler: noSpoilerProtectionState,
          },
        }
      );

      expect(container.firstChild).toHaveClass('custom-class');
    });
  });
});

// =========================
// SpoilerBlur Tests
// =========================

describe('SpoilerBlur', () => {
  describe('blur state', () => {
    it('renders without blur when content should be shown', () => {
      renderWithProviders(
        <SpoilerBlur sessionId={TEST_SESSION_ID}>
          <div data-testid="blurrable-content">Race Winner: Hamilton</div>
        </SpoilerBlur>,
        {
          preloadedState: {
            ...authenticatedState,
            spoiler: noSpoilerProtectionState,
          },
        }
      );

      const content = screen.getByTestId('blurrable-content');
      expect(content).toBeInTheDocument();
      // Parent should have no blur filter
      expect(content.parentElement).toHaveStyle({ filter: 'none' });
    });

    it('applies blur filter when content should be hidden', () => {
      renderWithProviders(
        <SpoilerBlur sessionId={TEST_SESSION_ID} blurAmount={8}>
          <div data-testid="blurrable-content">Race Winner: Hamilton</div>
        </SpoilerBlur>,
        {
          preloadedState: {
            ...authenticatedState,
            spoiler: strictSpoilerState,
          },
        }
      );

      const content = screen.getByTestId('blurrable-content');
      expect(content.parentElement).toHaveStyle({ filter: 'blur(8px)' });
    });

    it('uses custom blur amount', () => {
      renderWithProviders(
        <SpoilerBlur sessionId={TEST_SESSION_ID} blurAmount={16}>
          <div data-testid="blurrable-content">Content</div>
        </SpoilerBlur>,
        {
          preloadedState: {
            ...authenticatedState,
            spoiler: strictSpoilerState,
          },
        }
      );

      const content = screen.getByTestId('blurrable-content');
      expect(content.parentElement).toHaveStyle({ filter: 'blur(16px)' });
    });

    it('shows reveal button overlay when blurred', () => {
      renderWithProviders(
        <SpoilerBlur sessionId={TEST_SESSION_ID}>
          <div>Hidden content</div>
        </SpoilerBlur>,
        {
          preloadedState: {
            ...authenticatedState,
            spoiler: strictSpoilerState,
          },
        }
      );

      expect(screen.getByRole('button', { name: /reveal/i })).toBeInTheDocument();
    });

    it('does not show reveal overlay when not blurred', () => {
      renderWithProviders(
        <SpoilerBlur sessionId={TEST_SESSION_ID}>
          <div>Visible content</div>
        </SpoilerBlur>,
        {
          preloadedState: {
            ...authenticatedState,
            spoiler: noSpoilerProtectionState,
          },
        }
      );

      expect(screen.queryByRole('button', { name: /reveal/i })).not.toBeInTheDocument();
    });
  });

  describe('logged sessions', () => {
    it('does not blur logged sessions', () => {
      renderWithProviders(
        <SpoilerBlur sessionId={LOGGED_SESSION_ID}>
          <div data-testid="content">Race Winner: Hamilton</div>
        </SpoilerBlur>,
        {
          preloadedState: {
            ...authenticatedState,
            spoiler: loggedSessionSpoilerState(LOGGED_SESSION_ID),
          },
        }
      );

      const content = screen.getByTestId('content');
      expect(content.parentElement).toHaveStyle({ filter: 'none' });
    });
  });

  describe('styling', () => {
    it('applies custom className', () => {
      const { container } = renderWithProviders(
        <SpoilerBlur sessionId={TEST_SESSION_ID} className="blur-container">
          <div>Content</div>
        </SpoilerBlur>,
        {
          preloadedState: {
            ...authenticatedState,
            spoiler: strictSpoilerState,
          },
        }
      );

      expect(container.firstChild).toHaveClass('blur-container');
    });
  });
});

// =========================
// SpoilerPlaceholder Tests
// =========================

describe('SpoilerPlaceholder', () => {
  it('renders generic placeholder by default', () => {
    renderWithProviders(<SpoilerPlaceholder />);

    expect(screen.getByText('Spoiler protection enabled')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Spoiler shield' })).toHaveTextContent('🛡️');
  });

  it('renders result-specific placeholder', () => {
    renderWithProviders(<SpoilerPlaceholder type="result" />);

    expect(screen.getByText('Result hidden to avoid spoilers')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Spoiler shield' })).toHaveTextContent('🏁');
  });

  it('renders winner-specific placeholder', () => {
    renderWithProviders(<SpoilerPlaceholder type="winner" />);

    expect(screen.getByText('Winner hidden')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Spoiler shield' })).toHaveTextContent('🏆');
  });

  it('renders classification-specific placeholder', () => {
    renderWithProviders(<SpoilerPlaceholder type="classification" />);

    expect(screen.getByText('Classification hidden')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Spoiler shield' })).toHaveTextContent('📊');
  });

  it('applies custom className', () => {
    const { container } = renderWithProviders(
      <SpoilerPlaceholder className="custom-placeholder" />
    );

    expect(container.firstChild).toHaveClass('custom-placeholder');
  });
});

// =========================
// SpoilerRevealDialog Tests
// =========================

describe('SpoilerRevealDialog', () => {
  it('renders dialog with title and message', () => {
    const mockConfirm = vi.fn();
    const mockCancel = vi.fn();

    renderWithProviders(
      <SpoilerRevealDialog onConfirm={mockConfirm} onCancel={mockCancel} />
    );

    expect(screen.getByText('Reveal Spoilers?')).toBeInTheDocument();
    expect(
      screen.getByText(/are you sure you want to reveal the results/i)
    ).toBeInTheDocument();
  });

  it('calls onConfirm when "Yes, I\'ve watched this" is clicked', async () => {
    const user = userEvent.setup();
    const mockConfirm = vi.fn();
    const mockCancel = vi.fn();

    renderWithProviders(
      <SpoilerRevealDialog onConfirm={mockConfirm} onCancel={mockCancel} />
    );

    await user.click(screen.getByRole('button', { name: /yes, i've watched this/i }));

    expect(mockConfirm).toHaveBeenCalledTimes(1);
  });

  it('calls onCancel when Cancel is clicked', async () => {
    const user = userEvent.setup();
    const mockConfirm = vi.fn();
    const mockCancel = vi.fn();

    renderWithProviders(
      <SpoilerRevealDialog onConfirm={mockConfirm} onCancel={mockCancel} />
    );

    await user.click(screen.getByRole('button', { name: /cancel/i }));

    expect(mockCancel).toHaveBeenCalledTimes(1);
  });

  it('shows temp reveal option when onTempReveal is provided', () => {
    const mockConfirm = vi.fn();
    const mockCancel = vi.fn();
    const mockTempReveal = vi.fn();

    renderWithProviders(
      <SpoilerRevealDialog
        onConfirm={mockConfirm}
        onCancel={mockCancel}
        onTempReveal={mockTempReveal}
      />
    );

    expect(screen.getByRole('button', { name: /just peek/i })).toBeInTheDocument();
  });

  it('calls onTempReveal when "Just peek" is clicked', async () => {
    const user = userEvent.setup();
    const mockConfirm = vi.fn();
    const mockCancel = vi.fn();
    const mockTempReveal = vi.fn();

    renderWithProviders(
      <SpoilerRevealDialog
        onConfirm={mockConfirm}
        onCancel={mockCancel}
        onTempReveal={mockTempReveal}
      />
    );

    await user.click(screen.getByRole('button', { name: /just peek/i }));

    expect(mockTempReveal).toHaveBeenCalledTimes(1);
  });

  it('hides temp reveal option when onTempReveal is not provided', () => {
    const mockConfirm = vi.fn();
    const mockCancel = vi.fn();

    renderWithProviders(
      <SpoilerRevealDialog onConfirm={mockConfirm} onCancel={mockCancel} />
    );

    expect(screen.queryByRole('button', { name: /just peek/i })).not.toBeInTheDocument();
  });

  it('disables buttons and shows loading state when isLoading', () => {
    const mockConfirm = vi.fn();
    const mockCancel = vi.fn();
    const mockTempReveal = vi.fn();

    renderWithProviders(
      <SpoilerRevealDialog
        onConfirm={mockConfirm}
        onCancel={mockCancel}
        onTempReveal={mockTempReveal}
        isLoading={true}
      />
    );

    expect(screen.getByRole('button', { name: /revealing/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /just peek/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeDisabled();
  });
});

// =========================
// SpoilerRevealButton Tests
// =========================

describe('SpoilerRevealButton', () => {
  it('renders with default text when allowTempReveal is true', () => {
    renderWithProviders(
      <SpoilerRevealButton sessionId={TEST_SESSION_ID} />,
      {
        preloadedState: {
          ...authenticatedState,
          spoiler: strictSpoilerState,
        },
      }
    );

    expect(screen.getByRole('button', { name: /reveal/i })).toBeInTheDocument();
  });

  it('renders "Mark as Watched" when allowTempReveal is false', () => {
    renderWithProviders(
      <SpoilerRevealButton sessionId={TEST_SESSION_ID} allowTempReveal={false} />,
      {
        preloadedState: {
          ...authenticatedState,
          spoiler: strictSpoilerState,
        },
      }
    );

    expect(screen.getByRole('button', { name: /mark as watched/i })).toBeInTheDocument();
  });

  it('renders with custom text', () => {
    renderWithProviders(
      <SpoilerRevealButton sessionId={TEST_SESSION_ID} text="Show Results" />,
      {
        preloadedState: {
          ...authenticatedState,
          spoiler: strictSpoilerState,
        },
      }
    );

    expect(screen.getByRole('button', { name: /show results/i })).toBeInTheDocument();
  });

  it('applies size classes correctly', () => {
    renderWithProviders(
      <SpoilerRevealButton sessionId={TEST_SESSION_ID} size="sm" />,
      {
        preloadedState: {
          ...authenticatedState,
          spoiler: strictSpoilerState,
        },
      }
    );

    expect(screen.getByRole('button')).toHaveClass('px-2', 'py-1', 'text-xs');
  });

  it('opens dialog on click', async () => {
    const user = userEvent.setup();

    renderWithProviders(
      <SpoilerRevealButton sessionId={TEST_SESSION_ID} />,
      {
        preloadedState: {
          ...authenticatedState,
          spoiler: strictSpoilerState,
        },
      }
    );

    await user.click(screen.getByRole('button', { name: /reveal/i }));

    expect(screen.getByText('Reveal Spoilers?')).toBeInTheDocument();
  });
});

// =========================
// SpoilerBadge Tests
// =========================

describe('SpoilerBadge', () => {
  it('renders nothing when containsSpoilers is false', () => {
    const { container } = renderWithProviders(
      <SpoilerBadge containsSpoilers={false} />
    );

    expect(container.firstChild).toBeNull();
  });

  it('renders badge when containsSpoilers is true', () => {
    renderWithProviders(<SpoilerBadge containsSpoilers={true} />);

    expect(screen.getByText('Spoilers')).toBeInTheDocument();
    expect(screen.getByText('⚠️')).toBeInTheDocument();
  });

  it('applies correct size classes for sm', () => {
    const { container } = renderWithProviders(
      <SpoilerBadge containsSpoilers={true} size="sm" />
    );

    const badge = container.querySelector('span.inline-flex');
    expect(badge).toHaveClass('px-1.5', 'py-0.5');
  });

  it('applies correct size classes for md', () => {
    const { container } = renderWithProviders(
      <SpoilerBadge containsSpoilers={true} size="md" />
    );

    const badge = container.querySelector('span.inline-flex');
    expect(badge).toHaveClass('px-2', 'py-1');
  });

  it('applies custom className', () => {
    const { container } = renderWithProviders(
      <SpoilerBadge containsSpoilers={true} className="custom-badge" />
    );

    const badge = container.querySelector('span.inline-flex');
    expect(badge).toHaveClass('custom-badge');
  });
});

// =========================
// ExcitementMeter Tests
// =========================

describe('ExcitementMeter', () => {
  it('shows "No ratings yet" when rating is null', () => {
    renderWithProviders(<ExcitementMeter rating={null} />);

    expect(screen.getByText('No ratings yet')).toBeInTheDocument();
  });

  it('shows "No ratings yet" when rating is undefined', () => {
    renderWithProviders(<ExcitementMeter rating={undefined} />);

    expect(screen.getByText('No ratings yet')).toBeInTheDocument();
  });

  it('renders rating value when showValue is true (default)', () => {
    renderWithProviders(<ExcitementMeter rating={7.5} />);

    expect(screen.getByText('7.5')).toBeInTheDocument();
  });

  it('hides rating value when showValue is false', () => {
    renderWithProviders(<ExcitementMeter rating={7.5} showValue={false} />);

    expect(screen.queryByText('7.5')).not.toBeInTheDocument();
  });

  it('renders correct progress bar width for rating', () => {
    const { container } = renderWithProviders(<ExcitementMeter rating={8} />);

    // 8/10 = 80%
    const progressBar = container.querySelector('[style*="width: 80%"]');
    expect(progressBar).toBeInTheDocument();
  });

  it('applies green color for high ratings (>=8)', () => {
    const { container } = renderWithProviders(<ExcitementMeter rating={8} />);

    const progressBar = container.querySelector('.bg-pf-green');
    expect(progressBar).toBeInTheDocument();
  });

  it('applies yellow color for good ratings (6-7.9)', () => {
    const { container } = renderWithProviders(<ExcitementMeter rating={7} />);

    const progressBar = container.querySelector('.bg-yellow-500');
    expect(progressBar).toBeInTheDocument();
  });

  it('applies orange color for average ratings (4-5.9)', () => {
    const { container } = renderWithProviders(<ExcitementMeter rating={5} />);

    const progressBar = container.querySelector('.bg-orange-500');
    expect(progressBar).toBeInTheDocument();
  });

  it('applies red color for low ratings (<4)', () => {
    const { container } = renderWithProviders(<ExcitementMeter rating={3} />);

    const progressBar = container.querySelector('.bg-pf-red');
    expect(progressBar).toBeInTheDocument();
  });

  it('clamps percentage to valid range', () => {
    // Rating above 10 should cap at 100%
    const { container: highContainer } = renderWithProviders(
      <ExcitementMeter rating={12} />
    );
    expect(highContainer.querySelector('[style*="width: 100%"]')).toBeInTheDocument();

    // Rating below 0 should floor at 0%
    const { container: lowContainer } = renderWithProviders(
      <ExcitementMeter rating={-1} />
    );
    expect(lowContainer.querySelector('[style*="width: 0%"]')).toBeInTheDocument();
  });

  it('applies correct size classes', () => {
    const { container: smContainer } = renderWithProviders(
      <ExcitementMeter rating={7} size="sm" />
    );
    expect(smContainer.querySelector('.h-1\\.5')).toBeInTheDocument();

    const { container: lgContainer } = renderWithProviders(
      <ExcitementMeter rating={7} size="lg" />
    );
    expect(lgContainer.querySelector('.h-3')).toBeInTheDocument();
  });

  it('has proper title attribute for accessibility', () => {
    const { container } = renderWithProviders(<ExcitementMeter rating={8.5} />);

    const progressContainer = container.querySelector('[title="Excitement: 8.5/10"]');
    expect(progressContainer).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = renderWithProviders(
      <ExcitementMeter rating={7} className="custom-meter" />
    );

    expect(container.firstChild).toHaveClass('custom-meter');
  });
});

// =========================
// Integration Tests
// =========================

describe('Spoiler Shield Integration', () => {
  it('SpoilerMask with SpoilerBlur work together', () => {
    renderWithProviders(
      <SpoilerMask sessionId={TEST_SESSION_ID}>
        <SpoilerBlur sessionId={TEST_SESSION_ID}>
          <div data-testid="deeply-nested">Secret Winner</div>
        </SpoilerBlur>
      </SpoilerMask>,
      {
        preloadedState: {
          ...authenticatedState,
          spoiler: strictSpoilerState,
        },
      }
    );

    // Content should be hidden
    expect(screen.queryByTestId('deeply-nested')).not.toBeInTheDocument();
  });

  it('shows ExcitementMeter even when other content is masked', () => {
    renderWithProviders(
      <div>
        <ExcitementMeter rating={8.5} />
        <SpoilerMask sessionId={TEST_SESSION_ID}>
          <div data-testid="hidden-results">Race results here</div>
        </SpoilerMask>
      </div>,
      {
        preloadedState: {
          ...authenticatedState,
          spoiler: strictSpoilerState,
        },
      }
    );

    // ExcitementMeter is always visible (spoiler-safe)
    expect(screen.getByText('8.5')).toBeInTheDocument();
    // Results are hidden
    expect(screen.queryByTestId('hidden-results')).not.toBeInTheDocument();
  });
});
