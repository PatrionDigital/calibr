'use client';

import { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import * as d3 from 'd3';

// =============================================================================
// Types
// =============================================================================

export interface PriceDataPoint {
  date: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  yesPrice?: number;
  noPrice?: number;
}

export type TimeRange = '1H' | '24H' | '7D' | '30D' | 'ALL';
export type ChartType = 'line' | 'candlestick';

export interface PriceChartProps {
  marketId: string;
  data: PriceDataPoint[];
  timeRange?: TimeRange;
  chartType?: ChartType;
  width?: number;
  height?: number;
  onTimeRangeChange?: (range: TimeRange) => void;
}

// =============================================================================
// Constants
// =============================================================================

const TIME_RANGES: TimeRange[] = ['1H', '24H', '7D', '30D', 'ALL'];
const MARGIN = { top: 20, right: 60, bottom: 30, left: 10 };

const CHART_COLORS = {
  background: '#000000',
  gridLine: 'rgba(0, 255, 0, 0.1)',
  axis: 'rgba(0, 255, 0, 0.5)',
  crosshair: 'rgba(0, 255, 0, 0.3)',
  yesLine: '#00ff00',
  noLine: '#ff0000',
  candleUp: '#00ff00',
  candleDown: '#ff0000',
};

// =============================================================================
// D3 Chart Component
// =============================================================================

interface D3ChartProps {
  data: PriceDataPoint[];
  chartType: ChartType;
  width: number;
  height: number;
}

function D3Chart({ data, chartType, width, height }: D3ChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    data: PriceDataPoint;
  } | null>(null);

  const innerWidth = width - MARGIN.left - MARGIN.right;
  const innerHeight = height - MARGIN.top - MARGIN.bottom;

  useEffect(() => {
    if (!svgRef.current || data.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    // Create scales
    const xScale = d3
      .scaleTime()
      .domain(d3.extent(data, (d) => d.date) as [Date, Date])
      .range([0, innerWidth]);

    const getPriceExtent = (): [number, number] => {
      if (chartType === 'candlestick') {
        const min = d3.min(data, (d) => d.low) ?? 0;
        const max = d3.max(data, (d) => d.high) ?? 1;
        return [min * 0.98, max * 1.02];
      }
      const prices = data.flatMap((d) => [
        d.yesPrice ?? d.close,
        d.noPrice ?? 1 - (d.yesPrice ?? d.close),
      ]);
      const min = d3.min(prices) ?? 0;
      const max = d3.max(prices) ?? 1;
      return [Math.max(0, min - 0.02), Math.min(1, max + 0.02)];
    };

    const [yMin, yMax] = getPriceExtent();
    const yScale = d3.scaleLinear().domain([yMin, yMax]).range([innerHeight, 0]);

    // Create main group
    const g = svg
      .append('g')
      .attr('transform', `translate(${MARGIN.left},${MARGIN.top})`);

    // Grid lines
    const gridLines = 5;
    for (let i = 0; i <= gridLines; i++) {
      const y = (i / gridLines) * innerHeight;
      g.append('line')
        .attr('x1', 0)
        .attr('y1', y)
        .attr('x2', innerWidth)
        .attr('y2', y)
        .attr('stroke', CHART_COLORS.gridLine)
        .attr('stroke-width', 1);
    }

    if (chartType === 'candlestick') {
      // Draw candlesticks
      const candleWidth = Math.max(1, Math.min(10, innerWidth / data.length - 2));

      g.selectAll('.candle')
        .data(data)
        .enter()
        .append('g')
        .attr('class', 'candle')
        .each(function (d) {
          const x = xScale(d.date);
          const isUp = d.close >= d.open;
          const color = isUp ? CHART_COLORS.candleUp : CHART_COLORS.candleDown;

          // Wick
          d3.select(this)
            .append('line')
            .attr('x1', x)
            .attr('y1', yScale(d.high))
            .attr('x2', x)
            .attr('y2', yScale(d.low))
            .attr('stroke', color)
            .attr('stroke-width', 1);

          // Body
          const openY = yScale(d.open);
          const closeY = yScale(d.close);
          d3.select(this)
            .append('rect')
            .attr('x', x - candleWidth / 2)
            .attr('y', Math.min(openY, closeY))
            .attr('width', candleWidth)
            .attr('height', Math.max(1, Math.abs(openY - closeY)))
            .attr('fill', color)
            .attr('stroke', color);
        });
    } else {
      // Draw YES line
      const yesLine = d3
        .line<PriceDataPoint>()
        .x((d) => xScale(d.date))
        .y((d) => yScale(d.yesPrice ?? d.close))
        .curve(d3.curveMonotoneX);

      g.append('path')
        .datum(data)
        .attr('d', yesLine)
        .attr('fill', 'none')
        .attr('stroke', CHART_COLORS.yesLine)
        .attr('stroke-width', 2);

      // Draw NO line (dashed)
      const noLine = d3
        .line<PriceDataPoint>()
        .x((d) => xScale(d.date))
        .y((d) => yScale(d.noPrice ?? 1 - (d.yesPrice ?? d.close)))
        .curve(d3.curveMonotoneX);

      g.append('path')
        .datum(data)
        .attr('d', noLine)
        .attr('fill', 'none')
        .attr('stroke', CHART_COLORS.noLine)
        .attr('stroke-width', 1)
        .attr('stroke-dasharray', '4,2');

      // Area fill under YES line
      const yesArea = d3
        .area<PriceDataPoint>()
        .x((d) => xScale(d.date))
        .y0(innerHeight)
        .y1((d) => yScale(d.yesPrice ?? d.close))
        .curve(d3.curveMonotoneX);

      g.append('path')
        .datum(data)
        .attr('d', yesArea)
        .attr('fill', CHART_COLORS.yesLine)
        .attr('fill-opacity', 0.05);
    }

    // X-axis
    const xAxis = d3
      .axisBottom(xScale)
      .ticks(5)
      .tickFormat((d) => d3.timeFormat('%H:%M')(d as Date));

    g.append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(xAxis)
      .attr('color', CHART_COLORS.axis)
      .selectAll('text')
      .attr('font-family', 'IBM Plex Mono, monospace')
      .attr('font-size', '10px');

    // Y-axis (right side)
    const yAxis = d3
      .axisRight(yScale)
      .ticks(5)
      .tickFormat((d) => `${((d as number) * 100).toFixed(0)}%`);

    g.append('g')
      .attr('transform', `translate(${innerWidth},0)`)
      .call(yAxis)
      .attr('color', CHART_COLORS.axis)
      .selectAll('text')
      .attr('font-family', 'IBM Plex Mono, monospace')
      .attr('font-size', '10px');

    // Crosshair and tooltip
    const crosshairGroup = g.append('g').style('display', 'none');

    crosshairGroup
      .append('line')
      .attr('class', 'crosshair-x')
      .attr('y1', 0)
      .attr('y2', innerHeight)
      .attr('stroke', CHART_COLORS.crosshair)
      .attr('stroke-width', 1)
      .attr('stroke-dasharray', '3,3');

    crosshairGroup
      .append('line')
      .attr('class', 'crosshair-y')
      .attr('x1', 0)
      .attr('x2', innerWidth)
      .attr('stroke', CHART_COLORS.crosshair)
      .attr('stroke-width', 1)
      .attr('stroke-dasharray', '3,3');

    // Overlay for mouse events
    g.append('rect')
      .attr('width', innerWidth)
      .attr('height', innerHeight)
      .attr('fill', 'transparent')
      .on('mousemove', (event) => {
        const [mouseX] = d3.pointer(event);
        const x0 = xScale.invert(mouseX);
        const bisect = d3.bisector<PriceDataPoint, Date>((d) => d.date).left;
        const index = bisect(data, x0, 1);
        const d0 = data[index - 1];
        const d1 = data[index];
        const d =
          d0 && d1
            ? x0.getTime() - d0.date.getTime() > d1.date.getTime() - x0.getTime()
              ? d1
              : d0
            : d0 || d1;

        if (d) {
          const cx = xScale(d.date);
          const cy = yScale(d.yesPrice ?? d.close);

          crosshairGroup.style('display', null);
          crosshairGroup.select('.crosshair-x').attr('x1', cx).attr('x2', cx);
          crosshairGroup.select('.crosshair-y').attr('y1', cy).attr('y2', cy);

          setTooltip({ x: cx + MARGIN.left, y: cy + MARGIN.top, data: d });
        }
      })
      .on('mouseleave', () => {
        crosshairGroup.style('display', 'none');
        setTooltip(null);
      });
  }, [data, chartType, innerWidth, innerHeight]);

  if (data.length === 0) {
    return (
      <div
        className="flex items-center justify-center text-[hsl(var(--muted-foreground))] text-xs font-mono"
        style={{ width, height }}
      >
        [NO PRICE DATA]
      </div>
    );
  }

  return (
    <div className="relative">
      <svg
        ref={svgRef}
        width={width}
        height={height}
        style={{ backgroundColor: CHART_COLORS.background }}
      />
      {tooltip && (
        <div
          className="absolute pointer-events-none bg-[hsl(var(--accent))] border border-[hsl(var(--border))] p-2 text-xs font-mono z-10"
          style={{
            left: Math.min(tooltip.x + 10, width - 150),
            top: tooltip.y - 60,
          }}
        >
          <div className="text-[hsl(var(--muted-foreground))]">
            {d3.timeFormat('%Y-%m-%d %H:%M')(tooltip.data.date)}
          </div>
          <div className="text-[hsl(var(--bullish))]">
            YES: {((tooltip.data.yesPrice ?? tooltip.data.close) * 100).toFixed(1)}%
          </div>
          <div className="text-[hsl(var(--bearish))]">
            NO:{' '}
            {(
              (tooltip.data.noPrice ?? 1 - (tooltip.data.yesPrice ?? tooltip.data.close)) *
              100
            ).toFixed(1)}
            %
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export function PriceChart({
  marketId,
  data,
  timeRange: initialTimeRange = '24H',
  chartType: initialChartType = 'line',
  width = 600,
  height = 300,
  onTimeRangeChange,
}: PriceChartProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>(initialTimeRange);
  const [chartType, setChartType] = useState<ChartType>(initialChartType);

  const handleTimeRangeChange = useCallback(
    (range: TimeRange) => {
      setTimeRange(range);
      onTimeRangeChange?.(range);
    },
    [onTimeRangeChange]
  );

  // Filter data based on time range
  const filteredData = useMemo(() => {
    if (data.length === 0) return [];

    const now = new Date();
    let cutoff: Date;

    switch (timeRange) {
      case '1H':
        cutoff = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      case '24H':
        cutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7D':
        cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30D':
        cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case 'ALL':
      default:
        return data;
    }

    return data.filter((d) => d.date >= cutoff);
  }, [data, timeRange]);

  // Calculate price change
  const priceChange = useMemo(() => {
    if (filteredData.length < 2) return null;
    const first = filteredData[0];
    const last = filteredData[filteredData.length - 1];
    if (!first || !last) return null;
    const startPrice = first.yesPrice ?? first.close;
    const endPrice = last.yesPrice ?? last.close;
    const change = endPrice - startPrice;
    const changePercent = startPrice > 0 ? (change / startPrice) * 100 : 0;
    return { change, changePercent, startPrice, endPrice };
  }, [filteredData]);

  const currentPrice = useMemo(() => {
    if (filteredData.length === 0) return null;
    const last = filteredData[filteredData.length - 1];
    if (!last) return null;
    return last.yesPrice ?? last.close;
  }, [filteredData]);

  return (
    <div className="ascii-box overflow-hidden">
      {/* Header */}
      <div className="border-b border-[hsl(var(--border))] p-2 bg-[hsl(var(--accent))]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-[hsl(var(--muted-foreground))] text-xs font-mono">
              PRICE HISTORY
            </span>
            {currentPrice !== null && (
              <span className="text-[hsl(var(--foreground))] text-sm font-mono font-bold">
                {(currentPrice * 100).toFixed(1)}%
              </span>
            )}
            {priceChange && (
              <span
                className={`text-xs font-mono ${
                  priceChange.change >= 0
                    ? 'text-[hsl(var(--bullish))]'
                    : 'text-[hsl(var(--bearish))]'
                }`}
              >
                {priceChange.change >= 0 ? '+' : ''}
                {(priceChange.change * 100).toFixed(1)}% (
                {priceChange.changePercent >= 0 ? '+' : ''}
                {priceChange.changePercent.toFixed(1)}%)
              </span>
            )}
          </div>

          {/* Chart type toggle */}
          <div className="flex gap-1">
            <button
              className={`px-2 py-1 text-xs font-mono border ${
                chartType === 'line'
                  ? 'border-[hsl(var(--primary))] text-[hsl(var(--primary))]'
                  : 'border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'
              }`}
              onClick={() => setChartType('line')}
            >
              LINE
            </button>
            <button
              className={`px-2 py-1 text-xs font-mono border ${
                chartType === 'candlestick'
                  ? 'border-[hsl(var(--primary))] text-[hsl(var(--primary))]'
                  : 'border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'
              }`}
              onClick={() => setChartType('candlestick')}
            >
              OHLC
            </button>
          </div>
        </div>
      </div>

      {/* Time range selector */}
      <div className="border-b border-[hsl(var(--border))] p-2 flex gap-1">
        {TIME_RANGES.map((range) => (
          <button
            key={range}
            className={`px-2 py-1 text-xs font-mono ${
              timeRange === range
                ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]'
                : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'
            }`}
            onClick={() => handleTimeRangeChange(range)}
          >
            {range}
          </button>
        ))}
      </div>

      {/* Chart */}
      <div className="p-2">
        <D3Chart
          data={filteredData}
          chartType={chartType}
          width={width - 16}
          height={height - 100}
        />
      </div>

      {/* Legend */}
      <div className="border-t border-[hsl(var(--border))] p-2 flex gap-6 text-xs font-mono text-[hsl(var(--muted-foreground))]">
        <span>
          <span
            className="inline-block w-3 h-0.5 mr-1"
            style={{ backgroundColor: CHART_COLORS.yesLine }}
          />
          YES
        </span>
        <span>
          <span
            className="inline-block w-3 h-0.5 mr-1 border-t border-dashed"
            style={{ borderColor: CHART_COLORS.noLine }}
          />
          NO
        </span>
        <span className="ml-auto">{filteredData.length} DATA POINTS</span>
      </div>
    </div>
  );
}
