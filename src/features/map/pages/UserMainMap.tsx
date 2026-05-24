import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { collection, query, where, onSnapshot, getDocs, limit } from 'firebase/firestore'
import { db } from '../../../config/firebase'
import type { Monster } from '../../../types'
import KakaoMap from '../components/KakaoMap'

const CNU_ENG_5 = { lat: 36.3667148, lng: 127.3443006 }

// 공과대학5호관(place.map.kakao.com/17561301) 주변 고정 핀 위치
const PINNED_POSITIONS = [
  { lat: 36.3673, lng: 127.3450 },
  { lat: 36.3661, lng: 127.3437 },
]

export default function UserMainMap() {
  const navigate = useNavigate()
  const [pinnedMonsters, setPinnedMonsters] = useState<Monster[]>([])
  const [liveMonsters, setLiveMonsters]     = useState<Monster[]>([])
  const [userLocation, setUserLocation]     = useState(CNU_ENG_5)
  const [selectedMonster, setSelectedMonster] = useState<Monster | null>(null)

  // 실제 Monster 컬렉션에서 2마리 가져와 CNU5 근처에 고정
  useEffect(() => {
    getDocs(
      query(collection(db, 'Monster'), where('status', '==', 'approved'), limit(10))
    ).then((snap) => {
      const valid = snap.docs.filter((d) => d.id !== 'monster_001')
      const pinned = valid.slice(0, 2).map((d, i) => ({
        ...(d.data() as Omit<Monster, 'id'>),
        id:  `pinned_${d.id}`,
        lat: PINNED_POSITIONS[i].lat,
        lng: PINNED_POSITIONS[i].lng,
      } as Monster))
      setPinnedMonsters(pinned)
    })
  }, [])

  // 실시간 Firestore 구독 (pinned로 올라간 원본 ID 제외)
  useEffect(() => {
    const q = query(collection(db, 'Monster'), where('status', '==', 'approved'))
    return onSnapshot(q, (snap) => {
      const fromFirestore = snap.docs
        .filter((d) => d.id !== 'monster_001')
        .map((d) => ({ id: d.id, ...d.data() } as Monster))
      setLiveMonsters(fromFirestore)
    })
  }, [])

  useEffect(() => {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {},
      { timeout: 5000 }
    )
  }, [])

  // pinned 원본 ID를 liveMonsters에서 제외해 중복 방지
  const pinnedOriginalIds = new Set(pinnedMonsters.map((m) => m.id.replace('pinned_', '')))
  const monsters = [
    ...pinnedMonsters,
    ...liveMonsters.filter((m) => !pinnedOriginalIds.has(m.id)),
  ]

  const handleMonsterClick = useCallback((monster: Monster) => {
    setSelectedMonster(monster)
  }, [])

  const handleCatch = () => {
    if (!selectedMonster) return
    sessionStorage.setItem('catchTarget', JSON.stringify({
      id:       selectedMonster.id.replace('pinned_', ''),  // 원본 ID로 저장
      name:     selectedMonster.name,
      imageUrl: selectedMonster.imageUrl,
      category: selectedMonster.category,
      shopId:   selectedMonster.shopId,
      shopName: selectedMonster.shopName,
      lat:      selectedMonster.lat,
      lng:      selectedMonster.lng,
    }))
    navigate('/catch')
  }

  return (
    <div className="flex flex-col h-full bg-white relative">
      <header className="flex items-center justify-between px-5 pt-12 pb-4 bg-white border-b border-gray-50 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-amber-400 rounded-xl flex items-center justify-center shadow-sm">
            <span className="text-sm">🐾</span>
          </div>
          <h1 className="text-lg font-black text-gray-900 tracking-tight leading-none">Culture Go</h1>
        </div>
      </header>

      <div className="flex-1 relative overflow-hidden">
        <KakaoMap
          monsters={monsters}
          userLocation={userLocation}
          onMonsterClick={handleMonsterClick}
        />
      </div>

      {selectedMonster && (
        <div
          className="absolute inset-0 bg-black/25 flex items-end z-50"
          onClick={() => setSelectedMonster(null)}
        >
          <div
            className="w-full bg-white rounded-t-3xl px-6 pt-5 pb-10 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5" />
            <div className="flex items-center gap-4 mb-6">
              <div className="w-20 h-20 rounded-2xl border border-amber-200 overflow-hidden bg-amber-50 flex items-center justify-center shrink-0">
                {selectedMonster.imageUrl ? (
                  <img src={selectedMonster.imageUrl} className="w-full h-full object-contain" alt={selectedMonster.name} />
                ) : (
                  <span className="text-4xl">🐾</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <span className="inline-block text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-md font-bold mb-1">
                  {selectedMonster.category}
                </span>
                <h2 className="text-xl font-black text-gray-900 truncate">{selectedMonster.name}</h2>
                {selectedMonster.shopName && (
                  <p className="text-xs text-gray-400 mt-0.5">🏪 {selectedMonster.shopName}</p>
                )}
              </div>
            </div>
            <button
              onClick={handleCatch}
              className="w-full py-4 rounded-2xl bg-amber-400 hover:bg-amber-500 font-black text-gray-900 text-base shadow-sm"
            >
              🎯 포획 화면으로 진입하기
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
