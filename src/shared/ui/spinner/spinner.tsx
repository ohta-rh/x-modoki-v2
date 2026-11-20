import { LoaderCircle } from 'lucide-react';

export function Spinner() {
  return (
    <div role="status" aria-label="読み込み中" className="flex justify-center p-4">
      <LoaderCircle aria-hidden="true" className="size-7 animate-spin text-brand" />
    </div>
  );
}
