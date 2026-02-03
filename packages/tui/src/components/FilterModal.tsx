import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import type { Shortcut } from '@katasumi/core';
import { useAppStore } from '../store.js';

interface FilterModalProps {
  shortcuts: Shortcut[];
  onClose: () => void;
}

type FilterType = 'context' | 'category' | 'tag';

export function FilterModal({ shortcuts, onClose }: FilterModalProps) {
  const filters = useAppStore((state) => state.filters);
  const setFilters = useAppStore((state) => state.setFilters);
  
  const [selectedType, setSelectedType] = useState<FilterType>('context');
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Extract unique values for each filter type
  const contexts = Array.from(new Set(shortcuts.map(s => s.context).filter((c): c is string => Boolean(c)))).sort();
  const categories = Array.from(new Set(shortcuts.map(s => s.category).filter((c): c is string => Boolean(c)))).sort();
  const tags = Array.from(new Set(shortcuts.flatMap(s => s.tags || []))).sort();

  const getOptionsForType = (type: FilterType): string[] => {
    switch (type) {
      case 'context':
        return contexts;
      case 'category':
        return categories;
      case 'tag':
        return tags;
    }
  };

  const getCurrentValue = (type: FilterType): string | null => {
    switch (type) {
      case 'context':
        return filters.context;
      case 'category':
        return filters.category;
      case 'tag':
        return filters.tags[0] || null; // Use first tag for now
    }
  };

  const options = getOptionsForType(selectedType);
  const currentValue = getCurrentValue(selectedType);

  useInput((input, key) => {
    if (key.escape) {
      onClose();
      return;
    }

    // Tab: Switch between filter types
    if (key.tab) {
      const types: FilterType[] = ['context', 'category', 'tag'];
      const currentIndex = types.indexOf(selectedType);
      const nextIndex = (currentIndex + 1) % types.length;
      setSelectedType(types[nextIndex]);
      setSelectedIndex(0);
      return;
    }

    // Arrow keys: Navigate options
    if (key.upArrow || input === 'k') {
      setSelectedIndex(prev => Math.max(-1, prev - 1)); // -1 for "All" option
    } else if (key.downArrow || input === 'j') {
      setSelectedIndex(prev => Math.min(options.length - 1, prev + 1));
    } else if (key.return || input === ' ') {
      // Enter or Space: Select option
      if (selectedIndex === -1) {
        // Clear this filter
        switch (selectedType) {
          case 'context':
            setFilters({ ...filters, context: null });
            break;
          case 'category':
            setFilters({ ...filters, category: null });
            break;
          case 'tag':
            setFilters({ ...filters, tags: [] });
            break;
        }
      } else {
        const selectedValue = options[selectedIndex];
        switch (selectedType) {
          case 'context':
            setFilters({ ...filters, context: selectedValue });
            break;
          case 'category':
            setFilters({ ...filters, category: selectedValue });
            break;
          case 'tag':
            // Toggle tag selection
            if (filters.tags.includes(selectedValue)) {
              setFilters({ ...filters, tags: filters.tags.filter(t => t !== selectedValue) });
            } else {
              setFilters({ ...filters, tags: [...filters.tags, selectedValue] });
            }
            break;
        }
      }
    } else if (input === 'c') {
      // Clear all filters
      setFilters({ context: null, category: null, tags: [] });
    }
  });

  return (
    <Box
      flexDirection="column"
      borderStyle="double"
      borderColor="cyan"
      paddingX={2}
      paddingY={1}
    >
      <Text bold color="cyan">
        Filter Shortcuts
      </Text>
      <Box marginTop={1}>
        <Text dimColor>Tab: Switch Type | ↑↓/jk: Navigate | Enter/Space: Select | c: Clear All | Esc: Close</Text>
      </Box>

      {/* Filter Type Tabs */}
      <Box marginTop={1} gap={2}>
        <Text color={selectedType === 'context' ? 'cyan' : undefined} bold={selectedType === 'context'}>
          Context ({contexts.length})
        </Text>
        <Text color={selectedType === 'category' ? 'cyan' : undefined} bold={selectedType === 'category'}>
          Category ({categories.length})
        </Text>
        <Text color={selectedType === 'tag' ? 'cyan' : undefined} bold={selectedType === 'tag'}>
          Tags ({tags.length})
        </Text>
      </Box>

      {/* Options List */}
      <Box flexDirection="column" marginTop={1} height={10}>
        {options.length === 0 ? (
          <Text dimColor>No {selectedType}s available</Text>
        ) : (
          <>
            {/* "All" option */}
            <Box>
              <Text inverse={selectedIndex === -1}>
                {selectedIndex === -1 ? '▶ ' : '  '}
                All {selectedType}s
                {currentValue === null && ' ✓'}
              </Text>
            </Box>
            
            {/* Options */}
            {options.slice(0, 8).map((option, index) => {
              const isSelected = index === selectedIndex;
              const isActive = selectedType === 'tag' 
                ? filters.tags.includes(option)
                : currentValue === option;
              
              return (
                <Box key={option}>
                  <Text inverse={isSelected}>
                    {isSelected ? '▶ ' : '  '}
                    {option}
                    {isActive && ' ✓'}
                  </Text>
                </Box>
              );
            })}
            {options.length > 8 && (
              <Box>
                <Text dimColor>... and {options.length - 8} more</Text>
              </Box>
            )}
          </>
        )}
      </Box>

      {/* Current Selection Info */}
      <Box marginTop={1} flexDirection="column">
        <Text dimColor>Active Filters:</Text>
        <Text>
          Context: <Text color="yellow">{filters.context || 'All'}</Text>
          {' | '}
          Category: <Text color="yellow">{filters.category || 'All'}</Text>
          {' | '}
          Tags: <Text color="yellow">{filters.tags.length > 0 ? filters.tags.join(', ') : 'None'}</Text>
        </Text>
      </Box>
    </Box>
  );
}
