import { useLayoutEffect, useRef, TextareaHTMLAttributes, forwardRef } from 'react';

type Props = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  minRows?: number;
};

const AutoTextarea = forwardRef<HTMLTextAreaElement, Props>(function AutoTextarea(
  { value, minRows = 1, style, ...rest },
  externalRef,
) {
  const innerRef = useRef<HTMLTextAreaElement | null>(null);

  const setRef = (node: HTMLTextAreaElement | null) => {
    innerRef.current = node;
    if (typeof externalRef === 'function') externalRef(node);
    else if (externalRef) (externalRef as React.MutableRefObject<HTMLTextAreaElement | null>).current = node;
  };

  useLayoutEffect(() => {
    const el = innerRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = el.scrollHeight + 'px';
  }, [value]);

  return (
    <textarea
      ref={setRef}
      rows={minRows}
      value={value}
      style={{ ...style, overflow: 'hidden', resize: 'none' }}
      {...rest}
    />
  );
});

export default AutoTextarea;
