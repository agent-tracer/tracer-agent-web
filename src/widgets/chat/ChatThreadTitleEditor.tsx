import { useState } from "react";
import { chatThreadDisplayTitle, type ChatThreadRecord } from "~/entities/chat/model/chat.js";
import { useRenameThreadMutation } from "~/entities/chat/api/mutations.js";
import { useGuidance } from "tracerWeb/store";
import { Button, GuidanceText, Input, PencilSimpleIcon, Tooltip } from "tracerWeb/ui";

export function ChatThreadTitleEditor({ thread }: { readonly thread: ChatThreadRecord }) {
  const guidance = useGuidance();
  const rename = useRenameThreadMutation(thread.id);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(chatThreadDisplayTitle(thread));

  const cancel = () => {
    setTitle(chatThreadDisplayTitle(thread));
    setEditing(false);
  };
  const save = () => {
    const next = title.trim();
    if (next.length === 0) return;
    rename.mutate(next, { onSuccess: () => setEditing(false) });
  };

  if (!editing) {
    const current = chatThreadDisplayTitle(thread);
    return (
      <div className="flex flex-1 min-w-0 items-center">
        <Tooltip
          content={
            <GuidanceText locale={guidance.locale} message={guidance.messages.chat.clickToRename} />
          }
          side="bottom"
        >
          <button
            type="button"
            aria-label="Rename conversation"
            onClick={() => {
              setTitle(current);
              setEditing(true);
            }}
            className="group/title flex min-w-0 items-center gap-1.5 rounded-sm px-1.5 py-0.5 -mx-1.5 -my-0.5 text-left cursor-pointer hover:bg-s1 transition-colors duration-[120ms]"
          >
            <span className="text-[13px] font-medium text-ink min-w-0 truncate group-hover/title:underline underline-offset-[3px] decoration-hair-strong">
              {current}
            </span>
            <span aria-hidden className="shrink-0 text-ink-tertiary">
              <PencilSimpleIcon />
            </span>
          </button>
        </Tooltip>
      </div>
    );
  }

  return (
    <form
      className="flex flex-1 min-w-0 items-center gap-1.5"
      onSubmit={(event) => {
        event.preventDefault();
        save();
      }}
    >
      <Input
        autoFocus
        aria-label="Conversation title"
        className="h-7 min-w-0 text-[13px]"
        value={title}
        maxLength={120}
        onChange={(event) => setTitle(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Escape") cancel();
        }}
      />
      <Button type="submit" variant="primary" disabled={rename.isPending || title.trim().length === 0}>
        Save
      </Button>
      <Button type="button" variant="ghost" onClick={cancel} disabled={rename.isPending}>
        Cancel
      </Button>
    </form>
  );
}
