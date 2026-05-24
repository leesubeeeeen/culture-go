import type { Monster } from '../../../types'
import { useCatchGame } from '../hooks/useCatchGame'

interface Props {
  monster:    Monster
  onCaptured: () => void
  onClose:    () => void
}

export default function CatchCanvas({ monster, onCaptured, onClose }: Props) {
  const { hpPercent, phase, hits, shake, handleMove, releasePointer } = useCatchGame(onCaptured)

  return (
    <div className="absolute inset-0 z-10 select-none bg-transparent" style={{ touchAction: 'none' }}>
      {/* HP 바 */}
      {(phase === 'fighting' || phase === 'judging') && (
        <div className="absolute top-0 left-0 right-0 p-4 z-20 bg-gradient-to-b from-black/60 to-transparent">
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-white font-bold text-lg drop-shadow">{monster.name}</span>
            <button onClick={onClose} className="bg-black/40 text-white rounded-lg px-2.5 py-1">✕</button>
          </div>
          <div className="h-2.5 bg-black/40 rounded-md overflow-hidden">
            <div
              className="h-full transition-all duration-150"
              style={{
                width: `${hpPercent}%`,
                background: hpPercent > 50 ? '#4ade80' : hpPercent > 20 ? '#facc15' : '#ef4444',
              }}
            />
          </div>
        </div>
      )}

      {/* 타격 영역 */}
      <div
        className="absolute inset-0 z-10"
        onMouseMove={handleMove}
        onTouchMove={handleMove}
        onMouseUp={releasePointer}
        onTouchEnd={releasePointer}
      >
        {(phase === 'fighting' || phase === 'judging') && (
          <img
            src={monster.imageUrl}
            alt={monster.name}
            draggable={false}
            className="absolute top-1/2 left-1/2 w-40 h-40 object-contain pointer-events-none transition-transform"
            style={{ transform: `translate(-50%, -50%) ${shake ? 'scale(1.1) rotate(3deg)' : ''}` }}
          />
        )}
        {hits.map((h) => (
          <div
            key={h.id}
            className="absolute font-extrabold text-2xl text-white pointer-events-none"
            style={{
              left: h.x, top: h.y,
              transform: 'translate(-50%, -50%)',
              textShadow: '0 0 8px #ff6b35, 0 2px 4px #000',
              animation: 'catchFloatUp 0.6s ease-out forwards',
            }}
          >
            -{h.dmg}
          </div>
        ))}
      </div>

      {/* 하단 상태 표시 */}
      <div className="absolute bottom-0 left-0 right-0 p-6 z-20 text-center">
        {phase === 'fighting' && (
          <p className="inline-block text-white text-base bg-black/60 px-4 py-2 rounded-full drop-shadow">
            👆 화면을 마구 문질러서 체력을 깎으세요!
          </p>
        )}

        {phase === 'judging' && (
          <p className="text-yellow-300 text-lg font-bold animate-pulse">캡슐 가동 중...</p>
        )}

        {phase === 'caught' && (
          <div className="bg-slate-900/95 text-white rounded-2xl p-5 border border-green-500 shadow-xl">
            <p className="text-green-400 text-xl font-extrabold mb-1">🎉 포획 성공! 🎉</p>
            <p className="text-gray-300 text-sm mb-4">{monster.name}이(가) 도감에 추가됐습니다.</p>
            <button onClick={onClose} className="bg-green-500 text-slate-950 font-bold px-7 py-2.5 rounded-xl w-full">
              확인
            </button>
          </div>
        )}

        {phase === 'fled' && (
          <div className="bg-slate-900/95 text-white rounded-2xl p-5 border border-red-400 shadow-xl">
            <p className="text-red-400 text-xl font-extrabold mb-1">😢 도망갔다!</p>
            <button onClick={onClose} className="bg-gray-600 text-white font-bold px-7 py-2.5 rounded-xl w-full mt-3">
              돌아가기
            </button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes catchFloatUp {
          0%   { opacity: 1; transform: translate(-50%, -50%) scale(1); }
          100% { opacity: 0; transform: translate(-50%, -140%) scale(1.3); }
        }
      `}</style>
    </div>
  )
}
