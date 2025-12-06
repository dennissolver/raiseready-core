'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  X,
  Filter,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

export interface FilterConfig {
  id: string;
  label: string;
  type: 'checkbox' | 'range' | 'multi-select';
  options?: { value: string; label: string }[];
  min?: number;
  max?: number;
  step?: number;
  defaultValue?: any;
}

export interface ActiveFilters {
  [key: string]: any;
}

interface FilterSidebarProps {
  filters: FilterConfig[];
  activeFilters: ActiveFilters;
  onFilterChange: (filters: ActiveFilters) => void;
  resultCount?: number;
}

export function FilterSidebar({
  filters,
  activeFilters,
  onFilterChange,
  resultCount,
}: FilterSidebarProps) {
  const [expandedSections, setExpandedSections] = useState<string[]>(
    filters.map(f => f.id)
  );

  const toggleSection = (id: string) => {
    setExpandedSections(prev =>
      prev.includes(id)
        ? prev.filter(sectionId => sectionId !== id)
        : [...prev, id]
    );
  };

  const handleCheckboxChange = (filterId: string, value: string, checked: boolean) => {
    const currentValues = activeFilters[filterId] || [];
    const newValues = checked
      ? [...currentValues, value]
      : currentValues.filter((v: string) => v !== value);

    onFilterChange({
      ...activeFilters,
      [filterId]: newValues.length > 0 ? newValues : undefined,
    });
  };

  const handleRangeChange = (filterId: string, values: number[]) => {
    onFilterChange({
      ...activeFilters,
      [filterId]: values,
    });
  };

  const clearFilter = (filterId: string) => {
    const newFilters = { ...activeFilters };
    delete newFilters[filterId];
    onFilterChange(newFilters);
  };

  const clearAllFilters = () => {
    onFilterChange({});
  };

  const getActiveFilterCount = () => {
    return Object.keys(activeFilters).filter(key => {
      const value = activeFilters[key];
      if (Array.isArray(value)) return value.length > 0;
      return value !== undefined && value !== null;
    }).length;
  };

  const activeFilterCount = getActiveFilterCount();

  return (
    <Card className="sticky top-4">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            <CardTitle className="text-lg">Filters</CardTitle>
            {activeFilterCount > 0 && (
              <Badge variant="secondary">{activeFilterCount}</Badge>
            )}
          </div>
          {activeFilterCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAllFilters}
              className="h-8 px-2"
            >
              Clear all
            </Button>
          )}
        </div>
        {resultCount !== undefined && (
          <p className="text-sm text-muted-foreground">
            {resultCount} results found
          </p>
        )}
      </CardHeader>

      <CardContent className="space-y-1">
        {filters.map((filter) => (
          <Collapsible
            key={filter.id}
            open={expandedSections.includes(filter.id)}
            onOpenChange={() => toggleSection(filter.id)}
          >
            <div className="border rounded-lg">
              <CollapsibleTrigger className="flex items-center justify-between w-full p-3 hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{filter.label}</span>
                  {activeFilters[filter.id] && (
                    <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                      {Array.isArray(activeFilters[filter.id])
                        ? activeFilters[filter.id].length
                        : '✓'}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  {activeFilters[filter.id] && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={(e) => {
                        e.stopPropagation();
                        clearFilter(filter.id);
                      }}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  )}
                  {expandedSections.includes(filter.id) ? (
                    <ChevronUp className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  )}
                </div>
              </CollapsibleTrigger>

              <CollapsibleContent>
                <div className="p-3 pt-0 space-y-3">
                  {filter.type === 'checkbox' && filter.options && (
                    <div className="space-y-2">
                      {filter.options.map((option) => (
                        <div key={option.value} className="flex items-center space-x-2">
                          <Checkbox
                            id={`${filter.id}-${option.value}`}
                            checked={
                              activeFilters[filter.id]?.includes(option.value) || false
                            }
                            onCheckedChange={(checked) =>
                              handleCheckboxChange(
                                filter.id,
                                option.value,
                                checked as boolean
                              )
                            }
                          />
                          <Label
                            htmlFor={`${filter.id}-${option.value}`}
                            className="text-sm font-normal cursor-pointer"
                          >
                            {option.label}
                          </Label>
                        </div>
                      ))}
                    </div>
                  )}

                  {filter.type === 'range' && (
                    <div className="space-y-4">
                      <Slider
                        min={filter.min}
                        max={filter.max}
                        step={filter.step || 1}
                        value={activeFilters[filter.id] || [filter.min, filter.max]}
                        onValueChange={(values) =>
                          handleRangeChange(filter.id, values)
                        }
                        className="w-full"
                      />
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>
                          {activeFilters[filter.id]?.[0] || filter.min}
                        </span>
                        <span>
                          {activeFilters[filter.id]?.[1] || filter.max}
                        </span>
                      </div>
                    </div>
                  )}

                  {filter.type === 'multi-select' && filter.options && (
                    <div className="space-y-2">
                      {filter.options.map((option) => (
                        <div key={option.value} className="flex items-center space-x-2">
                          <Checkbox
                            id={`${filter.id}-${option.value}`}
                            checked={
                              activeFilters[filter.id]?.includes(option.value) || false
                            }
                            onCheckedChange={(checked) =>
                              handleCheckboxChange(
                                filter.id,
                                option.value,
                                checked as boolean
                              )
                            }
                          />
                          <Label
                            htmlFor={`${filter.id}-${option.value}`}
                            className="text-sm font-normal cursor-pointer"
                          >
                            {option.label}
                          </Label>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>
        ))}
      </CardContent>
    </Card>
  );
}

// Preset filter configurations for common use cases

export const PROJECT_FILTERS: FilterConfig[] = [
  {
    id: 'sectors',
    label: 'Sectors',
    type: 'checkbox',
    options: [
      { value: 'Clean Energy', label: 'Clean Energy' },
      { value: 'Climate Tech', label: 'Climate Tech' },
      { value: 'Agriculture', label: 'Agriculture' },
      { value: 'Healthcare', label: 'Healthcare' },
      { value: 'Education', label: 'Education' },
      { value: 'Water & Sanitation', label: 'Water & Sanitation' },
      { value: 'Financial Inclusion', label: 'Financial Inclusion' },
      { value: 'Circular Economy', label: 'Circular Economy' },
    ],
  },
  {
    id: 'funding_stage',
    label: 'Funding Stage',
    type: 'checkbox',
    options: [
      { value: 'Pre-seed', label: 'Pre-seed' },
      { value: 'Seed', label: 'Seed' },
      { value: 'Series A', label: 'Series A' },
      { value: 'Series B', label: 'Series B' },
      { value: 'Growth', label: 'Growth' },
    ],
  },
  {
    id: 'readiness_score',
    label: 'Readiness Score',
    type: 'range',
    min: 0,
    max: 100,
    step: 5,
    defaultValue: [0, 100],
  },
  {
    id: 'target_market',
    label: 'Geographic Region',
    type: 'checkbox',
    options: [
      { value: 'North America', label: 'North America' },
      { value: 'Europe', label: 'Europe' },
      { value: 'Asia Pacific', label: 'Asia Pacific' },
      { value: 'Australia & New Zealand', label: 'Australia & New Zealand' },
      { value: 'Latin America', label: 'Latin America' },
      { value: 'Middle East', label: 'Middle East' },
      { value: 'Africa', label: 'Africa' },
    ],
  },
  {
    id: 'sdgs',
    label: 'UN SDGs',
    type: 'multi-select',
    options: Array.from({ length: 17 }, (_, i) => ({
      value: String(i + 1),
      label: `SDG ${i + 1}`,
    })),
  },
];

export const INVESTOR_FILTERS: FilterConfig[] = [
  {
    id: 'sectors',
    label: 'Investment Focus',
    type: 'checkbox',
    options: [
      { value: 'Clean Energy', label: 'Clean Energy' },
      { value: 'Climate Tech', label: 'Climate Tech' },
      { value: 'Agriculture', label: 'Agriculture' },
      { value: 'Healthcare', label: 'Healthcare' },
      { value: 'Education', label: 'Education' },
      { value: 'Water & Sanitation', label: 'Water & Sanitation' },
      { value: 'Financial Inclusion', label: 'Financial Inclusion' },
      { value: 'Circular Economy', label: 'Circular Economy' },
    ],
  },
  {
    id: 'stages',
    label: 'Investment Stages',
    type: 'checkbox',
    options: [
      { value: 'Pre-seed', label: 'Pre-seed' },
      { value: 'Seed', label: 'Seed' },
      { value: 'Series A', label: 'Series A' },
      { value: 'Series B', label: 'Series B' },
      { value: 'Growth', label: 'Growth' },
    ],
  },
  {
    id: 'ticket_size',
    label: 'Ticket Size ($)',
    type: 'range',
    min: 0,
    max: 10000000,
    step: 100000,
    defaultValue: [0, 10000000],
  },
  {
    id: 'geographies',
    label: 'Geographic Focus',
    type: 'checkbox',
    options: [
      { value: 'North America', label: 'North America' },
      { value: 'Europe', label: 'Europe' },
      { value: 'Asia Pacific', label: 'Asia Pacific' },
      { value: 'Australia & New Zealand', label: 'Australia & New Zealand' },
      { value: 'Latin America', label: 'Latin America' },
      { value: 'Middle East', label: 'Middle East' },
      { value: 'Africa', label: 'Africa' },
    ],
  },
  {
    id: 'investor_type',
    label: 'Investor Type',
    type: 'checkbox',
    options: [
      { value: 'VC Fund', label: 'VC Fund' },
      { value: 'Angel Investor', label: 'Angel Investor' },
      { value: 'Family Office', label: 'Family Office' },
      { value: 'Impact Fund', label: 'Impact Fund' },
      { value: 'Corporate VC', label: 'Corporate VC' },
      { value: 'Government', label: 'Government' },
    ],
  },
];