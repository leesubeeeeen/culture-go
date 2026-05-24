import { useRef } from 'react'
import { collection, doc, updateDoc, addDoc, getDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../../../config/firebase'
import type { UserInventory } from '../../../types'
import { getUserId } from '../../../utils/userId'

const EVOLVED_IMAGE = '/monsters/evolved.png'

export function useFusion() {
  const isFusing = useRef(false)
  const userId   = getUserId()

  const executeFusion = async (item: UserInventory): Promise<boolean> => {
    if (isFusing.current) return false
    isFusing.current = true
    try {
      // 1. 기존 인벤토리 항목 → isFused
      await updateDoc(doc(db, 'user_inventory', item.id), { count: 0, isFused: true })

      // 2. 말차튀소 도감에 추가
      await addDoc(collection(db, 'user_inventory'), {
        userId,
        monsterId:       `evolved_${item.monsterId}`,
        monsterName:     '말차튀소',
        category:        item.category,
        monsterImageUrl: EVOLVED_IMAGE,
        imageUrl:        EVOLVED_IMAGE,
        shopId:          item.shopId,
        shopName:        item.shopName,
        count:           1,
        isFused:         false,
        capturedAt:      new Date(),
      })

      // 3. Monster 문서에서 couponTemplateId 조회
      const monsterSnap = await getDoc(doc(db, 'Monster', item.monsterId))
      const couponTemplateId: string | null = monsterSnap.data()?.couponTemplateId ?? null

      let couponPayload: Record<string, unknown> = {
        userId,
        monsterId:  item.monsterId,
        templateId: null,
        shopId:     item.shopId,
        shopName:   item.shopName || '상점',
        title:      `${item.monsterName} 융합 쿠폰`,
        benefit:    '',
        category:   item.category,
        isUsed:     false,
        createdAt:  serverTimestamp(),
      }

      // 4. 템플릿이 있으면 제목/혜택을 상인 등록 내용으로 덮어쓰기
      if (couponTemplateId) {
        const templateSnap = await getDoc(doc(db, 'couponTemplates', couponTemplateId))
        if (templateSnap.exists()) {
          const t = templateSnap.data()
          couponPayload = {
            ...couponPayload,
            templateId: couponTemplateId,
            title:      t.title   ?? couponPayload.title,
            benefit:    t.benefit ?? '',
          }
        }
      }

      await addDoc(collection(db, 'coupons'), couponPayload)

      return true
    } catch (err) {
      console.error('융합 에러:', err)
      return false
    } finally {
      isFusing.current = false
    }
  }

  return { executeFusion }
}
