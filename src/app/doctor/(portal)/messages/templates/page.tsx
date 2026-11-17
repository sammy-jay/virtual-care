import Link from "@/components/market";
import type { Metadata } from "next";
import { Modal, ModalActions } from "@/components/modal";
import { Alert, Button, ButtonLink, Card, PageTitle } from "@/components/ui";
import { requireDoctor } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { deleteTemplate, saveTemplate } from "../../../actions";

export const metadata: Metadata = { title: "Message templates" };

export default async function TemplatesPage({ searchParams }: PageProps<"/doctor/messages/templates">) {
  await requireDoctor();
  const sp = await searchParams;
  const templates = await db.messageTemplate.findMany({ orderBy: { sortOrder: "asc" } });
  const dialog = typeof sp.dialog === "string" ? sp.dialog : null;
  const editing = dialog && dialog !== "new" ? templates.find((t) => t.id === dialog) : null;
  return (
    <div className="mx-auto max-w-[1000px]">
      <PageTitle title="Message templates" subtitle="Saved replies you can drop into any message" actions={<ButtonLink href="/doctor/messages/templates?dialog=new">New template</ButtonLink>} />
      <div className="grid gap-4 md:grid-cols-2">
        {templates.map((t) => (
          <Card key={t.id}>
            <div className="flex items-start justify-between gap-3">
              <b className="text-[16px]">{t.title}</b>
              <Link href={`/doctor/messages/templates?dialog=${t.id}`} className="text-sm font-bold text-forest">
                Edit
              </Link>
            </div>
            <p className="mt-2 line-clamp-2 text-[14.5px] text-body">{t.body}</p>
          </Card>
        ))}
      </div>
      {(dialog === "new" || editing) && (
        <Modal closeHref="/doctor/messages/templates" title={editing ? "Edit template" : "New template"}>
          {sp.error && <Alert tone="error" className="mb-3">Add a name and the message.</Alert>}
          <form action={saveTemplate} className="flex flex-col gap-4">
            {editing && <input type="hidden" name="id" value={editing.id} />}
            <div>
              <label htmlFor="title" className="label">Name</label>
              <input id="title" name="title" defaultValue={editing?.title} className="field" />
            </div>
            <div>
              <label htmlFor="body" className="label">Message</label>
              <textarea id="body" name="body" rows={5} defaultValue={editing?.body} className="field resize-none" />
            </div>
            <ModalActions>
              <ButtonLink href="/doctor/messages/templates" variant="secondary">
                Cancel
              </ButtonLink>
              <Button>{editing ? "Save changes" : "Create template"}</Button>
            </ModalActions>
          </form>
          {editing && (
            <form action={deleteTemplate} className="mt-2">
              <input type="hidden" name="id" value={editing.id} />
              <Button variant="ghost" size="sm" className="!text-danger">
                Delete template
              </Button>
            </form>
          )}
        </Modal>
      )}
    </div>
  );
}
