'use client'
import { useCallback, useEffect, useState } from 'react'
import { getBrowserClient } from '@/lib/supabase/client'
import type { Shortlist } from '@/components/SaveToShortlist'

/**
 * ดึง Shortlist ของผู้ใช้และสถานะสมาชิกของผู้สมัครหลายคนพร้อมกัน
 *
 * **ดึงทีเดียวสำหรับทั้งหน้า ไม่ใช่ปุ่มละครั้ง** — หน้าผลการค้นหามีผู้สมัครได้หลายสิบคน
 * ถ้าปุ่มแต่ละตัวดึงเอง หน้าหนึ่งจะยิงคำขอหลายสิบครั้งที่ได้คำตอบเหมือนกันทุกครั้ง
 *
 * **ใช้ anon key ผ่าน `getBrowserClient()` โดยตั้งใจ** — RLS ของ `shortlists`
 * (`owner_id = auth.uid()`) และของ `shortlist_candidates` (ผูกกับเจ้าของรายการ)
 * กรองให้เองที่ชั้นฐานข้อมูล ต่างจากหน้าผู้สมัครซึ่งเป็น server component ที่ใช้
 * service-role แล้ว bypass RLS จนต้องใส่ `.eq('owner_id', ...)` เอง
 *
 * @param candidateIds id ที่กำลังแสดงอยู่บนหน้า — ลำดับไม่สำคัญ
 */
export function useShortlistData(candidateIds: string[]) {
  const [lists, setLists] = useState<Shortlist[]>([])
  const [memberships, setMemberships] = useState<Record<string, string[]>>({})

  // อาร์เรย์สร้างใหม่ทุกครั้งที่ parent render — ใช้เป็น dependency ตรงๆ ไม่ได้
  // เพราะ useEffect จะยิงไม่หยุด ต้องเทียบด้วยค่าที่เสถียร
  const key = candidateIds.join(',')

  const reload = useCallback(async () => {
    const db = getBrowserClient()

    const { data: ls, error: lsErr } = await db
      .from('shortlists')
      .select('id, name')
      .order('created_at')
    if (lsErr) {
      // ไม่ตั้งรายการเป็นว่างเมื่ออ่านล้ม — "ยังไม่มี Shortlist" เป็นคำตอบที่ผู้ใช้
      // เชื่อทันทีโดยไม่สงสัย จึงห้ามเอามาใช้ตอนระบบพัง (บั๊กเดียวกับ lib/search/query.ts)
      console.error('read shortlists failed:', lsErr.message)
      return
    }
    setLists((ls ?? []) as unknown as Shortlist[])

    const ids = key ? key.split(',') : []
    if (ids.length === 0) {
      setMemberships({})
      return
    }

    const { data: links, error: linkErr } = await db
      .from('shortlist_candidates')
      .select('shortlist_id, candidate_id')
      .in('candidate_id', ids)
    if (linkErr) {
      console.error('read shortlist links failed:', linkErr.message)
      return
    }

    const map: Record<string, string[]> = {}
    for (const row of (links ?? []) as any[]) {
      ;(map[row.candidate_id] ??= []).push(row.shortlist_id)
    }
    setMemberships(map)
  }, [key])

  useEffect(() => {
    void reload()
  }, [reload])

  return { lists, memberships, reload }
}
