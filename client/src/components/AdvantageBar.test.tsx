import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AdvantageBar } from './AdvantageBar';

describe('AdvantageBar', () => {
  it('renders neutral state when no evaluation', () => {
    const { container } = render(<AdvantageBar evaluation={null} />);
    const whiteBar = container.querySelector('.bg-white');
    expect(whiteBar).toHaveStyle({ height: '50%' });
  });

  it('renders white advantage correctly', () => {
    const evalData = { score: 150, isMate: false, depth: 10 }; // +1.5
    render(<AdvantageBar evaluation={evalData} />);
    
    expect(screen.getByText('+1.5')).toBeInTheDocument();
    expect(screen.getByText('D10')).toBeInTheDocument();
  });

  it('renders black advantage correctly', () => {
    const evalData = { score: -200, isMate: false, depth: 15 }; // -2.0
    render(<AdvantageBar evaluation={evalData} />);
    
    expect(screen.getByText('-2.0')).toBeInTheDocument();
  });

  it('renders mate correctly', () => {
    const evalData = { score: 0, isMate: true, mateIn: 3, depth: 20 };
    render(<AdvantageBar evaluation={evalData} />);
    
    expect(screen.getByText('M3')).toBeInTheDocument();
  });

  it('clamps scores at +/- 5.0 pawns using 5-95% range', () => {
    const { container, rerender } = render(<AdvantageBar evaluation={{ score: 600, isMate: false, depth: 10 }} />);
    let whiteBar = container.querySelector('.bg-white');
    // 6.0 is clamped to 5.0, rawPct 100, then 5 + 100*0.9 = 95%
    expect(whiteBar).toHaveStyle({ height: '95%' });

    rerender(<AdvantageBar evaluation={{ score: -600, isMate: false, depth: 10 }} />);
    whiteBar = container.querySelector('.bg-white');
    // -6.0 is clamped to -5.0, rawPct 0, then 5 + 0*0.9 = 5%
    expect(whiteBar).toHaveStyle({ height: '5%' });
  });

  it('still uses 0% and 100% for mate', () => {
    const { container, rerender } = render(<AdvantageBar evaluation={{ score: 0, isMate: true, mateIn: 1, depth: 10 }} />);
    let whiteBar = container.querySelector('.bg-white');
    expect(whiteBar).toHaveStyle({ height: '100%' });

    rerender(<AdvantageBar evaluation={{ score: 0, isMate: true, mateIn: -1, depth: 10 }} />);
    whiteBar = container.querySelector('.bg-white');
    expect(whiteBar).toHaveStyle({ height: '0%' });
  });
});
