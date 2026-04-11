import { useState, useRef, useEffect } from 'react';
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Bell,
  Settings,
  Plus,
  Columns2,
  LayoutGrid,
  X,
  Shield,
} from 'lucide-react';

interface TopBarProps {
  onSearch?: (query: string) => void;
  showAuditor?: boolean;
  onToggleAudit?: () => void;
  hasAuditData?: boolean;
}

export function TopBar({ onSearch, onToggleAudit, hasAuditData }: TopBarProps) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (searchOpen && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [searchOpen]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'p') {
        e.preventDefault();
        setSearchOpen(true);
      }
      if (e.key === 'Escape') {
        setSearchOpen(false);
        setSearchValue('');
      }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  const handleSearchChange = (val: string) => {
    setSearchValue(val);
    onSearch?.(val);
  };

  const closeSearch = () => {
    setSearchOpen(false);
    setSearchValue('');
  };

  const iconBtn: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '28px',
    height: '28px',
    background: 'transparent',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    color: '#9e9e9e',
    flexShrink: 0,
    transition: 'background 0.1s, color 0.1s',
  };

  return (
    <div
      style={{
        height: '35px',
        background: '#111111',
        borderBottom: '1px solid #2a2a2a',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 8px',
        flexShrink: 0,
        zIndex: 10,
        userSelect: 'none',
      }}
    >
      {/* LEFT — nav controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '2px', minWidth: '160px' }}>
        <button
          style={iconBtn}
          title="Toggle menu"
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.07)'; (e.currentTarget as HTMLButtonElement).style.color = '#cccccc'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = '#9e9e9e'; }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <rect x="1" y="2.5" width="12" height="1.2" rx="0.6" fill="currentColor"/>
            <rect x="1" y="6.4" width="12" height="1.2" rx="0.6" fill="currentColor"/>
            <rect x="1" y="10.3" width="12" height="1.2" rx="0.6" fill="currentColor"/>
          </svg>
        </button>

        <div style={{ width: '4px' }} />

        <button style={{ ...iconBtn, opacity: 0.45, cursor: 'default' }} title="Go back">
          <ChevronLeft size={15} />
        </button>
        <button style={{ ...iconBtn, opacity: 0.45, cursor: 'default' }} title="Go forward">
          <ChevronRight size={15} />
        </button>

        <div style={{ width: '6px' }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', color: '#6e6e6e' }}>
            luna
          </span>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', color: '#4a4a4a' }}>
            /
          </span>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', color: '#8a8a8a' }}>
            workspace
          </span>
        </div>

      </div>

      {/* CENTER — title / search bar */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '340px',
        }}
      >
        {searchOpen ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: '#2a2a2a',
              border: '1px solid #555',
              borderRadius: '5px',
              padding: '0 10px',
              height: '24px',
            }}
          >
            <Search size={11} style={{ color: '#9e9e9e', flexShrink: 0 }} />
            <input
              ref={inputRef}
              value={searchValue}
              onChange={e => handleSearchChange(e.target.value)}
              placeholder="Search files, commands..."
              style={{
                flex: 1,
                background: 'transparent',
                border: 'none',
                outline: 'none',
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: '12px',
                color: '#cccccc',
                padding: 0,
              }}
            />
            <button
              onClick={closeSearch}
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                padding: '0',
                display: 'flex',
                alignItems: 'center',
                color: '#6e6e6e',
              }}
              onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.color = '#cccccc')}
              onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.color = '#6e6e6e')}
            >
              <X size={11} />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setSearchOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '7px',
              width: '100%',
              height: '24px',
              background: '#2a2a2a',
              border: '1px solid #383838',
              borderRadius: '5px',
              cursor: 'pointer',
              transition: 'background 0.12s, border-color 0.12s',
              padding: '0 10px',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.background = '#333333';
              (e.currentTarget as HTMLButtonElement).style.borderColor = '#4a4a4a';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.background = '#2a2a2a';
              (e.currentTarget as HTMLButtonElement).style.borderColor = '#383838';
            }}
            title="Search (⌘P)"
          >
            <Search size={11} style={{ color: '#7a7a7a', flexShrink: 0 }} />
            <span
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: '12px',
                color: '#9e9e9e',
                letterSpacing: '0.04em',
              }}
            >
              LUNA
            </span>
            <span
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: '10px',
                color: '#4a4a4a',
                marginLeft: '4px',
              }}
            >
              ⌘P
            </span>
          </button>
        )}
      </div>

      {/* RIGHT — action icons */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '2px', minWidth: '160px', justifyContent: 'flex-end' }}>
        <button
          style={iconBtn}
          title="New file"
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.07)'; (e.currentTarget as HTMLButtonElement).style.color = '#cccccc'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = '#9e9e9e'; }}
        >
          <Plus size={14} />
        </button>

        <button
          style={iconBtn}
          title="Split editor"
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.07)'; (e.currentTarget as HTMLButtonElement).style.color = '#cccccc'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = '#9e9e9e'; }}
        >
          <Columns2 size={14} />
        </button>

        <button
          style={iconBtn}
          title="Layout"
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.07)'; (e.currentTarget as HTMLButtonElement).style.color = '#cccccc'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = '#9e9e9e'; }}
        >
          <LayoutGrid size={14} />
        </button>

        <div style={{ width: '6px' }} />
        <div style={{ width: '1px', height: '14px', background: '#2e2e2e' }} />
        <div style={{ width: '6px' }} />

        {/* Auditor shield button */}
        <button
          style={{ ...iconBtn, position: 'relative' }}
          title="Accountability Audit"
          onClick={onToggleAudit}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(163,113,247,0.1)'; (e.currentTarget as HTMLButtonElement).style.color = '#a371f7'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = '#9e9e9e'; }}
        >
          <Shield size={13} />
          {hasAuditData && (
            <div
              style={{
                position: 'absolute',
                top: '4px',
                right: '5px',
                width: '5px',
                height: '5px',
                borderRadius: '50%',
                background: '#a371f7',
              }}
            />
          )}
        </button>

        <button
          style={iconBtn}
          title="Notifications"
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.07)'; (e.currentTarget as HTMLButtonElement).style.color = '#cccccc'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = '#9e9e9e'; }}
        >
          <Bell size={13} />
        </button>

        <button
          style={iconBtn}
          title="Settings"
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.07)'; (e.currentTarget as HTMLButtonElement).style.color = '#cccccc'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = '#9e9e9e'; }}
        >
          <Settings size={13} />
        </button>

        <div style={{ width: '4px' }} />

        <div
          style={{
            width: '22px',
            height: '22px',
            borderRadius: '50%',
            background: '#3a3a3a',
            border: '1px solid #4a4a4a',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '10px', color: '#9e9e9e', fontWeight: 600 }}>
            T
          </span>
        </div>
      </div>
    </div>
  );
}
