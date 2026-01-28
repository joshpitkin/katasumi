# Keyboard Shortcuts

## Vi-Style Keyboard Navigation (Updated 2026-01-28)

Katasumi uses vi-style home row keyboard shortcuts for maximum efficiency and accessibility. All shortcuts work identically in both TUI and Web UI.

### Key Changes from F-Keys

| Old Shortcut | New Shortcut | Action |
|-------------|--------------|--------|
| F4 | `a` | Toggle AI |
| F5 | `p` | Platform selector |
| F2 | `g` | Go to app selector / home |
| F3 | `f` | Focus filters |
| - | `/` | Focus search input |
| - | `Ctrl+L` or `Esc` in input | Clear search |

### Complete Keyboard Reference

#### Global Shortcuts
- `Ctrl+C` or `q` - Quit application (TUI only)
- `?` - Show help overlay
- `Tab` - Toggle between App-First and Full-Phrase modes
- `Esc` - Go back / close modal or overlay
- `Cmd+,` or `Ctrl+,` - Open settings (future)

#### Search & Navigation
- `/` - Focus search input (from anywhere)
- `Enter` - Execute search and unfocus (so you can use shortcuts on results)
- `Esc` - Unfocus search input without clearing (to use global/mode shortcuts)
- `Ctrl+L` - Clear search input and stay focused (standard browser clear)
- `↑` / `↓` - Navigate through results
- `Enter` (on result) - Select item / open detail view

#### Mode-Specific Shortcuts

##### App-First Mode
- `g` - Go to app selector (return to app selection)
- `f` - Focus filters (Context/Category/Tags)
- `a` - Toggle AI (if available in App-First mode)
- `p` - Open platform selector

##### Full-Phrase Mode
- `a` - Toggle AI
- `p` - Open platform selector
- `/` - Focus search input

#### Detail View
- `c` - Copy keys to clipboard
- `o` - Open documentation URL in browser
- `Esc` - Return to results view

#### Platform Selector
- `↑` / `↓` - Navigate platform options
- `Enter` - Select platform
- `Esc` - Close without changing

### Design Principles

1. **Home Row First**: Primary actions use letters (a, p, g, f) that are easy to reach
2. **Vi-Style**: Follows vi/vim conventions where possible (/, g, Esc)
3. **No F-Keys**: Avoids function keys which are hard to reach and conflict with OS shortcuts
4. **Consistent**: Same shortcuts work in both TUI and Web UI
5. **No Modifiers**: Single keys for common actions (except Ctrl+L for clear)
6. **Mnemonic**: Keys match action names (a=AI, p=Platform, f=Filters, g=Go)

### Preventing Shortcuts During Text Input

**Critical Concern**: Single-key shortcuts must not fire when typing in search inputs.

#### Behavior Rules

| Key Type | Behavior When Typing in Input |
|----------|------------------------------|
| Single keys (a, p, g, f) | **BLOCKED** - Let input handle it |
| Modifier keys (Ctrl+K, Cmd+A) | **ALLOWED** - Standard browser behavior |
| Global keys (Tab, Esc, /) | **ALLOWED** - Special handling |
| Arrow keys (↑, ↓) | **CONTEXT-DEPENDENT** - Navigate results or input cursor |

#### Implementation Pattern

**Rule #1**: Check `event.target` before handling single-key shortcuts

```typescript
const isTyping = event.target instanceof HTMLInputElement || 
                 event.target instanceof HTMLTextAreaElement;

// Block single-key shortcuts when typing
if (isTyping && !event.ctrlKey && !event.metaKey) {
  return; // Let input handle it naturally
}
```

**Rule #2**: Special keys work everywhere with custom handling

```typescript
// Escape unfocuses without clearing (so you can use shortcuts)
if (e.key === 'Escape') {
  if (isTyping) {
    target.blur();
  }
  return;
}

// '/' focuses search (unless already typing)
if (e.key === '/' && !isTyping) {
  e.preventDefault();
  document.getElementById('search-input')?.focus();
  return;
}

// Ctrl+L clears input (standard browser shortcut)
if ((e.ctrlKey || e.metaKey) && e.key === 'l' && isTyping) {
  e.preventDefault();
  (target as HTMLInputElement).value = '';
  return;
}
```

---

## Implementation Guide (For Developers)

### Web UI Implementation

#### Step 1: Add Document-Level Keyboard Handler

```typescript
// packages/web/app/page.tsx or layout.tsx
'use client'

import { useEffect } from 'react'
import { useStore } from '@/lib/store'

export default function Page() {
  const toggleAI = useStore((state) => state.toggleAI)
  const toggleMode = useStore((state) => state.toggleMode)
  // ... other state

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      const isTyping = target instanceof HTMLInputElement || 
                       target instanceof HTMLTextAreaElement
      
      // Special key: Always allow Escape
      if (e.key === 'Escape') {
        if (isTyping) {
          // Unfocus without clearing (so user can use shortcuts while keeping search)
          target.blur()
          e.preventDefault()
        }
        // If not typing, let it bubble for modal/overlay closing
        return
      }
      
      // Special key: Always allow '/' to focus search
      if (e.key === '/' && !isTyping) {
        e.preventDefault()
        document.getElementById('search-input')?.focus()
        return
      }
      
      // Special key: Tab for mode toggle (works everywhere)
      if (e.key === 'Tab' && !e.shiftKey) {
        if (!isTyping || e.ctrlKey || e.metaKey) {
          e.preventDefault()
          toggleMode()
          return
        }
      }
      
      // Block ALL single-key shortcuts when typing
      if (isTyping && !e.ctrlKey && !e.metaKey && !e.altKey) {
        return // Let the input handle it naturally
      }
      
      // Single-key shortcuts (only when NOT typing)
      if (e.key === 'a' && !isTyping) {
        e.preventDefault()
        toggleAI()
        return
      }
      
      if (e.key === 'p' && !isTyping) {
        e.preventDefault()
        openPlatformSelector()
        return
      }
      
      if (e.key === 'g' && !isTyping) {
        e.preventDefault()
        goToAppSelector()
        return
      }
      
      if (e.key === 'f' && !isTyping) {
        e.preventDefault()
        focusFilters()
        return
      }
      
      // Modifier shortcuts (work everywhere, even in inputs)
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        goToAppSelector()
        return
      }
      
      if ((e.metaKey || e.ctrlKey) && e.key === 'l') {
        if (isTyping) {
          e.preventDefault()
          ;(target as HTMLInputElement).value = ''
          // Keep focus so user can immediately type new search
        }
        return
      }
      
      // Help overlay (works everywhere)
      if (e.key === '?' && !isTyping) {
        e.preventDefault()
        openHelpOverlay()
        return
      }
    }
    
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [toggleAI, toggleMode, ...otherDeps])
  
  return (/* ... */)
}
```

#### Step 2: Add ID to Search Input

```typescript
// packages/web/components/SearchBar.tsx
<input
  id="search-input"
  type="text"
  placeholder={placeholder}
  value={localQuery}
  onChange={(e) => setLocalQuery(e.target.value)}
  onKeyDown={(e) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur() // Unfocus so user can use shortcuts on results
    }
    // Escape handling is in global handler (unfocuses without clearing) e.currentTarget.blur()
    }
  }}
  className="..."
  autoFocus
/>
```

### TUI Implementation

Ink's `useInput` hook automatically handles focus - when an input component is focused, parent `useInput` handlers don't capture events.

```typescript
// packages/tui/src/components/SearchInput.tsx
import { useState } from 'react'
import { Box, Text } from 'ink'
import { useInput } from 'ink'

export function SearchInput({ onSearch }: Props) {
  const [query, setQuery] = useState('')
  
  // This useInput is ONLY active when this component is in focus
  useInput((input, key) => {
    if (key.return) {
      onSearch(query)
    } else if (key.escape) {
      setQuery('')
      // In TUI, Ink will automatically unfocus on Enter (parent regains focus)
    } else if (key.escape) {
      // Unfocus without clearing (blur to let parent handle shortcuts)
      onBlur?.() // Callback to parent to shift focusry.slice(0, -1))
    } else if (!key.ctrl && !key.meta && input) {
      setQuery(query + input)
    }
  })
  
  return (
    <Box>
      <Text>{query}_</Text>
    </Box>
  )
}
```

```typescript
// packages/tui/src/components/GlobalKeybindings.tsx
import { useInput } from 'ink'

export function GlobalKeybindings({ onToggleAI, ... }: Props) {
  // This ONLY fires when no child input component is focused
  useInput((input, key) => {
    if (input === 'a') onToggleAI()
    if (input === 'p') onShowPlatformSelector()
    if (input === 'g') onGoToAppSelector()
    if (input === 'f') onFocusFilters()
    // ... etc
  })
  
  return null
}
```

### Testing Checklist

#### Manual Testing

- [ ] Type "a" in search input → should insert "a", NOT toggle AI
- [ ] Type "p" in search input → should insert "p", NOT open platform selector
- [ ] Type "g" in search input → should insert "g", NOT go to app selector
- [ ] Type "f" in search input → should insert "f", NOT focus filters
- [ ] Press "/" from anywhere → should focus searunfocus WITHOUT clearing
- [ ] Press "Ctrl+L" while in search input → should clear input and keep focused
- [ ] Press "Enter" in search input → should search and unfocus (allowing shortcuts on results)cter
- [ ] Press "Esc" while in search input → should clear and unfocus
- [ ] Press "Ctrl+L" while in search input → should clear input
- [ ] Press "a" when NOT in input → should toggle AI
- [ ] Press "Tab" anywhere → should toggle mode
- [ ] Press "?" when NOT in input → should open help

#### Automated Tests

```typescript
// packages/web/__tests__/keyboard-shortcuts-input.test.ts
import { render, screen, fireEvent } from '@testing-library/react'
import Page from '@/app/page'

describe('Keyboard shortcuts with input fields', () => {
  it('should not trigger shortcuts when typing in search input', () => {
    const { container } = render(<Page />)
    const input = screen.getByPlaceholderText(/search/i)
    
    input.focus()
    fireEvent.keyDown(input, { key: 'a' })
    
    // AI should NOT be toggled
    expect(screen.queryByText(/AI: ON/i)).not.toBeInTheDocument()
    
    // Character should be in input
    expect(input).toHaveValue('a')
  })
  
  it('should allow "/" to focus input from anywhere', () => {
    render(<Page />)
    const input = screen.getByPlaceholderText(/search/i)
    
    document.body.focus() // Focus outside input
    fireEvent.keyDown(document, { key: '/' })
    
    expect(input).toHaveFocus(unfocus without clearing', () => {
    render(<Page />)
    const input = screen.getByPlaceholderText(/search/i) as HTMLInputElement
    
    input.focus()
    fireEvent.change(input, { target: { value: 'test query' } })
    fireEvent.keyDown(input, { key: 'Escape' })
    
    // Query preserved, input unfocused
    expect(input.value).toBe('test query')
    expect(input).not.toHaveFocus()
  })
  
  it('should handle Ctrl+L to clear input', () => {
    render(<Page />)
    const input = screen.getByPlaceholderText(/search/i) as HTMLInputElement
    
    input.focus()
    fireEvent.change(input, { target: { value: 'test query' } })
    fireEvent.keyDown(input, { key: 'l', ctrlKey: true })
    
    // Query cleared, input still focused
    expect(input.value).toBe('')
    expect(input).toHaveFocus()
  })
  
  it('should unfocus on Enter after search', () => {
    const mockSearch = jest.fn()
    render(<Page onSearch={mockSearch} />)
    const input = screen.getByPlaceholderText(/search/i) as HTMLInputElement
    
    input.focus()
    fireEvent.change(input, { target: { value: 'test query' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    
    expect(mockSearch).toHaveBeenCalledWith('test querytarget: { value: 'test query' } })
    fireEvent.keyDown(input, { key: 'Escape' })
    
    expect(input.value).toBe('')
    expect(input).not.toHaveFocus()
  })
})
```

### Common Pitfalls

#### ❌ Pitfall #1: Forgetting to Check Input Target

```typescript
// BAD: Will trigger when typing
document.addEventListener('keydown', (e) => {
  if (e.key === 'a') {
    toggleAI() // This fires even when typing in input!
  }
})
```

#### ✅ Solution: Always Check Target

```typescript
// GOOD: Checks if user is typing first
document.addEventListener('keydown', (e) => {
  const isTyping = e.target instanceof HTMLInputElement
  if (e.key === 'a' && !isTyping) {
    toggleAI()
  }
})
```

#### ❌ Pitfall #2: Blocking All Keys in Input

```typescript
// BAD: Blocks Escape and Ctrl+L
if (isTyping) {
  return // Escape won't work!
}
```

#### ✅ Solution: Handle Special Keys First

```typescript
// GOOD: Handle Escape before checking isTyping
if (e.key === 'Escape') {
  handleEscape()
  return
}

if (isTyping && !e.ctrlKey && !e.metaKey) {
  return // Block single keys only
}
```

#### ❌ Pitfall #3: preventDefault() Too Aggressively

```typescript
// BAD: Prevents "a" from being typed
if (e.key === 'a') {
  e.preventDefault() // Even in inputs!
  if (!isTyping) toggleAI()
}
```

#### ✅ Solution: preventDefault() Only When Handling

```typescript
// GOOD: Only preventDefault when actually handling
if (e.key === 'a' && !isTyping) {
  e.preventDefault()
  toggleAI()
}
```

### Summary

✅ **Check `event.target` before handling single-key shortcuts**  
✅ **Allow modifier shortcuts (Ctrl/Cmd+key) to work in inputs**  
✅ **Special keys (/, Esc, Ctrl+L) work everywhere**  
✅ **TUI: Ink handles focus automatically**  
✅ **Test with actual typing scenarios**  

---

## Related Documentation

- **[PRD Requirement PHASE3-WEB-014](prd.json)** - Vi-style keyboard shortcuts implementation details
- **[katasumi-plan.md](katasumi-plan.md)** - Keyboard navigation section (2.2.1)
- **[PHASE2-TUI-010](prd.json)** - TUI Keyboard Navigation
- **[PHASE3-WEB-009](prd.json)** - Web Keyboard Shortcuts
