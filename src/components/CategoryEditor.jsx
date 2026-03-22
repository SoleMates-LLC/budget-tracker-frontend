import React, { useState } from 'react';

// ─── Icon Library ─────────────────────────────────────────────────────────────
const ICON_GROUPS = [
  { label: 'Food & Drink', icons: ['🍕','🍔','🌮','🍜','🍣','🍱','🥗','🍰','🧁','🍩','☕','🍵','🧃','🍺','🥂','🛒'] },
  { label: 'Shopping',     icons: ['🛍️','👕','👗','👟','👜','💄','💍','🎁','🧴','🪥','🧹','🛋️','🪑','🖼️','🧸','💎'] },
  { label: 'Transport',    icons: ['🚗','✈️','🚂','🚌','🚕','🛵','🚲','⛽','🅿️','🚢','🚁','🛞','🗺️','🧳','🚦','🛣️'] },
  { label: 'Home',         icons: ['🏠','🏡','🔧','🪛','💡','🔌','🪴','🌿','🏗️','🛁','🚿','🪟','🚪','🔑','🏦','🌊'] },
  { label: 'Health',       icons: ['💊','🏥','🦷','👓','🩺','🧘','🏋️','🚑','💉','🩹','🧬','🫀','🩻','🥦','🍎','💪'] },
  { label: 'Entertainment',icons: ['🎬','🎮','🎵','🎸','📚','🎨','🏀','⚽','🎭','🎪','🎢','🎠','🃏','🎲','🎯','🏆'] },
  { label: 'Finance',      icons: ['💰','📈','💳','🏦','🪙','💵','📊','💹','🤑','💸','🧾','📋','🔐','📑','🏧','⚖️'] },
  { label: 'Education',    icons: ['📚','🎓','✏️','💻','📐','🔬','🖊️','📖','🏫','🧮','📝','🗒️','🖥️','🎒','📓','🏅'] },
  { label: 'Personal',     icons: ['💇','💅','🧴','🪒','🧖','👶','🐶','🐱','🐾','🌸','⭐','🎀','🕯️','🛀','🌙','❤️'] },
  { label: 'Utilities',    icons: ['💧','🔌','📱','📺','📡','🌐','☁️','♻️','🗑️','🧺','🧻','🪣','🛠️','⚙️','📦','🔩'] },
];

const COLORS = [
  '#ef4444','#f97316','#f59e0b','#84cc16','#22c55e',
  '#14b8a6','#06b6d4','#3b82f6','#6366f1','#8b5cf6',
  '#d946ef','#ec4899','#64748b','#526080','#1a2744','#0f172a',
];

export default function CategoryEditor({ initial, onSave, onDelete, onClose }) {
  const isEdit = !!initial;

  const [name, setName]     = useState(initial?.name  || '');
  const [icon, setIcon]     = useState(initial?.icon  || '📦');
  const [color, setColor]   = useState(initial?.color || '#3b82f6');
  const [tab, setTab]       = useState(0);
  const [error, setError]   = useState('');
  const [confirmDel, setConfirmDel] = useState(false);

  const handleSave = () => {
    if (!name.trim()) { setError('Name is required.'); return; }
    onSave({ name: name.trim(), icon, color });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0, paddingBottom: 4 }}>

      {/* Preview */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '4px 0 20px' }}>
        <div style={{
          width: 52, height: 52, borderRadius: 14,
          background: `${color}22`, border: `2px solid ${color}66`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', flexShrink: 0,
        }}>
          {icon}
        </div>
        <input
          type="text"
          value={name}
          onChange={e => { setName(e.target.value); setError(''); }}
          placeholder="Category name"
          maxLength={50}
          autoFocus
          style={{
            flex: 1, fontSize: '1.125rem', fontWeight: 600,
            background: 'transparent', border: 'none', borderBottom: '2px solid var(--border)',
            color: 'var(--text-primary)', padding: '6px 0', outline: 'none',
          }}
        />
      </div>

      {/* Color picker */}
      <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10 }}>Color</p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
        {COLORS.map(c => (
          <button key={c} onClick={() => setColor(c)}
            style={{
              width: 32, height: 32, borderRadius: 8, background: c, border: 'none', cursor: 'pointer',
              outline: color === c ? `3px solid ${c}` : 'none',
              outlineOffset: 2,
              transform: color === c ? 'scale(1.15)' : 'scale(1)',
              transition: 'transform 0.1s',
            }}
          />
        ))}
      </div>

      {/* Icon picker */}
      <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10 }}>Icon</p>

      {/* Group tabs */}
      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', marginBottom: 12, paddingBottom: 4 }}>
        {ICON_GROUPS.map((g, i) => (
          <button key={i} onClick={() => setTab(i)}
            style={{
              padding: '5px 10px', borderRadius: 8, border: 'none', whiteSpace: 'nowrap',
              background: tab === i ? color : 'var(--bg-surface)',
              color: tab === i ? '#fff' : 'var(--text-tertiary)',
              fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', flexShrink: 0,
            }}>
            {g.label}
          </button>
        ))}
      </div>

      {/* Icon grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 6, marginBottom: 20 }}>
        {ICON_GROUPS[tab].icons.map(em => (
          <button key={em} onClick={() => setIcon(em)}
            style={{
              height: 40, borderRadius: 8, border: '1.5px solid',
              borderColor: icon === em ? color : 'transparent',
              background: icon === em ? `${color}22` : 'var(--bg-surface)',
              fontSize: '1.25rem', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.1s',
            }}>
            {em}
          </button>
        ))}
      </div>

      {error && <p style={{ color: 'var(--danger)', fontSize: '0.875rem', textAlign: 'center', marginBottom: 12 }}>{error}</p>}

      <button className="btn-primary" onClick={handleSave}>
        {isEdit ? 'Save Changes' : 'Add Category'}
      </button>

      {isEdit && !initial?.is_system && (
        <button onClick={() => confirmDel ? onDelete() : setConfirmDel(true)}
          style={{
            width: '100%', height: 48, borderRadius: 9999, marginTop: 10, border: 'none', cursor: 'pointer',
            background: confirmDel ? 'var(--danger)' : 'rgba(239,68,68,0.1)',
            color: confirmDel ? '#fff' : 'var(--danger)', fontWeight: 600, fontSize: '0.9375rem',
          }}>
          {confirmDel ? 'Tap again to delete' : 'Delete Category'}
        </button>
      )}
    </div>
  );
}
