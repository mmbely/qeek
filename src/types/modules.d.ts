declare module '@radix-ui/react-select' {
  import * as React from 'react';

  type SelectProps = {
    value?: string;
    defaultValue?: string;
    onValueChange?: (value: string) => void;
    open?: boolean;
    defaultOpen?: boolean;
    onOpenChange?: (open: boolean) => void;
    dir?: 'ltr' | 'rtl';
    name?: string;
    disabled?: boolean;
  };

  const Root: React.FC<SelectProps>;
  const Trigger: React.ForwardRefExoticComponent<React.HTMLAttributes<HTMLButtonElement>>;
  const Value: React.FC<React.HTMLAttributes<HTMLSpanElement>>;
  const Portal: React.FC<React.HTMLAttributes<HTMLDivElement>>;
  const Content: React.ForwardRefExoticComponent<React.HTMLAttributes<HTMLDivElement>>;
  const Viewport: React.FC<React.HTMLAttributes<HTMLDivElement>>;
  const Group: React.FC<React.HTMLAttributes<HTMLDivElement>>;
  const Label: React.FC<React.HTMLAttributes<HTMLDivElement>>;
  const Item: React.ForwardRefExoticComponent<React.HTMLAttributes<HTMLDivElement>>;
  const ItemText: React.FC<React.HTMLAttributes<HTMLSpanElement>>;
  const ItemIndicator: React.FC<React.HTMLAttributes<HTMLSpanElement>>;
  const Separator: React.FC<React.HTMLAttributes<HTMLDivElement>>;
  const Icon: React.FC<React.HTMLAttributes<HTMLSpanElement>>;

  export {
    Root,
    Trigger,
    Value,
    Portal,
    Content,
    Viewport,
    Group,
    Label,
    Item,
    ItemText,
    ItemIndicator,
    Separator,
    Icon,
  };
}

declare module 'tailwind-merge' {
  export function twMerge(...args: (string | undefined | null | false)[]): string;
}
