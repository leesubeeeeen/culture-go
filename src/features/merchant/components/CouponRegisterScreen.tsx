import { useState, useEffect } from 'react'
import { collection, query, where, onSnapshot, addDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore'
import { db } from '../../../config/firebase'

interface MonsterItem {
  id: string
  name: string
  imageUrl: string
  attribute?: string
  rarity?: 'common' | 'rare' | 'epic' | 'legendary'
  category: string
}

interface Props {
  shopId: string
  shopName: string
}

const RARITY_STYLE: Record<string, string> = {
  common:    'bg-gray-100 text-gray-500',
  rare:      'bg-blue-100 text-blue-600',
  epic:      'bg-purple-100 text-purple-600',
  legendary: 'bg-amber-100 text-amber-600',
}
const RARITY_KO: Record<string, string> = {
  common: '커먼', rare: '레어', epic: '에픽', legendary: '레전더리',
}

export default function CouponRegisterScreen({ shopId, shopName }: Props) {
  const [monsters, setMonsters]   = useState<MonsterItem[]>([])
  const [fetching, setFetching]   = useState(true)
  const [selected, setSelected]   = useState<MonsterItem | null>(null)
  const [title, setTitle]         = useState('')
  const [benefit, setBenefit]     = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError]         = useState('')
  const [showPopup, setShowPopup] = useState(false)

  useEffect(() => {
    const q = query(collection(db, 'Monster'), where('shopId', '==', shopId))
    return onSnapshot(q, (snap) => {
      setMonsters(snap.docs.map((d) => {
        const data = d.data()
        return {
          id: d.id,
          name: data.name ?? '',
          imageUrl: data.imageUrl ?? '',
          attribute: data.attribute,
          rarity: data.rarity,
          category: data.category ?? '',
        }
      }))
      setFetching(false)
    })
  }, [shopId])

  const handleSubmit = async () => {
    if (!selected || !title.trim() || !benefit.trim()) return
    setIsSubmitting(true)
    setError('')
    try {
      // 1. couponTemplates 컬렉션에 템플릿 저장
      const templateRef = await addDoc(collection(db, 'couponTemplates'), {
        shopId,
        shopName,
        monsterId: selected.id,
        title:     title.trim(),
        benefit:   benefit.trim(),
        category:  selected.category,
        createdAt: serverTimestamp(),
      })

      // 2. Monster 문서에 couponTemplateId 역참조 기록
      await updateDoc(doc(db, 'Monster', selected.id), {
        couponTemplateId: templateRef.id,
      })

      await new Promise((r) => setTimeout(r, 800))
      setShowPopup(true)
    } catch {
      setError('쿠폰 등록 실패. 다시 시도해주세요.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleReset = () => {
    setSelected(null); setTitle(''); setBenefit('')
    setShowPopup(false); setError('')
  }

  if (fetching) {
    return (
      <div className="flex items-center justify-center py-20">
        <span className="text-4xl animate-bounce">🐾</span>
      </div>
    )
  }

  if (monsters.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3 px-5 text-center">
        <span className="text-5xl">🐉</span>
        <p className="font-bold text-gray-700">등록된 몬스터가 없어요</p>
        <p className="text-sm text-gray-400">먼저 몬스터 신청 탭에서 몬스터를 만들어주세요</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5 p-5">
      <div>
        <h2 className="text-lg font-black text-gray-900">쿠폰 등록</h2>
        <p className="text-xs text-gray-400 mt-0.5">몬스터를 선택하고 쿠폰을 등록해요</p>
      </div>

      <p className="text-xs text-gray-500 bg-blue-50 rounded-xl px-4 py-3">
        💡 유저가 해당 몬스터를 잡으면 등록된 쿠폰 혜택을 받을 수 있어요
      </p>

      {/* 몬스터 선택 */}
      <div>
        <p className="text-sm font-bold text-gray-700 mb-2">몬스터 선택 <span className="text-red-400">*</span></p>
        <div className="flex flex-col gap-2">
          {monsters.map((m) => (
            <button
              key={m.id}
              onClick={() => setSelected(m)}
              className={`flex items-center gap-3 px-4 py-3 rounded-2xl border-2 text-left transition-colors ${
                selected?.id === m.id ? 'border-amber-400 bg-amber-50' : 'border-gray-100 bg-white'
              }`}
            >
              <img
                src={m.imageUrl}
                alt={m.name}
                className="w-12 h-12 object-contain rounded-xl bg-gradient-to-b from-purple-50 to-amber-50 p-1 shrink-0"
              />
              <div className="flex-1 min-w-0">
                <p className="font-black text-gray-900 text-sm">{m.name}</p>
                {m.attribute && <p className="text-xs text-gray-500 mt-0.5">{m.attribute} 속성</p>}
              </div>
              {m.rarity && (
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full shrink-0 ${RARITY_STYLE[m.rarity]}`}>
                  {RARITY_KO[m.rarity]}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* 쿠폰 내용 입력 */}
      {selected && (
        <div className="flex flex-col gap-3 border border-gray-100 rounded-2xl p-4">
          <p className="text-sm font-black text-gray-700">
            쿠폰 내용 <span className="text-amber-500 font-normal">— {selected.name}</span>
          </p>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="쿠폰 이름 (예: 아메리카노 무료 쿠폰)"
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-amber-400"
          />
          <input
            value={benefit}
            onChange={(e) => setBenefit(e.target.value)}
            placeholder="혜택 내용 (예: 아메리카노 1잔 무료 증정)"
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-amber-400"
          />
        </div>
      )}

      {error && (
        <p className="text-sm text-red-500 bg-red-50 rounded-xl px-4 py-3">❌ {error}</p>
      )}

      <button
        onClick={handleSubmit}
        disabled={!selected || !title.trim() || !benefit.trim() || isSubmitting}
        className="w-full bg-amber-400 text-black font-black py-4 rounded-2xl text-base disabled:opacity-40"
      >
        {isSubmitting ? '⏳ 등록 중...' : '🎫 쿠폰 등록'}
      </button>

      {/* 완료 팝업 */}
      {showPopup && selected && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-t-3xl">
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 bg-gray-200 rounded-full" />
            </div>
            <div className="flex justify-center py-4">
              <span className="bg-green-500 text-white text-sm font-bold px-5 py-1.5 rounded-full shadow-md">
                ✅ 쿠폰이 등록되었습니다!
              </span>
            </div>
            <div className="flex justify-center">
              <div className="w-20 h-20 rounded-2xl overflow-hidden bg-gradient-to-b from-purple-50 to-amber-50 flex items-center justify-center p-2">
                <img src={selected.imageUrl} alt={selected.name} className="w-full h-full object-contain" />
              </div>
            </div>
            <p className="text-center text-sm font-black text-gray-900 mt-2">{selected.name}</p>
            <div className="mx-5 mt-4 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-4 flex items-center gap-3">
              <span className="text-2xl">🎫</span>
              <div>
                <p className="text-sm font-black text-gray-900">{title}</p>
                <p className="text-xs text-amber-700 mt-0.5">{benefit}</p>
              </div>
            </div>
            <div className="px-5 py-5">
              <button
                onClick={handleReset}
                className="w-full bg-gray-900 text-white font-black py-4 rounded-2xl text-base"
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
