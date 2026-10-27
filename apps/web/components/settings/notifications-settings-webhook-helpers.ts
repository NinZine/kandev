"use client";

import { useState } from "react";
import type { AppriseFormMode, NotificationsState } from "./notifications-settings-actions";
import type { NotificationProvider } from "@/lib/types/http";

export function formatWebhookHeaders(value: unknown): string {
  if (!value || typeof value !== "object" || Array.isArray(value)) return "";
  return Object.entries(value as Record<string, unknown>)
    .filter((entry): entry is [string, string] => typeof entry[1] === "string")
    .map(([name, headerValue]) => `${name}: ${headerValue}`)
    .join("\n");
}

export function parseWebhookHeaders(value: string): Record<string, string> {
  const headers: Record<string, string> = {};
  for (const line of value.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const separator = trimmed.indexOf(":");
    if (separator <= 0) continue;
    const name = trimmed.slice(0, separator).trim();
    if (!name) continue;
    headers[name] = trimmed.slice(separator + 1).trim();
  }
  return headers;
}

export function webhookHeadersSignature(value: string): string {
  return Object.entries(parseWebhookHeaders(value))
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([name, headerValue]) => `${name}: ${headerValue}`)
    .join("\n");
}

export function webhookConfig(config: NotificationProvider["config"] | undefined) {
  const source = config ?? {};
  const url = typeof source.url === "string" ? source.url : "";
  const secret = typeof source.secret === "string" ? source.secret : "";
  return { url, secret, headers: formatWebhookHeaders(source.headers) };
}

export function useWebhookFormState() {
  const [showWebhookForm, setShowWebhookForm] = useState(false);
  const [webhookFormMode, setWebhookFormMode] = useState<AppriseFormMode>("create");
  const [activeWebhookId, setActiveWebhookId] = useState<string | null>(null);
  const [webhookName, setWebhookName] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [webhookHeaders, setWebhookHeaders] = useState("");
  const [webhookSecret, setWebhookSecret] = useState("");
  return {
    showWebhookForm,
    setShowWebhookForm,
    webhookFormMode,
    setWebhookFormMode,
    activeWebhookId,
    setActiveWebhookId,
    webhookName,
    setWebhookName,
    webhookUrl,
    setWebhookUrl,
    webhookHeaders,
    setWebhookHeaders,
    webhookSecret,
    setWebhookSecret,
  };
}

export function useWebhookProviderActions(state: NotificationsState) {
  const {
    baselineProviders,
    webhookFormMode,
    activeWebhookId,
    setProviders,
    setShowWebhookForm,
    setWebhookFormMode,
    setActiveWebhookId,
    setWebhookName,
    setWebhookUrl,
    setWebhookHeaders,
    setWebhookSecret,
  } = state;

  const updateProvider = (
    providerId: string,
    updater: (provider: NotificationProvider) => NotificationProvider,
  ) => {
    setProviders((prev) =>
      prev.map((provider) => (provider.id === providerId ? updater(provider) : provider)),
    );
  };

  const handleWebhookEdit = (
    providerId: string,
    patch: { url?: string; headers?: string; secret?: string },
  ) => {
    updateProvider(providerId, (provider) => {
      const current = webhookConfig(provider.config);
      const url = patch.url ?? current.url;
      const headers = parseWebhookHeaders(patch.headers ?? current.headers);
      const secret = patch.secret ?? current.secret;
      return {
        ...provider,
        config: { url, headers, ...(secret ? { secret } : {}) },
      };
    });
  };

  const handleWebhookNameEdit = (providerId: string, value: string) => {
    updateProvider(providerId, (provider) => ({ ...provider, name: value }));
  };

  const openWebhookForm = (mode: AppriseFormMode, provider?: NotificationProvider) => {
    setWebhookFormMode(mode);
    setActiveWebhookId(provider?.id ?? null);
    const config = webhookConfig(provider?.config);
    setWebhookName(provider?.name ?? "");
    setWebhookUrl(config.url);
    setWebhookHeaders(config.headers);
    setWebhookSecret(config.secret);
    setShowWebhookForm(true);
  };

  const closeWebhookForm = () => {
    setShowWebhookForm(false);
    setActiveWebhookId(null);
    setWebhookName("");
    setWebhookUrl("");
    setWebhookHeaders("");
    setWebhookSecret("");
  };

  const cancelWebhookForm = () => {
    if (webhookFormMode === "edit" && activeWebhookId) {
      const baseline = baselineProviders.find((provider) => provider.id === activeWebhookId);
      if (baseline) {
        updateProvider(baseline.id, (provider) => ({
          ...provider,
          name: baseline.name,
          config: baseline.config,
        }));
      }
    }
    closeWebhookForm();
  };

  return {
    handleWebhookEdit,
    handleWebhookNameEdit,
    openWebhookForm,
    closeWebhookForm,
    cancelWebhookForm,
  };
}
