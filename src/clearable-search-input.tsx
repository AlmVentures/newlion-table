import type { ComponentProps, ReactElement } from 'react';
import { useRef } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

type ClearableSearchInputProps = Omit<ComponentProps<typeof Input>, 'onChange' | 'type' | 'value'> & {
  clearLabel?: string;
  onValueChange: (value: string) => void;
  value: string;
};

export function ClearableSearchInput({
  className,
  clearLabel,
  onValueChange,
  value,
  ...props
}: ClearableSearchInputProps): ReactElement {
  const resolvedClearLabel = clearLabel ?? 'Clear search';
  const inputRef = useRef<HTMLInputElement>(null);

  function clearSearch(): void {
    onValueChange('');
    inputRef.current?.focus();
  }

  return (
    <div className={cn('relative w-full', className)}>
      <Input
        {...props}
        ref={inputRef}
        type="search"
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
        className="pr-10 [&::-webkit-search-cancel-button]:hidden [&::-webkit-search-decoration]:hidden [&::-webkit-search-results-button]:hidden [&::-webkit-search-results-decoration]:hidden"
      />
      {value ? (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={resolvedClearLabel}
          className="absolute top-1/2 right-1 size-7 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          onClick={clearSearch}
        >
          <X aria-hidden="true" className="size-4" />
        </Button>
      ) : null}
    </div>
  );
}
