"use client";

import { useEffect, useState } from "react";
import type { Plan } from "@/lib/types";
import { usePlans } from "@/lib/plans-store";
import { startOfDay } from "@/lib/dates";
import { OPEN_NEW_TASK_EVENT } from "@/lib/mobile-add";
import { TaskAddSheet } from "./widgets/task-add-sheet";
import { TaskDetail } from "./widgets/task-detail";

/* Mobilda "+" — sahifa o'zi ushlamasa yoki hali ulanmagan bo'lsa (masalan, tab
   almashayotgan payt). Yangi task shu joyda qo'shiladi, boshqa sahifaga o'tilmaydi. */
export function MobileNewTask() {
  const { plans, create, update } = usePlans();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Plan | null>(null);

  useEffect(() => {
    function onOpen() {
      if (window.matchMedia("(max-width: 767px)").matches) setOpen(true);
    }
    window.addEventListener(OPEN_NEW_TASK_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_NEW_TASK_EVENT, onOpen);
  }, []);

  return (
    <>
      <TaskAddSheet
        open={open}
        onClose={() => setOpen(false)}
        plans={plans}
        defaultDate={startOfDay()}
        placeholder="Bugun nima qilmoqchisiz?"
        onCreate={(input) => { create(input); }}
        onDetail={setDraft}
      />
      <TaskDetail
        plan={draft}
        plans={plans}
        open={!!draft}
        onClose={() => setDraft(null)}
        onUpdate={update}
        onRemove={() => setDraft(null)}
        draft
        onCreate={(input) => {
          const id = create(input);
          setDraft(null);
          return id;
        }}
      />
    </>
  );
}
