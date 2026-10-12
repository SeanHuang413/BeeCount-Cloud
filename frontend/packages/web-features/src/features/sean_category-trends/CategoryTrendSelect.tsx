import { useState } from 'react'
import type { WorkspaceCategory } from '@beecount/api-client'
import type { CategoryTrend } from './analyzeCategoryTrends'
import { monthlyCategoryChildren } from './monthlyCategorySelection'

export function useCategoryTrendSelection(parentRows: CategoryTrend[], categories: WorkspaceCategory[]) {
  const [parentId, setParentId] = useState('__all')
  const [childId, setChildId] = useState('__all')
  const parents = parentRows.filter(row => row.total > 0)
  const effectiveParentId = parents.some(row => row.id === parentId) ? parentId : '__all'
  const children = monthlyCategoryChildren(categories, effectiveParentId)
  const effectiveChildId = effectiveParentId !== '__all' && (childId === '__direct' || children.some(row => row.id === childId)) ? childId : '__all'
  return { parents, children, parentId: effectiveParentId, childId: effectiveChildId,
    onParentChange: (id: string) => { setParentId(id); setChildId('__all') }, onChildChange: setChildId }
}

export function CategoryTrendSelect({ selection, categories, label }: {
  selection: ReturnType<typeof useCategoryTrendSelection>; categories: WorkspaceCategory[]; label: string
}) {
  const style = 'h-9 min-w-0 max-w-full rounded-md border border-input bg-background px-3 text-sm'
  return <div className="flex flex-wrap items-center gap-3 text-sm">
    <label className="flex min-w-0 items-center gap-2">一级分类<select aria-label={`${label}一级分类`} className={style} value={selection.parentId} onChange={event => selection.onParentChange(event.target.value)}><option value="__all">全部分类</option>{selection.parents.map(row => <option key={row.id} value={row.id}>{row.name}{categories.find(category => category.id === row.id)?.level === 2 ? '（父级未确认）' : ''}</option>)}</select></label>
    <label className="flex min-w-0 items-center gap-2">二级分类<select aria-label={`${label}二级分类`} className={style} value={selection.childId} disabled={selection.parentId === '__all'} onChange={event => selection.onChildChange(event.target.value)}><option value="__all">{selection.parentId === '__all' ? '请先选择一级分类' : '全部（含一级直接记账）'}</option>{selection.parentId !== '__all' && <option value="__direct">仅一级直接记账</option>}{selection.children.map(row => <option key={row.id} value={row.id}>{row.name}</option>)}</select></label>
  </div>
}
