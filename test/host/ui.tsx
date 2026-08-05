// 호스트가 연합으로 내보내는 표면의 대역이며 시험 실행에서만 쓰인다.

import {
  createContext,
  useContext,
  useState,
  type ComponentPropsWithoutRef,
  type ReactNode,
  type Ref,
  type UIEventHandler,
} from "react";
import type { GuidanceLocale, GuidanceMessage } from "tracerWeb/guidance";
import { guidanceKey } from "./guidance.js";

export type StatusKind = "running" | "waiting" | "done" | "failed" | "idle" | "canceled";

export function Badge(props: ComponentPropsWithoutRef<"span">) {
  return <span {...props} />;
}

export function Pill({ dot: _dot, pulse: _pulse, tone: _tone, ...rest }: ComponentPropsWithoutRef<"span"> & {
  readonly tone?: string;
  readonly dot?: boolean;
  readonly pulse?: boolean;
}) {
  return <span {...rest} />;
}

export function Select(props: ComponentPropsWithoutRef<"select">) {
  return <select {...props} />;
}

export function StatusDot({ status }: { readonly status: StatusKind }) {
  return <span aria-label={`status: ${status}`} />;
}

export function Button({ variant: _variant, type = "button", ...rest }: ComponentPropsWithoutRef<"button"> & {
  readonly variant?: string;
}) {
  return <button type={type} {...rest} />;
}

export function IconButton({ tone: _tone, armed: _armed, type = "button", ...rest }: ComponentPropsWithoutRef<"button"> & {
  readonly tone?: string;
  readonly armed?: boolean;
}) {
  return <button type={type} {...rest} />;
}

export function Input(props: ComponentPropsWithoutRef<"input">) {
  return <input {...props} />;
}

export function Card({ title, count, children, className }: {
  readonly title?: string;
  readonly count?: number;
  readonly surface?: string;
  readonly className?: string;
  readonly children: ReactNode;
}) {
  return (
    <section className={className}>
      {title ? <header>{title}{count === undefined ? null : <span>{count}</span>}</header> : null}
      {children}
    </section>
  );
}

export function SectionLabel({ children }: { readonly children: ReactNode }) {
  return <div>{children}</div>;
}

export function EmptyHint({ children }: { readonly children: ReactNode }) {
  return <div>{children}</div>;
}

export function GuidanceText({ locale, message, as: Element = "span", className }: {
  readonly locale: GuidanceLocale;
  readonly message: GuidanceMessage;
  readonly as?: "div" | "p" | "span";
  readonly className?: string;
}) {
  return <Element className={className} lang={locale}>{guidanceKey(message)}</Element>;
}

export function EmptyView({ eyebrow, title, description, locale = "en", action }: {
  readonly eyebrow?: string;
  readonly title: string;
  readonly description?: GuidanceMessage;
  readonly locale?: GuidanceLocale;
  readonly action?: ReactNode;
}) {
  return (
    <div>
      {eyebrow ? <div>{eyebrow}</div> : null}
      <h1>{title}</h1>
      {description ? <GuidanceText as="p" locale={locale} message={description} /> : null}
      {action}
    </div>
  );
}

export function Modal({ open, onClose, title, description, descriptionLocale, children }: {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly title: string;
  readonly children: ReactNode;
  readonly maxWidth?: number;
  readonly description?: GuidanceMessage;
  readonly descriptionLocale?: GuidanceLocale;
}) {
  if (!open) return null;
  return (
    <div role="dialog" aria-modal="true" aria-label={title}>
      <h2>{title}</h2>
      {description ? (
        <GuidanceText as="p" locale={descriptionLocale ?? "en"} message={description} />
      ) : null}
      <button type="button" aria-label="Close dialog" onClick={onClose} />
      {children}
    </div>
  );
}

export function ScrollArea({ children, className, viewportRef, onViewportScroll, ...rest }: ComponentPropsWithoutRef<"div"> & {
  readonly viewportRef?: Ref<HTMLDivElement>;
  readonly onViewportScroll?: UIEventHandler<HTMLDivElement>;
}) {
  return (
    <div className={className} {...rest}>
      <div data-radix-scroll-area-viewport="" ref={viewportRef} onScroll={onViewportScroll}>
        {children}
      </div>
    </div>
  );
}

export function Tooltip({ children }: {
  readonly children: ReactNode;
  readonly content: ReactNode;
  readonly side?: string;
  readonly delayMs?: number;
}) {
  return <>{children}</>;
}

export function TooltipProvider({ children }: { readonly children: ReactNode }) {
  return <>{children}</>;
}

const TabsContext = createContext<{ value: string; select: (value: string) => void }>({
  value: "",
  select: () => undefined,
});

export function Tabs({ defaultValue = "", children, className }: ComponentPropsWithoutRef<"div"> & {
  readonly defaultValue?: string;
}) {
  const [value, select] = useState(defaultValue);
  return (
    <div className={className}>
      <TabsContext.Provider value={{ value, select }}>{children}</TabsContext.Provider>
    </div>
  );
}

export function TabsList({ children, className }: ComponentPropsWithoutRef<"div">) {
  return <div role="tablist" className={className}>{children}</div>;
}

export function TabsTrigger({ value, children, className }: ComponentPropsWithoutRef<"button"> & {
  readonly value: string;
}) {
  const tabs = useContext(TabsContext);
  return (
    <button
      type="button"
      role="tab"
      aria-selected={tabs.value === value}
      className={className}
      onMouseDown={() => tabs.select(value)}
      onClick={() => tabs.select(value)}
    >
      {children}
    </button>
  );
}

export function TabsContent({ value, children, className }: ComponentPropsWithoutRef<"div"> & {
  readonly value: string;
}) {
  const tabs = useContext(TabsContext);
  if (tabs.value !== value) return null;
  return <div role="tabpanel" className={className}>{children}</div>;
}

export function PencilSimpleIcon() {
  return <span aria-hidden />;
}

export function TrashIcon() {
  return <span aria-hidden />;
}

export function CopyIcon(_props?: { readonly size?: number; readonly className?: string }) {
  return <span aria-hidden data-icon="copy" />;
}

export function CheckIcon(_props?: { readonly size?: number; readonly className?: string }) {
  return <span aria-hidden data-icon="check" />;
}
