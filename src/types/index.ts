// users 컬렉션 — Firebase Auth UID를 문서 ID로 사용
export interface AppUser {
  id: string          // Firebase Auth UID
  email: string
  name: string
  role: 'customer' | 'merchant'
  createdAt: Date
}

// monsters 컬렉션 — 상인이 등록, status='approved'가 되면 유저 지도에 표시
export interface Monster {
  id: string
  shopId: string
  shopName: string
  name: string
  description?: string
  attribute?: string
  rarity?: 'common' | 'rare' | 'epic' | 'legendary'
  category: string
  lat: number
  lng: number
  status: 'approved' | 'pending'
  imageUrl: string
  couponTemplateId?: string | null  // 상인이 쿠폰 등록 시 역참조로 기록
}

// couponTemplates 컬렉션 — 상인이 등록한 쿠폰 템플릿 (유저 쿠폰과 분리)
export interface CouponTemplate {
  id: string
  shopId: string
  shopName: string
  monsterId: string  // Monster 컬렉션 문서 ID
  title: string
  benefit: string
  category: string
  createdAt: Date
}

// shops 컬렉션
export interface Shop {
  id: string
  name: string
  category: string
  image: string
  lat: number
  lng: number
}

// user_inventory 컬렉션
// B팀이 포획 성공 시 addDoc할 때 아래 필드를 모두 채워야 합니다.
export interface UserInventory {
  id: string
  userId: string
  monsterId: string
  shopId: string
  shopName: string
  monsterName: string
  monsterImageUrl: string
  category: string
  count: number    // 3 이상이면 융합 버튼 활성화
  isFused: boolean // 융합 완료 후 true
}

// coupons 컬렉션 — 유저에게 발급된 쿠폰만 존재 (템플릿은 couponTemplates 컬렉션)
export interface Coupon {
  id: string
  userId: string
  monsterId: string    // 융합 대상 Monster 문서 ID
  templateId: string | null  // 참조한 couponTemplates 문서 ID (템플릿 없이 발급 시 null)
  shopId: string
  shopName: string
  title: string
  benefit: string      // 혜택 내용 (예: 아메리카노 1잔 무료)
  category: string
  isUsed: boolean
  createdAt: Date
}

// merchants 컬렉션 — 상인 가게 인증 (최초 1회, 문서 ID = uid)
export interface MerchantVerification {
  uid: string
  shopName: string
  shopId: string
  category: string
  lat: number
  lng: number
  businessNumber: string
  status: 'verified'      // 데모: 제출 즉시 verified
  createdAt: Date
}

// AR 포획 화면에 넘길 몬스터 정보 (sessionStorage 키: 'catchTarget')
export interface CatchTarget {
  monsterId: string
  monsterName: string
  monsterImageUrl: string
  category: string
  shopId: string
  shopName: string
}
