import React from 'react';

function renderInlineSegments(text: string): React.ReactNode[] {
  // Strip any stray LaTeX wrappers cleanly before rendering inline bold/code tokens
  const normalized = text
    .replace(/\$\\Delta\s*V\$/g, 'Delta-V')
    .replace(/\$\\Delta\s*v_t\$/g, 'Delta-vt')
    .replace(/\$\\Delta\s*s\$/g, 'Delta-s')
    .replace(/\$\\Delta\s*m\$/g, 'Delta-m')
    .replace(/\$P_c\$/g, 'Pc')
    .replace(/\$B\*\$/g, 'B*')
    .replace(/\$F_\{10\.7\}\$/g, 'F10.7')
    .replace(/\$Kp\$/g, 'Kp')
    .replace(/\$N_2H_4\$/g, 'N2H4')
    .replace(/\$([^$]+)\$/g, '$1');

  const tokens = normalized.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return tokens.map((token, idx) => {
    if (token.startsWith('**') && token.endsWith('**') && token.length > 4) {
      return (
        <strong key={idx} className="font-semibold text-slate-100">
          {token.slice(2, -2)}
        </strong>
      );
    }
    if (token.startsWith('`') && token.endsWith('`') && token.length > 2) {
      return (
        <code
          key={idx}
          className="px-1 py-0.5 rounded bg-space-950 border border-space-700 text-accent-300 font-mono text-[11px]"
        >
          {token.slice(1, -1)}
        </code>
      );
    }
    return <React.Fragment key={idx}>{token}</React.Fragment>;
  });
}

/**
 * Renders multi-line engineering responses cleanly without raw Markdown asterisks or LaTeX syntax.
 */
export const FormattedTelemetryText: React.FC<{ content: string }> = ({ content }) => {
  const lines = content.split('\n');
  return (
    <div className="space-y-1.5 text-xs leading-relaxed text-slate-300">
      {lines.map((line, i) => {
        const trimmed = line.trim();
        if (!trimmed) {
          return <div key={i} className="h-1" />;
        }
        if (/^[•\-*]\s+/.test(trimmed)) {
          const itemText = trimmed.replace(/^[•\-*]\s+/, '');
          return (
            <div key={i} className="flex items-start gap-2 pl-1">
              <span className="mt-1.5 w-1 h-1 rounded-full bg-accent-400 shrink-0" aria-hidden="true" />
              <span>{renderInlineSegments(itemText)}</span>
            </div>
          );
        }
        return <p key={i}>{renderInlineSegments(trimmed)}</p>;
      })}
    </div>
  );
};

