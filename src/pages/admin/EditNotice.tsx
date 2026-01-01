import { useParams, Navigate } from 'react-router-dom'
import { useNotice } from '@/hooks/cms/useNotices'
import { NoticeForm } from '@/components/notices/NoticeForm'
import { Loader2 } from 'lucide-react'

export default function EditNotice() {
  const { id } = useParams<{ id: string }>()
  const { data: notice, isLoading, error } = useNotice(id)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    )
  }

  if (error || !notice) {
    return <Navigate to="/admin/notices" replace />
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Edit Notice</h1>
        <p className="text-muted-foreground mt-1">Update "{notice.title}"</p>
      </div>
      <NoticeForm mode="edit" notice={notice} />
    </div>
  )
}
