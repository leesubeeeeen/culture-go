import { useState, useRef, useCallback } from 'react'
import { collection, query, where, getDocs, doc, updateDoc, addDoc } from 'firebase/firestore'
import { db } from '../../../config/firebase'
import type { Monster } from '../../../types'
import { getUserId } from '../../../utils/userId'

/**
 * [B 영역] 포획 게임 캔버스 (카메라 화면 복구 & 즉시 융합 & 중복 생성 버그 차단 버전)
 */

const TOOLS = {
  tornBag: { label: '찢어진 비닐봉지', rate: 0.3 },
  basicNet: { label: '기본 잠자리채', rate: 0.45 },
  premiumNet: { label: '고급 잠자리채', rate: 0.7 },
}

const DEMO_CHEAT_100 = true
const DEFAULT_MAX_HP = 100

const EVOLVED_MONSTER = { name: '말차튀소용용', imageUrl: '/monsters/말차튀소용용.jpg' }

type Phase = 'fighting' | 'judging' | 'caught' | 'fled' | 'fusion_ready' | 'fusing' | 'fusion_complete'

interface Props {
  monster: Monster
  toolKey?: keyof typeof TOOLS
  onCaptured: (monster: Monster) => void
  onClose: () => void
}

export default function CatchCanvas({
  monster,
  toolKey: _toolKey = 'basicNet',
  onCaptured,
  onClose,
}: Props) {
  const [hp, setHp] = useState(DEFAULT_MAX_HP)
  const [phase, setPhase] = useState<Phase>('fighting')
  const [hits, setHits] = useState<{ id: number; x: number; y: number; dmg: number }[]>([])
  const [shake, setShake] = useState(false)
  const lastPos = useRef<{ x: number; y: number } | null>(null)

  // 🔒 [중복 저장 방지 락] 짧은 순간 두 번 연속 실행되는 트랜잭션 충돌을 원천 차단합니다.
  const isSaving = useRef(false)

  const [fusionLog, setFusionLog] = useState('튀소용 3마리가 공명합니다...')
  const currentUserId = getUserId()

  const registerHit = useCallback((x: number, y: number, dmg: number) => {
    const id = Date.now() + Math.random()
    setHits((prev) => [...prev, { id, x, y, dmg }])
    setShake(true)
    setTimeout(() => setShake(false), 120)
    setTimeout(() => setHits((prev) => prev.filter((h) => h.id !== id)), 600)
  }, [])

  // 📝 [일반 몬스터 도감 저장] 중복 생성 버그 완벽 수정
  const saveToInventory = async (targetMonster: Monster) => {
    // 이미 파이어베이스에 한 번 빨려 들어가는 중이라면 중복 처리를 즉시 거부(Return)
    if (isSaving.current) return
    isSaving.current = true

    try {
      const monsterRaw = targetMonster as any
      const q = query(
        collection(db, 'user_inventory'),
        where('userId', '==', currentUserId), 
        where('monsterName', '==', targetMonster.name),
        where('isFused', '==', false)
      )
      const snapshot = await getDocs(q)

      if (!snapshot.empty) {
        const inventoryDoc = snapshot.docs[0]
        const currentCount = inventoryDoc.data().count || 0
        await updateDoc(doc(db, 'user_inventory', inventoryDoc.id), {
          count: currentCount + 1
        })
      } else {
        await addDoc(collection(db, 'user_inventory'), {
          userId: currentUserId, 
          monsterName: targetMonster.name,
          category: targetMonster.category,
          monsterImageUrl: targetMonster.imageUrl, 
          imageUrl: targetMonster.imageUrl, 
          count: 1,
          isFused: false,
          shopId: monsterRaw.shopId || 'shop_sungsimdang',
          shopName: monsterRaw.shopName || '성심당 본점',
          capturedAt: new Date()
        })
      }
      console.log(`[도감 저장 완료]: ${targetMonster.name}`)
    } catch (error) {
      console.error('도감 저장 실패:', error)
    } finally {
      // 통신 처리가 완벽히 끝나면 다시 락을 풀어줌
      isSaving.current = false
    }
  }

  // 🎯 [핵심 수식] 포획 성공 판정 시 카운트 체크 및 즉시 융합 분기점
  const checkFusionTrigger = async () => {
    if (!monster.name.includes('튀소')) {
      await saveToInventory(monster)
      onCaptured(monster)
      setPhase('caught')
      return
    }

    const currentCatchCount = Number(sessionStorage.getItem('DEMO_TOWISO_COUNT') || '0') + 1
    sessionStorage.setItem('DEMO_TOWISO_COUNT', currentCatchCount.toString())

    console.log(`현재 포획 스택: ${currentCatchCount}마리`)

    if (currentCatchCount >= 3) {
      setPhase('fusion_ready')
    } else {
      await saveToInventory(monster)
      onCaptured(monster)
      setPhase('caught')
    }
  }

  const executeFusion = async () => {
    if (isSaving.current) return
    isSaving.current = true

    setPhase('fusing')
    const monsterRaw = monster as any

    setTimeout(() => setFusionLog('포획한 튀소 조각들을 정렬하는 중... ✨'), 500)

    try {
      const q = query(
        collection(db, 'user_inventory'),
        where('userId', '==', currentUserId),
        where('monsterName', '==', monster.name),
        where('isFused', '==', false)
      )
      const snapshot = await getDocs(q)
      if (!snapshot.empty) {
        const docRef = doc(db, 'user_inventory', snapshot.docs[0].id)
        await updateDoc(docRef, { count: 0, isFused: true })
      }

      await new Promise((r) => setTimeout(r, 1200))

      await addDoc(collection(db, 'user_inventory'), {
        userId: currentUserId,
        monsterName: EVOLVED_MONSTER.name,
        category: '빵',
        monsterImageUrl: EVOLVED_MONSTER.imageUrl,
        imageUrl: EVOLVED_MONSTER.imageUrl,
        count: 1,
        isFused: false,
        shopId: monsterRaw.shopId || 'shop_sungsimdang',
        shopName: monsterRaw.shopName || '성심당 본점',
        capturedAt: new Date(),
      })

      sessionStorage.removeItem('DEMO_TOWISO_COUNT')
      onCaptured({ ...monster, name: EVOLVED_MONSTER.name, imageUrl: EVOLVED_MONSTER.imageUrl })
      setPhase('fusion_complete')
    } catch (error) {
      console.error('융합 도감 갱신 에러:', error)
      sessionStorage.removeItem('DEMO_TOWISO_COUNT')
      setPhase('fusion_complete')
    } finally {
      isSaving.current = false
    }
  }

  const judgeCapture = useCallback(() => {
    setPhase('judging')
    setTimeout(() => {
      if (DEMO_CHEAT_100) {
        checkFusionTrigger()
      } else {
        setPhase('fled')
      }
    }, 700)
  }, [monster])

  const handleMove = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (phase !== 'fighting') return
      const point = 'touches' in e ? e.touches[0] : e
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
      const x = point.clientX - rect.left
      const y = point.clientY - rect.top
      if (lastPos.current) {
        const dx = x - lastPos.current.x
        const dy = y - lastPos.current.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        const dmg = Math.min(25, Math.max(5, Math.round(dist / 6)))
        setHp((prev) => {
          const next = Math.max(0, prev - dmg)
          if (next === 0 && prev > 0) setTimeout(judgeCapture, 400)
          return next
        })
        registerHit(x, y, dmg)
      }
      lastPos.current = { x, y }
    },
    [phase, registerHit, judgeCapture],
  )

  const hpPercent = (hp / DEFAULT_MAX_HP) * 100

  return (
    <div className="absolute inset-0 z-10 select-none bg-transparent" style={{ touchAction: 'none' }}>
      {/* HP 바 영역 */}
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
      <div className="absolute inset-0 z-10" onMouseMove={handleMove} onTouchMove={handleMove} onMouseUp={() => { lastPos.current = null }} onTouchEnd={() => { lastPos.current = null }}>
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
          <div key={h.id} className="absolute font-extrabold text-2xl text-white pointer-events-none" style={{ left: h.x, top: h.y, transform: 'translate(-50%, -50%)', textShadow: '0 0 8px #ff6b35, 0 2px 4px #000', animation: 'catchFloatUp 0.6s ease-out forwards' }}>
            -{h.dmg}
          </div>
        ))}
      </div>

      {/* 하단 모달 팝업 */}
      <div className="absolute bottom-0 left-0 right-0 p-6 z-20 text-center">
        {phase === 'fighting' && (
          <p className="inline-block text-white text-base bg-black/60 px-4 py-2 rounded-full drop-shadow">
            👆 화면을 마구 문질러서 체력을 깎으세요!
          </p>
        )}
        
        {phase === 'judging' && <p className="text-yellow-300 text-lg font-bold animate-pulse">캡슐 가동 중...</p>}
        
        {phase === 'caught' && (
          <div className="bg-slate-900/95 text-white rounded-2xl p-5 border border-green-500 shadow-xl">
            <p className="text-green-400 text-xl font-extrabold mb-1">🎉 포획 성공! 🎉</p>
            <p className="text-gray-300 text-sm mb-4">{monster.name}이(가) 가방에 들어왔습니다.</p>
            <button onClick={onClose} className="bg-green-500 text-slate-950 font-bold px-7 py-2.5 rounded-xl w-full">확인</button>
          </div>
        )}

        {phase === 'fusion_ready' && (
          <div className="bg-slate-900/95 text-white rounded-2xl p-6 border-2 border-amber-400 shadow-2xl">
            <div className="text-amber-400 text-xs font-bold tracking-wider mb-1">✨ SPECIAL EVOLUTION ✨</div>
            <p className="text-xl font-black text-yellow-300 mb-2">3마리 포획 완료! 공명 감지</p>
            <p className="text-sm text-gray-300 mb-4">
              방금 잡은 개체를 포함해 총 <span className="text-amber-400 font-bold">3마리</span>가 모였습니다.<br/>
              도감으로 가기 전, 여기서 즉시 <span className="text-green-400 font-bold">말차튀소용</span>로 결합하겠습니까?
            </p>
            <button onClick={executeFusion} className="w-full bg-gradient-to-r from-yellow-400 to-amber-500 text-slate-950 font-black py-3.5 rounded-xl text-base shadow-lg">
              🍵 즉시 말차튀소용로 융합하기!
            </button>
          </div>
        )}

        {phase === 'fusing' && (
          <div className="bg-slate-900/95 text-white rounded-2xl p-6 border border-green-400 shadow-xl">
            <div className="w-10 h-10 border-4 border-green-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-green-400 font-bold text-base tracking-wide">{fusionLog}</p>
          </div>
        )}

        {phase === 'fusion_complete' && (
          <div className="bg-gradient-to-b from-slate-900 to-green-950 text-white rounded-2xl p-6 border-2 border-green-400 shadow-2xl">
            <h3 className="text-2xl font-black text-green-400 mb-1">🍵 말차튀소용 진화 성공! 🍵</h3>
            <p className="text-xs text-gray-400 mb-4">성심당 구역 한정판 레어 소보로 몬스터</p>
            <div className="bg-black/40 rounded-xl py-3.5 mb-5 border border-green-900/50 px-3 text-sm text-gray-300">
              튀소용 3마리가 하나로 합쳐져 <span className="text-green-400 font-bold">말차튀소용 1마리</span>로 도감에 영구 저장되었습니다!
            </div>
            <button onClick={onClose} className="bg-green-400 text-slate-950 font-black px-8 py-3 rounded-xl w-full text-base">
              도감함에서 확인하기
            </button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes catchFloatUp {
          0% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
          100% { opacity: 0; transform: translate(-50%, -140%) scale(1.3); }
        }
      `}</style>
    </div>
  )
}