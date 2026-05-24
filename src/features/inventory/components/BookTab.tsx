import { useState } from 'react'
import type { UserInventory } from '../../../types'
import FusionModal from './FusionModal'

const FUSION_REQUIRED = 3

interface Props {
  inventory: UserInventory[]
}

export default function BookTab({ inventory }: Props) {
  const [fusingItem, setFusingItem] = useState<UserInventory | null>(null)

  if (inventory.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-2 text-center">
        <span className="text-5xl">🐾</span>
        <p className="font-bold text-gray-600 mt-2">아직 잡은 몬스터가 없어요!</p>
        <p className="text-xs text-gray-400">지도로 나가서 몬스터를 포획해보세요.</p>
      </div>
    )
  }

  return (
    <>
      <div className="p-4 flex flex-col gap-2.5">
        {inventory.map((item) => {
          const canFuse = item.count >= FUSION_REQUIRED && !item.isFused
          return (
            <div
              key={item.id}
              className={`flex items-center gap-3 bg-white border border-gray-100 rounded-2xl p-3.5 shadow-sm ${item.isFused ? 'opacity-50' : ''}`}
            >
              <div className="w-14 h-14 rounded-xl border border-amber-200 overflow-hidden bg-amber-50 flex items-center justify-center shrink-0">
                {item.monsterImageUrl ? (
                  <img src={item.monsterImageUrl} className="w-full h-full object-contain" alt={item.monsterName} />
                ) : (
                  <span className="text-3xl">🐾</span>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm text-gray-900 truncate">{item.monsterName}</p>
                <p className="text-xs text-gray-400">{item.category}</p>
                {item.isFused ? (
                  <span className="text-xs text-purple-500 font-semibold">✨ 융합 완료</span>
                ) : (
                  <div className="flex items-center gap-1 mt-1.5">
                    {Array.from({ length: FUSION_REQUIRED }).map((_, i) => (
                      <div
                        key={i}
                        className={`w-5 h-5 rounded-full text-xs flex items-center justify-center font-black ${
                          i < item.count ? 'bg-amber-400 text-white' : 'bg-gray-100 text-gray-300'
                        }`}
                      >
                        {i < item.count ? '★' : '☆'}
                      </div>
                    ))}
                    <span className="text-xs text-gray-400 ml-1">{item.count}/{FUSION_REQUIRED}</span>
                  </div>
                )}
              </div>

              {canFuse && (
                <button
                  onClick={() => setFusingItem(item)}
                  className="bg-amber-400 hover:bg-amber-500 active:scale-95 transition-all text-gray-900 text-xs font-bold px-3 py-2 rounded-xl shrink-0"
                >
                  ✨ 융합!
                </button>
              )}
            </div>
          )
        })}
      </div>

      {fusingItem && (
        <FusionModal item={fusingItem} onClose={() => setFusingItem(null)} />
      )}
    </>
  )
}
