import { skillCreatedPayloadSchema } from "@ideocode/types/skill-created-app"
import { mountMcpApp } from "./shared/bridge"
import { AppHeader, ArrowIcon, CardBody, CardFooter, CheckIcon, KeyValueGrid } from "./shared/ui"
import "./shared/theme.css"

mountMcpApp({
  name: "IDEOCODE Skill Saved",
  waitingLabel: "Finishing your skill...",
  schema: skillCreatedPayloadSchema,
  render: (payload) => {
    const updated = payload.mode === "updated"
    return (
      <main className="card">
        <AppHeader
          tone="success"
          icon={<CheckIcon />}
          title={updated ? "Skill updated" : "Skill created"}
          subtitle={updated
            ? "A new version is live for everyone with access."
            : "Private to you until you share it or add it to a marketplace."}
          badge={{ tone: "success", label: "Ready" }}
        />
        <CardBody>
          <p className="name">{payload.name}</p>
          <p className="description">{payload.description}</p>
          <KeyValueGrid
            items={[
              { label: "Plugin", value: payload.pluginId, mono: true },
              { label: "Skill", value: payload.skillId, mono: true },
            ]}
          />
        </CardBody>
        <CardFooter
          footnote="Usable in this chat right now."
          action={payload.libraryUrl ? (
            <button className="action-primary" type="button">
              Open in Library <ArrowIcon />
            </button>
          ) : undefined}
        />
      </main>
    )
  },
})
