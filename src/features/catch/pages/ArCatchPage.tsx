



import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import CameraPreview from '../../../components/CameraPreview'
import CatchCanvas from '../components/CatchCanvas'
import type { Monster } from '../../../types'

/**
 * [B 영역] AR 포획 페이지 (/catch)
 * 지도의 바텀시트에서 넘어온 진짜 AI 몬스터 정보를 세션에서 꺼내어 매핑합니다.
 * 정보가 없을 경우를 대비해 타입 안정성이 확보된 approved 더미 몬스터를 폴백으로 유지합니다.
 */

const DUMMY_MONSTER: Monster = {
  id: 'monster_demo_1',
  shopId: 'shop_sungsimdang',
  name: '튀소용',
  category: '빵',
  lat: 36.3278,
  lng: 127.4275,
  status: 'approved', // 🛠️ [빨간줄 해결] 'active'를 규칙에 맞는 'approved'로 수정!
  imageUrl: '/monsters/튀소용.png',
}

export default function ArCatchPage() {
  const navigate = useNavigate()
  const [monster, setMonster] = useState<Monster>(DUMMY_MONSTER)

  // 🎯 [실시간 지도 연동] 지도가 세션에 구워준 진짜 몬스터(AI 이미지 포함)를 꺼내옵니다.
  useEffect(() => {
    const sessionTarget = sessionStorage.getItem('catchTarget')
    if (sessionTarget) {
      try {
        const parsed = JSON.parse(sessionTarget)
        // 친구의 타입과 내 CatchCanvas의 데이터 규격을 완벽하게 동기화
        setMonster({
          id: parsed.id,
          shopId: parsed.shopId || 'shop_sungsimdang',
          name: parsed.name,
          category: parsed.category,
          lat: parsed.lat || 36.3278,
          lng: parsed.lng || 127.4275,
          status: 'approved',
          imageUrl: parsed.imageUrl
        })
      } catch (e) {
        console.error('세션 데이터 파싱 실패, 더미로 구동합니다:', e)
      }
    }
  }, [])

  const handleCaptured = (caught: Monster) => {
    // A의 보관함 저장 로그 출력
    console.log('포획 성공 → 보관함 저장 필요:', caught.name)
  }

  const handleClose = () => {
    navigate('/map') // 닫으면 다시 지도로 안전하게 복귀
  }


  

  return (
    <div
      className="overflow-hidden bg-black"
      style={{
        position: 'fixed',
        top: 0,
        left: '50%',
        transform: 'translateX(-50%)',
        width: '100%',
        maxWidth: '28rem',
        height: '100vh',
        zIndex: 50,
      }}
    >
      {/* 카메라 배경 (A 제작) */}
      <CameraPreview />

      {/* 포획 게임 레이어 */}
      <CatchCanvas
        monster={monster}
        toolKey="basicNet"
        onCaptured={handleCaptured}
        onClose={handleClose}
      />
    </div>
  )
}
