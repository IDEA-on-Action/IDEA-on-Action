# FileUpload Component

## 개요

드래그 앤 드롭을 지원하는 파일 업로드 컴포넌트입니다. 파일 크기 및 타입 검증, 이미지 미리보기, 업로드 진행률 표시 등의 기능을 제공합니다.

**위치**: `src/components/ui/file-upload.tsx`

## Props

| Prop | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| `accept` | `string` | - | 허용할 파일 타입 (예: `"image/*"`, `".pdf"`) |
| `maxSize` | `number` | `5242880` (5MB) | 최대 파일 크기 (bytes) |
| `maxFiles` | `number` | `1` | 최대 파일 수 |
| `onUpload` | `(files: File[]) => void \| Promise<void>` | - | 파일 업로드 콜백 (필수) |
| `preview` | `boolean` | `false` | 이미지 미리보기 활성화 |
| `disabled` | `boolean` | `false` | 비활성화 |
| `value` | `File[]` | `[]` | 제어 컴포넌트 value |
| `uploadProgress` | `number` | - | 업로드 진행률 (0-100) |
| `className` | `string` | - | 추가 클래스명 |
| `error` | `string` | - | 에러 메시지 |

## 기능

### 1. 드래그 앤 드롭

파일을 드래그하여 Drop Zone에 놓으면 자동으로 업로드가 시작됩니다.

```tsx
<FileUpload
  accept="image/*"
  onUpload={(files) => console.log('Uploaded:', files)}
/>
```

### 2. 파일 크기 검증

`maxSize`를 초과하는 파일은 자동으로 차단되며, 사용자에게 에러 메시지가 표시됩니다.

```tsx
<FileUpload
  accept="image/*"
  maxSize={2 * 1024 * 1024} // 2MB
  onUpload={handleUpload}
/>
```

### 3. 파일 타입 검증

`accept` 속성을 사용하여 허용할 파일 타입을 제한할 수 있습니다.

```tsx
{/* 이미지만 허용 */}
<FileUpload
  accept="image/*"
  onUpload={handleUpload}
/>

{/* PDF만 허용 */}
<FileUpload
  accept=".pdf"
  onUpload={handleUpload}
/>

{/* 여러 타입 허용 */}
<FileUpload
  accept="image/*,.pdf,.docx"
  onUpload={handleUpload}
/>
```

### 4. 이미지 미리보기

`preview={true}`를 설정하면 이미지 파일의 썸네일이 자동으로 표시됩니다.

```tsx
<FileUpload
  accept="image/*"
  preview={true}
  onUpload={handleUpload}
/>
```

### 5. 다중 파일 업로드

`maxFiles`를 1보다 큰 값으로 설정하면 여러 파일을 동시에 업로드할 수 있습니다.

```tsx
<FileUpload
  accept="image/*"
  maxFiles={5}
  onUpload={handleUpload}
/>
```

### 6. 업로드 진행률 표시

`uploadProgress` prop을 사용하여 업로드 진행률을 표시할 수 있습니다.

```tsx
const [progress, setProgress] = useState(0)

const handleUpload = async (files: File[]) => {
  // 업로드 로직...
  setProgress(50) // 진행률 업데이트
}

<FileUpload
  accept="image/*"
  onUpload={handleUpload}
  uploadProgress={progress}
/>
```

## 사용 예시

### 기본 사용

```tsx
import { FileUpload } from '@/components/ui/file-upload'
import { useState } from 'react'

function MyComponent() {
  const [files, setFiles] = useState<File[]>([])

  const handleUpload = (uploadedFiles: File[]) => {
    setFiles(uploadedFiles)
    console.log('Uploaded files:', uploadedFiles)
  }

  return (
    <FileUpload
      accept="image/*"
      maxSize={5 * 1024 * 1024} // 5MB
      onUpload={handleUpload}
      preview={true}
    />
  )
}
```

### React Hook Form 통합

```tsx
import { FileUpload } from '@/components/ui/file-upload'
import { useForm } from 'react-hook-form'
import { FormField, FormItem, FormLabel, FormControl } from '@/components/ui/form'

function MyForm() {
  const form = useForm()
  const [avatarFiles, setAvatarFiles] = useState<File[]>([])

  const handleAvatarUpload = async (files: File[]) => {
    setAvatarFiles(files)

    // 실제 업로드 로직 (예: Supabase Storage)
    // const url = await uploadToStorage(files[0])
    // form.setValue('avatar', url)

    // 데모: 로컬 URL 생성
    const localUrl = URL.createObjectURL(files[0])
    form.setValue('avatar', localUrl)
  }

  return (
    <FormField
      control={form.control}
      name="avatar"
      render={({ field }) => (
        <FormItem>
          <FormLabel>프로필 사진</FormLabel>
          <FormControl>
            <FileUpload
              accept="image/*"
              maxSize={2 * 1024 * 1024} // 2MB
              maxFiles={1}
              onUpload={handleAvatarUpload}
              preview={true}
              value={avatarFiles}
            />
          </FormControl>
        </FormItem>
      )}
    />
  )
}
```

### 비동기 업로드 (Supabase Storage)

```tsx
import { supabase } from '@/lib/supabase'
import { FileUpload } from '@/components/ui/file-upload'
import { useState } from 'react'

function AvatarUpload() {
  const [progress, setProgress] = useState(0)

  const handleUpload = async (files: File[]) => {
    const file = files[0]

    try {
      setProgress(0)

      // Supabase Storage 업로드
      const fileName = `avatars/${Date.now()}-${file.name}`
      const { data, error } = await supabase.storage
        .from('public')
        .upload(fileName, file, {
          onUploadProgress: (progress) => {
            const percent = (progress.loaded / progress.total) * 100
            setProgress(percent)
          }
        })

      if (error) throw error

      // 공개 URL 가져오기
      const { data: { publicUrl } } = supabase.storage
        .from('public')
        .getPublicUrl(fileName)

      console.log('Uploaded URL:', publicUrl)
      setProgress(100)

    } catch (err) {
      console.error('Upload failed:', err)
      setProgress(0)
    }
  }

  return (
    <FileUpload
      accept="image/*"
      maxSize={2 * 1024 * 1024}
      onUpload={handleUpload}
      uploadProgress={progress}
      preview={true}
    />
  )
}
```

## 에러 처리

### 파일 크기 초과

```tsx
<FileUpload
  accept="image/*"
  maxSize={1 * 1024 * 1024} // 1MB
  onUpload={handleUpload}
  error="파일 크기가 너무 큽니다. 최대 1MB까지 업로드할 수 있습니다."
/>
```

### 파일 타입 불일치

파일 타입이 `accept`에 정의된 타입과 일치하지 않으면 자동으로 에러 메시지가 표시됩니다.

```tsx
<FileUpload
  accept="image/png,image/jpeg" // PNG, JPEG만 허용
  onUpload={handleUpload}
/>
```

### 업로드 실패

```tsx
const handleUpload = async (files: File[]) => {
  try {
    // 업로드 로직
    await uploadToServer(files)
  } catch (err) {
    // 에러는 컴포넌트 내부에서 자동으로 처리됩니다
    throw new Error('업로드에 실패했습니다. 다시 시도해주세요.')
  }
}

<FileUpload
  accept="image/*"
  onUpload={handleUpload}
/>
```

## 스타일링

### 커스텀 클래스

```tsx
<FileUpload
  accept="image/*"
  onUpload={handleUpload}
  className="border-2 border-dashed border-primary rounded-xl"
/>
```

### 테마 대응

FileUpload 컴포넌트는 자동으로 다크 모드를 지원합니다.

- 라이트 모드: `border-border`, `bg-accent/50`
- 다크 모드: `dark:border-border`, `dark:bg-accent/50`

## 접근성

- **키보드 네비게이션**: Drop Zone을 클릭하여 파일 선택 대화상자를 열 수 있습니다.
- **ARIA 레이블**: 모든 인터랙티브 요소에 적절한 ARIA 속성이 적용되어 있습니다.
- **에러 메시지**: 스크린 리더가 읽을 수 있도록 에러 메시지가 표시됩니다.

## 유틸리티 함수

### formatFileSize

파일 크기를 사람이 읽기 쉬운 형식으로 변환합니다.

**위치**: `src/lib/utils.ts`

```tsx
import { formatFileSize } from '@/lib/utils'

formatFileSize(1024)       // "1 KB"
formatFileSize(1048576)    // "1 MB"
formatFileSize(1536)       // "1.5 KB"
formatFileSize(0)          // "0 Bytes"
```

## 제약사항

1. **브라우저 지원**: 모던 브라우저에서만 작동합니다 (IE 미지원).
2. **파일 크기**: 기본 최대 크기는 5MB입니다. 더 큰 파일이 필요한 경우 `maxSize`를 조정하세요.
3. **미리보기**: 이미지 파일만 미리보기가 지원됩니다.

## 트러블슈팅

### 파일이 업로드되지 않습니다

1. `onUpload` prop이 올바르게 전달되었는지 확인하세요.
2. 파일 크기가 `maxSize`를 초과하지 않는지 확인하세요.
3. 파일 타입이 `accept`에 정의된 타입과 일치하는지 확인하세요.

### 미리보기가 표시되지 않습니다

1. `preview={true}` prop이 설정되어 있는지 확인하세요.
2. 업로드한 파일이 이미지 파일인지 확인하세요 (image/*).

### 진행률이 업데이트되지 않습니다

1. `uploadProgress` prop이 올바르게 전달되었는지 확인하세요.
2. `onUpload` 콜백에서 진행률 상태를 업데이트하고 있는지 확인하세요.

## 관련 컴포넌트

- **Input**: 기본 파일 입력
- **Button**: 파일 선택 트리거
- **Progress**: 업로드 진행률 표시

## 변경 이력

| 버전 | 날짜 | 변경사항 |
|------|------|---------|
| 1.0.0 | 2025-11-19 | 초기 구현 |

## 기여

버그 리포트나 기능 제안은 GitHub Issues에 등록해주세요.
