'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Bar, BarChart, XAxis, YAxis, CartesianGrid } from 'recharts';
import { ChevronDown, ChevronUp } from 'lucide-react';
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';

interface PlantsBySpeciesChartProps {
  data: {
    speciesType: string;
    count: number;
    plantIds: string[];
    plantNames: string[];
  }[];
}

const chartConfig = {
  count: {
    label: 'Plants',
    color: 'var(--chart-1)',
  },
} satisfies ChartConfig;

export function PlantsBySpeciesChart({ data }: PlantsBySpeciesChartProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (data.length === 0) {
    return null;
  }

  // Format data for the chart
  const chartData = data.map((item) => ({
    speciesType: item.speciesType,
    count: item.count,
    plantIds: item.plantIds,
    plantNames: item.plantNames,
  }));

  return (
    <div className="mb-8 rounded-lg border-2 border-sage bg-card-bg overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-6 flex items-center justify-between hover:bg-sage/10 transition-colors"
      >
        <div>
          <h2 className="text-2xl font-semibold text-moss-dark text-left">
            Plants by Species
          </h2>
          <p className="text-sm text-soil mt-1 text-left">
            {data.length} {data.length === 1 ? 'species type' : 'species types'} tracked
          </p>
        </div>
        {isExpanded ? (
          <ChevronUp className="h-6 w-6 text-moss" />
        ) : (
          <ChevronDown className="h-6 w-6 text-moss" />
        )}
      </button>

      {/* Chart Content */}
      {isExpanded && (
        <div className="p-6 pt-0 animate-fade-in">
          <ChartContainer config={chartConfig} className="h-[400px] w-full">
            <BarChart
              accessibilityLayer
              data={chartData}
              margin={{ top: 10, right: 20, left: 20, bottom: 60 }}
            >
              <CartesianGrid vertical={false} stroke="var(--sage)" opacity={0.3} />
              <XAxis
                dataKey="speciesType"
                tickLine={false}
                tickMargin={10}
                axisLine={false}
                stroke="var(--soil)"
                fontSize={12}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                stroke="var(--soil)"
                fontSize={12}
              />
              <ChartTooltip
                cursor={false}
                content={({ active, payload }) => {
                  if (!active || !payload || payload.length === 0) {
                    return null;
                  }

                  const data = payload[0].payload;

                  return (
                    <div className="rounded-lg border-2 border-sage bg-card-bg p-3 shadow-lg max-w-xs">
                      <p className="font-semibold text-moss-dark mb-2">
                        {data.speciesType}
                      </p>
                      <p className="text-sm text-soil mb-2">
                        {data.count} {data.count === 1 ? 'plant' : 'plants'}
                      </p>
                      <div className="space-y-1">
                        {data.plantNames.map((name: string, index: number) => (
                          <Link
                            key={data.plantIds[index]}
                            href={`/plants/${data.plantIds[index]}`}
                            className="block text-sm text-moss hover:text-terracotta hover:underline transition-colors"
                          >
                            → {name}
                          </Link>
                        ))}
                      </div>
                    </div>
                  );
                }}
              />
              <Bar
                dataKey="count"
                fill="var(--chart-1)"
                radius={[8, 8, 0, 0]}
              />
            </BarChart>
          </ChartContainer>
        </div>
      )}
    </div>
  );
}
