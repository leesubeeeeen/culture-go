import { useState, useEffect } from 'react'
import type { UserInventory } from '../../../types'
import { useFusion } from '../hooks/useFusion'

type Step = 'confirm' | 'animating' | 'done'

interface Props {
  item:    UserInventory
  onClose: () => void
}

const STEPS = [
  '몬스터 조각들을 정렬하는 중... ✨',
  'AI가 전설의 비주얼을 렌더링 중... 🎨',
  '말차튀소가 깨어납니다... 🍵',
]

export default function FusionModal({ item, onClose }: Props) {
  const { executeFusion } = useFusion()
  const [step, setStep]   = useState<Step>('confirm')
  const [log, setLog]     = useState('')

  useEffect(() => {
    if (step !== 'animating') return
    let i = 0
    setLog(STEPS[0])
    const timer = setInterval(() => {
      i++
      if (i < STEPS.length) setLog(STEPS[i])
      else {
        clearInterval(timer)
        executeFusion(item).then(() => setStep('done'))
      }
    }, 800)
    return () => clearInterval(timer)
  }, [step])

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white w-full max-w-md rounded-t-3xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-gray-200 rounded-full" />
        </div>

        {/* 확인 단계 */}
        {step === 'confirm' && (
          <div className="p-6 flex flex-col gap-4">
            <div className="text-center">
              <p className="text-xs text-amber-500 font-bold tracking-wider mb-1">✨ SPECIAL EVOLUTION ✨</p>
              <h2 className="text-xl font-black text-gray-900">3마리 공명 감지!</h2>
              <p className="text-sm text-gray-500 mt-1">
                {item.monsterName} 3마리를<br />
                <span className="text-green-600 font-bold">말차튀소</span>로 융합하겠습니까?
              </p>
            </div>
            <div className="flex items-center justify-center gap-4">
              <div className="w-16 h-16 rounded-2xl overflow-hidden bg-amber-50 border border-amber-200 flex items-center justify-center">
                <img src={item.monsterImageUrl} alt={item.monsterName} className="w-full h-full object-contain" />
              </div>
              <span className="text-2xl">×3 →</span>
              <div className="w-16 h-16 rounded-2xl overflow-hidden bg-green-50 border border-green-200 flex items-center justify-center">
                <img src="/monsters/evolved.png" alt="말차튀소" className="w-full h-full object-contain" />
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={onClose} className="flex-1 py-3 rounded-2xl border border-gray-200 text-sm font-bold text-gray-500">
                취소
              </button>
              <button
                onClick={() => setStep('animating')}
                className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-yellow-400 to-amber-500 text-gray-900 font-black text-sm"
              >
                🍵 융합하기!
              </button>
            </div>
          </div>
        )}

        {/* 애니메이션 단계 */}
        {step === 'animating' && (
          <div className="p-8 flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-amber-400 border-t-transparent rounded-full animate-spin" />
            <p className="text-amber-700 font-bold text-sm text-center">{log}</p>
          </div>
        )}

        {/* 완료 단계 */}
        {step === 'done' && (
          <div className="p-6 flex flex-col items-center gap-4">
            <div className="w-28 h-28 rounded-3xl overflow-hidden bg-gradient-to-b from-green-50 to-amber-50 border-2 border-green-300 flex items-center justify-center">
              <img src="/monsters/evolved.png" alt="말차튀소" className="w-full h-full object-contain" />
            </div>
            <div className="text-center">
              <h2 className="text-2xl font-black text-green-600">🍵 말차튀소 진화!</h2>
              <p className="text-sm text-gray-500 mt-1">도감에 저장됐어요</p>
              <p className="text-xs text-amber-600 mt-2">🎫 쿠폰함에서 발급된 쿠폰을 확인하세요!</p>
            </div>
            <button
              onClick={onClose}
              className="w-full py-3.5 rounded-2xl bg-green-500 text-white font-black"
            >
              확인
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
