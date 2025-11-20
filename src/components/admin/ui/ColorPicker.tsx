/**
 * ColorPicker Component
 * Hex color input with preset palette and copy to clipboard
 */

import React, { useState, useEffect } from 'react';
import { Palette, Copy, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { isValidHexColor, getContrastColor, copyToClipboard } from '@/lib/cms-utils';

export interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
  presets?: string[];
  disabled?: boolean;
  className?: string;
}

// Default Tailwind preset colors
const defaultPresets = [
  '#000000', // Black
  '#ffffff', // White
  '#3b82f6', // Blue
  '#ef4444', // Red
  '#10b981', // Green
  '#f59e0b', // Yellow
  '#8b5cf6', // Purple
  '#ec4899', // Pink
  '#06b6d4', // Cyan
  '#f97316', // Orange
  '#14b8a6', // Teal
  '#a855f7', // Violet
  '#84cc16', // Lime
  '#22c55e', // Emerald
  '#eab308', // Amber
  '#6366f1', // Indigo
];

const RECENT_COLORS_KEY = 'cms-color-picker-recent';
const MAX_RECENT_COLORS = 8;

export function ColorPicker({
  value,
  onChange,
  presets = defaultPresets,
  disabled = false,
  className,
}: ColorPickerProps) {
  const [inputValue, setInputValue] = useState(value);
  const [recentColors, setRecentColors] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);

  // Load recent colors from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(RECENT_COLORS_KEY);
      if (stored) {
        setRecentColors(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Failed to load recent colors:', error);
    }
  }, []);

  // Sync input value with prop
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  // Save color to recent
  const saveToRecent = (color: string) => {
    const updated = [color, ...recentColors.filter((c) => c !== color)].slice(
      0,
      MAX_RECENT_COLORS
    );
    setRecentColors(updated);
    try {
      localStorage.setItem(RECENT_COLORS_KEY, JSON.stringify(updated));
    } catch (error) {
      console.error('Failed to save recent colors:', error);
    }
  };

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);

    if (isValidHexColor(newValue)) {
      onChange(newValue);
      saveToRecent(newValue);
    }
  };

  // Handle preset click
  const handlePresetClick = (color: string) => {
    onChange(color);
    setInputValue(color);
    saveToRecent(color);
  };

  // Handle copy to clipboard
  const handleCopy = async () => {
    if (!isValidHexColor(value)) return;

    try {
      await copyToClipboard(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy color:', error);
    }
  };

  // Get contrast text color for swatch
  const swatchTextColor = isValidHexColor(value)
    ? getContrastColor(value)
    : 'black';

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {/* Color swatch + input */}
      <div className="relative flex-1 flex items-center">
        <div
          className="absolute left-3 h-6 w-6 rounded-md border-2 border-border shadow-sm"
          style={{ backgroundColor: isValidHexColor(value) ? value : '#ffffff' }}
        />
        <Input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          placeholder="#000000"
          disabled={disabled}
          className="pl-12"
          maxLength={7}
        />
      </div>

      {/* Copy button */}
      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={handleCopy}
        disabled={disabled || !isValidHexColor(value)}
        className="shrink-0"
      >
        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      </Button>

      {/* Palette popover */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="icon"
            disabled={disabled}
            className="shrink-0"
          >
            <Palette className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80">
          <div className="space-y-4">
            {/* Recent colors */}
            {recentColors.length > 0 && (
              <div>
                <div className="text-xs font-medium text-muted-foreground mb-2">
                  Recent
                </div>
                <div className="grid grid-cols-8 gap-2">
                  {recentColors.map((color, index) => (
                    <button
                      key={`${color}-${index}`}
                      type="button"
                      onClick={() => handlePresetClick(color)}
                      className={cn(
                        'h-8 w-8 rounded-md border-2 transition-transform hover:scale-110',
                        value === color ? 'border-primary' : 'border-border'
                      )}
                      style={{ backgroundColor: color }}
                      title={color}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Preset colors */}
            <div>
              <div className="text-xs font-medium text-muted-foreground mb-2">
                Presets
              </div>
              <div className="grid grid-cols-8 gap-2">
                {presets.map((color, index) => (
                  <button
                    key={`${color}-${index}`}
                    type="button"
                    onClick={() => handlePresetClick(color)}
                    className={cn(
                      'h-8 w-8 rounded-md border-2 transition-transform hover:scale-110',
                      value === color ? 'border-primary' : 'border-border'
                    )}
                    style={{ backgroundColor: color }}
                    title={color}
                  />
                ))}
              </div>
            </div>

            {/* Input hint */}
            <div className="text-xs text-muted-foreground text-center">
              Enter hex color code (e.g., #3b82f6)
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
