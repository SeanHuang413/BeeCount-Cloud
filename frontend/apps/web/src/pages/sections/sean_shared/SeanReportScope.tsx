import type { ReportRange } from './readReportData'

type Metadata = { total: number; transactions: unknown[]; truncated: boolean; entityTruncated: boolean;
  scope: ReportRange; refreshedAt: Date; ignoredCount: number; ignoredCurrencies: string[]; invalidCount: number }
export function SeanReportScope({ metadata }: { metadata: Metadata | null }) {
  if (!metadata) return null
  const date = (value: string) => new Date(value).toLocaleDateString()
  return <div className="mb-4 space-y-1 rounded-lg border bg-muted/20 p-3 text-xs text-muted-foreground" role="status">
    <p>分析范围：{metadata.scope.dateFrom ? date(metadata.scope.dateFrom) : '全部历史'} 至 {metadata.scope.dateTo ? new Date(metadata.scope.dateTo).toLocaleString() : '当前'} · 已读取 {metadata.transactions.length.toLocaleString()} / {metadata.total.toLocaleString()} 笔 · 更新于 {metadata.refreshedAt.toLocaleTimeString()}</p>
    {metadata.truncated ? <p className="font-medium text-expense">数据不完整：本页最多读取 10,000 笔，当前未读取全部记录，以下统计仅代表已读取部分。请缩短时间范围或刷新数据。</p> : null}
    {metadata.entityTruncated ? <p className="text-expense">账户或分类达到读取上限，结果可能不完整。</p> : null}
    {metadata.ignoredCount ? <p>缺少本位币换算金额，已排除 {metadata.ignoredCount} 笔（{metadata.ignoredCurrencies.join('、')}）；其余使用记账时保存的本位币金额。</p> : null}
    {metadata.invalidCount ? <p>另有 {metadata.invalidCount} 笔日期或金额无效的记录未参与统计。</p> : null}
  </div>
}
