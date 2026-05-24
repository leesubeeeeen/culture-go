import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Monster } from '../../../types'
import KakaoMap from '../components/KakaoMap'

// 🎯 대전광역시 궁동 충남대학교 공과대학 5호관 좌표
const CNU_ENG_5 = { lat: 36.3667148, lng: 127.3443006 }

export default function UserMainMap() {
  const navigate = useNavigate()
  const [monsters, setMonsters] = useState<Monster[]>([])
  const [userLocation] = useState(CNU_ENG_5)
  const [selectedMonster, setSelectedMonster] = useState<Monster | null>(null)

  useEffect(() => {
    const testMonster: Monster = {
      id: 'test_monster_cnu',
      name: '튀소용', // 🎯 캔버스의 진화 트리거와 정확히 매치되도록 이름을 '튀소용'으로 고정!
      imageUrl: '/monsters/튀소용.png',
      category: '빵몬스터',
      shopId: 'shop_sungsimdang',
      lat: CNU_ENG_5.lat,  
      lng: CNU_ENG_5.lng,  
      status: 'approved'
    }
    setMonsters([testMonster])
  }, [])

  const handleMonsterClick = useCallback((monster: Monster) => {
    setSelectedMonster(monster)
  }, [])

  const handleCatch = () => {
    if (!selectedMonster) return

    const target = {
      id: selectedMonster.id,
      name: selectedMonster.name,
      imageUrl: selectedMonster.imageUrl, 
      category: selectedMonster.category,
      shopId: selectedMonster.shopId,
      lat: selectedMonster.lat,
      lng: selectedMonster.lng,
    }

    sessionStorage.setItem('catchTarget', JSON.stringify(target))
    navigate('/catch')
  }

  return (
    <div className="flex flex-col h-full bg-white relative">
      <header className="flex items-center justify-between px-5 pt-12 pb-4 bg-white border-b border-gray-50 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-amber-400 rounded-xl flex items-center justify-center shadow-sm">
            <span className="text-sm">🐾</span>
          </div>
          <div>
            <h1 className="text-lg font-black text-gray-900 tracking-tight leading-none">Culture Go (테스트)</h1>
            <p className="text-[10px] text-amber-500 mt-1 font-bold">📍 충남대 공대 5호관 고정 테스트 중</p>
          </div>
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
        <div className="absolute inset-0 bg-black/25 flex items-end z-50" onClick={() => setSelectedMonster(null)}>
          <div className="w-full bg-white rounded-t-3xl px-6 pt-5 pb-10 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5" />
            <div className="flex items-center gap-4 mb-6">
              <div className="w-20 h-20 rounded-2xl border border-amber-200 overflow-hidden bg-amber-50 flex items-center justify-center shrink-0">
                <img src={selectedMonster.imageUrl} className="w-full h-full object-cover" alt={selectedMonster.name} />
              </div>
              <div className="flex-1 min-w-0">
                <span className="inline-block text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-md font-bold mb-1">
                  {selectedMonster.category}
                </span>
                <h2 className="text-xl font-black text-gray-900 truncate">{selectedMonster.name}</h2>
                <p className="text-xs text-gray-400 mt-1">📍 충남대 공대 5호관 고정 출현!</p>
              </div>
            </div>
            <button onClick={handleCatch} className="w-full py-4 rounded-2xl bg-amber-400 hover:bg-amber-500 font-black text-gray-900 text-base shadow-sm">
              🎯 포획 화면으로 진입하기
            </button>
          </div>
        </div>
      )}
    </div>
  )
}