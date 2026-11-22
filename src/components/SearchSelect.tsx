import { useId, useEffect, useRef, useState } from 'react';
export type Option = { id: string; name: string };
type Props = {
  label: string;
  value: string;
  options: readonly Option[];
  onChange: (id: string) => void;
  placeholder?: string;
  disabled?: boolean;
};
export function SearchSelect({
  label,
  value,
  options,
  onChange,
  placeholder = 'Choose…',
  disabled = false,
}: Props) {
  const id = useId(),
    input = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false),
    [query, setQuery] = useState(''),
    [active, setActive] = useState(0);
  const selected = options.find((o) => o.id === value);
  const filtered = options.filter((o) =>
    o.name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()),
  );
  const index = Math.min(active, filtered.length - 1);
  const expand = () => {
    setQuery('');
    setActive(0);
    setOpen(true);
  };
  const choose = (option: Option) => {
    onChange(option.id);
    setOpen(false);
    setQuery('');
  };
  useEffect(() => {
    if (open && index >= 0)
      document.getElementById(id + '-opt-' + index)?.scrollIntoView?.({ block: 'nearest' });
  }, [id, index, open, query]);
  return (
    <div
      className="picker"
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false);
      }}
    >
      <label htmlFor={id}>{label}</label>
      <div className="picker-input">
        <input
          id={id}
          ref={input}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls={open ? id + '-list' : undefined}
          aria-activedescendant={open && index >= 0 ? id + '-opt-' + index : undefined}
          disabled={disabled}
          autoComplete="off"
          spellCheck={false}
          placeholder={open ? 'Search…' : placeholder}
          value={open ? query : selected?.name || ''}
          onFocus={expand}
          onClick={() => {
            if (!open) expand();
          }}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
            setOpen(true);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape' || e.key === 'Tab') {
              setOpen(false);
              return;
            }
            if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
              e.preventDefault();
              if (!open) {
                expand();
                return;
              }
              setActive(Math.max(0, Math.min(filtered.length - 1, index + (e.key === 'ArrowDown' ? 1 : -1))));
            } else if (open && e.key === 'Enter') {
              e.preventDefault();
              if (filtered[index]) choose(filtered[index]);
            } else if (open && (e.key === 'Home' || e.key === 'End') && !query) {
              e.preventDefault();
              setActive(e.key === 'Home' ? 0 : filtered.length - 1);
            }
          }}
        />
        <button
          type="button"
          tabIndex={-1}
          aria-label={'Show ' + label.toLowerCase() + ' options'}
          disabled={disabled}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            if (open) setOpen(false);
            else {
              input.current?.focus();
              expand();
            }
          }}
        >
          <span aria-hidden="true">⌄</span>
        </button>
      </div>
      {open && (
        <ul role="listbox" aria-label={label} id={id + '-list'} className="options">
          {filtered.map((o, i) => (
            <li
              key={o.id}
              role="option"
              id={id + '-opt-' + i}
              aria-selected={o.id === value}
              className={index === i ? 'pointed' : ''}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => choose(o)}
            >
              {o.name}
              {o.id === value && <span aria-hidden="true"> ✓</span>}
            </li>
          ))}
          {!filtered.length && (
            <li role="presentation" className="empty-option">
              No matches
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
