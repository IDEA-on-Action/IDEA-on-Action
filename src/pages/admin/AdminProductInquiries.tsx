/**
 * AdminProductInquiries
 *
 * 제품 문의 관리 페이지 (관리자 전용)
 * - 문의 목록 조회, 상태별 필터
 * - 상태 변경 (접수, 연락함, 진행 중, 종료)
 * - 상세 보기와 관리자 메모
 */

import { useState } from 'react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { useProductInquiries, useUpdateProductInquiry, type ProductInquiry } from '@/hooks/products/useProductInquiries';
import {
  DEPLOYMENT_OPTIONS,
  PRODUCT_INQUIRY_PRODUCTS,
  ROLE_OPTIONS,
  STATUS_OPTIONS,
  TIMELINE_OPTIONS,
  isProductInquiryProduct,
  labelOf,
  type ProductInquiryStatus,
} from '@/data/products/product-inquiry';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';

const ALL = 'all';

const productName = (productId: string) =>
  isProductInquiryProduct(productId) ? PRODUCT_INQUIRY_PRODUCTS[productId].name : productId;

const formatDate = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : format(date, 'yyyy-MM-dd HH:mm');
};

function StatusSelect({
  inquiry,
  onChange,
  disabled,
}: {
  inquiry: ProductInquiry;
  onChange: (status: ProductInquiryStatus) => void;
  disabled: boolean;
}) {
  return (
    <Select value={inquiry.status} onValueChange={(value) => onChange(value as ProductInquiryStatus)} disabled={disabled}>
      <SelectTrigger className="w-[120px]" aria-label={`${inquiry.company} 문의 상태`}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {STATUS_OPTIONS.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export default function AdminProductInquiries() {
  const [statusFilter, setStatusFilter] = useState<ProductInquiryStatus | typeof ALL>(ALL);
  const [selected, setSelected] = useState<ProductInquiry | null>(null);
  const [notes, setNotes] = useState('');

  const { data: inquiries, isLoading, isError, error } = useProductInquiries(statusFilter === ALL ? undefined : statusFilter);
  const updateInquiry = useUpdateProductInquiry();

  const changeStatus = (inquiry: ProductInquiry, status: ProductInquiryStatus) => {
    updateInquiry.mutate(
      { id: inquiry.id, status },
      {
        onSuccess: () => toast.success(`상태를 「${labelOf(STATUS_OPTIONS, status)}」(으)로 바꿨습니다`),
        onError: (mutationError) => toast.error('상태를 바꾸지 못했습니다', { description: mutationError.message }),
      }
    );
  };

  const openDetail = (inquiry: ProductInquiry) => {
    setSelected(inquiry);
    setNotes(inquiry.admin_notes ?? '');
  };

  const saveNotes = () => {
    if (!selected) return;
    updateInquiry.mutate(
      { id: selected.id, adminNotes: notes },
      {
        onSuccess: () => {
          toast.success('관리자 메모를 저장했습니다');
          setSelected(null);
        },
        onError: (mutationError) => toast.error('메모를 저장하지 못했습니다', { description: mutationError.message }),
      }
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">제품 문의</h1>
        <p className="text-muted-foreground">제품 소개 페이지에서 접수한 도입 문의를 확인하고 상태를 바꿉니다.</p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
          <div>
            <CardTitle>문의 목록</CardTitle>
            <CardDescription>{inquiries ? `${inquiries.length}건` : '불러오는 중입니다'}</CardDescription>
          </div>
          <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as ProductInquiryStatus | typeof ALL)}>
            <SelectTrigger className="w-[140px]" aria-label="상태 필터">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>전체 상태</SelectItem>
              {STATUS_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          {isLoading && (
            <div className="space-y-2" aria-label="문의 목록을 불러오는 중입니다">
              {[...Array(3)].map((_, index) => (
                <Skeleton key={index} className="h-12 w-full" />
              ))}
            </div>
          )}

          {isError && (
            <Alert variant="destructive">
              <AlertTitle>문의 목록을 불러오지 못했습니다</AlertTitle>
              <AlertDescription>{error?.message}</AlertDescription>
            </Alert>
          )}

          {!isLoading && !isError && inquiries?.length === 0 && (
            <p className="py-12 text-center text-muted-foreground" role="status">
              접수된 문의가 없습니다.
            </p>
          )}

          {!isLoading && !isError && inquiries && inquiries.length > 0 && (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>접수 일시</TableHead>
                    <TableHead>제품</TableHead>
                    <TableHead>회사 또는 기관명</TableHead>
                    <TableHead>이름</TableHead>
                    <TableHead>설치 환경</TableHead>
                    <TableHead>상태</TableHead>
                    <TableHead className="text-right">상세</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inquiries.map((inquiry) => (
                    <TableRow key={inquiry.id}>
                      <TableCell className="whitespace-nowrap">{formatDate(inquiry.created_at)}</TableCell>
                      <TableCell>{productName(inquiry.product_id)}</TableCell>
                      <TableCell>{inquiry.company}</TableCell>
                      <TableCell>{inquiry.name}</TableCell>
                      <TableCell>{labelOf(DEPLOYMENT_OPTIONS, inquiry.deployment)}</TableCell>
                      <TableCell>
                        <StatusSelect
                          inquiry={inquiry}
                          onChange={(status) => changeStatus(inquiry, status)}
                          disabled={updateInquiry.isPending}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm" onClick={() => openDetail(inquiry)}>
                          보기
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={selected !== null} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle>
                  {selected.company} · {productName(selected.product_id)}
                </DialogTitle>
                <DialogDescription>{formatDate(selected.created_at)} 접수</DialogDescription>
              </DialogHeader>

              <dl className="grid gap-x-4 gap-y-2 text-sm sm:grid-cols-[8rem_1fr]">
                <dt className="text-muted-foreground">이름</dt>
                <dd>{selected.name}</dd>
                <dt className="text-muted-foreground">업무 메일</dt>
                <dd>
                  <a className="underline" href={`mailto:${selected.email}`}>
                    {selected.email}
                  </a>
                </dd>
                <dt className="text-muted-foreground">연락처</dt>
                <dd>{selected.phone || '없음'}</dd>
                <dt className="text-muted-foreground">역할</dt>
                <dd>{labelOf(ROLE_OPTIONS, selected.role) || '없음'}</dd>
                <dt className="text-muted-foreground">설치 환경</dt>
                <dd>{labelOf(DEPLOYMENT_OPTIONS, selected.deployment)}</dd>
                <dt className="text-muted-foreground">희망 시기</dt>
                <dd>{labelOf(TIMELINE_OPTIONS, selected.timeline) || '없음'}</dd>
                <dt className="text-muted-foreground">동의 일시</dt>
                <dd>{formatDate(selected.consent_at)}</dd>
                <dt className="text-muted-foreground">적용하려는 업무</dt>
                <dd className="whitespace-pre-wrap">{selected.use_case}</dd>
              </dl>

              <div className="space-y-2">
                <Label htmlFor="product-inquiry-notes">관리자 메모</Label>
                <Textarea
                  id="product-inquiry-notes"
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  className="min-h-[100px]"
                />
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setSelected(null)}>
                  닫기
                </Button>
                <Button onClick={saveNotes} disabled={updateInquiry.isPending}>
                  메모 저장
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
