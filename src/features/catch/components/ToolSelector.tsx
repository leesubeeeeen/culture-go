export const TOOLS = {
  tornBag:    { label: '찢어진 비닐봉지', emoji: '🛍️' },
  basicNet:   { label: '기본 잠자리채',   emoji: '🕸️' },
  premiumNet: { label: '고급 잠자리채',   emoji: '✨' },
} as const

export type ToolKey = keyof typeof TOOLS

interface Props {
  selected: ToolKey
  onChange: (key: ToolKey) => void
}

export default function ToolSelector({ selected, onChange }: Props) {
  return (
    <div className="flex gap-2 px-4 pb-6 pt-2">
      {(Object.entries(TOOLS) as [ToolKey, typeof TOOLS[ToolKey]][]).map(([key, tool]) => (
        <button
          key={key}
          onClick={() => onChange(key)}
          className={`flex-1 flex flex-col items-center gap-1 py-2.5 rounded-2xl border-2 transition-all active:scale-95 ${
            selected === key
              ? 'border-amber-400 bg-amber-50 shadow-sm shadow-amber-200'
              : 'border-gray-200 bg-white/80'
          }`}
        >
          <span className="text-2xl">{tool.emoji}</span>
          <span className="text-[10px] font-bold text-gray-700 leading-tight text-center">
            {tool.label}
          </span>
        </button>
      ))}
    </div>
  )
}
