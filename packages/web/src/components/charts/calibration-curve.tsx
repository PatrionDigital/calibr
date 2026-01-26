'use client';

import { useEffect, useRef, useMemo } from 'react';
import * as d3 from 'd3';

// =============================================================================
// Types
// =============================================================================

export interface CalibrationBucket {
  binStart: number;
  binEnd: number;
  binCenter: number;
  forecastCount: number;
  outcomeRate: number;
  avgForecast: number;
}

export interface CalibrationData {
  buckets: CalibrationBucket[];
  overconfidenceScore: number;
  underconfidenceScore: number;
  calibrationError: number;
  totalForecasts: number;
}

export interface CalibrationCurveProps {
  calibrationData: CalibrationData | null;
  width?: number;
  height?: number;
  showConfidenceInterval?: boolean;
}

// =============================================================================
// Constants
// =============================================================================

const MARGIN = { top: 20, right: 20, bottom: 40, left: 50 };

// =============================================================================
// Component
// =============================================================================

export function CalibrationCurve({
  calibrationData,
  width = 400,
  height = 300,
  showConfidenceInterval = true,
}: CalibrationCurveProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  const innerWidth = width - MARGIN.left - MARGIN.right;
  const innerHeight = height - MARGIN.top - MARGIN.bottom;

  // Get CSS variable values
  const getCssVar = (name: string): string => {
    if (typeof window === 'undefined') return '';
    const value = getComputedStyle(document.documentElement)
      .getPropertyValue(name)
      .trim();
    return value ? `hsl(${value})` : '';
  };

  const colors = useMemo(() => ({
    primary: 'hsl(120, 100%, 50%)',
    muted: 'hsl(120, 100%, 25%)',
    mutedForeground: 'hsl(120, 100%, 40%)',
    info: 'hsl(180, 100%, 50%)',
    warning: 'hsl(45, 100%, 50%)',
    background: 'hsl(0, 0%, 0%)',
  }), []);

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    // Create scales
    const xScale = d3.scaleLinear().domain([0, 1]).range([0, innerWidth]);
    const yScale = d3.scaleLinear().domain([0, 1]).range([innerHeight, 0]);

    // Create main group
    const g = svg
      .append('g')
      .attr('transform', `translate(${MARGIN.left},${MARGIN.top})`);

    // Grid lines
    const gridLines = 5;
    for (let i = 0; i <= gridLines; i++) {
      const y = (i / gridLines) * innerHeight;
      const x = (i / gridLines) * innerWidth;

      // Horizontal grid
      g.append('line')
        .attr('x1', 0)
        .attr('y1', y)
        .attr('x2', innerWidth)
        .attr('y2', y)
        .attr('stroke', colors.muted)
        .attr('stroke-width', 0.5)
        .attr('stroke-dasharray', '2,2');

      // Vertical grid
      g.append('line')
        .attr('x1', x)
        .attr('y1', 0)
        .attr('x2', x)
        .attr('y2', innerHeight)
        .attr('stroke', colors.muted)
        .attr('stroke-width', 0.5)
        .attr('stroke-dasharray', '2,2');
    }

    // Perfect calibration line (diagonal)
    g.append('line')
      .attr('x1', 0)
      .attr('y1', innerHeight)
      .attr('x2', innerWidth)
      .attr('y2', 0)
      .attr('stroke', colors.mutedForeground)
      .attr('stroke-width', 1)
      .attr('stroke-dasharray', '4,4');

    // Draw calibration curve if data exists
    if (calibrationData && calibrationData.buckets.length > 0) {
      const buckets = calibrationData.buckets.filter((b) => b.forecastCount > 0);

      // Confidence interval (if enabled)
      if (showConfidenceInterval && buckets.length > 0) {
        const areaGenerator = d3
          .area<CalibrationBucket>()
          .x((d) => xScale(d.avgForecast))
          .y0((d) => {
            // Lower bound using Wilson score interval approximation
            const n = d.forecastCount;
            const p = d.outcomeRate;
            const z = 1.96; // 95% confidence
            const denominator = 1 + z * z / n;
            const center = p + z * z / (2 * n);
            const spread = z * Math.sqrt((p * (1 - p) + z * z / (4 * n)) / n);
            const lower = Math.max(0, (center - spread) / denominator);
            return yScale(lower);
          })
          .y1((d) => {
            const n = d.forecastCount;
            const p = d.outcomeRate;
            const z = 1.96;
            const denominator = 1 + z * z / n;
            const center = p + z * z / (2 * n);
            const spread = z * Math.sqrt((p * (1 - p) + z * z / (4 * n)) / n);
            const upper = Math.min(1, (center + spread) / denominator);
            return yScale(upper);
          })
          .curve(d3.curveMonotoneX);

        g.append('path')
          .datum(buckets)
          .attr('d', areaGenerator)
          .attr('fill', colors.primary)
          .attr('fill-opacity', 0.1)
          .attr('stroke', 'none');
      }

      // Main calibration line
      const lineGenerator = d3
        .line<CalibrationBucket>()
        .x((d) => xScale(d.avgForecast))
        .y((d) => yScale(d.outcomeRate))
        .curve(d3.curveMonotoneX);

      g.append('path')
        .datum(buckets)
        .attr('d', lineGenerator)
        .attr('fill', 'none')
        .attr('stroke', colors.primary)
        .attr('stroke-width', 2);

      // Bucket indicators (dots)
      g.selectAll('.bucket-dot')
        .data(buckets)
        .enter()
        .append('circle')
        .attr('class', 'bucket-dot')
        .attr('cx', (d) => xScale(d.avgForecast))
        .attr('cy', (d) => yScale(d.outcomeRate))
        .attr('r', (d) => Math.min(8, Math.max(3, Math.sqrt(d.forecastCount))))
        .attr('fill', colors.primary)
        .attr('stroke', colors.background)
        .attr('stroke-width', 1);

      // Bucket count labels
      g.selectAll('.bucket-label')
        .data(buckets.filter((b) => b.forecastCount >= 5))
        .enter()
        .append('text')
        .attr('class', 'bucket-label')
        .attr('x', (d) => xScale(d.avgForecast))
        .attr('y', (d) => yScale(d.outcomeRate) - 12)
        .attr('text-anchor', 'middle')
        .attr('fill', colors.mutedForeground)
        .attr('font-size', '9px')
        .attr('font-family', 'IBM Plex Mono, monospace')
        .text((d) => `n=${d.forecastCount}`);
    }

    // X-axis
    const xAxis = d3
      .axisBottom(xScale)
      .ticks(5)
      .tickFormat((d) => `${(d as number) * 100}%`);

    g.append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(xAxis)
      .attr('color', colors.mutedForeground)
      .selectAll('text')
      .attr('font-family', 'IBM Plex Mono, monospace')
      .attr('font-size', '10px');

    // X-axis label
    g.append('text')
      .attr('x', innerWidth / 2)
      .attr('y', innerHeight + 35)
      .attr('text-anchor', 'middle')
      .attr('fill', colors.mutedForeground)
      .attr('font-family', 'IBM Plex Mono, monospace')
      .attr('font-size', '10px')
      .text('PREDICTED PROBABILITY');

    // Y-axis
    const yAxis = d3
      .axisLeft(yScale)
      .ticks(5)
      .tickFormat((d) => `${(d as number) * 100}%`);

    g.append('g')
      .call(yAxis)
      .attr('color', colors.mutedForeground)
      .selectAll('text')
      .attr('font-family', 'IBM Plex Mono, monospace')
      .attr('font-size', '10px');

    // Y-axis label
    g.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('x', -innerHeight / 2)
      .attr('y', -40)
      .attr('text-anchor', 'middle')
      .attr('fill', colors.mutedForeground)
      .attr('font-family', 'IBM Plex Mono, monospace')
      .attr('font-size', '10px')
      .text('ACTUAL FREQUENCY');

    // Legend for perfect calibration
    g.append('line')
      .attr('x1', innerWidth - 80)
      .attr('y1', 10)
      .attr('x2', innerWidth - 60)
      .attr('y2', 10)
      .attr('stroke', colors.mutedForeground)
      .attr('stroke-width', 1)
      .attr('stroke-dasharray', '4,4');

    g.append('text')
      .attr('x', innerWidth - 55)
      .attr('y', 14)
      .attr('fill', colors.mutedForeground)
      .attr('font-family', 'IBM Plex Mono, monospace')
      .attr('font-size', '9px')
      .text('PERFECT');
  }, [calibrationData, innerWidth, innerHeight, showConfidenceInterval, colors]);

  return (
    <div className="ascii-box overflow-hidden">
      {/* Header */}
      <div className="border-b border-[hsl(var(--border))] p-2 bg-[hsl(var(--accent))] flex justify-between items-center">
        <span className="text-[hsl(var(--muted-foreground))] text-xs font-mono">
          CALIBRATION CURVE
        </span>
        {calibrationData && (
          <div className="flex gap-4 text-xs font-mono">
            <span className="text-[hsl(var(--info))]">
              ECE: {(calibrationData.calibrationError * 100).toFixed(1)}%
            </span>
            <span className="text-[hsl(var(--foreground))]">
              n={calibrationData.totalForecasts}
            </span>
          </div>
        )}
      </div>

      {/* Chart */}
      <div className="p-2 flex justify-center">
        {calibrationData && calibrationData.buckets.length > 0 ? (
          <svg
            ref={svgRef}
            width={width}
            height={height}
            className="overflow-visible"
          />
        ) : (
          <div
            className="flex items-center justify-center text-[hsl(var(--muted-foreground))] text-xs font-mono"
            style={{ width, height }}
          >
            [INSUFFICIENT DATA FOR CALIBRATION CURVE]
          </div>
        )}
      </div>

      {/* Footer - Calibration stats */}
      {calibrationData && calibrationData.buckets.length > 0 && (
        <div className="border-t border-[hsl(var(--border))] p-2 flex justify-between text-xs font-mono text-[hsl(var(--muted-foreground))]">
          <span>
            OVERCONFIDENCE:{' '}
            <span
              className={
                calibrationData.overconfidenceScore > 0.05
                  ? 'text-[hsl(var(--warning))]'
                  : 'text-[hsl(var(--bullish))]'
              }
            >
              {(calibrationData.overconfidenceScore * 100).toFixed(1)}%
            </span>
          </span>
          <span>
            UNDERCONFIDENCE:{' '}
            <span
              className={
                calibrationData.underconfidenceScore > 0.05
                  ? 'text-[hsl(var(--warning))]'
                  : 'text-[hsl(var(--bullish))]'
              }
            >
              {(calibrationData.underconfidenceScore * 100).toFixed(1)}%
            </span>
          </span>
        </div>
      )}
    </div>
  );
}
