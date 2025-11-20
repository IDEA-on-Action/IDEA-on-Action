/**
 * MultiSelect Component
 * Combobox with checkboxes, search, chips, async loading
 */

import React, { useState, useMemo } from 'react';
import { Check, ChevronsUpDown, X, Plus, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

export interface MultiSelectOption {
  label: string;
  value: string;
}

export interface MultiSelectProps {
  options: MultiSelectOption[];
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  emptyText?: string;
  loading?: boolean;
  onCreate?: (value: string) => Promise<void>;
  disabled?: boolean;
  maxCount?: number;
  className?: string;
}

export function MultiSelect({
  options,
  value,
  onChange,
  placeholder = 'Select items...',
  emptyText = 'No items found',
  loading = false,
  onCreate,
  disabled = false,
  maxCount,
  className,
}: MultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [creating, setCreating] = useState(false);

  // Filter options based on search
  const filteredOptions = useMemo(() => {
    if (!search) return options;
    const searchLower = search.toLowerCase();
    return options.filter((option) =>
      option.label.toLowerCase().includes(searchLower)
    );
  }, [options, search]);

  // Check if search matches an existing option
  const searchMatchesOption = useMemo(() => {
    return options.some(
      (option) => option.label.toLowerCase() === search.toLowerCase()
    );
  }, [options, search]);

  // Selected options
  const selectedOptions = useMemo(() => {
    return options.filter((option) => value.includes(option.value));
  }, [options, value]);

  // Handle select/deselect
  const handleToggle = (optionValue: string) => {
    const newValue = value.includes(optionValue)
      ? value.filter((v) => v !== optionValue)
      : [...value, optionValue];
    onChange(newValue);
  };

  // Handle select all
  const handleSelectAll = () => {
    if (maxCount && filteredOptions.length > maxCount) return;
    onChange(filteredOptions.map((option) => option.value));
  };

  // Handle clear all
  const handleClearAll = () => {
    onChange([]);
  };

  // Handle create new option
  const handleCreate = async () => {
    if (!onCreate || !search || searchMatchesOption) return;

    setCreating(true);
    try {
      await onCreate(search);
      setSearch('');
    } catch (error) {
      console.error('Failed to create option:', error);
    } finally {
      setCreating(false);
    }
  };

  // Remove selected option
  const handleRemove = (optionValue: string) => {
    onChange(value.filter((v) => v !== optionValue));
  };

  // Check if max count reached
  const isMaxReached = maxCount !== undefined && value.length >= maxCount;

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
            disabled={disabled || loading}
          >
            <span className="truncate">
              {value.length === 0
                ? placeholder
                : `${value.length} selected${maxCount ? ` / ${maxCount}` : ''}`}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0" align="start">
          <Command>
            <CommandInput
              placeholder="Search..."
              value={search}
              onValueChange={setSearch}
            />
            <CommandList>
              {loading ? (
                <div className="flex items-center justify-center p-4">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <>
                  {/* Bulk actions */}
                  {filteredOptions.length > 0 && (
                    <CommandGroup>
                      <div className="flex items-center justify-between px-2 py-1.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleSelectAll}
                          disabled={isMaxReached}
                        >
                          Select all
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleClearAll}
                          disabled={value.length === 0}
                        >
                          Clear all
                        </Button>
                      </div>
                    </CommandGroup>
                  )}

                  {/* Options list */}
                  <CommandEmpty>{emptyText}</CommandEmpty>
                  <CommandGroup>
                    {filteredOptions.map((option) => {
                      const isSelected = value.includes(option.value);
                      return (
                        <CommandItem
                          key={option.value}
                          value={option.value}
                          onSelect={() => handleToggle(option.value)}
                          disabled={isMaxReached && !isSelected}
                        >
                          <div
                            className={cn(
                              'mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary',
                              isSelected
                                ? 'bg-primary text-primary-foreground'
                                : 'opacity-50 [&_svg]:invisible'
                            )}
                          >
                            <Check className="h-4 w-4" />
                          </div>
                          <span>{option.label}</span>
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>

                  {/* Create new option */}
                  {onCreate && search && !searchMatchesOption && (
                    <CommandGroup>
                      <CommandItem
                        onSelect={handleCreate}
                        disabled={creating || isMaxReached}
                      >
                        {creating ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Plus className="mr-2 h-4 w-4" />
                        )}
                        <span>
                          Create "<strong>{search}</strong>"
                        </span>
                      </CommandItem>
                    </CommandGroup>
                  )}
                </>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Selected chips */}
      {selectedOptions.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selectedOptions.map((option) => (
            <Badge key={option.value} variant="secondary" className="gap-1">
              {option.label}
              <button
                type="button"
                onClick={() => handleRemove(option.value)}
                disabled={disabled}
                className="ml-1 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              >
                <X className="h-3 w-3" />
                <span className="sr-only">Remove {option.label}</span>
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
